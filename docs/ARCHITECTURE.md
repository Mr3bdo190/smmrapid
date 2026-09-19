# Architecture

## Locked decisions (Phase 0)

| Topic | Decision |
|---|---|
| Repository | same repo `Mr3bdo190/smmrapid`, same `main` branch, no new repo, no remote change |
| Legacy code | reference only — never a base, never mixed in. Full history is preserved on `main` and on `backup/legacy-smmrapid` |
| Authentication | **existing** Firebase project, integration rebuilt from scratch (Admin SDK on the server) |
| Database | a **new** Supabase PostgreSQL project; **no data migration**, no legacy tables |
| Money | integer minor units, ledger-based, atomic, never float |
| Payments | Heleket (USD/crypto) + Sh7nawy (EGP/wallet) as independent adapters, credentials from env only |
| Providers | SMM provider abstraction (interface + one adapter per provider) |
| Deployment | same Render service, same domain `smmrapid.store`; Render hosts the app server only (no Render Postgres) |
| Secrets | environment variables only; nothing secret is ever committed |

## Repository layout

```
apps/api/            Express + TypeScript API
  src/config/        env contract (zod), later: settings loader
  src/lib/           logger, later: db, crypto, money, http clients
  src/middleware/    error handler, later: auth, rate limit, validation
  src/modules/       one folder per domain module (see below)
  src/routes/        single mount point for all module routers
  test/              node:test suites running against the built server
apps/web/            React + Vite + Tailwind client
  src/               App entry, design tokens in src/index.css
database/            migrations/ + seeds/ (SQL, run by the owner)
docs/                setup, environment, database, render, architecture
.github/workflows/   CI: install → typecheck → lint → test → build
```

`apps/api/src/modules/` — added one per phase, never before it is implemented:
`health` · `auth` · `users` · `catalog` · `orders` · `wallet` · `pricing` · `payments` ·
`providers` · `referrals` · `tickets` · `notifications` · `content` · `seo` · `admin` · `audit`.

## Request path

```
Browser
  → apps/web (React)
  → apps/api  (Express)
      → Firebase Admin SDK      verify the ID token  (identity)
      → Postgres (Supabase)     authorization from the database, never from the request body
      → adapters                SMM providers, payment gateways
```

The browser never talks to Supabase directly for privileged operations, and never sends an
identity, role or balance the server trusts. Everything sensitive is decided server-side.

## Financial rules (non-negotiable)

1. Balances live in `wallet_transactions`; a wallet row is a cache of its ledger.
2. No balance change without a ledger row, in the same transaction.
3. Debit → create order → submit to provider is one atomic flow; a provider failure refunds.
4. Payment credit happens only from a signature-verified, idempotent webhook — never from the
   browser returning to a "success" page.
5. Amounts are integers in minor units; rounding happens once, server-side.

## Error contract

```
{ "success": true,  "data": … }
{ "success": false, "error": { "code": "STABLE_CODE", "message": "…", "ref": "…" } }
```

Clients translate by `code`. Every customer-facing code answers three questions: what happened,
whether money moved, and what to do next — in both Arabic and English. Unexpected failures keep
the real cause server-side and return a neutral message plus the support `ref`.

## Branches

- `main` — production branch (currently the legacy project until Phase 18 completes).
- `rebuild/v2` — the new platform; merged into `main` as a fast-forward (no force push).
- `backup/legacy-smmrapid` — frozen pointer to the last legacy commit.

## Phases

`0` audit · `1` scaffold + CI · `2` database · `3` Firebase auth · `4` backend core ·
`5` wallet + ledger · `6` pricing · `7` providers + sync · `8` orders · `9` payments +
webhooks · `10` catalog · `11` dashboard + onboarding · `12` referrals · `13` tickets +
notifications · `14` admin · `15` RBAC + audit · `16` SEO + blog · `17` testing/QA ·
`18` Render + domain.

Each phase stops for explicit approval before the next one starts.
