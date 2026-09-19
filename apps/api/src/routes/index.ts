import type { Express } from 'express';
import { healthRouter } from '../modules/health/routes.js';
import { createAuthModule } from '../modules/auth/routes.js';
import { createUsersModule } from '../modules/users/routes.js';
import type { AuthDeps } from '../modules/auth/types.js';

/**
 * Single mount point for every module router.
 *
 * Phase 4 onward registers one line per module here (users, catalog, orders, wallet, pricing,
 * payments, providers, referrals, tickets, notifications, content, seo, admin, audit). Keeping
 * this list in one file means a route is never registered from two places and the full surface
 * of the API is readable at a glance.
 */
export function registerRoutes(app: Express, deps: { auth: AuthDeps }): void {
  // infrastructure
  app.use(healthRouter);

  // modules
  app.use('/api/auth', createAuthModule(deps.auth).router);
  app.use('/api/users', createUsersModule(deps.auth).router);
}
