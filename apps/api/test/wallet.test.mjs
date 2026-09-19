import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import express from 'express';
import { createWalletModule } from '../dist/modules/wallet/routes.js';
import {
  MAX_MOVEMENT_MINOR,
  applyWalletMovement,
  loadWalletSummary,
  toWalletError,
  walletDbDeps,
} from '../dist/modules/wallet/service.js';
import { query, queryOne } from '../dist/lib/db.js';

/**
 * Wallet & ledger (Phase 5).
 *
 * Two layers:
 *  - HTTP behaviour is driven through the real compiled router with fake wallet deps, so the
 *    guard, the query validation and the response shape are exercised without a database;
 *  - the money rules are checked against the real schema (DATABASE_URL): a credit moves the
 *    balance and writes one ledger row, an oversized withdrawal fails and changes nothing, a
 *    ledger write that fails undoes the balance change, the list pages newest-first without
 *    duplicates or gaps, and a direct UPDATE of `wallets.balance_minor` is refused by the
 *    database itself. Those tests skip when DATABASE_URL is unset.
 *
 * Every failure asserts the EXACT documented code (docs/ERROR_CODES.md) and that the message is
 * Arabic-first, actionable, and never a database/driver/provider message.
 */
const hasDb = Boolean(process.env.DATABASE_URL);

/** Codes seen while running the suite, checked against docs/ERROR_CODES.md at the end. */
const observedCodes = new Set();

/** Anything a customer must never read: SQL, driver text, table names, SQLSTATEs. */
const RAW_INTERNALS =
  /wallet_apply|balance_minor|wallet_transactions|SQLSTATE|SQLSTATE|pg_|node-postgres|relation "|syntax error|ECONNREFUSED|ETIMEDOUT|stack trace|\b2350[0-9]\b|\bP0002\b|\b42501\b|\b22023\b/i;

function assertCustomerSafe(message, { arabicFirst = true } = {}) {
  assert.ok(typeof message === 'string' && message.trim().length > 0, 'every error carries a message');
  assert.ok(!RAW_INTERNALS.test(message), `a raw internal message reached the client: ${message}`);
  if (arabicFirst) {
    assert.ok(/[\u0600-\u06FF]/.test(message), `the message must be Arabic-first: ${message}`);
  }
}

/** Mirrors apps/api/src/middleware/error-handler.ts — it is not a separate build entry. */
function startApi(deps) {
  const app = express();
  app.use(express.json());
  app.use('/api/wallet', createWalletModule(deps).router);
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'The requested resource does not exist.' } });
  });
  // Express only treats this as an error handler when it takes four arguments.
  app.use((err, _req, res, _next) => {
    const status = typeof err?.status === 'number' ? err.status : 500;
    res.status(status).json({
      success: false,
      error: {
        code: typeof err?.code === 'string' ? err.code : 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : String(err),
        ...(err?.details ? { details: err.details } : {}),
      },
    });
  });

  const server = app.listen(0, '127.0.0.1');
  return once(server, 'listening').then(() => {
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    return {
      url: `http://127.0.0.1:${address.port}`,
      close: () => new Promise((resolve) => server.close(resolve)),
    };
  });
}

const dbUser = (suffix = 'ffff') => ({
  id: `00000000-0000-0000-0000-${suffix.padStart(12, '0').slice(-12)}`,
  firebase_uid: `wallet-test-${suffix}`,
  email: `wallet-test-${suffix}@example.test`,
  email_verified: true,
  display_name: 'Wallet Test',
  avatar_url: null,
  referral_code: null,
  status: 'active',
  created_at: '2026-01-01T00:00:00.000Z',
});

/** Fake auth: proves the route is guarded, without Firebase and without a database. */
const fakeAuth = (user = dbUser()) => ({
  verifyIdToken: async (token) => {
    if (token !== 'good') throw Object.assign(new Error('bad token'), { code: 'auth/invalid-id-token' });
    return { uid: user.firebase_uid, email: user.email, emailVerified: true, displayName: null, picture: null };
  },
  findOrProvisionUser: async () => user,
  loadAccess: async () => ({ roles: ['customer'], permissions: [] }),
  loadWallet: async () => ({ balanceMinor: 0, currency: 'USD' }),
});

