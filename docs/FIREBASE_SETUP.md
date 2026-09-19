# Firebase setup

SMM Rapid keeps the **existing** Firebase project. Nothing new is created and no user accounts
are deleted or migrated — the same accounts keep working.

- Project: `scope-app-492120`
- Identity: Firebase Authentication (email + password)
- Server verification: Firebase Admin SDK (ID token, with revocation checks)
- Client: Firebase Web SDK, configured from a public config block

---

## 1. Authentication providers

Firebase console → **Build → Authentication → Sign-in method**:

1. **Email/Password** — enable.
2. **Google** — optional; the UI ships email/password only for now.
3. Templates → **Password reset** — make sure the sender/domain are correct, otherwise the
   "forgot password" mail never arrives.

Authentication → **Settings → Authorized domains** must contain every origin the app is served
from, or sign-in fails with `auth/unauthorized-domain`:

- `smmrapid.store`
- `localhost` (local development)

## 2. Public web configuration (client)

Firebase console → **Project settings → General → Your apps → Web app** shows the public config
(`apiKey`, `authDomain`, `projectId`, `appId`).

The correct values already ship in the repository at `apps/web/firebase-config.json`. That file
is **public by design** — it is embedded in every browser bundle, and access is controlled by
authorized domains and Firebase rules, not by hiding it. The `apiKey` is an identifier, not a
secret.

Override it per environment with build-time variables if another project is ever used:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

> Vite inlines `VITE_*` variables **at build time**. Changing them in a dashboard has no effect
> until the next build/deploy.

## 3. Server credentials (Admin SDK) — the only secret part

Firebase console → **Project settings → Service accounts → Generate new private key**. That
JSON is a secret: it must never be committed. Copy three values into the Render dashboard:

| Render environment variable | Where it comes from |
|---|---|
| `FIREBASE_PROJECT_ID` | the JSON's `project_id` (`scope-app-492120`) |
| `FIREBASE_CLIENT_EMAIL` | the JSON's `client_email` |
| `FIREBASE_PRIVATE_KEY` | the JSON's `private_key` — paste the whole PEM, keep the surrounding quotes and the `\n` escapes exactly as they appear |

The API converts `\n` back to real newlines when it initialises the SDK, so a single-line paste
from Render's UI works.

## 4. What the server does with a login

1. The browser signs in with the Web SDK and holds an ID token.
2. Every API call sends `Authorization: Bearer <id token>`.
3. `requireAuth` verifies the token with the Admin SDK (`checkRevoked: true`), so a disabled
   account or a revoked session stops working immediately instead of after an hour.
4. The account row is **found or created** in `users` (unique on `firebase_uid`), the profile row
   is upserted with `last_login_at`, and the wallet is created by a database trigger.
5. Roles and permissions are read from the database. A client-supplied user id, role or balance
   is never trusted.
6. `status != 'active'` answers `403 ACCOUNT_DISABLED`.

If the Admin SDK credentials are missing, identity endpoints answer `503 AUTH_NOT_CONFIGURED`
instead of crashing — and `GET /api/auth/me` without a token always answers `401 AUTH_REQUIRED`
with the standard error envelope.

## 5. Verifying a deployment

```bash
# no token → the envelope, never a 500
curl -s https://smmrapid.store/api/auth/me
# → {"success":false,"error":{"code":"AUTH_REQUIRED","message":"Sign in to continue."}}

# a real token from the browser (DevTools → Application → IndexedDB → firebaseLocalStorage)
curl -s -H "Authorization: Bearer <ID_TOKEN>" https://smmrapid.store/api/auth/me
```

A signed-in browser hitting the site should show the account panel with the email, wallet
balance and roles.

## 6. Security notes

- The service-account JSON is a secret: `.gitignore` blocks `*service-account*.json`,
  `serviceAccountKey.json` and `secrets/`. Rotating it means generating a new key and updating
  Render — old keys can be deleted in the console.
- Disabling a user in Firebase stops their tokens from working (revocation check). Suspending a
  user in the database answers `403` and blocks access even while their token is valid.
- `signOut()` on the client clears the local session. To kill sessions everywhere, revoke the
  user's refresh tokens in the Admin console.
