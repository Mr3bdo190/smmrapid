# database/

Schema for the **new Supabase PostgreSQL** project. Nothing here is connected to the legacy
database, and no legacy data is migrated or imported.

```
database/
├── migrations/    ordered DDL — the single source of truth for the schema
├── seeds/         reference data (settings, roles, catalog scaffolding)
├── tests/         the assertion suite that gates every change
└── README.md
```

## Files

| File | What it creates |
|---|---|
| `migrations/0001_initial_schema.sql` | 24 enum types, 41 tables, foreign keys, CHECK constraints, `updated_at` triggers, `schema_migrations` |
| `migrations/0002_indexes.sql` | 100+ indexes, partial unique guards (gateway reference, slugs, tags) and the blog search index |
| `migrations/0003_wallet_ledger.sql` | `wallet_apply()` — the only way money moves — the balance guard trigger, wallet auto-creation, ledger immutability, order status history, `wallet_reconciliation` |
| `migrations/0004_rls_and_security.sql` | RLS on every table, `anon`/`authenticated` privileges revoked, service role granted, `audit_logs` append-only, policy templates |
| `seeds/0001_reference_data.sql` | 3 roles, 31 permissions, role↔permission wiring, 22 settings, 8 feature flags, 5 categories, 9 sample services (inactive), FAQ page, example draft post |
| `tests/00_test_roles.sql` | Local/CI stand-ins for the three Supabase roles (no-op on Supabase) |
| `tests/verify.sql` | 22 assertion checks: structure, RLS posture, money rules, idempotency, constraints, seeds, triggers |

## Conventions

- **Naming:** `NNNN_description.sql`, applied in ascending order. An applied file is never
  edited — the next change is a new file.
- **Money** is a `bigint` in **minor units** (cents) and the column name ends in `_minor`.
  No float, no `numeric`, no `money` type for amounts. `numeric` is only for percentages,
  fx rates and ratios.
- **Ids:** `uuid` for entities (users, orders, payments, services…), `bigint identity` for
  append-only streams (ledger, logs, events, messages).
- **Timestamps:** `timestamptz`; `updated_at` is maintained by the `set_updated_at` trigger.
- **Money is append-only:** `wallet_transactions` and `audit_logs` reject UPDATE and DELETE.
- **Secrets never enter the database.** Supplier credentials are stored encrypted
  (`providers.credentials_encrypted`) with the key held in the environment.

## How to run

Order matters: migrations first (ascending), then seeds, then the assertion suite.

```bash
psql "$DATABASE_DIRECT_URL" -v ON_ERROR_STOP=1 -f database/tests/00_test_roles.sql   # local/CI only
for f in database/migrations/*.sql; do psql "$DATABASE_DIRECT_URL" -v ON_ERROR_STOP=1 -f "$f"; done
for f in database/seeds/*.sql;      do psql "$DATABASE_DIRECT_URL" -v ON_ERROR_STOP=1 -f "$f"; done
psql "$DATABASE_DIRECT_URL" -v ON_ERROR_STOP=1 -f database/tests/verify.sql
```

Full walkthrough (Supabase dashboard, SQL editor, verification, rollback):
**`docs/DATABASE_SETUP.md`**.

## Idempotency

Every file is written to be run twice safely: `CREATE … IF NOT EXISTS`, `ON CONFLICT DO
NOTHING`, `DROP TRIGGER IF EXISTS` + recreate, `CREATE OR REPLACE FUNCTION`. CI enforces this
by applying all five files twice on a clean database before the assertions run.

Two things are deliberately **not** re-applied on a second run:

1. **Seed rows** use `ON CONFLICT DO NOTHING` — a value an admin has edited since is never
   overwritten by re-running a seed. To change seeded defaults, write a new seed/migration.
2. **Index definitions** are `IF NOT EXISTS`: changing an existing index needs an explicit
   `DROP INDEX` + `CREATE INDEX` in a new migration file (idempotent statements never rewrite).

Extending an enum that is already in use must happen in its own migration
(`ALTER TYPE … ADD VALUE` cannot take effect in the same transaction that uses the new value).
