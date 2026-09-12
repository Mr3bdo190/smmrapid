# RapidSMM Phase 1 — Critical Fixes

Implemented on top of the latest Landing/Blog/Bilingual build.

## Fixed
- Added `/api/admin/affiliates` with summary, affiliate rows and recent commission data.
- Added `/api/admin/services/bulk` for activate/deactivate selected services.
- Added `DELETE /api/admin/services/:id` as a safe soft-deactivation endpoint (it does not delete service history).
- Fixed raffle ticket accounting: multiple tickets are now inserted individually; quantity is checked against raffle-wide and per-user limits before charging.
- Added migration `drizzle/0006_phase1_critical_fixes.sql` to remove the old `(raffle_id,user_id)` uniqueness constraint and add a lookup index.
- Updated clean `supabase_schema.sql` so fresh databases also support multiple raffle tickets per user.
- Removed the Sha7nawy merchant wallet number from the client payment-create response. The merchant number remains server-side/admin configuration only.
- Added missing client ticket APIs used by the current frontend: list, create, view, and reply.
- Updated smoke tests to match the current bilingual/i18n and provider-sync route structure.

## Verification
- Smoke tests: **15/15 passed**.
- LandingPage JSX syntax errors found during the audit were fixed.
- The local environment does not contain the project's installed Node/Vite type dependencies, so a full production build cannot be claimed from this container. `tsc` reaches the project code and reports missing environment/node_modules type packages rather than the earlier LandingPage parse errors.

## Deployment
Run the migration against the existing Supabase/Postgres database before deploying the new app bundle:

`drizzle/0006_phase1_critical_fixes.sql`

Then deploy the ZIP normally on Render.
