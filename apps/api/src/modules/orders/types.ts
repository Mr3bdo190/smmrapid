import type { PoolClient } from 'pg';
import type { AppliedMovement, ApplyWalletMovementInput } from '../wallet/types.js';
import type { AuthDeps } from '../auth/types.js';
import type { PricingQuote, QuoteRequest } from '../pricing/types.js';

/**
 * Orders.
 *
 * An order is the only place a customer's money is committed, so creating one is a single database
 * transaction: the order row, the wallet movement and the ledger row commit together or not at
 * all. Nothing in here trusts a price from the client — the charge comes from the pricing engine,
 * and the quote is always re-derived server-side.
 */

/** The database enum, in the order it appears in the schema. */
export const ORDER_STATUSES = [
  'pending',
  'processing',
  'in_progress',
  'completed',
  'partial',
  'canceled',
  'failed',
  'refunded',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** A status that still expects something to happen — used to block duplicate submissions. */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = ['pending', 'processing', 'in_progress'];

export type DbOrder = {
  id: string;
  public_id: string;
  user_id: string;
  service_id: string;
  variant_id: string | null;
  provider_id: string | null;
  provider_order_id: string | null;
  coupon_id: string | null;
  status: OrderStatus;
  target: string;
  quantity: string | number;
  charge_minor: string | number;
  discount_minor: string | number;
  provider_cost_minor: string | number;
  profit_minor: string | number | null;
  refunded_minor: string | number;
  start_count: string | number | null;
  remains: string | number | null;
  drip_feed: boolean;
  runs_at: string | Date | null;
  idempotency_key: string | null;
  provider_error: string | null;
  created_at: string | Date;
  updated_at: string | Date;
  completed_at: string | Date | null;
};

/** What a customer may see about their own order. Provider economics stay out of this shape. */
export type PublicOrder = {
  publicId: string;
  status: OrderStatus;
  service: { slug: string; name: string; nameAr: string | null };
  variant: { id: string; name: string } | null;
  target: string;
  quantity: number;
  chargeMinor: number;
  discountMinor: number;
  /** What the wallet was debited: charge − discount. */
  totalMinor: number;
  refundedMinor: number;
  currency: string;
  dripFeed: boolean;
  startCount: number | null;
  remains: number | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type OrderTimelineEntry = {
  from: OrderStatus | null;
  to: OrderStatus;
  source: 'system' | 'admin' | 'provider' | 'user';
  note: string | null;
  at: string;
};

export type OrderDetail = PublicOrder & { timeline: OrderTimelineEntry[] };

export type CreateOrderInput = {
  userId: string;
  /** Exactly one of these identifies the service, like the pricing quote. */
  serviceSlug?: string;
  serviceId?: string;
  variantId?: string | null;
  target: string;
  quantity: number;
  couponCode?: string | null;
  /** Replaying the same key returns the original order instead of charging twice. */
  idempotencyKey?: string | null;
  dripFeed?: boolean;
  runsAt?: string | null;
};

export type CreateOrderResult = { order: PublicOrder; replayed: boolean };

export type OrderListPage = { orders: PublicOrder[]; nextCursor: string | null };

export type OrderListParams = { userId: string; cursor?: string | null; limit?: number; status?: OrderStatus | null };

/** What the client needs to place the same order again, priced as of now. */
export type RepeatOrderResult = {
  repeatable: boolean;
  prefill: { serviceSlug: string; variantId: string | null; target: string; quantity: number } | null;
  quote: PricingQuote | null;
};

/**
 * The two things an order needs from other modules. Both are injected so the HTTP surface can be
 * driven with fakes, and so the money rules live in exactly one place each.
 */
export type OrderDeps = {
  quote: (request: QuoteRequest) => Promise<PricingQuote>;
  /** Charges the wallet; the optional client joins the caller's transaction. */
  chargeWallet: (input: ApplyWalletMovementInput, client?: PoolClient) => Promise<AppliedMovement>;
};

export type OrderModuleDeps = { auth: AuthDeps; orders: OrderDeps };

/** A row of the internal service view the order needs for cost and provider wiring. */
export type OrderServiceRow = {
  id: string;
  slug: string;
  name: string;
  name_ar: string | null;
  provider_id: string | null;
  price_unit: 'per_1000' | 'per_item';
  provider_cost_minor: string | number;
  category_id: string | null;
};
