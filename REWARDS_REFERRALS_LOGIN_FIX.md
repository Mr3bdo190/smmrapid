# Rewards, Referral, Login & Responsive Fix

- Logged-in visitors now see Dashboard on the landing page instead of Sign in/Create account, including the mobile menu.
- Referral links are persisted and the registration form shows the referral code; codes originating from `?ref=` are locked in the UI.
- Server-side referral attribution remains immutable once `users.referred_by` is set.
- Added missing client endpoints for raffles, reward shortlinks, affiliate stats/click tracking, and daily reward/game exchange.
- Client config no longer exposes the site's wallet/merchant number.
- The client add-funds screen no longer displays the site's wallet number.
- Added responsive overflow guardrails for authenticated pages and controls.
