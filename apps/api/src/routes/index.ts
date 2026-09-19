import type { Express } from 'express';
import { healthRouter } from '../modules/health/routes.js';

/**
 * Single mount point for every module router.
 *
 * Phase 4 onward registers one line per module here (auth, users, catalog, orders, wallet,
 * pricing, payments, providers, referrals, tickets, notifications, content, seo, admin,
 * audit). Keeping this list in one file means a route is never registered from two places and
 * the full surface of the API is readable at a glance.
 */
export function registerRoutes(app: Express): void {
  // infrastructure
  app.use(healthRouter);

  // modules — added in their own phases (nothing is mounted before it is implemented)
}