/** Fake wallet layer: records what the route asked for, returns real-shaped data. */
function fakeWallet(overrides = {}) {
  const calls = [];
  return {
    calls,
    loadSummary: async (userId) => {
      calls.push({ method: 'loadSummary', userId });
      return { balanceMinor: 2599, currency: 'USD', pendingMinor: 5000, updatedAt: '2026-01-01T00:00:00.000Z' };
    },
    listTransactions: async (params) => {
      calls.push({ method: 'listTransactions', ...params });
      return { transactions: [], nextCursor: null, hasMore: false };
    },
    applyMovement: async () => {
      throw new Error('the HTTP layer must never call the wallet write path');
    },
    ...overrides,
  };
}

const get = (base, path, token = 'good') =>
  fetch(`${base}${path}`, token ? { headers: { authorization: `Bearer ${token}` } } : {});

/** Asserts the exact documented code (never just the status) and that nothing leaked. */
async function expectCode(res, code, expectedStatus, options) {
  const body = await res.json();
  assert.equal(body.success, false);
  assert.equal(body.error.code, code, `expected ${code}, got ${body.error.code}`);
  if (expectedStatus) assert.equal(res.status, expectedStatus);
  observedCodes.add(code);
  assertCustomerSafe(body.error.message, options);
  return body;
}

/** Provisions a real account (and its wallet, via trigger) for the database-backed tests. */
async function provisionUser(label) {
  const { findOrProvisionUser } = await import('../dist/modules/auth/users.js');
  const suffix = randomUUID().slice(0, 8);
  return findOrProvisionUser({
    uid: `${label}-${suffix}`,
    email: `${label}-${suffix}@example.test`,
    emailVerified: true,
    displayName: 'Wallet Test',
    picture: null,
  });
}

/** Auth deps pinned to one real account, so the HTTP path runs against the real database. */
const authFor = (user) => ({
  verifyIdToken: async () => ({ uid: user.firebase_uid, email: user.email, emailVerified: true, displayName: null, picture: null }),
  findOrProvisionUser: async () => user,
  loadAccess: async () => ({ roles: ['customer'], permissions: [] }),
  loadWallet: async () => ({ balanceMinor: 0, currency: 'USD' }),
});

// ── HTTP layer (fakes) ────────────────────────────────────────────────────────────────────────

test('GET /api/wallet requires a signed-in user', async () => {
  const { url, close } = await startApi({ auth: fakeAuth(), wallet: fakeWallet() });
  try {
    await expectCode(await get(url, '/api/wallet', null), 'AUTH_REQUIRED', 401, { arabicFirst: false });
    await expectCode(await get(url, '/api/wallet', 'not-a-token'), 'TOKEN_INVALID', 401, { arabicFirst: false });
  } finally {
    await close();
  }
});

test('GET /api/wallet returns integer minor units, the currency, the pending amount and the update time', async () => {
  const { url, close } = await startApi({ auth: fakeAuth(), wallet: fakeWallet() });
  try {
    const res = await get(url, '/api/wallet');
    assert.equal(res.status, 200);

    const text = await res.text();
    const body = JSON.parse(text);
    assert.equal(body.success, true);
    assert.equal(body.data.balanceMinor, 2599);
    assert.equal(body.data.pendingMinor, 5000);
    assert.equal(body.data.currency, 'USD');
    assert.equal(body.data.updatedAt, '2026-01-01T00:00:00.000Z');

    for (const field of ['balanceMinor', 'pendingMinor']) {
      assert.ok(Number.isInteger(body.data[field]), `${field} must be an integer number of minor units`);
    }
    // the raw payload can never carry a decimal amount
    assert.ok(!/"(balanceMinor|pendingMinor)":\s*-?\d+\./.test(text), `no float amounts in ${text}`);
  } finally {
    await close();
  }
});

