import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { AppError } from '../../middleware/error-handler.js';
import { validateQuery } from '../../middleware/validate.js';
import {
  getPublicService,
  listPublicCategories,
  listPublicServices,
  toPricingError,
} from '../pricing/service.js';

/**
 * The storefront catalogue: what is on sale, what it costs, and what the customer has to provide.
 *
 * Why a façade over the pricing module instead of queries of its own: a catalogue that computed a
 * price would be a second pricing implementation, and the first thing to drift. Every row here is
 * mapped by the same `toPublicService` the order form's quote uses, so the number on the card is
 * the number the wallet is charged. Only orderable rows are listed, and nothing about the supplier
 * (its name, its id, the cost we buy at) is ever part of the response.
 */

const listQuerySchema = z.object({
  category: z.string().trim().min(1).max(80).optional(),
  q: z.string().trim().min(1).max(80).optional(),
  featured: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).max(1000).optional(),
  pageSize: z.coerce.number().int().min(1).max(60).optional(),
});

const PAGE_SIZE = 24;

const catalogLimiter = rateLimit({
  windowMs: 60_000,
  limit: 240,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again in a moment.' },
    });
  },
});

export function createCatalogModule(): { router: Router } {
  const router = Router();

  router.get('/services', catalogLimiter, validateQuery(listQuerySchema), async (req, res, next) => {
    try {
      const { category, q, featured, page = 1, pageSize = PAGE_SIZE } = req.query as unknown as z.infer<typeof listQuerySchema>;
      const { services, total } = await listPublicServices({
        category: category ?? null,
        q: q ?? null,
        featured: featured === undefined ? null : featured === 'true',
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      res.json({
        success: true,
        data: { services, total, page, pageSize, currency: services[0]?.currency ?? null },
      });
    } catch (error) {
      next(toPricingError(error));
    }
  });

  router.get('/categories', catalogLimiter, async (_req, res, next) => {
    try {
      res.json({ success: true, data: { categories: await listPublicCategories() } });
    } catch (error) {
      next(toPricingError(error));
    }
  });

  router.get('/services/:slug', catalogLimiter, async (req, res, next) => {
    try {
      const slug = String(req.params.slug ?? '').trim();
      if (!slug || slug.length > 120) {
        throw new AppError('VALIDATION_ERROR', 'service slug is not valid', 422, {
          fields: [{ field: 'slug', message: 'must be 1-120 characters' }],
        });
      }
      res.json({ success: true, data: { service: await getPublicService(slug) } });
    } catch (error) {
      next(toPricingError(error));
    }
  });

  return { router };
}
