import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { describeError, useT } from '../i18n';
import { Button } from './Button';
import { AlertIcon, CheckIcon, CopyIcon, InfoIcon } from './icons';
import { FOCUS_RING, TAP_TARGET } from './primitives';

/**
 * The single way the app shows an error.
 *
 * It renders the four things the owner requires: **what happened** (title), **why** (message),
 * **what to do next** (nextStep, with the catalogue's own action button) and the **support
 * reference** when the server sent one — plus the raw code so support can match it against the
 * logs, and the server's wording behind a disclosure.
 *
 * Pass any thrown value (`error={anything}`). An unknown code is not an error screen: it falls back
 * to the server's message, the reference and a "try again, send us the reference" next step.
 *
 * Layout is logical-property only (start/end, ps/pe), so RTL mirrors it with no special casing.
 */
export type ErrorBannerTone = 'danger' | 'warn' | 'info' | 'ok';

const TONE_SURFACE: Readonly<Record<ErrorBannerTone, string>> = {
  danger: 'bg-[var(--color-danger-soft)]',
  warn: 'bg-[var(--color-warn-soft)]',
  info: 'bg-[var(--color-info-soft)]',
  ok: 'bg-[var(--color-ok-soft)]',
};

const TONE_ACCENT: Readonly<Record<ErrorBannerTone, string>> = {
  danger: 'bg-[var(--color-danger)]',
  warn: 'bg-[var(--color-warn)]',
  info: 'bg-[var(--color-info)]',
  ok: 'bg-[var(--color-ok)]',
};

function ToneGlyph({ tone }: { tone: ErrorBannerTone }) {
  if (tone === 'ok') return <CheckIcon size={16} />;
  if (tone === 'info') return <InfoIcon size={16} />;
  return <AlertIcon size={16} />;
}

export type ErrorBannerProps = {
  /** Anything thrown: an ApiError, a FirebaseError, a fetch TypeError, a string… */
  error: unknown;
  tone?: ErrorBannerTone;
  /** Overrides the catalogue title. */
  title?: string;
  /** Retry the failed operation (label comes from the dictionary). */
  onRetry?: () => void;
  /** Perform the catalogue's suggested next action (add funds, sign in again…). */
  onAction?: () => void;
  /** Overrides the catalogue's action label. */
  actionLabel?: string;
  onDismiss?: () => void;
  className?: string;
  /** Extra detail under the actions (e.g. a validation field list). */
  children?: ReactNode;
};

export function ErrorBanner({
  error,
  tone = 'danger',
  title,
  onRetry,
  onAction,
  actionLabel,
  onDismiss,
  className = '',
  children,
}: ErrorBannerProps) {
  const { t, locale } = useT();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  if (!error) return null;

  const resolved = describeError(error, locale);
  const nextActionLabel = actionLabel ?? resolved.actionLabel;
  const showAction = Boolean(onAction && nextActionLabel);

  async function copyReference(): Promise<void> {
    if (!resolved.supportRef) return;
    try {
      await navigator.clipboard?.writeText(resolved.supportRef);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the reference is selectable text anyway */
    }
  }

  return (
    <div
      role={tone === 'danger' || tone === 'warn' ? 'alert' : 'status'}
      className={`relative overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-line)] py-3 pe-3.5 ps-4 text-[13px] ${TONE_SURFACE[tone]} ${className}`}
    >
      <span aria-hidden="true" className={`absolute inset-y-0 start-0 w-[3px] ${TONE_ACCENT[tone]}`} />

      <div className="flex items-start gap-2.5">
        <span aria-hidden="true" className="mt-0.5 shrink-0">
          <ToneGlyph tone={tone} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="micro">{t('errors.code')}</span>
            <bdi className="num text-[11.5px] font-semibold text-[var(--color-ink-soft)]">
              {resolved.code}
            </bdi>
            {!resolved.known ? (
              <span className="pill pill-neutral">{t('errors.unlistedCode')}</span>
            ) : null}
          </div>

          <p className="mt-1 font-semibold text-[var(--color-ink)]">{title ?? resolved.title}</p>
          <p className="mt-1 leading-relaxed text-[var(--color-ink-soft)]">{resolved.message}</p>

          <div className="mt-2">
            <span className="micro">{t('errors.nextStep')}</span>
            <p className="mt-0.5 leading-relaxed text-[var(--color-ink-soft)]">{resolved.nextStep}</p>
          </div>

          {resolved.supportRef ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="micro">{t('common.supportReference')}</span>
              <bdi className="num select-all text-[12px] font-semibold text-[var(--color-ink)]">
                {resolved.supportRef}
              </bdi>
              <button
                type="button"
                onClick={() => void copyReference()}
                aria-label={copied ? t('common.copied') : t('common.copy')}
                className={`btn btn-quiet ${TAP_TARGET} ${FOCUS_RING} px-2 text-[12px]`}
              >
                <CopyIcon size={14} />
              </button>
              <span className="text-[12px] text-[var(--color-ink-muted)]">
                {t('errors.supportRefHint')}
              </span>
            </div>
          ) : null}

          {showAction || onRetry || onDismiss ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {showAction && nextActionLabel ? (
                <Button size="sm" variant="secondary" onClick={onAction}>
                  {nextActionLabel}
                </Button>
              ) : null}
              {onRetry ? (
                <Button size="sm" variant={showAction ? 'ghost' : 'secondary'} onClick={onRetry}>
                  {t('common.retry')}
                </Button>
              ) : null}
              {onDismiss ? (
                <Button size="sm" variant="ghost" onClick={onDismiss}>
                  {t('common.dismiss')}
                </Button>
              ) : null}
            </div>
          ) : null}

          {resolved.detail ? (
            <details className="mt-2">
              <summary className={`micro cursor-pointer ${FOCUS_RING}`}>
                {t('common.technicalDetails')}
              </summary>
              <p className="num mt-1 break-words text-[11.5px] text-[var(--color-ink-muted)]">
                <bdi>{resolved.detail}</bdi>
              </p>
            </details>
          ) : null}

          {children}
        </div>
      </div>
    </div>
  );
}
