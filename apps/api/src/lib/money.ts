/**
 * Money helpers — all amounts are integer minor units (cents).
 *
 * Why this file exists: JavaScript numbers are binary floating point, so 0.1 + 0.2 !== 0.3.
 * Any arithmetic on prices in floats eventually produces an off-by-one-cent balance. Every
 * amount therefore lives as an integer number of minor units, and the only place decimals can
 * appear is the boundary with stored decimal strings or the display layer.
 *
 * Rounding is always half-up on the final step, applied once, so two callers computing the same
 * price get the same number of cents.
 */

export const MINOR_UNITS_PER_UNIT = 100;

/** Parses a decimal amount ("12.3456", 12.3456) into integer minor units. */
export function toMinor(value: string | number): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('toMinor: value must be finite');
    return Math.round(value * MINOR_UNITS_PER_UNIT);
  }
  const text = String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) throw new Error(`toMinor: "${value}" is not a decimal amount`);
  // Round from the string, so no binary float is involved in the conversion.
  const [whole = '0', fraction = ''] = text.split('.');
  const sign = whole.startsWith('-') ? -1 : 1;
  const wholeAbs = whole.replace('-', '');
  const cents = Number(`${wholeAbs}${(fraction + '00').slice(0, 2)}`);
  const remainder = fraction.slice(2);
  const roundUp = remainder.length > 0 && Number(remainder[0] ?? '0') >= 5;
  return sign * (cents + (roundUp ? 1 : 0));
}

/** Minor units back to a decimal number. Display only — never use the result for arithmetic. */
export function fromMinor(minor: number): number {
  return Math.round(minor) / MINOR_UNITS_PER_UNIT;
}

/** Minor units as a fixed two-decimal string ("12.34"). */
export function formatMinor(minor: number): string {
  const cents = Math.round(minor);
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / MINOR_UNITS_PER_UNIT)}.${String(abs % MINOR_UNITS_PER_UNIT).padStart(2, '0')}`;
}

export type PriceUnit = 'per_1000' | 'per_item';

/**
 * Order charge: `priceMinor` is the customer price for one unit of `unit` (1000 items, or 1 item
 * for single-item services). The result is rounded once, half-up.
 */
export function chargeFor(quantity: number, priceMinor: number, unit: PriceUnit): number {
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('chargeFor: quantity must be positive');
  if (!Number.isInteger(priceMinor) || priceMinor < 0) throw new Error('chargeFor: priceMinor must be a positive integer');
  return unit === 'per_item'
    ? Math.round(priceMinor * quantity)
    : Math.round((priceMinor * quantity) / 1000);
}

/** Percentage of an amount, in minor units, rounded half-up (used by markup and commissions). */
export function percentOf(amountMinor: number, percent: number): number {
  if (!Number.isFinite(percent)) throw new Error('percentOf: percent must be a number');
  return Math.round((amountMinor * percent) / 100);
}

/**
 * Applies a markup to a cost. `markupMinor` is a fixed amount, `markupPercent` a percentage;
 * when both are present the fixed amount is added after the percentage.
 */
export function applyMarkup(costMinor: number, markupPercent = 0, markupMinor = 0): number {
  return percentOf(costMinor, markupPercent) + costMinor + Math.round(markupMinor);
}
