/**
 * Phase 7 — provider adapters, encrypted credentials and catalogue sync.
 *
 * Rules this suite follows:
 *  - no real network call, ever: every adapter is driven by an injected fetch (or a registered
 *    fake adapter), and the HTTP surface is exercised on a real socket with fake auth;
 *  - the module under test is the COMPILED file, built here with the project's own esbuild into
 *    dist/ exactly like the server build does;
 *  - every failure is asserted by its error CODE (not just its status), because clients translate
 *    by code;
 *  - database-backed tests run only when DATABASE_URL is set (they create and remove their own
 *    fixtures; the sync itself never deletes anything).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import express from 'express';

const here = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(here, '..');
const hasDb = Boolean(process.env.DATABASE_URL);

/** A deterministic data key for this run: 32 bytes, base64 (the documented shape). */
const TEST_KEY = Buffer.from('0123456789abcdef0123456789abcdef', 'utf8').toString('base64');
const TEST_KEY_HEX = Buffer.from('0123456789abcdef0123456789abcdef', 'utf8').toString('hex');
process.env.PROVIDER_ENCRYPTION_KEY = TEST_KEY;

// Same toolchain as the server build (apps/api/package.json), so tests import compiled output.
// One entry point, deliberately: `AppError` is a class, and two bundles would each carry their own
// copy, so the error handler must come from the same bundle as the module that throws.
await build({
  absWorkingDir: apiRoot,
  entryPoints: { providers: 'src/modules/providers/index.ts' },
  outdir: 'dist/test-providers',
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  logLevel: 'error',
});

const providers = await import('../dist/test-providers/providers.js');
const { errorHandler, notFoundHandler } = providers;

const {
  amountToMinor,
  createAdapterRegistry,
  createPanelAdapter,
  createProviderForAdmin,
  createProvidersModule,
  decryptCredential,
  encryptCredential,
  encryptionKeyConfigured,
  extractServiceItems,
  isEncryptedCredential,
  listProviderServices,
  publicProvider,
  readPath,
  redactMeta,
  redactText,
  redactUpstream,
  syncProviderServices,
  truncate,
} = providers;

/** The secret used by every fixture: if it ever shows up in a body or a log, the suite fails. */
const SECRET = 'panel-api-key-9f8a7b6c5d4e3f2a';
const OTHER_KEY = Buffer.alloc(32, 7);

const connection = (overrides = {}) => ({
  providerId: '00000000-0000-0000-0000-0000000000f1',
  slug: 'fixture-supplier',
  adapterKey: 'smm-panel',
  baseUrl: 'https://supplier.invalid/api/v2',
  credential: SECRET,
  currency: 'USD',
  config: {},
  ...overrides,
});

const json = (body, status = 200) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

/** Flips one byte of a stored envelope part, so the GCM tag no longer matches. */
const tamper = (stored, index) => {
  const parts = stored.split('.');
  const raw = Buffer.from(parts[index], 'base64url');
  raw[0] = raw[0] ^ 0xff;
  parts[index] = raw.toString('base64url');
  return parts.join('.');
};

const expectCode = (code, extra = {}) => (error) => {
  assert.equal(error.code, code, `expected ${code}, got ${error.code} (${error.message})`);
  for (const [key, value] of Object.entries(extra)) assert.deepEqual(error[key], value);
  return true;
};

