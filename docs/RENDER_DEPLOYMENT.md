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

## Why the build tools live in `dependencies`

Render runs the build with **`NODE_ENV=production`** in the environment, and `npm install`
**skips devDependencies** in that mode. Anything the build itself executes must therefore be a
regular dependency — otherwise the deploy dies with:

```
==> Running build command 'npm install && npm run build'
up to date, audited 77 packages      ← 77 packages: devDependencies never installed
sh: 1: esbuild: not found
sh: 1: vite: not found
```

So `esbuild` (API bundle) and `vite`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/vite`
(web bundle) are declared as `dependencies`. Type-only packages (`@types/*`), `typescript` and
`eslint` stay in `devDependencies`: only CI and local development run them.

Either fix works — keeping the tools in `dependencies` means the dashboard's plain
`npm install && npm run build` is enough:

- keep build tools in `dependencies` (what this repo does), **or**
- set the build command to `npm ci --include=dev && npm run build`.

Verify a change to this area by reproducing the exact build locally:

```bash
NODE_ENV=production npm install && NODE_ENV=production npm run build && npm run start
```

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
