-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- SMM Rapid — test-only helper: the three Supabase roles
--
-- On a real Supabase project `anon`, `authenticated` and `service_role` already exist, so this
-- file is a no-op there. It exists so that a local database or a CI Postgres container really
-- exercises the grant/revoke logic in 0004 instead of skipping it.
-- ═══════════════════════════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;
