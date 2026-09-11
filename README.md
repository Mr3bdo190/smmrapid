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
4. After the first deploy, open a Render **Shell** on the service (or run locally against the same `DATABASE_URL`) and apply the migrations in order:
   ```
   psql "$DATABASE_URL" -f drizzle/0000_worried_scourge.sql
   psql "$DATABASE_URL" -f drizzle/0001_production_hardening.sql
   psql "$DATABASE_URL" -f drizzle/0002_security_and_indexes.sql
   psql "$DATABASE_URL" -f drizzle/0003_auth_reliability.sql
   psql "$DATABASE_URL" -f drizzle/0004_wallet_ledger_compatibility.sql
   psql "$DATABASE_URL" -f drizzle/0005_affiliate_system.sql
   psql "$DATABASE_URL" -f drizzle/0006_contact_messages.sql
   psql "$DATABASE_URL" -f drizzle/0007_refill_cancel_and_indexes.sql
   ```
5. Confirm `GET /api/health` returns `{"ok":true}` — this is also the Render health check path.
7. Only switch `KASHIER_MODE` to `live` (already the default in `render.yaml`) once you've completed one real end-to-end payment test against your Kashier merchant account.

If you deploy without the Blueprint (manual Web Service), set the **Build Command** to `npm ci && npm run build`, the **Start Command** to `npm start`, and add the same environment variables from `.env.example` in the Render dashboard.

## Heleket payments
The panel supports Heleket invoice payments. Configure `HELEKET_MERCHANT_ID`, `HELEKET_PAYMENT_API_KEY`, `HELEKET_CURRENCY`, and `PUBLIC_APP_URL`. The server signs API requests using Heleket's documented MD5(base64(JSON body)+API key) scheme and verifies the `sign` included in webhook bodies. Configure Heleket's callback URL as `https://YOUR_DOMAIN/api/heleket/webhook`. The uploaded Heleket verification file is served from `/heleket_0c30774c.html`.

## Latest fixes: wallet ledger + provider control center
- Added automatic wallet_ledger compatibility repair at startup for older deployments.
- Added `drizzle/0004_wallet_ledger_compatibility.sql` for manual Supabase migration.
- Added `drizzle/0006_contact_messages.sql` (public contact form submissions — run it after `0005_affiliate_system.sql`).
- Added `drizzle/0007_refill_cancel_and_indexes.sql`: `refillable`/`cancelable` columns on `services`, `cancel_requested` on `orders`, a new `refill_requests` table, and a few indexes for the paginated admin list endpoints.
- Public API now also responds at `/api/v2` (JAP-style path), with `/api/v1` kept as a permanent alias. Added `refill`, `refill_status`, and `cancel` actions, plus multi-order `status`/`refill`/`cancel` support.
- Clients can now request a refill or cancel from `/dashboard/orders` — only shown when the admin has marked a service `refillable`/`cancelable` in `/admin/services`.
- Fixed a currency bug: Heleket (crypto) deposits were credited to the wallet at face value even though Heleket charges in its own currency (USD by default) while Kashier/Vodafone Cash use the site's local currency (EGP). Added an admin-configurable `usd_exchange_rate` setting (`/admin/settings`) so wallet credits stay consistent regardless of payment method. **Set a realistic rate there before enabling Heleket in production.**
- Admin list pages (`Users`, `Orders`, `Payments`, `Audit Logs`, `System Reports`) are now server-side paginated instead of loading everything at once — needed once you have more than a few hundred rows.
- Added a "Test Heleket Connection" button in `/admin/settings` that calls Heleket directly and tells you exactly what's wrong if `HELEKET_MERCHANT_ID`/`HELEKET_PAYMENT_API_KEY` are misconfigured (a common cause of a raw "Merchant unknown" error).
- Added Arabic/English site-wide language toggle (`src/lib/i18n.tsx`), a public `/services` catalog, `/contact` page, and `/terms`, `/privacy`, `/refund-policy` legal pages. **After deploying, go to `/admin/settings` and set a real Support Email** — payment processors (Kashier, Heleket, etc.) check for this during account review, and it's what's shown on the public Contact page.
- Admin Providers now supports editing provider URL/API key/margin/status.
- Added provider connection test and clearer provider HTTP/API error messages.
- Added provider service control center with bulk activate/deactivate and bulk selling-price adjustment.
- Provider service list and bulk management endpoints are available under `/api/admin/providers/:id/services`.

### Provider-sourced service metadata
Run `drizzle/0011_provider_service_metadata.sql`. Provider sync now preserves service metadata such as provider service ID, provider rate, category, description, refill/cancel/drip-feed flags, and sync timestamp in `services.provider_meta`. Customer UI exposes only service-facing facts, never provider credentials or provider names.

### Public pages / SEO architecture
Public marketing, services, FAQ, contact, policies, how-it-works and blog pages are separate crawlable HTML URLs under `public/`. Authenticated client/admin dashboards remain an authenticated React application because splitting those into static pages would not improve SEO and would make auth/state handling worse.
