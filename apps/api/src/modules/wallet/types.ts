/**
 * Wallet & ledger — types.
 *
 * The SQL schema (database/migrations/0001_initial_schema.sql §wallet & ledger and
 * database/migrations/0003_wallet_ledger.sql) is the contract: the database row types below
 * mirror its column names exactly, and `wallet_apply(...)` is the only way money moves.
 *
 * Money rules encoded here:
 *  - every amount is an integer number of minor units (cents); the API never returns a float;
 *  - the ledger is append-only and each row carries `balance_after_minor`, so history is
 *    auditable and reconcilable against `wallet_reconciliation`;
 *  - `amountMinor` in the public shape is *signed* (credit positive, debit negative) while the
 *    database stores a positive `amount_minor` plus a `direction`.
 */

import type { AuthDeps } from '../auth/types.js';

/** `wallet_direction` enum. */
export type WalletDirection = 'credit' | 'debit';

/** `wallet_tx_type` enum. */
export type WalletTxType =
  | 'payment'
  | 'order_charge'
  | 'order_refund'
  | 'manual_adjustment'
  | 'bonus'
  | 'affiliate_commission'
  | 'withdrawal'
  | 'fee';

/** A `wallets` row. `bigint` columns arrive from node-postgres as strings. */
export type DbWallet = {
  id: string;
  user_id: string;
  currency: string;
  balance_minor: string | number;
  version: string | number;
  created_at: string | Date;
  updated_at: string | Date;
};

/** A `wallet_transactions` row. `id` is a bigint identity, delivered as a string. */
export type DbWalletTransaction = {
  id: string;
  wallet_id: string;
  user_id: string;
  direction: WalletDirection;
  type: WalletTxType;
  amount_minor: string | number;
  balance_after_minor: string | number;
  currency: string;
  description: string | null;
  order_id: string | null;
  payment_id: string | null;
  commission_id: string | null;
  idempotency_key: string | null;
  actor_user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | Date;
};

/** What the customer sees on the funds screen. All amounts are integer minor units. */
export type WalletSummary = {
  /** Spendable balance, straight from the wallet row (a cache of the ledger). */
  balanceMinor: number;
  currency: string;
  /** Money requested or paid but not credited yet (pending top-ups), in minor units. */
  pendingMinor: number;
  updatedAt: string | null;
};

/** One ledger movement, safe to send to the browser. */
export type WalletTransaction = {
  id: string;
  direction: WalletDirection;
  type: WalletTxType;
  /** Signed: a credit is positive, a debit is negative. Always an integer. */
  amountMinor: number;
  balanceAfterMinor: number;
  currency: string;
  description: string | null;
  createdAt: string;
  /** References the schema stores, when the movement came from one of them. */
  orderId: string | null;
  paymentId: string | null;
  commissionId: string | null;
  idempotencyKey: string | null;
};

/** A page of ledger rows, newest first, with an id-based cursor. */
export type WalletPage = {
  transactions: WalletTransaction[];
  /** The `id` to pass as `?cursor=` for the next page; null when there is none. */
  nextCursor: string | null;
  hasMore: boolean;
};

export type WalletListParams = {
  userId: string;
  /** Exclusive upper bound on `wallet_transactions.id` (ids are monotonic). */
  cursor: number | null;
  limit: number;
};

/**
 * The only way to move money: one atomic call to `wallet_apply()`.
 * Later phases (orders, payments, refunds, referrals) call this — never a balance UPDATE.
 */
export type ApplyWalletMovementInput = {
  userId: string;
  direction: WalletDirection;
  type: WalletTxType;
  /** Positive integer minor units — the database rejects anything else. */
  amountMinor: number;
  description?: string | null;
  /** Replaying the same key returns the original movement instead of moving money twice. */
  idempotencyKey?: string | null;
  orderId?: string | null;
  paymentId?: string | null;
  commissionId?: string | null;
  actorUserId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type AppliedMovement = {
  transactionId: string;
  userId: string;
  direction: WalletDirection;
  type: WalletTxType;
  /** Positive minor units as stored (use `direction` to know the sign). */
  amountMinor: number;
  /** The balance right after this movement — the ledger row's `balance_after_minor`. */
  balanceAfterMinor: number;
  currency: string;
  createdAt: string;
};

/**
 * The wallet data surface, injectable exactly like `AuthDeps` so the HTTP routes can be driven
 * with fakes. The database implementation lives in `service.ts` (`walletDbDeps`).
 */
export type WalletDeps = {
  loadSummary: (userId: string) => Promise<WalletSummary>;
  listTransactions: (params: WalletListParams) => Promise<WalletPage>;
  applyMovement: (input: ApplyWalletMovementInput) => Promise<AppliedMovement>;
};

/** What `createWalletModule()` needs: the auth guard and the wallet data layer. */
export type WalletModuleDeps = {
  auth: AuthDeps;
  wallet: WalletDeps;
};
