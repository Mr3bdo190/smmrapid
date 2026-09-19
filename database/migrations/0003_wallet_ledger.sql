-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- SMM Rapid — 0003: wallet, ledger and the money rules
--
-- THE RULE THIS FILE ENFORCES
--   A balance may only move through wallet_apply(), which writes the ledger row and the new
--   balance in the same transaction. Any other UPDATE of wallets.balance_minor raises an
--   exception. The ledger itself is append-only.
--
-- That means a bug in the API cannot silently create or destroy money: at worst it fails.
-- Reconciliation is a one-line query (wallet_reconciliation, below).
--
-- Safe to re-run: functions use CREATE OR REPLACE, triggers are dropped and recreated
-- identically.
-- ═══════════════════════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- guard: the balance may only change from inside wallet_apply()
-- ───────────────────────────────────────────────────────────────────────────────────────────
create or replace function wallets_guard_balance() returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.balance_minor <> 0
       and coalesce(current_setting('app.wallet_ledger_ok', true), 'off') <> 'on' then
      raise exception 'wallets: a wallet is created with a zero balance; move money with wallet_apply()'
        using errcode = '23514';
    end if;
    return new;
  end if;

  if new.balance_minor is distinct from old.balance_minor
     and coalesce(current_setting('app.wallet_ledger_ok', true), 'off') <> 'on' then
    raise exception 'wallets: balance can only change through wallet_apply() — direct balance updates are not allowed (database/migrations/0003_wallet_ledger.sql)'
      using errcode = '23514';
  end if;

  return new;
end $$;

comment on function wallets_guard_balance() is 'Blocks any balance change that did not come from wallet_apply().';

drop trigger if exists wallets_guard_balance_trg on wallets;
create trigger wallets_guard_balance_trg
  before insert or update on wallets
  for each row execute function wallets_guard_balance();

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- the only sanctioned way to move money
-- ───────────────────────────────────────────────────────────────────────────────────────────
create or replace function wallet_apply(
  p_user_id         uuid,
  p_direction       wallet_direction,
  p_type            wallet_tx_type,
  p_amount_minor    bigint,
  p_description     text        default null,
  p_idempotency_key text        default null,
  p_order_id        uuid        default null,
  p_payment_id      uuid        default null,
  p_commission_id   uuid        default null,
  p_actor_user_id   uuid        default null,
  p_metadata        jsonb       default null
) returns wallet_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet wallets;
  v_balance bigint;
  v_tx wallet_transactions;
begin
  if p_amount_minor is null or p_amount_minor <= 0 then
    raise exception 'wallet_apply: amount_minor must be a positive integer number of minor units'
      using errcode = '22023';
  end if;

  -- idempotency first: a retried call (replayed webhook, double-click) returns the original
  -- movement instead of moving money twice
  if p_idempotency_key is not null then
    select * into v_tx from wallet_transactions where idempotency_key = p_idempotency_key;
    if found then
      return v_tx;
    end if;
  end if;

  -- lock the wallet for the rest of this transaction (serialises concurrent movements)
  select * into v_wallet from wallets where user_id = p_user_id for update;
  if not found then
    raise exception 'wallet_apply: no wallet exists for user %', p_user_id using errcode = 'P0002';
  end if;

  v_balance := case
                 when p_direction = 'credit' then v_wallet.balance_minor + p_amount_minor
                 else v_wallet.balance_minor - p_amount_minor
               end;

  if v_balance < 0 then
    raise exception 'wallet_apply: insufficient balance — available %, requested %',
      v_wallet.balance_minor, p_amount_minor
      using errcode = '23514';
  end if;

  -- open the guard for this transaction only (third argument true = transaction-local)
  perform set_config('app.wallet_ledger_ok', 'on', true);

  update wallets
     set balance_minor = v_balance,
         version       = v_wallet.version + 1
   where id = v_wallet.id;

  perform set_config('app.wallet_ledger_ok', 'off', true);

  insert into wallet_transactions (
    wallet_id, user_id, direction, type, amount_minor, balance_after_minor, currency,
    description, order_id, payment_id, commission_id, idempotency_key, actor_user_id, metadata
  ) values (
    v_wallet.id, p_user_id, p_direction, p_type, p_amount_minor, v_balance, v_wallet.currency,
    p_description, p_order_id, p_payment_id, p_commission_id, p_idempotency_key, p_actor_user_id, p_metadata
  )
  returning * into v_tx;

  return v_tx;
