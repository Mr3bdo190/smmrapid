import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { FOCUS_RING, TAP_TARGET } from './primitives';
import { Spinner } from './Spinner';

/**
 * The one button in the app.
 *
 * Built on the `.btn` primitive in `src/index.css` (no parallel styling system): variants only bind
 * the existing tokens. Every size keeps a 44px minimum target, every variant carries the shared
 * focus ring, and `loading` keeps the label visible (a button that empties itself while working
 * reads as broken).
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

const VARIANT_CLASS: Readonly<Record<ButtonVariant, string>> = {
  primary: 'btn-primary',
  secondary:
    'border-[var(--color-line-strong)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-surface-sunken)]',
  ghost: 'btn-ghost',
  // Ink on the danger token: `--color-canvas` is near-white in light mode and near-black in dark,
  // so the label keeps its contrast in both themes without a second hard-coded colour.
  danger:
    'border-[var(--color-danger)] bg-[var(--color-danger)] text-[var(--color-canvas)] hover:opacity-90',
};

type BaseButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> & {
  /** React 19: `ref` is a normal prop on function components, so the kit forwards it directly. */
  ref?: Ref<HTMLButtonElement>;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Replaces the label while keeping the space, so the layout does not jump. */
  children?: ReactNode;
};

/**
 * `iconOnly` is a separate branch of the type, which makes `aria-label` **required** for an
 * icon-only button — an unlabelled icon button cannot be written by accident.
 */
export type ButtonProps = BaseButtonProps &
  (
    | { iconOnly: true; 'aria-label': string }
    | { iconOnly?: false; 'aria-label'?: string }
  );

export function Button(props: ButtonProps) {
  const {
    variant = 'primary',
    size = 'md',
    loading = false,
    iconOnly = false,
    disabled,
    className = '',
    type = 'button',
    children,
    ...rest
  } = props;

  const classes = [
    'btn',
    VARIANT_CLASS[variant],
    TAP_TARGET,
    FOCUS_RING,
    size === 'sm' ? 'px-3 text-[13px]' : '',
    iconOnly ? 'w-11 px-0' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      {...rest}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <Spinner size={14} /> : null}
      {children}
    </button>
  );
}
