import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createAuthGuards } from './middleware.js';
import type { AuthDeps, DbUser } from './types.js';

/** Only the fields a customer may see — never the whole row. */
const publicUser = (user: DbUser) => ({
  id: user.id,
  email: user.email,
  emailVerified: user.email_verified,
  displayName: user.display_name,
  avatarUrl: user.avatar_url,
  referralCode: user.referral_code,
  status: user.status,
  createdAt: user.created_at,
});

/**
 * Identity endpoints are the cheapest thing an attacker can hammer, so they get their own
 * limiter. It is deliberately generous enough for a real client (a page load calls /me once).
 */
const authLimiter = rateLimit({
  windowMs: 5 * 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait a moment and try again.' } },
});

export function createAuthModule(deps: AuthDeps) {
  const guards = createAuthGuards(deps);
  const router = Router();

  /**
   * The client's first call after sign-in. It doubles as provisioning: requireAuth creates the
   * account row (and its wallet) on first use, so there is no separate "sync" step to forget.
   */
  router.get('/me', authLimiter, guards.requireAuth, async (req, res, next) => {
    try {
      const auth = req.auth!;
      const wallet = await deps.loadWallet(auth.user.id);

      res.json({
        success: true,
        data: {
          user: publicUser(auth.user),
          wallet,
          roles: auth.roles,
          permissions: auth.permissions,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return { router, guards };
}
