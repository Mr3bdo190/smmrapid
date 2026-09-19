import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createTranslator } from './dictionary';
import { createFormatters } from './format';
import type { Formatters } from './format';
import { applyDocumentLocale, DEFAULT_LOCALE, DIRECTION, isLocale, LOCALE_STORAGE_KEY, OTHER_LOCALE } from './locale';
import type { Direction, Locale } from './locale';
import type { TFunction } from './en';

/**
 * The locale context: the active language, its text direction, the translator and the Intl
 * formatters. One provider at the root of the app (see the wiring notes in the task report).
 */
export type LocaleContextValue = Formatters & {
  locale: Locale;
  dir: Direction;
  isRtl: boolean;
  /** Set the language explicitly. */
  setLocale: (next: Locale) => void;
  /** Flip to the other language — what a language switch button calls. */
  toggleLocale: () => void;
  /** Translate a key. A key that does not exist is a compile error, never a blank string. */
  t: TFunction;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/** Reads the remembered language. Storage can be blocked (private mode), so it is best-effort. */
function readStoredLocale(fallback: Locale): Locale {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    /* storage unavailable — keep the default */
  }
  return fallback;
}

export type LocaleProviderProps = {
  children: ReactNode;
  /** Overrides the default language; tests and SSR pass 'en' to render deterministically. */
  initialLocale?: Locale;
};

export function LocaleProvider({ children, initialLocale }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    initialLocale ?? readStoredLocale(DEFAULT_LOCALE),
  );

  // One place owns `lang` and `dir` on <html>: components never hard-code a direction, so
  // flipping these two attributes turns the whole layout around.
  useEffect(() => {
    applyDocumentLocale(locale);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      /* storage blocked — the language still applies for this session */
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);
  const toggleLocale = useCallback(
    () => setLocaleState((current) => OTHER_LOCALE[current]),
    [],
  );

  const value = useMemo<LocaleContextValue>(() => {
    const formatters = createFormatters(locale);
    const t = createTranslator(locale, formatters.formatNumber);
    return {
      ...formatters,
      locale,
      dir: DIRECTION[locale],
      isRtl: DIRECTION[locale] === 'rtl',
      setLocale,
      toggleLocale,
      t,
    };
  }, [locale, setLocale, toggleLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/**
 * The i18n hook.
 *
 *   const { t, formatMoney, dir, locale, toggleLocale } = useT();
 *
 * Returns the translator plus the active locale, its direction and the Intl formatters.
 */
export function useT(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useT must be used inside LocaleProvider');
  return context;
}

/** Same value, named for call sites that only care about the language. */
export const useLocale = useT;
