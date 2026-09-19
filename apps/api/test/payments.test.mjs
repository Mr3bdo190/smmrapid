import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID, createHash } from 'node:crypto';
import { createApp } from '../dist/app.js';

/**
 * Deposits.
 *
 * No test makes a network call: every gateway is replaced by a fake adapter, and the Heleket
 * signature is recomputed locally with the documented formula. What is asserted is the money rule —
 * money reaches the wallet once, only after the gateway's own authoritative answer.
 */
const hasDb = Boolean(process.env.DATABASE_URL);
const run = randomUUID().slice(0, 8);

let db;
const dbApi = async () => (db ??= await import('../dist/lib/db.js'));

const auth = { authorization: 'Bearer test' };
const post = (url, path, body, headers = {}) =>
  fetch(`${url}${path}`, { method: 'POST', headers: { ...auth, 'content-type': 'application/json', ...headers }, body: JSON.stringify(body ?? {}) });
const get = (url, path) => fetch(`${url}${path}`, { headers: auth });

async function startServer(paymentsDeps) {
  // The same identity fakes serve both: they live on the payments deps object.
  const server = createApp({ auth: paymentsDeps.auth, payments: paymentsDeps }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return { url: `http://127.0.0.1:${address.port}`, close: () => new Promise((resolve) => server.close(resolve)) };
}

async function makeCustomer() {
  const { findOrProvisionUser } = await import('../dist/modules/auth/users.js');
  const email = `pay-${run}-${randomUUID().slice(0, 6)}@example.test`;
  return findOrProvisionUser({ uid: email, email, emailVerified: true, displayName: 'Payments Test', picture: null });
}

const sellerFor = (user) => ({
  verifyIdToken: async () => ({ uid: user.firebase_uid, email: user.email, emailVerified: true }),
  findOrProvisionUser: async () => user,
  loadAccess: async () => ({ roles: ['customer'], permissions: [] }),
  loadWallet: async () => ({ balanceMinor: 0, currency: 'USD' }),
});

/** A fake gateway: records calls and answers whatever the test decides. */
function fakeAdapter(overrides = {}) {
  const calls = { created: [], checked: [], confirmed: 0 };
  // The database enforces one payment per gateway reference, so every fake gets its own.
  const unique = randomUUID().slice(0, 8);
  const adapter = {
    key: overrides.key ?? 'shahnawy',
    currency: overrides.currency ?? 'EGP',
    methods: overrides.methods ?? ['vf_cash', 'or_cash', 'et_cash'],
    configured: () => overrides.configured ?? true,
    async createDeposit(input) {
      calls.created.push(input);
      return {
        externalId: overrides.externalId ?? `999-${unique}`,
        reference: overrides.reference ?? `SH-TEST-${unique}`,
        status: 'pending',
        payUrl: overrides.payUrl ?? null,
        instructions: overrides.instructions ?? 'اطلب *9*1# خلال دقيقة واحدة لتاكيد طلب السحب',
        raw: { fake: true },
      };
    },
    async checkDeposit(externalId) {
      calls.checked.push(externalId);
      return {
        externalId,
        reference: overrides.reference ?? `SH-TEST-${unique}`,
        status: overrides.checkStatus ?? 'pending',
        payUrl: null,
        instructions: overrides.instructions ?? null,
        raw: { fake: 'check' },
      };
    },
    async confirmDeposit(intent) {
      calls.confirmed += 1;
      return { ...intent, status: overrides.confirmStatus ?? intent.status };
    },
    verifyWebhook() {
      // Matches this adapter's own payment, so the caller can find it (as a real gateway would).
      return overrides.verdict ?? {
        valid: false,
        eventId: `evt-${unique}`,
        externalId: `999-${unique}`,
        reference: `SH-TEST-${unique}`,
        status: 'completed',
        authoritative: false,
      };
    },
  };
  return { adapter, calls };
}

const balanceOf = async (userId) => {
  const { queryOne } = await dbApi();
  return Number((await queryOne('select balance_minor from wallets where user_id = $1', [userId])).balance_minor);
};

/** Gateways must be switched on, and the settings decide the limits. */
const depsFor = (adapter, extra = {}) => ({
  adapter: () => adapter,
  enabled: async () => ['shahnawy', 'heleket'],
  settings: async () => ({ usdExchangeRate: 50, minDepositMinor: 100, maxDepositMinor: 1_000_000 }),
  publicOrigin: 'https://smmrapid.store',
  ...extra,
});

/* ── starting a deposit ───────────────────────────────────────────────────────────────────────── */

test('a switched-off gateway is refused, and so is a missing credential', async () => {
  const user = await makeCustomer();
  const { adapter } = fakeAdapter();

  const off = await startServer({ ...depsFor(adapter, { enabled: async () => [] }), auth: sellerFor(user) });
  try {
    const res = await post(off.url, '/api/payments/deposits', { gateway: 'shahnawy', amountMinor: 10000, method: 'vf_cash', walletNumber: '01012345678' });
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error.code, 'PAYMENT_GATEWAY_OFF');
  } finally {
    await off.close();
  }

  const unconfigured = await startServer({ ...depsFor(fakeAdapter({ configured: false }).adapter), auth: sellerFor(user) });
  try {
    const res = await post(unconfigured.url, '/api/payments/deposits', { gateway: 'shahnawy', amountMinor: 10000, method: 'vf_cash', walletNumber: '01012345678' });
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error.code, 'PAYMENT_GATEWAY_UNCONFIGURED');
  } finally {
    await unconfigured.close();
  }
});