test('the wallet router exposes reads only — nothing can set a balance over HTTP', async () => {
  const { url, close } = await startApi({ auth: fakeAuth(), wallet: fakeWallet() });
  try {
    // every registered route is a GET
    const layers = createWalletModule({ auth: fakeAuth(), wallet: fakeWallet() }).router.stack.filter((layer) => layer.route);
    assert.equal(layers.length, 2, 'both read routes are registered');
    for (const layer of layers) assert.deepEqual(Object.keys(layer.route.methods), ['get']);

    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      for (const path of ['/api/wallet', '/api/wallet/transactions']) {
        const res = await fetch(`${url}${path}`, {
          method,
          headers: { authorization: 'Bearer good', 'content-type': 'application/json' },
          body: '{"balanceMinor":999999}',
        });
        assert.equal(res.status, 404, `${method} ${path} must not exist`);
        await expectCode(res, 'NOT_FOUND', 404, { arabicFirst: false });
      }
    }
  } finally {
    await close();
  }
});

test('an unusable cursor answers 422 WALLET_INVALID_CURSOR with the offending field', async () => {
  const { url, close } = await startApi({ auth: fakeAuth(), wallet: fakeWallet() });
  try {
    for (const queryString of ['cursor=-1', 'cursor=1.5', 'cursor=12abc', 'cursor=', 'cursor=99999999999999999999']) {
      const body = await expectCode(
        await get(url, `/api/wallet/transactions?${queryString}`),
        'WALLET_INVALID_CURSOR',
        422,
      );
      assert.ok(
        body.error.details.fields.some((issue) => issue.field === 'cursor'),
        `?${queryString} should report the cursor field`,
      );
    }
  } finally {
    await close();
  }
});

test('an out-of-range or non-numeric limit answers 422 VALIDATION_ERROR with the offending field', async () => {
  const { url, close } = await startApi({ auth: fakeAuth(), wallet: fakeWallet() });
  try {
    for (const queryString of ['limit=0', 'limit=101', 'limit=abc', 'limit=2.5', 'limit=1&limit=2']) {
      const body = await expectCode(
        await get(url, `/api/wallet/transactions?${queryString}`),
        'VALIDATION_ERROR',
        422,
      );
      assert.ok(
        body.error.details.fields.some((issue) => issue.field === 'limit'),
        `?${queryString} should report the limit field`,
      );
    }
  } finally {
    await close();
  }
});

test('the ledger page defaults to 20, allows up to 100 and passes a numeric cursor through', async () => {
  const wallet = fakeWallet();
  const { url, close } = await startApi({ auth: fakeAuth(), wallet });
  try {
    await get(url, '/api/wallet/transactions');
    await get(url, '/api/wallet/transactions?limit=100');
    await get(url, '/api/wallet/transactions?limit=7&cursor=42');

    const asked = wallet.calls.filter((call) => call.method === 'listTransactions');
    assert.equal(asked.length, 3);
    assert.equal(asked[0].limit, 20, 'default page size');
    assert.equal(asked[0].cursor, null);
    assert.equal(asked[1].limit, 100, 'maximum page size');
    assert.equal(asked[2].limit, 7);
    assert.equal(asked[2].cursor, 42);
    assert.equal(typeof asked[2].cursor, 'number');
    assert.ok(asked.every((call) => call.userId === dbUser().id), 'the id comes from the verified session');
  } finally {
    await close();
  }
});

test('a bad amount is refused before the database is touched, with the documented code', async () => {
  // The guards run before any query, so this needs no DATABASE_URL at all.
  for (const amountMinor of [0, -1, 1.5, Number.NaN]) {
    await assert.rejects(
      () => applyWalletMovement({ userId: randomUUID(), direction: 'credit', type: 'payment', amountMinor }),
      (error) => {
        assert.equal(error.code, 'VALIDATION_ERROR', `${amountMinor} must be a validation error`);
        assert.equal(error.status, 422);
        observedCodes.add(error.code);
        assertCustomerSafe(error.message);
        return true;
      },
    );
  }

  // beyond the safe-integer range the amount could not be reported faithfully: its own code
  await assert.rejects(
    () => applyWalletMovement({ userId: randomUUID(), direction: 'credit', type: 'payment', amountMinor: MAX_MOVEMENT_MINOR + 2 }),
    (error) => {
      assert.equal(error.code, 'WALLET_LIMIT_EXCEEDED');
      assert.equal(error.status, 422);
      observedCodes.add(error.code);
      assertCustomerSafe(error.message);
      return true;
    },
  );

  for (const movement of [
    { direction: 'sideways', type: 'payment' },
    { direction: 'credit', type: 'not_a_type' },
  ]) {
    await assert.rejects(
      () => applyWalletMovement({ userId: randomUUID(), amountMinor: 100, ...movement }),
      (error) => {
        assert.equal(error.code, 'VALIDATION_ERROR');
        observedCodes.add(error.code);
        assertCustomerSafe(error.message);
        return true;
      },
    );
  }
});

