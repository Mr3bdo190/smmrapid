import { INTL_TAG } from './locale';
import type { Locale } from './locale';

/**
 * Intl-based formatting for the active locale.
 *
 * Everything the customer reads as a number, a date or an amount of money goes through here, so
 * the format follows the language (Arabic month names, `ج.م.`/`$`, thousands grouping) with no
 * hand-rolled string building anywhere in the UI.
 *
 * Money is always integer **minor units** (cents) on the wire; only the display layer converts,
 * and it converts straight into `Intl.NumberFormat` so no floating-point arithmetic is exposed.
 */

export type Formatters = {
  /** The BCP-47 tag in use (e.g. `ar-EG-u-nu-latn`) — handy for `<input lang>` and debugging. */
  localeTag: string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatPercent: (ratio: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  /** `amount` is in **major** units (12.5 → "$12.50"). Use `formatMoney` for minor units. */
  formatCurrency: (amount: number, currency: string, options?: Intl.NumberFormatOptions) => string;
  /** `minor` is an integer number of minor units (1250 → "$12.50"). */
  formatMoney: (minor: number, currency: string, options?: Intl.NumberFormatOptions) => string;
};

const MINOR_UNITS_PER_UNIT = 100;

/** Never let a bad currency code throw inside a render — fall back to a plain "CUR 12.50". */
function safeFormat<T>(build: () => T, fallback: T): T {
  try {
    return build();
  } catch {
    return fallback;
  }
}

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

/** ISO date input (`2026-09-19T12:00:00Z`) → `Date`, invalid input → `null` (rendered as "—"). */
export function parseDate(value: Date | string | number): Date | null {
  const date = toDate(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function createFormatters(locale: Locale): Formatters {
  const localeTag = INTL_TAG[locale];

  const formatNumber = (value: number, options: Intl.NumberFormatOptions = {}): string =>
    safeFormat(() => new Intl.NumberFormat(localeTag, options).format(value), String(value));

  const formatCurrency = (
    amount: number,
    currency: string,
    options: Intl.NumberFormatOptions = {},
  ): string =>
    safeFormat(
      () => new Intl.NumberFormat(localeTag, { style: 'currency', currency, ...options }).format(amount),
      `${currency} ${formatNumber(amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    );

  /** How many decimals this currency actually uses (2 for USD/EGP/SAR, 0 for JPY). */
  const fractionDigits = (currency: string): number =>
    safeFormat(
      () =>
        new Intl.NumberFormat(localeTag, { style: 'currency', currency }).resolvedOptions()
          .maximumFractionDigits ?? 2,
      2,
    );

  const formatMoney = (
    minor: number,
    currency: string,
    options: Intl.NumberFormatOptions = {},
  ): string => {
    const scaled = Math.round(minor) / 10 ** fractionDigits(currency);
    return formatCurrency(scaled, currency, options);
  };

  const formatDate = (value: Date | string | number, options: Intl.DateTimeFormatOptions = {}): string => {
    const date = parseDate(value);
    if (!date) return '—';
    return safeFormat(
      () => new Intl.DateTimeFormat(localeTag, { dateStyle: 'medium', ...options }).format(date),
      date.toISOString().slice(0, 10),
    );
  };

  const formatDateTime = (
    value: Date | string | number,
    options: Intl.DateTimeFormatOptions = {},
  ): string => {
    const date = parseDate(value);
    if (!date) return '—';
    return safeFormat(
      () =>
        new Intl.DateTimeFormat(localeTag, {
          dateStyle: 'medium',
          timeStyle: 'short',
          ...options,
        }).format(date),
      date.toISOString(),
    );
  };

  const formatPercent = (ratio: number, options: Intl.NumberFormatOptions = {}): string =>
    safeFormat(
      () => new Intl.NumberFormat(localeTag, { style: 'percent', ...options }).format(ratio),
      `${formatNumber(ratio * 100)}%`,
    );

  return { localeTag, formatNumber, formatPercent, formatDate, formatDateTime, formatCurrency, formatMoney };
}

/** Locale-independent formatters, for the rare call that happens outside React. */
export const fallbackFormatters = createFormatters('ar');

export { MINOR_UNITS_PER_UNIT };
