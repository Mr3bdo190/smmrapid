/**
 * Pricing engine — data layer.
 *
 * Reads only: the catalogue (`services`, `categories`, `service_variants`), the coupons and the
 * admin-editable `settings`. The single write in this module is `recomputePrices()`, which
 * re-derives `services.price_minor` from a supplier cost plus a markup — and it writes *nothing
 * else*: never the cost, never the markup, never a supplier row (a catalogue sync owns those, see
 * modules/providers/sync.ts). It moves no money either; a price is catalogue data, and the ledger
 * is only touched by the wallet module when an order is charged.
 *
 * Two rules the queries here encode:
 *  - `provider_cost_minor` is ours, never the customer's: `PublicServicePrice`, `PricingQuote`
 *    (and every shape the public routes return) is built by hand from named columns, so a cost
 *    cannot leak by a `select *` accident. The test suite asserts this on real responses.
 *  - a price derived from a cost is only derived when that is safe: a row without a supplier cost
 *    keeps the admin's price (nothing is ever re-derived from zero), and a row whose supplier is
 *    quoted in another currency is reported as skipped instead of mixing currencies silently.
 *
 * Every failure becomes one of the codes in `docs/ERROR_CODES.md` (the contract with the
 * customer): a database, driver or supplier message is never the message a customer reads.
 */

import { query, queryOne, withTransaction } from '../../lib/db.js';
import { AppError } from '../../middleware/error-handler.js';
import {
  assertOrderNotTooSmall,
  assertPriceAvailable,
  assertQuantityInRange,
  couponAppliesToService,
  couponDiscount,
  derivePriceFromCost,
  isCouponWithinWindow,
  marginMinor,
  marginPercentOf,
  quantityCharge,
  recomputeSkipReason,
  resolveMarkup,
  toIntegerMinor,
  toPercentValue,
  totalAfterDiscount,
} from './engine.js';
import {
  couponAlreadyUsed,
  couponExpired,
  couponMinOrder,
  couponNotFound,
  couponScopeMismatch,
  couponUsageLimit,
  serviceNotFound,
  serviceUnavailable,
  variantNotFound,
} from './errors.js';
import {
  PRICING_DEFAULTS,
  SETTING_KEYS,
  type AdminServicePricing,
  type CouponRecord,
  type PricePreview,
  type PricePreviewInput,
  type PricingDeps,
  type PricingQuote,
  type PricingSettings,
  type PublicServicePrice,
  type PublicVariant,
  type QuoteRequest,
  type RecomputeInput,
  type RecomputeSummary,
  type ServicePricingRecord,
  type ServiceRepriceResult,
  type ServiceVariantRecord,
} from './types.js';

/** At most this many rows are looked at (and reported) by one recompute run. */
export const RECOMPUTE_LIMIT = 500;
/** At most this many rows travel in the response; the counters always cover the whole run. */
export const RECOMPUTE_REPORT_LIMIT = 200;

/** Columns of a service plus the pricing data around it. Named explicitly — no `select *`. */
const SERVICE_COLUMNS = `
  s.id, s.slug, s.name, s.name_ar, s.type, s.input_type, s.price_unit, s.price_minor,
  s.provider_cost_minor, s.markup_percent, s.markup_fixed_minor, s.min_quantity, s.max_quantity,
  s.supports_refill, s.supports_cancel, s.supports_drip_feed, s.estimated_time, s.is_active,
  s.deleted_at, s.provider_id, s.provider_service_id, s.category_id,
  c.slug as category_slug, c.name as category_name, c.name_ar as category_name_ar,
  c.markup_percent as category_markup_percent,
  ps.rate_currency as provider_rate_currency
`;

/**
 * `provider_services` is joined through (provider_id, provider_service_id) — the pair the schema
 * makes unique — so a service has at most one supplier row and the currency check is unambiguous.
 */
const SERVICE_FROM = `
  from services s
  join categories c on c.id = s.category_id
  left join provider_services ps
    on ps.provider_id = s.provider_id and ps.provider_service_id = s.provider_service_id
`;

const VARIANT_COLUMNS = 'id, name, name_ar, price_minor, min_quantity, max_quantity, is_active';

