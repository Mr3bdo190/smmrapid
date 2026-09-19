# Environment variables

Copy `.env.example` to `.env` for local work (`cp .env.example .env`). **Never commit `.env`.**
In production every value is set in the Render dashboard.

| Variable | Required from | Purpose |
|---|---|---|
| `NODE_ENV` | now | `development` \| `test` \| `production` |
| `PORT` | now | HTTP port; Render injects it |
| `PUBLIC_APP_URL` | now | absolute origin used in links and payment callbacks |
| `DATABASE_URL` | Phase 2 | Supabase **pooled** connection string used by the API |
| `DATABASE_DIRECT_URL` | Phase 2 | direct connection, used only to run migrations/seed |
| `SUPABASE_URL` | Phase 2 | project URL |
| `SUPABASE_ANON_KEY` | Phase 2 | publishable key (safe for the browser, unused by the API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Phase 2 | privileged server-side key — **never exposed** |
| `FIREBASE_PROJECT_ID` | Phase 3 | Admin SDK: existing project |
| `FIREBASE_CLIENT_EMAIL` | Phase 3 | Admin SDK service account |
| `FIREBASE_PRIVATE_KEY` | Phase 3 | Admin SDK private key (multi-line PEM, keep quotes and `\n`) |
| `VITE_FIREBASE_*` | Phase 3 | client SDK config, public by definition |
| `PROVIDER_ENCRYPTION_KEY` | Phase 7 | encrypts provider credentials at rest (32+ chars) |
| `SHAHNAWY_*` | Phase 9 | Sh7nawy electronic-wallet gateway (EGP) |
| `HELEKET_*` | Phase 9 | Heleket crypto gateway (USD) |
| `PROVIDER_n_*` | Phase 7 | SMM provider endpoints + API keys, one set per provider |

## Rules

1. **No secret is ever committed.** `.gitignore` blocks `.env`, `.env.*` (except
   `.env.example`), `secrets/`, PEM files and service-account JSON.
2. **Nothing secret is logged.** `apps/api/src/lib/logger.ts` redacts credential-shaped keys
   and values before writing; a unit test asserts it.
3. **A missing secret fails loudly in production** — the env contract in
   `apps/api/src/config/env.ts` validates on boot and prints the exact missing names.
4. Adding a variable means updating `.env.example`, this file, and `render.yaml` in the same
   commit.
