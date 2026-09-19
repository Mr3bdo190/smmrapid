import { useT } from '../i18n';

/**
 * An indeterminate progress indicator.
 *
 * It announces itself (`role="status"` + a screen-reader-only sentence) so a customer using a
 * screen reader knows the page is working rather than empty.
 */
export function Spinner({
  size = 16,
  className = '',
  label,
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  const { t } = useT();

  return (
    <span className={`inline-flex items-center ${className}`} role="status">
      <svg
        className="animate-spin"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.25" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">{label ?? t('ui.spinner.label')}</span>
    </span>
  );
}
