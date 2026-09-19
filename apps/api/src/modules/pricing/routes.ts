/**
 * Pricing engine — HTTP surface.
 *
 * Two routers, mounted by the parent session:
 *
 *     app.use('/api/pricing', createPricingModule({ auth, pricing }).router);
 *     app.use('/api/admin/pricing', createPricingModule({ auth, pricing }).adminRouter);
 *
 * Public (customer-facing, no session needed):
 *   GET  /api/pricing/services/:slug  → the price and the quantity rules of one service
 *   POST /api/pricing/quote           → what a quantity costs, with an optional coupon
 *
 * Admin (permission-checked with the keys the database actually seeds):
 *   GET  /api/admin/pricing/services/:slug  `services.view`  → cost, markup, margin, suggested price
 *   POST /api/admin/pricing/preview         `services.view`  → "what would this cost/markup sell for?"
 *   POST /api/admin/pricing/recompute       `services.edit`  → re-derive prices from cost + markup
 *
 * Why the quote is public and identity is optional: a visitor must be able to see what a quantity
 * costs before signing up — that is the whole point of a price calculator. When a session *is*
 * present it is verified by the real guard (a bad token is an error, never silently treated as
 * anonymous), because a coupon's per-customer limit can only be answered for a known customer.
 * The price itself always comes from the database: no request field is ever trusted as a price or
 * an amount, and nothing here can charge anyone — the quote only says what an order would cost.
 *
 * `dryRun` defaults to true on the recompute route: re-deriving catalogue prices is deliberate, so
 * an operator has to ask for the write, and the answer always states which of the two happened.
 */
import rateLimit from 'express-rate-limit';
import { Router } from 'express';
import { z } from 'zod';
import type { RequestHandler } from 'express';
import { validateBody, validateParams } from '../../middleware/validate.js';
import { createAuthGuards, toAuthError } from '../auth/middleware.js';
import type { AuthGuards } from '../auth/middleware.js';
import type { PricingModuleDeps } from './types.js';

/**
 * The permission keys seeded for the catalogue (database/seeds/0001_reference_data.sql). Named
 * constants so a typo is a compile error instead of a silently unreachable route.
 */
export const PRICING_PERMISSIONS = {
  view: 'services.view',
  edit: 'services.edit',
} as const;

/** Matches the `services_slug_format` / `categories_slug_format` check constraints. */
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Express 5 types a route param as `string | string[] | undefined`; the validator guarantees one. */
const slugOf = (value: unknown): string => (Array.isArray(value) ? String(value[0] ?? '') : String(value ?? ''));

/** A calculator can be called on every keystroke; this is a load ceiling, not a customer limit. */
const quoteLimiter = rateLimit({
  windowMs: 5 * 60_000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many price checks in a short time. Please wait a moment and try again.' } },
});

const slugParams = z.object({
  slug: z.string().trim().regex(SLUG, 'must be a catalogue slug, for example instagram-followers-active'),
});

/** Whole items, in the units the customer counts (`per_1000` services convert internally). */
const quantity = z
  .number()
  .refine(
    (value) => Number.isInteger(value) && value > 0,
    'must be a whole number of items greater than zero (5000 means five thousand)',
  );

/** Money entering the system is integer minor units; 2500 means 25.00. */
const minorUnits = z
  .number()
  .refine(
    (value) => Number.isSafeInteger(value) && value >= 0,
    'must be a whole number of minor units, zero or more (2500 means 25.00)',
  );

const percent = z
  .number()
  .refine(
    (value) => Number.isFinite(value) && value >= 0,
    'must be a percentage, zero or more (30 means 30%)',
  );

const quoteSchema = z
  .object({
    serviceSlug: z.string().trim().regex(SLUG, 'must be a catalogue slug').optional(),
    serviceId: z.string().trim().regex(UUID, 'must be a valid id').optional(),
    variantId: z.string().trim().regex(UUID, 'must be a valid id').optional(),
    quantity,
    couponCode: z
      .string()
      .trim()
      .min(3, 'must be at least 3 characters')
      .max(40, 'must be 40 characters or fewer')
      .regex(/^[A-Za-z0-9_-]+$/, 'must contain letters, numbers, dashes or underscores only')
      .optional(),
  })
  .refine(
    (value) => Boolean(value.serviceSlug || value.serviceId),
    'send serviceSlug (a catalogue slug) or serviceId to say which service to price',
  );

const previewSchema = z
  .object({
    costMinor: minorUnits.optional(),
    markupPercent: percent.optional(),
    markupFixedMinor: minorUnits.optional(),
    serviceSlug: z.string().trim().regex(SLUG, 'must be a catalogue slug').optional(),
    categorySlug: z.string().trim().regex(SLUG, 'must be a catalogue slug').optional(),
  })
  .refine(
    (value) => value.costMinor !== undefined || Boolean(value.serviceSlug),
    'send costMinor (the supplier cost per price unit) or serviceSlug to take it from',
  );

