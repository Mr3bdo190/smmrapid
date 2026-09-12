# Phase 9 — Production Security, Customer UX & Performance

Implemented:
- Customer service API no longer exposes provider IDs, provider pricing, provider metadata, or provider objects.
- Customer-facing copy removes internal provider/gateway/AI implementation references.
- Provider credentials are encrypted at rest with AES-256-GCM and legacy plaintext keys are migrated at startup.
- Production requires PROVIDER_ENCRYPTION_KEY.
- Atomic order dispatch claim prevents duplicate provider submissions across workers/instances.
- Cancellation wording no longer promises a full refund.
- Client order status wording is customer-facing.
- Phase 8 Start Count/Remains tracking remains intact.
- Removed unused @google/genai dependency.
- Added dispatch queue index and security migration 0011.

Production validation still requires Render + real DB/Firebase/payment/provider credentials and browser/mobile testing.


## Customer-facing policy
Internal implementation names remain available only in admin/developer contexts. Customer APIs return only commercial service data required to place and track an order.

## Deployment requirement
Set `PROVIDER_ENCRYPTION_KEY` in Render as a secret before the first production boot. Keep the same value for existing encrypted provider credentials; changing it without a controlled key rotation makes stored provider credentials undecryptable.
