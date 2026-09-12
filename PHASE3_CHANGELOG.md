# RapidSMM Phase 3 Changelog

## Deployment blocker fixed
- Restored missing Drizzle `unique` import in `src/db/schema.ts`.
- The existing `shortlink_claims` definition uses `unique().on(t.userId, t.shortlinkId)`; the import was missing and could crash schema loading.

## Monetization
- Affiliate withdrawal request flow.
- Pending/approved/rejected payout states.
- Admin review endpoint with audit + notification.
- Coupon codes: percent or fixed amount.
- Coupon minimum spend, max discount, expiry, total usage and per-user usage limits.
- Coupon discount is applied atomically with the wallet debit and order creation.
- New Order now accepts an optional coupon code and can validate it before placing the order.

## Database
- Added `drizzle/0008_phase3_monetization.sql`.
- Updated `supabase_schema.sql` for clean installs.
- Added settings: `affiliate_min_withdrawal`, `affiliate_withdrawal_enabled`, `coupon_enabled`.

## Regression
- Phase 1 raffle/ticket/admin-affiliate fixes retained.
- Phase 2 notifications/API-key/email recovery fixes retained.
- Smoke tests: 21/21 passed.