const COUPON_COLUMNS = `
  id, code, type, percent_bp, amount_minor, max_discount_minor, min_order_minor, scope,
  category_id, service_id, usage_limit, per_user_limit, used_count, starts_at, expires_at, is_active
`;

/** Coupon codes are stored upper-case (`coupons_code_upper`), so look them up that way. */
export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

/** jsonb settings are delivered as parsed JS values; anything unusable falls back to the default. */
function jsonNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function jsonText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback;
}

/**
 * The three settings this module needs, in one query, always answerable: a missing or damaged row
 * falls back to a safe default instead of failing a quote (the API must price with no
 * configuration at all).
 */
export async function loadSettings(): Promise<PricingSettings> {
  const rows = await query<{ key: string; value: unknown }>(
    'select key, value from settings where key = any($1::text[])',
    [[SETTING_KEYS.currency, SETTING_KEYS.fallbackMarkupPercent, SETTING_KEYS.orderMinMinor]],
  ).catch((error: unknown) => {
    throw toPricingError(error);
  });

  const byKey = new Map(rows.map((row) => [row.key, row.value]));

  const currency = jsonText(byKey.get(SETTING_KEYS.currency), PRICING_DEFAULTS.currency).toUpperCase();
  const rawMarkup = jsonNumber(byKey.get(SETTING_KEYS.fallbackMarkupPercent), PRICING_DEFAULTS.fallbackMarkupPercent);
  const rawMin = jsonNumber(byKey.get(SETTING_KEYS.orderMinMinor), PRICING_DEFAULTS.orderMinMinor);

  return {
    currency: /^[A-Z]{3}$/.test(currency) ? currency : PRICING_DEFAULTS.currency,
    fallbackMarkupPercent: rawMarkup >= 0 ? rawMarkup : PRICING_DEFAULTS.fallbackMarkupPercent,
    orderMinMinor: Number.isInteger(rawMin) && rawMin >= 0 ? rawMin : PRICING_DEFAULTS.orderMinMinor,
  };
}

type LoadedService = {
  service: ServicePricingRecord;
  variants: ServiceVariantRecord[];
};

/** Loads the service row plus its variants by slug or id. Returns null when there is no such row. */
async function loadService(ref: { slug?: string; id?: string }): Promise<LoadedService | null> {
  const where = ref.slug ? 's.slug = $1' : 's.id = $1::uuid';
  const value = ref.slug ?? ref.id ?? '';

  const service = await queryOne<ServicePricingRecord>(
    `select ${SERVICE_COLUMNS} ${SERVICE_FROM} where ${where} limit 1`,
    [value],
  );

  if (!service) return null;

  const variants = await query<ServiceVariantRecord>(
    `select ${VARIANT_COLUMNS} from service_variants where service_id = $1::uuid order by sort_order asc, name asc`,
    [service.id],
  );

  return { service, variants };
}

/** A coupon by code, plus how many times this customer has already used it. */
async function loadCoupon(
  code: string,
  userId: string | null,
): Promise<{ coupon: CouponRecord; userRedemptions: number } | null> {
  const coupon = await queryOne<CouponRecord>(
    `select ${COUPON_COLUMNS} from coupons where code = $1 limit 1`,
    [code],
  );
  if (!coupon) return null;

  if (!userId) return { coupon, userRedemptions: 0 };

  const used = await queryOne<{ used: string | number }>(
    'select count(*)::int as used from coupon_redemptions where coupon_id = $1::uuid and user_id = $2::uuid',
    [coupon.id, userId],
  );

  return { coupon, userRedemptions: toIntegerMinor(used?.used ?? 0, 'used') };
}

function toPublicVariant(row: ServiceVariantRecord): PublicVariant {
  return {
    id: row.id,
    name: row.name,
    nameAr: row.name_ar,
    priceMinor: toIntegerMinor(row.price_minor, 'price_minor'),
    minQuantity: toIntegerMinor(row.min_quantity, 'min_quantity'),
    maxQuantity: toIntegerMinor(row.max_quantity, 'max_quantity'),
  };
}

