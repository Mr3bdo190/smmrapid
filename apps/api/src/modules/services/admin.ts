import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { AppError } from '../../middleware/error-handler.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { query, queryOne, withTransaction } from '../../lib/db.js';
import { createAuthGuards } from '../auth/middleware.js';
import type { AuthDeps } from '../auth/types.js';

/**
 * The admin view of what is on sale.
 *
 * This is the surface that turns a synced provider catalogue into a shop: services arrive switched
 * off (a sync must never publish a supplier's price by accident), and an admin activates, prices and
 * features them here. Three rules:
 *
 *  - a price is edited as *our* price and our markup, never as the supplier's, and every edit is
 *    audited with the before and after value;
 *  - bulk changes take an explicit list or an explicit `all: true` — never "everything the filter
 *    happens to match right now", because that is how a filter typo reprices a whole shop;
 *  - deleting is a soft delete: the row keeps its orders and its history, it just leaves the shop.
 */

const listQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  providerId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  active: z.enum(['true', 'false']).optional(),
  featured: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).max(2000).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

/** Only these fields are writable. Everything else (ids, supplier cost, sync metadata) is not. */
const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    nameAr: z.string().trim().max(200).nullable().optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    descriptionAr: z.string().trim().max(4000).nullable().optional(),
    priceMinor: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
    markupPercent: z.coerce.number().min(-90).max(1000).nullable().optional(),
    markupFixedMinor: z.coerce.number().int().min(-1_000_000_000).max(1_000_000_000).nullable().optional(),
    minQuantity: z.coerce.number().int().min(1).max(100_000_000).optional(),
    maxQuantity: z.coerce.number().int().min(1).max(1_000_000_000).optional(),
    estimatedTime: z.string().trim().max(120).nullable().optional(),
    inputHint: z.string().trim().max(500).nullable().optional(),
    inputHintAr: z.string().trim().max(500).nullable().optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(-10_000).max(10_000).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'nothing to update', path: ['(body)'] });

const bulkSchema = z
  .object({
    ids: z.array(z.string().uuid()).max(500).optional(),
    all: z.literal(true).optional(),
    providerId: z.string().uuid().optional(),
    categoryId: z.string().uuid().optional(),
    /** Refuses the change unless it would touch exactly this many rows. The brake against a typo. */
    expectCount: z.coerce.number().int().min(1).max(100_000).optional(),
  })
  .strict()
  .refine((value) => Boolean(value.ids?.length) || value.all === true, {
    message: 'provide ids or all: true — bulk changes must be explicit',
    path: ['ids'],
  });

const adminLimiter = rateLimit({
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

type AdminServiceRow = {
  id: string;
  slug: string;
  name: string;
  name_ar: string | null;
  price_minor: string | number;
  provider_cost_minor: string | number | null;
  markup_percent: string | number | null;
  markup_fixed_minor: string | number | null;
  min_quantity: string | number;
  max_quantity: string | number;
  price_unit: string;
  input_type: string;
  is_active: boolean;
  is_featured: boolean;
  deleted_at: string | null;
  provider_id: string | null;
  provider_name: string | null;
  category_name: string | null;
  total: string | number;
};

const toInt = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
};

const publicAdminService = (row: AdminServiceRow) => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  nameAr: row.name_ar,
  priceMinor: toInt(row.price_minor),
  providerCostMinor: row.provider_cost_minor === null ? null : toInt(row.provider_cost_minor),
  markupPercent: row.markup_percent === null ? null : Number(row.markup_percent),
  markupFixedMinor: row.markup_fixed_minor === null ? null : toInt(row.markup_fixed_minor),
  minQuantity: toInt(row.min_quantity),
  maxQuantity: toInt(row.max_quantity),
  priceUnit: row.price_unit,
  inputType: row.input_type,
  isActive: row.is_active,
  isFeatured: row.is_featured,
  deletedAt: row.deleted_at,
  provider: row.provider_id ? { id: row.provider_id, name: row.provider_name } : null,
  categoryName: row.category_name,
  /** What we keep per 1000 at the current price and cost — admins see the margin, customers never do. */
  marginPer1000Minor:
    row.provider_cost_minor === null ? null : toInt(row.price_minor) - toInt(row.provider_cost_minor),
});

const SERVICE_SELECT = `
  select s.id, s.slug, s.name, s.name_ar, s.price_minor, s.provider_cost_minor, s.markup_percent,
         s.markup_fixed_minor, s.min_quantity, s.max_quantity, s.price_unit, s.input_type,
         s.is_active, s.is_featured, s.deleted_at, s.provider_id,
         p.name as provider_name, c.name as category_name,
         count(*) over() as total
    from services s
    left join providers p on p.id = s.provider_id
    left join categories c on c.id = s.category_id`;

