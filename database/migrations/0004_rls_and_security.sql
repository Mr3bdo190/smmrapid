-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- SMM Rapid — 0004: RLS, grants and audit hardening
--
-- POSTURE (deny by default)
--   * Row Level Security is enabled on every table in `public`.
--   * No policy grants anything to `anon` or `authenticated`: the browser cannot read or write
--     a single row even if it holds the anon key. All customer access goes through the API.
--   * The API connects with the service role, which is the only privileged path.
--   * Money functions are not executable by PUBLIC (PostgreSQL grants EXECUTE to PUBLIC by
--     default — revoked here).
--
-- Why RLS is enabled but not FORCEd: forcing it would also apply to the table owner, which
-- would lock out any connection using the direct/owner role. Enabling it without FORCE stops
-- `anon`/`authenticated` while the owner and the service role keep working.
--
-- Safe to re-run: it only re-enables RLS, re-revokes privileges and recreates triggers.
-- ═══════════════════════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- 1. every table: RLS on
--    (a table created by a LATER migration must be added here — the verification query in
--     docs/DATABASE_SETUP.md lists any table that is missing it)
-- ───────────────────────────────────────────────────────────────────────────────────────────
do $$
declare
  t record;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- 2. browser roles keep nothing (guarded: these roles only exist on Supabase)
-- ───────────────────────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on all tables in schema public from anon';
    execute 'revoke all on all sequences in schema public from anon';
    execute 'revoke all on all functions in schema public from anon';
    execute 'alter default privileges in schema public revoke all on tables from anon';
    execute 'alter default privileges in schema public revoke all on sequences from anon';
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on all tables in schema public from authenticated';
    execute 'revoke all on all sequences in schema public from authenticated';
    execute 'revoke all on all functions in schema public from authenticated';
    execute 'alter default privileges in schema public revoke all on tables from authenticated';
    execute 'alter default privileges in schema public revoke all on sequences from authenticated';
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- 3. the service role (the API server) is the only privileged path
-- ───────────────────────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant usage on schema public to service_role';
    execute 'grant all privileges on all tables in schema public to service_role';
    execute 'grant all privileges on all sequences in schema public to service_role';
    execute 'grant execute on all functions in schema public to service_role';
    execute 'alter default privileges in schema public grant all on tables to service_role';
    execute 'alter default privileges in schema public grant all on sequences to service_role';
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- 4. money functions are callable by the server only (PUBLIC has EXECUTE by default in PG)
-- ───────────────────────────────────────────────────────────────────────────────────────────
revoke all on function wallet_apply(
  uuid, wallet_direction, wallet_tx_type, bigint, text, text, uuid, uuid, uuid, uuid, jsonb
) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute $g$grant execute on function wallet_apply(
      uuid, wallet_direction, wallet_tx_type, bigint, text, text, uuid, uuid, uuid, uuid, jsonb
    ) to service_role$g$;
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- 5. audit_logs is append-only, enforced by the database
-- ───────────────────────────────────────────────────────────────────────────────────────────
create or replace function audit_logs_immutable_fn() returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs is append-only (attempted %)', tg_op using errcode = '42501';
end $$;

drop trigger if exists audit_logs_immutable_trg on audit_logs;
create trigger audit_logs_immutable_trg
  before update or delete on audit_logs
  for each row execute function audit_logs_immutable_fn();

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- 6. WHEN a future phase needs direct browser access, add the policy ITSELF here — narrowly.
--    Everything below is inert (comments) and documents the only shapes we accept.
--
--    Example A — public catalog read (only if the web app ever queries Supabase directly):
--
--      create policy catalog_read_categories on categories
--        for select to anon, authenticated
--        using (is_active and deleted_at is null);
--
--      create policy catalog_read_services on services
--        for select to anon, authenticated
--        using (is_active and deleted_at is null);
--
--    Example B — a signed-in customer reading only their own rows (Supabase auth):
--
--      create policy own_orders_read on orders
--        for select to authenticated
--        using (user_id = (select id from users where firebase_uid = auth.uid()::text));
--
--    Never grant insert/update/delete to `anon`/`authenticated` on wallets,
--    wallet_transactions, payments, orders or any admin table: those go through the API.
-- ───────────────────────────────────────────────────────────────────────────────────────────

insert into schema_migrations (filename, note)
values ('0004_rls_and_security.sql', 'RLS enabled everywhere, anon/authenticated revoked, service role granted, audit append-only')
on conflict (filename) do nothing;
