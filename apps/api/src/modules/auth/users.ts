import { query, queryOne } from '../../lib/db.js';
import type { Access, DbUser, Identity, WalletSummary } from './types.js';

/**
 * Finds the account for a verified identity, creating it on first sign-in.
 *
 * One statement does the find-or-create, so two parallel first requests cannot produce two
 * rows (the unique index on firebase_uid is the arbiter). The user's wallet is created by a
 * database trigger on insert, and the profile row is upserted here.
 */
export async function findOrProvisionUser(identity: Identity): Promise<DbUser> {
  const user = await queryOne<DbUser>(
    `insert into users (firebase_uid, email, email_verified, display_name, avatar_url)
     values ($1, $2, $3, $4, $5)
     on conflict (firebase_uid) do update set
       email          = excluded.email,
       email_verified = excluded.email_verified,
       display_name   = coalesce(excluded.display_name, users.display_name),
       avatar_url     = coalesce(excluded.avatar_url, users.avatar_url),
       updated_at     = now()
     where users.deleted_at is null
     returning id, firebase_uid, email, email_verified, display_name, avatar_url,
               referral_code, status, created_at`,
    [identity.uid, identity.email, identity.emailVerified, identity.displayName ?? null, identity.picture ?? null],
  );

  if (!user) {
    // either the account was soft-deleted or the row vanished between statements
    throw new Error('account is not available');
  }

  // The profile row carries onboarding state and the last-seen timestamp.
  await query(
    `insert into user_profiles (user_id, last_login_at)
     values ($1, now())
     on conflict (user_id) do update set last_login_at = now(), updated_at = now()`,
    [user.id],
  );

  return user;
}

/** Wallet balance in minor units, or zero when the row is missing (it is created on signup). */
export async function loadWallet(userId: string): Promise<WalletSummary> {
  const wallet = await queryOne<{ balance_minor: string; currency: string }>(
    'select balance_minor, currency from wallets where user_id = $1',
    [userId],
  );
  return wallet
    ? { balanceMinor: Number(wallet.balance_minor), currency: wallet.currency }
    : { balanceMinor: 0, currency: 'USD' };
}

/** Roles and permission keys, straight from the database — never from the request. */
export async function loadAccess(userId: string): Promise<Access> {
  const rows = await query<{ role: string; permission: string | null }>(
    `select r.key as role, p.key as permission
       from user_roles ur
       join roles r on r.id = ur.role_id
       left join role_permissions rp on rp.role_id = r.id
       left join permissions p on p.id = rp.permission_id
      where ur.user_id = $1`,
    [userId],
  );

  const roles = new Set<string>();
  const permissions = new Set<string>();
  for (const row of rows) {
    roles.add(row.role);
    if (row.permission) permissions.add(row.permission);
  }

  return { roles: [...roles].sort(), permissions: [...permissions].sort() };
}
