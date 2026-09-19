/**
 * Wallet & ledger — data layer.
 *
 * Reads are plain queries against `wallets` / `wallet_transactions`.
 * There is exactly ONE write path: `applyWalletMovement()`, which calls the database function
 * `wallet_apply()` inside a transaction. That function locks the wallet, refuses a negative
 * balance, updates `wallets.balance_minor` and writes the ledger row in the same statement
 * group — so a balance can never move without its ledger row, and a direct UPDATE of
 * `wallets.balance_minor` is rejected by the trigger in migration 0003 with errcode 23514.
 * No code here ever updates the wallet balance itself.
 *
 * Every failure becomes one of the codes listed in `docs/ERROR_CODES.md` (the contract with the
 * customer): a database, driver or provider message is never the message a customer reads.
 */

import { query, queryOne, withTransaction } from '../../lib/db.js';
import { AppError } from '../../middleware/error-handler.js';
import type {
  AppliedMovement,
  ApplyWalletMovementInput,
  DbWallet,
  DbWalletTransaction,
  WalletDeps,
  WalletDirection,
  WalletListParams,
  WalletPage,
  WalletSummary,
  WalletTransaction,
  WalletTxType,
} from './types.js';

/** Mirrors the `wallet_direction` enum. */
const DIRECTIONS: readonly string[] = ['credit', 'debit'];

/** Mirrors the `wallet_tx_type` enum (0001_initial_schema.sql). */
const TX_TYPES: readonly string[] = [
  'payment',
  'order_charge',
  'order_refund',
  'manual_adjustment',
  'bonus',
  'affiliate_commission',
  'withdrawal',
  'fee',
];

/**
 * The largest amount a single movement may carry.
 *
 * This is an integrity ceiling, not a customer limit: `wallets.balance_minor` and
 * `wallet_transactions.amount_minor` are bigint columns, but JavaScript cannot represent an
 * integer above `Number.MAX_SAFE_INTEGER` exactly — accepting one would write a balance this
 * API could no longer report faithfully. Anything above it is refused with WALLET_LIMIT_EXCEEDED
 * before a single row is touched.
 */
export const MAX_MOVEMENT_MINOR = Number.MAX_SAFE_INTEGER;

/**
 * bigint columns are delivered as strings by node-postgres; `numeric`-style values would be
 * floats. This converts either into a plain integer and refuses anything that is not whole, so a
 * fractional amount can never reach a response (money is integer minor units, always).
 */
export function minorUnits(value: string | number | bigint | null | undefined, field: string): number {
  if (value === null || value === undefined) return 0;
  const text = typeof value === 'bigint' ? value.toString() : String(value).trim();
  if (!/^-?\d+$/.test(text)) {
    throw new Error(`wallet: ${field} is "${text}", which is not an integer number of minor units`);
  }
  const result = Number(text);
  if (!Number.isSafeInteger(result)) {
    throw new Error(`wallet: ${field} is ${text}, which is outside the safe integer range`);
  }
  return result;
}

