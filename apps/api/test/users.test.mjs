import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createApp } from '../dist/app.js';

/**
 * Profile updates: validation runs without a database (the fake identity stops at the guard),
 * and the writing path is exercised against the real schema when DATABASE_URL is set.
 */
const hasDb = Boolean(process.env.DATABASE_URL);

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

/** A signed-in identity that needs no database, so validation can be tested on its own. */
const fakeAuth = () => ({
  verifyIdToken: async () => ({ uid: 'validation-user', email: 'v@example.test', emailVerified: true }),
  findOrProvisionUser: async () => ({
    id: '00000000-0000-0000-0000-0000000000ff',
    firebase_uid: 'validation-user',
    email: 'v@example.test',
    email_verified: true,
    display_name: 'Validation User',
    avatar_url: null,
    referral_code: 'FIXTURE',
    status: 'active',
    created_at: new Date().toISOString(),
  }),
  loadAccess: async () => ({ roles: ['customer'], permissions: [] }),
  loadWallet: async () => ({ balanceMinor: 0, currency: 'USD' }),
});

const patch = (url, body) =>
  fetch(`${url}/api/users/me`, {
    method: 'PATCH',
    headers: { authorization: 'Bearer test', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

test('an unknown field set is rejected with VALIDATION_ERROR and field details', async () => {
  const { url, close } = await startServer(fakeAuth());
  try {
    const res = await patch(url, {});
    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.fields.length >= 1);
  } finally {
    await close();
  }
});

test('field-level rules are enforced', async () => {
  const { url, close } = await startServer(fakeAuth());
  try {
    for (const [payload, expectedField] of [
      [{ displayName: 'a' }, 'displayName'],
      [{ locale: 'fr' }, 'locale'],
      [{ countryCode: 'egypt' }, 'countryCode'],
      [{ company: 'x'.repeat(121) }, 'company'],
    ]) {
      const res = await patch(url, payload);
      assert.equal(res.status, 422, `${JSON.stringify(payload)} must be rejected`);
      const body = await res.json();
      const fields = body.error.details.fields.map((issue) => issue.field);
      assert.ok(fields.includes(expectedField), `${expectedField} should be reported, got ${fields}`);
    }
  } finally {
    await close();
  }
});

test('a real profile update writes the row, normalises the country code and is audited', { skip: !hasDb }, async () => {
  const { findOrProvisionUser } = await import('../dist/modules/auth/users.js');
  const { query, queryOne } = await import('../dist/lib/db.js');

  const suffix = randomUUID().slice(0, 8);
  const user = await findOrProvisionUser({
    uid: `users-route-${suffix}`,
    email: `users-route-${suffix}@example.test`,
    emailVerified: true,
    displayName: 'Before Update',
    picture: null,
  });

  // the guard is what normally resolves the identity; here it is pinned to this test account
  const auth = {
    async verifyIdToken() {
      return { uid: user.firebase_uid, email: user.email, emailVerified: true };
    },
    async findOrProvisionUser() {
      return user;
    },
  };

  const { url, close } = await startServer(auth);
  try {
    const res = await patch(url, {
      displayName: 'بعد التحديث',
      locale: 'en',
      timezone: 'Europe/Berlin',
      countryCode: 'eg',
      company: 'Rapid Co',
      completeOnboarding: true,
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.profile.locale, 'en');
    assert.equal(body.data.profile.countryCode, 'EG', 'a two-letter code is upper-cased');
    assert.ok(body.data.profile.onboardingCompletedAt, 'onboarding is stamped');

    const readBack = await fetch(`${url}/api/users/me`, { headers: { authorization: 'Bearer test' } });
    assert.equal(readBack.status, 200);
    assert.equal((await readBack.json()).data.profile.timezone, 'Europe/Berlin');

    const stored = await queryOne('select display_name from users where id = $1', [user.id]);
    assert.equal(stored.display_name, 'بعد التحديث');

    const audit = await query(
      `select action, old_value, new_value from audit_logs
        where entity_id = $1 and action = 'PROFILE_UPDATE' order by id desc limit 1`,
      [user.id],
    );
    assert.equal(audit.length, 1, 'the update is audited');
    assert.equal(audit[0].old_value.displayName, 'Before Update');
    assert.equal(audit[0].new_value.displayName, 'بعد التحديث');
  } finally {
    await close();
  }
});