test('database failures become documented codes and never a driver message', () => {
  const cases = [
    [{ code: '23514', message: 'wallet_apply: insufficient balance — available 0, requested 1001' }, 'WALLET_INSUFFICIENT_FUNDS', 409],
    [{ code: 'P0002', message: 'wallet_apply: no wallet exists for user 00000000-0000-0000-0000-000000000000' }, 'WALLET_NOT_FOUND', 404],
    [{ code: '23503', message: 'insert or update on table "wallet_transactions" violates foreign key constraint' }, 'WALLET_MOVEMENT_REJECTED', 409],
    [{ code: '42501', message: 'wallet_transactions is append-only (attempted UPDATE)' }, 'WALLET_MOVEMENT_REJECTED', 409],
    [{ code: undefined, message: 'connect ECONNREFUSED 127.0.0.1:5432' }, 'DB_UNAVAILABLE', 503],
    [{ code: 'DB_NOT_CONFIGURED', message: 'DATABASE_URL is not configured' }, 'DB_UNAVAILABLE', 503],
  ];

  for (const [raw, code, status] of cases) {
    const mapped = toWalletError(Object.assign(new Error(raw.message), raw.code ? { code: raw.code } : {}));
    assert.equal(mapped.code, code, `${raw.message} must map to ${code}`);
    assert.equal(mapped.status, status);
    observedCodes.add(mapped.code);
    assertCustomerSafe(mapped.message);
  }

  // an unknown failure is returned untouched for the log — the global handler answers a neutral
  // 500 with a support reference, so nothing internal reaches the customer either
  const unexpected = Object.assign(new Error('column "nope" does not exist'), { code: '42703' });
  assert.equal(toWalletError(unexpected), unexpected);
  assert.equal(toWalletError(new Error('boom')).message, 'boom', 'only known failures are re-coded');
});

test('every code this module answers with is documented in docs/ERROR_CODES.md', () => {
  const doc = readFileSync(new URL('../../../docs/ERROR_CODES.md', import.meta.url), 'utf8');
  const documented = new Set([...doc.matchAll(/^\|\s*`([A-Z][A-Z0-9_]+)`\s*\|/gm)].map((match) => match[1]));

  const introduced = [
    'WALLET_NOT_FOUND',
    'WALLET_INSUFFICIENT_FUNDS',
    'WALLET_LIMIT_EXCEEDED',
    'WALLET_INVALID_CURSOR',
    'WALLET_MOVEMENT_REJECTED',
  ];
  for (const code of introduced) {
    assert.ok(documented.has(code), `${code} must have a row in docs/ERROR_CODES.md`);
  }
  for (const code of observedCodes) {
    assert.ok(documented.has(code), `${code} was answered but is not documented in docs/ERROR_CODES.md`);
  }
  assert.ok(observedCodes.size >= introduced.length, `the suite exercised every code (saw ${[...observedCodes].join(', ')})`);
});

// ── Database-backed money rules ───────────────────────────────────────────────────────────────

