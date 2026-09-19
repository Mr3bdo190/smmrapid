-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- SMM Rapid — database verification suite (database/tests/verify.sql)
--
-- Run AFTER every migration and seed file has been applied. It is the gate that proves the
-- money rules are enforced by the database itself, not by convention:
--   structure · RLS posture · privileges · wallet guard · ledger atomicity & idempotency ·
--   overdraft refusal · append-only ledger & audit log · order profit/history · payment and
--   webhook idempotency · coupon constraints · seeds · triggers
--
-- Every check either passes silently (NOTICE: OK …) or aborts with TEST FAILED.
-- Run it with:  psql "$DATABASE_DIRECT_URL" -v ON_ERROR_STOP=1 -f database/tests/verify.sql
--
-- It creates a test user, test orders and a test payment. Use it on a fresh/dev database, not
-- on production with real customer data.
-- ═══════════════════════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on

-- A fresh id per run: the suite creates its own fixtures, and it must stay re-runnable
-- (CI applies every file twice, and a developer may run it as often as they like).
select set_config('test.uid', 'verify-' || replace(gen_random_uuid()::text, '-', ''), false) as test_uid;


-- ───────────────────────────────────────────────────────────────────────────────────────────
-- 1. structure
-- ───────────────────────────────────────────────────────────────────────────────────────────
do $$
declare
  expected text[] := array[
    'users','user_profiles','roles','permissions','role_permissions','user_roles',
    'settings','feature_flags','providers','provider_services','provider_sync_logs',
    'categories','services','service_variants','coupons','coupon_redemptions',
    'wallets','wallet_transactions','system_logs','payments','payment_attempts','webhook_events',
    'orders','order_items','order_status_history',
    'referrals','referral_clicks','affiliate_commissions','affiliate_withdrawals',
    'tickets','ticket_messages','notifications','admin_notifications',
    'banners','pages','post_categories','posts','post_tags','seo_metadata',
    'audit_logs','schema_migrations'
  ];
  missing text[];
  no_rls text[];
begin
  select array_agg(t) into missing
  from unnest(expected) t
  where not exists (select 1 from pg_tables where schemaname = 'public' and tablename = t);
  if missing is not null then
    raise exception 'TEST FAILED: missing tables %', missing;
  end if;

  select array_agg(tablename) into no_rls
  from pg_tables
  where schemaname = 'public' and not rowsecurity;
  if no_rls is not null then
    raise exception 'TEST FAILED: tables without RLS: %', no_rls;
  end if;

  raise notice 'OK  structure: % tables present, RLS on all of them', array_length(expected, 1);
end $$;

do $$
declare
  expected text[] := array['user_status','order_status','wallet_direction','wallet_tx_type',
    'payment_gateway','payment_status','webhook_status','coupon_type','commission_status',
    'withdrawal_status','ticket_status','ticket_author_type','content_status','log_level',
    'execution_mode','price_unit','input_type','provider_sync_status','order_event_source',
    'coupon_scope','referral_status','commission_type','ticket_priority','audit_actor_type'];
  missing text[];
begin
  select array_agg(t) into missing from unnest(expected) t
  where not exists (select 1 from pg_type where typname = t);
  if missing is not null then raise exception 'TEST FAILED: missing enum types %', missing; end if;
  raise notice 'OK  enums: all % present', array_length(expected, 1);
end $$;

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- 2. privilege posture (anon/authenticated must have nothing)
-- ───────────────────────────────────────────────────────────────────────────────────────────
do $$
declare
  t text;
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    for t in select tablename from pg_tables where schemaname = 'public' loop
      if has_table_privilege('anon', 'public.' || quote_ident(t), 'SELECT')
         or has_table_privilege('anon', 'public.' || quote_ident(t), 'INSERT')
         or has_table_privilege('anon', 'public.' || quote_ident(t), 'UPDATE')
         or has_table_privilege('anon', 'public.' || quote_ident(t), 'DELETE') then
        raise exception 'TEST FAILED: role anon still has privileges on %', t;
      end if;
    end loop;
    raise notice 'OK  privileges: anon has no access to any table';
  else
    raise notice 'SKIP privileges: role anon not present in this database';
  end if;