test('a deposit request validates the amount, the method and the wallet number', async () => {
  const user = await makeCustomer();
  const { adapter } = fakeAdapter();
  const { url, close } = await startServer({ ...depsFor(adapter), auth: sellerFor(user) });

  try {
    const tooSmall = await post(url, '/api/payments/deposits', { gateway: 'shahnawy', amountMinor: 100, method: 'vf_cash', walletNumber: '01012345678' });
    assert.equal(tooSmall.status, 422);
    assert.equal((await tooSmall.json()).error.code, 'PAYMENT_AMOUNT_OUT_OF_RANGE');

    const badMethod = await post(url, '/api/payments/deposits', { gateway: 'shahnawy', amountMinor: 10000, method: 'fawry', walletNumber: '01012345678' });
    assert.equal(badMethod.status, 422);

    const badNumber = await post(url, '/api/payments/deposits', { gateway: 'shahnawy', amountMinor: 10000, method: 'vf_cash', walletNumber: '0123' });
    assert.equal(badNumber.status, 422);
    assert.equal((await badNumber.json()).error.code, 'PAYMENT_WALLET_NUMBER_INVALID');
  } finally {
    await close();
  }
});

test('an unsigned webhook is never trusted to move money', { skip: !hasDb }, async () => {
  const user = await makeCustomer();
  const { adapter, calls } = fakeAdapter({ checkStatus: 'pending' });
  const { url, close } = await startServer({ ...depsFor(adapter), auth: sellerFor(user) });

  try {
    const created = await post(url, '/api/payments/deposits', { gateway: 'shahnawy', amountMinor: 10000, method: 'vf_cash', walletNumber: '01012345678' });
    assert.equal(created.status, 201);
    const payment = (await created.json()).data.payment;
    assert.match(payment.publicId, /^PAY[0-9A-F]{10}$/);
    assert.equal(payment.status, 'pending');
    assert.equal(payment.gatewayAmountMinor, 10000);
    assert.equal(payment.amountMinor, 200, 'EGP 100.00 at a rate of 50 is USD 2.00');
    assert.equal(payment.fxRate, 50);
    assert.ok(payment.instructions, 'the customer is told what to do on their phone');
    assert.equal(await balanceOf(user.id), 0, 'nothing is credited yet');

    // The gateway reports "completed" but signs nothing: we ask it ourselves before believing it.
    const webhook = await fetch(`${url}/api/webhooks/payments/shahnawy`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-transaction-status': 'completed' },
      body: JSON.stringify({ event: 'transaction.updated', transaction: { id: 999, reference: 'SH-TEST-1', status: 'completed' } }),
    });
    assert.equal(webhook.status, 200);
    const outcome = (await webhook.json()).data;
    assert.equal(outcome.signatureValid, false);

    assert.ok(calls.checked.length >= 1, 'the status was read back from the gateway');
    assert.equal(await balanceOf(user.id), 0, 'a pending gateway answer credits nothing');
  } finally {
    await close();
  }
});

