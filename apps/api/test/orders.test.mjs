import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createApp } from '../dist/app.js';

/**
 * Orders: the only place a customer's money is committed.
 *
 * The tests that matter here are the money ones — a charge and an order commit together or not at
 * all, and replaying an attempt never charges twice. Everything runs against the real schema when
 * DATABASE_URL is set; the validation tests need no database at all.
 */
const hasDb = Boolean(process.env.DATABASE_URL);
const run = randomUUID().slice(0, 8);

let db;

async function dbApi() {
  if (!db) db = await import('../dist/lib/db.js');
  return db;
}

async function startServer(auth) {
  const server = createApp({ auth }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

/** An identity whose account exists in the database, with a funded wallet. */
async function makeCustomer(balanceMinor = 0) {
  const { findOrProvisionUser } = await import('../dist/modules/auth/users.js');
  const { applyWalletMovement } = await import('../dist/modules/wallet/service.js');
  const email = `orders-${run}-${randomUUID().slice(0, 6)}@example.test`;
  const user = await findOrProvisionUser({
    uid: email,
    email,
    emailVerified: true,
    displayName: 'Orders Test',
    picture: null,
  });
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

/** A signed-in app whose identity guard resolves to this customer. */
async function serverFor(user) {
  return startServer({
    verifyIdToken: async () => ({ uid: user.firebase_uid, email: user.email, emailVerified: true }),
    findOrProvisionUser: async () => user,
    loadAccess: async () => ({ roles: ['customer'], permissions: [] }),
    loadWallet: async () => ({ balanceMinor: 0, currency: 'USD' }),
  });
}

const auth = { authorization: 'Bearer test' };
const post = (url, path, body) =>
  fetch(`${url}${path}`, { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify(body) });
const get = (url, path) => fetch(`${url}${path}`, { headers: auth });

/** One category per test run, reused — its slug is unique, so it cannot be inserted twice. */
let categoryId = null;
async function categoryForRun() {
  if (categoryId) return categoryId;
  const { queryOne } = await dbApi();
  const slug = `orders-it-cat-${run}`;
  const existing = await queryOne('select id from categories where slug = $1', [slug]);
  if (existing) {
    categoryId = existing.id;
    return categoryId;
  }
  const created = await queryOne(
    `insert into categories (name, name_ar, slug) values ($1, $2, $3) returning id`,
    ['Orders IT', 'اختبار الطلبات', slug],
  );
  categoryId = created.id;
  return categoryId;
}

/** A service with a known price, cost and range. */
async function makeService({ priceMinor = 5000, costMinor = 2000, min = 100, max = 100000 } = {}) {
  const { queryOne } = await dbApi();
  const slug = `orders-it-${run}-${randomUUID().slice(0, 6)}`;
  const category = await categoryForRun();
  const service = await queryOne(
    `insert into services (category_id, name, name_ar, slug, price_unit, price_minor, provider_cost_minor,
                           min_quantity, max_quantity, is_active, input_type)
     values ($1, $2, $3, $4, 'per_1000', $5, $6, $7, $8, true, 'link')
     returning id, slug, name, price_minor`,
    [category, 'Orders IT service', 'خدمة اختبار', slug, priceMinor, costMinor, min, max],
  );
  return service;
}

const balanceOf = async (userId) => {
  const { queryOne } = await dbApi();
  const row = await queryOne('select balance_minor from wallets where user_id = $1', [userId]);
  return Number(row.balance_minor);
};

/* ── validation, no database needed ───────────────────────────────────────────────────────────── */

const fakeAuth = () => ({
  verifyIdToken: async () => ({ uid: 'validation-order-user', email: 'v@example.test', emailVerified: true }),
  findOrProvisionUser: async () => ({
    id: '00000000-0000-0000-0000-0000000000aa',
    firebase_uid: 'validation-order-user',
    email: 'v@example.test',
    email_verified: true,
    display_name: 'Validation',
    avatar_url: null,
    referral_code: 'FIXTURE',
    status: 'active',
    created_at: new Date().toISOString(),
  }),
  loadAccess: async () => ({ roles: ['customer'], permissions: [] }),
  loadWallet: async () => ({ balanceMinor: 0, currency: 'USD' }),
});

test('an unauthenticated create is refused before anything else', async () => {
  const { url, close } = await startServer(fakeAuth());
  try {
    const res = await fetch(`${url}/api/orders`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ serviceSlug: 'x', target: 'https://example.com', quantity: 100 }),
    });
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error.code, 'AUTH_REQUIRED');
  } finally {
    await close();
  }
});

