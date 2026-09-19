import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createApp } from '../dist/app.js';

/**
 * The storefront catalogue.
 *
 * What matters: the price on the card is the price the order form quotes (one pricing code path, no
 * second implementation), a service the customer cannot order never appears, and nothing about the
 * supplier leaks. The inactive-service test is the important one — a catalogue that lists what the
 * order form will refuse is how a customer ends up reading a validation error instead of a product.
 */

const hasDb = Boolean(process.env.DATABASE_URL);
const run = randomUUID().slice(0, 8);

let db;

const startServer = async () => {
  const app = createApp({
    auth: {
      verifyToken: async (token) => ({ uid: token }),
      findOrProvisionUser: async () => null,
      isRevoked: async () => false,
      permissionsFor: async () => [],
      rolesFor: async () => [],
    },
  });
  const server = app.listen(0);
  await once(server, 'listening');
  const { port } = server.address();
  return { url: `http://127.0.0.1:${port}`, close: () => new Promise((resolve) => server.close(resolve)) };
};

const get = (url, path) => fetch(`${url}${path}`);

/** A category + an orderable service, created straight in the database (there is no write API). */
const seedService = async (options) => {
  const { query } = await db;
  const categoryId = randomUUID();
  const serviceId = randomUUID();
  const slug = `cat-${run}-${options.slugSuffix}`;

  await query(
    `insert into categories (id, name, name_ar, slug, is_active, sort_order)
     values ($1, $2, $3, $4, true, 10)`,
    [categoryId, `فئة ${options.slugSuffix}`, `فئة ${options.slugSuffix}`, `cat-cat-${run}-${options.slugSuffix}`],
  );
  await query(
    `insert into services (id, category_id, name, name_ar, slug, type, price_unit, price_minor,
                           min_quantity, max_quantity, is_active, is_featured, input_type, sort_order)
     values ($1, $2, $3, $4, $5, 'default', 'per_1000', $6, $7, $8, $9, $10, 'link', 10)`,
    [
      serviceId,
      categoryId,
      options.name,
      options.nameAr ?? null,
      slug,
      options.priceMinor,
      options.minQuantity ?? 100,
      options.maxQuantity ?? 100000,
      options.isActive ?? true,
      options.isFeatured ?? false,
    ],
  );

  return { categoryId, serviceId, slug };
};

before(async () => {
  if (!hasDb) return;
  db = await import('../dist/lib/db.js');
});

after(async () => {
  if (!hasDb) return;
  const { query } = await db;
  await query(`delete from services where slug like $1`, [`cat-${run}-%`]);
  await query(`delete from categories where slug like $1`, [`cat-cat-${run}-%`]);
});

/* ── no database needed ───────────────────────────────────────────────────────────────────────── */

test('the catalogue search rejects nonsense instead of ignoring it', async () => {
  const { url, close } = await startServer();
  try {
    const res = await get(url, '/api/catalog/services?page=0');
    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(body.error.details.fields), 'the field that was wrong is named');
    assert.equal(body.error.details.fields[0].field, 'page');

    const huge = await get(url, '/api/catalog/services?pageSize=500');
    assert.equal(huge.status, 422, 'a page size nobody can render is refused, not clamped silently');
  } finally {
    await close();
  }
});

/* ── database ────────────────────────────────────────────────────────────────────────────────── */

test('the catalogue lists what is on sale and never what the order form would refuse', { skip: !hasDb }, async () => {
  const listed = await seedService({ slugSuffix: 'listed', name: `خدمة ظاهرة ${run}`, nameAr: `خدمة ظاهرة ${run}`, priceMinor: 1200 });
  const hidden = await seedService({ slugSuffix: 'hidden', name: `خدمة مقفولة ${run}`, priceMinor: 900, isActive: false });

  const { url, close } = await startServer();
  try {
    const res = await get(url, '/api/catalog/services?q=' + encodeURIComponent(run));
    assert.equal(res.status, 200);
    const { data } = await res.json();
    const slugs = data.services.map((service) => service.slug);

    assert.ok(slugs.includes(listed.slug), 'an orderable service is listed');
    assert.ok(!slugs.includes(hidden.slug), 'a switched-off service is not offered at all');
    assert.equal(data.total, 1, 'and the total counts only what was returned');

    const service = data.services.find((entry) => entry.slug === listed.slug);
    assert.equal(service.priceMinor, 1200);
    assert.equal(service.priceUnit, 'per_1000');
    assert.equal(service.minQuantity, 100);
    assert.equal(service.currency, 'USD');
    assert.ok(service.category.slug, 'the card carries its category');

    // nothing about the supplier travels to the browser
    for (const forbidden of ['provider_id', 'providerId', 'provider_cost_minor', 'providerCostMinor', 'provider_service_id']) {
      assert.ok(!(forbidden in service), `the catalogue must not expose ${forbidden}`);
    }
  } finally {
    await close();
  }
});