test('a confirmed deposit credits the wallet exactly once, whatever arrives twice', { skip: !hasDb }, async () => {
  const { query } = await dbApi();
  const user = await makeCustomer();
  const { adapter, calls } = fakeAdapter({ checkStatus: 'pending', confirmStatus: 'completed' });
  const { url, close } = await startServer({ ...depsFor(adapter), auth: sellerFor(user) });

  try {
    const created = await post(url, '/api/payments/deposits', { gateway: 'shahnawy', amountMinor: 10000, method: 'vf_cash', walletNumber: '01012345678' });
    const payment = (await created.json()).data.payment;

    const confirmed = await post(url, `/api/payments/deposits/${payment.publicId}/confirm`, {});
    assert.equal(confirmed.status, 200);
    const settled = (await confirmed.json()).data.payment;
    assert.equal(settled.status, 'approved');
    assert.equal(await balanceOf(user.id), 200, 'USD 2.00 landed in the wallet exactly once');

    const ledger = await query(
      `select type, direction, amount_minor, payment_id from wallet_transactions where user_id = $1`,
      [user.id],
    );
    assert.equal(ledger.length, 1);
    assert.equal(ledger[0].type, 'payment');
    assert.equal(ledger[0].direction, 'credit');
    assert.equal(Number(ledger[0].amount_minor), 200);
    assert.ok(ledger[0].payment_id, 'the movement points at the payment');

    // Clicking confirm again is harmless, and so is a repeated webhook.
    const again = await post(url, `/api/payments/deposits/${payment.publicId}/confirm`, {});
    assert.equal(again.status, 200);
    assert.equal(await balanceOf(user.id), 200);

    const before = calls.confirmed;
    const replay = await fetch(`${url}/api/webhooks/payments/shahnawy`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event: 'transaction.updated', transaction: { id: 999, reference: 'SH-TEST-1', status: 'completed' } }),
    });
    assert.equal(replay.status, 200);
    assert.equal(await balanceOf(user.id), 200, 'a replayed notification changes nothing');
    assert.ok(calls.confirmed >= before);
  } finally {
    await close();
  }
});

test('a deposit that is still pending answers with the customer next step', { skip: !hasDb }, async () => {
  const user = await makeCustomer();
  const { adapter } = fakeAdapter({ checkStatus: 'pending', confirmStatus: 'pending' });
  const { url, close } = await startServer({ ...depsFor(adapter), auth: sellerFor(user) });

  try {
    const created = await post(url, '/api/payments/deposits', { gateway: 'shahnawy', amountMinor: 20000, method: 'or_cash', walletNumber: '01112345678' });
    const payment = (await created.json()).data.payment;

    const res = await post(url, `/api/payments/deposits/${payment.publicId}/confirm`, {});
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.error.code, 'PAYMENT_PENDING_CONFIRMATION');
    assert.equal(await balanceOf(user.id), 0);
  } finally {
    await close();
  }
});

test('an expired confirmation is not credited and says so', { skip: !hasDb }, async () => {
  const user = await makeCustomer();
  const { adapter } = fakeAdapter({ checkStatus: 'expired' });
  const { url, close } = await startServer({ ...depsFor(adapter), auth: sellerFor(user) });

  try {
    const created = await post(url, '/api/payments/deposits', { gateway: 'shahnawy', amountMinor: 10000, method: 'et_cash', walletNumber: '01112345678' });
    const payment = (await created.json()).data.payment;

    const res = await post(url, `/api/payments/deposits/${payment.publicId}/confirm`, {});
    assert.equal(res.status, 409);
    assert.equal((await res.json()).error.code, 'PAYMENT_EXPIRED');
    assert.equal(await balanceOf(user.id), 0);
  } finally {
    await close();
  }
});

/* ── Heleket: a signed webhook is authoritative ───────────────────────────────────────────────── */