test('a client cannot name a price: unknown fields are refused, not honoured', async () => {
  const { url, close } = await startServer(fakeAuth());
  try {
    for (const extra of [{ chargeMinor: 1 }, { totalMinor: 0 }, { status: 'completed' }]) {
      const res = await post(url, '/api/orders', {
        serviceSlug: 'x',
        target: 'https://example.com',
        quantity: 100,
        ...extra,
      });
      assert.equal(res.status, 422, `${JSON.stringify(extra)} must be refused`);
      const body = await res.json();
      assert.equal(body.error.code, 'VALIDATION_ERROR');
    }
  } finally {
    await close();
  }
});

test('a target that cannot be acted on is refused with its reason', async () => {
  const { url, close } = await startServer(fakeAuth());
  try {
    for (const target of ['', 'x'.repeat(5001)]) {
      const res = await post(url, '/api/orders', { serviceSlug: 'x', target, quantity: 100 });
      assert.equal(res.status, 422);
      const body = await res.json();
      assert.equal(body.error.code, 'VALIDATION_ERROR');
    }

    const missingService = await post(url, '/api/orders', { target: 'https://example.com', quantity: 100 });
    assert.equal(missingService.status, 422);
    assert.equal((await missingService.json()).error.code, 'VALIDATION_ERROR');
  } finally {
    await close();
  }
});

test('an ORD-shaped id is required to read one order', async () => {
  const { url, close } = await startServer(fakeAuth());
  try {
    for (const bad of ['nope', 'ORD12', '12345678']) {
      const res = await get(url, `/api/orders/${bad}`);
      assert.equal(res.status, 422, `${bad} must be refused`);
    }
  } finally {
    await close();
  }
});

/* ── the money path, against the real schema ──────────────────────────────────────────────────── */