test('the listed price is the quoted price, to the cent', { skip: !hasDb }, async () => {
  const seeded = await seedService({ slugSuffix: 'parity', name: `خدمة السعر ${run}`, priceMinor: 1750 });

  const { url, close } = await startServer();
  try {
    const listed = await get(url, `/api/catalog/services/${seeded.slug}`).then((res) => res.json());
    const quoted = await fetch(`${url}/api/pricing/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceSlug: seeded.slug, quantity: 5000 }),
    }).then((res) => res.json());

    assert.equal(quoted.success, true, JSON.stringify(quoted));
    assert.equal(
      listed.data.service.priceMinor,
      quoted.data.quote.unitPriceMinor,
      'the catalogue and the order form must not disagree about the unit price',
    );
    assert.equal(quoted.data.quote.chargeMinor, Math.round((1750 * 5000) / 1000), '5000 units at 1.75 per 1000');
  } finally {
    await close();
  }
});

test('a service that is off sale says so, and says nothing was charged', { skip: !hasDb }, async () => {
  const hidden = await seedService({ slugSuffix: 'off', name: `خدمة مقفولة ٢ ${run}`, priceMinor: 1000, isActive: false });

  const { url, close } = await startServer();
  try {
    const res = await get(url, `/api/catalog/services/${hidden.slug}`);
    // A slug is guessable anyway, and "not found" would send the customer hunting for a typo they
    // did not make: the row exists, so the answer is the useful one — off sale, nothing charged.
    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error.code, 'PRICING_SERVICE_UNAVAILABLE');
    assert.match(body.error.message, /nothing was charged/);

    const unknown = await get(url, `/api/catalog/services/nope-${run}`);
    assert.equal(unknown.status, 404, 'a slug that does not exist is still a 404');
    assert.equal((await unknown.json()).error.code, 'PRICING_SERVICE_NOT_FOUND');
  } finally {
    await close();
  }
});

test('the category list only carries categories with something to sell', { skip: !hasDb }, async () => {
  await seedService({ slugSuffix: 'with', name: `خدمة التصنيف ${run}`, priceMinor: 1000 });
  const { query } = await db;
  const emptyCategoryId = randomUUID();
  await query(
    `insert into categories (id, name, slug, is_active, sort_order) values ($1, $2, $3, true, 10)`,
    [emptyCategoryId, `فارغة ${run}`, `cat-empty-${run}`],
  );

  const { url, close } = await startServer();
  try {
    const res = await get(url, '/api/catalog/categories');
    assert.equal(res.status, 200);
    const { data } = await res.json();
    const slugs = data.categories.map((category) => category.slug);

    const mine = data.categories.find((category) => category.slug === `cat-cat-${run}-with`);
    assert.ok(mine, 'the category holding a service is listed');
    assert.equal(mine.serviceCount, 1);
    assert.ok(!slugs.includes(`cat-empty-${run}`), 'an empty category is not a link to nowhere');

    await query(`delete from categories where id = $1`, [emptyCategoryId]);
  } finally {
    await close();
  }
});

test('paging through the catalogue is stable and honest about the total', { skip: !hasDb }, async () => {
  for (const suffix of ['p1', 'p2', 'p3']) {
    await seedService({ slugSuffix: suffix, name: `خدمة الصفحات ${run} ${suffix}`, priceMinor: 1000 });
  }

  const { url, close } = await startServer();
  try {
    const first = await get(url, `/api/catalog/services?q=${run}&page=1&pageSize=2`).then((res) => res.json());
    const second = await get(url, `/api/catalog/services?q=${run}&page=2&pageSize=2`).then((res) => res.json());

    assert.equal(first.data.services.length, 2);
    assert.equal(first.data.pageSize, 2);
    assert.ok(first.data.total >= 3, 'the total is the whole match, not the page');
    assert.equal(first.data.services.length, Math.min(2, first.data.total));
    assert.equal(
      second.data.services.length,
      Math.max(0, Math.min(2, first.data.total - 2)),
      'page two holds exactly what is left of the match',
    );
    assert.equal(second.data.page, 2);

    const firstPageSlugs = first.data.services.map((service) => service.slug);
    const secondPageSlugs = second.data.services.map((service) => service.slug);
    assert.equal(
      firstPageSlugs.filter((slug) => secondPageSlugs.includes(slug)).length,
      0,
      'page two must not repeat page one',
    );
  } finally {
    await close();
  }
});
