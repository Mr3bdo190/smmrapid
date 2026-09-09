# Final repair notes

## Authentication / Access Denied
The client and server Firebase credentials must refer to the SAME Firebase project.
For Render, put the VITE_FIREBASE_* variables in the Build Environment because Vite embeds them during `npm run build`.
Server-side Firebase Admin credentials use FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY, or FIREBASE_SERVICE_ACCOUNT_JSON.

The repaired auth flow refreshes stale Firebase ID tokens on retry, retries account synchronization, and promotes an existing user to admin when their email is present in ADMIN_EMAILS.

## Database
Run migrations in order. Do not run both `0001_production_hardening.sql` and `0001_safe.sql`; `0001_safe.sql` is the alternative for old experimental non-positive Admin Adjustment payment rows.
Run the latest migrations through `0009_daily_missions.sql`.

## New feature: Daily Missions
Users get daily tasks for orders, deposits, and referrals and can claim wallet rewards once per day.
Admins can create, enable/disable, delete missions and see claims today at `/admin/missions`.

## Deployment
1. Set the Firebase variables above in Render Build Environment.
2. Set the server Firebase Admin variables in Render Environment.
3. Set DATABASE_URL and payment/provider secrets.
4. Run database migrations.
5. Deploy with `npm run build` then `npm start`.
