import type { ReactNode } from 'react';
import { useT } from '../i18n';
import { InboxIcon } from './icons';

/**
 * The "there is nothing here yet" surface.
 *
 * It always says what is missing and, when there is one, offers the action that fills it — an
 * empty table with no explanation is the most common way a product looks broken.
 */
export type EmptyStateProps = {
  title?: string;
  message?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, message, action, className = '' }: EmptyStateProps) {
  const { t } = useT();

  return (
    <div className={`flex flex-col items-center gap-1.5 px-5 py-10 text-center ${className}`}>
      <span aria-hidden="true" className="mb-1 text-[var(--color-ink-faint)]">
        <InboxIcon size={22} />
      </span>
      <p className="display text-[15px] font-semibold text-[var(--color-ink)]">
        {title ?? t('ui.empty.title')}
      </p>
      <p className="max-w-[46ch] text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
        {message ?? t('ui.empty.message')}
      </p>
      {action ? (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">{action}</div>
      ) : null}
    </div>
  );
}
