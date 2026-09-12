# RapidSMM Phase 3 — Monetization + Database Review

## Critical deployment fix
`src/db/schema.ts` was missing the Drizzle `unique` import while using `unique().on(t.userId, t.shortlinkId)` for `shortlink_claims`. The import is now restored from `drizzle-orm/pg-core`.

This fixes the deployment error reported as `ReferenceError: unique/Ionic is not defined` in the generated schema.

## Phase 3 features
- Affiliate withdrawal requests with minimum balance and pending-balance protection.
- Admin affiliate withdrawal review: approve/reject + audit log + user notification.
- Coupon engine with percent/fixed discounts, minimum spend, max discount, expiry, usage limits and per-user limits.
- Coupon validation endpoint and New Order coupon field.
- Coupon use is recorded transactionally with the order and wallet debit.
- Phase 1 + Phase 2 regression review retained.

## Database migration
For an existing production database, run exactly:

`drizzle/0008_phase3_monetization.sql`

Do not reset the production database and do not rerun 0000.

The clean-install `supabase_schema.sql` also contains the Phase 3 tables.

## Settings added
- `affiliate_min_withdrawal` = `5`
- `affiliate_withdrawal_enabled` = `true`
- `coupon_enabled` = `true`

These are inserted with `ON CONFLICT DO NOTHING` and can be adjusted from SQL until an admin UI control is added.

## Verification
- Existing smoke suite: 20/20 passed.
- Phase 3 regression checks are added to `tests/smoke.test.mjs`.
- Full production build was not claimed in this environment because dependency installation/build is environment-dependent; Render's clean `npm ci && npm run build` remains the authoritative deployment check.
