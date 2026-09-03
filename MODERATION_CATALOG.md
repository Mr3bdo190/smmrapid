# Heleket moderation catalog

This build includes a starter public catalog so the site has visible commercial content.

**Important:** publish/keep these services active only when you can actually fulfill orders.
The starter entries are provider-less by design and can be fulfilled manually while a provider
integration is being configured. For automated fulfillment, sync real services from your SMM provider
and deactivate/delete any starter entries you do not actually offer.

## Before resubmitting to Heleket

1. Run migrations, including `drizzle/0006_moderation_starter_catalog.sql`.
2. Open `/services` while logged out and confirm the catalog is visible.
3. Configure a real monitored `SUPPORT_EMAIL`.
4. Configure the real Heleket merchant/API credentials after approval of the account credentials.
5. Connect a real provider or ensure you have a real manual fulfillment process.
6. Do not submit services you cannot actually deliver.
7. Check `/terms` and `/refund-policy` and replace any generic policy wording with your actual business policy.

The public catalog is database-backed; it is not fake frontend-only content.
