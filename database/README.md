# database/

Schema for the new **Supabase PostgreSQL** project. No file in this repository is connected
to the legacy database, and no legacy data is migrated (see `docs/ARCHITECTURE.md`).

```
database/
├── migrations/   ordered, re-runnable SQL — the single source of truth for the schema
├── seeds/        reference data (site settings, categories, sample services, FAQ)
└── README.md     this file
```

## Conventions

- **Naming:** `NNNN_description.sql` — zero-padded, executed in ascending order
  (`0001_initial_schema.sql`, `0002_indexes.sql`, `0003_rls_and_security.sql`, …).
  A migration file is never edited after it has been applied: the next change is a new file.
- **Idempotent where possible:** `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`,
  `INSERT … ON CONFLICT DO NOTHING` — so a re-run cannot corrupt an existing database.
- **Money is stored in integer minor units** (e.g. cents) — never floating point.
- **Every table carries** `created_at`/`updated_at`, foreign keys with explicit
  `ON DELETE` behaviour, and the indexes its queries need.
- **RLS** is enabled deny-by-default as defence in depth; the API server holds the only
  privileged connection (`SUPABASE_SERVICE_ROLE_KEY`) and never exposes it to the browser.

## Running the SQL

The owner runs these files in the Supabase SQL editor (or with `psql` against the direct
connection). Exact order and checks: **`docs/DATABASE_SETUP.md`**.

> Phase 2 creates `0001_initial_schema.sql` … `0004_seed.sql`. This directory is intentionally
> empty of SQL until that phase runs.
