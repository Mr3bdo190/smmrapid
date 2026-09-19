# Render deployment

The service already exists and keeps its domain (`https://smmrapid.store`). This project does
**not** create a new service, move the domain, or touch DNS.

## Settings the service must hold

| Setting | Value |
|---|---|
| Repository | `Mr3bdo190/smmrapid` |
| Branch | `main` |
| Runtime | Node (version from `.nvmrc`) |
| Build command | `npm ci && npm run build` |
| Start command | `npm run start` |
| Health check path | `/health` |
| Region | `oregon` (keep as-is) |

`render.yaml` in the repository describes exactly this. Two cautions before any **Blueprint
sync**:

1. The `name:` in `render.yaml` must equal the existing service name, otherwise a sync creates
   a second service instead of updating this one.
2. The legacy blueprint declared a `databases:` block (Render Postgres). It is intentionally
   gone — the database is Supabase now. On a Blueprint-managed service, a sync could read that
   as "delete the old database". Confirm before syncing; if in doubt, keep the service manual
   and set the values above in the dashboard.

## Environment variables

Set in the dashboard, never in Git: `DATABASE_URL`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
`FIREBASE_PRIVATE_KEY`, `PROVIDER_ENCRYPTION_KEY`, `SHAHNAWY_*`, `HELEKET_*`.
`NODE_ENV` and `PUBLIC_APP_URL` are plain values.

Full list and meaning: `docs/ENVIRONMENT.md`.

## Deploy and verify

1. Merge/push to `main` → Render builds automatically.
2. Watch the build log: install → api bundle → web build.
3. Confirm the health check passes (`/health` → `{"ok":true}`).
4. Open `https://smmrapid.store` and confirm the deployed build is the new one (check the
   asset hash changed, not just that the page loads).
5. If the deploy fails, fix forward with a new commit — never force push.

Rollback: Render keeps previous deploys; redeploy the last good one from the dashboard.
