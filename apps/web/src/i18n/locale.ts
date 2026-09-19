/**
 * Locale primitives.
 *
 * Arabic is the default (the product is Arabic-first), English is the second supported locale.
 * Nothing here touches the DOM — `LocaleProvider` owns that — so this module stays importable
 * from anywhere (including a Node SSR render).
 */
export const LOCALES = ['ar', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export type Direction = 'rtl' | 'ltr';

/** Default locale: Arabic. Also the document language whenever storage is unavailable. */
export const DEFAULT_LOCALE: Locale = 'ar';

/** Where the customer's own choice is remembered. Same `smmrapid.` namespace as the theme. */
export const LOCALE_STORAGE_KEY = 'smmrapid.locale';

export const DIRECTION: Readonly<Record<Locale, Direction>> = { ar: 'rtl', en: 'ltr' };

/**
 * BCP-47 tags handed to `Intl`.
 *
 * Arabic is pinned to the Latin numbering system (`-u-nu-latn`) on purpose: the design language
 * requires tabular monospace numerals, and Arabic-Indic digits (١٢٣) do not line up in columns.
 * The language, month names and currency names stay Arabic — only the digits are Latin.
 */
export const INTL_TAG: Readonly<Record<Locale, string>> = {
  ar: 'ar-EG-u-nu-latn',
  en: 'en-US',
};

/** Name of each locale *in that locale* — a language switch must never look like an English UI. */
export const LOCALE_SELF_NAME: Readonly<Record<Locale, string>> = {
  ar: 'العربية',
  en: 'English',
};

/** The other locale, in the current locale's copy — used for the switch label. */
export const OTHER_LOCALE: Readonly<Record<Locale, Locale>> = { ar: 'en', en: 'ar' };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function directionOf(locale: Locale): Direction {
  return DIRECTION[locale];
}

/**
 * Applies the active locale to the document.
 *
 * `lang` and `dir` always land on `<html>` — components never hard-code a direction, so a single
 * attribute flip here turns the whole app around (logical CSS properties do the rest).
 */
export function applyDocumentLocale(locale: Locale, doc?: Document | null): void {
  const target = doc ?? (typeof document === 'undefined' ? null : document);
  if (!target) return;
  target.documentElement.lang = locale;
  target.documentElement.dir = directionOf(locale);
  target.documentElement.dataset.locale = locale;
}
