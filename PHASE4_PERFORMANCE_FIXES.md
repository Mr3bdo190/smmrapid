# RapidSMM Phase 4 — Performance / Freeze Fixes

## Root cause fixed
The bilingual compatibility layer used a `MutationObserver` over the entire `document.body` and rewrote text nodes whenever React added/updated DOM. That could create a continuous character-data mutation cycle and make the browser CPU/GPU spike, especially on navigation and interactive clicks.

The global DOM translator was removed. The application now uses the React i18n dictionary directly, which is deterministic and does not observe or mutate the entire DOM.

## Additional performance fixes
- Public landing data is served from a 30-second in-memory server cache.
- Public service catalog is cached for 30 seconds.
- Public config is cached for 30 seconds.
- Landing page combines the small public config payload into the showcase response, avoiding an extra request.
- Public service grouping changed from repeated `filter()` calls to a single `Map` pass.
- Public catalog initially renders 30 services per category and expands on demand; search still searches the complete loaded catalog.
- React Query no longer retries every failed query twice or refetches all pages on window focus; default stale time is 30 seconds.
- Public requests have an 8-second abort timeout so a slow backend cannot leave a page waiting indefinitely.
- PostgreSQL pool now has connection and idle timeouts to avoid requests hanging forever on exhausted/unavailable DB connections.
- Public cache headers use `stale-while-revalidate` for faster repeat visits.

## Deployment
Use the ZIP generated for this phase. On Render, the authoritative production check remains:

`npm ci && npm run build`

Do not reset the production database for these frontend/performance changes.
