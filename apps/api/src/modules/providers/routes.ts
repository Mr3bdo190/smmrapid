/**
 * Admin routes for suppliers and catalogue sync.
 *
 * Mounted by the parent session at `/api/admin/providers`:
 *
 *     app.use('/api/admin/providers', createProvidersModule({ auth: deps.auth }).router);
 *
 * Authorization uses the existing guard pattern and the permission keys the database actually
 * seeds — `providers.view` and `providers.manage` (seeds/0001_reference_data.sql). Nothing here
 * invents a permission, and nothing here trusts a role name: `requirePermission` reads the keys
 * loaded from the database on each request.
 *
 * Responses follow the one envelope, and no handler can return a credential: the provider shape
 * is built by service.ts, which never exposes `credentials_encrypted`.
 */
import { Router } from 'express';
import { z } from 'zod';
import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../../middleware/error-handler.js';
import { validateBody, validateParams } from '../../middleware/validate.js';
import { createAuthGuards, toAuthError } from '../auth/middleware.js';
import { providerError } from './errors.js';
import { listProviderServices } from './repository.js';
import { hasProviderServiceActiveFlag } from './schema.js';
import {
  createProviderForAdmin,
  deactivateProviderForAdmin,
  findProviderForAdmin,
  listProvidersForAdmin,
  providerCredentialState,
  updateProviderForAdmin,
} from './service.js';
import { syncProviderServices } from './sync.js';
import type { ProvidersDeps } from './types.js';

/**
 * The permission keys seeded for this module. Named constants so a typo is a compile error
 * instead of a silently unreachable route.
 */
export const PROVIDER_PERMISSIONS = {
  view: 'providers.view',
  manage: 'providers.manage',
} as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Matches the `providers_adapter_key_format` check constraint exactly. */
const ADAPTER_KEY = /^[a-z][a-z0-9_-]{1,48}$/;
const SLUG = /^[a-z0-9][a-z0-9-]{1,62}$/;

const idParams = z.object({ id: z.string().trim().regex(UUID, 'must be a valid id') });

const httpUrl = z
  .string()
  .trim()
  .max(300)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
      return false;
    }
  }, 'must be a full http(s) address, for example https://api.example.com/v2');

const providerFields = {
  name: z.string().trim().min(2, 'must be at least 2 characters').max(120, 'must be 120 characters or fewer'),
  slug: z
    .string()
    .trim()
    .regex(SLUG, 'must be lowercase letters, digits or dashes (2-63 characters)'),
  adapterKey: z
    .string()
    .trim()
    .regex(ADAPTER_KEY, 'must start with a letter and use lowercase letters, digits, _ or -'),
  baseUrl: httpUrl.nullable(),
  credential: z.string().min(4, 'must be at least 4 characters').max(512, 'must be 512 characters or fewer'),
  adapterConfig: z.record(z.string(), z.unknown()),
  priority: z.number().int().min(0, 'must be 0 or more').max(10_000, 'must be 10000 or less'),
  currency: z
    .string()
    .trim()
    .length(3, 'must be a three-letter currency code')
    .transform((value) => value.toUpperCase()),
  notes: z.string().trim().max(2_000, 'must be 2000 characters or fewer'),
  isActive: z.boolean(),
};

const createSchema = z
  .object({
    name: providerFields.name,
    slug: providerFields.slug,
    adapterKey: providerFields.adapterKey,
    baseUrl: providerFields.baseUrl.optional(),
    credential: providerFields.credential.optional(),
    adapterConfig: providerFields.adapterConfig.optional(),
    priority: providerFields.priority.optional(),
    currency: providerFields.currency.optional(),
    notes: providerFields.notes.optional(),
    isActive: providerFields.isActive.optional(),
  })
  .strict();

const updateSchema = z
  .object({
    name: providerFields.name.optional(),
    slug: providerFields.slug.optional(),
    adapterKey: providerFields.adapterKey.optional(),
    baseUrl: providerFields.baseUrl.optional(),
    credential: providerFields.credential.optional(),
    adapterConfig: providerFields.adapterConfig.optional(),
    priority: providerFields.priority.optional(),
    currency: providerFields.currency.optional(),
    notes: providerFields.notes.optional(),
    isActive: providerFields.isActive.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'provide at least one field to update',
    path: ['(body)'],
  });

const listQuery = z.object({
  includeInactive: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((value) => value === 'true' || value === '1'),
});

const servicesQuery = z.object({
  missing: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((value) => value === 'true' || value === '1'),
});

/**
 * Query validation, mirroring middleware/validate.ts (which supports body and params only — its
 * own comment says query support arrives with the first list endpoint, and this is it). Kept
 * local so the shared middleware is not edited by a phase that does not own it.
 */
const validateQuery =
  <T>(schema: ZodType<T>): RequestHandler =>
  (req, res, next) => {
    const result = schema.safeParse(req.query ?? {});
    if (!result.success) {
      const fields = result.error.issues.map((issue) => ({
        field: issue.path.map(String).join('.') || '(query)',
        message: issue.message,
      }));
      next(
        new AppError('VALIDATION_ERROR', `Query: ${fields[0]?.field ?? '(query)'} — ${fields[0]?.message ?? 'is not valid'}.`, 422, {
          fields,
        }),
      );
      return;
    }
    // Express 5 keeps req.query read-only; handlers read the parsed value from res.locals.
    res.locals.query = result.data;
    next();
  };

/** Express 5 types a path parameter as `string | string[]`; validation rejects anything but one id. */
const idOf = (value: unknown): string => (Array.isArray(value) ? String(value[0] ?? '') : String(value ?? ''));

