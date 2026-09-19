import { useT } from '../i18n';

/**
 * A placeholder block for content that is still loading.
 *
 * Announced as busy (`role="status"` + a screen-reader sentence) so the wait is explicit rather
 * than a silently empty page. Sizes are inline so a caller can match the real content exactly.
 */
export type SkeletonProps = {
  /** Number of lines. The last line of a multi-line block is shortened, like real text. */
  lines?: number;
  /** Height of each line in px. */
  height?: number;
  /** Gap between lines in px. */
  gap?: number;
  className?: string;
  label?: string;
};

export function Skeleton({
  lines = 1,
  height = 14,
  gap = 8,
  className = '',
  label,
}: SkeletonProps) {
  const { t } = useT();
  const count = Math.max(1, lines);

  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label ?? t('ui.skeleton.label')}</span>
      {Array.from({ length: count }, (_unused, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)]"
          style={{
            height,
            width: count > 1 && index === count - 1 ? '60%' : '100%',
            marginTop: index === 0 ? 0 : gap,
          }}
        />
      ))}
    </div>
  );
}
