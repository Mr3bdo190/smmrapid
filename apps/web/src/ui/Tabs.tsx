import { useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useT } from '../i18n';
import { FOCUS_RING, TAP_TARGET } from './primitives';

/**
 * Tabs with a complete keyboard model (WAI-ARIA tabs pattern).
 *
 *   - `role="tablist"` / `role="tab"` / `role="tabpanel"` with `aria-controls` and `aria-labelledby`;
 *   - roving tabindex: only the active tab is in the tab order, so Tab moves *into* the panel;
 *   - Arrow Right/Left move between tabs **respecting the direction** (in RTL, Arrow Right moves
 *     to the previous tab, which is what the customer sees);
 *   - Home/End jump to the first/last tab; selection follows focus (automatic activation).
 *
 * The underline style is hairline-based (`border-b`), so it mirrors correctly in RTL with no
 * left/right assumptions.
 */
export type TabItem = {
  id: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
};

export type TabsProps = {
  items: readonly TabItem[];
  /** Controlled value. Leave undefined for uncontrolled usage. */
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  /** Accessible name of the tab list. Required — a nameless tab list is unusable with a reader. */
  label: string;
  className?: string;
};

export function Tabs({ items, value, defaultValue, onChange, label, className = '' }: TabsProps) {
  const { dir } = useT();
  const base = useId();
  const [internal, setInternal] = useState<string>(
    defaultValue ?? items.find((item) => !item.disabled)?.id ?? '',
  );
  const active = value ?? internal;
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const enabledIds = items.filter((item) => !item.disabled).map((item) => item.id);

  function activate(id: string, focus: boolean) {
    if (value === undefined) setInternal(id);
    onChange?.(id);
    if (focus) {
      const index = items.findIndex((item) => item.id === id);
      buttonRefs.current[index]?.focus();
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = enabledIds.indexOf(active);
    const rtl = dir === 'rtl';
    let target: number;

    switch (event.key) {
      case 'ArrowRight':
        target = rtl ? current - 1 : current + 1;
        break;
      case 'ArrowLeft':
        target = rtl ? current + 1 : current - 1;
        break;
      case 'Home':
        target = 0;
        break;
      case 'End':
        target = enabledIds.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const wrapped = ((target % enabledIds.length) + enabledIds.length) % enabledIds.length;
    const nextId = enabledIds[wrapped];
    if (nextId) activate(nextId, true);
  }

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        className="flex items-stretch gap-1 border-b border-[var(--color-line)]"
        onKeyDown={onKeyDown}
      >
        {items.map((item, index) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              ref={(node) => {
                buttonRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${item.id}`}
              aria-controls={`${base}-panel-${item.id}`}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              onClick={() => activate(item.id, false)}
              className={[
                'peer -mb-px border-b-2 px-3 text-[13px] font-semibold transition-colors',
                TAP_TARGET,
                FOCUS_RING,
                selected
                  ? 'border-[var(--color-accent)] text-[var(--color-ink)]'
                  : 'border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]',
                item.disabled ? 'cursor-not-allowed opacity-50' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${base}-panel-${item.id}`}
          aria-labelledby={`${base}-tab-${item.id}`}
          tabIndex={0}
          hidden={item.id !== active}
          className={`pt-5 ${FOCUS_RING}`}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
