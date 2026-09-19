/**
 * Pricing engine — the arithmetic and the rules, with no database, no clock and no I/O.
 *
 * Everything a price is made of lives here so it can be tested on its own and reused by the
 * orders, payments and admin phases:
 *
 *   supplier cost  →  + category/service markup  →  customer price per `price_unit`
 *   customer price × quantity (rounded once)     →  charge
 *   charge − coupon discount                     →  total
 *
 * Why this file exists separately: rounding money is the one thing that must never disagree
 * between two callers. `lib/money.ts` holds the primitives (integer minor units, half-up
 * rounding, `chargeFor`), this file holds the policy (which markup wins, what a coupon may take
 * off, which ranges are legal) — so the HTTP layer and the background recompute cannot drift
 * apart, and no code path can produce a float price or a negative total.
 *
 * A note on units: `price_minor` / `provider_cost_minor` are money for ONE `price_unit`, and a
 * `price_unit` is `per_1000` (a thousand items, the SMM convention) or `per_item`. Quantities are
 * therefore always whole items, and the conversion to a charge happens exactly once, in
 * `quantityCharge()`.
 */

import { applyMarkup, chargeFor, percentOf } from '../../lib/money.js';
import type { PriceUnit } from '../../lib/money.js';
import { orderTooSmall, priceUnavailable, quantityOutOfRange } from './errors.js';
import type { CouponType, RecomputeSkipReason } from './types.js';

/** Where a markup came from — surfaced to the admin so a price is always explainable. */
export type MarkupSource = 'service' | 'category' | 'fallback' | 'request';

export type ResolvedMarkup = {
  percent: number;
  source: MarkupSource;
};

/**
 * bigint columns arrive from node-postgres as strings, `numeric`-style percentages as strings with
 * trailing zeros ("30.0000"). This converts either into an exact integer number of minor units and
 * refuses anything that is not whole: a fractional amount can never reach a price or a quote.
 */
export function toIntegerMinor(value: string | number | bigint | null | undefined, field: string): number {
  if (value === null || value === undefined) return 0;
  const text = typeof value === 'bigint' ? value.toString() : String(value).trim();
  if (!/^-?\d+$/.test(text)) {
    throw new Error(`pricing: ${field} is "${text}", which is not an integer number of minor units`);
  }
  const result = Number(text);
  if (!Number.isSafeInteger(result)) {
    throw new Error(`pricing: ${field} is ${text}, which is outside the safe integer range`);
  }
  return result;
}

/**
 * A percentage from the database (`categories.markup_percent` is `numeric(7,4)`, so "30.0000").
 * Returns null when there is no value, so the caller can fall through to the next markup source.
 */
export function toPercentValue(value: string | number | null | undefined, field = 'markup_percent'): number | null {
  if (value === null || value === undefined || value === '') return null;
  const result = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(result) || result < 0) {
    throw new Error(`pricing: ${field} is "${String(value)}", which is not a percentage`);
  }
  return result;
}

/**
 * Which markup applies to a service: its own override, otherwise its category's, otherwise the
 * global fallback from `settings`. Returning the source as well means an admin screen can explain
 * a price ("30% from the Instagram category") instead of showing a number from nowhere.
 */
export function resolveMarkup(input: {
  serviceMarkupPercent?: number | null;
  categoryMarkupPercent?: number | null;
  fallbackMarkupPercent: number;
}): ResolvedMarkup {
  if (input.serviceMarkupPercent !== null && input.serviceMarkupPercent !== undefined) {
    return { percent: input.serviceMarkupPercent, source: 'service' };
  }
  if (input.categoryMarkupPercent !== null && input.categoryMarkupPercent !== undefined) {
    return { percent: input.categoryMarkupPercent, source: 'category' };
  }
  return { percent: Math.max(0, input.fallbackMarkupPercent), source: 'fallback' };
}

/**
 * The customer price per `price_unit` for a given supplier cost and markup.
 *
 * The markup is applied to the cost of one `price_unit` (not to the whole order), the fixed part
 * is added after the percentage, and the result is rounded half-up exactly once — so the same
 * cost and markup always produce the same price, whoever asks.
 */
export function derivePriceFromCost(
  costMinor: number,
  markupPercent = 0,
  markupFixedMinor = 0,
): number {
  if (!Number.isInteger(costMinor) || costMinor < 0) {
    throw new Error('pricing: cost must be a positive whole number of minor units');
  }
  const percent = toPercentValue(markupPercent, 'markupPercent') ?? 0;
  if (!Number.isInteger(markupFixedMinor) || markupFixedMinor < 0) {
    throw new Error('pricing: markupFixedMinor must be a positive whole number of minor units');
  }
  return Math.max(0, Math.round(applyMarkup(costMinor, percent, markupFixedMinor)));
}

