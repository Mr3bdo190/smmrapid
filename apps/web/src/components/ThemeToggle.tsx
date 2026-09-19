import { useEffect, useState } from 'react';
import { useT } from '../i18n';

/**
 * Light/dark, remembered per browser.
 *
 * The initial value follows the stored choice, then the system preference, so a first visit matches
 * the phone's own setting; the class on `<html>` is the single switch the whole stylesheet reads.
 */
export function ThemeToggle() {
  const { t } = useT();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('smmrapid.theme');
      const prefers = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
      setDark(stored ? stored === 'dark' : prefers);
    } catch {
      /* storage blocked — keep the light default */
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('smmrapid.theme', dark ? 'dark' : 'light');
    } catch {
      /* storage blocked — the class still applies for this session */
    }
  }, [dark]);

  return (
    <button
      type="button"
      className="btn btn-quiet"
      onClick={() => setDark((value) => !value)}
      aria-label={t('theme.toggle')}
      aria-pressed={dark}
    >
      {dark ? t('theme.light') : t('theme.dark')}
    </button>
  );
}
