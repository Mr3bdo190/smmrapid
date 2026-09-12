# RapidSMM — Arabic/English + Logout + Admin Users Fix

## Changes
- Arabic/English language switch remains available globally and Arabic is now the default when no language preference is stored.
- Added logout button in the client and admin top bars as well as the sidebars.
- Admin Users now refreshes automatically every 5 seconds, refetches on window focus, has retry/error UI, and the API is explicitly no-cache.
- Firebase-authenticated users are guaranteed to be created in the application `users` table by the authenticated request path; `/api/auth/sync` also fills missing Firebase name/email profile data without changing role/status/referral ownership.
- New users are ordered newest-first in Admin Users.

## Important production check
After deploying, create a brand-new test account, wait a few seconds, then open Admin → Users. It should appear without manual refresh. If the count does not change, check `/api/health` and Render logs for a database/auth configuration problem.