test('creating an order charges once, writes the ledger row and the first timeline entry', { skip: !hasDb }, async () => {
  const { query, queryOne } = await dbApi();
  const user = await makeCustomer(20000);
  const service = await makeService({ priceMinor: 5000, costMinor: 2000 });
  const { url, close } = await serverFor(user);

  try {
    const before = await balanceOf(user.id);
    const res = await post(url, '/api/orders', {
      serviceSlug: service.slug,
      target: 'https://instagram.com/p/abc',
      quantity: 2000,
      idempotencyKey: `create-${run}-1`,
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.replayed, false);

    const order = body.data.order;
    // 5000 per 1000 × 2000 items = 10000
    assert.equal(order.chargeMinor, 10000);
    assert.equal(order.discountMinor, 0);
    assert.equal(order.totalMinor, 10000);
    assert.equal(order.status, 'pending');
    assert.equal(order.quantity, 2000);
    assert.match(order.publicId, /^ORD[0-9A-F]{10}$/);

    // the customer never sees our economics
    for (const hidden of ['providerCostMinor', 'profitMinor', 'providerId', 'providerOrderId', 'costMinor']) {
      assert.ok(!(hidden in order), `${hidden} must not be in a customer order`);
    }

    const after = await balanceOf(user.id);
    assert.equal(after, before - 10000, 'the wallet is debited by exactly the total');

    const ledger = await query(
      `select type, amount_minor, direction, order_id from wallet_transactions
        where user_id = $1 and order_id is not null order by id desc limit 1`,
      [user.id],
    );
    assert.equal(ledger.length, 1);
    assert.equal(ledger[0].type, 'order_charge');
    assert.equal(ledger[0].direction, 'debit');
    assert.equal(Number(ledger[0].amount_minor), 10000);

    const items = await query('select quantity, subtotal_minor from order_items where order_id = $1', [ledger[0].order_id]);
    assert.equal(items.length, 1);
    assert.equal(Number(items[0].subtotal_minor), 10000);

    const history = await query('select from_status, to_status, source from order_status_history where order_id = $1', [ledger[0].order_id]);
    assert.equal(history.length, 1, 'creation writes the first timeline entry');
    assert.equal(history[0].to_status, 'pending');
    assert.equal(history[0].source, 'user');

    const stored = await queryOne('select charge_minor, discount_minor, provider_cost_minor, profit_minor from orders where id = $1', [ledger[0].order_id]);
    assert.equal(Number(stored.provider_cost_minor), 4000, 'cost is per 1000 × quantity');
    assert.equal(Number(stored.profit_minor), 6000, 'profit is what the customer paid minus our cost');
  } finally {
    await close();
  }
});

test('replaying the same attempt returns the original order and charges nothing more', { skip: !hasDb }, async () => {
  const { query } = await dbApi();
  const user = await makeCustomer(20000);
  const service = await makeService();
  const { url, close } = await serverFor(user);
  const key = `replay-${run}-1`;

  try {
    const first = await post(url, '/api/orders', {
      serviceSlug: service.slug,
      target: 'https://instagram.com/p/replay',
      quantity: 1000,
      idempotencyKey: key,
    });
    assert.equal(first.status, 201);
    const firstOrder = (await first.json()).data.order;
    const afterFirst = await balanceOf(user.id);

    const second = await post(url, '/api/orders', {
      serviceSlug: service.slug,
      target: 'https://instagram.com/p/replay',
      quantity: 1000,
      idempotencyKey: key,
    });
    assert.equal(second.status, 200, 'a replay is not a new order');
    const secondBody = await second.json();
    assert.equal(secondBody.data.replayed, true);
    assert.equal(secondBody.data.order.publicId, firstOrder.publicId);

    assert.equal(await balanceOf(user.id), afterFirst, 'the balance did not move a second time');
    const ledger = await query('select count(*)::int as n from wallet_transactions where user_id = $1', [user.id]);
    assert.equal(ledger[0].n, 2, 'one funding movement and exactly one charge');
  } finally {
    await close();
  }
});

test('a failure after the debit rolls the order back — the customer is never left charged', { skip: !hasDb }, async () => {
  const { queryOne } = await dbApi();
  const user = await makeCustomer(20000);
  const service = await makeService();
  const { applyWalletMovement } = await import('../dist/modules/wallet/service.js');

  // The real debit runs on the caller's transaction, then the order insert is made to fail.
  const auth2 = {
    verifyIdToken: async () => ({ uid: user.firebase_uid, email: user.email, emailVerified: true }),
    findOrProvisionUser: async () => user,
    loadAccess: async () => ({ roles: ['customer'], permissions: [] }),
    loadWallet: async () => ({ balanceMinor: 0, currency: 'USD' }),
  };
  const before = await balanceOf(user.id);
  const server = createApp({ auth: auth2 });

  // Drive the service directly with a charge that succeeds and a subsequent failure, which is
  // exactly what an insert error looks like from inside the transaction.
  const { createOrder } = await import('../dist/modules/orders/service.js');
  const { quote } = await import('../dist/modules/pricing/service.js');

  await assert.rejects(
    createOrder(
      {
        userId: user.id,
        serviceSlug: service.slug,
        target: 'https://instagram.com/p/rollback',
        quantity: 1000,
        idempotencyKey: `rollback-${run}`,
      },
      {
        quote,
        chargeWallet: async (movement, client) => {
          await applyWalletMovement(movement, client);
          throw new Error('simulated failure after the debit');
        },
      },
    ),
    /simulated failure/,
  );

  assert.equal(await balanceOf(user.id), before, 'the debit was rolled back with the order');
  const order = await queryOne('select id from orders where idempotency_key = $1', [`rollback-${run}`]);
  assert.equal(order, null, 'no order row survived');
  assert.ok(server);
});

test('a customer without enough balance is refused and charged nothing', { skip: !hasDb }, async () => {
  const { queryOne } = await dbApi();
  const user = await makeCustomer(500); // not enough for a 1000-item order (5000)
  const service = await makeService({ priceMinor: 5000 });
  const { url, close } = await serverFor(user);

  try {
    const res = await post(url, '/api/orders', {
      serviceSlug: service.slug,
      target: 'https://instagram.com/p/poor',
      quantity: 1000,
      idempotencyKey: `poor-${run}`,
    });
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.ok(body.error.code.startsWith('WALLET_'), `expected a wallet code, got ${body.error.code}`);

    assert.equal(await balanceOf(user.id), 500, 'nothing was charged');
    assert.equal(await queryOne('select id from orders where user_id = $1 and target = $2', [user.id, 'https://instagram.com/p/poor']), null);
  } finally {
    await close();
  }
});

test('two open orders for the same link on the same service are refused', { skip: !hasDb }, async () => {
  const user = await makeCustomer(50000);
  const service = await makeService();
  const { url, close } = await serverFor(user);
  const target = 'https://instagram.com/p/duplicate';

  try {
    const first = await post(url, '/api/orders', { serviceSlug: service.slug, target, quantity: 1000, idempotencyKey: `dup-${run}-1` });
    assert.equal(first.status, 201);

    const second = await post(url, '/api/orders', { serviceSlug: service.slug, target, quantity: 1000, idempotencyKey: `dup-${run}-2` });
    assert.equal(second.status, 409);
    assert.equal((await second.json()).error.code, 'ORDER_DUPLICATE_TARGET');
  } finally {
    await close();
  }
});

test('a quantity outside the service range is refused with the range in the details', { skip: !hasDb }, async () => {
  const user = await makeCustomer(50000);
  const service = await makeService({ min: 500, max: 1000 });
  const { url, close } = await serverFor(user);

  try {
    const res = await post(url, '/api/orders', {
      serviceSlug: service.slug,
      target: 'https://instagram.com/p/range',
      quantity: 10,
      idempotencyKey: `range-${run}`,
    });
    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'PRICING_QUANTITY_OUT_OF_RANGE');
    assert.ok(JSON.stringify(body.error.details ?? {}).includes('500'), 'the details carry the allowed range');
  } finally {
    await close();
  }
});

