import type { Express } from 'express';
import { healthRouter } from '../modules/health/routes.js';
import { createAuthModule } from '../modules/auth/routes.js';
import { createUsersModule } from '../modules/users/routes.js';
import { createWalletModule } from '../modules/wallet/routes.js';
import { walletDbDeps } from '../modules/wallet/service.js';
import { createProvidersModule } from '../modules/providers/routes.js';
import { createPricingModule } from '../modules/pricing/routes.js';
import { pricingDbDeps } from '../modules/pricing/service.js';
import { createOrdersModule } from '../modules/orders/routes.js';
import { orderDbDeps } from '../modules/orders/index.js';
import { createPaymentsModule, productionPaymentsDeps } from '../modules/payments/index.js';
import { createTicketsModule } from '../modules/tickets/index.js';
import type { PaymentsDeps } from '../modules/payments/types.js';
import type { AuthDeps } from '../modules/auth/types.js';

/**
 * Single mount point for every module router.
 *
 * Phase 4 onward registers one line per module here (users, catalog, orders, wallet, pricing,
 * payments, providers, referrals, tickets, notifications, content, seo, admin, audit). Keeping
 * this list in one file means a route is never registered from two places and the full surface
 * of the API is readable at a glance.
 */
export function registerRoutes(
  app: Express,
  deps: { auth: AuthDeps; payments?: Partial<PaymentsDeps> },
): void {
  // infrastructure
  app.use(healthRouter);

  // modules
  app.use('/api/auth', createAuthModule(deps.auth).router);
  app.use('/api/users', createUsersModule(deps.auth).router);
  app.use('/api/wallet', createWalletModule({ auth: deps.auth, wallet: walletDbDeps }).router);
  app.use('/api/admin/providers', createProvidersModule({ auth: deps.auth }).router);
  const orders = createOrdersModule({ auth: deps.auth, orders: orderDbDeps });
  app.use('/api/orders', orders.router);
  app.use('/api/admin/orders', orders.adminRouter);

  const tickets = createTicketsModule({ auth: deps.auth });
  app.use('/api', tickets.router);
  app.use('/api/admin', tickets.adminRouter);

  const payments = createPaymentsModule({ ...productionPaymentsDeps(deps.auth), ...(deps.payments ?? {}), auth: deps.auth });
  app.use('/api/payments', payments.router);
  app.use('/api/webhooks/payments', payments.webhookRouter);

  // pricing owns two surfaces: the public price calculator and the admin repricing tools
  const pricing = createPricingModule({ auth: deps.auth, pricing: pricingDbDeps });
  app.use('/api/pricing', pricing.router);
  app.use('/api/admin/pricing', pricing.adminRouter);
}