/** The customer-facing shape: price and quantity rules only — no cost, no supplier reference. */
function toPublicService(
  row: ServicePricingRecord,
  variants: ServiceVariantRecord[],
  settings: PricingSettings,
): PublicServicePrice {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    nameAr: row.name_ar,
    category: { slug: row.category_slug, name: row.category_name, nameAr: row.category_name_ar },
    priceUnit: row.price_unit,
    priceMinor: toIntegerMinor(row.price_minor, 'price_minor'),
    minQuantity: toIntegerMinor(row.min_quantity, 'min_quantity'),
    maxQuantity: toIntegerMinor(row.max_quantity, 'max_quantity'),
    currency: settings.currency,
    orderMinMinor: settings.orderMinMinor,
    inputType: row.input_type,
    supportsRefill: row.supports_refill,
    supportsCancel: row.supports_cancel,
    supportsDripFeed: row.supports_drip_feed,
    estimatedTime: row.estimated_time,
    variants: variants.filter((variant) => variant.is_active).map(toPublicVariant),
  };
}

/** A row the customer may order: present in the catalogue and not switched off. */
function assertOrderable(row: ServicePricingRecord): void {
  if (row.deleted_at) throw serviceNotFound();
  if (!row.is_active) throw serviceUnavailable();
}

/**
 * What a quantity costs: the offer the customer sees on the order form.
 *
 * Determinism and safety:
 *  - the price comes from the database (never from the request), so a customer cannot name a
 *    price any more than they can name a balance;
 *  - a variant overrides the price *and* the quantity range, exactly as the schema describes;
 *  - the discount never exceeds the charge, so `totalMinor` is never negative;
 *  - the minimum-order floor is checked against the order's value *before* the discount, so a
 *    valid order fully discounted by a coupon is not rejected for being "too small".
 */
