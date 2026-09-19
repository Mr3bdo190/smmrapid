import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createApp } from '../dist/app.js';

/**
 * The admin surface that turns a synced catalogue into a shop.
 *
 * The assertions that matter are end-to-end: activating a service in the panel must make it appear
 * in the customer catalogue (and deactivating must remove it), a bulk change with the wrong expected
 * count must change nothing at all, and a delete must be soft so the orders that used the service
 * still resolve. Money is not written here at all — the wallet's ledger owns that — so a price edit
 * is checked against what the customer is actually quoted.
 */

const hasDb = Boolean(process.env.DATABASE_URL);
const run = randomUUID().slice(0, 8);

let db;
let adminUser;

const FULL_PERMISSIONS = ['services.view', 'services.edit', 'services.delete', 'users.view', 'users.edit', 'users.suspend', 'users.roles'];

const startServer = async (perms = FULL_PERMISSIONS) => {
  const app = createApp({
    auth: {
      verifyIdToken: async () => ({ uid: adminUser.firebase_uid, email: adminUser.email, emailVerified: true }),
      findOrProvisionUser: async () => adminUser,
      loadAccess: async () => ({ roles: perms.length ? ['admin'] : ['customer'], permissions: perms }),
      loadWallet: async () => ({ balanceMinor: 0, currency: 'USD' }),
    },
  });
  const server = app.listen(0);
  await once(server, 'listening');
  const { port } = server.address();
  return { url: `http://127.0.0.1:${port}`, close: () => new Promise((resolve) => server.close(resolve)) };
};

