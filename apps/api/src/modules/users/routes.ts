import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../../middleware/validate.js';
import { query, queryOne } from '../../lib/db.js';
import { createAuthGuards } from '../auth/middleware.js';
import type { AuthDeps } from '../auth/types.js';

/**
 * The customer's own profile.
 *
 * Only these fields are writable from the client: display name, locale, timezone, phone,
 * country and company, plus the onboarding flags. Everything else on the account (status,
 * balance, roles, referral code) is server-owned by design.
 */
const updateSchema = z
  .object({
    displayName: z.string().trim().min(2, 'must be at least 2 characters').max(60, 'must be 60 characters or fewer').optional(),
    locale: z.enum(['ar', 'en']).optional(),
    timezone: z.string().trim().min(3).max(60).optional(),
    phone: z.string().trim().max(20).optional(),
    countryCode: z
      .string()
      .trim()
      .length(2, 'must be a two-letter country code')
      .transform((value) => value.toUpperCase())
      .optional(),
    company: z.string().trim().max(120).optional(),
    completeOnboarding: z.literal(true).optional(),
    dismissTour: z.literal(true).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'provide at least one field to update',
    path: ['(body)'],
  });

type ProfileRow = {
  locale: string;
  timezone: string;
  phone: string | null;
  country_code: string | null;
  company: string | null;
  onboarding_completed_at: string | null;
  tour_dismissed_at: string | null;
};

const publicProfile = (row: ProfileRow) => ({
  locale: row.locale,
  timezone: row.timezone,
  phone: row.phone,
  countryCode: row.country_code,
  company: row.company,
  onboardingCompletedAt: row.onboarding_completed_at,
  tourDismissedAt: row.tour_dismissed_at,
});

export function createUsersModule(deps: AuthDeps) {
  const guards = createAuthGuards(deps);
  const router = Router();

  /** GET /api/users/me — the profile half of the account view. */
  router.get('/me', guards.requireAuth, async (req, res, next) => {
    try {
      const profile = await queryOne<ProfileRow>(
        `select locale, timezone, phone, country_code, company, onboarding_completed_at, tour_dismissed_at
           from user_profiles where user_id = $1`,
        [req.auth!.user.id],
      );
      res.json({ success: true, data: { profile: profile ? publicProfile(profile) : null } });
    } catch (error) {
      next(error);
    }
  });

  /** PATCH /api/users/me — validated update, always audited. */
  router.patch('/me', guards.requireAuth, validateBody(updateSchema), async (req, res, next) => {
    try {
      const userId = req.auth!.user.id;
      const body = req.body as z.infer<typeof updateSchema>;

      const before = await queryOne<ProfileRow & { display_name: string | null }>(
        `select p.locale, p.timezone, p.phone, p.country_code, p.company,
                p.onboarding_completed_at, p.tour_dismissed_at, u.display_name
           from user_profiles p join users u on u.id = p.user_id
          where p.user_id = $1`,
        [userId],
      );

      const profile = await queryOne<ProfileRow>(
        `insert into user_profiles (user_id, locale, timezone, phone, country_code, company,
                                    onboarding_completed_at, tour_dismissed_at)
         values ($1,
                 coalesce($2, 'ar'), coalesce($3, 'Africa/Cairo'), $4, $5, $6,
                 case when $7 then now() else null end,
                 case when $8 then now() else null end)
         on conflict (user_id) do update set
           locale        = coalesce($2, user_profiles.locale),
           timezone      = coalesce($3, user_profiles.timezone),
           phone         = coalesce($4, user_profiles.phone),
           country_code  = coalesce($5, user_profiles.country_code),
           company       = coalesce($6, user_profiles.company),
           onboarding_completed_at = case when $7 then now() else user_profiles.onboarding_completed_at end,
           tour_dismissed_at       = case when $8 then now() else user_profiles.tour_dismissed_at end,
           updated_at    = now()
         returning locale, timezone, phone, country_code, company,
                   onboarding_completed_at, tour_dismissed_at`,
        [
          userId,
          body.locale ?? null,
          body.timezone ?? null,
          body.phone ?? null,
          body.countryCode ?? null,
          body.company ?? null,
          body.completeOnboarding === true,
          body.dismissTour === true,
        ],
      );

      if (body.displayName !== undefined) {
        await query('update users set display_name = $1, updated_at = now() where id = $2', [body.displayName, userId]);
      }

      await query(
        `insert into audit_logs (actor_type, actor_user_id, action, entity_type, entity_id, old_value, new_value)
         values ('user', $1::uuid, 'PROFILE_UPDATE', 'user', $1::text, $2, $3)`,
        [
          userId,
          before ? { displayName: before.display_name, locale: before.locale, timezone: before.timezone } : null,
          { displayName: body.displayName ?? before?.display_name ?? null, ...(profile ? publicProfile(profile) : {}) },
        ],
      );

      res.json({ success: true, data: { profile: profile ? publicProfile(profile) : null } });
    } catch (error) {
      next(error);
    }
  });

  return { router };
}
