#!/usr/bin/env node
/**
 * Dependency-free SSR smoke test.
 *
 *   cd apps/web && node scripts/ssr-smoke.mjs
 *
 * Bundles `scripts/ssr-smoke.entry.tsx` with esbuild (already in the workspace through Vite — no
 * new dependency), runs it on Node with `react-dom/server`, and exits non-zero if any assertion
 * fails. No browser, no jsdom, no network: it renders the real components and inspects the real
 * markup, so it is safe to run in CI before a deploy.
 *
 * `import.meta.env` is defined as an empty object for the bundle, because Node has no Vite env;
 * every `import.meta.env.VITE_*` then falls back to the bundled config, exactly like a build
 * without env vars.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const entry = resolve(here, 'ssr-smoke.entry.tsx');
const outDir = mkdtempSync(join(tmpdir(), 'smmrapid-ssr-smoke-'));
const outFile = join(outDir, 'ssr-smoke.cjs');

try {
  await build({
    entryPoints: [entry],
    outfile: outFile,
    bundle: true,
    platform: 'node',
    // CJS output so react-dom/server can `require('util')`; the entry itself is still written in
    // ESM/TSX. No `import.meta` reaches the output (see the define below).
    format: 'cjs',
    target: 'node22',
    jsx: 'automatic',
    logLevel: 'warning',
    define: {
      // Node has no Vite env: `import.meta.env` becomes a plain object with no VITE_* keys, so
      // every config falls back to the bundled file exactly like a build without env vars.
      'import.meta': 'globalThis.__ssrImportMeta',
      'process.env.NODE_ENV': '"production"',
    },
    banner: { js: 'globalThis.__ssrImportMeta = { env: {} };' },
  });

  console.log(`\u25b8 SSR smoke test (bundled with esbuild, run on Node \u2014 no browser)\n`);
  const result = spawnSync(process.execPath, [outFile], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
