# Build progress tracker

This file is the **durable state** of the rebuild. Any session (human, subagent, or a scheduled
run that has no memory of previous conversations) must read it first and update it last.

- Repository: `github.com/Mr3bdo190/smmrapid`, branch **main**
- Working copy: `$HOME/smmrapid` (work here, never in `/storage`)
- Live: `https://smmrapid.store` (Render auto-deploys every push to `main`)

---

## 1. Hard constraints (from the owner — never violate)

- Never force-push. Never rewrite history. Never delete `backup/legacy-smmrapid`.
- No secrets in Git, ever. Keys live in environment variables only.
- The old app, the old database and the old Firebase users are **read-only references** — do not
  reuse their business logic, do not migrate or delete their data.
- Money: integer minor units only (no floats), ledger is mandatory, financial operations are
  atomic, a balance never changes without a ledger row.
- The API must always boot with no configuration: a missing `DATABASE_URL` / Firebase credential
  answers a clear 503, it never crashes the process or the deploy.
- Everything the customer sees is Arabic-first and English-capable, and every error says what
  happened and what to do next.

## 1.1 Error message contract (the owner's top priority)

Every message a customer can see must be written for a non-technical person and must answer three
questions: **what happened**, **who caused it** (their input, their balance, or the site), and
**what to do next**. Rules:

- The API never forwards a database, driver, provider or stack message. Each failure maps to a
  stable `SCREAMING_SNAKE` code plus a customer-safe Arabic sentence.
- One catalogue file per side, no per-component copy: `docs/ERROR_CODES.md` (code, HTTP status,
  Arabic sentence, next step) and `apps/web/src/i18n/error-codes.ts` (ar + en, with `nextStep`).
  A code that is not in the catalogue is a bug, not a fallback.
- Every error carries a short support `ref` that is also written to the server log, so a customer
  and an engineer can talk about the same incident.
- Unknown codes still render: server message + support ref, never a blank screen.
- `apps/web/scripts/check-error-codes.mjs` compares the two catalogues and fails on a gap.

## 2. Design language (the rebuild looks deliberately different from the old site)

Light-first surfaces, ink/teal palette (no violet, no dark sidebar rail), hairline `1px` borders
instead of soft shadows, `6–10px` radii (no pills), uppercase micro-labels, tabular monospace
numerals for anything numeric, class-based dark mode. Tokens and primitives live in
`apps/web/src/index.css`; pages compose `.card .btn .field .pill .banner .micro .num` instead of
inventing styling.

## 3. Phases

| # | Phase | Status |
|---|---|---|
| 0 | Audit, architecture, locked decisions | ✅ |
| 1 | Monorepo scaffold, tooling, CI | ✅ |
| 2 | Database schema, migrations, seeds | ✅ |
| 3 | Firebase authentication + new visual identity | ✅ |
| 4 | Core: validation, money arithmetic, profile | ✅ |
| 5 | Wallet + ledger module | ✅ |
| 6 | Pricing engine | ✅ |
| 7 | Providers + service sync | ✅ |
| 8 | Orders (create, status, history, re-order) | ✅ |
| 8b | Order dispatch to providers (queue, retries, status sync) | ✅ |
| 9 | Payments (Heleket, Sh7nawy adapters) | ✅ |
| 10 | Support tickets + notifications | ⏳ |
| 11 | Client area UI (dashboard, new order, orders, funds) | ⏳ |
| 12 | Admin area (users, services, providers, orders, payments) | ⏳ |
| 13 | Referrals / affiliate | ⏳ |
| 14 | Content, banners, SEO | ⏳ |
| 15 | Security hardening pass | ⏳ |
| 16 | Performance + caching | ⏳ |
| 17 | Tests, docs, observability sweep | ⏳ |
| 18 | Launch checklist | ⏳ |

Update this table in the same commit as the phase work.

## 4. Workflow for every phase

1. `cd ~/smmrapid && git pull --rebase` (or verify the tree is clean and current).
2. Read the phase's migration(s) in `database/migrations/` and the existing module code before
   writing anything — the schema is the contract.
3. Implement one phase only. Keep modules independent and injectable (`AuthDeps` is the pattern).
4. Verify, in this order, and fix everything before committing:
   ```bash
   npm run typecheck && npm run lint
   DATABASE_URL='postgresql://postgres@127.0.0.1:55432/smmrapid_ci' npm test
   npm run build
   ```
   The local PostgreSQL cluster (schema already applied, seeded) lives in `~/pg-verify/data`:
   ```bash
   pg_ctl -D ~/pg-verify/data -l ~/pg-verify/postgres.log \
     -o "-k $HOME/pg-verify/sock -p 55432 -c listen_addresses=127.0.0.1" -w start
   ```
5. Commit with a conventional message that explains *why*, then `git push origin main`.
6. Update section 3 above, confirm the CI run for the pushed commit is green
   (`gh run list --limit 3`), and report to the owner on Telegram in Arabic: what was built,
   what was verified with real output, and what is next.
7. If a phase cannot be finished, leave the tree building, write the blocker here, and stop —
   never push half-verified work.

## 5. Ideas for parallel work (subagents)

Subagents may not run git commands, may not edit shared files (`package.json`, `app.ts`,
`routes/index.ts`, `index.css`, `App.tsx`, `tsconfig*`, `eslint.config.js`, `ci.yml`), and must
report the wiring they need. The parent session owns integration, verification and every commit.

Nothing is in flight: phases 3-7 are merged (the UI foundation and the error catalogue landed with
the web work). The parent session owns integration: add the build entries and route mounts a
subagent reports, run the full verification, then commit each phase separately so a failure can be
reverted on its own.

The scheduled job is gated by `~/.hermes/scripts/smmrapid-state.sh`, whose output changes only
when the build state actually changes (next unfinished phase, dirty tree, CI conclusion). So a
finished phase wakes exactly one new run, and an in-flight phase wakes none.
