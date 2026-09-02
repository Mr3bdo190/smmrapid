# SMM Panel — Production Hardened

This package is a production-oriented SMM panel with Firebase authentication, PostgreSQL/Drizzle, provider management, wallet ledger, orders, payments, affiliate rewards, raffles, mystery boxes, shortlinks, support tickets, admin controls, audit logs and a public API.

## Before launch

1. Run `npm ci`.
2. Run `npm test`.
3. Run `npm run typecheck`.
4. Run `npm run build`.
5. Create PostgreSQL database and apply Drizzle migrations in order, including `drizzle/0002_security_and_indexes.sql`.
6. Fill `.env` from `.env.example`.
7. Use Firebase Admin credentials belonging to the same Firebase project as the client config.
8. Set `ADMIN_EMAILS` explicitly to the administrator account(s).
9. In production set `KASHIER_MODE=live` and configure the real gateway credentials/webhook according to the current Kashier merchant integration instructions.
10. Configure at least one real SMM provider and test its balance/services/order/status endpoints.
11. Enable HTTPS and configure a reverse proxy/load balancer.
12. Take database backups before opening registration.

## Important security notes

- API keys are generated as high-entropy secrets and stored hashed for new keys. A generated key is shown only once.
- Provider API keys never appear in admin list responses.
- User/admin APIs use Firebase ID-token verification and server-side role checks.
- Wallet operations use database row locks and a ledger.
- Production refuses to create a Kashier checkout while `KASHIER_MODE` is not `live`.
- Provider URLs are checked against common private/local network targets to reduce SSRF risk.
- Never commit `.env` or service-account JSON files.

## Provider synchronization

The admin Provider → Sync action reads a standard SMM-provider `services` response and imports/updates services using:
`service`, `name`, `rate`, `min`, `max`.

Imported services are placed under a provider-specific category and their selling price is calculated from provider rate plus the provider's configured margin.

Providers that use a non-standard API response may require a small adapter in `src/lib/provider-engine.ts`.

## Payment gateway

The application keeps the payment gateway secret server-side. The exact Kashier webhook/signature contract must match the merchant credentials/integration version enabled on your Kashier account. Do not enable live payments until you have completed a real end-to-end test payment and verified the callback/webhook in your merchant dashboard.

## Public API

`POST /api/v1`

Actions:
- `services`
- `balance`
- `add`
- `status`

Use the API key generated from the Client → API page.

## Tests

`npm test` runs a dependency-free smoke suite that checks critical routes, security guards, financial protections, frontend/backend endpoint coverage and production payment safeguards.

A full integration test still requires your real PostgreSQL, Firebase, payment gateway and provider credentials; those external systems cannot be tested from this package in isolation.


### Database networking
Runtime PostgreSQL connections are configured with Node `family: 4`, so the panel uses IPv4 for PostgreSQL. Use a database hostname that has an IPv4 (A) record or an explicit IPv4 address.

## Deploying on Render

This repo includes a `render.yaml` Blueprint, so Render can provision the web service and a managed Postgres database together.

1. Push this project to a GitHub/GitLab repository.
2. In the Render dashboard: **New → Blueprint**, point it at the repo. Render reads `render.yaml` and proposes a web service (`smm-panel`) plus a Postgres database (`smm-panel-db`).
3. Click **Apply**. `DATABASE_URL` is wired automatically from the database. Fill in the remaining secrets it prompts for (they're `sync: false` so Render asks you): `ADMIN_EMAILS`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `KASHIER_MERCHANT_ID`, `KASHIER_API_KEY`, `KASHIER_WEBHOOK_SECRET`.
4. After the first deploy, open a Render **Shell** on the service (or run locally against the same `DATABASE_URL`) and apply the migrations in order:
   ```
   psql "$DATABASE_URL" -f drizzle/0000_worried_scourge.sql
   psql "$DATABASE_URL" -f drizzle/0001_production_hardening.sql
   psql "$DATABASE_URL" -f drizzle/0002_security_and_indexes.sql
   psql "$DATABASE_URL" -f drizzle/0003_auth_reliability.sql
   ```
5. Confirm `GET /api/health` returns `{"ok":true}` — this is also the Render health check path.
6. Log in once with the account you listed in `ADMIN_EMAILS` so it gets promoted to admin, then go to `/admin/providers` and add a real SMM provider, and `/admin/settings` to set the site name/currency/support email.
7. Only switch `KASHIER_MODE` to `live` (already the default in `render.yaml`) once you've completed one real end-to-end payment test against your Kashier merchant account.

If you deploy without the Blueprint (manual Web Service), set the **Build Command** to `npm ci && npm run build`, the **Start Command** to `npm start`, and add the same environment variables from `.env.example` in the Render dashboard.

## Heleket payments
The panel supports Heleket invoice payments. Configure `HELEKET_MERCHANT_ID`, `HELEKET_PAYMENT_API_KEY`, `HELEKET_CURRENCY`, and `PUBLIC_APP_URL`. The server signs API requests using Heleket's documented MD5(base64(JSON body)+API key) scheme and verifies the `sign` included in webhook bodies. Configure Heleket's callback URL as `https://YOUR_DOMAIN/api/heleket/webhook`. The uploaded Heleket verification file is served from `/heleket_0c30774c.html`.
