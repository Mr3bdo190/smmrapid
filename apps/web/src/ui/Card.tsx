import type { ElementType, ReactNode } from 'react';

/**
 * A surface with a hairline border — the `.card` primitive from `src/index.css`.
 *
 * The optional header follows the design language: an uppercase micro kicker, a display title and
 * a hairline rule before the body.
 */
export type CardProps = {
  as?: 'section' | 'div' | 'article';
  id?: string;
  /** Uppercase micro label above the title. */
  kicker?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  /** Buttons/links aligned to the end of the header. */
  actions?: ReactNode;
  /** Remove the default padding when the card holds a table or a list that bleeds to the edge. */
  padded?: boolean;
  className?: string;
  children?: ReactNode;
};

export function Card({
  as = 'section',
  id,
  kicker,
  title,
  description,
  actions,
  padded = true,
  className = '',
  children,
}: CardProps) {
  const Tag = as as ElementType;
  const hasHeader = Boolean(kicker || title || description || actions);

  return (
    <Tag id={id} className={`card ${padded ? 'p-5' : ''} ${className}`}>
      {hasHeader ? (
        <div
          className={`flex flex-wrap items-start justify-between gap-3 ${
            children ? 'hairline mb-4 pb-3' : ''
          }`}
        >
          <div className="min-w-0">
            {kicker ? <p className="micro">{kicker}</p> : null}
            {title ? (
              <h2 className="display mt-1 text-[18px] font-semibold text-[var(--color-ink)]">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </Tag>
  );
}
