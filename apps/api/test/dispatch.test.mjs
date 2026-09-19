import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createApp } from '../dist/app.js';

/**
 * Dispatching orders to a supplier.
 *
 * Every test injects a fake adapter through the registry — no network call is ever made. What is
 * asserted is the behaviour that costs money if it is wrong: one submission per order, and a refund
 * exactly once when the supplier refuses or cancels.
 */
const hasDb = Boolean(process.env.DATABASE_URL);
const run = randomUUID().slice(0, 8);

/**
 * Supplier credentials are encrypted at rest, so the tests need a key. This one is a throwaway
 * generated per run — no real secret ever appears in a test file.
 */
process.env.PROVIDER_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString('base64');

let db;
const dbApi = async () => (db ??= await import('../dist/lib/db.js'));

const auth = { authorization: 'Bearer test' };
const post = (url, path, body) =>
  fetch(`${url}${path}`, { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) });

async function startServer(authDeps) {
  const server = createApp({ auth: authDeps }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return { url: `http://127.0.0.1:${address.port}`, close: () => new Promise((resolve) => server.close(resolve)) };
}

async function makeCustomer(balanceMinor = 50000) {
  const { findOrProvisionUser } = await import('../dist/modules/auth/users.js');
  const { applyWalletMovement } = await import('../dist/modules/wallet/service.js');
  const email = `dispatch-${run}-${randomUUID().slice(0, 6)}@example.test`;
  const user = await findOrProvisionUser({ uid: email, email, emailVerified: true, displayName: 'Dispatch Test', picture: null });
  if (balanceMinor > 0) {
    await applyWalletMovement({
      userId: user.id,
      direction: 'credit',
      type: 'manual_adjustment',
      amountMinor: balanceMinor,
      description: 'test funding',
      idempotencyKey: `fund-${user.id}`,
    });
  }
  return user;
}

const sellerFor = (user, permissions = []) => ({
  verifyIdToken: async () => ({ uid: user.firebase_uid, email: user.email, emailVerified: true }),
  findOrProvisionUser: async () => user,
  loadAccess: async () => ({ roles: ['customer'], permissions }),
  loadWallet: async () => ({ balanceMinor: 0, currency: 'USD' }),
});

/** A supplier row whose credential is really encrypted, and a service that points at it. */
async function makeSupplierAndService({ executionMode = 'provider', withExternalService = true } = {}) {
  const { queryOne } = await dbApi();
  const { encodeCredential } = await import('../dist/modules/providers/index.js');
  const slug = `dispatch-provider-${run}-${randomUUID().slice(0, 6)}`;
  const provider = await queryOne(
    `insert into providers (name, slug, adapter_key, base_url, credentials_encrypted, is_active, priority, balance_currency)
     values ($1, $2, 'fake-panel', 'https://supplier.test/api', $3, true, 10, 'USD')
     returning id, slug, adapter_key`,
    ['Dispatch IT supplier', slug, encodeCredential('secret-key-123')],
  );

  const category = await queryOne(
    `select id from categories where slug = $1`,
    [`dispatch-it-cat-${run}`],
  );
  const categoryId =
    category?.id ??
    (
      await queryOne(`insert into categories (name, name_ar, slug) values ($1, $2, $3) returning id`, [
        'Dispatch IT',
        'اختبار الإرسال',
        `dispatch-it-cat-${run}`,
      ])
    ).id;

  const service = await queryOne(
    `insert into services (category_id, provider_id, provider_service_id, name, name_ar, slug, price_unit,
                           price_minor, provider_cost_minor, min_quantity, max_quantity, is_active, input_type,
                           execution_mode)
     values ($1, $2, $3, $4, $5, $6, 'per_1000', 5000, 2000, 100, 100000, true, 'link', $7)
     returning id, slug`,
    [
      categoryId,
      provider.id,
      withExternalService ? 'EXT-SERVICE-1' : null,
      'Dispatch IT service',
      'خدمة إرسال',
      `dispatch-it-${run}-${randomUUID().slice(0, 6)}`,
      executionMode,
    ],
  );

  return { provider, service };
}

/** A fake adapter: it records calls and answers whatever the test tells it to. */
function fakeRegistry(behaviour = {}) {
  const calls = { created: [], status: [] };

  const adapter = {
    key: 'fake-panel',
    capabilities: behaviour.capabilities ?? ['order.create', 'order.status'],
    supports(capability) {
      return this.capabilities.includes(capability);
    },
    async balance() {
      return { balanceMinor: 0, currency: 'USD', raw: {} };
    },
    async listServices() {
      return [];
    },
    async createOrder(input) {
      calls.created.push(input);
      if (behaviour.createThrows) {
        throw Object.assign(new Error(behaviour.createThrows.message), { code: behaviour.createThrows.code });
      }
      return { externalOrderId: behaviour.externalOrderId ?? 'EXT-ORDER-1', chargeMinor: null, currency: 'USD', raw: {} };
    },
    async orderStatus(externalOrderId) {
      calls.status.push(externalOrderId);
      return {
        externalOrderId,
        status: behaviour.status ?? 'in_progress',
        startCount: behaviour.startCount ?? 120,
        remains: behaviour.remains ?? 800,
        chargeMinor: null,
        currency: 'USD',
        raw: {},
      };
    },
    async cancelOrder(externalOrderId) {
      return { externalOrderId, canceled: true, raw: {} };
    },
  };

  return { registry: { register() {}, has: () => true, keys: () => ['fake-panel'], create: () => adapter }, calls, adapter };
}

async function placeOrder(user, service, target = `https://instagram.com/p/dispatch-${run}`) {
  const { url, close } = await startServer(sellerFor(user));
  try {
    const res = await post(url, '/api/orders', {
      serviceSlug: service.slug,
      target,
      quantity: 1000,
      idempotencyKey: `dispatch-${run}-${randomUUID().slice(0, 6)}`,
    });
    const text = await res.text();
    assert.equal(res.status, 201, `order creation failed: ${text}`);
    return JSON.parse(text).data.order;
  } finally {
    await close();
  }
}

const balanceOf = async (userId) => {
  const { queryOne } = await dbApi();
  return Number((await queryOne('select balance_minor from wallets where user_id = $1', [userId])).balance_minor);
};

const orderRow = async (publicId) => {
  const { queryOne } = await dbApi();
  return queryOne('select * from orders where public_id = $1', [publicId]);
};

/* ── submission ───────────────────────────────────────────────────────────────────────────────── */

test('a pending order is submitted once and keeps the supplier order id', { skip: !hasDb }, async () => {
  const { query } = await dbApi();
  const { dispatchPendingOrders } = await import('../dist/modules/orders/dispatch.js');
  const user = await makeCustomer();
  const { provider, service } = await makeSupplierAndService();
  const order = await placeOrder(user, service);

  const { registry, calls } = fakeRegistry({ externalOrderId: 'EXT-9' });
  const first = await dispatchPendingOrders({ registry, onlyProviderId: provider.id });

  assert.equal(first.submitted, 1, JSON.stringify(first.results));
  assert.equal(calls.created.length, 1, 'exactly one HTTP call to the supplier');
  assert.equal(calls.created[0].link, order.target);
  assert.equal(calls.created[0].quantity, 1000);
  assert.equal(calls.created[0].externalServiceId, 'EXT-SERVICE-1');

  const stored = await orderRow(order.publicId);
  assert.equal(stored.provider_order_id, 'EXT-9');
  assert.equal(stored.status, 'processing');

  const history = await query(`select source, to_status from order_status_history where order_id = $1 order by id`, [stored.id]);
  assert.deepEqual(history.map((row) => row.to_status), ['pending', 'processing'], 'the timeline records the submission');
  assert.equal(history.at(-1).source, 'system');

  // A second tick has nothing left to submit for this order.
  const second = await dispatchPendingOrders({ registry, onlyProviderId: provider.id });
  assert.equal(second.submitted, 0);
  assert.equal(calls.created.length, 1, 'still exactly one submission');
});

test('a supplier rejection refunds the customer exactly once', { skip: !hasDb }, async () => {
  const { query } = await dbApi();
  const { dispatchPendingOrders } = await import('../dist/modules/orders/dispatch.js');
  const user = await makeCustomer();
  const { provider, service } = await makeSupplierAndService();
  const order = await placeOrder(user, service);
  const paid = order.totalMinor; // 5000 per 1000 units × 1000 items
  assert.equal(paid, 5000);
  const afterCharge = await balanceOf(user.id);
  assert.equal(afterCharge, 50000 - paid);

  const { registry, calls } = fakeRegistry({
    createThrows: { code: 'PROVIDER_AUTH_FAILED', message: 'the supplier refused our key' },
  });

  const first = await dispatchPendingOrders({ registry, onlyProviderId: provider.id });
  assert.equal(first.failed, 1, JSON.stringify(first.results));
  assert.equal(first.results[0].code, 'PROVIDER_AUTH_FAILED');
  assert.equal(calls.created.length, 1);

  const stored = await orderRow(order.publicId);
  assert.equal(stored.status, 'refunded');
  assert.equal(Number(stored.refunded_minor), paid);
  assert.ok(stored.provider_error, 'the reason is kept for support');
  assert.equal(await balanceOf(user.id), 50000, 'the customer got their money back');

  const refunds = await query(
    `select count(*)::int as n from wallet_transactions where order_id = $1 and type = 'order_refund'`,
    [stored.id],
  );
  assert.equal(refunds[0].n, 1, 'one refund movement');

  // A retry of the same order must not refund twice.
  const { refundOrder } = await import('../dist/modules/orders/dispatch.js');
  const again = await refundOrder(stored, 'retry', {});
  assert.equal(again, 0, 'nothing left to refund');
  assert.equal(await balanceOf(user.id), 50000);
});

test('a supplier that cannot take orders is refused before any call', { skip: !hasDb }, async () => {
  const { dispatchPendingOrders } = await import('../dist/modules/orders/dispatch.js');
  const user = await makeCustomer();
  const { provider, service } = await makeSupplierAndService();
  const order = await placeOrder(user, service);

  const { registry, calls } = fakeRegistry({ capabilities: ['balance', 'services'] });
  const outcome = await dispatchPendingOrders({ registry, onlyProviderId: provider.id });

  assert.equal(outcome.failed, 1);
  assert.equal(outcome.results[0].code, 'PROVIDER_CAPABILITY_UNSUPPORTED');
  assert.equal(calls.created.length, 0, 'no order was sent');
  assert.equal((await orderRow(order.publicId)).status, 'refunded');
  assert.equal(await balanceOf(user.id), 50000);
});

test('work a human does is never sent anywhere', { skip: !hasDb }, async () => {
  const { dispatchPendingOrders } = await import('../dist/modules/orders/dispatch.js');
  const user = await makeCustomer();
  const { provider, service } = await makeSupplierAndService({ executionMode: 'manual' });
  await placeOrder(user, service);

  const { registry, calls } = fakeRegistry();
  const outcome = await dispatchPendingOrders({ registry, onlyProviderId: provider.id });

  assert.equal(outcome.attempted, 0, 'manual services are not dispatched');
  assert.equal(calls.created.length, 0);
});

/* ── follow-up ────────────────────────────────────────────────────────────────────────────────── */

test('a completed order records its finish and the supplier counts', { skip: !hasDb }, async () => {
  const { dispatchPendingOrders, syncOrderStatuses } = await import('../dist/modules/orders/dispatch.js');
  const user = await makeCustomer();
  const { provider, service } = await makeSupplierAndService();
  const order = await placeOrder(user, service);
  await dispatchPendingOrders({ registry: fakeRegistry().registry, onlyProviderId: provider.id });

  const { registry } = fakeRegistry({ status: 'completed', remains: 0, startCount: 4242 });
  const sync = await syncOrderStatuses({ registry, onlyProviderId: provider.id });

  assert.equal(sync.synced, 1);
  const stored = await orderRow(order.publicId);
  assert.equal(stored.status, 'completed');
  assert.ok(stored.completed_at, 'the completion time is stamped by the trigger');
  assert.equal(Number(stored.remains), 0);
  assert.equal(Number(stored.start_count), 4242);
});

test('a supplier that cancels an order triggers the refund', { skip: !hasDb }, async () => {
  const { dispatchPendingOrders, syncOrderStatuses } = await import('../dist/modules/orders/dispatch.js');
  const user = await makeCustomer();
  const { provider, service } = await makeSupplierAndService();
  const order = await placeOrder(user, service);
  await dispatchPendingOrders({ registry: fakeRegistry().registry, onlyProviderId: provider.id });
  const afterSubmit = await balanceOf(user.id);

  const { registry } = fakeRegistry({ status: 'canceled' });
  const sync = await syncOrderStatuses({ registry, onlyProviderId: provider.id });

  assert.equal(sync.failed, 1);
  const stored = await orderRow(order.publicId);
  assert.equal(stored.status, 'refunded');
  assert.equal(Number(stored.refunded_minor), order.totalMinor);
  assert.equal(await balanceOf(user.id), afterSubmit + order.totalMinor, 'the money came back');
});

/* ── the operator trigger ─────────────────────────────────────────────────────────────────────── */

test('the manual dispatch endpoint needs the orders.edit permission', { skip: !hasDb }, async () => {
  const user = await makeCustomer(0);

  const denied = await startServer(sellerFor(user, []));
  try {
    const res = await post(denied.url, '/api/admin/orders/dispatch');
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error.code, 'FORBIDDEN');
  } finally {
    await denied.close();
  }

  const allowed = await startServer(sellerFor(user, ['orders.edit']));
  try {
    const res = await post(allowed.url, '/api/admin/orders/dispatch');
    assert.equal(res.status, 200);
    const body = (await res.json()).data;
    assert.ok(body.dispatch && body.sync, 'the tick reports both halves');
  } finally {
    await allowed.close();
  }
});
