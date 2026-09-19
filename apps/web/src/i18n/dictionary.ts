import { ar } from './ar';
import { en } from './en';
import type { MessageKey, Messages, TFunction } from './en';
import type { Locale } from './locale';

/** Every locale's messages, keyed by locale. Adding a locale here is the whole registration. */
export const DICTIONARIES: Readonly<Record<Locale, Messages>> = { ar, en };

/**
 * Substitutes `{name}` placeholders.
 *
 * A number is formatted with the locale's `Intl.NumberFormat` so counts inside a sentence follow
 * the same digit convention as the numbers rendered by `<Money>`.
 */
function interpolate(
  template: string,
  params: Record<string, string | number> | undefined,
  formatNumber: (value: number) => string,
  key: string,
): string {
  if (!template.includes('{')) return template;

  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params?.[name];
    if (value === undefined || value === null) {
      // Loud in development, harmless in production: the message still renders.
      if (import.meta.env?.DEV) {
        console.warn(`[i18n] missing parameter "${name}" for key "${key}"`);
      }
      return match;
    }
    return typeof value === 'number' ? formatNumber(value) : String(value);
  });
}

/**
 * Builds the translate function for one locale.
 *
 * Keys are typed (`MessageKey`), so a missing key is a compile error; there is deliberately no
 * runtime fallback to the key itself.
 */
export function createTranslator(
  locale: Locale,
  formatNumber: (value: number) => string = (value) => String(value),
): TFunction {
  const messages = DICTIONARIES[locale];

  const translate = (key: MessageKey, params?: Record<string, string | number>): string => {
    const template: string | undefined = messages[key];

    // The type system already rejects an unknown key; this only guards against a dictionary that
    // was damaged at runtime (a bad merge, a hand-edited bundle). Showing the key is loud and
    // never blank, which is the failure mode we care about.
    if (typeof template !== 'string') {
      if (import.meta.env?.DEV) console.warn(`[i18n] missing message for key "${key}" (${locale})`);
      return key;
    }

    return interpolate(template, params, formatNumber, key);
  };

  return translate as TFunction;
}

/** Keys present in one locale but missing from another — a test/lint hook, never user-facing. */
export function dictionaryGaps(): { locale: Locale; missing: MessageKey[] }[] {
  const reference = Object.keys(en) as MessageKey[];
  return (Object.keys(DICTIONARIES) as Locale[]).map((locale) => ({
    locale,
    missing: reference.filter((key) => typeof DICTIONARIES[locale][key] !== 'string'),
  }));
}
