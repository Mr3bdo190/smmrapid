/**
 * Wallet & ledger — HTTP surface.
 *
 * Two read-only endpoints for the signed-in customer:
 *   GET /api/wallet               → balance, currency, pending amount, last update
 *   GET /api/wallet/transactions  → paged ledger, newest first
 *
 * There is deliberately NO write endpoint here: a balance only moves inside the server
 * (orders, payments, refunds, admin adjustments) through `applyWalletMovement()`, which writes
 * the ledger row and the balance together. A client cannot set a balance, and no request field
 * is ever trusted as an amount that is already credited.
 *
 * Every failure answers with one of the codes catalogued in `docs/ERROR_CODES.md`:
 * `WALLET_INVALID_CURSOR` for an unusable list position, the shared `VALIDATION_ERROR` for
 * anything else malformed — never a database, driver or provider message.
 */

import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../middleware/error-handler.js';
import { createAuthGuards } from '../auth/middleware.js';
import type { WalletListParams, WalletModuleDeps } from './types.js';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Query validation.
 *
 * Same contract as `validateBody`/`validateParams` (middleware/validate.ts): a bad value answers
 * 422 VALIDATION_ERROR with the offending fields. `req.query` is typed by Express as unknown
 * input (a client can send `?limit=1&limit=2`, which arrives as an array), so it is parsed with
 * a schema exactly like a body would be.
 */
const listQuerySchema = z.object({
  cursor: z
    .string()
    .trim()
    .regex(/^\d+$/, 'must be the id of the last transaction you received (a whole number)')
    .optional(),
  limit: z
    .string()
    .trim()
    .regex(/^\d+$/, `must be a whole number between 1 and ${MAX_PAGE_SIZE}`)
    .optional(),
});

function invalidCursor(message: string): AppError {
  return new AppError(
    'WALLET_INVALID_CURSOR',
    'نقطة القراءة اللي كنت واقف عندها مبقتش صالحة، فعرضنا الصفحة اللي بعدها لسه. حدّث القائمة وابدأ من الأول. '
      + '(That list position is no longer valid — we did not show the next page. Reload the list and start again.)',
    422,
    { fields: [{ field: 'cursor', message }] },
  );
}

/** A page size the API does not serve is a malformed request, like any other invalid field. */
function invalidLimit(message: string): AppError {
  return new AppError(
    'VALIDATION_ERROR',
    'في بيانات ناقصة أو غير صحيحة في الطلب، فما عرضناش أي حركات. صحّح البيانات المعلَّمة وابعت الطلب تاني. '
      + '(A request field was rejected — nothing was shown. Correct the highlighted field and send it again.)',
    422,
    { fields: [{ field: 'limit', message }] },
  );
}

/** Parses `?cursor=&limit=`, returning integers — the params the wallet data layer expects. */
export function parseListQuery(query: unknown): Pick<WalletListParams, 'cursor' | 'limit'> {
  const result = listQuerySchema.safeParse(query ?? {});
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue?.path.join('.') ?? '';
    const message = issue?.message ?? 'is not valid';
    throw field === 'cursor' ? invalidCursor(message) : invalidLimit(message);
  }

  const limit = result.data.limit === undefined ? DEFAULT_PAGE_SIZE : Number(result.data.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    throw invalidLimit(`must be between 1 and ${MAX_PAGE_SIZE}`);
  }

  if (result.data.cursor === undefined) return { cursor: null, limit };

  const cursor = Number(result.data.cursor);
  if (!Number.isSafeInteger(cursor) || cursor <= 0) {
    throw invalidCursor('must be a whole number greater than zero');
  }

  return { cursor, limit };
}

export function createWalletModule(deps: WalletModuleDeps) {
  const guards = createAuthGuards(deps.auth);
  const router = Router();

  /**
   * GET /api/wallet — the funds screen header.
   *
   * `balanceMinor` / `pendingMinor` are integers in minor units (cents); the client formats them
   * and shows the currency code as it is.
   */
  router.get('/', guards.requireAuth, async (req, res, next) => {
    try {
      const summary = await deps.wallet.loadSummary(req.auth!.user.id);
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/wallet/transactions?limit=&cursor= — the ledger, newest first.
   *
   * `cursor` is the `id` of the last row the client has; the next page is everything older.
   * Ids are monotonic, so a page never duplicates or skips a movement.
   */
  router.get('/transactions', guards.requireAuth, async (req, res, next) => {
    try {
      const { cursor, limit } = parseListQuery(req.query);
      const page = await deps.wallet.listTransactions({ userId: req.auth!.user.id, cursor, limit });
      res.json({ success: true, data: page });
    } catch (error) {
      next(error);
    }
  });

  return { router, guards };
}
