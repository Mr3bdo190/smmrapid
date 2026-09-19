/**
 * Identity, database rows and the injectable dependencies the auth layer needs.
 *
 * Everything the auth flow touches sits behind `AuthDeps`, so tests can drive the real HTTP
 * surface with a fake token verifier and a fake user store — no Firebase project, no network.
 */

/** The verified result of a Firebase ID token. Never trust anything the client sends. */
export type Identity = {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName?: string | null;
  picture?: string | null;
};

export type DbUser = {
  id: string;
  firebase_uid: string;
  email: string;
  email_verified: boolean;
  display_name: string | null;
  avatar_url: string | null;
  referral_code: string | null;
  status: 'active' | 'suspended' | 'banned';
  created_at: string;
};

export type Access = {
  roles: string[];
  permissions: string[];
};

export type AuthContext = {
  user: DbUser;
  roles: string[];
  permissions: string[];
};

export type WalletSummary = { balanceMinor: number; currency: string };

export type AuthDeps = {
  /** Verifies a Firebase ID token and returns the identity it proves. Throws on any failure. */
  verifyIdToken: (token: string) => Promise<Identity>;
  /** Finds the user row for this identity, creating it (and its wallet/profile) on first login. */
  findOrProvisionUser: (identity: Identity) => Promise<DbUser>;
  /** Loads role and permission keys for a user from the database. */
  loadAccess: (userId: string) => Promise<Access>;
  /** Wallet balance for the account view (minor units). */
  loadWallet: (userId: string) => Promise<WalletSummary>;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}
