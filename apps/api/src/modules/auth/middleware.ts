import type { RequestHandler } from 'express';
import { AppError } from '../../middleware/error-handler.js';
import { DatabaseNotConfiguredError } from '../../lib/db.js';
import { FirebaseNotConfiguredError } from './firebase.js';
import type { AuthDeps } from './types.js';

const bearerToken = (header?: string): string | null => {
  if (!header) return null;
  const [scheme, value] = header.split(' ');
  if (!scheme || !value || scheme.toLowerCase() !== 'bearer') return null;
  const token = value.trim();
  return token.length ? token : null;
};

/**
 * Turns anything the identity/provider/DB layers throw into a stable, customer-safe error.
 * Unexpected failures keep their 500 + support reference from the global handler.
 */
export function toAuthError(error: unknown): unknown {
  if (error instanceof AppError) return error;

  // Matching on `code` (not only instanceof) matters because each build entry bundles its own
  // copy of these classes: an error thrown by dist/lib/db.js is not an instance of the class
  // inlined into dist/app.js, and would otherwise degrade into a generic 500.
  const marker = typeof (error as { code?: unknown })?.code === 'string' ? String((error as { code: string }).code) : '';

  if (error instanceof FirebaseNotConfiguredError || marker === 'AUTH_NOT_CONFIGURED') {
    return new AppError(
      'AUTH_NOT_CONFIGURED',
      'Sign-in is temporarily unavailable. Please try again shortly.',
      503,
    );
  }

  if (error instanceof DatabaseNotConfiguredError || marker === 'DB_NOT_CONFIGURED') {
    return new AppError(
      'DB_UNAVAILABLE',
      'The service is temporarily unavailable. Please try again shortly.',
      503,
    );
  }

  if (marker === 'auth/id-token-expired') {
    return new AppError('TOKEN_EXPIRED', 'Your session has expired. Sign in again to continue.', 401);
  }
  if (marker.startsWith('auth/')) {
    return new AppError('TOKEN_INVALID', 'Your session is not valid. Sign in again to continue.', 401);
  }

  return error;
}

export type AuthGuards = {
  requireAuth: RequestHandler;
  requirePermission: (permission: string) => RequestHandler;
};

/**
 * Authentication is decided by the server: a Firebase ID token is verified with the Admin SDK,
 * the account row is loaded (or created) from the database, and roles/permissions come from the
 * database as well. A client-supplied user id, role or balance is never read.
 */
export function createAuthGuards(deps: AuthDeps): AuthGuards {
  const requireAuth: RequestHandler = async (req, _res, next) => {
    try {
      const token = bearerToken(req.header('authorization'));
      if (!token) throw new AppError('AUTH_REQUIRED', 'Sign in to continue.', 401);

      const identity = await deps.verifyIdToken(token);
      const user = await deps.findOrProvisionUser(identity);

      if (user.status !== 'active') {
        throw new AppError('ACCOUNT_DISABLED', 'This account is not active. Please contact support.', 403);
      }

      const access = await deps.loadAccess(user.id);
      req.auth = { user, roles: access.roles, permissions: access.permissions };
      next();
    } catch (error) {
      next(toAuthError(error));
    }
  };

  const requirePermission = (permission: string): RequestHandler => (req, _res, next) => {
    const auth = req.auth;
    if (!auth) {
      next(new AppError('AUTH_REQUIRED', 'Sign in to continue.', 401));
      return;
    }
    if (!auth.permissions.includes(permission)) {
      next(new AppError('FORBIDDEN', 'You do not have access to this.', 403));
      return;
    }
    next();
  };

  return { requireAuth, requirePermission };
}
