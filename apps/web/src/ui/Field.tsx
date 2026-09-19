import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { FOCUS_RING, TAP_TARGET } from './primitives';

/**
 * A form field with a real label, a hint and an error, wired for assistive technology.
 *
 * Accessibility contract (guaranteed by the API, not by convention):
 *   - the label is a real `<label for>` — never a placeholder standing in for a label;
 *   - `aria-describedby` points at the hint and/or the error element, so both are announced;
 *   - `aria-invalid` is set exactly when there is an error;
 *   - the error text is announced immediately (`role="alert"`).
 *
 * `Field` is the render-prop form, used when the control is something the kit does not own
 * (a select, a combobox, a date picker). `TextField`/`TextAreaField` are the common cases.
 */
export type FieldControlProps = {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
};

export type FieldProps = {
  /** Optional explicit id; generated when omitted. */
  id?: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
};

export function Field({ id, label, hint, error, required, className = '', children }: FieldProps) {
  const generated = useId();
  const fieldId = id ?? `field-${generated}`;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <label className="label" htmlFor={fieldId}>
        {label}
        {required ? (
          <span aria-hidden="true" className="text-[var(--color-danger)]">
            {' *'}
          </span>
        ) : null}
      </label>

      {children({
        id: fieldId,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })}

      {hint ? (
        <p id={hintId} className="mt-1.5 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 text-[12px] font-medium leading-relaxed text-[var(--color-danger)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

const CONTROL_CLASSES = `field ${TAP_TARGET} ${FOCUS_RING}`;

export type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'required'> & {
  id?: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  containerClassName?: string;
};

export function TextField({
  id,
  label,
  hint,
  error,
  required,
  containerClassName,
  className = '',
  ...rest
}: TextFieldProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required} className={containerClassName}>
      {(control) => (
        <input
          {...rest}
          {...control}
          required={required || undefined}
          className={`${CONTROL_CLASSES} ${error ? 'border-[var(--color-danger)]' : ''} ${className}`}
        />
      )}
    </Field>
  );
}

export type TextAreaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'required'> & {
  id?: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  containerClassName?: string;
};

export function TextAreaField({
  id,
  label,
  hint,
  error,
  required,
  containerClassName,
  className = '',
  rows = 3,
  ...rest
}: TextAreaFieldProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required} className={containerClassName}>
      {(control) => (
        <textarea
          {...rest}
          {...control}
          rows={rows}
          required={required || undefined}
          className={`${CONTROL_CLASSES} h-auto py-2.5 leading-relaxed ${error ? 'border-[var(--color-danger)]' : ''} ${className}`}
        />
      )}
    </Field>
  );
}
