/**
 * Phase 6 — the pricing engine.
 *
 * Rules this suite follows (same shape as wallet.test.mjs and providers.test.mjs):
 *  - the module under test is the COMPILED file, built here with the project's own esbuild into
 *    dist/test-pricing/, exactly like the server build does;
 *  - the HTTP surface is exercised on a real socket, through the real routers and the real error
 *    handler, with fake auth (no Firebase project, no network);
 *  - every failure is asserted by its error CODE (clients translate by code), not just its status,
 *    and every message the suite sees is checked to be Arabic-first, actionable and free of
 *    database, driver or supplier internals;
 *  - database-backed tests run only when DATABASE_URL is set. They create their own fixtures and
 *    remove them afterwards; the seeded catalogue is never modified.
 */
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import express from 'express';

const here = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(here, '..');
const repoRoot = path.resolve(apiRoot, '../..');
const hasDb = Boolean(process.env.DATABASE_URL);

await build({
  absWorkingDir: apiRoot,
  entryPoints: { pricing: 'src/modules/pricing/index.ts' },
  outdir: 'dist/test-pricing',
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  logLevel: 'error',
});

const pricing = await import('../dist/test-pricing/pricing.js');
const {
  PRICING_ERROR_CODES,
  assertOrderNotTooSmall,
  assertQuantityInRange,
  couponAppliesToService,
  couponDiscount,
  createPricingModule,
  derivePriceFromCost,
  errorHandler,
  isCouponWithinWindow,
  marginMinor,
  marginPercentOf,
  notFoundHandler,
  pricingDbDeps,
  quantityCharge,
  recomputeSkipReason,
  resolveMarkup,
  toIntegerMinor,
  toPercentValue,
  totalAfterDiscount,
} = pricing;

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const SERVICE_ID = '22222222-2222-4222-8222-222222222222';

/** Codes seen while running the suite; every one of them must be documented. */
const observedCodes = new Set();

/** Anything a customer must never read: SQL, driver text, column names, SQLSTATEs. */
const RAW_INTERNALS =
  /price_minor|provider_cost_minor|service_variants|coupon_redemptions|SQLSTATE|node-postgres|relation "|syntax error|ECONNREFUSED|ETIMEDOUT|stack trace|at Object\.|\b2350[0-9]\b|\b22P02\b|\b42501\b/i;