const recomputeSchema = z
  .object({
    /** True (the default) reports what would change without writing. Send false to apply. */
    dryRun: z.boolean().optional(),
    serviceSlug: z.string().trim().regex(SLUG, 'must be a catalogue slug').optional(),
    categorySlug: z.string().trim().regex(SLUG, 'must be a catalogue slug').optional(),
  })
  .default({});

/**
 * Identity when it is offered, never required.
 *
 * A request without an Authorization header is a normal anonymous request. A request *with* one
 * goes through the real guard, so an expired or forged token is answered as it always is
 * (`TOKEN_INVALID` / `TOKEN_EXPIRED` / `ACCOUNT_DISABLED`) instead of quietly becoming anonymous —
 * a customer must never believe a coupon was counted for them when their session was not valid.
 */
export function optionalAuth(guards: AuthGuards): RequestHandler {
  return (req, res, next) => {
    if (!req.header('authorization')) {
      next();
      return;
    }
    guards.requireAuth(req, res, next);
  };
}

export function createPricingModule(deps: PricingModuleDeps): { router: Router; adminRouter: Router } {
  const guards = createAuthGuards(deps.auth);
  const router = Router();
  const adminRouter = Router();
  const optional = optionalAuth(guards);

  const view: RequestHandler[] = [guards.requireAuth, guards.requirePermission(PRICING_PERMISSIONS.view)];
  const edit: RequestHandler[] = [guards.requireAuth, guards.requirePermission(PRICING_PERMISSIONS.edit)];

  /**
   * GET /api/pricing/services/:slug — one service, priced for a customer.
   *
   * The shape is built in service.ts from named columns, so our supplier cost is not part of it.
   */
  router.get('/services/:slug', validateParams(slugParams), async (req, res, next) => {
    try {
      const service = await deps.pricing.getServicePrice(slugOf(req.params.slug));
      res.json({ success: true, data: { service } });
    } catch (error) {
      next(toAuthError(error));
    }
  });

  /**
   * POST /api/pricing/quote — the price of a quantity, with an optional coupon.
   *
   * Nothing is charged and nothing is stored: this is the number the order form shows, and the
   * order phase takes its own quote server-side before it moves any money.
   */
  router.post('/quote', quoteLimiter, optional, validateBody(quoteSchema), async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof quoteSchema>;
      const quote = await deps.pricing.quote({
        ...(body.serviceSlug ? { serviceSlug: body.serviceSlug } : {}),
        ...(body.serviceId ? { serviceId: body.serviceId } : {}),
        ...(body.variantId ? { variantId: body.variantId } : {}),
        quantity: body.quantity,
        ...(body.couponCode ? { couponCode: body.couponCode } : {}),
        userId: req.auth?.user.id ?? null,
      });
      res.json({ success: true, data: { quote } });
    } catch (error) {
      next(toAuthError(error));
    }
  });

  /** GET /api/admin/pricing/services/:slug — the margin view an operator needs to price a service. */
  adminRouter.get('/services/:slug', ...view, validateParams(slugParams), async (req, res, next) => {
    try {
      const pricing = await deps.pricing.adminServicePricing(slugOf(req.params.slug));
      res.json({ success: true, data: { pricing } });
    } catch (error) {
      next(toAuthError(error));
    }
  });

  /** POST /api/admin/pricing/preview — price a hypothetical cost/markup before saving it. */
  adminRouter.post('/preview', ...view, validateBody(previewSchema), async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof previewSchema>;
      const preview = await deps.pricing.previewPrice({
        ...(body.costMinor !== undefined ? { costMinor: body.costMinor } : {}),
        ...(body.markupPercent !== undefined ? { markupPercent: body.markupPercent } : {}),
        ...(body.markupFixedMinor !== undefined ? { markupFixedMinor: body.markupFixedMinor } : {}),
        ...(body.serviceSlug ? { serviceSlug: body.serviceSlug } : {}),
        ...(body.categorySlug ? { categorySlug: body.categorySlug } : {}),
      });
      res.json({ success: true, data: { preview } });
    } catch (error) {
      next(toAuthError(error));
    }
  });

  /**
   * POST /api/admin/pricing/recompute — re-derive `price_minor` from cost + markup.
   *
   * `dryRun` defaults to true, so the same call answers "here is what would change" until the
   * operator explicitly asks to write. The summary counts every row examined, not just the ones
   * in the (capped) list.
   */
  adminRouter.post('/recompute', ...edit, validateBody(recomputeSchema), async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof recomputeSchema>;
      const summary = await deps.pricing.recomputePrices({
        dryRun: body.dryRun !== false,
        ...(body.serviceSlug ? { serviceSlug: body.serviceSlug } : {}),
        ...(body.categorySlug ? { categorySlug: body.categorySlug } : {}),
      });
      res.json({ success: true, data: { summary } });
    } catch (error) {
      next(toAuthError(error));
    }
  });

  return { router, adminRouter };
}
