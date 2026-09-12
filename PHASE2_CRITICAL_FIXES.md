# RapidSMM Phase 2 — critical fixes and review

## Included
- Persistent notification system for client payment/support events.
- Working notification badge and read-on-open behavior in the client header.
- API keys are now hashed at creation; plaintext API keys are not stored after generation. The raw key is returned only once.
- `/api/auth/sync` and `/api/client/me` no longer return the stored plaintext API key.
- Expanded bilingual phrase coverage for admin/payment UI and Add Funds.
- Blog listing now presents Arabic titles/descriptions when Arabic is selected while preserving the existing SEO article URLs.
- Phase 1 raffle/ticket/admin-affiliate changes were re-reviewed; smoke suite remains green.

## Database
Run `drizzle/0007_phase2_notifications.sql` once in Supabase SQL Editor.
The same notifications table/indexes are also included in `supabase_schema.sql` for clean installs.

## Important
Existing legacy plaintext `users.api_key` values are migrated to `api_key_hash` when an old API key is used, then plaintext is removed. New keys are hashed immediately.

## Blog routing
The old static `/blog/` index is now a redirect to the React `/blog` index, removing the duplicate blog-listing experience. Existing static article URLs remain available for SEO/content continuity.
