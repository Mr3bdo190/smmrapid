# Phase 8 — Correct Provider Cancellation Economics & Live Order Counters

## Fixed
- Provider cancellation no longer triggers an unconditional full refund.
- The server refreshes provider status before cancellation and again after the cancel request.
- When the provider reports `Canceled` or `Partial`, the customer refund is calculated from the **unfulfilled quantity (remains)** relative to the ordered quantity.
- `orders.refunded_amount` makes refunds idempotent and prevents duplicate credits.
- Orders with a provider reference are initialized with `remains = quantity` until the first provider status response.
- The provider status is fetched immediately after dispatch, then by the background worker every 30 seconds.
- Client Orders now shows **Start Count** and **Remains**, plus an explicit **Update** action for active provider orders.
- CSV export includes Start Count and Remains.

## Example
If the customer ordered 1,000 for $10 and the provider cancels with 400 remains, the customer is refunded $4. The customer keeps paying $6 for the 600 delivered/consumed units.

## Database
Migration: `drizzle/0010_order_refund_counters.sql`

No database reset is required.