test('Heleket: a valid signature is trusted, an invalid one is refused', { skip: !hasDb }, async () => {
  const apiKey = 'test-api-key';
  const body = {
    type: 'payment',
    uuid: '11111111-1111-4111-8111-111111111111',
    order_id: 'PAYTEST0001',
    status: 'paid',
    payment_status: 'paid',
    is_final: true,
    amount: '2.00',
    currency: 'USD',
  };
  // md5(base64(php-style json) + apiKey), exactly as the provider documents it.
  const phpLike = JSON.stringify(body).replace(/\//g, '\\/');
  const signature = createHash('md5').update(Buffer.from(phpLike, 'utf8').toString('base64') + apiKey).digest('hex');

  const user = await makeCustomer();
  const { adapter } = fakeAdapter({
    key: 'heleket',
    currency: 'USD',
    methods: [],
    // the database allows one payment per gateway reference, so keep these per-run
    externalId: `${body.uuid}-${run}`,
    reference: `${body.order_id}-${run}`,
  });
  const deps = {
    ...depsFor(adapter),
    config: { heleket: { baseUrl: 'https://api.heleket.com', merchantId: 'merchant-uuid', secretKey: apiKey, publicKey: null } },
    adapter: () => adapter,
  };
  const { url, close } = await startServer({ ...deps, auth: sellerFor(user) });

  // The signature we computed with the documented formula verifies in the real adapter, and a
  // wrong one does not — this is the crypto the provider's own docs describe.
  const { createHeleketAdapter } = await import('../dist/modules/payments/index.js');
  const real = createHeleketAdapter({ baseUrl: null, merchantId: 'merchant-uuid', secretKey: apiKey, publicKey: null });
  const verified = real.verifyWebhook({ headers: {}, body: { ...body, sign: signature }, rawBody: '' });
  assert.equal(verified.valid, true, 'a correctly signed notification verifies');
  assert.equal(verified.status, 'completed');
  assert.equal(verified.authoritative, true);
  const tampered = real.verifyWebhook({ headers: {}, body: { ...body, amount: '999.00', sign: signature }, rawBody: '' });
  assert.equal(tampered.valid, false, 'changing the body invalidates the signature');

  try {
    const created = await post(url, '/api/payments/deposits', { gateway: 'heleket', amountMinor: 200 });
    assert.equal(created.status, 201, await created.text());

    const bad = await fetch(`${url}/api/webhooks/payments/heleket`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...body, sign: 'deadbeef' }),
    });
    assert.equal(bad.status, 400, 'an unsigned or wrongly signed notification is refused');
    assert.equal((await bad.json()).error.code, 'PAYMENT_SIGNATURE_INVALID');
    assert.equal(await balanceOf(user.id), 0);
  } finally {
    await close();
  }
});

test('the public gateway list only offers what is switched on and configured', async () => {
  const user = await makeCustomer();
  const { adapter } = fakeAdapter();
  const { url, close } = await startServer({ ...depsFor(adapter, { enabled: async () => ['shahnawy'] }), auth: sellerFor(user) });

  try {
    const res = await get(url, '/api/payments/gateways');
    assert.equal(res.status, 200);
    const gateways = (await res.json()).data.gateways;
    assert.deepEqual(gateways.map((entry) => entry.key), ['shahnawy']);
    assert.equal(gateways[0].currency, 'EGP');
    assert.deepEqual(gateways[0].methods, ['vf_cash', 'or_cash', 'et_cash']);

    const offDeps = { ...depsFor(adapter, { enabled: async () => [] }), auth: sellerFor(user) };
    const off = await startServer(offDeps);
    try {
      const none = await get(off.url, '/api/payments/gateways');
      assert.deepEqual((await none.json()).data.gateways, [], 'nothing is offered when nothing is enabled');
    } finally {
      await off.close();
    }
  } finally {
    await close();
  }
});

test('a deposit is private to its owner', { skip: !hasDb }, async () => {
  const owner = await makeCustomer();
  const other = await makeCustomer();
  const { adapter } = fakeAdapter();
  const ownerServer = await startServer({ ...depsFor(adapter), auth: sellerFor(owner) });

  try {
    const created = await post(ownerServer.url, '/api/payments/deposits', { gateway: 'shahnawy', amountMinor: 10000, method: 'vf_cash', walletNumber: '01012345678' });
    const payment = (await created.json()).data.payment;

    const otherServer = await startServer({ ...depsFor(adapter), auth: sellerFor(other) });
    try {
      const res = await get(otherServer.url, `/api/payments/deposits/${payment.publicId}`);
      assert.equal(res.status, 404);
      assert.equal((await res.json()).error.code, 'PAYMENT_NOT_FOUND');

      const confirm = await post(otherServer.url, `/api/payments/deposits/${payment.publicId}/confirm`, {});
      assert.equal(confirm.status, 404, 'and it cannot be confirmed by someone else');
    } finally {
      await otherServer.close();
    }
  } finally {
    await ownerServer.close();
  }
});
