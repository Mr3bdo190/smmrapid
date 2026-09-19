import { useT } from './LocaleProvider';
import { LOCALE_SELF_NAME, OTHER_LOCALE } from './locale';

/**
 * Language switch.
 *
 * Compues the existing `.btn`/`.btn-quiet` primitives (the kit itself lives in `src/ui`, and this
 * file stays dependency-free so the i18n folder never imports the UI folder). The accessible name
 * is the *other* language's own name, so the button reads correctly to a screen reader in the
 * language the customer is currently reading.
 */
export function LocaleSwitch({ className = '' }: { className?: string }) {
  const { locale, toggleLocale, t } = useT();
  const next = OTHER_LOCALE[locale];

  return (
    <button
      type="button"
      className={`btn btn-quiet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ${className}`}
      onClick={toggleLocale}
      aria-label={t('locale.switchTo', { language: LOCALE_SELF_NAME[next] })}
      lang={next}
    >
      {LOCALE_SELF_NAME[next]}
    </button>
  );
}