/** The provider shape a sync run is described with — counts only, never supplier text. */
const syncResponse = (result: Awaited<ReturnType<typeof syncProviderServices>>) => ({
  providerId: result.providerId,
  fetched: result.fetched,
  created: result.created,
  updated: result.updated,
  deactivated: result.deactivated,
  skipped: result.skipped,
  deactivationMode: result.deactivationMode,
  logId: result.logId,
  startedAt: result.startedAt,
  finishedAt: result.finishedAt,
  message: result.message,
});

/** The synced catalogue. `raw` stays server-side: it is supplier data we do not need to publish. */
const publicService = (row: Awaited<ReturnType<typeof listProviderServices>>[number], activeKnown: boolean) => ({
  id: row.id,
  externalServiceId: row.provider_service_id,
  name: row.name,
  type: row.type,
  rateMinor: row.rate_minor === null ? null : Number(row.rate_minor),
  rateCurrency: row.rate_currency,
  minQuantity: row.min_quantity === null ? null : Number(row.min_quantity),
  maxQuantity: row.max_quantity === null ? null : Number(row.max_quantity),
  supportsRefill: row.supports_refill,
  supportsCancel: row.supports_cancel,
  supportsDripFeed: row.supports_drip_feed,
  fetchedAt: row.fetched_at,
  updatedAt: row.updated_at,
  ...(activeKnown ? { isActive: row.is_active ?? true } : {}),
});

export function createProvidersModule(deps: ProvidersDeps): { router: Router } {
  const guards = createAuthGuards(deps.auth);
  const router = Router();

  const view: RequestHandler[] = [guards.requireAuth, guards.requirePermission(PROVIDER_PERMISSIONS.view)];
  const manage: RequestHandler[] = [guards.requireAuth, guards.requirePermission(PROVIDER_PERMISSIONS.manage)];

  /** GET /api/admin/providers — every supplier, active first. */
  router.get('/', ...view, validateQuery(listQuery), async (req, res, next) => {
    try {
      const { includeInactive } = res.locals.query as z.infer<typeof listQuery>;
      const providers = await listProvidersForAdmin({ includeInactive });
      res.json({ success: true, data: { providers, total: providers.length } });
    } catch (error) {
      next(toAuthError(error));
    }
  });

  /** POST /api/admin/providers — add a supplier. The credential is encrypted before it is stored. */
  router.post('/', ...manage, validateBody(createSchema), async (req, res, next) => {
    try {
      const provider = await createProviderForAdmin(req.body as z.infer<typeof createSchema>, {
        registry: deps.registry,
        actorUserId: req.auth?.user.id ?? null,
      });
      res.status(201).json({ success: true, data: { provider } });
    } catch (error) {
      next(toAuthError(error));
    }
  });

  /** GET /api/admin/providers/:id — one supplier. */
  router.get('/:id', ...view, validateParams(idParams), async (req, res, next) => {
    try {
      const provider = await findProviderForAdmin(idOf(req.params.id));
      if (!provider) {
        throw providerError('PROVIDER_NOT_FOUND', 'This supplier does not exist.', 404);
      }
      res.json({ success: true, data: { provider } });
    } catch (error) {
      next(toAuthError(error));
    }
  });

  /** GET /api/admin/providers/:id/credential — can the stored key still be decrypted? */
  router.get('/:id/credential', ...view, validateParams(idParams), async (req, res, next) => {
    try {
      const state = await providerCredentialState(idOf(req.params.id));
      res.json({ success: true, data: { credential: state } });
    } catch (error) {
      next(toAuthError(error));
    }
  });

  /** GET /api/admin/providers/:id/services — the synced catalogue of one supplier. */
  router.get('/:id/services', ...view, validateParams(idParams), validateQuery(servicesQuery), async (req, res, next) => {
    try {
      const activeKnown = await hasProviderServiceActiveFlag();
      const rows = await listProviderServices(idOf(req.params.id));
      const { missing } = res.locals.query as z.infer<typeof servicesQuery>;
      const filtered = missing && activeKnown ? rows.filter((row) => row.is_active === false) : rows;
      res.json({
        success: true,
        data: { services: filtered.map((row) => publicService(row, activeKnown)), total: filtered.length },
      });
    } catch (error) {
      next(toAuthError(error));
    }
  });

  /** PATCH /api/admin/providers/:id — update anything, including rotating the API key. */
  router.patch('/:id', ...manage, validateParams(idParams), validateBody(updateSchema), async (req, res, next) => {
    try {
      const provider = await updateProviderForAdmin(idOf(req.params.id), req.body as z.infer<typeof updateSchema>, {
        registry: deps.registry,
        actorUserId: req.auth?.user.id ?? null,
      });
      res.json({ success: true, data: { provider } });
    } catch (error) {
      next(toAuthError(error));
    }
  });

  /** POST /api/admin/providers/:id/deactivate — stop using a supplier without losing its history. */
  router.post('/:id/deactivate', ...manage, validateParams(idParams), async (req, res, next) => {
    try {
      const provider = await deactivateProviderForAdmin(idOf(req.params.id), {
        actorUserId: req.auth?.user.id ?? null,
      });
      res.json({ success: true, data: { provider } });
    } catch (error) {
      next(toAuthError(error));
    }
  });

  /** POST /api/admin/providers/:id/sync — import the supplier's service list. */
  router.post('/:id/sync', ...manage, validateParams(idParams), async (req, res, next) => {
    try {
      const result = await syncProviderServices(
        { providerId: idOf(req.params.id), startedBy: req.auth?.user.id ?? null },
        { registry: deps.registry, fetchImpl: deps.fetchImpl, logger: deps.logger },
      );
      res.json({ success: true, data: { sync: syncResponse(result) } });
    } catch (error) {
      next(toAuthError(error));
    }
  });

  return { router };
}
