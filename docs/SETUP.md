# Local setup

## Prerequisites

- Node.js 22 LTS (see `.nvmrc`) — CI and Render both use it.
- npm 10+ (bundled with Node).

> **Working directory:** on Android/Termux the project must live in `$HOME`
> (`~/smmrapid`), never under `/storage/emulated/0`. Shared storage is mounted `noexec`,
> so native build binaries (esbuild, rollup, tailwind-oxide) cannot load from there.

## Install

```bash
npm ci          # or: npm install  (first time, to create the lockfile)
```

npm workspaces install both apps from the root — no per-app install step.

## The four verification commands

```bash
npm run typecheck   # tsc --noEmit in every workspace
npm run lint        # eslint (flat config)
npm test            # node:test — builds the API, then exercises it over a real socket
npm run build       # esbuild bundle for the API + vite production build for the web app
npm run check       # all four, in order
```

CI (`.github/workflows/ci.yml`) runs exactly these on every push.

## Run locally

```bash
npm run dev:api     # API with a rebuild watcher (default http://localhost:3000)
npm run dev:web     # Vite dev server (default http://localhost:5173)
npm start           # run the built API bundle (dist/)
```

Health check: `curl http://localhost:3000/health` → `{"ok":true,…}`

## Layout

See `docs/ARCHITECTURE.md` for the module map and the rules behind it.

- `apps/api/src/modules/<module>/` — one domain module per folder; routers are mounted in
  `apps/api/src/routes/index.ts`.
- `apps/web/src/` — client app; design tokens live in `apps/web/src/index.css`.
- `database/` — SQL migrations and seeds (`docs/DATABASE_SETUP.md`).
