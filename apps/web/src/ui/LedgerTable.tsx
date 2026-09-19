import { useT } from '../i18n';
import type { MessageKey } from '../i18n';
import { EmptyState } from './EmptyState';
import { ArrowDownIcon, ArrowUpIcon } from './icons';
import { Money } from './Money';
import { Skeleton } from './Skeleton';

/**
 * The wallet ledger table.
 *
 * Rules it encodes for the whole app (money is the thing customers argue about):
 *   - the amount shows its **sign** (`+`/`−`) and carries an arrow icon **and** a screen-reader
 *     direction word, so credit/debit never depends on colour;
 *   - the balance after every movement is in the same row, so the column reconciles;
 *   - the reference is a `<bdi>` token, so a Latin reference inside an Arabic sentence does not
 *     reorder the layout;
 *   - the table scrolls horizontally on a narrow screen instead of squashing the numerals
 *     (`overflow-x-auto` + `whitespace-nowrap`), and every header is a real `<th scope="col">`
 *     with a caption for screen readers.
 */
export type LedgerEntry = {
  id: string;
  /** ISO string or Date. */
  occurredAt: string | Date;
  /** Server-side movement type: deposit | order | refund | adjustment | hold | release | bonus | referral | payout */
  type: string;
  /** **Signed** integer minor units: positive = credit, negative = debit. */
  amountMinor: number;
  currency: string;
  balanceAfterMinor: number;
  reference?: string | null;
};

/** Known movement types get a translated label; anything newer falls back to the raw type. */
type LedgerTypeKey = Extract<MessageKey, `ledger.type.${string}`>;

const TYPE_KEYS: Readonly<Record<string, LedgerTypeKey>> = {
  deposit: 'ledger.type.deposit',
  order: 'ledger.type.order',
  refund: 'ledger.type.refund',
  adjustment: 'ledger.type.adjustment',
  hold: 'ledger.type.hold',
  release: 'ledger.type.release',
  bonus: 'ledger.type.bonus',
  referral: 'ledger.type.referral',
  payout: 'ledger.type.payout',
};

/** Typed literal keys: a renamed column key fails the typecheck instead of rendering blank. */
const LEDGER_COLUMNS = [
  'ledger.column.date',
  'ledger.column.type',
  'ledger.column.amount',
  'ledger.column.balance',
  'ledger.column.reference',
] as const satisfies readonly MessageKey[];

export type LedgerTableProps = {
  entries: readonly LedgerEntry[];
  loading?: boolean;
  /** Accessible caption; defaults to the dictionary's "Wallet transactions". */
  caption?: string;
  className?: string;
};

export function LedgerTable({ entries, loading = false, caption, className = '' }: LedgerTableProps) {
  const { t, formatDateTime } = useT();

  if (loading) {
    return (
      <div className={`card p-5 ${className}`}>
        <Skeleton lines={5} height={16} />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className={`card ${className}`}>
        <EmptyState title={t('ledger.empty.title')} message={t('ledger.empty.message')} />
      </div>
    );
  }

  return (
    <div className={`card overflow-x-auto ${className}`}>
      <table className="w-full border-collapse text-[13px]">
        <caption className="sr-only">{caption ?? t('ledger.caption')}</caption>
        <thead>
          <tr className="hairline">
            {LEDGER_COLUMNS.map((key) => (
              <th
                key={key}
                scope="col"
                className="micro whitespace-nowrap px-4 py-2.5 text-start font-semibold"
              >
                {t(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const credit = entry.amountMinor >= 0;
            const typeKey = TYPE_KEYS[entry.type];

            return (
              <tr key={entry.id} className="hairline last:border-b-0">
                <td className="num whitespace-nowrap px-4 py-3 text-[12.5px] text-[var(--color-ink-soft)]">
                  {formatDateTime(entry.occurredAt)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-[var(--color-ink)]">
                  {typeKey ? t(typeKey) : entry.type}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className={credit ? 'text-[var(--color-ok)]' : 'text-[var(--color-danger)]'}
                    >
                      {credit ? <ArrowUpIcon size={13} /> : <ArrowDownIcon size={13} />}
                    </span>
                    <Money
                      minor={entry.amountMinor}
                      currency={entry.currency}
                      sign="always"
                      tone={credit ? 'credit' : 'debit'}
                      className="font-semibold"
                    />
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <Money
                    minor={entry.balanceAfterMinor}
                    currency={entry.currency}
                    className="text-[var(--color-ink-soft)]"
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {entry.reference ? (
                    <bdi className="num text-[12px] text-[var(--color-ink-muted)]">
                      {entry.reference}
                    </bdi>
                  ) : (
                    <span className="text-[var(--color-ink-faint)]">{t('common.none')}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
