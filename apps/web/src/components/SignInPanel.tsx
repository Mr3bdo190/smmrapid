import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useT } from '../i18n';
import { Button, Card, ErrorBanner, Tabs, TextField } from '../ui';

/**
 * Sign in / create account / reset password.
 *
 * Migrated to the bilingual foundation: **no string is hard-coded here** — every visible word comes
 * from the dictionary (`useT()`), and every failure is rendered by `ErrorBanner`, which maps the
 * server or Firebase error code to a localized {title, message, nextStep} from the single error
 * catalogue. An unknown code still shows the server's own message plus the support reference.
 *
 * Accessibility: the two entry modes are a real tab list (arrow keys, Home/End, RTL-aware), each
 * field has a label plus `aria-describedby` wiring, the submit button keeps its label while it
 * loads, and both panels stay mounted so a half-typed email survives a mode switch.
 */
type Mode = 'signin' | 'signup' | 'reset';

/** A success notice, styled from the primitives but with a logical (RTL-safe) accent bar. */
function AuthNotice({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="relative mt-4 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-ok-soft)] py-2.5 pe-3 ps-4 text-[13px] text-[var(--color-ink-soft)]"
    >
      <span aria-hidden="true" className="absolute inset-y-0 start-0 w-[3px] bg-[var(--color-ok)]" />
      {children}
    </div>
  );
}

export function SignInPanel() {
  const { signIn, signUp, sendReset, firebaseReady } = useAuth();
  const { t } = useT();

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  /** The thrown value itself, not a message: `ErrorBanner` needs the code to localize it. */
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>, submitMode: Mode) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (submitMode === 'signin') await signIn(email, password);
      else if (submitMode === 'signup') await signUp(name, email, password);
      else {
        await sendReset(email);
        setNotice(t('auth.resetSent'));
      }
    } catch (thrown) {
      setError(thrown);
    } finally {
      setBusy(false);
    }
  }

  function toggleReset(next: boolean) {
    setMode(next ? 'reset' : 'signin');
    setError(null);
    setNotice(null);
  }

  /**
   * One form per mode, heading included, so the tab panel contains everything that describes it.
   * Both are ordinary elements (not nested components), which keeps React from remounting the
   * inputs — and therefore keeps the caret — on every keystroke.
   */
  function formFor(formMode: Mode) {
    return (
      <form className="flex flex-col gap-3.5" onSubmit={(event) => void submit(event, formMode)}>
        <div>
          <h1 className="display text-[22px] font-semibold text-[var(--color-ink)]">
            {t(`auth.title.${formMode}`)}
          </h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
            {t(`auth.hint.${formMode}`)}
          </p>
        </div>

        {formMode === 'signup' ? (
          <TextField
            label={t('auth.field.name')}
            placeholder={t('auth.placeholder.name')}
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        ) : null}

        <TextField
          label={t('auth.field.email')}
          type="email"
          required
          inputMode="email"
          autoComplete={formMode === 'signup' ? 'email' : 'username'}
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        {formMode !== 'reset' ? (
          <TextField
            label={t('auth.field.password')}
            hint={formMode === 'signup' ? t('auth.hint.password') : undefined}
            type="password"
            required
            minLength={8}
            autoComplete={formMode === 'signup' ? 'new-password' : 'current-password'}
            placeholder={t('auth.placeholder.password')}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        ) : null}

        <Button
          type="submit"
          variant="primary"
          loading={busy}
          disabled={!firebaseReady}
          className="mt-1 w-full"
        >
          {busy ? t(`auth.busy.${formMode}`) : t(`auth.submit.${formMode}`)}
        </Button>
      </form>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-[460px]">
      {mode === 'reset' ? (
        formFor('reset')
      ) : (
        <Tabs
          label={t('auth.tabsLabel')}
          value={mode}
          onChange={(id) => setMode(id === 'signup' ? 'signup' : 'signin')}
          items={[
            { id: 'signin', label: t('auth.tab.signIn'), content: formFor('signin') },
            { id: 'signup', label: t('auth.tab.signUp'), content: formFor('signup') },
          ]}
        />
      )}

      {!firebaseReady ? (
        <ErrorBanner
          className="mt-4"
          tone="warn"
          error={{ code: 'AUTH_NOT_CONFIGURED' }}
          title={t('shell.authDisabled.title')}
        >
          <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--color-ink-muted)]">
            {t('auth.firebaseMissing')}
          </p>
        </ErrorBanner>
      ) : null}

      {error ? (
        <ErrorBanner
          className="mt-4"
          error={error}
          onDismiss={() => {
            setError(null);
          }}
        />
      ) : null}

      {notice ? <AuthNotice>{notice}</AuthNotice> : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px]">
        {mode === 'reset' ? (
          <Button variant="ghost" size="sm" onClick={() => toggleReset(false)}>
            {t('auth.backToSignIn')}
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => toggleReset(true)}>
            {t('auth.forgotPassword')}
          </Button>
        )}
        <span className="text-[var(--color-ink-faint)]">{t('auth.privacyNote')}</span>
      </div>
    </Card>
  );
}