test('the history is newest first and pages without gaps or repeats', { skip: !hasDb }, async () => {
  const user = await makeCustomer(100000);
  const service = await makeService();
  const { url, close } = await serverFor(user);

  try {
    for (let i = 0; i < 3; i += 1) {
      const res = await post(url, '/api/orders', {
        serviceSlug: service.slug,
        target: `https://instagram.com/p/page-${i}`,
        quantity: 1000,
        idempotencyKey: `page-${run}-${i}`,
      });
      assert.equal(res.status, 201);
    }

    const firstPage = await get(url, '/api/orders?limit=2');
    assert.equal(firstPage.status, 200);
    const pageOne = (await firstPage.json()).data;
    assert.equal(pageOne.orders.length, 2);
    assert.ok(pageOne.nextCursor, 'a next cursor is offered');

    const secondPage = await get(url, `/api/orders?limit=2&cursor=${encodeURIComponent(pageOne.nextCursor)}`);
    const pageTwo = (await secondPage.json()).data;
    assert.ok(pageTwo.orders.length >= 1);

    const ids = [...pageOne.orders, ...pageTwo.orders].map((order) => order.publicId);
    assert.equal(new Set(ids).size, ids.length, 'no order appears on both pages');

    const times = pageOne.orders.map((order) => Date.parse(order.createdAt));
    assert.deepEqual(times, [...times].sort((a, b) => b - a), 'newest first');
  } finally {
    await close();
  }
});

test('one order carries its timeline, and another customer cannot read it', { skip: !hasDb }, async () => {
  const user = await makeCustomer(20000);
  const service = await makeService();
  const { url, close } = await serverFor(user);

  try {
    const created = await post(url, '/api/orders', {
      serviceSlug: service.slug,
      target: 'https://instagram.com/p/timeline',
      quantity: 1000,
      idempotencyKey: `timeline-${run}`,
    });
    const publicId = (await created.json()).data.order.publicId;

    const detail = await get(url, `/api/orders/${publicId}`);
    assert.equal(detail.status, 200);
    const order = (await detail.json()).data.order;
    assert.equal(order.publicId, publicId);
    assert.ok(Array.isArray(order.timeline) && order.timeline.length >= 1);
    assert.equal(order.timeline[0].to, 'pending');
    assert.equal(order.timeline[0].source, 'user');

    // someone else's session
    const other = await makeCustomer(0);
    const otherServer = await serverFor(other);
    try {
      const stolen = await get(otherServer.url, `/api/orders/${publicId}`);
      assert.equal(stolen.status, 404, 'an order is only visible to its owner');
      assert.equal((await stolen.json()).error.code, 'ORDER_NOT_FOUND');
    } finally {
      await otherServer.close();
    }
  } finally {
    await close();
  }
});

test('repeating offers a priced prefill without creating or charging anything', { skip: !hasDb }, async () => {
  const { queryOne } = await dbApi();
  const user = await makeCustomer(20000);
  const service = await makeService();
  const { url, close } = await serverFor(user);

  try {
    const created = await post(url, '/api/orders', {
      serviceSlug: service.slug,
      target: 'https://instagram.com/p/repeat',
      quantity: 1500,
      idempotencyKey: `repeat-${run}`,
    });
    const publicId = (await created.json()).data.order.publicId;
    const balanceBefore = await balanceOf(user.id);

    const repeat = await post(url, `/api/orders/${publicId}/repeat`, {});
    assert.equal(repeat.status, 200);
    const body = (await repeat.json()).data;
    assert.equal(body.repeatable, true);
    assert.equal(body.prefill.serviceSlug, service.slug);
    assert.equal(body.prefill.quantity, 1500);
    assert.equal(body.prefill.target, 'https://instagram.com/p/repeat');
    assert.ok(body.quote.totalMinor > 0, 'the prefill is priced as of now');

    assert.equal(await balanceOf(user.id), balanceBefore, 'repeating charges nothing');
    const count = await queryOne('select count(*)::int as n from orders where user_id = $1', [user.id]);
    assert.equal(count.n, 1, 'repeating creates nothing');

    // a service that has been switched off cannot be repeated
    const { query } = await dbApi();
    await query('update services set is_active = false where id = $1', [service.id]);
    const blocked = await post(url, `/api/orders/${publicId}/repeat`, {});
    assert.equal((await blocked.json()).data.repeatable, false);
  } finally {
    await close();
  }
});
