/**
 * Shared class fragments.
 *
 * The design language lives in `src/index.css`; these constants only bind a few Tailwind
 * utilities to it once, so every interactive element gets the same focus ring and the same
 * 44px minimum touch target instead of each file inventing its own.
 */

/** Visible keyboard focus. Logical `outline-offset` keeps it identical in RTL and LTR. */
export const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]';

/** 44px minimum target (WCAG 2.5.5 / mobile tap comfort) for anything clickable. */
export const TAP_TARGET = 'min-h-11';

/** Screen-reader-only text (Tailwind's `sr-only`, re-exported for readability at call sites). */
export const SR_ONLY = 'sr-only';
