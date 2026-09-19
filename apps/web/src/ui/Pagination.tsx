import { useT } from '../i18n';
import { ChevronIcon } from './icons';
import { FOCUS_RING, TAP_TARGET } from './primitives';

/**
 * Paged navigation.
 *
 *   - every control is a real `<button>` (44px minimum target), so Enter/Space work for free;
 *   - the current page carries `aria-current="page"` and is announced, not just highlighted;
 *   - the chevrons are mirrored with a logical `rtl:` rotation, so "next" always points the way
 *     the customer reads;
 *   - ellipses collapse long ranges instead of rendering 40 buttons.
 *
 * Pages are 1-based, like the API.
 */
export type PaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Optional total for the "showing X of Y" line. */
  totalItems?: number;
  className?: string;
  showSummary?: boolean;
};

/** `[1, 'gap', 4, 5, 6, 'gap', 12]` */
export function pageWindow(page: number, pageCount: number, span = 7): Array<number | 'gap'> {
  if (pageCount <= span) return Array.from({ length: pageCount }, (_unused, index) => index + 1);

  const inner = span - 2;
  let start = Math.max(2, page - Math.floor(inner / 2));
  const end = Math.min(pageCount - 1, start + inner - 1);
  start = Math.max(2, end - inner + 1);

  const out: Array<number | 'gap'> = [1];
  if (start > 2) out.push('gap');
  for (let current = start; current <= end; current += 1) out.push(current);
  if (end < pageCount - 1) out.push('gap');
  out.push(pageCount);
  return out;
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  totalItems,
  className = '',
  showSummary = true,
}: PaginationProps) {
  const { t, formatNumber } = useT();

  if (pageCount <= 1) return null;

  const safePage = Math.min(Math.max(1, page), pageCount);
  const items = pageWindow(safePage, pageCount);
  const visible = totalItems ?? pageCount;

  return (
    <nav aria-label={t('ui.pagination.nav')} className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => onPageChange(safePage - 1)}
        disabled={safePage <= 1}
        aria-label={t('ui.pagination.previous')}
        className={`btn btn-ghost ${TAP_TARGET} ${FOCUS_RING} px-3 text-[13px]`}
      >
        {/* Points back the way the customer reads: left in LTR, right in RTL. */}
        <span aria-hidden="true" className="inline-flex rotate-180 rtl:rotate-0">
          <ChevronIcon size={14} />
        </span>
      </button>

      <ul className="flex flex-wrap items-center gap-1">
        {items.map((item, index) =>
          item === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-[var(--color-ink-faint)]">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                onClick={() => onPageChange(item)}
                aria-label={t('ui.pagination.goTo', { page: item })}
                aria-current={item === safePage ? 'page' : undefined}
                className={[
                  TAP_TARGET,
                  FOCUS_RING,
                  'num min-w-11 rounded-[var(--radius-sm)] px-2 text-[13px] font-semibold',
                  item === safePage
                    ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]'
                    : 'text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-sunken)]',
                ].join(' ')}
              >
                {formatNumber(item)}
              </button>
            </li>
          ),
        )}
      </ul>

      <button
        type="button"
        onClick={() => onPageChange(safePage + 1)}
        disabled={safePage >= pageCount}
        aria-label={t('ui.pagination.next')}
        className={`btn btn-ghost ${TAP_TARGET} ${FOCUS_RING} px-3 text-[13px]`}
      >
        <span aria-hidden="true" className="inline-flex rtl:rotate-180">
          <ChevronIcon size={14} />
        </span>
      </button>

      {showSummary ? (
        <p className="num ms-auto text-[12px] text-[var(--color-ink-muted)]">
          {t('ui.pagination.summary', { page: formatNumber(safePage), total: formatNumber(visible) })}
        </p>
      ) : null}
    </nav>
  );
}