export function createServicesAdminModule(deps: AuthDeps) {
  const guards = createAuthGuards(deps);
  const adminRouter = Router();

  const whereFilter = `
    where ($1::text is null or s.name ilike '%' || $1::text || '%' or coalesce(s.name_ar, '') ilike '%' || $1::text || '%' or s.slug ilike '%' || $1::text || '%')
      and ($2::uuid is null or s.provider_id = $2::uuid)
      and ($3::uuid is null or s.category_id = $3::uuid)
      and ($4::boolean is null or s.is_active = $4::boolean)
      and ($5::boolean is null or s.is_featured = $5::boolean)`;

  const listValues = (input: z.infer<typeof listQuerySchema>) => [
    input.q ?? null,
    input.providerId ?? null,
    input.categoryId ?? null,
    input.active === undefined ? null : input.active === 'true',
    input.featured === undefined ? null : input.featured === 'true',
  ];

  adminRouter.get(
    '/',
    adminLimiter,
    guards.requireAuth,
    guards.requirePermission('services.view'),
    validateQuery(listQuerySchema),
    async (req, res, next) => {
      try {
        const parsed = req.query as unknown as z.infer<typeof listQuerySchema>;
        const { page = 1, pageSize = 25 } = parsed;
        const rows = await query<AdminServiceRow>(
          `${SERVICE_SELECT} ${whereFilter}
            order by s.is_active desc, s.sort_order asc, s.name asc
            limit $6 offset $7`,
          [...listValues(parsed), pageSize, (page - 1) * pageSize],
        );
        const totals = await queryOne<{ active: string | number; inactive: string | number; total: string | number }>(
          `select count(*) filter (where is_active and deleted_at is null) as active,
                  count(*) filter (where not is_active and deleted_at is null) as inactive,
                  count(*) filter (where deleted_at is null) as total
             from services`,
        );
        res.json({
          success: true,
          data: {
            services: rows.map(publicAdminService),
            total: rows.length > 0 ? toInt(rows[0]!.total) : 0,
            page,
            pageSize,
            shop: {
              active: toInt(totals?.active),
              inactive: toInt(totals?.inactive),
              total: toInt(totals?.total),
            },
          },
        });
      } catch (error) {
        next(error);
      }
    },
  );

  adminRouter.patch(
    '/:id',
    adminLimiter,
    guards.requireAuth,
    guards.requirePermission('services.edit'),
    validateBody(updateSchema),
    async (req, res, next) => {
      try {
        const id = String(req.params.id ?? '');
        const body = req.body as z.infer<typeof updateSchema>;

        const before = await queryOne<AdminServiceRow>(`${SERVICE_SELECT} where s.id = $1::uuid`, [id]);
        if (!before) throw new AppError('SERVICE_NOT_FOUND', 'That service does not exist.', 404);

        if (
          (body.minQuantity !== undefined && body.maxQuantity !== undefined && body.minQuantity > body.maxQuantity) ||
          (body.minQuantity !== undefined && body.minQuantity > toInt(before.max_quantity)) ||
          (body.maxQuantity !== undefined && body.maxQuantity < toInt(before.min_quantity))
        ) {
          throw new AppError('SERVICE_LIMITS_INVALID', 'The minimum quantity cannot be above the maximum.', 422, {
            fields: [{ field: 'minQuantity', message: 'must be less than or equal to maxQuantity' }],
          });
        }

        const updated = await queryOne<AdminServiceRow>(
          `update services set
             name = coalesce($2, name),
             name_ar = case when $3::boolean then $4::text else name_ar end,
             description = case when $5::boolean then $6::text else description end,
             description_ar = case when $7::boolean then $8::text else description_ar end,
             price_minor = coalesce($9::bigint, price_minor),
             markup_percent = case when $10::boolean then $11::numeric else markup_percent end,
             markup_fixed_minor = case when $12::boolean then $13::bigint else markup_fixed_minor end,
             min_quantity = coalesce($14::bigint, min_quantity),
             max_quantity = coalesce($15::bigint, max_quantity),
             estimated_time = case when $16::boolean then $17::text else estimated_time end,
             input_hint = case when $18::boolean then $19::text else input_hint end,
             input_hint_ar = case when $20::boolean then $21::text else input_hint_ar end,
             is_active = coalesce($22::boolean, is_active),
             is_featured = coalesce($23::boolean, is_featured),
             sort_order = coalesce($24::int, sort_order),
             updated_at = now()
           where id = $1::uuid
           returning id, slug, name, name_ar, price_minor, provider_cost_minor, markup_percent, markup_fixed_minor,
                     min_quantity, max_quantity, price_unit, input_type, is_active, is_featured, deleted_at, provider_id,
                     (select name from providers where id = services.provider_id) as provider_name,
                     (select name from categories where id = services.category_id) as category_name,
                     1 as total`,
          [
            id,
            body.name ?? null,
            'nameAr' in body, body.nameAr ?? null,
            'description' in body, body.description ?? null,
            'descriptionAr' in body, body.descriptionAr ?? null,
            body.priceMinor ?? null,
            'markupPercent' in body, body.markupPercent ?? null,
            'markupFixedMinor' in body, body.markupFixedMinor ?? null,
            body.minQuantity ?? null,
            body.maxQuantity ?? null,
            'estimatedTime' in body, body.estimatedTime ?? null,
            'inputHint' in body, body.inputHint ?? null,
            'inputHintAr' in body, body.inputHintAr ?? null,
            body.isActive ?? null,
            body.isFeatured ?? null,
            body.sortOrder ?? null,
          ],
        );

        await query(
          `insert into audit_logs (actor_type, actor_user_id, action, entity_type, entity_id, old_value, new_value)
           values ('admin', $1::uuid, 'SERVICE_UPDATE', 'service', $2::text, $3, $4)`,
          [
            req.auth!.user.id,
            id,
            { priceMinor: toInt(before.price_minor), isActive: before.is_active, markupPercent: before.markup_percent },
            { changed: Object.keys(body), priceMinor: updated ? toInt(updated.price_minor) : null, isActive: updated?.is_active },
          ],
        );

        res.json({ success: true, data: { service: updated ? publicAdminService(updated) : null } });
      } catch (error) {
        next(error);
      }
    },
  );

  /** Bulk activate / deactivate / feature — the way a fresh sync becomes a shop. */
  for (const action of ['activate', 'deactivate', 'feature', 'unfeature'] as const) {
    adminRouter.post(
      `/bulk/${action}`,
      adminLimiter,
      guards.requireAuth,
      guards.requirePermission('services.edit'),
      validateBody(bulkSchema),
      async (req, res, next) => {
        try {
          const input = req.body as z.infer<typeof bulkSchema>;
          const setActive = action === 'activate' ? true : action === 'deactivate' ? false : null;
          const setFeatured = action === 'feature' ? true : action === 'unfeature' ? false : null;

          const filterValues = [
            input.ids ?? null,
            input.providerId ?? null,
            input.categoryId ?? null,
          ];

          /**
           * The count is read and the change is applied inside one transaction. `expectCount` is a
           * brake against a typo, not a lock: if a sync lands between the two statements the count no
           * longer matches and the whole thing is rolled back with an explanation — refusing is the
           * safe outcome, and nothing half-changed is left behind.
           */
          const result = await withTransaction(async (tx) => {
            const counted = await tx.query<{ n: string | number }>(
              `select count(*) as n from services
                where deleted_at is null
                  and ($1::uuid[] is null or id = any($1::uuid[]))
                  and ($2::uuid is null or provider_id = $2::uuid)
                  and ($3::uuid is null or category_id = $3::uuid)`,
              filterValues,
            );
            const matched = toInt(counted.rows[0]?.n);
            if (input.expectCount !== undefined && matched !== input.expectCount) return { matched, rows: null };

            const updated = await tx.query<{ id: string; slug: string }>(
              `update services set
                 is_active = coalesce($4::boolean, is_active),
                 is_featured = coalesce($5::boolean, is_featured),
                 updated_at = now()
               where deleted_at is null
                 and ($1::uuid[] is null or id = any($1::uuid[]))
                 and ($2::uuid is null or provider_id = $2::uuid)
                 and ($3::uuid is null or category_id = $3::uuid)
               returning id, slug`,
              [...filterValues, setActive, setFeatured],
            );
            return { matched, rows: updated.rows };
          });

          if (!result.rows) {
            throw new AppError(
              'SERVICE_BULK_MISMATCH',
              `Expected ${input.expectCount} services but ${result.matched} matched — nothing was changed.`,
              409,
              { fields: [{ field: 'expectCount', message: `matched ${result.matched}` }] },
            );
          }

          await query(
            `insert into audit_logs (actor_type, actor_user_id, action, entity_type, entity_id, new_value)
             values ('admin', $1::uuid, $2, 'service', 'bulk', $3)`,
            [req.auth!.user.id, `SERVICE_BULK_${action.toUpperCase()}`, { count: result.rows.length, scope: input.ids ?? 'all' }],
          );

          res.json({ success: true, data: { action, changed: result.rows.length } });
        } catch (error) {
          next(error);
        }
      },
    );
  }

  /** A soft delete: the shop stops offering it, the orders that used it keep working. */
  adminRouter.delete(
    '/:id',
    adminLimiter,
    guards.requireAuth,
    guards.requirePermission('services.delete'),
    async (req, res, next) => {
      try {
        const id = String(req.params.id ?? '');
        const before = await queryOne<{ slug: string; deleted_at: string | null }>(
          `select slug, deleted_at from services where id = $1::uuid`,
          [id],
        );
        if (!before) throw new AppError('SERVICE_NOT_FOUND', 'That service does not exist.', 404);
        if (before.deleted_at) {
          res.json({ success: true, data: { id, deleted: true, changed: false } });
          return;
        }

        await query(`update services set deleted_at = now(), is_active = false, updated_at = now() where id = $1::uuid`, [id]);
        await query(
          `insert into audit_logs (actor_type, actor_user_id, action, entity_type, entity_id, old_value, new_value)
           values ('admin', $1::uuid, 'SERVICE_DELETE', 'service', $2::text, $3, $4)`,
          [req.auth!.user.id, id, { slug: before.slug, deletedAt: null }, { deletedAt: new Date().toISOString() }],
        );

        res.json({ success: true, data: { id, deleted: true, changed: true } });
      } catch (error) {
        next(error);
      }
    },
  );

  return { adminRouter };
}
