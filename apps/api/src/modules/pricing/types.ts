/**
 * Pricing engine — types.
 *
 * The SQL schema (database/migrations/0001_initial_schema.sql §catalog and §coupons) is the
 * contract: the database row types below mirror its column names exactly.
 *
 * Money rules encoded here:
 *  - every amount is an integer number of minor units (cents); a price never leaves this module
 *    as a float, and rounding happens exactly once (lib/money.ts);
 *  - `services.price_minor` is the price per `price_unit` (`per_1000` = 1000 items, `per_item` =
 *    one item) that the customer pays; `provider_cost_minor` is OUR cost and must never reach a
 *    customer-facing shape;
 *  - a quote is an offer, not a charge: nothing here moves money. The order phase stores the
 *    quote it took and charges the ledger through the wallet module.
 *
 * `PricingDeps` is injectable exactly like `AuthDeps`, so the HTTP surface is tested with fakes
 * and the arithmetic/DB behaviour is tested against the real schema.
 */

import type { PriceUnit } from '../../lib/money.js';
import type { AuthDeps } from '../auth/types.js';

/** `coupon_type` enum. */
export type CouponType = 'percent' | 'fixed';

/** `coupon_scope` enum. */
export type CouponScope = 'all' | 'category' | 'service';

/** Keys this module reads from `settings` (never a secret — it is admin-editable config). */
export const SETTING_KEYS = {
  currency: 'site.currency',
  fallbackMarkupPercent: 'finance.default_markup_percent',
  orderMinMinor: 'finance.order_min_minor',
} as const;

/** Values used when a setting is missing or unusable — the API must price with no configuration. */
export const PRICING_DEFAULTS = {
  currency: 'USD',
  fallbackMarkupPercent: 30,
  orderMinMinor: 10,
} as const;

export type PricingSettings = {
  /** Currency the customer is charged in, from `site.currency`. */
  currency: string;
  /** Markup over supplier cost when neither the service nor its category sets one. */
  fallbackMarkupPercent: number;
  /** The smallest order total we accept, in minor units (`finance.order_min_minor`). */
  orderMinMinor: number;
};

/**
 * A `services` row joined with the pricing data around it. `provider_rate_currency` is the
 * currency the linked supplier service is quoted in; when it differs from the platform currency
 * the automatic price derivation is skipped instead of mixing currencies silently.
 */
export type ServicePricingRecord = {
  id: string;
  slug: string;
  name: string;
  name_ar: string | null;
  type: string | null;
  input_type: string;
  price_unit: PriceUnit;
  price_minor: string | number;
  provider_cost_minor: string | number;
  markup_percent: string | number | null;
  markup_fixed_minor: string | number | null;
  min_quantity: string | number;
  max_quantity: string | number;
  supports_refill: boolean;
  supports_cancel: boolean;
  supports_drip_feed: boolean;
  estimated_time: string | null;
  is_active: boolean;
  deleted_at: string | Date | null;
  provider_id: string | null;
  provider_service_id: string | null;
  category_id: string;
  category_slug: string;
  category_name: string;
  category_name_ar: string | null;
  category_markup_percent: string | number | null;
  provider_rate_currency: string | null;
};

/** A `service_variants` row. */
export type ServiceVariantRecord = {
  id: string;
  name: string;
  name_ar: string | null;
  price_minor: string | number;
  min_quantity: string | number;
  max_quantity: string | number;
  is_active: boolean;
};

/** A `coupons` row. */
export type CouponRecord = {
  id: string;
  code: string;
  type: CouponType;
  percent_bp: number | null;
  amount_minor: string | number | null;
  max_discount_minor: string | number | null;
  min_order_minor: string | number;
  scope: CouponScope;
  category_id: string | null;
  service_id: string | null;
  usage_limit: number | null;
  per_user_limit: number;
  used_count: number;
  starts_at: string | Date | null;
  expires_at: string | Date | null;
  is_active: boolean;
};

/** One customer-facing variant: price and quantity bounds only. */
export type PublicVariant = {
  id: string;
  name: string;
  nameAr: string | null;
  priceMinor: number;
  minQuantity: number;
  maxQuantity: number;
};

/** What a customer (or a public catalogue page) may see about a service's price. */
export type PublicServicePrice = {
  id: string;
  slug: string;
  name: string;
  nameAr: string | null;
  category: { slug: string; name: string; nameAr: string | null };
  priceUnit: PriceUnit;
  /** Customer price per `priceUnit`, integer minor units. Never our cost. */
  priceMinor: number;
  minQuantity: number;
  maxQuantity: number;
  currency: string;
  orderMinMinor: number;
  inputType: string;
  supportsRefill: boolean;
  supportsCancel: boolean;
  supportsDripFeed: boolean;
  estimatedTime: string | null;
  variants: PublicVariant[];
};