const counts = (result) => ({
  fetched: result.fetched,
  created: result.created,
  updated: result.updated,
  deactivated: result.deactivated,
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// redaction
// ─────────────────────────────────────────────────────────────────────────────────────────────
test('redactText removes the credential itself, credential-shaped parameters and opaque tokens', () => {
  const text = [
    `POST https://supplier.invalid/api/v2 key=${SECRET}&action=services`,
    `{"api_key":"${SECRET}","balance":"12.34"}`,
    'authorization: Bearer abcdefghijklmnopqrstuvwxyz012345',
  ].join('\n');

  const out = redactText(text, { secrets: [SECRET] });

  assert.ok(!out.includes(SECRET), 'the credential must not survive redaction');
  assert.match(out, /key=\[redacted\]/);
  assert.match(out, /"api_key":"\[redacted\]"/);
  assert.ok(out.includes('12.34'), 'a balance is not a secret and stays readable');
  assert.ok(out.includes('Bearer [redacted]') || out.includes('authorization: [redacted]'));
});

test('redactText masks a credential shape even when the secret is not passed in', () => {
  const out = redactText('key=some-panel-key-1234567890&action=balance');
  assert.match(out, /key=\[redacted\]/);
  assert.ok(!out.includes('some-panel-key-1234567890'));
});

test('truncate and redactUpstream bound a runaway upstream body', () => {
  const body = `<html><body>${'<p>Supplier is busy, please retry shortly.</p>'.repeat(20)}</body></html>`;
  const out = redactUpstream(body, { secrets: [SECRET], limit: 60 });
  assert.ok(out.length < 200, 'the body is capped');
  assert.ok(out.includes('more characters'), 'truncation is explicit, never silent');
  assert.equal(truncate('short', 60), 'short');
  assert.equal(redactUpstream({ balance: '12.34', error: null }), '{"balance":"12.34","error":null}', 'an object body is rendered as text');
});

test('redactMeta blanks secret-named keys at any depth and keeps ordinary values', () => {
  const meta = redactMeta({
    provider: 'fixture-supplier',
    apiKey: SECRET,
    counts: { fetched: 3 },
    nested: { authorization: 'Bearer whatever-123456789', ok: true },
    raw: { service: 12, name: 'Followers' },
  });

  assert.equal(meta.provider, 'fixture-supplier');
  assert.deepEqual(meta.counts, { fetched: 3 });
  assert.equal(meta.apiKey, '[redacted]');
  assert.equal(meta.nested.authorization, '[redacted]');
  assert.equal(meta.nested.ok, true);
  assert.equal(meta.raw.name, 'Followers');
  assert.ok(!JSON.stringify(meta).includes(SECRET));
  assert.ok(!JSON.stringify(meta).includes('whatever-123456789'));
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// credential encryption
// ─────────────────────────────────────────────────────────────────────────────────────────────
test('a credential round-trips through AES-256-GCM with a fresh IV per record', () => {
  const first = encryptCredential(SECRET);
  const second = encryptCredential(SECRET);

  assert.ok(isEncryptedCredential(first));
  assert.ok(!first.includes(SECRET), 'the stored value must not contain the plaintext');
  assert.equal(decryptCredential(first), SECRET);
  assert.notEqual(first, second, 'a random IV per record means two encryptions differ');

  const [, iv, tag, ciphertext] = first.split('.');
  assert.equal(Buffer.from(iv, 'base64url').length, 12);
  assert.equal(Buffer.from(tag, 'base64url').length, 16);
  assert.ok(Buffer.from(ciphertext, 'base64url').length > 0);
});

test('a 64-character hex key is accepted as well as base64', () => {
  const saved = process.env.PROVIDER_ENCRYPTION_KEY;
  try {
    process.env.PROVIDER_ENCRYPTION_KEY = TEST_KEY_HEX;
    assert.equal(encryptionKeyConfigured(), true);
    assert.equal(decryptCredential(encryptCredential(SECRET)), SECRET);
  } finally {
    process.env.PROVIDER_ENCRYPTION_KEY = saved;
  }
});

test('a wrong key, a tampered ciphertext and a tampered tag all answer CREDENTIAL_UNREADABLE', () => {
  const stored = encryptCredential(SECRET);

  const attempts = [
    ['wrong key', () => decryptCredential(stored, { key: OTHER_KEY })],
    ['tampered ciphertext', () => decryptCredential(tamper(stored, 3))],
    ['tampered tag', () => decryptCredential(tamper(stored, 2))],
    ['truncated envelope', () => decryptCredential('v1.abc.def')],
    ['empty value', () => decryptCredential('')],
    ['not ours', () => decryptCredential('plain-text-key')],
  ];

  for (const [what, attempt] of attempts) {
    assert.throws(attempt, (error) => {
      assert.equal(error.code, 'CREDENTIAL_UNREADABLE', `${what} must answer CREDENTIAL_UNREADABLE`);
      assert.equal(error.status, 500);
      assert.ok(!error.message.includes(SECRET), 'the message never echoes the credential');
      assert.ok(!/\bat \w/.test(error.message), 'the message carries no stack trace');
      assert.ok(!error.message.includes(stored), 'the message never echoes the ciphertext');
      return true;
    }, what);
  }

  // a value encrypted with a key the server does not hold decrypts only with that key
  assert.equal(decryptCredential(encryptCredential(SECRET, { key: OTHER_KEY }), { key: OTHER_KEY }), SECRET);
  assert.throws(
    () => decryptCredential(encryptCredential(SECRET, { key: OTHER_KEY })),
    expectCode('CREDENTIAL_UNREADABLE'),
  );
});

test('a missing or malformed server key answers CREDENTIAL_ENCRYPTION_UNAVAILABLE', () => {
  const saved = process.env.PROVIDER_ENCRYPTION_KEY;
  try {
    delete process.env.PROVIDER_ENCRYPTION_KEY;
    assert.equal(encryptionKeyConfigured(), false);
    assert.throws(() => encryptCredential(SECRET), expectCode('CREDENTIAL_ENCRYPTION_UNAVAILABLE', { status: 503 }));

    process.env.PROVIDER_ENCRYPTION_KEY = 'too-short';
    assert.throws(() => encryptCredential(SECRET), expectCode('CREDENTIAL_ENCRYPTION_UNAVAILABLE', { status: 503 }));

    assert.throws(() => encryptCredential(''), expectCode('CREDENTIAL_INVALID'));
  } finally {
    process.env.PROVIDER_ENCRYPTION_KEY = saved;
  }
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// the panel adapter — mapping, capability checks, every upstream failure shape
// ─────────────────────────────────────────────────────────────────────────────────────────────
test('a service list is mapped onto our columns, money included, and the key travels only in the body', async () => {
  const requests = [];
  const adapter = createPanelAdapter(
    connection({
      fetchImpl: async (url, init) => {
        requests.push({ url, body: new URLSearchParams(init.body), method: init.method });
        return json({
          services: [
            { service: 101, name: 'Followers', type: 'Default', rate: '12.34', min: '100', max: '10000', refill: true, cancel: false, dripfeed: 0 },
            { service: 202, name: 'Likes', type: 'Custom', rate: 0.5, min: 10, max: 0, refill: 'yes', cancel: '1' },
          ],
        });
      },
      config: { mapping: { servicesPath: 'services' } },
    }),
  );

  const services = await adapter.listServices();

  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, 'POST');
  assert.equal(requests[0].url, 'https://supplier.invalid/api/v2');
  assert.ok(!requests[0].url.includes(SECRET), 'the credential never appears in a URL');
  assert.equal(requests[0].body.get('key'), SECRET, 'the credential travels in the form body');
  assert.equal(requests[0].body.get('action'), 'services');

  assert.equal(services.length, 2);
  assert.equal(services[0].externalServiceId, '101');
  assert.equal(services[0].name, 'Followers');
  assert.equal(services[0].type, 'Default');
  assert.equal(services[0].rateMinor, 1234, '12.34 in minor units, without a float multiply');
  assert.equal(services[0].rateCurrency, 'USD');
  assert.equal(services[0].minQuantity, 100);
  assert.equal(services[0].maxQuantity, 10000);
  assert.equal(services[0].supportsRefill, true);
  assert.equal(services[0].supportsCancel, false);
  assert.equal(services[0].supportsDripFeed, false);
  assert.equal(services[0].raw.service, 101, 'the supplier object is kept verbatim for support');

  assert.equal(services[1].rateMinor, 50);
  assert.equal(services[1].supportsRefill, true, '"yes" counts as true');
  assert.equal(services[1].supportsCancel, true, '"1" counts as true');
  assert.equal(services[1].maxQuantity, 0);
});

test('a supplier that only lists services is representable and the caller can check first', async () => {
  const adapter = createPanelAdapter(
    connection({
      fetchImpl: async () => json({ services: [] }),
      config: { actions: { balance: '', add: '', status: '', cancel: '' } },
    }),
  );

  assert.deepEqual([...adapter.capabilities], ['services']);
  assert.equal(adapter.supports('services'), true);
  assert.equal(adapter.supports('balance'), false);
  assert.equal(adapter.supports('order.create'), false);

  await assert.rejects(
    () => adapter.balance(),
    expectCode('PROVIDER_CAPABILITY_UNSUPPORTED', { status: 501 }),
    'an unsupported action is a clear code, never a crash',
  );
  await assert.rejects(
    () => adapter.createOrder({ externalServiceId: '1', link: 'https://example.invalid/p', quantity: 10 }),
    expectCode('PROVIDER_CAPABILITY_UNSUPPORTED'),
  );
  await assert.rejects(() => adapter.cancelOrder('42'), expectCode('PROVIDER_CAPABILITY_UNSUPPORTED'));
});

test('capabilities are derived from the configured actions and mapping, not from a vendor default', () => {
  const full = createPanelAdapter(connection({ fetchImpl: async () => json({}) }));
  assert.deepEqual(
    [...full.capabilities].sort(),
    ['balance', 'order.cancel', 'order.create', 'order.status', 'services'],
  );

  const noCancel = createPanelAdapter(
    connection({ fetchImpl: async () => json({}), config: { mapping: { orderStatusField: '' } } }),
  );
  assert.equal(noCancel.supports('order.status'), false);
  assert.equal(noCancel.supports('order.create'), true);

  const explicit = createPanelAdapter(
    connection({ fetchImpl: async () => json({}), config: { capabilities: ['services'] } }),
  );
  assert.deepEqual([...explicit.capabilities], ['services']);
});

test('every action name, parameter name, extra parameter and field mapping is configurable', async () => {
  const bodies = [];
  const adapter = createPanelAdapter(
    connection({
      fetchImpl: async (_url, init) => {
        bodies.push(new URLSearchParams(init.body));
        return json({
          data: {
            items: {
              7: { id: 7, title: 'Views', price_per_1000: 250, qty_min: 10, qty_max: 5000, refill_on: 'yes', cancel_on: 1, drip: '1' },
            },
          },
        });
      },
      config: {
        actions: { services: 'catalogue.list' },
        params: { key: 'api_token', action: 'cmd' },
        extraParams: { format: 'json' },
        minorExponent: 0,
        mapping: {
          servicesPath: 'data.items',
          serviceIdField: 'id',
          serviceNameField: 'title',
          rateField: 'price_per_1000',
          minField: 'qty_min',
          maxField: 'qty_max',
          refillField: 'refill_on',
          cancelField: 'cancel_on',
          dripFeedField: 'drip',
        },
      },
    }),
  );

  const services = await adapter.listServices();

  assert.equal(bodies[0].get('api_token'), SECRET);
  assert.equal(bodies[0].get('cmd'), 'catalogue.list');
  assert.equal(bodies[0].get('format'), 'json');
  assert.equal(optionsOf(bodies[0]).includes('key'), false, 'no default parameter name is sent');

  assert.equal(services.length, 1, 'an object keyed by service id is understood too');
  assert.equal(services[0].externalServiceId, '7');
  assert.equal(services[0].name, 'Views');
  assert.equal(services[0].rateMinor, 250, 'minorExponent 0 means the price is already minor units');
  assert.equal(services[0].minQuantity, 10);
  assert.equal(services[0].supportsDripFeed, true);
});

function optionsOf(params) {
  return [...params.keys()];
}

test('readPath, extractServiceItems and amountToMinor handle the shapes panels actually send', () => {
  assert.equal(readPath({ a: { b: [{ c: 5 }] } }, 'a.b.0.c'), 5);
  assert.equal(readPath({ a: 1 }, 'a.missing'), undefined);
  assert.equal(readPath({ a: 1 }, ''), undefined);

  assert.deepEqual(extractServiceItems([{ id: 1 }], ''), [{ id: 1 }]);
  assert.deepEqual(extractServiceItems({ services: [{ id: 1 }] }, 'services'), [{ id: 1 }]);
  assert.deepEqual(
    extractServiceItems({ status: 'ok', services: [{ id: 1 }] }, ''),
    [{ id: 1 }],
    'the one-array-plus-scalars answer needs no configuration',
  );
  assert.deepEqual(extractServiceItems({ 1: { id: 1 }, 2: { id: 2 } }, ''), [{ id: 1 }, { id: 2 }]);
  assert.equal(extractServiceItems({ error: 'nope' }, 'services'), null);
  assert.equal(extractServiceItems({ error: 'nope' }, ''), null);
  assert.equal(extractServiceItems('text', ''), null);

  assert.equal(amountToMinor('12.34', 2), 1234);
  assert.equal(amountToMinor('12.345', 2), 1235);
  assert.equal(amountToMinor(250, 0), 250);
  assert.equal(amountToMinor('', 2), null);
  assert.equal(amountToMinor('not a price', 2), null);
});

test('an HTTP 500 from the supplier answers PROVIDER_HTTP_ERROR and nothing is invented', async () => {
  const adapter = createPanelAdapter(connection({ fetchImpl: async () => json({ error: 'boom' }, 500) }));
  await assert.rejects(
    () => adapter.listServices(),
    expectCode('PROVIDER_HTTP_ERROR', { status: 502, details: { action: 'services', supplierStatus: 500 } }),
  );
});

test('HTTP 401 and 429 answer PROVIDER_AUTH_FAILED and PROVIDER_RATE_LIMITED', async () => {
  const unauthorized = createPanelAdapter(connection({ fetchImpl: async () => json({}, 401) }));
  await assert.rejects(() => unauthorized.listServices(), expectCode('PROVIDER_AUTH_FAILED', { status: 502 }));

  const rateLimited = createPanelAdapter(connection({ fetchImpl: async () => json({}, 429) }));
  await assert.rejects(() => rateLimited.listServices(), expectCode('PROVIDER_RATE_LIMITED', { status: 503 }));
});

test('an unreachable host answers PROVIDER_UNREACHABLE (never a driver message)', async () => {
  const adapter = createPanelAdapter(
    connection({
      fetchImpl: async () => {
        throw Object.assign(new Error('getaddrinfo ENOTFOUND supplier.invalid'), { name: 'TypeError' });
      },
    }),
  );

  await assert.rejects(
    () => adapter.listServices(),
    (error) => {
      assert.equal(error.code, 'PROVIDER_UNREACHABLE');
      assert.equal(error.status, 502);
      assert.ok(!error.message.includes('ENOTFOUND'), 'no driver text reaches the customer');
      return true;
    },
  );
});

test('a supplier that never answers answers PROVIDER_TIMEOUT through the abort path', async () => {
  let aborted = false;
  const adapter = createPanelAdapter(
    connection({
      config: { timeoutMs: 60 },
      fetchImpl: (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => {
            aborted = true;
            reject(Object.assign(new Error('This operation was aborted'), { name: 'AbortError' }));
          });
        }),
    }),
  );

  await assert.rejects(() => adapter.listServices(), expectCode('PROVIDER_TIMEOUT', { status: 504 }));
  assert.equal(aborted, true, 'the request was actually aborted, not left hanging');
});

test('a non-JSON body answers PROVIDER_BAD_RESPONSE and an empty body PROVIDER_EMPTY_RESPONSE', async () => {
  const html = createPanelAdapter(
    connection({ fetchImpl: async () => new Response('<html><body>502 Bad Gateway</body></html>', { status: 200 }) }),
  );
  await assert.rejects(() => html.listServices(), expectCode('PROVIDER_BAD_RESPONSE', { status: 502 }));

  const empty = createPanelAdapter(connection({ fetchImpl: async () => new Response('   ', { status: 200 }) }));
  await assert.rejects(() => empty.listServices(), expectCode('PROVIDER_EMPTY_RESPONSE', { status: 502 }));
});

test('an error message inside a 200 body becomes a code, and the credential never leaks', async () => {
  const logs = [];
  const logger = {
    debug: (message, meta) => logs.push([message, meta]),
    info: (message, meta) => logs.push([message, meta]),
    warn: (message, meta) => logs.push([message, meta]),
    error: (message, meta) => logs.push([message, meta]),
  };

  const authFailure = createPanelAdapter(
    connection({
      logger,
      fetchImpl: async () => json({ error: `Incorrect API key: ${SECRET}` }),
    }),
  );

  await assert.rejects(
    () => authFailure.listServices(),
    (error) => {
      assert.equal(error.code, 'PROVIDER_AUTH_FAILED', 'a rejected key is an auth failure, not a generic 500');
      assert.equal(error.status, 502);
      assert.ok(!JSON.stringify(error).includes(SECRET), 'the credential is not in the error');
      assert.ok(!JSON.stringify(error).includes('Incorrect API key'), 'the supplier text is not in the error');
      return true;
    },
  );

  const rejected = createPanelAdapter(
    connection({ logger, fetchImpl: async () => json({ error: 'Quantity is too small for this service' }) }),
  );
  await assert.rejects(() => rejected.createOrder({ externalServiceId: '1', link: 'x', quantity: 1 }), (error) => {
    assert.equal(error.code, 'PROVIDER_REJECTED');
    assert.deepEqual(error.details, { action: 'add' });
    return true;
  });

  const serialised = JSON.stringify(logs);
  assert.ok(serialised.includes('[redacted]'), 'the log line records that something was redacted');
  assert.ok(!serialised.includes(SECRET), 'no log line contains the credential');
  assert.ok(
    serialised.includes('Incorrect API key'), // the operator still needs the supplier's reason, server-side only
    'the supplier reason is kept server-side for an operator',
  );
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// registry — a second supplier shape is one registration, and unknown keys are a code
// ─────────────────────────────────────────────────────────────────────────────────────────────
test('the registry selects an adapter by key and refuses an unknown one with a code', () => {
  const registry = createAdapterRegistry();
  assert.deepEqual(registry.keys(), ['smm-panel']);
  assert.equal(registry.has('smm-panel'), true);

  const adapter = registry.create(connection());
  assert.equal(adapter.key, 'smm-panel');
  assert.equal(adapter.supports('balance'), true);

  const custom = createAdapterRegistry({ 'another-shape': () => ({ ...adapter, key: 'another-shape' }) });
  assert.deepEqual(custom.keys(), ['another-shape', 'smm-panel']);
  assert.equal(custom.create(connection({ adapterKey: 'another-shape' })).key, 'another-shape');

  assert.throws(
    () => registry.create(connection({ adapterKey: 'not-registered' })),
    expectCode('PROVIDER_ADAPTER_UNKNOWN', { status: 422 }),
  );
});

test('a supplier with no API address is refused before any call is made', () => {
  let called = false;
  assert.throws(
    () =>
      createPanelAdapter(
        connection({
          baseUrl: null,
          fetchImpl: async () => {
            called = true;
            return json({});
          },
        }),
      ),
    expectCode('PROVIDER_NOT_CONFIGURED', { status: 422 }),
  );
  assert.equal(called, false, 'nothing was sent anywhere');

  assert.throws(() => createPanelAdapter(connection({ baseUrl: 'ftp://supplier.invalid' })), expectCode('PROVIDER_NOT_CONFIGURED'));
  assert.throws(() => createPanelAdapter(connection({ baseUrl: 'not a url' })), expectCode('PROVIDER_NOT_CONFIGURED'));
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// the HTTP surface (fake auth, real Express, no database needed)
// ─────────────────────────────────────────────────────────────────────────────────────────────
const fakeUser = {
  id: '00000000-0000-0000-0000-0000000000ad',
  firebase_uid: 'providers-admin',
  email: 'admin@example.test',
  email_verified: true,
  display_name: 'Admin',
  avatar_url: null,
  referral_code: null,
  status: 'active',
  created_at: new Date().toISOString(),
};

const fakeAuth = (permissions, user = fakeUser) => ({
  verifyIdToken: async () => ({ uid: user.firebase_uid, email: user.email, emailVerified: true }),
  findOrProvisionUser: async () => user,
  loadAccess: async () => ({ roles: permissions.includes('providers.manage') ? ['admin'] : ['customer'], permissions }),
  loadWallet: async () => ({ balanceMinor: 0, currency: 'USD' }),
});

async function startServer(deps) {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/providers', createProvidersModule(deps).router);
  app.use(notFoundHandler);
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

const call = (url, body, token = 'test') =>
  fetch(url, {
    method: 'POST',
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });

const getJson = (url, token = 'test') =>
  fetch(url, { headers: token ? { authorization: `Bearer ${token}` } : {} }).then(async (res) => ({
    status: res.status,
    body: await res.json(),
  }));

test('the admin routes refuse an anonymous caller and a reader without the manage permission', async () => {
  const { url, close } = await startServer({ auth: fakeAuth(['providers.view']) });
  try {
    const anonymousList = await fetch(`${url}/api/admin/providers`);
    assert.equal(anonymousList.status, 401);
    assert.equal((await anonymousList.json()).error.code, 'AUTH_REQUIRED');

    const anonymousCreate = await call(`${url}/api/admin/providers`, { name: 'x', slug: 'x-y', adapterKey: 'smm-panel' }, null);
    assert.equal(anonymousCreate.status, 401);
    assert.equal((await anonymousCreate.json()).error.code, 'AUTH_REQUIRED');

    // providers.view is not enough to create, sync or deactivate
    for (const [path, method] of [
      ['/api/admin/providers', 'POST'],
      ['/api/admin/providers/00000000-0000-0000-0000-000000000001/sync', 'POST'],
      ['/api/admin/providers/00000000-0000-0000-0000-000000000001/deactivate', 'POST'],
    ]) {
      const res = await fetch(`${url}${path}`, {
        method,
        headers: { authorization: 'Bearer test', 'content-type': 'application/json' },
        body: '{}',
      });
      assert.equal(res.status, 403, `${method} ${path} must need providers.manage`);
      assert.equal((await res.json()).error.code, 'FORBIDDEN');
    }
  } finally {
    await close();
  }
});

test('the read routes answer with the envelope and validate their input', async () => {
  const { url, close } = await startServer({ auth: fakeAuth(['providers.view', 'providers.manage']) });
  try {
    // without a database the list answers a documented 503 instead of an anonymous 500 with a ref
    const list = await getJson(`${url}/api/admin/providers`);
    assert.equal(list.status, hasDb ? 200 : 503);
    if (!hasDb) assert.equal(list.body.error.code, 'DB_UNAVAILABLE');

    const badQuery = await getJson(`${url}/api/admin/providers?includeInactive=maybe`);
    assert.equal(badQuery.status, 422);
    assert.equal(badQuery.body.error.code, 'VALIDATION_ERROR');

    const badId = await getJson(`${url}/api/admin/providers/not-a-uuid`);
    assert.equal(badId.status, 422);
    assert.equal(badId.body.error.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(badId.body.error.details.fields));

    const badBody = await call(`${url}/api/admin/providers`, { name: 'x' });
    assert.equal(badBody.status, 422);
    const badBodyJson = await badBody.json();
    assert.equal(badBodyJson.error.code, 'VALIDATION_ERROR');
    assert.ok(badBodyJson.error.details.fields.some((field) => field.field === 'slug'));

    const badAdapter = await call(
      `${url}/api/admin/providers`,
      { name: 'Fixture', slug: 'fixture-supplier-1', adapterKey: 'not-registered', credential: SECRET },
    );
    assert.equal(badAdapter.status, 422);
    assert.equal((await badAdapter.json()).error.code, 'PROVIDER_ADAPTER_UNKNOWN');

    const badSlugFormat = await call(
      `${url}/api/admin/providers`,
      { name: 'Fixture', slug: 'Not A Slug', adapterKey: 'smm-panel' },
    );
    assert.equal(badSlugFormat.status, 422);
    assert.equal((await badSlugFormat.json()).error.code, 'VALIDATION_ERROR');

    const emptyUpdate = await fetch(`${url}/api/admin/providers/00000000-0000-0000-0000-000000000001`, {
      method: 'PATCH',
      headers: { authorization: 'Bearer test', 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(emptyUpdate.status, 422);
    assert.equal((await emptyUpdate.json()).error.code, 'VALIDATION_ERROR');
  } finally {
    await close();
  }
});

test('creating a supplier without a server encryption key answers CREDENTIAL_ENCRYPTION_UNAVAILABLE', async () => {
  const { url, close } = await startServer({ auth: fakeAuth(['providers.manage']) });
  const saved = process.env.PROVIDER_ENCRYPTION_KEY;
  try {
    delete process.env.PROVIDER_ENCRYPTION_KEY;
    const res = await call(`${url}/api/admin/providers`, {
      name: 'Fixture supplier',
      slug: `fixture-${randomUUID().slice(0, 8)}`,
      adapterKey: 'smm-panel',
      baseUrl: 'https://supplier.invalid/api/v2',
      credential: SECRET,
    });
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.error.code, 'CREDENTIAL_ENCRYPTION_UNAVAILABLE');
    assert.ok(!JSON.stringify(body).includes(SECRET));
    assert.equal(body.error.ref, undefined, 'a known failure is not an anonymous 500 with a reference');
  } finally {
    process.env.PROVIDER_ENCRYPTION_KEY = saved;
    await close();
  }
});

test('the module builds a public provider shape without the credential', () => {
  const row = {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Fixture supplier',
    slug: 'fixture-supplier',
    adapter_key: 'smm-panel',
    base_url: 'https://supplier.invalid/api/v2',
    credentials_encrypted: encryptCredential(SECRET),
    adapter_config: { params: { key: 'api_token' }, extraParams: { token: 'something-sensitive-1234567890' } },
    is_active: true,
    priority: 100,
    balance_minor: '12345',
    balance_currency: 'USD',
    last_sync_at: null,
    last_sync_status: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  const shaped = publicProvider(row, { serviceCount: 4 });

  assert.equal(shaped.hasCredential, true);
  assert.equal(shaped.balanceMinor, 12345, 'a bigint column becomes a number, never a string');
  assert.equal(shaped.serviceCount, 4);
  assert.equal(JSON.stringify(shaped).includes(SECRET), false);
  assert.equal(JSON.stringify(shaped).includes('something-sensitive-1234567890'), false, 'secret-shaped config is masked');
  assert.equal(shaped.adapterConfig.extraParams.token, '[redacted]');
  assert.equal(
    shaped.adapterConfig.params.key,
    'api_token',
    'a parameter NAME is configuration, not a secret, so it survives',
  );
});

test('every code this module can answer with is documented', async () => {
  const fs = await import('node:fs/promises');
  const doc = await fs.readFile(path.resolve(apiRoot, '../../docs/ERROR_CODES.md'), 'utf8');

  for (const code of providers.PROVIDER_ERROR_CODES) {
    assert.ok(doc.includes(`\`${code}\``), `${code} must appear in docs/ERROR_CODES.md`);
  }
  assert.equal(new Set(providers.PROVIDER_ERROR_CODES).size, providers.PROVIDER_ERROR_CODES.length, 'no duplicates');
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// database-backed: the schema is the contract
// ─────────────────────────────────────────────────────────────────────────────────────────────
test('the permission keys this module guards exist in the database and belong to admin', { skip: !hasDb }, async () => {
  const { query } = await import('../dist/lib/db.js');
  const rows = await query(
    `select p.key,
            exists(
              select 1 from role_permissions rp
                join roles r on r.id = rp.role_id
               where rp.permission_id = p.id and r.key = 'admin'
            ) as granted_to_admin
       from permissions p
      where p.key = any($1::text[])
      order by p.key`,
    [['providers.view', 'providers.manage']],
  );

  assert.deepEqual(rows.map((row) => row.key), ['providers.manage', 'providers.view']);
  assert.ok(rows.every((row) => row.granted_to_admin === true), 'admin holds both keys');
});

test('a stored credential is encrypted at rest, unreadable to SQL, and the audit row has no secret', { skip: !hasDb }, async () => {
  const { query, queryOne } = await import('../dist/lib/db.js');
  const slug = `fixture-cred-${randomUUID().slice(0, 8)}`;

  const provider = await createProviderForAdmin({
    name: 'Fixture supplier',
    slug,
    adapterKey: 'smm-panel',
    baseUrl: 'https://supplier.invalid/api/v2',
    credential: SECRET,
    priority: 10,
    currency: 'USD',
  });

  try {
    assert.equal(provider.hasCredential, true);
    assert.equal(JSON.stringify(provider).includes(SECRET), false);

    const stored = await queryOne('select credentials_encrypted from providers where id = $1', [provider.id]);
    assert.ok(isEncryptedCredential(stored.credentials_encrypted));
    assert.equal(stored.credentials_encrypted.includes(SECRET), false, 'no plaintext at rest');
    assert.equal(decryptCredential(stored.credentials_encrypted), SECRET, 'and it is recoverable with the key');
    assert.throws(
      () => decryptCredential(stored.credentials_encrypted, { key: OTHER_KEY }),
      expectCode('CREDENTIAL_UNREADABLE'),
    );

    const audit = await query(
      `select action, new_value from audit_logs
        where entity_type = 'provider' and entity_id = $1
        order by id desc limit 1`,
      [provider.id],
    );
    assert.equal(audit.length, 1);
    assert.equal(audit[0].action, 'PROVIDER_CREATE');
    assert.equal(JSON.stringify(audit[0].new_value).includes(SECRET), false);
    assert.equal(audit[0].new_value.credentialStored, true, 'the audit records that a key exists, not what it is');

    await assert.rejects(
      () =>
        createProviderForAdmin({
          name: 'Fixture supplier duplicate',
          slug,
          adapterKey: 'smm-panel',
          credential: SECRET,
        }),
      expectCode('PROVIDER_SLUG_TAKEN', { status: 409 }),
      'a duplicate short name is refused with a code instead of a driver error',
    );
  } finally {
    await query('delete from providers where slug like $1', [`${slug}%`]);
  }
});

test('the sync upserts on (provider_id, provider_service_id), never deletes and never touches pricing', { skip: !hasDb }, async () => {
  const { query, queryOne } = await import('../dist/lib/db.js');
  const slug = `fixture-sync-${randomUUID().slice(0, 8)}`;

  const provider = await createProviderForAdmin({
    name: 'Fixture sync supplier',
    slug,
    adapterKey: 'smm-panel',
    baseUrl: 'https://supplier.invalid/api/v2',
    credential: SECRET,
    currency: 'USD',
  });

  const payload = (secondService) => ({
    services: [
      {
        service: '1',
        name: 'Service One',
        type: 'default',
        rate: '1.50',
        min: '10',
        max: '1000',
        refill: true,
        cancel: false,
      },
      ...(secondService
        ? [{ service: '2', name: 'Service Two', type: 'default', rate: '2.00', min: '5', max: '500' }]
        : []),
    ],
  });

  const fetchFor = (body) => async (_url, init) => {
    const params = new URLSearchParams(init.body);
    return json(params.get('action') === 'services' ? body : {});
  };

  try {
    const activeFlag = await providers.hasProviderServiceActiveFlag();
    const pricingBefore = await query('select slug, price_minor, markup_percent from services order by slug');

    const first = await syncProviderServices(
      { providerId: provider.id },
      { fetchImpl: fetchFor(payload(true)) },
    );
    assert.deepEqual(counts(first), { fetched: 2, created: 2, updated: 0, deactivated: 0 });
    assert.equal(first.skipped, 0);
    assert.equal(
      first.deactivationMode,
      activeFlag ? 'flag' : 'fetched_at',
      'the run reports which deactivation signal the schema allowed',
    );

    const second = await queryOne(
      `select id, created_at, fetched_at, rate_minor, name, min_quantity, max_quantity, supports_refill, raw
         from provider_services where provider_id = $1 and provider_service_id = '2'`,
      [provider.id],
    );
    assert.equal(Number(second.rate_minor), 200, 'the supplier rate is stored in minor units');
    assert.equal(second.name, 'Service Two');
    assert.equal(second.supports_refill, false);
    assert.equal(second.raw.service, '2', 'the raw snapshot is kept');

    // ---- one service disappears, the other is renamed and re-rated
    const renamed = payload(false).services[0];
    const renamedPayload = { services: [{ ...renamed, name: 'Service One (renamed)', rate: '1.75' }] };

    const secondRun = await syncProviderServices(
      { providerId: provider.id },
      { fetchImpl: fetchFor(renamedPayload) },
    );
    assert.deepEqual(counts(secondRun), { fetched: 1, created: 0, updated: 1, deactivated: 1 });

    const kept = await queryOne(
      `select id, created_at, fetched_at, rate_minor, name from provider_services
        where provider_id = $1 and provider_service_id = '2'`,
      [provider.id],
    );
    assert.ok(kept, 'the disappeared service row is still there — rows are never deleted');
    assert.equal(kept.id, second.id);
    assert.equal(
      new Date(kept.created_at).toISOString(),
      new Date(second.created_at).toISOString(),
      'created_at is local history and is never rewritten by a sync',
    );

    if (secondRun.deactivationMode === 'flag') {
      const flagged = await queryOne('select is_active from provider_services where id = $1', [kept.id]);
      assert.equal(flagged.is_active, false, 'the row is marked inactive when the column exists');
    } else {
      assert.equal(
        new Date(kept.fetched_at).toISOString(),
        new Date(second.fetched_at).toISOString(),
        'without is_active the schema signal is fetched_at: it is not refreshed, so the row is provably gone',
      );
    }

    const updated = await queryOne(
      `select rate_minor, name from provider_services where provider_id = $1 and provider_service_id = '1'`,
      [provider.id],
    );
    assert.equal(Number(updated.rate_minor), 175);
    assert.equal(updated.name, 'Service One (renamed)', 'a renamed supplier service is updated in place');

    // ---- a third identical run must not report the same disappearance twice
    const thirdRun = await syncProviderServices(
      { providerId: provider.id },
      { fetchImpl: fetchFor(renamedPayload) },
    );
    assert.equal(thirdRun.deactivated, 0, 'a disappearance is reported once');
    assert.deepEqual(counts(thirdRun), { fetched: 1, created: 0, updated: 1, deactivated: 0 });

    const rows = await queryOne(
      'select count(*)::int as total from provider_services where provider_id = $1',
      [provider.id],
    );
    assert.equal(rows.total, 2, 'three syncs later, still exactly two rows: nothing was deleted');

    const logs = await query(
      `select status, added_count, updated_count, disabled_count
         from provider_sync_logs where provider_id = $1 order by id`,
      [provider.id],
    );
    assert.deepEqual(logs.map((log) => log.status), ['completed', 'completed', 'completed']);
    assert.deepEqual(
      logs.map((log) => [log.added_count, log.updated_count, log.disabled_count]),
      [
        [2, 0, 0],
        [0, 1, 1],
        [0, 1, 0],
      ],
    );

    const providerRow = await queryOne('select last_sync_status, last_sync_at from providers where id = $1', [
      provider.id,
    ]);
    assert.equal(providerRow.last_sync_status, 'completed');
    assert.ok(providerRow.last_sync_at);

    const pricingAfter = await query('select slug, price_minor, markup_percent from services order by slug');
    assert.deepEqual(pricingAfter, pricingBefore, 'pricing and markup are untouched by a sync');

    // ---- an empty answer must not deactivate the whole catalogue
    const emptyRun = await syncProviderServices(
      { providerId: provider.id },
      { fetchImpl: fetchFor({ services: [] }) },
    );
    assert.deepEqual(counts(emptyRun), { fetched: 0, created: 0, updated: 0, deactivated: 0 });
    assert.match(emptyRun.message, /returned no services/i);
    const stillTwo = await queryOne('select count(*)::int as total from provider_services where provider_id = $1', [
      provider.id,
    ]);
    assert.equal(stillTwo.total, 2, 'an empty (or wrongly configured) answer changes nothing');
  } finally {
    await query('delete from providers where slug = $1', [slug]);
  }
});

test('the availability of the optional columns is probed, and the sync says which mode it used', { skip: !hasDb }, async () => {
  const providerServiceColumns = await providers.tableColumns('provider_services');
  const providerColumns = await providers.tableColumns('providers');

  assert.equal(await providers.hasProviderServiceActiveFlag(), providerServiceColumns.has('is_active'));
  assert.equal(await providers.hasAdapterConfig(), providerColumns.has('adapter_config'));

  const { query, queryOne } = await import('../dist/lib/db.js');
  const slug = `fixture-columns-${randomUUID().slice(0, 8)}`;
  const provider = await createProviderForAdmin({
    name: 'Fixture columns supplier',
    slug,
    adapterKey: 'smm-panel',
    baseUrl: 'https://supplier.invalid/api/v2',
    credential: SECRET,
  });

  try {
    const result = await syncProviderServices(
      { providerId: provider.id },
      {
        fetchImpl: async (_url, init) =>
          json(new URLSearchParams(init.body).get('action') === 'services'
            ? { services: [{ service: '9', name: 'Nine', rate: '1.00' }] }
            : {}),
      },
    );
    assert.equal(result.deactivationMode, providerServiceColumns.has('is_active') ? 'flag' : 'fetched_at');
    const row = await queryOne('select provider_service_id from provider_services where provider_id = $1', [
      provider.id,
    ]);
    assert.equal(row.provider_service_id, '9');
  } finally {
    await query('delete from providers where slug = $1', [slug]);
  }
});

test('a credential that cannot be decrypted is a clear code, a failed sync row and no crash', { skip: !hasDb }, async () => {
  const { query, queryOne } = await import('../dist/lib/db.js');
  const slug = `fixture-badkey-${randomUUID().slice(0, 8)}`;
  const provider = await createProviderForAdmin({
    name: 'Fixture bad key supplier',
    slug,
    adapterKey: 'smm-panel',
    baseUrl: 'https://supplier.invalid/api/v2',
    credential: SECRET,
  });

  try {
    // encrypted with a key this server does not hold — the "key rotated" case
    await query('update providers set credentials_encrypted = $2 where id = $1', [
      provider.id,
      encryptCredential(SECRET, { key: OTHER_KEY }),
    ]);
    await assert.rejects(
      () => syncProviderServices({ providerId: provider.id }, { fetchImpl: async () => json({}) }),
      expectCode('CREDENTIAL_UNREADABLE', { status: 500 }),
    );

    const log = await queryOne(
      `select status, error from provider_sync_logs where provider_id = $1 order by id desc limit 1`,
      [provider.id],
    );
    assert.equal(log.status, 'failed');
    assert.ok(log.error && log.error.length > 0, 'the failure is recorded on the sync log');
    assert.equal(log.error.includes(SECRET), false);

    const row = await queryOne('select last_sync_status from providers where id = $1', [provider.id]);
    assert.equal(row.last_sync_status, 'failed');

    // tampered ciphertext on an otherwise valid envelope
    await query('update providers set credentials_encrypted = $2 where id = $1', [
      provider.id,
      tamper(encryptCredential(SECRET), 3),
    ]);
    await assert.rejects(
      () => syncProviderServices({ providerId: provider.id }, { fetchImpl: async () => json({}) }),
      expectCode('CREDENTIAL_UNREADABLE'),
    );

    // a provider that does not exist at all
    await assert.rejects(
      () => syncProviderServices({ providerId: '00000000-0000-0000-0000-0000000000ff' }),
      expectCode('PROVIDER_NOT_FOUND', { status: 404 }),
    );
  } finally {
    await query('delete from providers where slug = $1', [slug]);
  }
});

test('the registry drives the sync from a database row, and a partial supplier stays partial', { skip: !hasDb }, async () => {
  const { query } = await import('../dist/lib/db.js');
  const slug = `fixture-registry-${randomUUID().slice(0, 8)}`;
  const seen = [];

  const registry = createAdapterRegistry({
    'fixture-shape': (connection_) => ({
      key: connection_.adapterKey,
      capabilities: ['services'],
      supports: (capability) => capability === 'services',
      balance: async () => {
        throw Object.assign(new Error('not supported'), { code: 'PROVIDER_CAPABILITY_UNSUPPORTED' });
      },
      listServices: async () => {
        seen.push(connection_.credential);
        return [
          {
            externalServiceId: 'x1',
            name: 'Only service',
            type: null,
            rateMinor: 100,
            rateCurrency: 'USD',
            minQuantity: 1,
            maxQuantity: 10,
            supportsRefill: false,
            supportsCancel: false,
            supportsDripFeed: false,
            raw: { id: 'x1' },
          },
        ];
      },
      createOrder: async () => {
        throw Object.assign(new Error('not supported'), { code: 'PROVIDER_CAPABILITY_UNSUPPORTED' });
      },
      orderStatus: async () => {
        throw Object.assign(new Error('not supported'), { code: 'PROVIDER_CAPABILITY_UNSUPPORTED' });
      },
      cancelOrder: async () => {
        throw Object.assign(new Error('not supported'), { code: 'PROVIDER_CAPABILITY_UNSUPPORTED' });
      },
    }),
  });

  const provider = await createProviderForAdmin(
    {
      name: 'Fixture registry supplier',
      slug,
      adapterKey: 'fixture-shape',
      credential: SECRET,
    },
    { registry },
  );

  try {
    const result = await syncProviderServices({ providerId: provider.id }, { registry });
    assert.deepEqual(counts(result), { fetched: 1, created: 1, updated: 0, deactivated: 0 });
    assert.deepEqual(seen, [SECRET], 'the adapter received the decrypted credential and nothing else');

    const rows = await listProviderServices(provider.id);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].rate_currency, 'USD');
    assert.equal(Number(rows[0].rate_minor), 100);
  } finally {
    await query('delete from providers where slug = $1', [slug]);
  }
});

test('the admin HTTP surface creates, syncs, lists and deactivates a supplier against the real schema', { skip: !hasDb }, async () => {
  const { query } = await import('../dist/lib/db.js');
  const { findOrProvisionUser } = await import('../dist/modules/auth/users.js');

  const suffix = randomUUID().slice(0, 8);
  const slug = `fixture-http-${suffix}`;
  // provider_sync_logs.started_by is a real foreign key, so the admin is a real account.
  const user = await findOrProvisionUser({
    uid: `providers-route-${suffix}`,
    email: `providers-route-${suffix}@example.test`,
    emailVerified: true,
    displayName: 'Providers Admin',
    picture: null,
  });

  const services = (dropSecond) => ({
    services: [
      { service: '11', name: 'Followers', rate: '3.10', min: '10', max: '900', refill: true },
      ...(dropSecond ? [] : [{ service: '12', name: 'Likes', rate: '0.90', min: '5', max: '500', cancel: true }]),
    ],
  });

  const { url, close } = await startServer({
    auth: fakeAuth(['providers.view', 'providers.manage'], user),
    fetchImpl: async (_target, init) =>
      json(new URLSearchParams(init.body).get('action') === 'services' ? services(false) : {}),
  });

  let providerId = null;
  try {
    const created = await call(`${url}/api/admin/providers`, {
      name: 'Fixture HTTP supplier',
      slug,
      adapterKey: 'smm-panel',
      baseUrl: 'https://supplier.invalid/api/v2/',
      credential: SECRET,
      priority: 20,
      currency: 'usd',
      notes: 'created by the provider test suite',
    });

    assert.equal(created.status, 201);
    const createdBody = await created.json();
    assert.equal(createdBody.success, true);
    const provider = createdBody.data.provider;
    providerId = provider.id;
    assert.equal(provider.baseUrl, 'https://supplier.invalid/api/v2', 'a trailing slash is normalised away');
    assert.equal(provider.balanceCurrency, 'USD', 'a currency code is upper-cased');
    assert.equal(provider.hasCredential, true);
    assert.equal(createdBody.data.provider.credentials_encrypted, undefined);
    assert.equal(JSON.stringify(createdBody).includes(SECRET), false, 'no response ever carries the credential');

    const list = await getJson(`${url}/api/admin/providers`);
    assert.equal(list.status, 200);
    assert.equal(list.body.success, true);
    assert.ok(list.body.data.providers.some((item) => item.id === provider.id));
    assert.equal(list.body.data.total, list.body.data.providers.length);
    assert.equal(JSON.stringify(list.body).includes(SECRET), false);

    const one = await getJson(`${url}/api/admin/providers/${provider.id}`);
    assert.equal(one.status, 200);
    assert.equal(one.body.data.provider.slug, slug);

    const credentialState = await getJson(`${url}/api/admin/providers/${provider.id}/credential`);
    assert.deepEqual(credentialState.body.data.credential, { stored: true, readable: true });

    const sync = await call(`${url}/api/admin/providers/${provider.id}/sync`, {});
    assert.equal(sync.status, 200);
    const syncBody = await sync.json();
    assert.equal(syncBody.success, true);
    assert.deepEqual(counts(syncBody.data.sync), { fetched: 2, created: 2, updated: 0, deactivated: 0 });
    assert.ok(syncBody.data.sync.logId > 0);
    assert.equal(JSON.stringify(syncBody).includes(SECRET), false);

    const catalogue = await getJson(`${url}/api/admin/providers/${provider.id}/services`);
    assert.equal(catalogue.status, 200);
    assert.equal(catalogue.body.data.total, 2);
    const listed = catalogue.body.data.services.find((item) => item.externalServiceId === '12');
    assert.equal(listed.rateMinor, 90);
    assert.equal(listed.supportsCancel, true);
    assert.equal(listed.raw, undefined, 'the raw supplier snapshot is not published by the API');

    // a supplier is never deleted: deactivate keeps the row and its synced catalogue
    const deactivated = await call(`${url}/api/admin/providers/${provider.id}/deactivate`, {});
    assert.equal(deactivated.status, 200);
    assert.equal((await deactivated.json()).data.provider.isActive, false);

    const stillThere = await getJson(`${url}/api/admin/providers/${provider.id}/services`);
    assert.equal(stillThere.body.data.total, 2);

    const hiddenFromTheDefaultList = await getJson(`${url}/api/admin/providers`);
    assert.equal(hiddenFromTheDefaultList.body.data.providers.some((item) => item.id === provider.id), false);
    const included = await getJson(`${url}/api/admin/providers?includeInactive=true`);
    assert.equal(included.body.data.providers.some((item) => item.id === provider.id), true);

    // an unknown provider id is a code, not a stack trace
    const missing = await call(`${url}/api/admin/providers/00000000-0000-0000-0000-0000000000aa/sync`, {});
    assert.equal(missing.status, 404);
    const missingBody = await missing.json();
    assert.equal(missingBody.error.code, 'PROVIDER_NOT_FOUND');
    assert.equal(missingBody.error.stack, undefined);

    // updating without touching the credential keeps it
    const patched = await fetch(`${url}/api/admin/providers/${provider.id}`, {
      method: 'PATCH',
      headers: { authorization: 'Bearer test', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Fixture HTTP supplier (renamed)', priority: 5 }),
    });
    assert.equal(patched.status, 200);
    const patchedBody = await patched.json();
    assert.equal(patchedBody.data.provider.name, 'Fixture HTTP supplier (renamed)');
    assert.equal(patchedBody.data.provider.hasCredential, true);

    const audit = await query(
      `select action, new_value from audit_logs where entity_type = 'provider' and entity_id = $1 order by id`,
      [provider.id],
    );
    assert.deepEqual(
      audit.map((row) => row.action).sort(),
      ['PROVIDER_CREATE', 'PROVIDER_DEACTIVATE', 'PROVIDER_UPDATE'],
      'every administrative change is audited',
    );
    assert.equal(JSON.stringify(audit).includes(SECRET), false);
  } finally {
    await close();
    if (providerId) await query('delete from providers where id = $1', [providerId]);
  }
});
