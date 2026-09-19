import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../dist/app.js';
import { DatabaseNotConfiguredError } from '../dist/lib/db.js';

/**
 * The auth surface is exercised over real HTTP with injected fake dependencies: the token
 * verifier, the user store and the wallet lookup. That keeps these tests fast and offline while
 * still going through the real middleware, error handler and response shapes.
 */

const USER = {
  id: '11111111-1111-1111-1111-111111111111',
  firebase_uid: 'uid-1',
  email: 'tester@example.com',
  email_verified: true,
  display_name: 'Tester',
  avatar_url: null,
  referral_code: 'RAPID01',
  status: 'active',
  created_at: '2026-01-01T00:00:00.000Z',
};

function fakeAuth(overrides = {}) {
  const calls = { verify: 0, provision: 0, access: 0, wallet: 0 };
  const deps = {
    async verifyIdToken(token) {
      calls.verify += 1;
      if (token === 'expired') {
        const error = new Error('id-token-expired');
        error.code = 'auth/id-token-expired';
        throw error;
      }
      if (token === 'garbage') {
        const error = new Error('invalid id token');
        error.code = 'auth/argument-error';
        throw error;
      }
      return { uid: 'uid-1', email: USER.email, emailVerified: true, displayName: 'Tester', picture: null };
    },
    async findOrProvisionUser() {
      calls.provision += 1;
      return USER;
    },
    async loadAccess() {
      calls.access += 1;
      return { roles: ['customer'], permissions: ['orders.view'] };
    },
    async loadWallet() {
      calls.wallet += 1;
      return { balanceMinor: 1234, currency: 'USD' };
    },
    ...overrides,
  };
  return { deps, calls };
}

async function startServer(deps) {
  const server = createApp({ auth: deps }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

const get = (url, headers = {}) => fetch(`${url}/api/auth/me`, { headers });

test('anonymous request is rejected and touches no dependency', async () => {
  const { deps, calls } = fakeAuth();
  const { url, close } = await startServer(deps);
  try {
    const res = await get(url);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'AUTH_REQUIRED');
    assert.equal(calls.verify, 0);
    assert.equal(calls.provision, 0);
  } finally {
    await close();
  }
});

test('a non-bearer Authorization header is rejected', async () => {
  const { deps } = fakeAuth();
  const { url, close } = await startServer(deps);
  try {
    const res = await get(url, { authorization: 'Token abc123' });
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error.code, 'AUTH_REQUIRED');
  } finally {
    await close();
  }
});

test('an expired token answers TOKEN_EXPIRED (tell the customer to sign in again)', async () => {
  const { deps } = fakeAuth();
  const { url, close } = await startServer(deps);
  try {
    const res = await get(url, { authorization: 'Bearer expired' });
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error.code, 'TOKEN_EXPIRED');
  } finally {
    await close();
  }
});

test('any other identity failure answers TOKEN_INVALID, never a raw provider message', async () => {
  const { deps } = fakeAuth();
  const { url, close } = await startServer(deps);
  try {
    const res = await get(url, { authorization: 'Bearer garbage' });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error.code, 'TOKEN_INVALID');
    assert.ok(!/argument-error|firebase/i.test(JSON.stringify(body)), 'provider wording must not leak');
  } finally {
    await close();
  }
});

test('a database that is not configured answers 503 DB_UNAVAILABLE', async () => {
  const { deps } = fakeAuth({
    async findOrProvisionUser() {
      throw new DatabaseNotConfiguredError();
    },
  });
  const { url, close } = await startServer(deps);
  try {
    const res = await get(url, { authorization: 'Bearer good' });
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error.code, 'DB_UNAVAILABLE');
  } finally {
    await close();
  }
});

test('a non-active account answers 403 ACCOUNT_DISABLED and never loads permissions', async () => {
  const { deps, calls } = fakeAuth({
    async findOrProvisionUser() {
      return { ...USER, status: 'suspended' };
    },
  });
  const { url, close } = await startServer(deps);
  try {
    const res = await get(url, { authorization: 'Bearer good' });
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error.code, 'ACCOUNT_DISABLED');
    assert.equal(calls.access, 0);
  } finally {
    await close();
  }
});

test('a verified request returns the account view with only public fields', async () => {
  const { deps, calls } = fakeAuth();
  const { url, close } = await startServer(deps);
  try {
    const res = await get(url, { authorization: 'Bearer good' });
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('ratelimit-limit'), 'identity endpoints must be rate limited');

    const body = await res.json();
    assert.equal(body.success, true);
    assert.deepEqual(Object.keys(body.data).sort(), ['permissions', 'roles', 'user', 'wallet']);
    assert.equal(body.data.user.email, USER.email);
    assert.equal(body.data.user.displayName, 'Tester');
    assert.equal(body.data.wallet.balanceMinor, 1234);
    assert.deepEqual(body.data.roles, ['customer']);

    // internal columns must never be echoed back
    const payload = JSON.stringify(body);
    for (const leak of ['firebase_uid', 'firebaseUid', 'email_verified', 'avatar_url']) {
      assert.ok(!payload.includes(leak), `response must not expose ${leak}`);
    }

    assert.equal(calls.verify, 1);
    assert.equal(calls.provision, 1);
    assert.equal(calls.access, 1);
    assert.equal(calls.wallet, 1);
  } finally {
    await close();
  }
});
