import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createApp } from '../dist/app.js';

/**
 * The admin view of people.
 *
 * The load-bearing assertions: no endpoint here can move money (a balance is only ever written by the
 * wallet's ledger), roles are replaced as a set with an unknown role refused rather than ignored, and
 * suspending is reversible and audited. The "cannot suspend yourself" check exists because locking
 * the last admin out of the panel is a support incident, not a feature.
 */

const hasDb = Boolean(process.env.DATABASE_URL);
const run = randomUUID().slice(0, 8);
const FULL_PERMISSIONS = ['users.view', 'users.edit', 'users.suspend', 'users.roles', 'wallets.view'];

let db;
let admin;
let target;

const startServer = async (perms = FULL_PERMISSIONS, user = null) => {
  const actor = user ?? admin;
  const app = createApp({
    auth: {
      verifyIdToken: async () => ({ uid: actor.firebase_uid, email: actor.email, emailVerified: true }),
      findOrProvisionUser: async () => actor,
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

const makeUser = async (label) => {
  const { query } = db;
  const user = {
    id: randomUUID(),
    firebase_uid: `u-${run}-${label}`,
    email: `u-${run}-${label}@example.test`,
    display_name: `شخص ${label}`,
    status: 'active',
    email_verified: true,
    created_at: new Date().toISOString(),
  };
  await query(
    `insert into users (id, firebase_uid, email, display_name, email_verified, status)
     values ($1, $2, $3, $4, true, 'active')`,
    [user.id, user.firebase_uid, user.email, user.display_name],
  );
  return user;
};

before(async () => {
  if (!hasDb) return;
  db = await import('../dist/lib/db.js');
  admin = await makeUser('admin');
  target = await makeUser('target');
});

after(async () => {
  if (!hasDb) return;
  const { query } = db;
  await query(`delete from user_roles where user_id in (select id from users where email like $1)`, [`u-${run}-%`]);
  // accounts are never hard-deleted (the schema refuses, and records the attempt): the test leaves
  // its rows behind instead of working around a guarantee that protects real customers.
});

test('the admin users list demands users.view', async () => {
  const { url, close } = await startServer([]);
  try {
    const res = await call(url, '/api/admin/users');
    assert.equal(res.status, 403);
  } finally {
    await close();
  }
});

test('the list finds a customer by email and by name, and reports their wallet', { skip: !hasDb }, async () => {
  const { url, close } = await startServer();
  try {
    const byEmail = await call(url, `/api/admin/users?q=${encodeURIComponent(`u-${run}-target`)}`);
    assert.equal(byEmail.status, 200);
    const { data } = await byEmail.json();
    assert.equal(data.users.length, 1);
    assert.equal(data.users[0].id, target.id);
    assert.ok(data.users[0].wallet, 'the panel always shows the balance beside the account');

    const byName = await call(url, `/api/admin/users?q=${encodeURIComponent('شخص target')}`);
    const named = await byName.json();
    assert.ok(named.data.users.some((user) => user.id === target.id), 'searching by display name works too');
  } finally {
    await close();
  }
});

test('the detail carries the roles and the audit trail', { skip: !hasDb }, async () => {
  const { url, close } = await startServer();
  try {
    const res = await call(url, `/api/admin/users/${target.id}`);
    assert.equal(res.status, 200);
    const { data } = await res.json();
    assert.equal(data.user.id, target.id);
    assert.ok(Array.isArray(data.roles));
    assert.ok(Array.isArray(data.auditTrail));

    const unknown = await call(url, `/api/admin/users/${randomUUID()}`);
    assert.equal(unknown.status, 404);
    assert.equal((await unknown.json()).error.code, 'USER_NOT_FOUND');

    const malformed = await call(url, '/api/admin/users/not-a-uuid');
    assert.equal(malformed.status, 422, 'a malformed id is a validation error, not a 500');
  } finally {
    await close();
  }
});

test('suspending is reversible, audited, and refuses to target yourself', { skip: !hasDb }, async () => {
  const { url, close } = await startServer();
  try {
    const self = await call(url, `/api/admin/users/${admin.id}/suspend`, { method: 'POST' });
    assert.equal(self.status, 409);
    assert.equal((await self.json()).error.code, 'CANNOT_TARGET_SELF');

    const suspended = await call(url, `/api/admin/users/${target.id}/suspend`, { method: 'POST' });
    assert.equal(suspended.status, 200);
    assert.equal((await suspended.json()).data.changed, true);

    const again = await call(url, `/api/admin/users/${target.id}/suspend`, { method: 'POST' });
    assert.equal((await again.json()).data.changed, false, 'suspending twice is not an error');

    const { query } = db;
    const row = await query(`select status from users where id = $1::uuid`, [target.id]);
    assert.equal(row[0].status, 'suspended');

    const audit = await query(
      `select action, old_value, new_value, actor_user_id from audit_logs where entity_id = $1 and action = 'USER_SUSPEND' order by created_at desc limit 1`,
      [target.id],
    );
    assert.equal(audit.length, 1, 'the suspension is on the record');
    assert.equal(audit[0].old_value.status, 'active');
    assert.equal(audit[0].new_value.status, 'suspended');
    assert.equal(audit[0].actor_user_id, admin.id, 'and it names the admin who did it');

    const active = await call(url, `/api/admin/users/${target.id}/reactivate`, { method: 'POST' });
    assert.equal(active.status, 200);
    const back = await query(`select status from users where id = $1::uuid`, [target.id]);
    assert.equal(back[0].status, 'active', 'and it is fully reversible');
  } finally {
    await close();
  }
});

test('roles are replaced as a set, and an unknown role changes nothing', { skip: !hasDb }, async () => {
  const { url, close } = await startServer();
  try {
    const bad = await call(url, `/api/admin/users/${target.id}/roles`, {
      method: 'POST',
      body: JSON.stringify({ roles: ['support', 'not_a_real_role'] }),
    });
    assert.equal(bad.status, 422);
    assert.equal((await bad.json()).error.code, 'UNKNOWN_ROLE');

    const { query } = db;
    const before = await query(`select count(*)::int as n from user_roles where user_id = $1::uuid`, [target.id]);
    assert.equal(before[0].n, 0, 'a typo must not strip the roles the account already had');

    const ok = await call(url, `/api/admin/users/${target.id}/roles`, {
      method: 'POST',
      body: JSON.stringify({ roles: ['support'] }),
    });
    const text = await ok.text();
    assert.equal(ok.status, 200, text);
    assert.deepEqual(JSON.parse(text).data.roles, ['support']);

    const after = await query(`select r.key from user_roles ur join roles r on r.id = ur.role_id where ur.user_id = $1::uuid`, [
      target.id,
    ]);
    assert.deepEqual(after.map((entry) => entry.key), ['support']);

    const audit = await query(
      `select old_value, new_value from audit_logs where entity_id = $1 and action = 'USER_ROLES_SET'`,
      [target.id],
    );
    assert.equal(audit.length, 1);
    assert.deepEqual(audit[0].new_value.roles, ['support']);
  } finally {
    await close();
  }
});

test('the admin surface cannot write a balance', { skip: !hasDb }, async () => {
  const { url, close } = await startServer();
  try {
    // There is deliberately no such endpoint: money only moves through the wallet ledger, behind
    // wallets.adjust, so a panel request that tries to set a balance finds nothing to call.
    for (const path of [`/api/admin/users/${target.id}`, `/api/admin/users/${target.id}/balance`, `/api/admin/wallets/${target.id}`]) {
      const res = await call(url, path, { method: 'PATCH', body: JSON.stringify({ balanceMinor: 999_999_999 }) });
      assert.ok([404, 405].includes(res.status), `${path} must not accept a balance write (got ${res.status})`);
    }

    const { query } = db;
    const wallet = await query(`select balance_minor from wallets where user_id = $1::uuid`, [target.id]);
    assert.ok(
      wallet.length === 0 || Number(wallet[0].balance_minor) === 0,
      'and no balance was created or changed by trying',
    );
  } finally {
    await close();
  }
});
