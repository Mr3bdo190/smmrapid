import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import type { Identity } from './types.js';

/** Raised when the Admin SDK credentials are missing — surfaced as a 503, never as a 500. */
export class FirebaseNotConfiguredError extends Error {
  /** Stable marker so the error maps to a 503 even across separate bundle instances. */
  readonly code = 'AUTH_NOT_CONFIGURED';

  constructor(missing: string[]) {
    super(`Firebase Admin SDK is not configured (missing: ${missing.join(', ')})`);
    this.name = 'FirebaseNotConfiguredError';
  }
}

const missingCredentials = (): string[] => {
  const missing: string[] = [];
  if (!env.FIREBASE_PROJECT_ID) missing.push('FIREBASE_PROJECT_ID');
  if (!env.FIREBASE_CLIENT_EMAIL) missing.push('FIREBASE_CLIENT_EMAIL');
  if (!env.FIREBASE_PRIVATE_KEY) missing.push('FIREBASE_PRIVATE_KEY');
  return missing;
};

export const isFirebaseConfigured = (): boolean => missingCredentials().length === 0;

let initialised = false;

function ensureApp(): void {
  const missing = missingCredentials();
  if (missing.length) throw new FirebaseNotConfiguredError(missing);

  if (initialised || getApps().length) {
    initialised = true;
    return;
  }

  initializeApp({
    credential: cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      // Render stores the PEM with literal \n sequences; the SDK needs real newlines.
      privateKey: String(env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, '\n'),
    }),
    projectId: env.FIREBASE_PROJECT_ID,
  });

  initialised = true;
  logger.info('firebase admin initialised', { projectId: env.FIREBASE_PROJECT_ID });
}

/**
 * Verifies a Firebase ID token.
 *
 * checkRevoked is on so a token from a disabled/deleted account — or one revoked at sign-out
 * everywhere — stops working immediately instead of living out its hour.
 */
export async function verifyIdToken(token: string): Promise<Identity> {
  ensureApp();
  const decoded = await getAuth().verifyIdToken(token, true);

  return {
    uid: decoded.uid,
    email: String(decoded.email ?? '').trim().toLowerCase(),
    emailVerified: Boolean(decoded.email_verified),
    displayName: typeof decoded.name === 'string' ? decoded.name : null,
    picture: typeof decoded.picture === 'string' ? decoded.picture : null,
  };
}
