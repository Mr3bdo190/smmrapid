# Phase 7 — Order Execution & Provider Routing

## Fixed
- Orders with `executionMode=provider` are submitted to the configured provider immediately after payment/order creation.
- Provider failures refund the order charge exactly once and return a clear customer-facing message.
- Orders with `executionMode=manual` are paid/created but are never sent to a provider. They remain `Pending` for admin fulfillment.
- Background provider worker respects the service execution mode through `placeOrderToProvider()`, so manual orders are skipped safely.
- Admin Service editor now has an explicit fulfillment selector: automatic provider or manual fulfillment.

## Database
Run `drizzle/0009_service_execution_mode.sql` once on the deployed database. Existing services default to `provider`, preserving the previous automatic-provider behavior.

## Important
Real provider authentication, provider service IDs, API balance and provider order submission still require a live provider account and production environment test.