test('a credit moves the balance, writes exactly one ledger row and is idempotent', { skip: !hasDb }, async () => {
  const user = await provisionUser('wallet-credit');
  const snapshot = () => loadWalletSummary(user.id);

  const fresh = await snapshot();
  assert.equal(fresh.balanceMinor, 0, 'a new wallet starts at zero');
  assert.equal(fresh.currency, 'USD');
  assert.equal(fresh.pendingMinor, 0);
  assert.deepEqual(Object.keys(fresh).sort(), ['balanceMinor', 'currency', 'pendingMinor', 'updatedAt']);

  const movement = await applyWalletMovement({
    userId: user.id,
    direction: 'credit',
    type: 'payment',
    amountMinor: 2500,
    description: 'شحن رصيد — اختبار',
    idempotencyKey: `wallet-credit-${user.id}`,
  });

  assert.equal(movement.balanceAfterMinor, 2500);
  assert.equal(movement.amountMinor, 2500);
  assert.equal(movement.direction, 'credit');
  assert.equal(movement.currency, 'USD');
  assert.ok(Number.isInteger(movement.balanceAfterMinor) && Number.isInteger(movement.amountMinor));

  const summary = await snapshot();
  assert.equal(summary.balanceMinor, 2500);
  assert.equal(summary.currency, 'USD');
  assert.ok(Number.isInteger(summary.pendingMinor));
  assert.ok(summary.updatedAt && !Number.isNaN(Date.parse(summary.updatedAt)), 'updatedAt is an ISO instant');

  const ledger = await query(
    `select type, direction, amount_minor, balance_after_minor, description
       from wallet_transactions where user_id = $1`,
    [user.id],
  );
  assert.equal(ledger.length, 1, 'exactly one ledger row per movement');
  assert.equal(ledger[0].type, 'payment');
  assert.equal(ledger[0].direction, 'credit');
  assert.equal(String(ledger[0].amount_minor), '2500');
  assert.equal(String(ledger[0].balance_after_minor), '2500');

  // the balance is a cache of the ledger: reconciliation must find no drift
  const drift = await query('select drift_minor from wallet_reconciliation where user_id = $1', [user.id]);
  assert.equal(drift.length, 0, 'wallet balance equals the ledger sum');

  // a replay of the same idempotency key is not a second movement
  const replay = await applyWalletMovement({
    userId: user.id,
    direction: 'credit',
    type: 'payment',
    amountMinor: 2500,
    idempotencyKey: `wallet-credit-${user.id}`,
  });
  assert.equal(replay.transactionId, movement.transactionId, 'the original movement is returned');
  assert.equal((await snapshot()).balanceMinor, 2500);
  const count = await queryOne('select count(*)::int as n from wallet_transactions where user_id = $1', [user.id]);
  assert.equal(count.n, 1, 'a retried call never moves money twice');
});

test('a withdrawal larger than the balance fails with WALLET_INSUFFICIENT_FUNDS and leaves everything unchanged', { skip: !hasDb }, async () => {
  const user = await provisionUser('wallet-withdraw');

  await applyWalletMovement({
    userId: user.id,
    direction: 'credit',
    type: 'payment',
    amountMinor: 1000,
    idempotencyKey: `wallet-withdraw-credit-${user.id}`,
  });

  const before = await queryOne('select balance_minor, version from wallets where user_id = $1', [user.id]);

  await assert.rejects(
    () =>
      applyWalletMovement({
        userId: user.id,
        direction: 'debit',
        type: 'withdrawal',
        amountMinor: 1001,
        description: 'طلب سحب أكبر من الرصيد',
        idempotencyKey: `wallet-withdraw-debit-${user.id}`,
      }),
    (error) => {
      assert.equal(error.code, 'WALLET_INSUFFICIENT_FUNDS', 'the documented, customer-readable code');
      assert.equal(error.status, 409);
      observedCodes.add(error.code);
      assertCustomerSafe(error.message);
      return true;
    },
  );

  const after = await queryOne('select balance_minor, version from wallets where user_id = $1', [user.id]);
  assert.equal(String(after.balance_minor), String(before.balance_minor), 'the balance is untouched');
  assert.equal(String(after.version), String(before.version), 'not even the version moved');
  assert.equal((await loadWalletSummary(user.id)).balanceMinor, 1000);

  const rows = await query(
    'select direction, type from wallet_transactions where user_id = $1 order by id',
    [user.id],
  );
  assert.equal(rows.length, 1, 'the failed withdrawal wrote no ledger row (no partial write)');
  assert.equal(rows[0].type, 'payment');

  // a correctly sized withdrawal still works afterwards
  const ok = await applyWalletMovement({
    userId: user.id,
    direction: 'debit',
    type: 'withdrawal',
    amountMinor: 1000,
    idempotencyKey: `wallet-withdraw-debit2-${user.id}`,
  });
  assert.equal(ok.balanceAfterMinor, 0);
});

