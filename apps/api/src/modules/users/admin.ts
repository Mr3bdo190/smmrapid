import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { AppError } from '../../middleware/error-handler.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { query, queryOne, withTransaction } from '../../lib/db.js';
import { createAuthGuards } from '../auth/middleware.js';
import type { AuthDeps } from '../auth/types.js';

/**
 * The admin view of people.
 *
 * Rules this surface follows, because they are the difference between a panel and a hazard:
 *  - a balance is never writable here (money moves through the wallet's ledger, `wallets.adjust`);
 *  - status and roles are the only account fields an admin can change, each behind its own
 *    permission, and each written to `audit_logs` with the before and after value;
 *  - a suspended account keeps everything it owns: suspension is a status, never a delete.
 */

const listQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  status: z.enum(['active', 'pending', 'suspended', 'deleted']).optional(),
  page: z.coerce.number().int().min(1).max(1000).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

const rolesSchema = z
  .object({ roles: z.array(z.string().trim().min(1).max(60)).max(10) })
  .strict();

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

type AdminUserRow = {
  id: string;
  email: string;
  display_name: string | null;
  status: string;
  email_verified: boolean;
  referral_code: string | null;
  created_at: string;
  balance_minor: string | number | null;
  currency: string | null;
  order_count: string | number;
  ticket_count: string | number;
  total: string | number;
};

const toInt = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
};

const publicUser = (row: AdminUserRow) => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name,
  status: row.status,
  emailVerified: row.email_verified,
  referralCode: row.referral_code,
  createdAt: row.created_at,
  wallet: { balanceMinor: toInt(row.balance_minor), currency: row.currency ?? 'USD' },
  orders: toInt(row.order_count),
  tickets: toInt(row.ticket_count),
});

/** The one query both the list and the detail use, so the panel cannot show two different numbers. */
const USER_SELECT = `
  select u.id, u.email, u.display_name, u.status, u.email_verified, u.referral_code, u.created_at,
         w.balance_minor, w.currency,
         (select count(*) from orders o where o.user_id = u.id) as order_count,
         (select count(*) from tickets t where t.user_id = u.id) as ticket_count,
         count(*) over() as total
    from users u
    left join wallets w on w.user_id = u.id`;

async function audit(
  actorUserId: string,
  action: string,
  entityId: string,
  oldValue: unknown,
  newValue: unknown,
): Promise<void> {
  await query(
    `insert into audit_logs (actor_type, actor_user_id, action, entity_type, entity_id, old_value, new_value)
     values ('admin', $1::uuid, $2, 'user', $3::text, $4, $5)`,
    [actorUserId, action, entityId, oldValue ?? null, newValue ?? null],
  );
}

