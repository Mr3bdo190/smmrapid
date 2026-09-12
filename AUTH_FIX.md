# Authentication Fix

## What was fixed
- The React client previously depended entirely on `VITE_FIREBASE_*` environment variables.
- `render.yaml` did not define those public Vite variables, so the client marked Firebase as unavailable and every login/register attempt failed before reaching Firebase.
- `AuthContext.tsx` now uses the bundled `firebase-applet-config.json` as a safe public fallback, while still preferring `VITE_FIREBASE_*` when supplied.
- Email verification delivery is now non-blocking after account creation. Firebase account creation succeeds even if the verification email cannot be delivered immediately.
- Password reset now checks that Firebase auth is initialized before calling the SDK.

## Render requirement
The server still needs the Firebase Admin credentials already declared in `render.yaml`:
`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`.
These are server secrets and must be configured in Render.
