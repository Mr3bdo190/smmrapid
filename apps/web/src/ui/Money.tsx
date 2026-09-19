import { useT } from '../i18n';

/**
 * An amount of money, formatted for the active locale.
 *
 * The value is always an integer number of **minor units** (cents) — the only money representation
 * the API and the database use. The conversion to major units happens inside `Intl.NumberFormat`
 * (which rounds and groups correctly for the locale and the currency), so no float arithmetic ever
 * reaches a customer-visible number.
 *
 * `tone` adds the semantic colour **and** a screen-reader direction word, so a credit and a debit
 * are never distinguished by colour alone. Numerals use the `.num` primitive: monospace, tabular.
 */
export type MoneyProps = {
  /** Integer minor units: 1250 → "$12.50" / "12.50 US$". Negative = a debit. */
  minor: number;
  /** ISO 4217 code: 'USD', 'EGP', 'SAR'. */
  currency: string;
  /** 'always' prints `+`/`−` (use it in a ledger), 'auto' only for negatives. */
  sign?: 'auto' | 'always' | 'never';
  tone?: 'neutral' | 'credit' | 'debit';
  className?: string;
  options?: Intl.NumberFormatOptions;
};

export function Money({
  minor,
  currency,
  sign = 'auto',
  tone = 'neutral',
  className = '',
  options,
}: MoneyProps) {
  const { t, formatMoney } = useT();

  const signDisplay: Intl.NumberFormatOptions['signDisplay'] =
    sign === 'always' ? 'always' : sign === 'never' ? 'never' : minor < 0 ? 'auto' : 'never';

  const text = formatMoney(minor, currency, { signDisplay, ...options });

  const toneClass =
    tone === 'credit'
      ? 'text-[var(--color-ok)]'
      : tone === 'debit'
        ? 'text-[var(--color-danger)]'
        : '';

  return (
    <span className={`num ${toneClass} ${className}`}>
      {tone === 'credit' ? <span className="sr-only">{t('ledger.credit')} </span> : null}
      {tone === 'debit' ? <span className="sr-only">{t('ledger.debit')} </span> : null}
      {text}
    </span>
  );
}