/** timestamptz values come back as Date objects; the API speaks ISO 8601 strings. */
export function isoInstant(value: string | Date | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/** Ledger row → the shape the client receives (signed amount, camelCase, ISO date). */
export function toPublicTransaction(row: DbWalletTransaction): WalletTransaction {
  const magnitude = minorUnits(row.amount_minor, 'amount_minor');
  return {
    id: String(row.id),
    direction: row.direction,
    type: row.type,
    amountMinor: row.direction === 'debit' ? -magnitude : magnitude,
    balanceAfterMinor: minorUnits(row.balance_after_minor, 'balance_after_minor'),
    currency: row.currency,
    description: row.description,
    createdAt: isoInstant(row.created_at) ?? '',
    orderId: row.order_id,
    paymentId: row.payment_id,
    commissionId: row.commission_id,
    idempotencyKey: row.idempotency_key,
  };
}

/**
 * Balance + currency + when it last moved, plus the money the customer has requested but that is
 * not credited yet (pending top-ups in `payments`). The schema stores no separate "held" column
 * on the wallet — a pending payment is exactly what the customer sees as in-flight, and the
 * ledger is the only place a credited amount can come from.
 */
export async function loadWalletSummary(userId: string): Promise<WalletSummary> {
  const wallet = await queryOne<Pick<DbWallet, 'currency' | 'balance_minor' | 'updated_at'>>(
    'select currency, balance_minor, updated_at from wallets where user_id = $1',
    [userId],
  ).catch((error: unknown) => {
    throw toWalletError(error);
  });

  if (!wallet) {
    throw new AppError(
      'WALLET_NOT_FOUND',
      'المحفظة مش جاهزة على حسابك لسه، وما اتخصمش أي مبلغ. سجّل دخول من جديد ونجهّزها، ولو فضلت زي ما هي كلّم الدعم. '
        + '(Your wallet is not ready yet — nothing was charged. Sign in again, or contact support.)',
      404,
    );
  }

  const pending = await queryOne<{ pending_minor: string | number }>(
    `select coalesce(sum(amount_minor), 0) as pending_minor
       from payments
      where user_id = $1 and status = 'pending'`,
    [userId],
  ).catch((error: unknown) => {
    throw toWalletError(error);
  });

  return {
    balanceMinor: minorUnits(wallet.balance_minor, 'balance_minor'),
    currency: wallet.currency,
    pendingMinor: minorUnits(pending?.pending_minor ?? 0, 'pending_minor'),
    updatedAt: isoInstant(wallet.updated_at),
  };
}

/**
 * One page of the ledger, newest first.
 *
 * Paging is by `id` (a monotonic bigint identity), never by `created_at`: `id < cursor` is
 * unambiguous, so two movements written in the same millisecond still page without duplicates
 * or gaps. `limit + 1` rows are fetched to know whether another page exists without a second
 * query (or a COUNT over the whole ledger).
 */
export async function listWalletTransactions({ userId, cursor, limit }: WalletListParams): Promise<WalletPage> {
  const rows = await query<DbWalletTransaction>(
    `select id, direction, type, amount_minor, balance_after_minor, currency, description,
            order_id, payment_id, commission_id, idempotency_key, created_at
       from wallet_transactions
      where user_id = $1
        and ($2::bigint is null or id < $2::bigint)
      order by id desc
      limit $3`,
    [userId, cursor, limit + 1],
  ).catch((error: unknown) => {
    throw toWalletError(error);
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const transactions = page.map(toPublicTransaction);
  const last = transactions.at(-1);

  return {
    transactions,
    hasMore,
    nextCursor: hasMore && last ? last.id : null,
  };
}

/**
 * THE write path. Calls `wallet_apply()` — the atomic database function — inside a transaction
 * and returns the movement it wrote.
 *
 * Guarantees inherited from the database:
 *  - the wallet row is locked `for update`, so two concurrent movements serialise;
 *  - a debit that would go below zero raises 23514 → WALLET_INSUFFICIENT_FUNDS, and the whole
 *    transaction (balance + ledger row) rolls back: no partial write;
 *  - exactly one ledger row is written per movement, in the same transaction as the balance, so
 *    a failure to write the ledger row also undoes the balance change;
 *  - a repeated `idempotencyKey` returns the original row instead of moving money twice (the
 *    returned `balanceAfterMinor` is then the balance as of that original movement — read
 *    `loadWalletSummary()` when the current one is needed).
 *
 * Exported for the phases that need it (payments, orders, refunds, referrals). The HTTP layer
 * deliberately has no route that reaches it: a client can never name a new balance.
 */
export async function applyWalletMovement(input: ApplyWalletMovementInput): Promise<AppliedMovement> {
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw invalidAmount();
  }
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor > MAX_MOVEMENT_MINOR) {
    throw new AppError(
      'WALLET_LIMIT_EXCEEDED',
      'المبلغ أكبر من أكبر مبلغ ينفع يتحرك في عملية واحدة، وما اتحركش أي مبلغ. قسّمه على أكتر من عملية، ولو محتاج حد أعلى كلّم الدعم. '
        + '(That amount is above the limit for a single movement — nothing moved. Split it, or contact support.)',
      422,
      { maxAmountMinor: MAX_MOVEMENT_MINOR },
    );
  }
  if (!DIRECTIONS.includes(input.direction)) {
    throw invalidMovement('direction', DIRECTIONS);
  }
  if (!TX_TYPES.includes(input.type)) {
    throw invalidMovement('type', TX_TYPES);
  }

  try {
    return await withTransaction(async (client) => {
      const result = await client.query<DbWalletTransaction>(
        `select * from wallet_apply(
           $1::uuid, $2::wallet_direction, $3::wallet_tx_type, $4::bigint, $5::text, $6::text,
           $7::uuid, $8::uuid, $9::uuid, $10::uuid, $11::jsonb)`,
        [
          input.userId,
          input.direction,
          input.type,
          input.amountMinor,
          input.description ?? null,
          input.idempotencyKey ?? null,
          input.orderId ?? null,
          input.paymentId ?? null,
          input.commissionId ?? null,
          input.actorUserId ?? null,
          input.metadata ? JSON.stringify(input.metadata) : null,
        ],
      );

      const row = result.rows[0];
      if (!row) throw new Error('wallet_apply returned no row');

      return {
        transactionId: String(row.id),
        userId: row.user_id,
        direction: row.direction,
        type: row.type,
        amountMinor: minorUnits(row.amount_minor, 'amount_minor'),
        balanceAfterMinor: minorUnits(row.balance_after_minor, 'balance_after_minor'),
        currency: row.currency,
        createdAt: isoInstant(row.created_at) ?? '',
      } satisfies AppliedMovement;
    });
  } catch (error) {
    throw toWalletError(error);
  }
}

function invalidAmount(): AppError {
  return new AppError(
    'VALIDATION_ERROR',
    'المبلغ غير مقبول، وما اتحركش أي مبلغ. المبلغ لازم يكون رقم صحيح بالموجب بالوحدات الصغرى (مثال: 2500 يعني 25.00 دولار). '
      + '(The amount was rejected — nothing moved. It must be a positive whole number of minor units — 2500 means 25.00.)',
    422,
    { fields: [{ field: 'amountMinor', message: 'must be a positive integer number of minor units' }] },
  );
}

function invalidMovement(field: string, allowed: readonly string[]): AppError {
  return new AppError(
    'VALIDATION_ERROR',
    'بيانات الحركة غير صحيحة، وما اتحركش أي مبلغ. راجع الطلب من جديد. '
      + '(The movement details are not valid — nothing moved.)',
    422,
    { fields: [{ field, message: `must be one of ${allowed.join(', ')}` }] },
  );
}

/**
 * Turns a database failure into one of the documented customer-facing codes.
 *
 * Matching on `code` as well as `instanceof` matters because each build entry bundles its own
 * copy of these classes (see the same note in modules/auth/middleware.ts). Every branch builds a
 * NEW AppError: the database's own wording ("wallet_apply: insufficient balance — available 0,
 * requested 1001", a driver message, a SQLSTATE) is never passed on to the client.
 */
export function toWalletError(error: unknown): unknown {
  if (error instanceof AppError) return error;

  const marker = typeof (error as { code?: unknown })?.code === 'string' ? String((error as { code: string }).code) : '';
  const message = error instanceof Error ? error.message : String(error);

  if (marker === '23514' && /insufficient/i.test(message)) {
    return new AppError(
      'WALLET_INSUFFICIENT_FUNDS',
      'رصيدك مش كافي للعملية دي، وما اتخصمش أي مبلغ. أضف رصيدًا للمحفظة أو قلّل المبلغ، وبعدين جرّب تاني. '
        + '(Insufficient balance — nothing was charged. Top up your wallet or lower the amount, then try again.)',
      409,
    );
  }

  if (marker === 'P0002' || /no wallet exists/i.test(message)) {
    return new AppError(
      'WALLET_NOT_FOUND',
      'المحفظة مش جاهزة على حسابك لسه، وما اتخصمش أي مبلغ. سجّل دخول من جديد ونجهّزها، ولو فضلت زي ما هي كلّم الدعم. '
        + '(No wallet for this account — nothing was charged. Sign in again, or contact support.)',
      404,
    );
  }

  if (marker === '22023') {
    return invalidAmount();
  }

  if (marker === '23514' || marker === '23503' || marker === '42501') {
    // the balance guard, a broken reference or the append-only ledger refused the movement: the
    // caller asked for something the money rules do not allow, and nothing was written
    return new AppError(
      'WALLET_MOVEMENT_REJECTED',
      'دفتر الحسابات رفض الحركة دي، وما اتخصمش وما اتضافش أي مبلغ. جرّب مرة تانية، ولو اترفضت تاني كلّم الدعم مع رقم المرجع. '
        + '(The ledger refused this movement — nothing was charged or added. Try once more; if it is refused again, contact support with the reference.)',
      409,
    );
  }

  // the database itself is unreachable or the credentials are wrong — never the driver's message
  if (marker === 'DB_NOT_CONFIGURED' || marker === '57P03' || marker === '3D000' || isConnectionFailure(message)) {
    return new AppError(
      'DB_UNAVAILABLE',
      'الخدمة مش متاحة لحظة، وما اتحركش أي مبلغ. استنى دقيقة وجرّب تاني. '
        + '(The service is unavailable for a moment — nothing moved. Wait a minute and try again.)',
      503,
    );
  }

  // unknown failure: keep it for the log. The global handler answers a neutral 500 + ref, so the
  // raw database text still never reaches a customer.
  return error;
}

function isConnectionFailure(message: string): boolean {
  return /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EHOSTUNREACH|ECONNRESET|terminating connection|Connection terminated|could not connect|password authentication failed|database system is starting up|too many clients/i.test(
    message,
  );
}

/** The database-backed `WalletDeps` — what `registerRoutes` injects. */
export const walletDbDeps: WalletDeps = {
  loadSummary: loadWalletSummary,
  listTransactions: listWalletTransactions,
  applyMovement: applyWalletMovement,
};

/** Convenience re-export so callers can name the enums without importing types.js. */
export type { WalletDirection, WalletTxType };
