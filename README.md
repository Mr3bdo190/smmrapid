# SMM Rapid

Production SMM panel platform — **rebuilt from scratch** (Phase 0 audit → Phase 18 deploy).
The repository previously held a legacy panel; its history is preserved on `main` and on the
`backup/legacy-smmrapid` branch, and no line of it is reused here.

**Stack:** Node 22 · TypeScript · Express (API) · React + Vite + Tailwind (web) · Supabase
PostgreSQL · Firebase Authentication (existing project) · Render (app server) ·
GitHub Actions (CI).

## Status

| Phase | Scope | State |
|---|---|---|
| 0 | Audit + architecture + locked decisions | ✅ done |
| 1 | Monorepo scaffold, tooling, CI | ✅ done |
| 2 | Database schema, migrations, seeds | ⏳ next |
| 3 | Firebase authentication | ⏳ |
| 4 | Backend core (modules, errors, validation) | ⏳ |
| 5 | Wallet + ledger | ⏳ |
| 6 | Pricing engine | ⏳ |
| 7 | Providers + sync | ⏳ |
| 8 | Orders engine | ⏳ |
| 9 | Payments (Sh7nawy + Heleket) + webhooks | ⏳ |
| 10–16 | Catalog, dashboard, referrals, tickets, admin, RBAC, SEO | ⏳ |
| 17–18 | Testing/QA, Render + domain | ⏳ |

Phase details and the rules each one follows: `docs/ARCHITECTURE.md`.
Each phase stops for the owner's explicit approval before the next one starts.

## Layout

```
apps/api/       Express + TypeScript API      (modules, config, logger, error envelope)
apps/web/       React + Vite client           (tokens in src/index.css)
database/       SQL migrations + seeds        (run by the owner — docs/DATABASE_SETUP.md)
docs/           architecture, setup, env, database, render
.github/        CI workflow
```

## Verify everything

```bash
npm ci
npm run check      # typecheck → lint → test → build
```

Individually: `npm run typecheck` · `npm run lint` · `npm test` · `npm run build`.

## Run locally

```bash
npm run dev:api    # http://localhost:3000  (GET /health)
npm run dev:web    # http://localhost:5173
```

Local setup details and the `$HOME` rule for Android/Termux: `docs/SETUP.md`.

## Documentation

- `docs/ARCHITECTURE.md` — locked decisions, module map, financial rules, phases
- `docs/SETUP.md` — prerequisites, install, verification, local run
- `docs/ENVIRONMENT.md` — every environment variable and its phase
- `docs/DATABASE_SETUP.md` — creating the Supabase project and running the SQL
- `docs/RENDER_DEPLOYMENT.md` — service settings, deploy and verify, rollback

## Ground rules

1. No fake features: no dead buttons, no placeholder pages, no mock data in production.
2. Money is correct before it is pretty: integer minor units, ledger rows, atomic operations.
3. Secrets live in environment variables only — never in Git, never in logs.
4. Everything customer-facing works in Arabic and English.
5. Verification is evidence: typecheck, lint, tests and a real build before anything ships.