function assertCustomerSafe(message) {
  assert.ok(typeof message === 'string' && message.trim().length > 0, 'every error carries a message');
  assert.ok(!RAW_INTERNALS.test(message), `a raw internal message reached the client: ${message}`);
  assert.ok(/[\u0600-\u06FF]/.test(message), `the message must be Arabic-first: ${message}`);
  assert.ok(/\(/.test(message), `the message must also carry an English gloss: ${message}`);
}

/** Records the code of any error envelope, so the end of the suite can check the catalogue. */
function record(body) {
  if (body?.success === false && typeof body.error?.code === 'string') {
    observedCodes.add(body.error.code);
  }
  return body;
}

async function callJson(base, routePath, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${base}${routePath}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const parsed = record(await response.json());
  return { status: response.status, body: parsed };
}

/** The identity layer the routes are guarded with — no Firebase, no database. */
function authDeps({ permissions = [], user = {} } = {}) {
  const account = {
    id: ADMIN_ID,
    firebase_uid: 'pricing-test-uid',
    email: 'pricing@example.test',
    email_verified: true,
    display_name: null,
    avatar_url: null,
    referral_code: null,
    status: 'active',
    created_at: new Date().toISOString(),
    ...user,
  };

  return {
    verifyIdToken: async (token) => {
      if (token !== 'good-token') {
        throw Object.assign(new Error('Firebase: the token is invalid'), { code: 'auth/invalid-id-token' });
      }
      return { uid: account.firebase_uid, email: account.email, emailVerified: true };
    },
    findOrProvisionUser: async () => account,
    loadAccess: async () => ({ roles: ['staff'], permissions }),
    loadWallet: async () => ({ balanceMinor: 0, currency: 'USD' }),
  };
}

const sampleService = {
  id: SERVICE_ID,
  slug: 'demo-service',
  name: 'Demo service',
  nameAr: 'خدمة تجريبية',
  category: { slug: 'instagram', name: 'Instagram', nameAr: 'إنستجرام' },
  priceUnit: 'per_1000',
  priceMinor: 12000,
  minQuantity: 100,
  maxQuantity: 50000,
  currency: 'USD',
  orderMinMinor: 10,
  inputType: 'link',
  supportsRefill: true,
  supportsCancel: false,
  supportsDripFeed: false,
  estimatedTime: 'starts in 30 minutes',
  variants: [],
};

const sampleQuote = {
  service: { id: SERVICE_ID, slug: 'demo-service', name: 'Demo service', nameAr: 'خدمة تجريبية', inputType: 'link' },
  variant: null,
  quantity: 5000,
  priceUnit: 'per_1000',
  unitPriceMinor: 12000,
  chargeMinor: 60000,
  discountMinor: 0,
  totalMinor: 60000,
  currency: 'USD',
  limits: { minQuantity: 100, maxQuantity: 50000, orderMinMinor: 10 },
  coupon: null,
  couponCheckedForCustomer: false,
  quotedAt: new Date().toISOString(),
};

/** Fake pricing deps: the HTTP tests are about routing, guards, validation and response shape. */
function fakePricing(overrides = {}) {
  const calls = { quote: [], recompute: [], preview: [] };
  const deps = {
    calls,
    quote: async (request) => {
      calls.quote.push(request);
      return { ...sampleQuote, quantity: request.quantity };
    },
    getServicePrice: async () => sampleService,
    adminServicePricing: async () => ({ service: sampleService, costMinor: 9000, markupPercent: 30, markupFixedMinor: 0, markupSource: 'category', suggestedPriceMinor: 11700, marginMinor: 2700, marginPercent: 23, providerRateCurrency: null, variants: [] }),
    previewPrice: async (input) => {
      calls.preview.push(input);
      return { costMinor: 1000, markupPercent: 30, markupFixedMinor: 0, markupSource: 'request', suggestedPriceMinor: 1300, currentPriceMinor: null, marginMinor: 300, marginPercent: 23, currency: 'USD' };
    },
    recomputePrices: async (input) => {
      calls.recompute.push(input);
      return { dryRun: input.dryRun, examined: 0, changed: 0, skippedNoPrice: 0, skippedCurrency: 0, currency: 'USD', services: [] };
    },
    ...overrides,
  };
  return deps;
}

async function startApi(moduleDeps) {
  const app = express();
  app.use(express.json());
  const module = createPricingModule(moduleDeps);
  app.use('/api/pricing', module.router);
  app.use('/api/admin/pricing', module.adminRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  const server = app.listen(0);
  await once(server, 'listening');
  const { port } = server.address();
  return {
    base: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

/* ── the engine, on its own ─────────────────────────────────────────────────────────────────── */

test('markup: service override beats the category, which beats the global fallback', () => {
  assert.deepEqual(
    resolveMarkup({ serviceMarkupPercent: 12, categoryMarkupPercent: 30, fallbackMarkupPercent: 50 }),
    { percent: 12, source: 'service' },
  );
  assert.deepEqual(
    resolveMarkup({ serviceMarkupPercent: null, categoryMarkupPercent: 30, fallbackMarkupPercent: 50 }),
    { percent: 30, source: 'category' },
  );
  assert.deepEqual(
    resolveMarkup({ serviceMarkupPercent: null, categoryMarkupPercent: null, fallbackMarkupPercent: 30 }),
    { percent: 30, source: 'fallback' },
  );
});

test('a price derived from a cost is integer money, rounded once', () => {
  assert.equal(derivePriceFromCost(9000, 30), 11700);
  assert.equal(derivePriceFromCost(1000, 0, 250), 1250);
  assert.equal(derivePriceFromCost(1000, 30, 250), 1550);
  assert.equal(derivePriceFromCost(0, 30), 0);
  const odd = derivePriceFromCost(1234, 17.5);
  assert.ok(Number.isInteger(odd), `a price must never be fractional: ${odd}`);
  assert.equal(odd, 1450);
});

test('the charge converts a quantity exactly once, for both price units', () => {
  assert.equal(quantityCharge(5000, 12000, 'per_1000'), 60000);
  assert.equal(quantityCharge(100, 12000, 'per_1000'), 1200);
  assert.equal(quantityCharge(3, 999, 'per_item'), 2997);
  assert.throws(() => quantityCharge(0, 1000, 'per_item'), /quantity must be a positive whole number/);
  assert.throws(() => quantityCharge(1.5, 1000, 'per_item'), /quantity must be a positive whole number/);
});

test('a quantity outside the service range is refused with the range in the details', () => {
  assert.throws(
    () => assertQuantityInRange(50, 100, 50000),
    (error) => {
      assert.equal(error.code, 'PRICING_QUANTITY_OUT_OF_RANGE');
      assert.equal(error.status, 422);
      assert.deepEqual(error.details, { minQuantity: 100, maxQuantity: 50000 });
      return true;
    },
  );
  assert.throws(() => assertQuantityInRange(2.5, 1, 10), { code: 'PRICING_QUANTITY_OUT_OF_RANGE' });
  assert.doesNotThrow(() => assertQuantityInRange(100, 100, 50000));
});

test('a coupon never takes off more than the charge, and respects its own cap', () => {
  const percent = { type: 'percent', percent_bp: 1000, amount_minor: null, max_discount_minor: 500 };
  assert.equal(couponDiscount(10000, percent), 500); // 10% of 10000 is 1000, capped at 500
  assert.equal(couponDiscount(2000, percent), 200);
  assert.equal(couponDiscount(2000, { ...percent, max_discount_minor: null }), 200);

  const fixed = { type: 'fixed', percent_bp: null, amount_minor: 5000, max_discount_minor: null };
  assert.equal(couponDiscount(10000, fixed), 5000);
  assert.equal(couponDiscount(1200, fixed), 1200, 'a discount can never exceed the charge');
  assert.equal(couponDiscount(10000, { type: 'fixed', percent_bp: null, amount_minor: null, max_discount_minor: null }), 0);

  assert.equal(totalAfterDiscount(10000, 10000), 0);
  assert.equal(totalAfterDiscount(10000, 99999), 0, 'a total is never negative');
  assert.equal(totalAfterDiscount(10000, 2500), 7500);
});

test('coupon windows and scopes are decided by the coupon row', () => {
  const now = new Date('2026-05-01T00:00:00.000Z');
  assert.equal(isCouponWithinWindow({ starts_at: null, expires_at: null }, now), true);
  assert.equal(isCouponWithinWindow({ starts_at: '2026-04-01T00:00:00.000Z', expires_at: '2026-05-02T00:00:00.000Z' }, now), true);
  assert.equal(isCouponWithinWindow({ starts_at: null, expires_at: '2026-04-30T00:00:00.000Z' }, now), false);
  assert.equal(isCouponWithinWindow({ starts_at: '2026-05-02T00:00:00.000Z', expires_at: null }, now), false);

  const service = { id: SERVICE_ID, categoryId: 'cat-a' };
  assert.equal(couponAppliesToService({ scope: 'all', category_id: null, service_id: null }, service), true);
  assert.equal(couponAppliesToService({ scope: 'category', category_id: 'cat-a', service_id: null }, service), true);
  assert.equal(couponAppliesToService({ scope: 'category', category_id: 'cat-b', service_id: null }, service), false);
  assert.equal(couponAppliesToService({ scope: 'service', category_id: null, service_id: SERVICE_ID }, service), true);
  assert.equal(couponAppliesToService({ scope: 'service', category_id: null, service_id: 'other' }, service), false);
});

test('the smallest order we accept is checked before anything is charged', () => {
  assert.throws(
    () => assertOrderNotTooSmall(5, 10),
    (error) => {
      assert.equal(error.code, 'PRICING_ORDER_TOO_SMALL');
      assert.deepEqual(error.details, { orderMinMinor: 10, totalMinor: 5 });
      return true;
    },
  );
  assert.doesNotThrow(() => assertOrderNotTooSmall(10, 10));
});

test('database values are read as integer money and percentages, or refused', () => {
  assert.equal(toIntegerMinor('11700', 'price_minor'), 11700);
  assert.equal(toIntegerMinor(0, 'price_minor'), 0);
  assert.equal(toIntegerMinor(null, 'price_minor'), 0);
  assert.throws(() => toIntegerMinor('12.5', 'price_minor'), /not an integer number of minor units/);
  assert.throws(() => toIntegerMinor('9007199254740992399', 'price_minor'), /outside the safe integer range/);

  assert.equal(toPercentValue('30.0000'), 30);
  assert.equal(toPercentValue('17.5000'), 17.5);
  assert.equal(toPercentValue(null), null);
  assert.throws(() => toPercentValue('thirty'), /not a percentage/);
});

test('a recompute leaves alone what it cannot price safely, and says why', () => {
  assert.equal(recomputeSkipReason({ costMinor: 0, platformCurrency: 'USD', providerRateCurrency: null }), 'no-cost');
  assert.equal(recomputeSkipReason({ costMinor: 5000, platformCurrency: 'USD', providerRateCurrency: 'EGP' }), 'currency');
  assert.equal(recomputeSkipReason({ costMinor: 5000, platformCurrency: 'USD', providerRateCurrency: 'USD' }), null);
  assert.equal(recomputeSkipReason({ costMinor: 5000, platformCurrency: 'USD', providerRateCurrency: null }), null);
});

test('the margin helpers describe the same numbers an admin sees', () => {
  assert.equal(marginMinor(11700, 9000), 2700);
  assert.equal(marginPercentOf(11700, 9000), 23);
  assert.equal(marginPercentOf(0, 0), 0);
});

/* ── the HTTP surface (fakes: no database, no Firebase) ─────────────────────────────────────── */

test('POST /api/pricing/quote prices a quantity for a signed-out visitor', async () => {
  const deps = fakePricing();
  const api = await startApi({ auth: authDeps(), pricing: deps });
  try {
    const { status, body } = await callJson(api.base, '/api/pricing/quote', {
      method: 'POST',
      body: { serviceSlug: 'demo-service', quantity: 5000 },
    });

    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.quote.totalMinor, 60000);
    assert.equal(body.data.quote.chargeMinor, 60000);
    assert.equal(body.data.quote.discountMinor, 0);
    assert.equal(deps.calls.quote.length, 1);
    assert.equal(deps.calls.quote[0].serviceSlug, 'demo-service');
    assert.equal(deps.calls.quote[0].userId, null, 'an anonymous visitor is not attributed to anyone');
  } finally {
    await api.close();
  }
});

test('POST /api/pricing/quote identifies a signed-in customer, and refuses a forged token', async () => {
  const deps = fakePricing();
  const api = await startApi({ auth: authDeps(), pricing: deps });
  try {
    const ok = await callJson(api.base, '/api/pricing/quote', {
      method: 'POST',
      token: 'good-token',
      body: { serviceId: SERVICE_ID, quantity: 1000, couponCode: 'pric10' },
    });
    assert.equal(ok.status, 200);
    assert.equal(deps.calls.quote[0].userId, ADMIN_ID);
    assert.equal(deps.calls.quote[0].couponCode, 'pric10');

    const forged = await callJson(api.base, '/api/pricing/quote', {
      method: 'POST',
      token: 'not-a-real-token',
      body: { serviceId: SERVICE_ID, quantity: 1000 },
    });
    assert.equal(forged.status, 401);
    assert.equal(forged.body.error.code, 'TOKEN_INVALID');
    assert.equal(deps.calls.quote.length, 1, 'a rejected token must not reach the pricing layer');
  } finally {
    await api.close();
  }
});

test('a malformed quote request answers VALIDATION_ERROR and never reaches the engine', async () => {
  const deps = fakePricing();
  const api = await startApi({ auth: authDeps(), pricing: deps });
  try {
    const noTarget = await callJson(api.base, '/api/pricing/quote', { method: 'POST', body: { quantity: 1000 } });
    assert.equal(noTarget.status, 422);
    assert.equal(noTarget.body.error.code, 'VALIDATION_ERROR');

    const badQuantity = await callJson(api.base, '/api/pricing/quote', {
      method: 'POST',
      body: { serviceSlug: 'demo-service', quantity: 0 },
    });
    assert.equal(badQuantity.status, 422);
    assert.equal(badQuantity.body.error.code, 'VALIDATION_ERROR');
    assert.ok(
      badQuantity.body.error.details.fields.some((field) => field.field === 'quantity'),
      'the offending field is named',
    );

    const fractional = await callJson(api.base, '/api/pricing/quote', {
      method: 'POST',
      body: { serviceSlug: 'demo-service', quantity: 1.5 },
    });
    assert.equal(fractional.status, 422);
    assert.equal(fractional.body.error.code, 'VALIDATION_ERROR');

    assert.equal(deps.calls.quote.length, 0, 'nothing invalid may reach the pricing layer');
  } finally {
    await api.close();
  }
});

test('a client cannot name a price: unknown body fields are dropped, not honoured', async () => {
  const deps = fakePricing();
  const api = await startApi({ auth: authDeps(), pricing: deps });
  try {
    const { status } = await callJson(api.base, '/api/pricing/quote', {
      method: 'POST',
      body: { serviceSlug: 'demo-service', quantity: 1000, priceMinor: 1, totalMinor: 1, discountMinor: 99999 },
    });

    assert.equal(status, 200);
    const forwarded = deps.calls.quote[0];
    assert.equal(forwarded.priceMinor, undefined);
    assert.equal(forwarded.totalMinor, undefined);
    assert.equal(forwarded.discountMinor, undefined);
  } finally {
    await api.close();
  }
});

test('GET /api/pricing/services/:slug validates the slug and answers a customer-safe failure', async () => {
  const deps = fakePricing({
    getServicePrice: async (slug) => {
      if (slug !== 'demo-service') {
        throw pricing.pricingError(
          'PRICING_SERVICE_NOT_FOUND',
          'الخدمة المطلوبة مش موجودة في القائمة، وما اتخصمش أي مبلغ. ارجع لقائمة الخدمات واختر خدمة موجودة. '
            + '(That service is not in our catalogue — nothing was charged.)',
          404,
        );
      }
      return sampleService;
    },
  });
  const api = await startApi({ auth: authDeps(), pricing: deps });
  try {
    const found = await callJson(api.base, '/api/pricing/services/demo-service');
    assert.equal(found.status, 200);
    assert.equal(found.body.data.service.priceMinor, 12000);
    assert.equal(JSON.stringify(found.body).includes('cost'), false, 'the customer shape carries no cost');

    const missing = await callJson(api.base, '/api/pricing/services/not-a-real-service');
    assert.equal(missing.status, 404);
    assert.equal(missing.body.error.code, 'PRICING_SERVICE_NOT_FOUND');
    assertCustomerSafe(missing.body.error.message);

    const malformed = await callJson(api.base, '/api/pricing/services/Not-A-Slug');
    assert.equal(malformed.status, 422);
    assert.equal(malformed.body.error.code, 'VALIDATION_ERROR');
  } finally {
    await api.close();
  }
});

test('the admin pricing routes are closed without a session, a permission and the right one', async () => {
  const noPermission = await startApi({ auth: authDeps({ permissions: ['services.view'] }), pricing: fakePricing() });
  const noSession = await startApi({ auth: authDeps({ permissions: ['services.view', 'services.edit'] }), pricing: fakePricing() });
  try {
    const anonymous = await callJson(noSession.base, '/api/admin/pricing/services/demo-service');
    assert.equal(anonymous.status, 401);
    assert.equal(anonymous.body.error.code, 'AUTH_REQUIRED');

    const view = await callJson(noPermission.base, '/api/admin/pricing/services/demo-service', { token: 'good-token' });
    assert.equal(view.status, 200);
    assert.equal(view.body.data.pricing.costMinor, 9000);
    assert.equal(view.body.data.pricing.marginMinor, 2700);

    const withoutEdit = await callJson(noPermission.base, '/api/admin/pricing/recompute', {
      method: 'POST',
      token: 'good-token',
      body: {},
    });
    assert.equal(withoutEdit.status, 403);
    assert.equal(withoutEdit.body.error.code, 'FORBIDDEN');

    const unknown = await callJson(noSession.base, '/api/admin/pricing/nope');
    assert.equal(unknown.status, 404);
    assert.equal(unknown.body.error.code, 'NOT_FOUND');
  } finally {
    await noPermission.close();
    await noSession.close();
  }
});

test('the recompute route reports by default and only writes when asked', async () => {
  const deps = fakePricing();
  const api = await startApi({ auth: authDeps({ permissions: ['services.view', 'services.edit'] }), pricing: deps });
  try {
    const dryRunReport = await callJson(api.base, '/api/admin/pricing/recompute', { method: 'POST', token: 'good-token', body: {} });
    assert.equal(dryRunReport.status, 200);
    assert.equal(dryRunReport.body.data.summary.dryRun, true);
    assert.equal(deps.calls.recompute[0].dryRun, true, 'an empty body must not reprice the catalogue');

    const applied = await callJson(api.base, '/api/admin/pricing/recompute', {
      method: 'POST',
      token: 'good-token',
      body: { dryRun: false, categorySlug: 'instagram' },
    });
    assert.equal(applied.status, 200);
    assert.equal(applied.body.data.summary.dryRun, false);
    assert.deepEqual(
      { dryRun: deps.calls.recompute[1].dryRun, categorySlug: deps.calls.recompute[1].categorySlug },
      { dryRun: false, categorySlug: 'instagram' },
    );

    const pricePreview = await callJson(api.base, '/api/admin/pricing/preview', {
      method: 'POST',
      token: 'good-token',
      body: { costMinor: 1000, markupPercent: 30 },
    });
    assert.equal(pricePreview.status, 200);
    assert.equal(pricePreview.body.data.preview.suggestedPriceMinor, 1300);

    const noCost = await callJson(api.base, '/api/admin/pricing/preview', { method: 'POST', token: 'good-token', body: {} });
    assert.equal(noCost.status, 422);
    assert.equal(noCost.body.error.code, 'VALIDATION_ERROR');
  } finally {
    await api.close();
  }
});

/* ── the real schema ────────────────────────────────────────────────────────────────────────── */

const suffix = randomUUID().slice(0, 8).toUpperCase();
let fixtures = null;
let dbApi = null;

/** Fixtures are created once and removed afterwards; the seeded catalogue is never touched. */
before(async () => {
  if (!hasDb) return;

  const { query, queryOne } = await import('../dist/lib/db.js');
  /** Catalogue slugs are lower-case by constraint; coupon codes must be upper-case. */
  const slug = (name) => `pricing-it-${name}-${suffix.toLowerCase()}`;

  const category = await queryOne(
    `insert into categories (name, name_ar, slug, sort_order, markup_percent)
     values ('Pricing IT', 'اختبار التسعير', $1, 900, 30) returning id`,
    [slug('cat')],
  );
  const plainCategory = await queryOne(
    `insert into categories (name, name_ar, slug, sort_order, markup_percent)
     values ('Pricing IT plain', 'اختبار التسعير 2', $1, 901, 0) returning id`,
    [slug('cat2')],
  );
  const user = await queryOne(
    `insert into users (firebase_uid, email, email_verified, status)
     values ($1, $2, true, 'active') returning id`,
    [slug('uid'), `${slug('user')}@example.test`],
  );

  const provider = await queryOne(
    `insert into providers (name, slug, adapter_key, base_url, is_active)
     values ('Pricing IT supplier', $1, 'panel', 'https://supplier.example.test/api', true) returning id`,
    [slug('provider')],
  );
  await query(
    `insert into provider_services (provider_id, provider_service_id, name, rate_minor, rate_currency)
     values ($1, 'fx-1', 'Supplier service (EGP)', 100000, 'EGP')`,
    [provider.id],
  );

  const services = await query(
    `insert into services
       (category_id, name, name_ar, slug, price_unit, price_minor, provider_cost_minor, markup_percent,
        min_quantity, max_quantity, input_type, is_active)
     values
       ($1, 'Priced per 1000', 'سعر لكل ألف',     $3, 'per_1000', 12000, 9000, null, 100, 50000, 'link', true),
       ($1, 'Recomputed next run', 'يُعاد تسعيره', $4, 'per_1000', 10000, 9000, null, 100, 50000, 'link', true),
       ($1, 'Unchanged markup', 'بدون تغيير',     $5, 'per_1000', 3000, 2000, 50, 100, 50000, 'link', true),
       ($1, 'Not on sale', 'متوقفة',              $6, 'per_1000', 5000, 4000, null, 100, 50000, 'link', false),
       ($1, 'No price yet', 'بدون سعر',           $7, 'per_1000', 0, 0, null, 100, 50000, 'link', true),
       ($2, 'Tiny per-item service', 'خدمة بالقطعة', $8, 'per_item', 1, 0, null, 1, 10, 'link', true),
       ($1, 'Manual price', 'سعر يدوي',           $9, 'per_1000', 7777, 0, null, 100, 50000, 'link', true),
       ($1, 'Foreign currency cost', 'عملة أخرى', $10, 'per_1000', 6000, 5000, null, 100, 50000, 'link', true)
     returning id, slug, price_minor, provider_cost_minor, markup_percent`,
    [
      category.id,
      plainCategory.id,
      slug('1000'),
      slug('recompute'),
      slug('unchanged'),
      slug('off'),
      slug('freeprice'),
      slug('tinyitem'),
      slug('manual'),
      slug('fx'),
    ],
  );

  const bySlug = Object.fromEntries(services.map((row) => [row.slug, row]));

  // the foreign-currency row is linked to the EGP supplier service
  await query('update services set provider_id = $2, provider_service_id = $3 where id = $1', [
    bySlug[slug('fx')].id,
    provider.id,
    'fx-1',
  ]);

  const variants = await query(
    `insert into service_variants (service_id, name, name_ar, price_minor, min_quantity, max_quantity, is_active)
     values ($1, 'Bulk', 'بكميات', 20000, 1000, 2000, true),
            ($1, 'Retired', 'قديم', 1, 1, 10, false)
     returning id, is_active`,
    [bySlug[slug('1000')].id],
  );

  const coupons = await query(
    `insert into coupons (code, type, percent_bp, amount_minor, max_discount_minor, min_order_minor, scope,
                          category_id, service_id, usage_limit, per_user_limit, used_count, starts_at, expires_at, is_active)
     values
       ($1,  'percent', 1000, null, 500,  0,      'all',      null, null, 10, 1, 0, null, null, true),
       ($2,  'percent', 1000, null, null, 0,      'all',      null, null, 10, 1, 0, null, now() - interval '1 day', true),
       ($3,  'percent', 1000, null, null, 0,      'all',      null, null, 10, 1, 0, now() + interval '1 day', null, true),
       ($4,  'fixed',   null, 200,  null, 0,      'service',  null, $10,  10, 1, 0, null, null, true),
       ($5,  'percent', 2000, null, null, 0,      'category', $11,  null, 10, 1, 0, null, null, true),
       ($6,  'percent', 1000, null, null, 0,      'all',      null, null, 5,  1, 5, null, null, true),
       ($7,  'percent', 1000, null, null, 100000, 'all',      null, null, 10, 1, 0, null, null, true),
       ($8,  'percent', 1000, null, null, 0,      'all',      null, null, 10, 1, 0, null, null, false),
       ($9,  'percent', 1000, null, null, 0,      'all',      null, null, 10, 1, 0, null, null, true)
     returning id, code, type`,
    [
      `PRIC10-${suffix}`,
      `PRICEXP-${suffix}`,
      `PRICFUT-${suffix}`,
      `PRICSVC-${suffix}`,
      `PRICCAT-${suffix}`,
      `PRICMAX-${suffix}`,
      `PRICMIN-${suffix}`,
      `PRICOFF-${suffix}`,
      `PRICUSED-${suffix}`,
      bySlug[slug('tinyitem')].id,
      category.id,
    ],
  );

  const usedCoupon = coupons.find((row) => row.code === `PRICUSED-${suffix}`);
  await query(
    'insert into coupon_redemptions (coupon_id, user_id, discount_minor) values ($1, $2, 100)',
    [usedCoupon.id, user.id],
  );

  fixtures = {
    slug,
    categoryId: category.id,
    plainCategoryId: plainCategory.id,
    userId: user.id,
    providerId: provider.id,
    service: bySlug,
    activeVariantId: variants.find((row) => row.is_active).id,
    retiredVariantId: variants.find((row) => !row.is_active).id,
    coupon: Object.fromEntries(coupons.map((row) => [row.code.replace(`-${suffix}`, ''), row])),
  };

  dbApi = await startApi({
    auth: authDeps({ permissions: ['services.view', 'services.edit'], user: { id: fixtures.userId } }),
    pricing: pricingDbDeps,
  });
});

after(async () => {
  if (dbApi) await dbApi.close();
  if (!hasDb || !fixtures) return;

  const { query } = await import('../dist/lib/db.js');
  const serviceIds = Object.values(fixtures.service).map((row) => row.id);
  const couponIds = Object.values(fixtures.coupon).map((row) => row.id);

  await query('delete from coupon_redemptions where coupon_id = any($1::uuid[])', [couponIds]);
  await query('delete from coupons where id = any($1::uuid[])', [couponIds]);
  await query('delete from service_variants where service_id = any($1::uuid[])', [serviceIds]);
  await query('delete from services where id = any($1::uuid[])', [serviceIds]);
  await query('delete from categories where id in ($1::uuid, $2::uuid)', [
    fixtures.categoryId,
    fixtures.plainCategoryId,
  ]);
  await query('delete from provider_services where provider_id = $1::uuid', [fixtures.providerId]);
  await query('delete from providers where id = $1::uuid', [fixtures.providerId]);
  await query('delete from users where id = $1::uuid', [fixtures.userId]);
});

test('the seeded settings are read with safe fallbacks', { skip: !hasDb }, async () => {
  const settings = await pricing.loadSettings();
  assert.equal(settings.currency, 'USD');
  assert.equal(settings.fallbackMarkupPercent, 30);
  assert.equal(settings.orderMinMinor, 10);
});

test('GET /api/pricing/services/:slug answers the customer price and never our cost', { skip: !hasDb }, async () => {
  const { status, body } = await callJson(dbApi.base, `/api/pricing/services/${fixtures.slug('1000')}`);

  assert.equal(status, 200);
  assert.equal(body.data.service.priceMinor, 12000);
  assert.equal(body.data.service.priceUnit, 'per_1000');
  assert.deepEqual(
    { min: body.data.service.minQuantity, max: body.data.service.maxQuantity },
    { min: 100, max: 50000 },
  );
  assert.equal(body.data.service.currency, 'USD');
  assert.equal(body.data.service.variants.length, 1, 'only the active variant is offered');
  assert.equal(body.data.service.variants[0].priceMinor, 20000);

  const payload = JSON.stringify(body);
  assert.equal(payload.includes('cost'), false, 'our supplier cost is not in the customer payload');
  assert.equal(payload.includes('provider'), false, 'no supplier reference in the customer payload');
});

test('a quote over HTTP against the real schema returns integer money that adds up', { skip: !hasDb }, async () => {
  const { status, body } = await callJson(dbApi.base, '/api/pricing/quote', {
    method: 'POST',
    body: { serviceSlug: fixtures.slug('1000'), quantity: 5000 },
  });

  assert.equal(status, 200);
  const quote = body.data.quote;
  assert.equal(quote.unitPriceMinor, 12000);
  assert.equal(quote.chargeMinor, 60000);
  assert.equal(quote.discountMinor, 0);
  assert.equal(quote.totalMinor, 60000);
  assert.equal(quote.quantity, 5000);
  assert.equal(quote.coupon, null);
  assert.equal(quote.limits.orderMinMinor, 10);
  assert.ok(Number.isInteger(quote.totalMinor) && Number.isInteger(quote.chargeMinor));
  assert.equal(JSON.stringify(body).includes('cost'), false);
});

test('the quantity range, an unknown service and a service that is off each answer their own code', { skip: !hasDb }, async () => {
  const outOfRange = await callJson(dbApi.base, '/api/pricing/quote', {
    method: 'POST',
    body: { serviceSlug: fixtures.slug('1000'), quantity: 50 },
  });
  assert.equal(outOfRange.status, 422);
  assert.equal(outOfRange.body.error.code, 'PRICING_QUANTITY_OUT_OF_RANGE');
  assert.deepEqual(
    { min: outOfRange.body.error.details.minQuantity, max: outOfRange.body.error.details.maxQuantity },
    { min: 100, max: 50000 },
  );
  assertCustomerSafe(outOfRange.body.error.message);

  const unknown = await callJson(dbApi.base, '/api/pricing/quote', {
    method: 'POST',
    body: { serviceSlug: `no-such-service-${suffix.toLowerCase()}`, quantity: 1000 },
  });
  assert.equal(unknown.status, 404);
  assert.equal(unknown.body.error.code, 'PRICING_SERVICE_NOT_FOUND');

  const off = await callJson(dbApi.base, '/api/pricing/quote', {
    method: 'POST',
    body: { serviceSlug: fixtures.slug('off'), quantity: 1000 },
  });
  assert.equal(off.status, 422);
  assert.equal(off.body.error.code, 'PRICING_SERVICE_UNAVAILABLE');
  assertCustomerSafe(off.body.error.message);

  const unpriced = await callJson(dbApi.base, '/api/pricing/quote', {
    method: 'POST',
    body: { serviceSlug: fixtures.slug('freeprice'), quantity: 1000 },
  });
  assert.equal(unpriced.status, 409);
  assert.equal(unpriced.body.error.code, 'PRICING_PRICE_UNAVAILABLE');
  assertCustomerSafe(unpriced.body.error.message);
});

test('a variant overrides the price and the range, and only if it belongs to the service', { skip: !hasDb }, async () => {
  const variant = await callJson(dbApi.base, '/api/pricing/quote', {
    method: 'POST',
    body: { serviceSlug: fixtures.slug('1000'), variantId: fixtures.activeVariantId, quantity: 2000 },
  });
  assert.equal(variant.status, 200);
  assert.equal(variant.body.data.quote.unitPriceMinor, 20000);
  assert.equal(variant.body.data.quote.chargeMinor, 40000);

  const outsideVariantRange = await callJson(dbApi.base, '/api/pricing/quote', {
    method: 'POST',
    body: { serviceSlug: fixtures.slug('1000'), variantId: fixtures.activeVariantId, quantity: 500 },
  });
  assert.equal(outsideVariantRange.status, 422);
  assert.equal(outsideVariantRange.body.error.code, 'PRICING_QUANTITY_OUT_OF_RANGE');
  assert.deepEqual(
    { min: outsideVariantRange.body.error.details.minQuantity, max: outsideVariantRange.body.error.details.maxQuantity },
    { min: 1000, max: 2000 },
  );

  const retired = await callJson(dbApi.base, '/api/pricing/quote', {
    method: 'POST',
    body: { serviceSlug: fixtures.slug('1000'), variantId: fixtures.retiredVariantId, quantity: 5 },
  });
  assert.equal(retired.status, 404);
  assert.equal(retired.body.error.code, 'PRICING_VARIANT_NOT_FOUND');

  const unknown = await callJson(dbApi.base, '/api/pricing/quote', {
    method: 'POST',
    body: { serviceSlug: fixtures.slug('1000'), variantId: randomUUID(), quantity: 5000 },
  });
  assert.equal(unknown.status, 404);
  assert.equal(unknown.body.error.code, 'PRICING_VARIANT_NOT_FOUND');
});

test('a percentage coupon is capped, applied to the charge and never crosses zero', { skip: !hasDb }, async () => {
  const { status, body } = await callJson(dbApi.base, '/api/pricing/quote', {
    method: 'POST',
    body: { serviceSlug: fixtures.slug('1000'), quantity: 5000, couponCode: `pric10-${suffix}`.toLowerCase() },
  });

  assert.equal(status, 200, 'a lower-case code is the same code');
  const quote = body.data.quote;
  assert.equal(quote.chargeMinor, 60000);
  assert.equal(quote.discountMinor, 500, '10% of 60000 is 6000, above the 500 cap');
  assert.equal(quote.totalMinor, 59500);
  assert.deepEqual(quote.coupon, { code: `PRIC10-${suffix}`, type: 'percent' });
  assert.equal(quote.couponCheckedForCustomer, false, 'nobody is signed in, so no per-customer count');

  const categoryCoupon = await callJson(dbApi.base, '/api/pricing/quote', {
    method: 'POST',
    body: { serviceSlug: fixtures.slug('1000'), quantity: 1000, couponCode: `PRICCAT-${suffix}` },
  });
  assert.equal(categoryCoupon.status, 200);
  assert.equal(categoryCoupon.body.data.quote.discountMinor, 2400); // 20% of 12000, from basis points
  assert.equal(categoryCoupon.body.data.quote.totalMinor, 9600);
});

test('an unusable coupon answers a different code for each reason', { skip: !hasDb }, async () => {
  const cases = [
    [`NO-SUCH-${suffix}`, 404, 'PRICING_COUPON_NOT_FOUND'],
    [`PRICOFF-${suffix}`, 404, 'PRICING_COUPON_NOT_FOUND'],
    [`PRICEXP-${suffix}`, 422, 'PRICING_COUPON_EXPIRED'],
    [`PRICFUT-${suffix}`, 422, 'PRICING_COUPON_EXPIRED'],
    [`PRICSVC-${suffix}`, 422, 'PRICING_COUPON_SCOPE_MISMATCH'],
    [`PRICMAX-${suffix}`, 409, 'PRICING_COUPON_USAGE_LIMIT'],
    [`PRICMIN-${suffix}`, 422, 'PRICING_COUPON_MIN_ORDER'],
  ];

  for (const [code, status, expected] of cases) {
    const { status: actualStatus, body } = await callJson(dbApi.base, '/api/pricing/quote', {
      method: 'POST',
      body: { serviceSlug: fixtures.slug('1000'), quantity: 5000, couponCode: code },
    });
    assert.equal(actualStatus, status, `${expected} should answer ${status}`);
    assert.equal(body.error.code, expected);
    assertCustomerSafe(body.error.message);
  }

  // the service-scoped coupon applies to the service it names
  const scoped = await callJson(dbApi.base, '/api/pricing/quote', {
    method: 'POST',
    body: { serviceSlug: fixtures.slug('tinyitem'), quantity: 10, couponCode: `PRICSVC-${suffix}` },
  });
  assert.equal(scoped.status, 200);
  assert.equal(scoped.body.data.quote.discountMinor, 10, 'the fixed discount is capped at the charge');
  assert.equal(scoped.body.data.quote.totalMinor, 0);
});

test('a coupon per-customer limit is enforced when a session is present, and never invented for one', { skip: !hasDb }, async () => {
  const code = `PRICUSED-${suffix}`;
  const first = await callJson(dbApi.base, '/api/pricing/quote', {
    method: 'POST',
    token: 'good-token',
    body: { serviceSlug: fixtures.slug('1000'), quantity: 5000, couponCode: code },
  });
  assert.equal(first.status, 409);
  assert.equal(first.body.error.code, 'PRICING_COUPON_ALREADY_USED');
  assertCustomerSafe(first.body.error.message);

  const authenticated = await callJson(dbApi.base, '/api/pricing/quote', {
    method: 'POST',
    token: 'good-token',
    body: { serviceSlug: fixtures.slug('1000'), quantity: 5000, couponCode: `PRIC10-${suffix}` },
  });
  assert.equal(authenticated.status, 200);
  assert.equal(authenticated.body.data.quote.couponCheckedForCustomer, true);
});

test('an order below the smallest amount we accept is refused before anything is charged', { skip: !hasDb }, async () => {
  const { status, body } = await callJson(dbApi.base, '/api/pricing/quote', {
    method: 'POST',
    body: { serviceSlug: fixtures.slug('tinyitem'), quantity: 1 },
  });

  assert.equal(status, 422);
  assert.equal(body.error.code, 'PRICING_ORDER_TOO_SMALL');
  assert.equal(body.error.details.orderMinMinor, 10);
  assert.equal(body.error.details.totalMinor, 1);
  assertCustomerSafe(body.error.message);
});

test('a recompute re-derives prices, reports its skips, and writes nothing else', { skip: !hasDb }, async () => {
  const { queryOne } = await import('../dist/lib/db.js');
  const target = fixtures.slug('recompute');
  const before = await queryOne(
    `select slug, price_minor, provider_cost_minor, markup_percent, markup_fixed_minor, min_quantity,
            max_quantity, is_active, provider_id, provider_service_id, updated_at
       from services where slug = $1`,
    [target],
  );

  const dryRun = await callJson(dbApi.base, '/api/admin/pricing/recompute', {
    method: 'POST',
    token: 'good-token',
    body: { dryRun: true, serviceSlug: target },
  });
  assert.equal(dryRun.status, 200);
  assert.equal(dryRun.body.data.summary.dryRun, true);
  assert.equal(dryRun.body.data.summary.changed, 1);
  assert.deepEqual(
    { previous: dryRun.body.data.summary.services[0].previousPriceMinor, next: dryRun.body.data.summary.services[0].priceMinor },
    { previous: 10000, next: 11700 },
  );

  const afterDryRun = await queryOne('select price_minor, updated_at from services where slug = $1', [target]);
  assert.equal(Number(afterDryRun.price_minor), 10000, 'a dry run must not write');
  assert.deepEqual(afterDryRun.updated_at, before.updated_at);

  const applied = await callJson(dbApi.base, '/api/admin/pricing/recompute', {
    method: 'POST',
    token: 'good-token',
    body: { dryRun: false, serviceSlug: target },
  });
  assert.equal(applied.status, 200);
  assert.equal(applied.body.data.summary.dryRun, false);
  assert.equal(applied.body.data.summary.changed, 1);
  assert.equal(applied.body.data.summary.services[0].markupSource, 'category');
  assert.equal(applied.body.data.summary.services[0].markupPercent, 30);

  const after = await queryOne('select * from services where slug = $1', [target]);
  assert.equal(Number(after.price_minor), 11700, '9000 + 30% = 11700');
  for (const column of [
    'provider_cost_minor',
    'markup_percent',
    'markup_fixed_minor',
    'min_quantity',
    'max_quantity',
    'is_active',
    'provider_id',
    'provider_service_id',
    'slug',
  ]) {
    assert.deepEqual(after[column], before[column], `a recompute must not touch ${column}`);
  }

  const again = await callJson(dbApi.base, '/api/admin/pricing/recompute', {
    method: 'POST',
    token: 'good-token',
    body: { dryRun: false, serviceSlug: target },
  });
  assert.equal(again.body.data.summary.changed, 0, 'a second run has nothing left to do');
  assert.equal(again.body.data.summary.services[0].skipped, 'unchanged');

  const unchanged = await callJson(dbApi.base, '/api/admin/pricing/recompute', {
    method: 'POST',
    token: 'good-token',
    body: { dryRun: true, serviceSlug: fixtures.slug('unchanged') },
  });
  assert.equal(unchanged.body.data.summary.changed, 0, '2000 + 50% is already the stored price');
});

test('a recompute leaves a manual price and a foreign-currency cost alone, and says which is which', { skip: !hasDb }, async () => {
  const { queryOne } = await import('../dist/lib/db.js');

  const report = await callJson(dbApi.base, '/api/admin/pricing/recompute', {
    method: 'POST',
    token: 'good-token',
    body: { dryRun: true, categorySlug: fixtures.slug('cat') },
  });
  assert.equal(report.status, 200);
  assert.equal(report.body.data.summary.dryRun, true);

  const manualRow = report.body.data.summary.services.find((row) => row.slug === fixtures.slug('manual'));
  assert.equal(manualRow.skipped, 'no-cost', 'a row with no supplier cost keeps the price an admin set');
  assert.equal(manualRow.changed, false);

  const fxRow = report.body.data.summary.services.find((row) => row.slug === fixtures.slug('fx'));
  assert.equal(fxRow.skipped, 'currency', 'another currency is never converted silently');
  assert.equal(fxRow.changed, false);
  assert.equal(report.body.data.summary.skippedNoPrice >= 1, true);
  assert.equal(report.body.data.summary.skippedCurrency >= 1, true);

  // the report is a report: nothing was written, not even for the rows it wanted to reprice
  const manualStored = await queryOne('select price_minor from services where slug = $1', [fixtures.slug('manual')]);
  assert.equal(Number(manualStored.price_minor), 7777);
  const fxStored = await queryOne('select price_minor from services where slug = $1', [fixtures.slug('fx')]);
  assert.equal(Number(fxStored.price_minor), 6000);
  const pricedStored = await queryOne('select price_minor from services where slug = $1', [fixtures.slug('1000')]);
  assert.equal(Number(pricedStored.price_minor), 12000, 'the admin price the customer already sees is untouched');
});

test('the admin margin view shows our cost and our margin for an operator only', { skip: !hasDb }, async () => {
  const { status, body } = await callJson(dbApi.base, `/api/admin/pricing/services/${fixtures.slug('1000')}`, {
    token: 'good-token',
  });

  assert.equal(status, 200);
  const view = body.data.pricing;
  assert.equal(view.costMinor, 9000);
  assert.equal(view.markupPercent, 30);
  assert.equal(view.markupSource, 'category');
  assert.equal(view.suggestedPriceMinor, 11700);
  assert.equal(view.marginMinor, 3000, '12000 − 9000');
  assert.equal(view.marginPercent, 25);
  assert.equal(view.variants.length, 1);
  assert.equal(view.variants[0].marginMinor, 11000, 'the variant price minus the same cost');

  const restrictedApi = await startApi({ auth: authDeps({ permissions: [] }), pricing: pricingDbDeps });
  try {
    const withoutPermission = await callJson(
      restrictedApi.base,
      `/api/admin/pricing/services/${fixtures.slug('1000')}`,
      { token: 'good-token' },
    );
    assert.equal(withoutPermission.status, 403);
    assert.equal(withoutPermission.body.error.code, 'FORBIDDEN');
  } finally {
    await restrictedApi.close();
  }
});

test('every code the suite saw is documented, and every pricing code is in both catalogues', () => {
  const doc = readFileSync(path.resolve(repoRoot, 'docs/ERROR_CODES.md'), 'utf8');
  const web = readFileSync(path.resolve(repoRoot, 'apps/web/src/i18n/error-codes.ts'), 'utf8');

  for (const code of observedCodes) {
    assert.ok(doc.includes(`\`${code}\``), `${code} was answered without a row in docs/ERROR_CODES.md`);
  }

  for (const code of PRICING_ERROR_CODES) {
    assert.ok(
      new RegExp(`\\| \`${code}\` \\|`).test(doc),
      `${code} is registered in the module but has no row in docs/ERROR_CODES.md`,
    );
    assert.ok(web.includes(`'${code}'`), `${code} is missing from the web catalogue (apps/web/src/i18n/error-codes.ts)`);
  }

  const expected = hasDb ? 10 : 4;
  assert.ok(observedCodes.size >= expected, `the suite exercised ${observedCodes.size} codes`);

  const shared = ['VALIDATION_ERROR', 'DB_UNAVAILABLE', 'TOKEN_INVALID', 'AUTH_REQUIRED', 'FORBIDDEN', 'NOT_FOUND', 'RATE_LIMITED'];
  for (const code of observedCodes) {
    assert.ok(
      PRICING_ERROR_CODES.includes(code) || shared.includes(code),
      `${code} is not one of the codes the pricing module may answer`,
    );
  }
});
