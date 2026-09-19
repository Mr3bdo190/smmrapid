import { useState } from 'react';
import { Link, usePathname } from '../lib/router';
import { useAuth } from '../auth/AuthProvider';
import { LocaleSwitch, useT } from '../i18n';
import { ThemeToggle } from './ThemeToggle';
import { Button, Money, Spinner } from '../ui';

/**
 * The top bar: where you are, what else is there, and what needs your attention.
 *
 * Two rules the design follows:
 *  - the unread badge is the API's count, never a guess, and it disappears the moment the list is
 *    marked read (the support page reloads it after marking);
 *  - when nobody is signed in the links that need an account still appear, because hiding them makes
 *    the site look empty — tapping one asks for a sign-in instead of showing a dead end.
 */

const LINKS = [
  { to: '/', key: 'nav.home', needsAuth: false },
  { to: '/services', key: 'nav.services', needsAuth: false },
  { to: '/orders', key: 'nav.orders', needsAuth: true },
  { to: '/wallet', key: 'nav.wallet', needsAuth: true },
  { to: '/support', key: 'nav.support', needsAuth: true },
] as const;

export function BrandMark() {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-accent)]">
      <span className="display text-[16px] font-bold text-white">S</span>
    </span>
  );
}

export function NavBar({ unread = 0 }: { unread?: number }) {
  const { t } = useT();
  const path = usePathname();
  const { user, account, ready } = useAuth();
  const [open, setOpen] = useState(false);
  const signedIn = Boolean(user);

  const isActive = (to: string) => (to === '/' ? path === '/' : path === to || path.startsWith(`${to}/`));

  const link = (to: string, key: string, needsAuth: boolean) => {
    const className = `rounded-[var(--radius-xs)] px-3 py-2 text-[14px] transition-colors ${
      isActive(to)
        ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] font-semibold'
        : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-ink)]'
    }`;
    // Signed out: the link is still real — it opens the sign-in panel instead of a dead end.
    return (
      <Link key={to} to={needsAuth && !signedIn ? '/signin' : to} className={className} onClick={() => setOpen(false)}>
        {t(key as never)}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-line)] bg-[var(--color-surface)]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1100px] items-center gap-3 px-5 py-3">
        <Link to="/" className="flex items-center gap-2.5" aria-label={t('common.appName')}>
          <BrandMark />
          <span className="display hidden text-[17px] font-semibold tracking-tight sm:inline">
            {t('common.appName')}
          </span>
        </Link>

        <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label={t('nav.menu')}>
          {LINKS.map((entry) => link(entry.to, entry.key, entry.needsAuth))}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <div className="hidden items-center gap-1 lg:flex">
            <LocaleSwitch />
            <ThemeToggle />
          </div>
          {ready && !signedIn ? (
            <Link to="/signin" className="btn btn-primary text-[14px]">
              {t('common.signIn')}
            </Link>
          ) : null}

          {signedIn ? (
            <>
              <Link
                to="/notifications"
                className="relative rounded-[var(--radius-xs)] px-2.5 py-2 text-[14px] text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-sunken)]"
                aria-label={t('nav.notifications')}
              >
                <span aria-hidden>🔔</span>
                {unread > 0 ? (
                  <span className="num absolute -top-0.5 end-0 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--color-danger)] px-1 text-[11px] font-semibold text-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                ) : null}
              </Link>
              <Link to="/wallet" className="hidden items-center gap-2 rounded-[var(--radius-xs)] border border-[var(--color-line)] px-3 py-1.5 sm:flex">
                <span className="micro">{t('nav.wallet')}</span>
                {account ? (
                  <Money minor={account.wallet.balanceMinor} currency={account.wallet.currency} className="text-[14px]" />
                ) : (
                  <Spinner className="h-4 w-4" />
                )}
              </Link>
              <Link to="/account" className="rounded-[var(--radius-xs)] px-2 py-1.5 text-[14px] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
                {t('nav.account')}
              </Link>
            </>
          ) : null}

          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {t('nav.menu')}
          </Button>
        </div>
      </div>

      {open ? (
        <nav className="border-t border-[var(--color-line)] px-5 py-2 md:hidden" aria-label={t('nav.menu')}>
          <div className="flex flex-col">{LINKS.map((entry) => link(entry.to, entry.key, entry.needsAuth))}
            {signedIn ? link('/notifications', 'nav.notifications', true) : null}
            {signedIn ? link('/account', 'nav.account', true) : null}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