end $$;

do $$
begin
  if has_function_privilege('public',
       'wallet_apply(uuid, wallet_direction, wallet_tx_type, bigint, text, text, uuid, uuid, uuid, uuid, jsonb)',
       'EXECUTE') then
    raise exception 'TEST FAILED: PUBLIC can execute wallet_apply';
  end if;
  raise notice 'OK  privileges: wallet_apply is not executable by PUBLIC';
end $$;

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- 3. the money rules
-- ───────────────────────────────────────────────────────────────────────────────────────────
-- 3a. a new user automatically gets a wallet with a zero balance
do $$
declare
  uid uuid;
  w wallets;
begin
  insert into users (firebase_uid, email, display_name)
  values (current_setting('test.uid'), current_setting('test.uid') || '@test.local', 'Money Tester')
  returning id into uid;

  select * into w from wallets where user_id = uid;
  if not found then raise exception 'TEST FAILED: no wallet created with the user'; end if;
  if w.balance_minor <> 0 then raise exception 'TEST FAILED: new wallet balance is %', w.balance_minor; end if;
  raise notice 'OK  wallets: created automatically with zero balance';
end $$;

-- 3b. a direct balance update is refused
do $$
begin
  begin
    update wallets set balance_minor = balance_minor + 100
    where user_id = (select id from users where firebase_uid = current_setting('test.uid'));
    raise exception 'TEST FAILED: direct balance update was allowed';
  exception when others then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
    raise notice 'OK  guard: direct balance update blocked';
  end;
end $$;

-- 3c. wallet_apply credits, debits, records the ledger and is idempotent
do $$
declare
  uid uuid;
  tx1 wallet_transactions;
  tx2 wallet_transactions;
  bal bigint;
  ledger_rows int;
begin
  select id into uid from users where firebase_uid = current_setting('test.uid');

  tx1 := wallet_apply(uid, 'credit', 'payment', 5000, 'deposit', current_setting('test.uid') || '-idem-1');
  if tx1.balance_after_minor <> 5000 then
    raise exception 'TEST FAILED: balance_after is % (expected 5000)', tx1.balance_after_minor;
  end if;

  tx2 := wallet_apply(uid, 'credit', 'payment', 5000, 'deposit replay', current_setting('test.uid') || '-idem-1');
  if tx2.id <> tx1.id then raise exception 'TEST FAILED: idempotency key created a second ledger row'; end if;

  select balance_minor into bal from wallets where user_id = uid;
  if bal <> 5000 then raise exception 'TEST FAILED: balance is % after a replayed credit (expected 5000)', bal; end if;

  perform wallet_apply(uid, 'debit', 'order_charge', 2000, 'order charge');
  select balance_minor into bal from wallets where user_id = uid;
  if bal <> 3000 then raise exception 'TEST FAILED: balance is % after debit (expected 3000)', bal; end if;

  select count(*) into ledger_rows from wallet_transactions where user_id = uid;
  if ledger_rows <> 2 then raise exception 'TEST FAILED: expected 2 ledger rows, found %', ledger_rows; end if;

  raise notice 'OK  wallet_apply: credit, idempotent replay, debit, ledger rows all correct';
end $$;

-- 3d. an overdraft is refused and moves nothing
do $$
declare
  uid uuid;
  bal bigint;
  rows_before int;
  rows_after int;
begin
  select id into uid from users where firebase_uid = current_setting('test.uid');
  select count(*) into rows_before from wallet_transactions where user_id = uid;

  begin
    perform wallet_apply(uid, 'debit', 'order_charge', 999999, 'too much');
    raise exception 'TEST FAILED: overdraft was allowed';
  exception when others then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
  end;

  select balance_minor into bal from wallets where user_id = uid;
  select count(*) into rows_after from wallet_transactions where user_id = uid;
  if bal <> 3000 then raise exception 'TEST FAILED: balance changed to % after a refused debit', bal; end if;
  if rows_after <> rows_before then raise exception 'TEST FAILED: a refused debit wrote a ledger row'; end if;

  raise notice 'OK  wallet_apply: overdraft refused, balance and ledger untouched';
