# Database setup (Supabase PostgreSQL)

> **Status:** the SQL files are produced in **Phase 2**. This document defines the target so
> the layout is fixed before the first line of SQL exists. No legacy schema or data is used.

## 1. Create the project

1. Supabase dashboard → **New project**.
2. Region: closest to the Render region of the service (`oregon` today) to keep latency low.
3. Save the database password in your password manager — it is not recoverable later.

## 2. Connection strings

Settings → **Database**:

| Use | Which string | Where it goes |
|---|---|---|
| API server | **Connection pooling** (Supavisor, port 6543) | `DATABASE_URL` |
| Running migrations/seeds | **Direct connection** (port 5432) | `DATABASE_DIRECT_URL` (used only by you) |
| Browser | — | never used by this project |

Add both to the Render dashboard (API) and to your local `.env`. They are secrets: they never
appear in Git, in logs, or in the documentation.

## 3. Run the migrations — order matters

Apply the files in `database/migrations/` in ascending filename order, then the seed:

```
0001_initial_schema.sql      tables, enums, constraints, foreign keys
0002_indexes.sql             the indexes the queries need
0003_rls_and_security.sql    deny-by-default RLS + the server's role grants
0004_seed.sql                site settings, categories, reference data
```

Both ways work:

- **SQL editor (recommended):** paste one file at a time, run, confirm "Success", move on.
- **psql:**
  ```bash
  psql "$DATABASE_DIRECT_URL" -v ON_ERROR_STOP=1 -f database/migrations/0001_initial_schema.sql
  ```

`ON_ERROR_STOP=1` matters: without it `psql` reports success while a statement has failed.

## 4. Verify

```sql
-- every expected table exists
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;
```

Then confirm the API reports the database as reachable: `GET /health/db` (added in Phase 2).

## 5. Adding a future migration

1. New file, next number: `0005_<what_it_does>.sql`.
2. Never edit an applied file.
3. Re-runnable where possible (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).
4. Destructive changes (dropping a column/table) need the owner's approval first, and the
   file must state the rollback.

## 6. Safety notes

- The service-role key is server-side only; no table is writable from the browser.
- RLS is enabled on every table (deny-by-default) as defence in depth.
- Backups: Supabase daily backups; take a manual snapshot before any destructive migration.
