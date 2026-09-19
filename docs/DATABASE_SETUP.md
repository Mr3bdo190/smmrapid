# Database setup — Supabase PostgreSQL

The new platform runs on its **own** Supabase project. No legacy schema, connection or data is
reused, and nothing from the old database is migrated.

- Schema source of truth: `database/migrations/`
- Reference data: `database/seeds/`
- Assertion suite: `database/tests/verify.sql`

---

## 1. Create the project

1. Supabase dashboard → **New project**.
2. **Region:** pick the one closest to the Render service (`oregon` today) — the app talks to
   this database on every request.
3. **Database password:** generate a strong one and store it in your password manager; it is not
   recoverable later.
4. Wait for provisioning to finish (a fresh project takes a few minutes).

## 2. Collect the two connection strings

Supabase → **Project settings → Database → Connection string**:

| Purpose | Which one | Environment variable |
|---|---|---|
| The API server (many short connections) | **Connection pooling** — Supavisor, port `6543` | `DATABASE_URL` |
| Running these SQL files (one long session) | **Direct connection**, port `5432` | `DATABASE_DIRECT_URL` (used only by you) |

Add `DATABASE_URL` (and later `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) to the **Render
dashboard**. Never commit them: `.gitignore` blocks `.env*` except `.env.example`.

> Use the shared pooler for the server, never the direct port: Render opens several short-lived
> connections and the direct connection limit on the free tier is small.

## 3. Apply the schema — exact order

Run one file at a time and wait for **Success** before the next.

**Option A — SQL editor (recommended, no tools to install)**

1. `database/migrations/0001_initial_schema.sql` — tables, enums, constraints, triggers
2. `database/migrations/0002_indexes.sql` — indexes and unique guards
3. `database/migrations/0003_wallet_ledger.sql` — `wallet_apply()`, balance guard, ledger rules
4. `database/migrations/0004_rls_and_security.sql` — RLS, privileges, audit hardening
5. `database/seeds/0001_reference_data.sql` — roles, permissions, settings, categories, samples

**Option B — psql from a terminal**

```bash
export DATABASE_DIRECT_URL='postgresql://...'   # your direct connection string

for f in database/migrations/*.sql; do
  echo "── $f"
  psql "$DATABASE_DIRECT_URL" -v ON_ERROR_STOP=1 -f "$f" || break
done

psql "$DATABASE_DIRECT_URL" -v ON_ERROR_STOP=1 -f database/seeds/0001_reference_data.sql
```

`ON_ERROR_STOP=1` is not optional: without it `psql` keeps going after a failure and reports
success at the end.

Each file records itself in `schema_migrations`, so you can always see what has been applied:

```sql
select filename, applied_at from schema_migrations order by applied_at;
```

## 4. Verify

**a. Structure and posture** — expect 41 tables, all with RLS on:

```sql
select count(*) as tables,
       count(*) filter (where rowsecurity) as with_rls
from pg_tables where schemaname = 'public';

select * from schema_migrations order by applied_at;
```

**b. The assertion suite** — proves the money rules are enforced by the database itself:

```bash
psql "$DATABASE_DIRECT_URL" -v ON_ERROR_STOP=1 -f database/tests/verify.sql
```

It prints `OK …` per check and finishes with `── ALL DATABASE CHECKS PASSED ──`. It creates a
test user, a test order and a test payment, so run it on a fresh project, not on production
with real customers. It is safe to re-run.

**c. Wallet integrity at any time** (must return zero rows):

```sql
select * from wallet_reconciliation;
```

## 5. Grant yourself admin

No users are seeded — your account is created by signing in. After the first sign-in:

```sql
insert into user_roles (user_id, role_id)
select u.id, r.id
from users u, roles r
where lower(u.email) = lower('you@example.com') and r.key = 'admin'
on conflict do nothing;
```

`admin` already holds every permission. `support` and `finance` are seeded with narrower sets.

## 6. How the security layer is layered

1. **RLS is enabled on every table**, with no policy for `anon` or `authenticated`: a browser
   holding the anon key cannot read or write a single row.
2. **The API holds the only privileged connection** (service role) and is the only path to
   customer data — it decides authorization in code, from the database, never from the request.
3. **Money has a database-level guard**: `wallets.balance_minor` can only change inside
   `wallet_apply()`, which writes the ledger row in the same transaction. A direct
   `UPDATE wallets SET balance_minor = …` raises an exception instead of silently moving money.
4. **Append-only tables** (`wallet_transactions`, `audit_logs`) reject UPDATE and DELETE.

If a future phase needs the browser to read something directly, add the narrowest possible
policy at the bottom of `0004_rls_and_security.sql` (examples are written there). Never grant
`insert`/`update`/`delete` to `anon`/`authenticated` on money or admin tables.

## 7. Adding a future migration

1. New file, next number: `database/migrations/0005_<what_it_does>.sql`.
2. Never edit a file that has been applied — the database has no way to know.
3. Keep it runnable twice (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, `CREATE OR REPLACE`).
4. Enums: `ALTER TYPE … ADD VALUE` must be its own migration.
5. Indexes: changing an existing index requires `DROP INDEX` + `CREATE INDEX`.
6. Additive by default. A destructive change (dropping a column/table, narrowing a type) needs
   the owner's approval first and must state its rollback in the file header.
7. Update `database/tests/verify.sql` with a check for the new behaviour.

## 8. Rollback and recovery

**Before go-live (the current stage)** — the fastest reliable rollback of this schema is a full
reset of the (still empty) project:

```sql
-- DESTRUCTIVE: removes every object in public. Only valid on a database with no real data.
drop schema public cascade;
create schema public;
```

Then re-apply 0001 → 0004 and the seeds. That is why the migrations are written to be
re-runnable from an empty schema. There are deliberately **no `_down.sql` files in the
repository**: a down-file that has never been tested on real data is more dangerous than a
documented reset, and on a fresh project the reset takes about a minute.

**After go-live** — do not reset. Use, in order of preference:

1. **Supabase daily backups / Point-in-Time Recovery** (dashboard → Database → Backups):
   restore to a new project and verify before switching the connection string.
2. **A forward-fix migration** that reverses the change (preferred over restoring data, and the
   only option that keeps new customer activity).
3. Before any risky migration: take a manual backup snapshot first, and run the change on a
   staging project.

**Single-object recovery** — every object here is created by exactly one file, so you can
recreate one piece without touching the rest:

| Object | Recreate with |
|---|---|
| A table + its constraints | re-run `0001_initial_schema.sql` (idempotent) |
| An index | re-run `0002_indexes.sql` |
| `wallet_apply()` / guard triggers / view | re-run `0003_wallet_ledger.sql` |
| RLS + privileges | re-run `0004_rls_and_security.sql` |
| Seed defaults | re-run `seeds/0001_reference_data.sql` (never overwrites edited values) |