test('a movement whose ledger row cannot be written leaves the balance untouched', { skip: !hasDb }, async () => {
  const user = await provisionUser('wallet-atomic');

  await applyWalletMovement({
    userId: user.id,
    direction: 'credit',
    type: 'payment',
    amountMinor: 5000,
    idempotencyKey: `wallet-atomic-credit-${user.id}`,
  });
  const before = await queryOne('select balance_minor, version from wallets where user_id = $1', [user.id]);

  // actor_user_id references users(id): an unknown actor makes the ledger INSERT fail. The
  // balance UPDATE happens first inside the same transaction, so this proves the pair rolls back
  // together — a balance can never move without its ledger row.
  await assert.rejects(
    () =>
      applyWalletMovement({
        userId: user.id,
        direction: 'debit',
        type: 'manual_adjustment',
        amountMinor: 1000,
        actorUserId: randomUUID(),
        idempotencyKey: `wallet-atomic-debit-${user.id}`,
      }),
    (error) => {
      assert.equal(error.code, 'WALLET_MOVEMENT_REJECTED');
      assert.equal(error.status, 409);
      observedCodes.add(error.code);
      assertCustomerSafe(error.message);
      return true;
    },
  );

  const after = await queryOne('select balance_minor, version from wallets where user_id = $1', [user.id]);
  assert.equal(String(after.balance_minor), '5000', 'the debit was rolled back with its ledger row');
  assert.equal(String(after.version), String(before.version));
  const rows = await queryOne('select count(*)::int as n from wallet_transactions where user_id = $1', [user.id]);
  assert.equal(rows.n, 1);
});

test('an account without a wallet answers WALLET_NOT_FOUND on read and write', { skip: !hasDb }, async () => {
  await assert.rejects(
    () =>
      applyWalletMovement({
        userId: randomUUID(),
        direction: 'credit',
        type: 'payment',
        amountMinor: 100,
      }),
    (error) => {
      assert.equal(error.code, 'WALLET_NOT_FOUND');
      assert.equal(error.status, 404);
      observedCodes.add(error.code);
      assertCustomerSafe(error.message);
      return true;
    },
  );

  // the same code on the read path, for an account whose wallet row is genuinely missing
  const user = await provisionUser('wallet-missing');
  await query('delete from wallets where user_id = $1', [user.id]);

  const { url, close } = await startApi({ auth: authFor(user), wallet: walletDbDeps });
  try {
    await expectCode(await get(url, '/api/wallet'), 'WALLET_NOT_FOUND', 404);
  } finally {
    await close();
  }
});

