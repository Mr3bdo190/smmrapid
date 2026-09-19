import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { AppError } from '../../middleware/error-handler.js';
import { validateBody, validateParams } from '../../middleware/validate.js';
import { createAuthGuards } from '../auth/middleware.js';
import {
  createDeposit,
  enabledGateways,
  handleWebhook,
  listDeposits,
  loadPaymentSettings,
  refreshDeposit,
} from './service.js';
import { PAYMENT_GATEWAYS, SHAHNAWY_METHODS, type PaymentsDeps } from './types.js';

/**
 * Deposits for customers, webhooks for gateways.
 *
 * The customer surface is read-mostly: creating a deposit starts a payment at the gateway, and
 * confirming asks the gateway what actually happened. No route accepts a status, an amount already
 * credited, or a balance.
 */

const depositLimiter = rateLimit({
  windowMs: 5 * 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many deposit attempts. Wait a moment and try again.' } },
});

/** Gateways call us back: allow generous bursts, the database dedupes anyway. */
const webhookLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many notifications.' } },
});

const PUBLIC_ID = /^PAY[0-9A-F]{10}$/;
const publicIdParam = z.object({ publicId: z.string().trim().regex(PUBLIC_ID, 'must look like PAY0123456789') });
const gatewayParam = z.object({ gateway: z.enum(PAYMENT_GATEWAYS) });

const createSchema = z
  .object({
    gateway: z.enum(PAYMENT_GATEWAYS),
    amountMinor: z.coerce.number().int().positive(),
    method: z.enum(SHAHNAWY_METHODS).optional(),
    walletNumber: z.string().trim().max(20).optional(), // length is checked per gateway
  })
  .strict();

export function createPaymentsModule(deps: PaymentsDeps): { router: Router; webhookRouter: Router } {
  const guards = createAuthGuards(deps.auth);
  const router = Router();
  const webhookRouter = Router();

  /**
   * GET /api/payments/gateways — what a customer may actually use, with the limits that apply.
   * A gateway switched off (feature flag) or missing its credentials is simply absent, so the UI
   * never offers a deposit method that cannot work.
   */
  router.get('/gateways', async (_req, res, next) => {
    try {
      const settings = await (deps.settings ?? loadPaymentSettings)();
      const enabled = await (deps.enabled ?? enabledGateways)();
      const config = deps.config;
      const gateways = enabled
        .map((gateway) => {
          const adapter = deps.adapter ? deps.adapter(gateway) : null;
          const methods = gateway === 'shahnawy' ? [...SHAHNAWY_METHODS] : [];
          const currency = gateway === 'shahnawy' ? 'EGP' : 'USD';
          const limits =
            gateway === 'shahnawy'
              ? { minMinor: 500, maxMinor: 1_000_000 }
              : { minMinor: settings.minDepositMinor, maxMinor: settings.maxDepositMinor };
          return { key: gateway, currency, methods, ...limits, configured: adapter ? adapter.configured() : Boolean(config) };
        })
        .filter((entry) => entry.configured);
      res.json({ success: true, data: { gateways } });
    } catch (error) {
      next(error);
    }
  });

  /** POST /api/payments/deposits — start a deposit and get back what the customer must do next. */
  router.post('/deposits', depositLimiter, guards.requireAuth, validateBody(createSchema), async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createSchema>;
      const payment = await createDeposit(
        {
          userId: req.auth!.user.id,
          gateway: body.gateway,
          amountMinor: body.amountMinor,
          method: body.method ?? null,
          walletNumber: body.walletNumber ?? null,
        },
        deps,
      );
      res.status(201).json({ success: true, data: { payment } });
    } catch (error) {
      next(error);
    }
  });

  /** GET /api/payments/deposits — the customer's own deposit history. */
  router.get('/deposits', guards.requireAuth, async (req, res, next) => {
    try {
      const payments = await listDeposits(req.auth!.user.id);
      res.json({ success: true, data: { payments } });
    } catch (error) {
      next(error);
    }
  });

  /** GET /api/payments/deposits/:publicId — one deposit. */
  router.get('/deposits/:publicId', guards.requireAuth, validateParams(publicIdParam), async (req, res, next) => {
    try {
      const payments = await listDeposits(req.auth!.user.id, 100);
      const found = payments.find((payment) => payment.publicId === String(req.params.publicId));
      if (!found) throw new AppError('PAYMENT_NOT_FOUND', 'We could not find this payment on your account.', 404);
      res.json({ success: true, data: { payment: found } });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/payments/deposits/:publicId/confirm — "I approved it, check again".
   * The answer comes from the gateway, never from the click: 200 once the money is in the wallet,
   * 409 with the customer's next step while it is still pending, and a clear code if it failed.
   */
  router.post('/deposits/:publicId/confirm', depositLimiter, guards.requireAuth, validateParams(publicIdParam), async (req, res, next) => {
    try {
      const payment = await refreshDeposit(req.auth!.user.id, String(req.params.publicId), deps);
      res.json({ success: true, data: { payment } });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/webhooks/payments/:gateway
   *
   * A gateway notification. Always acknowledged (200) so the sender does not retry forever, except
   * when a *signed* gateway fails verification — that one is refused with 400 on purpose.
   */
  webhookRouter.post('/:gateway', webhookLimiter, validateParams(gatewayParam), async (req, res, next) => {
    try {
      const gateway = String(req.params.gateway) as (typeof PAYMENT_GATEWAYS)[number];
      const outcome = await handleWebhook(
        gateway,
        { headers: req.headers as Record<string, string | string[] | undefined>, body: req.body },
        deps,
      );
      res.json({ success: true, data: outcome });
    } catch (error) {
      next(error);
    }
  });

  return { router, webhookRouter };
}
