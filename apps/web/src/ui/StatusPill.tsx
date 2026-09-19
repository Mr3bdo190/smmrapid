import { useT } from '../i18n';
import type { ReactNode } from 'react';
import { TONE_PILL_CLASS } from './tone';
import type { Tone } from './tone';
import { ToneIcon } from './ToneIcon';

/**
 * A squared, tinted status label (the `.pill` primitive).
 *
 * Accessibility rule from the design language: a status is never carried by colour alone. Each
 * pill therefore renders an icon **and** a screen-reader-only tone word before the label, so
 * "Active" in green and "Suspended" in red are distinguishable without seeing the colour.
 */
export type StatusPillProps = {
  tone: Tone;
  /** The visible text — required, never optional: the pill must say what it means. */
  label: ReactNode;
  /** Extra context appended to the accessible name (e.g. a date). */
  srSuffix?: string;
  title?: string;
  className?: string;
};

export function StatusPill({ tone, label, srSuffix, title, className = '' }: StatusPillProps) {
  const { t } = useT();

  return (
    <span className={`pill ${TONE_PILL_CLASS[tone]} ${className}`} title={title}>
      <span aria-hidden="true" className="shrink-0">
        <ToneIcon tone={tone} />
      </span>
      <span className="sr-only">{t(`ui.tone.${tone}`)}: </span>
      <span>{label}</span>
      {srSuffix ? <span className="sr-only"> {srSuffix}</span> : null}
    </span>
  );
}
