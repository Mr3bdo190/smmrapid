# Provider Sync + New Order Details Fix

## What changed
- Provider synchronization is now an asynchronous tracked job instead of one long blocking HTTP request.
- Admin Provider page shows live progress: percentage, processed/total, created, updated, skipped.
- Duplicate Sync requests are prevented while a job is running.
- Sync supports up to 5,000 provider services per run instead of the old 2,000 cap.
- Existing provider services are mapped in memory by provider service ID to reduce database lookup overhead.
- Categories are preloaded and cached during sync.
- Provider descriptions are preserved when supplied by the provider.
- When a provider does not send a description, RapidSMM now generates a useful service-details description from provider rate, min/max, type, refill, cancel, and drip-feed data.
- New Order also has a client-side fallback so synchronized provider metadata still appears even when an older service row has an empty description.
- Sync completion reports new, updated, and skipped counts.

## New API
- `POST /api/admin/providers/:id/sync` returns HTTP 202 with `jobId` and `total`.
- `GET /api/admin/providers/:id/sync/:jobId` returns the current job status and percentage.

## Notes
The provider still must return valid service records (service/id, name, rate/price, min/max). If the provider returns no services or rejects the API request, the UI reports that error rather than silently pretending the sync succeeded.
