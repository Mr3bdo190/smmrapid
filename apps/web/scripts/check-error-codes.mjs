#!/usr/bin/env node
/**
 * Error-copy gate.
 *
 *   cd apps/web && node scripts/check-error-codes.mjs
 *   ERROR_CODES_DOC=/tmp/fixture.md node scripts/check-error-codes.mjs   # point it at a fixture
 *
 * Two checks, both dependency-free (no build, no TypeScript, no network):
 *
 *  1. The catalogue itself: every code in `src/i18n/error-codes.ts` must carry both `en` and `ar`
 *     copy with a `title`, a `message` and a `nextStep`. (The TypeScript types already make a
 *     missing language a compile error; this catches merge damage and copy/paste mistakes too.)
 *  2. `docs/ERROR_CODES.md`, the shared list of codes the API actually returns: every code listed
 *     there must exist in the catalogue. Codes in the catalogue but not in the doc are reported as
 *     notes (planned codes for in-flight phases are fine). If the doc does not exist yet, check 2
 *     is skipped with a clear message instead of failing — other tasks own that file.
 *
 * Exit code 0 = everything covered, 1 = something is missing.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const CATALOGUE = resolve(here, '../src/i18n/error-codes.ts');
/** Overridable so the check can be exercised against a fixture: ERROR_CODES_DOC=/tmp/x.md */
const DOC = process.env.ERROR_CODES_DOC
  ? resolve(process.env.ERROR_CODES_DOC)
  : resolve(here, '../../../docs/ERROR_CODES.md');

/** Tokens in the doc that look like codes but are not: headings, column names, env vars. */
const DOC_TOKEN_IGNORE = new Set([
  'ERROR_CODES',
  'ERROR_CODE',
  'HTTP_STATUS',
  'AR_EN',
  'EN_AR',
  'README',
  'TODO',
  'WIP',
  'API',
  'JSON',
  'SQL',
  'DB',
  'UI',
  'URL',
  'ID',
  'DONE',
  'STATUS',
  'TITLE',
  'MESSAGE',
  'NEXT_STEP',
  'NEXTSTEP',
  /** `STABLE_CODE` is the placeholder code in the envelope example; this one is a constant name. */
  'STABLE_CODE',
  'PROVIDER_ERROR_CODES',
]);

function fail(message) {
  console.error(`\u2716 ${message}`);
  process.exitCode = 1;
}

/* ── check 1: the catalogue ──────────────────────────────────────────────────────────────────── */

const source = readFileSync(CATALOGUE, 'utf8');
const blockStart = source.indexOf('export const ERROR_CATALOGUE');
if (blockStart === -1) {
  fail('could not find `export const ERROR_CATALOGUE` in src/i18n/error-codes.ts');
  process.exit(1);
}
const body = source.slice(blockStart);

/** Entries are written as:  `  CODE: {` … `    en: { title: …, message: …, nextStep: … },` … `  },` */
const entryPattern = /^ {2}'?([A-Za-z][\w/-]*)'?: \{\n([\s\S]*?)^ {2}\},$/gm;
const catalogue = new Map();

for (const match of body.matchAll(entryPattern)) {
  const [, code, block] = match;
  const en = block.match(/^ {4}en: \{([\s\S]*?)\},$/m);
  const ar = block.match(/^ {4}ar: \{([\s\S]*?)\},$/m);
  catalogue.set(code, { en: en ? en[1] : null, ar: ar ? ar[1] : null });
}

if (catalogue.size === 0) {
  fail('no catalogue entries parsed — did the file formatting change? (the checker relies on 2-space entry indent)');
  process.exit(1);
}

let copiedFields = 0;
for (const [code, { en, ar }] of catalogue) {
  for (const [locale, copy] of [['en', en], ['ar', ar]]) {
    if (!copy) {
      fail(`${code}: missing the ${locale} copy`);
      continue;
    }
    for (const field of ['title', 'message', 'nextStep']) {
      if (!new RegExp(`${field}:`).test(copy)) fail(`${code}: ${locale} copy has no ${field}`);
      else copiedFields += 1;
    }
  }
}

console.log(`\u2714 catalogue: ${catalogue.size} codes, ${copiedFields} localized sentences (title/message/nextStep × ar/en)`);

/* ── check 2: the shared doc ─────────────────────────────────────────────────────────────────── */

if (!existsSync(DOC)) {
  console.log(`\u2139 docs/ERROR_CODES.md does not exist yet — skipping the doc cross-check (not a failure).`);
} else {
  const doc = readFileSync(DOC, 'utf8');
  const docCodes = new Set(
    (doc.match(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g) ?? []).filter((token) => !DOC_TOKEN_IGNORE.has(token)),
  );

  const missing = [...docCodes].filter((code) => !catalogue.has(code)).sort();
  const extra = [...catalogue.keys()].filter((code) => !docCodes.has(code) && !code.startsWith('auth/')).sort();

  if (missing.length) {
    fail(`docs/ERROR_CODES.md lists ${missing.length} code(s) with no copy in the catalogue:`);
    for (const code of missing) console.error(`    - ${code}`);
    console.error('  add them to ERROR_CODES (the typed union) and to ERROR_CATALOGUE in src/i18n/error-codes.ts');
  } else {
    console.log(`\u2714 docs/ERROR_CODES.md: all ${docCodes.size} listed codes have ar + en copy`);
  }

  if (extra.length) {
    console.log(`\u2139 ${extra.length} catalogue code(s) not listed in the doc yet (planned/client-side): ${extra.join(', ')}`);
  }
}

console.log(process.exitCode ? '\n\u2716 error-code check FAILED' : '\n\u2714 error-code check passed');
