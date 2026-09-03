# SMM Panel – 20 Feature Upgrade

## Client – 10 upgrades
1. Category-first New Order selector.
2. Services limited to the selected category.
3. Service search within category.
4. Full selected-service detail card.
5. Favorite services stored locally.
6. Recent services quick access.
7. Live order price calculator.
8. Balance sufficiency check.
9. Quantity validation and quick presets.
10. Order search/status filter, auto-refresh and CSV export.

## Admin – 10 upgrades
1. Full service edit form.
2. Service deactivate control.
3. Service search/category/provider filters.
4. Bulk service activate/deactivate.
5. Full category edit.
6. Category delete with backend safety check.
7. Category ordering controls.
8. Order search/status filtering and CSV export.
9. Admin order provider-status refresh.
10. Payment filters and system-report search/resolve.

## Validation
Smoke tests: 14/14 PASS.
Live Firebase/PostgreSQL/provider/payment gateway tests require the deployed environment and real credentials.
TypeScript/build certification requires a complete dependency installation (`npm ci`).

## Complete Referral/Affiliate System
- Permanent unique referral codes with automatic backfill for legacy users.
- Referral link generated from PUBLIC_APP_URL when configured, otherwise current request origin.
- Click tracking with browser-session deduplication.
- Immutable first-referrer assignment through the existing auth sync guard (`referred_by IS NULL`).
- Approved-payment commissions are idempotent via unique payment_id and credited transactionally.
- Client affiliate dashboard: link, code, clicks, signups, paid referrals, referred users and commission history.
- Admin Affiliate Control Center with global clicks/signups/deposits/commissions and recent commission audit.
- Affiliate indexes added in migration 0005.