export function createUsersAdminModule(deps: AuthDeps) {
  const guards = createAuthGuards(deps);
  const adminRouter = Router();

  /** GET /api/admin/users — search, filter by status, paged. */
  adminRouter.get(
    '/',
    adminLimiter,
    guards.requireAuth,
    guards.requirePermission('users.view'),
    validateQuery(listQuerySchema),
    async (req, res, next) => {
      try {
        const { q, status, page = 1, pageSize = 25 } = req.query as unknown as z.infer<typeof listQuerySchema>;
        const rows = await query<AdminUserRow>(
          `${USER_SELECT}
            where ($1::text is null or u.email ilike '%' || $1::text || '%'
                                     or coalesce(u.display_name, '') ilike '%' || $1::text || '%')
              and ($2::text is null or u.status::text = $2::text)
            order by u.created_at desc
            limit $3 offset $4`,
          [q ?? null, status ?? null, pageSize, (page - 1) * pageSize],
        );
        res.json({
          success: true,
          data: {
            users: rows.map(publicUser),
            total: rows.length > 0 ? toInt(rows[0]!.total) : 0,
            page,
            pageSize,
          },
        });
      } catch (error) {
        next(error);
      }
    },
  );

  /** GET /api/admin/users/:id — the account, its wallet, its roles and its audit trail. */
  adminRouter.get(
    '/:id',
    adminLimiter,
    guards.requireAuth,
    guards.requirePermission('users.view'),
    async (req, res, next) => {
      try {
        const id = String(req.params.id ?? '');
        if (!/^[0-9a-f-]{36}$/i.test(id)) {
          throw new AppError('VALIDATION_ERROR', 'Path: id — must be a uuid', 422, {
            fields: [{ field: 'id', message: 'must be a uuid' }],
          });
        }

        const row = await queryOne<AdminUserRow>(`${USER_SELECT} where u.id = $1::uuid`, [id]);
        if (!row) throw new AppError('USER_NOT_FOUND', 'That account does not exist.', 404);

        const roles = await query<{ key: string }>(
          `select r.key from user_roles ur join roles r on r.id = ur.role_id where ur.user_id = $1::uuid order by r.key`,
          [id],
        );
        const auditTrail = await query<{ action: string; created_at: string; actor_user_id: string | null }>(
          `select action, created_at, actor_user_id from audit_logs
            where entity_type = 'user' and entity_id = $1::text order by created_at desc limit 20`,
          [id],
        );

        res.json({
          success: true,
          data: {
            user: publicUser(row),
            roles: roles.map((entry) => entry.key),
            auditTrail: auditTrail.map((entry) => ({
              action: entry.action,
              createdAt: entry.created_at,
              actorUserId: entry.actor_user_id,
            })),
          },
        });
      } catch (error) {
        next(error);
      }
    },
  );

  /** POST /api/admin/users/:id/suspend — reversible, never destructive. */
  adminRouter.post(
    '/:id/suspend',
    adminLimiter,
    guards.requireAuth,
    guards.requirePermission('users.suspend'),
    async (req, res, next) => {
      try {
        const id = String(req.params.id ?? '');
        const actor = req.auth!.user.id;
        if (id === actor) {
          throw new AppError('CANNOT_TARGET_SELF', 'You cannot suspend your own account.', 409);
        }

        const current = await queryOne<{ status: string }>(`select status from users where id = $1::uuid`, [id]);
        if (!current) throw new AppError('USER_NOT_FOUND', 'That account does not exist.', 404);
        if (current.status === 'suspended') {
          res.json({ success: true, data: { user: { id, status: 'suspended' }, changed: false } });
          return;
        }

        const updated = await queryOne<{ id: string; status: string }>(
          `update users set status = 'suspended', updated_at = now() where id = $1::uuid returning id, status`,
          [id],
        );
        await audit(actor, 'USER_SUSPEND', id, { status: current.status }, { status: 'suspended' });
        res.json({ success: true, data: { user: updated, changed: true } });
      } catch (error) {
        next(error);
      }
    },
  );

  /** POST /api/admin/users/:id/reactivate */
  adminRouter.post(
    '/:id/reactivate',
    adminLimiter,
    guards.requireAuth,
    guards.requirePermission('users.suspend'),
    async (req, res, next) => {
      try {
        const id = String(req.params.id ?? '');
        const current = await queryOne<{ status: string }>(`select status from users where id = $1::uuid`, [id]);
        if (!current) throw new AppError('USER_NOT_FOUND', 'That account does not exist.', 404);

        const updated = await queryOne<{ id: string; status: string }>(
          `update users set status = 'active', updated_at = now() where id = $1::uuid returning id, status`,
          [id],
        );
        await audit(req.auth!.user.id, 'USER_REACTIVATE', id, { status: current.status }, { status: 'active' });
        res.json({ success: true, data: { user: updated, changed: current.status !== 'active' } });
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * POST /api/admin/users/:id/roles — replaces the role set, in one transaction.
   *
   * Replacing rather than adding keeps the panel's meaning simple ("this is who they are now"), and
   * an unknown role key is refused instead of silently ignored — a typo must not quietly demote
   * someone to no permissions at all.
   */
  adminRouter.post(
    '/:id/roles',
    adminLimiter,
    guards.requireAuth,
    guards.requirePermission('users.roles'),
    validateBody(rolesSchema),
    async (req, res, next) => {
      try {
        const id = String(req.params.id ?? '');
        const { roles } = req.body as z.infer<typeof rolesSchema>;
        const actor = req.auth!.user.id;

        const known = await query<{ key: string }>(`select key from roles where key = any($1::text[])`, [roles]);
        if (known.length !== roles.length) {
          const missing = roles.filter((key) => !known.some((role) => role.key === key));
          throw new AppError('UNKNOWN_ROLE', `Unknown role: ${missing.join(', ')}`, 422, {
            fields: missing.map((key) => ({ field: 'roles', message: `unknown role "${key}"` })),
          });
        }

        const before = await query<{ key: string }>(
          `select r.key from user_roles ur join roles r on r.id = ur.role_id where ur.user_id = $1::uuid`,
          [id],
        );

        const applied = await withTransaction(async (tx) => {
          await tx.query(`delete from user_roles where user_id = $1::uuid`, [id]);
          for (const key of roles) {
            await tx.query(
              `insert into user_roles (user_id, role_id, granted_by)
               select $1::uuid, r.id, $2::uuid from roles r where r.key = $3`,
              [id, actor, key],
            );
          }
          const result = await tx.query<{ key: string }>(
            `select r.key from user_roles ur join roles r on r.id = ur.role_id where ur.user_id = $1::uuid order by r.key`,
            [id],
          );
          return result.rows;
        });

        await audit(actor, 'USER_ROLES_SET', id, { roles: before.map((entry) => entry.key) }, { roles });
        res.json({ success: true, data: { roles: applied.map((entry) => entry.key) } });
      } catch (error) {
        next(error);
      }
    },
  );

  return { adminRouter };
}