end $$;

-- 3e. the ledger is append-only
do $$
begin
  begin
    update wallet_transactions set amount_minor = 1 where true;
    raise exception 'TEST FAILED: ledger UPDATE was allowed';
  exception when others then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
    raise notice 'OK  ledger: UPDATE blocked';
  end;

  begin
    delete from wallet_transactions where true;
    raise exception 'TEST FAILED: ledger DELETE was allowed';
  exception when others then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
    raise notice 'OK  ledger: DELETE blocked';
  end;
end $$;

-- 3f. reconciliation finds no drift
do $$
declare n int;
begin
  select count(*) into n from wallet_reconciliation;
  if n <> 0 then raise exception 'TEST FAILED: wallet_reconciliation reports % drifting wallets', n; end if;
  raise notice 'OK  reconciliation: no wallet drift';
end $$;

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- 4. orders, history and money columns
-- ───────────────────────────────────────────────────────────────────────────────────────────
do $$
declare
  uid uuid;
  svc uuid;
  oid uuid;
  o orders;
  hist int;
  tx wallet_transactions;
begin
  select id into uid from users where firebase_uid = current_setting('test.uid');
  select id into svc from services where slug = 'instagram-likes-instant';

  -- pay for the order through the ledger, then create it (the API's real order of operations)
  tx := wallet_apply(uid, 'debit', 'order_charge', 400, 'order charge');

  insert into orders (user_id, service_id, target, quantity, charge_minor, provider_cost_minor)
  values (uid, svc, 'https://instagram.com/p/example', 100, 400, 250)
  returning * into o;

  if o.profit_minor <> 150 then
    raise exception 'TEST FAILED: profit_minor is % (expected 150)', o.profit_minor;
  end if;
  if o.status <> 'pending' then raise exception 'TEST FAILED: new order status is %', o.status; end if;
  if o.public_id is null or o.public_id not like 'ORD%' then
    raise exception 'TEST FAILED: public_id was not generated (%)', o.public_id;
  end if;

  update orders set status = 'processing' where id = o.id;
  update orders set status = 'completed' where id = o.id;

  select count(*) into hist from order_status_history where order_id = o.id;
  if hist <> 2 then raise exception 'TEST FAILED: expected 2 history rows, found %', hist; end if;

  select * into o from orders where id = o.id;
  if o.completed_at is null then raise exception 'TEST FAILED: completed_at was not stamped'; end if;

  raise notice 'OK  orders: generated ids, profit column, status history and completed_at';
end $$;

-- 4b. an order without a service is refused, and target length is bounded
do $$
declare
  uid uuid;
begin
  select id into uid from users where firebase_uid = current_setting('test.uid');

  begin
    insert into orders (user_id, service_id, target, quantity, charge_minor)
    values (uid, gen_random_uuid(), 'https://example.com', 10, 100);
    raise exception 'TEST FAILED: an order referencing a missing service was accepted';
  exception when foreign_key_violation then
    raise notice 'OK  orders: foreign key to services enforced';
  end;

  begin
    insert into orders (user_id, service_id, target, quantity, charge_minor)
    select uid, id, repeat('x', 5001), 10, 100 from services limit 1;
    raise exception 'TEST FAILED: an over-long target was accepted';
  exception when check_violation then
    raise notice 'OK  orders: target length bounded at 5000';
  end;
end $$;

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- 5. payment idempotency guards
-- ───────────────────────────────────────────────────────────────────────────────────────────
do $$
declare
  uid uuid;
  pid uuid;
begin
  select id into uid from users where firebase_uid = current_setting('test.uid');

  insert into payments (user_id, gateway, method, amount_minor, provider_reference)
  values (uid, 'shahnawy', 'vf_cash', 5000, current_setting('test.uid') || '-ref-1')
  returning id into pid;

  begin
    insert into payments (user_id, gateway, method, amount_minor, provider_reference)
    values (uid, 'shahnawy', 'vf_cash', 5000, current_setting('test.uid') || '-ref-1');
    raise exception 'TEST FAILED: a duplicate gateway reference was accepted';
  exception when unique_violation then
    raise notice 'OK  payments: duplicate gateway reference rejected';
  end;

  insert into webhook_events (gateway, event_id, payment_id, signature_valid, status)
  values ('shahnawy', current_setting('test.uid') || '-event-1', pid, true, 'processed');

  begin
    insert into webhook_events (gateway, event_id, payment_id, signature_valid, status)
    values ('shahnawy', current_setting('test.uid') || '-event-1', pid, true, 'processed');
    raise exception 'TEST FAILED: a replayed webhook event was accepted';
  exception when unique_violation then
    raise notice 'OK  webhooks: replayed event rejected (idempotency)';
  end;
end $$;

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- 6. coupon constraints
-- ───────────────────────────────────────────────────────────────────────────────────────────
do $$
begin
  begin
    insert into coupons (code, type, percent_bp, amount_minor) values ('BAD10', 'percent', 1000, 500);
    raise exception 'TEST FAILED: a percent coupon carrying a fixed amount was accepted';
  exception when check_violation then
    raise notice 'OK  coupons: value must match its type';
  end;

  begin
    insert into coupons (code, type, amount_minor, scope, service_id) values ('BAD20', 'fixed', 500, 'category', null);
    raise exception 'TEST FAILED: a category coupon without a category was accepted';
  exception when check_violation then
    raise notice 'OK  coupons: scope target enforced';
  end;
end $$;

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- 7. seeds landed correctly
-- ───────────────────────────────────────────────────────────────────────────────────────────
do $$
declare
  c int; s int; inactive int; p int; r int; setts int; admin_perms int; total_perms int;
begin
  select count(*) into c from categories;
  select count(*) into s from services;
  select count(*) into inactive from services where not is_active;
  select count(*) into p from permissions;
  select count(*) into r from roles;
  select count(*) into setts from settings;

  select count(*) into total_perms from permissions;
  select count(*) into admin_perms from role_permissions rp
    join roles ro on ro.id = rp.role_id where ro.key = 'admin';

  if c < 5 then raise exception 'TEST FAILED: only % categories seeded', c; end if;
  if s < 8 then raise exception 'TEST FAILED: only % services seeded', s; end if;
  if inactive <> s then raise exception 'TEST FAILED: % of % sample services are active — they must ship inactive', s - inactive, s; end if;
  if p < 30 then raise exception 'TEST FAILED: only % permissions seeded', p; end if;
  if r <> 3 then raise exception 'TEST FAILED: expected 3 roles, found %', r; end if;
  if setts < 15 then raise exception 'TEST FAILED: only % settings seeded', setts; end if;
  if admin_perms <> total_perms then
    raise exception 'TEST FAILED: admin has % of % permissions', admin_perms, total_perms;
  end if;

  raise notice 'OK  seeds: % categories, % services (all inactive), % permissions, % roles, % settings',
    c, s, p, r, setts;
end $$;

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- 8. updated_at trigger
-- ───────────────────────────────────────────────────────────────────────────────────────────
do $$
declare before_ts timestamptz; after_ts timestamptz;
begin
  select updated_at into before_ts from categories order by slug limit 1;
  perform pg_sleep(0.01);
  update categories set sort_order = sort_order + 0 where slug = (select slug from categories order by slug limit 1);
  select updated_at into after_ts from categories order by slug limit 1;
  if after_ts <= before_ts then raise exception 'TEST FAILED: updated_at did not advance'; end if;
  raise notice 'OK  triggers: updated_at advances automatically';
end $$;

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- 9. audit_logs is append-only
-- ───────────────────────────────────────────────────────────────────────────────────────────
do $$
begin
  insert into audit_logs (actor_type, action, entity_type, entity_id, new_value)
  values ('system', 'TEST_ACTION', 'order', 'x', '{"a":1}'::jsonb);

  begin
    delete from audit_logs where action = 'TEST_ACTION';
    raise exception 'TEST FAILED: audit_logs DELETE was allowed';
  exception when others then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
    raise notice 'OK  audit_logs: append-only enforced';
  end;
end $$;

do $$ begin raise notice '── ALL DATABASE CHECKS PASSED ──'; end $$;
