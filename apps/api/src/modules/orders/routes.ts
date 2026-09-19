import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { AppError } from '../../middleware/error-handler.js';
import { validateBody, validateParams } from '../../middleware/validate.js';
import { createAuthGuards } from '../auth/middleware.js';
import { runOrderTick, type DispatchDeps } from './dispatch.js';
import { orderIdempotencyConflict, orderNotFound } from './errors.js';
import { createOrder, getOrder, listOrders, parseListQuery, repeatOrder } from './service.js';
import type { OrderModuleDeps, PublicOrder } from './types.js';

/**
 * The customer's order surface.
 *
 * Reads are generous, writes are not: creating an order moves money, so it is rate limited per
 * client and idempotent per key. No route accepts a price, a total or a status from the client.
 */
const listLimiter = rateLimit({
  windowMs: 5 * 60_000,
  limit: 240,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Wait a moment and try again.' },
  },
});

const createLimiter = rateLimit({
  windowMs: 5 * 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many orders in a short time. Wait a moment and try again.' },
  },
});

const PUBLIC_ID = /^ORD[0-9A-F]{10}$/;

const publicIdParam = z.object({ publicId: z.string().trim().regex(PUBLIC_ID, 'must look like ORD0123456789') });

const createSchema = z
  .object({
    serviceSlug: z.string().trim().min(1).max(120).optional(),
    serviceId: z.string().uuid().optional(),
    variantId: z.string().uuid().nullish(),
    target: z.string().trim().min(1).max(5000),
    quantity: z.coerce.number().int().positive(),
    couponCode: z.string().trim().max(60).nullish(),
    idempotencyKey: z.string().trim().min(8).max(200).nullish(),
    dripFeed: z.boolean().optional(),
    runsAt: z.string().datetime().nullish(),
  })
  .strict()
  .refine((value) => Boolean(value.serviceSlug ?? value.serviceId), {
    message: 'a service is required',
    path: ['serviceSlug'],
  })
  .refine((value) => !(value.serviceSlug && value.serviceId), {
    message: 'give either serviceSlug or serviceId, not both',
    path: ['serviceId'],
  });

const listSchema = z
  .object({
    cursor: z.string().trim().max(200).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: z
      .enum(['pending', 'processing', 'in_progress', 'completed', 'partial', 'canceled', 'failed', 'refunded'])
      .optional(),
  })
  .strict();

/** A duplicate idempotency key means the same attempt arrived twice at the same moment. */
function toOrdersError(error: unknown): unknown {
  if (error instanceof AppError) return error;
  const code = (error as { code?: string }).code;
  if (code === '23505') {
    const constraint = (error as { constraint?: string }).constraint ?? '';
    if (constraint.includes('idempotency')) return orderIdempotencyConflict();
  }
  return error;
}

export function createOrdersModule(deps: OrderModuleDeps & { dispatch?: DispatchDeps }): {
  router: Router;
  adminRouter: Router;
} {
  const guards = createAuthGuards(deps.auth);
  const router = Router();
  const adminRouter = Router();

  /** POST /api/orders — create and pay in one step. 201 when created, 200 when it was a replay. */
  router.post('/', createLimiter, guards.requireAuth, validateBody(createSchema), async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createSchema>;
      const result = await createOrder(
        {
          userId: req.auth!.user.id,
          serviceSlug: body.serviceSlug,
          serviceId: body.serviceId,
          variantId: body.variantId ?? null,
          target: body.target,
          quantity: body.quantity,
          couponCode: body.couponCode ?? null,
          idempotencyKey: body.idempotencyKey ?? null,
          dripFeed: body.dripFeed,
          runsAt: body.runsAt ?? null,
        },
        deps.orders,
      );

      const order: PublicOrder = result.order;
      res.status(result.replayed ? 200 : 201).json({ success: true, data: { order, replayed: result.replayed } });
    } catch (error) {
      next(toOrdersError(error));
    }
  });

  /** GET /api/orders — the customer's own history, newest first. */
  router.get('/', listLimiter, guards.requireAuth, async (req, res, next) => {
    try {
      const parsed = listSchema.safeParse(req.query ?? {});
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        throw new AppError('VALIDATION_ERROR', `Query: ${String(first?.path?.[0] ?? '')} — ${first?.message ?? 'invalid'}`, 422, {
          fields: parsed.error.issues.map((issue) => ({ field: String(issue.path[0] ?? ''), message: issue.message })),
        });
      }
      const params = parseListQuery(parsed.data);
      const page = await listOrders({ ...params, userId: req.auth!.user.id, status: parsed.data.status ?? null });
      res.json({ success: true, data: page });
    } catch (error) {
      next(toOrdersError(error));
    }
  });

  /** GET /api/orders/:publicId — one order with its status timeline. */
  router.get('/:publicId', listLimiter, guards.requireAuth, validateParams(publicIdParam), async (req, res, next) => {
    try {
      const order = await getOrder(req.auth!.user.id, String(req.params.publicId));
      res.json({ success: true, data: { order } });
    } catch (error) {
      next(toOrdersError(error));
    }
  });

  /**
   * POST /api/orders/:publicId/repeat — prices the same order again and returns a prefill.
   * It creates nothing and charges nothing: the customer still confirms through POST /api/orders.
   */
  router.post('/:publicId/repeat', createLimiter, guards.requireAuth, validateParams(publicIdParam), async (req, res, next) => {
    try {
      const result = await repeatOrder(req.auth!.user.id, String(req.params.publicId), deps.orders);
      res.json({ success: true, data: result });
    } catch (error) {
      next(toOrdersError(error));
    }
  });

  /**
   * POST /api/admin/orders/dispatch — one dispatch tick by hand: submit what is waiting, then
   * refresh what is running. The same code the background ticker runs, so an operator can see the
   * outcome without waiting for it.
   */
  adminRouter.post(
    '/dispatch',
    createLimiter,
    guards.requireAuth,
    guards.requirePermission('orders.edit'),
    async (_req, res, next) => {
      try {
        const tick = await runOrderTick(deps.dispatch ?? {});
        res.json({ success: true, data: tick });
      } catch (error) {
        next(toOrdersError(error));
      }
    },
  );

  return { router, adminRouter };
}

export { orderNotFound };
