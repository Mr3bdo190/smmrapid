# Single-unit services + custom service descriptions

## Service descriptions
- Provider sync generates an automatic description from the fields the provider actually returns.
- Admin can edit the customer-facing description from Admin > Services > Edit.
- A manually saved description is marked as `customDescription` and is preserved during future provider syncs.
- Clearing the description in Admin resets it to automatic/provider-generated details on the next sync.
- If a provider later exposes a real `description`/`desc` field, sync uses that field automatically.

## Single-unit/package services
A service is automatically treated as a single-unit/package service when:
- minimum quantity = 1
- maximum quantity = 1

For these services:
- Customer quantity is fixed to 1 and is not editable.
- Selling price is charged once, not divided by 1000.
- Provider cost is also treated as one unit for margin/cost tracking.
- The customer input is free text rather than URL-only, so it can contain an email, account ID, username, license/account data, or another provider-required value.
- Client service listings show `/ item` instead of `/ 1K`.
- The server enforces quantity 1 even for API orders.
- Mass-order lines may omit the quantity for single-unit services (`serviceId|data`). Standard services still use `serviceId|link|quantity`.