const call = (url, path, init = {}) =>
  fetch(`${url}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer admin-token', ...(init.headers ?? {}) },
  });

const seedService = async ({ suffix, active = false, priceMinor = 1000, name }) => {
  const { query } = await db;
  const categoryId = randomUUID();
  const serviceId = randomUUID();
  const slug = `adm-${run}-${suffix}`;
  await query(
    `insert into categories (id, name, slug, is_active, sort_order) values ($1, $2, $3, true, 10)`,
    [categoryId, `فئة ${suffix}`, `adm-cat-${run}-${suffix}`],
  );
  await query(
    `insert into services (id, category_id, name, name_ar, slug, type, price_unit, price_minor,
                           min_quantity, max_quantity, is_active, input_type)
     values ($1, $2, $3, $4, $5, 'default', 'per_1000', $6, 100, 100000, $7, 'link')`,
    [serviceId, categoryId, name ?? `خدمة ${suffix}`, `خدمة ${suffix}`, slug, priceMinor, active],
  );
  return { serviceId, categoryId, slug };
};

const readService = async (id) => (await db).queryOne(`select * from services where id = $1::uuid`, [id]);

/** The customer-facing catalogue, read from the same server: activation must show up there. */
const inCatalogue = async (url, slug) => {
  const res = await fetch(`${url}/api/catalog/services?q=${encodeURIComponent(slug)}`);
  const body = await res.json();
  return body.data.services.some((service) => service.slug === slug);
};

before(async () => {
  if (!hasDb) return;
  db = await import('../dist/lib/db.js');
  const { query } = db;
  adminUser = {
    id: randomUUID(),
    firebase_uid: `admin-${run}`,
    email: `admin-${run}@example.test`,
    email_verified: true,
    display_name: 'Admin',
    avatar_url: null,
    referral_code: null,
    status: 'active',
    created_at: new Date().toISOString(),
  };
  await query(
    `insert into users (id, firebase_uid, email, email_verified, display_name, status)
     values ($1, $2, $3, true, 'Admin', 'active')`,
    [adminUser.id, adminUser.firebase_uid, adminUser.email],
  );

});

after(async () => {
  if (!hasDb) return;
  const { query } = db;
  await query(`delete from services where slug like $1`, [`adm-${run}-%`]);
  await query(`delete from categories where slug like $1`, [`adm-cat-${run}-%`]);
  // the audit trail is append-only (a database trigger refuses DELETE and UPDATE), which is the
  // point of it: the rows this test wrote stay, exactly as a real admin action would.
  // the schema refuses to hard-delete an account (a trigger keeps it and records the attempt), so
  // the test leaves its own admin row in place rather than working around a real guarantee.
});

test('the admin services list demands services.view', async () => {
  const { url, close } = await startServer([]);
  try {
    const res = await call(url, '/api/admin/services');
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error.code, 'FORBIDDEN');
  } finally {
    await close();
  }
});

test('activating a service in the panel puts it in the customer catalogue', { skip: !hasDb }, async () => {
  const seeded = await seedService({ suffix: 'live', active: false });
  const { url, close } = await startServer();
  try {
    assert.equal(await inCatalogue(url, seeded.slug), false, 'a fresh sync is not in the shop');

    const res = await call(url, `/api/admin/services/${seeded.serviceId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: true, priceMinor: 2500 }),
    });
    const text = await res.text();
    assert.equal(res.status, 200, text);
    const { data } = JSON.parse(text);
    assert.equal(data.service.isActive, true);
    assert.equal(data.service.priceMinor, 2500);

    assert.equal(await inCatalogue(url, seeded.slug), true, 'and now the customer can buy it');

    const quoted = await fetch(`${url}/api/pricing/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceSlug: seeded.slug, quantity: 1000 }),
    }).then((response) => response.json());
    assert.equal(quoted.data.quote.unitPriceMinor, 2500, 'the panel price is the quoted price');

    const audited = await (await db).queryOne(
      `select action, old_value, new_value from audit_logs where entity_id = $1 order by created_at desc limit 1`,
      [seeded.serviceId],
    );
    assert.equal(audited.action, 'SERVICE_UPDATE');
    assert.equal(audited.old_value.isActive, false);
    assert.equal(audited.new_value.isActive, true);
  } finally {
    await close();
  }
});

test('a quantity range that makes no sense is refused', { skip: !hasDb }, async () => {
  const seeded = await seedService({ suffix: 'limits' });
  const { url, close } = await startServer();
  try {
    const res = await call(url, `/api/admin/services/${seeded.serviceId}`, {
      method: 'PATCH',
      body: JSON.stringify({ minQuantity: 5000, maxQuantity: 100 }),
    });
    assert.equal(res.status, 422);
    assert.equal((await res.json()).error.code, 'SERVICE_LIMITS_INVALID');

    const row = await readService(seeded.serviceId);
    assert.equal(Number(row.min_quantity), 100, 'nothing was written');
  } finally {
    await close();
  }
});

test('a bulk change with the wrong expected count changes nothing', { skip: !hasDb }, async () => {
  const one = await seedService({ suffix: 'bulk1' });
  await seedService({ suffix: 'bulk2', active: true });
  const { url, close } = await startServer();
  try {
    const res = await call(url, '/api/admin/services/bulk/deactivate', {
      method: 'POST',
      body: JSON.stringify({ all: true, expectCount: 1 }),
    });
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.error.code, 'SERVICE_BULK_MISMATCH');
    assert.match(body.error.message, /nothing was changed/);

    assert.equal((await readService(one.serviceId)).is_active, false, 'the off service stayed off');
    const other = await (await db).queryOne(`select is_active from services where slug = $1`, [`adm-${run}-bulk2`]);
    assert.equal(other.is_active, true, 'and the on service stayed on — nothing was half-applied');
  } finally {
    await close();
  }
});

test('a bulk change that matches the expected count applies exactly once', { skip: !hasDb }, async () => {
  const seeded = await seedService({ suffix: 'bulk3', active: false });
  const { url, close } = await startServer();
  try {
    const res = await call(url, '/api/admin/services/bulk/activate', {
      method: 'POST',
      body: JSON.stringify({ ids: [seeded.serviceId], expectCount: 1 }),
    });
    const text = await res.text();
    assert.equal(res.status, 200, text);
    assert.equal(JSON.parse(text).data.changed, 1);
    assert.equal((await readService(seeded.serviceId)).is_active, true);

    const audit = await (await db).queryOne(
      `select action, new_value from audit_logs where action = 'SERVICE_BULK_ACTIVATE' order by created_at desc limit 1`,
    );
    assert.equal(audit.action, 'SERVICE_BULK_ACTIVATE');
    assert.equal(audit.new_value.count, 1);
  } finally {
    await close();
  }
});

test('deleting a service takes it out of the shop without losing the row', { skip: !hasDb }, async () => {
  const seeded = await seedService({ suffix: 'gone', active: true });
  const { url, close } = await startServer();
  try {
    assert.equal(await inCatalogue(url, seeded.slug), true);

    const res = await call(url, `/api/admin/services/${seeded.serviceId}`, { method: 'DELETE' });
    assert.equal(res.status, 200, await res.text());

    assert.equal(await inCatalogue(url, seeded.slug), false, 'the shop stops offering it');
    const row = await readService(seeded.serviceId);
    assert.ok(row, 'the row is still there for the orders that used it');
    assert.ok(row.deleted_at, 'flagged as deleted rather than removed');
    assert.equal(row.is_active, false);
  } finally {
    await close();
  }
});

test('editing a service demands services.edit, deleting demands services.delete', { skip: !hasDb }, async () => {
  const seeded = await seedService({ suffix: 'perms' });
  const viewer = await startServer(['services.view']);
  try {
    const patch = await call(viewer.url, `/api/admin/services/${seeded.serviceId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: true }),
    });
    assert.equal(patch.status, 403, 'viewing is not editing');

    const remove = await call(viewer.url, `/api/admin/services/${seeded.serviceId}`, { method: 'DELETE' });
    assert.equal(remove.status, 403, 'and neither is deleting');

    const list = await call(viewer.url, '/api/admin/services');
    assert.equal(list.status, 200, 'but the list is allowed');
    const { data } = await list.json();
    assert.ok(typeof data.shop.inactive === 'number', 'the panel reports how many are off sale');
  } finally {
    await viewer.close();
  }
});