export async function quote(request: QuoteRequest): Promise<PricingQuote> {
  try {
    const settings = await loadSettings();
    const loaded = await loadService(
      request.serviceSlug ? { slug: request.serviceSlug } : { id: request.serviceId },
    );
    if (!loaded) throw serviceNotFound();

    const { service, variants } = loaded;
    assertOrderable(service);

    const variant = request.variantId
      ? variants.find((candidate) => candidate.id === request.variantId && candidate.is_active) ?? null
      : null;
    if (request.variantId && !variant) throw variantNotFound();

    const unitPriceMinor = toIntegerMinor(variant?.price_minor ?? service.price_minor, 'price_minor');
    const minQuantity = toIntegerMinor(variant?.min_quantity ?? service.min_quantity, 'min_quantity');
    const maxQuantity = toIntegerMinor(variant?.max_quantity ?? service.max_quantity, 'max_quantity');

    assertQuantityInRange(request.quantity, minQuantity, maxQuantity);
    assertPriceAvailable(unitPriceMinor);

    const chargeMinor = quantityCharge(request.quantity, unitPriceMinor, service.price_unit);

    let coupon: PricingQuote['coupon'] = null;
    let discountMinor = 0;
    let couponCheckedForCustomer = false;

    if (request.couponCode) {
      const code = normalizeCouponCode(request.couponCode);
      const found = await loadCoupon(code, request.userId ?? null);
      if (!found || !found.coupon.is_active) throw couponNotFound();

      const row = found.coupon;
      if (!isCouponWithinWindow(row)) throw couponExpired();
      if (!couponAppliesToService(row, { id: service.id, categoryId: service.category_id })) {
        throw couponScopeMismatch();
      }
      if (row.usage_limit !== null && row.used_count >= row.usage_limit) throw couponUsageLimit();

      if (request.userId) {
        // A per-user limit can only be answered for a known customer; at redemption the order
        // phase re-checks it, so an anonymous quote is never the last word.
        couponCheckedForCustomer = true;
        if (found.userRedemptions >= row.per_user_limit) throw couponAlreadyUsed(row.per_user_limit);
      }

      const minOrderMinor = toIntegerMinor(row.min_order_minor, 'min_order_minor');
      if (chargeMinor < minOrderMinor) throw couponMinOrder(minOrderMinor);

      discountMinor = couponDiscount(chargeMinor, row);
      coupon = { code: row.code, type: row.type };
    }

    assertOrderNotTooSmall(chargeMinor, settings.orderMinMinor);
    const totalMinor = totalAfterDiscount(chargeMinor, discountMinor);

    return {
      service: {
        id: service.id,
        slug: service.slug,
        name: service.name,
        nameAr: service.name_ar,
        inputType: service.input_type,
      },
      variant: variant ? { id: variant.id, name: variant.name, nameAr: variant.name_ar } : null,
      quantity: request.quantity,
      priceUnit: service.price_unit,
      unitPriceMinor,
      chargeMinor,
      discountMinor,
      totalMinor,
      currency: settings.currency,
      limits: { minQuantity, maxQuantity, orderMinMinor: settings.orderMinMinor },
      coupon,
      couponCheckedForCustomer,
      quotedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw toPricingError(error);
  }
}

/** One service, as the catalogue shows it. Inactive rows answer the "not on sale" code. */
export async function getServicePrice(slug: string): Promise<PublicServicePrice> {
  try {
    const settings = await loadSettings();
    const loaded = await loadService({ slug });
    if (!loaded) throw serviceNotFound();
    assertOrderable(loaded.service);
    return toPublicService(loaded.service, loaded.variants, settings);
  } catch (error) {
    throw toPricingError(error);
  }
}

/** The admin view of the same row: what it costs us, what we charge, what we make on it. */
export async function adminServicePricing(slug: string): Promise<AdminServicePricing> {
  try {
    const settings = await loadSettings();
    const loaded = await loadService({ slug });
    if (!loaded) throw serviceNotFound();

    const { service, variants } = loaded;
    const markup = resolveMarkup({
      serviceMarkupPercent: toPercentValue(service.markup_percent),
      categoryMarkupPercent: toPercentValue(service.category_markup_percent),
      fallbackMarkupPercent: settings.fallbackMarkupPercent,
    });
    const costMinor = toIntegerMinor(service.provider_cost_minor, 'provider_cost_minor');
    const priceMinor = toIntegerMinor(service.price_minor, 'price_minor');

    return {
      service: toPublicService(service, variants, settings),
      costMinor,
      markupPercent: markup.percent,
      markupFixedMinor: toIntegerMinor(service.markup_fixed_minor, 'markup_fixed_minor'),
      markupSource: markup.source,
      suggestedPriceMinor: derivePriceFromCost(costMinor, markup.percent, toIntegerMinor(service.markup_fixed_minor, 'markup_fixed_minor')),
      marginMinor: marginMinor(priceMinor, costMinor),
      marginPercent: marginPercentOf(priceMinor, costMinor),
      providerRateCurrency: service.provider_rate_currency,
      variants: variants
        .filter((variant) => variant.is_active)
        .map((variant) => ({
          ...toPublicVariant(variant),
          marginMinor: marginMinor(toIntegerMinor(variant.price_minor, 'price_minor'), costMinor),
        })),
    };
  } catch (error) {
    throw toPricingError(error);
  }
}

/**
 * "What would this cost and this markup sell for?" — the admin form's live preview, and the same
 * function the recompute uses, so the number an admin sees before saving is the number that gets
 * written.
 */
export async function previewPrice(input: PricePreviewInput): Promise<PricePreview> {
  try {
    const settings = await loadSettings();

    let costMinor = input.costMinor ?? null;
    let markupPercent = input.markupPercent ?? null;
    let markupFixedMinor = input.markupFixedMinor ?? null;
    let markupSource: PricePreview['markupSource'] = markupPercent === null ? 'fallback' : 'request';
    let currentPriceMinor: number | null = null;

    if (input.serviceSlug) {
      const rows = await query<ServicePricingRecord>(
        `select ${SERVICE_COLUMNS} ${SERVICE_FROM} where s.slug = $1 limit 1`,
        [input.serviceSlug],
      );

      const row = rows[0];
      if (!row) throw serviceNotFound();

      currentPriceMinor = toIntegerMinor(row.price_minor, 'price_minor');
      if (costMinor === null) costMinor = toIntegerMinor(row.provider_cost_minor, 'provider_cost_minor');
      if (markupPercent === null) {
        const resolved = resolveMarkup({
          serviceMarkupPercent: toPercentValue(row.markup_percent),
          categoryMarkupPercent: toPercentValue(row.category_markup_percent),
          fallbackMarkupPercent: settings.fallbackMarkupPercent,
        });
        markupPercent = resolved.percent;
        markupSource = resolved.source;
      }
      if (markupFixedMinor === null) {
        markupFixedMinor = toIntegerMinor(row.markup_fixed_minor, 'markup_fixed_minor');
      }
    } else if (input.categorySlug) {
      // A category preview answers "what would the category markup make of a cost I type in?":
      // the cost always comes from the request, the percentage from the category itself.
      const category = await queryOne<{ markup_percent: string | number | null }>(
        'select markup_percent from categories where slug = $1 limit 1',
        [input.categorySlug],
      );
      if (!category) throw serviceNotFound();

      if (markupPercent === null) {
        const resolved = resolveMarkup({
          categoryMarkupPercent: toPercentValue(category.markup_percent),
          fallbackMarkupPercent: settings.fallbackMarkupPercent,
        });
        markupPercent = resolved.percent;
        markupSource = resolved.source;
      }
    }

    if (costMinor === null) {
      throw new AppError(
        'VALIDATION_ERROR',
        'بيانات السعر ناقصة، وما اتغيرش أي سعر. ابعت تكلفة المزوّد (costMinor) أو الخدمة (serviceSlug) ونحسب السعر. '
          + '(A price preview needs a cost — send costMinor, or the slug of a service to take it from.)',
        422,
        { fields: [{ field: 'costMinor', message: 'is required unless serviceSlug is provided' }] },
      );
    }

    const cost = toIntegerMinor(costMinor, 'costMinor');
    const percent = toPercentValue(markupPercent ?? 0, 'markupPercent') ?? 0;
    const fixed = toIntegerMinor(markupFixedMinor ?? 0, 'markupFixedMinor');
    const suggestedPriceMinor = derivePriceFromCost(cost, percent, fixed);

    return {
      costMinor: cost,
      markupPercent: percent,
      markupFixedMinor: fixed,
      markupSource,
      suggestedPriceMinor,
      currentPriceMinor,
      marginMinor: marginMinor(suggestedPriceMinor, cost),
      marginPercent: marginPercentOf(suggestedPriceMinor, cost),
      currency: settings.currency,
    };
  } catch (error) {
    throw toPricingError(error);
  }
}

/**
 * Re-derives `services.price_minor` from the stored supplier cost and the effective markup, and
 * reports exactly what changed. Run with `dryRun` first: it answers the same summary without
 * writing a single row.
 *
 * The write is a transaction of narrow updates — `price_minor` and `updated_at` only. Cost, markup
 * and every supplier-facing column are left untouched, so a recompute can never destroy the data a
 * price was derived from, and rows that are skipped are reported with the reason instead of being
 * silently repriced.
 */
export async function recomputePrices(input: RecomputeInput = {}): Promise<RecomputeSummary> {
  try {
    const settings = await loadSettings();
    const params: unknown[] = [];
    let filters = 's.deleted_at is null';

    if (input.serviceSlug) {
      params.push(input.serviceSlug);
      filters += ` and s.slug = $${params.length}`;
    }
    if (input.categorySlug) {
      params.push(input.categorySlug);
      filters += ` and c.slug = $${params.length}`;
    }

    const rows = await query<ServicePricingRecord>(
      `select ${SERVICE_COLUMNS} ${SERVICE_FROM}
        where ${filters}
        order by c.sort_order asc, s.sort_order asc, s.slug asc
        limit ${RECOMPUTE_LIMIT}`,
      params,
    );

    const results: ServiceRepriceResult[] = [];
    const pending: { id: string; price: number; result: ServiceRepriceResult }[] = [];

    for (const row of rows) {
      const costMinor = toIntegerMinor(row.provider_cost_minor, 'provider_cost_minor');
      const currentPriceMinor = toIntegerMinor(row.price_minor, 'price_minor');
      const markup = resolveMarkup({
        serviceMarkupPercent: toPercentValue(row.markup_percent),
        categoryMarkupPercent: toPercentValue(row.category_markup_percent),
        fallbackMarkupPercent: settings.fallbackMarkupPercent,
      });

      const base: Omit<ServiceRepriceResult, 'changed' | 'skipped' | 'priceMinor'> = {
        slug: row.slug,
        costMinor,
        markupPercent: markup.percent,
        markupSource: markup.source,
        previousPriceMinor: currentPriceMinor,
      };

      const skip = recomputeSkipReason({
        costMinor,
        platformCurrency: settings.currency,
        providerRateCurrency: row.provider_rate_currency,
      });

      if (skip) {
        results.push({ ...base, priceMinor: currentPriceMinor, changed: false, skipped: skip });
        continue;
      }

      const derived = derivePriceFromCost(
        costMinor,
        markup.percent,
        toIntegerMinor(row.markup_fixed_minor, 'markup_fixed_minor'),
      );

      if (derived === currentPriceMinor) {
        results.push({ ...base, priceMinor: currentPriceMinor, changed: false, skipped: 'unchanged' });
        continue;
      }

      const result: ServiceRepriceResult = {
        ...base,
        priceMinor: derived,
        // For a dry run this means "would change"; a real run clears it when the row was not
        // written after all (a concurrent update moved the price first).
        changed: true,
        skipped: null,
      };
      results.push(result);
      pending.push({ id: row.id, price: derived, result });
    }

    let written = 0;
    if (!input.dryRun && pending.length > 0) {
      written = await withTransaction(async (client) => {
        let applied = 0;
        for (const item of pending) {
          const updated = await client.query(
            `update services
                set price_minor = $2::bigint, updated_at = now()
              where id = $1::uuid and price_minor is distinct from $2::bigint`,
            [item.id, item.price],
          );
          if (updated.rowCount === 1) applied += 1;
          else item.result.changed = false;
        }
        return applied;
      });
    }

    const changed = input.dryRun ? pending.length : written;

    return {
      dryRun: Boolean(input.dryRun),
      examined: results.length,
      changed,
      skippedNoPrice: results.filter((row) => row.skipped === 'no-cost').length,
      skippedCurrency: results.filter((row) => row.skipped === 'currency').length,
      currency: settings.currency,
      services: [
        ...results.filter((row) => row.changed),
        ...results.filter((row) => !row.changed),
      ].slice(0, RECOMPUTE_REPORT_LIMIT),
    };
  } catch (error) {
    throw toPricingError(error);
  }
}

/**
 * Turns a database failure into one of the documented customer-facing codes.
 *
 * Matching on `code` as well as `instanceof` matters because each build entry bundles its own copy
 * of these classes (see the same note in modules/auth/middleware.ts). Every branch builds a NEW
 * AppError: the database's own wording, a driver message or a SQLSTATE is never passed on to the
 * client — an unexpected failure keeps its neutral 500 + support ref from the global handler.
 */
export function toPricingError(error: unknown): unknown {
  if (error instanceof AppError) return error;

  const marker = typeof (error as { code?: unknown })?.code === 'string'
    ? String((error as { code: string }).code)
    : '';
  const message = error instanceof Error ? error.message : String(error);

  // an id that is not a uuid: the row cannot exist, so this is "not in the catalogue"
  if (marker === '22P02') return serviceNotFound();

  if (marker === 'DB_NOT_CONFIGURED' || marker === '57P03' || marker === '3D000' || isConnectionFailure(message)) {
    return new AppError(
      'DB_UNAVAILABLE',
      'الخدمة مش متاحة لحظة، وما اتغيرش أي سعر. استنى دقيقة وجرّب تاني. '
        + '(The service is unavailable for a moment — nothing was changed. Wait a minute and try again.)',
      503,
    );
  }

  return error;
}

function isConnectionFailure(message: string): boolean {
  return /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EHOSTUNREACH|ECONNRESET|terminating connection|Connection terminated|could not connect|password authentication failed|database system is starting up|too many clients/i.test(
    message,
  );
}

/** The database-backed `PricingDeps` — what `registerRoutes` injects. */
export const pricingDbDeps: PricingDeps = {
  quote,
  getServicePrice,
  adminServicePricing,
  previewPrice,
  recomputePrices,
};

/** Convenience re-exports so callers can name the shared shapes without importing types.js. */
export type { PricingQuote, PublicServicePrice, RecomputeSummary } from './types.js';
