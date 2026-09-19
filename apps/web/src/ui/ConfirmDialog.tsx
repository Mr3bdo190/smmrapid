import { useEffect, useId, useRef } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { useT } from '../i18n';
import { Button } from './Button';

/**
 * A confirmation dialog built on the native `<dialog>` element.
 *
 * Native `<dialog>` + `showModal()` gives us, for free and everywhere: a real modal (the rest of
 * the page is inert for assistive tech), a focus trap, Escape to close, and a focus return to the
 * element that opened it. On top of that:
 *
 *   - `aria-labelledby` / `aria-describedby` are wired from the rendered title/description;
 *   - Escape and a backdrop click both cancel (never confirm);
 *   - focus starts on **Cancel**, so a stray Enter cannot run a destructive action;
 *   - Enter/Space work on both buttons because they are real buttons in DOM order.
 */
export type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive confirmations are red; everything else uses the accent button. */
  tone?: 'danger' | 'primary';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const { t } = useT();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const base = useId();
  const titleId = `${base}-title`;
  const descriptionId = `${base}-description`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function onClickBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onCancel();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClick={onClickBackdrop}
      // Escape closes natively; we only need to tell the parent.
      onCancel={onCancel}
      className="card m-auto w-[calc(100%-2rem)] max-w-[420px] p-5 text-[var(--color-ink)] backdrop:bg-[var(--color-ink)]/40"
    >
      <h2 id={titleId} className="display text-[17px] font-semibold">
        {title ?? t('ui.confirm.title')}
      </h2>

      {description ? (
        <p
          id={descriptionId}
          className="mt-2 text-[13px] leading-relaxed text-[var(--color-ink-soft)]"
        >
          {description}
        </p>
      ) : null}

      {children}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button ref={cancelRef} variant="ghost" onClick={onCancel} disabled={busy}>
          {cancelLabel ?? t('ui.confirm.cancel')}
        </Button>
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={busy} onClick={onConfirm}>
          {confirmLabel ?? t('ui.confirm.confirm')}
        </Button>
      </div>
    </dialog>
  );
}