test('the ledger lists newest first and pages without duplicates or gaps', { skip: !hasDb }, async () => {
  const user = await provisionUser('wallet-page');

  const credits = [1000, 2000, 3000, 4000, 5000];
  for (const [index, amountMinor] of credits.entries()) {
    await applyWalletMovement({
      userId: user.id,
      direction: 'credit',
      type: 'payment',
      amountMinor,
      idempotencyKey: `wallet-page-${index}-${user.id}`,
    });
  }
  await applyWalletMovement({
    userId: user.id,
    direction: 'debit',
    type: 'fee',
    amountMinor: 500,
    description: 'عمولة',
    idempotencyKey: `wallet-page-fee-${user.id}`,
  });

  const { url, close } = await startApi({ auth: authFor(user), wallet: walletDbDeps });
  try {
    const collected = [];
    let cursor = null;
    let pages = 0;
    let firstPage = null;

    do {
      const path = `/api/wallet/transactions?limit=2${cursor ? `&cursor=${cursor}` : ''}`;
      const res = await get(url, path);
      assert.equal(res.status, 200, `GET ${path}`);
      const body = await res.json();
      assert.equal(body.success, true);
      if (!firstPage) firstPage = body.data;

      pages += 1;
      collected.push(...body.data.transactions);
      cursor = body.data.nextCursor;
      assert.ok(pages < 10, 'paging terminates');
    } while (cursor);

    assert.equal(pages, 3, 'six movements in pages of two');
    assert.equal(collected.length, 6, 'no gaps: every movement is returned exactly once');

    const ids = collected.map((row) => Number(row.id));
    assert.equal(new Set(ids).size, ids.length, 'no duplicates across pages');
    for (let i = 1; i < ids.length; i += 1) {
      assert.ok(ids[i] < ids[i - 1], `page order must be newest-first (${ids[i - 1]} → ${ids[i]})`);
    }

    const stored = await query('select id from wallet_transactions where user_id = $1 order by id desc', [user.id]);
    assert.deepEqual(ids, stored.map((row) => Number(row.id)), 'the pages cover the whole ledger, newest first');

    // the newest movement is the debit, and its amount is signed and integral
    const newest = firstPage.transactions[0];
    assert.equal(newest.type, 'fee');
    assert.equal(newest.direction, 'debit');
    assert.equal(newest.amountMinor, -500);
    assert.equal(newest.balanceAfterMinor, 14500);
    assert.equal(newest.description, 'عمولة');
    assert.ok(Number.isInteger(newest.amountMinor) && Number.isInteger(newest.balanceAfterMinor));
    assert.ok(newest.createdAt && !Number.isNaN(Date.parse(newest.createdAt)));
    assert.equal(newest.orderId, null);
    assert.equal(newest.paymentId, null);
    assert.equal(newest.commissionId, null);

    const creditRow = firstPage.transactions[1];
    assert.equal(creditRow.amountMinor, 5000);
    assert.ok(creditRow.amountMinor > 0, 'credits are positive');

    // the balance the ledger claims equals the balance the API reports
    const walletRes = await get(url, '/api/wallet');
    const wallet = (await walletRes.json()).data;
    assert.equal(wallet.balanceMinor, 14500);
    assert.ok(Number.isInteger(wallet.balanceMinor));
    assert.ok(!/"balanceMinor":\s*-?\d+\./.test(await (await get(url, '/api/wallet')).text()), 'no float amounts');

    // another account's ledger is never visible here
    const other = await provisionUser('wallet-other');
    await applyWalletMovement({
      userId: other.id,
      direction: 'credit',
      type: 'payment',
      amountMinor: 99,
      idempotencyKey: `wallet-other-${other.id}`,
    });
    const otherIds = new Set(
      (await query('select id from wallet_transactions where user_id = $1', [other.id])).map((row) => Number(row.id)),
    );
    assert.ok(ids.every((id) => !otherIds.has(id)), 'paging is scoped to the signed-in user');
  } finally {
    await close();
  }
});

test('the database itself refuses a direct balance update (the ledger guard)', { skip: !hasDb }, async () => {
  const user = await provisionUser('wallet-guard');

  await applyWalletMovement({
    userId: user.id,
    direction: 'credit',
    type: 'bonus',
    amountMinor: 700,
    idempotencyKey: `wallet-guard-${user.id}`,
  });

  await assert.rejects(
    () => query('update wallets set balance_minor = 999999 where user_id = $1', [user.id]),
    (error) => {
      assert.equal(error.code, '23514', 'a check-violation raised by the guard trigger');
      assert.match(String(error.message), /wallet_apply/i, 'the message names the only sanctioned path');
      return true;
    },
  );

  // and the balance really did not move
  const wallet = await queryOne('select balance_minor from wallets where user_id = $1', [user.id]);
  assert.equal(String(wallet.balance_minor), '700');
  assert.equal((await loadWalletSummary(user.id)).balanceMinor, 700);

  // the ledger is append-only too: a movement can never be rewritten or erased
  await assert.rejects(
    () => query('update wallet_transactions set amount_minor = 999999 where user_id = $1', [user.id]),
    (error) => {
      assert.equal(error.code, '42501');
      assert.match(String(error.message), /append-only/i);
      return true;
    },
  );
  await assert.rejects(
    () => query('delete from wallet_transactions where user_id = $1', [user.id]),
    (error) => {
      assert.equal(error.code, '42501');
      return true;
    },
  );

  const rows = await queryOne('select count(*)::int as n from wallet_transactions where user_id = $1', [user.id]);
  assert.equal(rows.n, 1);
});
