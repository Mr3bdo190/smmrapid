# SMM Panel — Final Production Candidate

This package includes the commercial/public catalog, provider-backed category mapping, Heleket verification/payment wiring, affiliate system, wallet protections, admin controls, API v1/v2 compatibility, service refill/cancel capabilities, and server-side pagination for large admin lists.

## Before deployment
1. Configure `.env` from `.env.example` with real Firebase, PostgreSQL, provider, support, and payment credentials.
2. Run migrations in order. `drizzle/0001_safe.sql` is the safe hardening variant if your existing database contains old experimental Admin Adjustment rows with non-positive amounts.
3. Run `drizzle/0007_commercial_features.sql` and `drizzle/0008_moderation_catalog.sql`.
4. If using Heleket in USD while the wallet is EGP, set `HELEKET_TO_WALLET_RATE` to your real settlement conversion (wallet units per 1 Heleket currency unit). Do not use an invented rate for live money.
5. `SUPPORT_EMAIL` must be a real monitored mailbox.
6. Connect a real provider and sync its real service catalog before accepting customer orders. The moderation starter catalog is intended to make the commercial offering visible; provider-less orders only remain pending when `MANUAL_FULFILLMENT=true` and must actually be fulfilled by the operator.
7. Keep `public/heleket_0c30774c.html` in place.

## Checks
`npm test` should pass the included smoke suite. A full typecheck/build must be run in an environment with dependencies installed successfully (`npm ci && npm run check`).
