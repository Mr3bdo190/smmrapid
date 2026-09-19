/**
 * Semantic tones for the kit.
 *
 * A tone is never carried by colour alone: every tone has an icon and a screen-reader word
 * (see `StatusPill`), because red/green is invisible to a large share of customers.
 */
export type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'accent' | 'neutral';

/** The existing `.pill-*` primitives in `src/index.css` — the kit does not invent new ones. */
export const TONE_PILL_CLASS: Readonly<Record<Tone, string>> = {
  ok: 'pill-ok',
  warn: 'pill-warn',
  danger: 'pill-danger',
  info: 'pill-info',
  accent: 'pill-accent',
  neutral: 'pill-neutral',
};

/** Text colour for an amount/status rendered in a tone. */
export const TONE_TEXT_CLASS: Readonly<Record<Tone, string>> = {
  ok: 'text-[var(--color-ok)]',
  warn: 'text-[var(--color-warn)]',
  danger: 'text-[var(--color-danger)]',
  info: 'text-[var(--color-info)]',
  accent: 'text-[var(--color-accent-strong)]',
  neutral: 'text-[var(--color-ink)]',
};