export type QuoteRequest = {
  /** Exactly one of the two identifies the service. */
  serviceSlug?: string;
  serviceId?: string;
  variantId?: string;
  /** Whole number of items (not thousands): the engine converts by `price_unit`. */
  quantity: number;
  couponCode?: string;
  /** The signed-in customer, when there is one. Coupons count per-user usage with it. */
  userId?: string | null;
};

/** The offer the customer sees: what the quantity costs, what the coupon takes off, what is left. */
export type PricingQuote = {
  service: { id: string; slug: string; name: string; nameAr: string | null; inputType: string };
  variant: { id: string; name: string; nameAr: string | null } | null;
  quantity: number;
  priceUnit: PriceUnit;
  /** Price of one `priceUnit` at the chosen variant, integer minor units. */
  unitPriceMinor: number;
  /** `unitPriceMinor × quantity` (rounded once), before any discount. */
  chargeMinor: number;
  discountMinor: number;
  /** `chargeMinor − discountMinor`; never negative. The amount an order would be charged. */
  totalMinor: number;
  currency: string;
  limits: { minQuantity: number; maxQuantity: number; orderMinMinor: number };
  coupon: { code: string; type: CouponType } | null;
  /** True when a coupon was applied for a signed-in customer (per-user limits were checked). */
  couponCheckedForCustomer: boolean;
  quotedAt: string;
};

/** A hypothetical price, for the admin form: what this cost and markup would sell for. */
export type PricePreviewInput = {
  costMinor?: number;
  markupPercent?: number;
  markupFixedMinor?: number;
  serviceSlug?: string;
  categorySlug?: string;
};

export type PricePreview = {
  costMinor: number;
  markupPercent: number;
  markupFixedMinor: number;
  /** Where the markup came from: a service override, the category, the global fallback. */
  markupSource: 'service' | 'category' | 'fallback' | 'request';
  suggestedPriceMinor: number;
  currentPriceMinor: number | null;
  /** `suggestedPriceMinor − costMinor`, integer minor units. */
  marginMinor: number;
  /** Margin as a percentage of the selling price, rounded half-up. */
  marginPercent: number;
  currency: string;
};

/** Why a service was left alone by a recompute instead of being repriced. */
export type RecomputeSkipReason = 'no-cost' | 'currency' | 'unchanged';

export type ServiceRepriceResult = {
  slug: string;
  costMinor: number;
  markupPercent: number;
  markupSource: PricePreview['markupSource'];
  previousPriceMinor: number;
  /** The price after the run (the stored one for a dry run or a skipped row). */
  priceMinor: number;
  changed: boolean;
  skipped: RecomputeSkipReason | null;
};

export type RecomputeInput = {
  /** Report what would change without writing anything. */
  dryRun?: boolean;
  serviceSlug?: string;
  categorySlug?: string;
};

export type RecomputeSummary = {
  dryRun: boolean;
  examined: number;
  changed: number;
  skippedNoPrice: number;
  skippedCurrency: number;
  currency: string;
  /** Capped list of the rows looked at, changed ones first. */
  services: ServiceRepriceResult[];
};

/** What the admin pricing screen shows for one service: cost, margin, and the derived price. */
export type AdminServicePricing = {
  service: PublicServicePrice;
  costMinor: number;
  markupPercent: number;
  markupFixedMinor: number;
  markupSource: PricePreview['markupSource'];
  suggestedPriceMinor: number;
  marginMinor: number;
  marginPercent: number;
  /** The currency the linked supplier service is quoted in, when it differs from ours. */
  providerRateCurrency: string | null;
  variants: (PublicVariant & { marginMinor: number })[];
};

/**
 * The pricing data surface, injectable exactly like `AuthDeps`. The database implementation is
 * `pricingDbDeps` in service.ts; the tests drive the HTTP routes with fakes.
 */
export type PricingDeps = {
  quote: (request: QuoteRequest) => Promise<PricingQuote>;
  getServicePrice: (slug: string) => Promise<PublicServicePrice>;
  adminServicePricing: (slug: string) => Promise<AdminServicePricing>;
  previewPrice: (input: PricePreviewInput) => Promise<PricePreview>;
  recomputePrices: (input: RecomputeInput) => Promise<RecomputeSummary>;
};

/** What `createPricingModule()` needs: the auth guard and the pricing data layer. */
export type PricingModuleDeps = {
  auth: AuthDeps;
  pricing: PricingDeps;
};
