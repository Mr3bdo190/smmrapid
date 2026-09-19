import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { LocaleProvider, LocaleSwitch, useT } from './i18n';
import { SignInPanel } from './components/SignInPanel';
import { AccountPanel } from './components/AccountPanel';

/** Brand mark: a squared signal block — part of the new identity, no image dependency. */
function BrandMark() {
  return (
    <span className="grid h-8 w-8 place-items-center rounded-[var(--radius-xs)] bg-[var(--color-accent)]">
      <span className="display text-[15px] font-bold text-white">S</span>
    </span>
  );
}

function ThemeToggle() {
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
    >
      {dark ? t('theme.light') : t('theme.dark')}
    </button>
  );
}

function Shell() {
  const { t } = useT();
  const { ready, user, firebaseReady } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  const signedIn = Boolean(user);

  return (
    <div className="app-shell">
      <header className="sticky top-0 z-10 border-b border-[var(--color-line)] bg-[var(--color-surface)]/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1100px] items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-3">
            <BrandMark />
            <span className="display text-[17px] font-semibold tracking-tight">{t('common.appName')}</span>
            <span className="pill pill-accent hidden sm:inline-flex">{t('shell.phaseBadge')}</span>
          </div>
          <div className="flex items-center gap-2">
            <LocaleSwitch />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1100px] flex-1 px-5 py-8">
        {!ready ? (
          <div className="card mx-auto w-full max-w-[440px] p-6">
            <p className="text-[13px] text-[var(--color-ink-muted)]">{t('shell.loadingSession')}</p>
          </div>
        ) : signedIn ? (
          <AccountPanel />
        ) : showAuth || firebaseReady ? (
          <SignInPanel />
        ) : (
          <div className="card mx-auto w-full max-w-[520px] p-6">
            <p className="micro">{t('shell.authDisabled.kicker')}</p>
            <h1 className="display mt-1 text-[22px] font-semibold">{t('shell.authDisabled.title')}</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
              {t('shell.authDisabled.message')}
            </p>
            <button className="btn btn-ghost mt-4" onClick={() => setShowAuth(true)}>
              {t('shell.authDisabled.action')}
            </button>
          </div>
        )}
      </main>

      <footer className="border-t border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="mx-auto flex w-full max-w-[1100px] flex-wrap items-center justify-between gap-3 px-5 py-4">
          <span className="micro">
            {t('common.appName')} · {new Date().getFullYear()}
          </span>
          <span className="text-[12px] text-[var(--color-ink-faint)]">{t('shell.phaseNote')}</span>
        </div>
      </footer>
    </div>
  );
}

/**
 * The locale provider wraps everything: any component below may call `useT()`, and the document's
 * lang/dir follow the chosen language. Forgetting this wrapper is a runtime crash, not a type
 * error — which is why the SSR smoke test renders this exact component.
 */
export default function App() {
  return (
    <LocaleProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </LocaleProvider>
  );
}