/** A service with no price and no derivation available cannot be quoted at all. */
export function assertPriceAvailable(unitPriceMinor: number): void {
  if (!Number.isInteger(unitPriceMinor) || unitPriceMinor <= 0) throw priceUnavailable();
}

/** The quantity must be a whole number inside what the service (or the chosen variant) allows. */
export function assertQuantityInRange(quantity: number, minQuantity: number, maxQuantity: number): void {
  if (!Number.isInteger(quantity) || quantity < minQuantity || quantity > maxQuantity) {
    throw quantityOutOfRange(minQuantity, maxQuantity);
  }
}

/** What the quantity costs, before any discount. Rounded exactly once. */
export function quantityCharge(quantity: number, unitPriceMinor: number, priceUnit: PriceUnit): number {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('pricing: quantity must be a positive whole number of items');
  }
  if (!Number.isInteger(unitPriceMinor) || unitPriceMinor < 0) {
    throw new Error('pricing: unit price must be a non-negative whole number of minor units');
  }
  return chargeFor(quantity, unitPriceMinor, priceUnit);
}

/** True when `now` is inside the coupon's window (an open end means "no limit"). */
export function isCouponWithinWindow(
  coupon: { starts_at: string | Date | null; expires_at: string | Date | null },
  now: Date = new Date(),
): boolean {
  const starts = coupon.starts_at ? new Date(coupon.starts_at) : null;
  const expires = coupon.expires_at ? new Date(coupon.expires_at) : null;
  if (starts && now.getTime() < starts.getTime()) return false;
  if (expires && now.getTime() >= expires.getTime()) return false;
  return true;
}

/** Scope check: 'all' applies anywhere, 'category'/'service' only to that target. */
export function couponAppliesToService(
  coupon: { scope: string; category_id: string | null; service_id: string | null },
  service: { id: string; categoryId: string },
): boolean {
  if (coupon.scope === 'all') return true;
  if (coupon.scope === 'category') return coupon.category_id === service.categoryId;
  if (coupon.scope === 'service') return coupon.service_id === service.id;
  return false;
}

/**
 * What a coupon takes off a charge.
 *
 * `percent_bp` is basis points (10% = 1000), `amount_minor` a fixed amount; `max_discount_minor`
 * caps either. The discount can never exceed the charge, so a total is never negative — a coupon
 * can make an order free, never refundable.
 */
export function couponDiscount(
  chargeMinor: number,
  coupon: {
    type: CouponType;
    percent_bp: number | null;
    amount_minor: string | number | null;
    max_discount_minor: string | number | null;
  },
): number {
  if (chargeMinor <= 0) return 0;

  const raw = coupon.type === 'percent'
    ? percentOf(chargeMinor, (coupon.percent_bp ?? 0) / 100)
    : toIntegerMinor(coupon.amount_minor, 'amount_minor');

  const cap = coupon.max_discount_minor === null || coupon.max_discount_minor === undefined
    ? raw
    : toIntegerMinor(coupon.max_discount_minor, 'max_discount_minor');

  return Math.max(0, Math.min(raw, cap, chargeMinor));
}

/** `charge − discount`, never below zero. */
export function totalAfterDiscount(chargeMinor: number, discountMinor: number): number {
  return Math.max(0, chargeMinor - Math.max(0, discountMinor));
}

/** The smallest order we accept; below it the customer is told before anything is charged. */
export function assertOrderNotTooSmall(totalMinor: number, orderMinMinor: number): void {
  if (totalMinor < orderMinMinor) throw orderTooSmall(orderMinMinor, totalMinor);
}

/** Our margin on one `price_unit`: price − cost, in minor units. */
export function marginMinor(priceMinor: number, costMinor: number): number {
  return priceMinor - costMinor;
}

/**
 * Margin as a share of the selling price, rounded half-up. Display only (an admin figure) — money
 * arithmetic never uses it, which is why it is allowed to be a percentage rather than minor units.
 */
export function marginPercentOf(priceMinor: number, costMinor: number): number {
  if (priceMinor <= 0) return 0;
  return Math.round(((priceMinor - costMinor) / priceMinor) * 100);
}

/**
 * Why a service may be left alone by a recompute.
 *
 *  - `no-cost`: the row has no supplier cost (a manual service), so the admin's own price is
 *    authoritative and is never overwritten with a number derived from zero;
 *  - `currency`: the linked supplier quotes in another currency, so deriving a price would mix
 *    currencies silently — an operator has to convert the cost first.
 */
export function recomputeSkipReason(input: {
  costMinor: number;
  platformCurrency: string;
  providerRateCurrency: string | null;
}): Exclude<RecomputeSkipReason, 'unchanged'> | null {
  if (input.costMinor <= 0) return 'no-cost';
  if (input.providerRateCurrency && input.providerRateCurrency !== input.platformCurrency) return 'currency';
  return null;
}
