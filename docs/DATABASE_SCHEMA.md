# Database schema overview

41 tables, 24 enum types. Written in `database/migrations/0001_initial_schema.sql`; indexes in
`0002`; money functions in `0003`; RLS and privileges in `0004`.

## Identity and access

```
users ──1:1── user_profiles
  │
  ├──1:1── wallets ──1:N── wallet_transactions
  ├──1:N── orders ──1:N── order_items
  │             └──1:N── order_status_history
  ├──1:N── payments ──1:N── payment_attempts
  ├──1:N── tickets ──1:N── ticket_messages
  ├──1:N── notifications
  ├──N:M── roles (via user_roles) ──N:M── permissions (via role_permissions)
  ├──1:1── referrals (as referred) · 1:N referrals (as referrer)
  └──1:N── affiliate_commissions · affiliate_withdrawals
```

| Table | Purpose | Key rules |
|---|---|---|
| `users` | One row per Firebase account | `firebase_uid` unique; email unique (case-insensitive); `referral_code` unique |
| `user_profiles` | Locale, timezone, onboarding state | `onboarding_completed_at` drives the first-run guide |
| `roles` / `permissions` / `role_permissions` / `user_roles` | RBAC | Permission keys like `orders.refund`; a role is data, never a boolean column |
| `wallets` | Balance cache, one per user | `balance_minor >= 0`; created automatically with the user; changes only via `wallet_apply()` |
| `wallet_transactions` | Append-only ledger | `amount_minor > 0`; `balance_after_minor` recorded; `idempotency_key` unique; UPDATE/DELETE refused |

## Catalog and suppliers

```
providers ──1:N── provider_services
    │                  (the supplier's own catalog, unique per provider_service_id)
    └──1:N── provider_sync_logs

categories ──1:N── services ──1:N── service_variants
                       └── provider_id + provider_service_id → the supplier service it maps to
```

| Table | Purpose | Key rules |
|---|---|---|
| `providers` | SMM supplier + adapter key | Credentials stored encrypted; never returned to the client |
| `provider_services` | Snapshot of the supplier's catalog | Unique `(provider_id, provider_service_id)`; `raw` keeps the original payload |
| `categories` | Grouping + default markup | `markup_percent` is a percent, not money |
| `services` | What we sell | `price_minor` per `price_unit` (`per_1000`/`per_item`); `provider_cost_minor` is our cost; `input_type` drives the order form |
| `service_variants` | Package/subscription tiers | Unique name per service |

## Money in and out

| Table | Purpose | Key rules |
|---|---|---|
| `payments` | A deposit attempt | `amount_minor` = wallet credit (USD); `gateway_amount_minor` + `fx_rate` describe what was paid; unique `(gateway, provider_reference)` blocks a replayed gateway payment; `admin_note` carries the reason a human rejected it |
| `payment_attempts` | One row per gateway call | Request/response redacted before insert |
| `webhook_events` | Callback idempotency | Unique `(gateway, event_id)`; the credit happens only after signature verification |
| `coupons` / `coupon_redemptions` | Discounts | Value must match type (percent vs fixed); scope target enforced; per-user limit |
| `orders` | A customer order | `target` free text ≤ 5000 chars; `profit_minor` generated = charge − cost; `refunded_minor <= charge_minor`; `idempotency_key` unique |
| `order_items` | Multi-variant line items | — |
| `order_status_history` | Every status transition | Written by a trigger, so history cannot be forgotten |
| `referrals` / `referral_clicks` / `affiliate_commissions` / `affiliate_withdrawals` | Referral program | No self-referral; commission approval never moves a wallet by itself — paying writes a ledger row |

## Content, support, operations

| Table | Purpose |
|---|---|
| `tickets` / `ticket_messages` | Support; `is_internal` notes are never returned to customers |
| `notifications` / `admin_notifications` | One row per event, per recipient → per-item read state and accurate badges |
| `pages` / `posts` / `post_categories` / `post_tags` | CMS for the public site, both languages side by side |
| `seo_metadata` | Per-route SEO overrides (title, description, OG, structured data) |
| `banners` | Managed placements on the public site |
| `settings` / `feature_flags` | Admin-editable configuration; secrets are **not** stored here |
| `audit_logs` | Append-only record of sensitive actions |
| `system_logs` | Server errors with the support `ref` shown to a customer |
| `schema_migrations` | Which SQL files have been applied |

## The money rules, and where they are enforced

1. **Integer minor units only** — every amount is a `bigint` named `*_minor`. Percentages and fx
   rates are the only `numeric` columns.
2. **No balance change without a ledger row** — `wallets_guard_balance` (a trigger) rejects any
   `UPDATE wallets SET balance_minor = …` that did not come from `wallet_apply()`.
3. **Atomic** — `wallet_apply()` locks the wallet row (`SELECT … FOR UPDATE`), checks funds,
   updates the balance and inserts the ledger row in one transaction; insufficient funds abort
   everything.
4. **Idempotent** — `wallet_apply(..., p_idempotency_key)` and the unique constraints on
   `payments (gateway, provider_reference)` and `webhook_events (gateway, event_id)` make a
   replay a no-op instead of a double credit.
5. **Auditable** — each ledger row stores `balance_after_minor`; `wallet_reconciliation` lists
   any wallet whose cached balance disagrees with its ledger and must always be empty.
6. **Append-only** — `wallet_transactions` and `audit_logs` reject UPDATE and DELETE.

All six are asserted by `database/tests/verify.sql` and re-checked by CI on every push.