exception
  when unique_violation then
    -- two concurrent calls with the same idempotency key: return the row that won
    if p_idempotency_key is not null then
      select * into v_tx from wallet_transactions where idempotency_key = p_idempotency_key;
      if found then
        return v_tx;
      end if;
    end if;
    raise;
end $$;

comment on function wallet_apply(uuid, wallet_direction, wallet_tx_type, bigint, text, text, uuid, uuid, uuid, uuid, jsonb) is
  'Moves money: locks the wallet, checks funds, updates the balance and writes exactly one ledger row — atomically. Idempotent when p_idempotency_key is supplied.';

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- every user gets exactly one wallet, created with the account
-- (wallet_apply refuses to run without a wallet, so this is the invariant that keeps it honest)
-- ───────────────────────────────────────────────────────────────────────────────────────────
create or replace function users_create_wallet() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into wallets (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end $$;

comment on function users_create_wallet() is 'Creates the user wallet on signup so a money movement can never fail for a missing wallet.';

drop trigger if exists users_create_wallet_trg on users;
create trigger users_create_wallet_trg
  after insert on users
  for each row execute function users_create_wallet();

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- ledger immutability
-- ───────────────────────────────────────────────────────────────────────────────────────────
create or replace function wallet_tx_immutable_fn() returns trigger
language plpgsql
as $$
begin
  raise exception 'wallet_transactions is append-only (attempted %)', tg_op using errcode = '42501';
end $$;

drop trigger if exists wallet_transactions_immutable_trg on wallet_transactions;
create trigger wallet_transactions_immutable_trg
  before update or delete on wallet_transactions
  for each row execute function wallet_tx_immutable_fn();

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- order status history: recorded by the database, not by remembering to call it
-- ───────────────────────────────────────────────────────────────────────────────────────────
create or replace function orders_track_status() returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    insert into order_status_history (order_id, from_status, to_status, source, note)
    values (new.id, old.status, new.status, 'system', 'status transition');
  end if;

  if new.status = 'completed' and new.completed_at is null then
    new.completed_at := now();
  end if;

  return new;
end $$;

comment on function orders_track_status() is
  'Records every order status transition automatically (source=system) and stamps completed_at. An admin action may add an additional row naming the actor.';

drop trigger if exists orders_track_status_trg on orders;
create trigger orders_track_status_trg
  before update on orders
  for each row execute function orders_track_status();

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- reconciliation: any wallet whose cached balance disagrees with its ledger
-- ───────────────────────────────────────────────────────────────────────────────────────────
create or replace view wallet_reconciliation as
with ledger as (
  select
    wallet_id,
    sum(case when direction = 'credit' then amount_minor else -amount_minor end) as ledger_minor,
    count(*) as movements
  from wallet_transactions
  group by wallet_id
)
select
  w.id              as wallet_id,
  w.user_id,
  w.currency,
  w.balance_minor,
  coalesce(l.ledger_minor, 0)                                  as ledger_minor,
  w.balance_minor - coalesce(l.ledger_minor, 0)                as drift_minor,
  coalesce(l.movements, 0)                                     as movements
from wallets w
left join ledger l on l.wallet_id = w.id
where w.balance_minor <> coalesce(l.ledger_minor, 0);

comment on view wallet_reconciliation is
  'Should always be empty. A row means a wallet balance no longer matches its ledger and needs investigation before any further movement.';

insert into schema_migrations (filename, note)
values ('0003_wallet_ledger.sql', 'wallet_apply(), balance guard trigger, ledger immutability, status history, reconciliation view')
on conflict (filename) do nothing;
