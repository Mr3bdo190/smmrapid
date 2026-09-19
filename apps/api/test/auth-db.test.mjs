import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { findOrProvisionUser, loadAccess, loadWallet } from '../dist/modules/auth/users.js';
import { query, queryOne } from '../dist/lib/db.js';

/**
 * Database-backed checks for the provisioning path. They run against the database named by
 * DATABASE_URL — the CI database job and the local test cluster — and are skipped entirely when
 * it is not set, so the plain `npm test` run stays offline.
 *
 * These tests write rows (a user, its wallet and its profile) into a TEST database only.
 */
const hasDb = Boolean(process.env.DATABASE_URL);

const newIdentity = () => {
  const suffix = randomUUID().slice(0, 8);
  return {
    uid: `test-uid-${suffix}`,
    email: `provision-${suffix}@example.test`,
    emailVerified: true,
    displayName: `Test ${suffix}`,
    picture: null,
  };
};

test('first sign-in creates the user, profile and wallet; a second call is a no-op', { skip: !hasDb }, async () => {
  const identity = newIdentity();

  const created = await findOrProvisionUser(identity);
  assert.ok(created.id, 'a user row is returned');
  assert.equal(created.email, identity.email);
  assert.equal(created.status, 'active');

  // the wallet comes from the database trigger, so a money movement can never fail later
  const wallet = await queryOne('select balance_minor from wallets where user_id = $1', [created.id]);
  assert.ok(wallet, 'wallet row exists');
  assert.equal(Number(wallet.balance_minor), 0);

  const profile = await queryOne('select last_login_at from user_profiles where user_id = $1', [created.id]);
  assert.ok(profile, 'profile row exists');
  assert.ok(profile.last_login_at, 'last_login_at is stamped');

  // a second sign-in must not create a second account or a second wallet
  const again = await findOrProvisionUser({ ...identity, displayName: null, picture: null });
  assert.equal(again.id, created.id);
  assert.equal(again.display_name, identity.displayName, 'an empty display name never wipes the stored one');

  const counts = await query(
    `select
       (select count(*) from users where firebase_uid = $1)::int as users,
       (select count(*) from wallets w join users u on u.id = w.user_id where u.firebase_uid = $1)::int as wallets,
       (select count(*) from user_profiles p join users u on u.id = p.user_id where u.firebase_uid = $1)::int as profiles`,
    [identity.uid],
  );
  assert.deepEqual(counts[0], { users: 1, wallets: 1, profiles: 1 });
});

test('roles and permissions are read from the database', { skip: !hasDb }, async () => {
  const identity = newIdentity();
  const user = await findOrProvisionUser(identity);

  const before = await loadAccess(user.id);
  assert.deepEqual(before.roles, []);
  assert.deepEqual(before.permissions, []);

  await query(
    `insert into user_roles (user_id, role_id)
     select $1, id from roles where key = 'admin'
     on conflict do nothing`,
    [user.id],
  );

  const after = await loadAccess(user.id);
  assert.deepEqual(after.roles, ['admin']);
  assert.ok(after.permissions.length >= 30, `admin should hold every permission, got ${after.permissions.length}`);
  assert.ok(after.permissions.includes('settings.manage'));
});

test('the wallet summary reflects real ledger movements', { skip: !hasDb }, async () => {
  const identity = newIdentity();
  const user = await findOrProvisionUser(identity);

  assert.deepEqual(await loadWallet(user.id), { balanceMinor: 0, currency: 'USD' });

  await query(`select wallet_apply($1, 'credit', 'payment', 2500, 'db test', $2)`, [user.id, `db-test-${identity.uid}`]);

  assert.deepEqual(await loadWallet(user.id), { balanceMinor: 2500, currency: 'USD' });

  // the ledger guard rejects a direct balance write, so the summary can only come from wallet_apply
  await assert.rejects(
    () => query('update wallets set balance_minor = 999999 where user_id = $1', [user.id]),
    /wallet_apply/i,
  );
});
