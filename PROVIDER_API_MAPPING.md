# RapidSMM Provider API Mapping

## SMMTOM / API v2
- Base URL: `https://smmtom.com/api/v2`
- Authentication: POST form field `key`
- Service list: `action=services`
- Add order: `action=add`
- Status: `action=status`
- Refill: `action=refill`
- Refill status: `action=refill_status`
- Cancel: `action=cancel`
- Balance: `action=balance`
- Multiple status/refill/cancel are supported by the provider API, while RapidSMM's worker performs safe per-order operations where appropriate.

## Just Another Panel / API v2
The supplied documentation uses the same API-v2 contract and fields:
- Base URL: `https://justanotherpanel.com/api/v2`
- Service list: `action=services`
- Add order: `action=add`
- Status: `action=status`
- Refill / refill status: `action=refill` / `action=refill_status`
- Cancel: `action=cancel`
- Balance: `action=balance`

## Service details limitation
Both supplied service-list examples contain:
`service, name, type, category, rate, min, max, refill, cancel`

They do **not** document a `description` field. RapidSMM therefore does not invent a provider description. During sync it stores all documented service attributes and creates a clear fallback information block for the customer using type, provider rate, limits, refill and cancel support, category and provider service ID.

## Custom service names
Admin service-name edits are local to RapidSMM. The provider service ID remains unchanged and orders continue to be sent using that provider ID. Once a provider-linked service is renamed in Admin > Services, the sync process marks it as a custom name and future provider syncs keep the local name while refreshing price, limits, category and provider capabilities.
