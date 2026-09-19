import { Link } from '../lib/router';
import { useT } from '../i18n';
import { Card } from '../ui';
import { AccountPanel } from '../components/AccountPanel';
import { ThemeToggle } from '../components/ThemeToggle';
import { LocaleSwitch } from '../i18n';
import { PageHeader, RequireAuth } from '../components/shared';

/**
 * The account page: who you are, what you can reach in one tap, and the two settings that belong to
 * this browser (language and theme) rather than to the server.
 */
export function Account() {
  return (
    <RequireAuth>
      <AccountView />
    </RequireAuth>
  );
}

function AccountView() {
  const { t } = useT();

  const LINKS = [
    { to: '/orders', key: 'account.links.orders' },
    { to: '/wallet', key: 'account.links.wallet' },
    { to: '/support', key: 'account.links.support' },
    { to: '/notifications', key: 'nav.notifications' },
  ] as const;

  return (
    <div>
      <PageHeader title={t('account.page.title')} subtitle={t('account.page.subtitle')} />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <AccountPanel />

        <div className="flex flex-col gap-4">
          <Card title={t('locale.label')}>
            <div className="flex flex-wrap items-center gap-2">
              <LocaleSwitch />
              <ThemeToggle />
            </div>
          </Card>

          <Card title={t('nav.menu')}>
            <ul className="flex flex-col">
              {LINKS.map((entry) => (
                <li key={entry.to} className="border-b border-[var(--color-line)] last:border-0">
                  <Link
                    to={entry.to}
                    className="flex items-center justify-between gap-3 py-2.5 text-[14px] hover:text-[var(--color-accent-ink)]"
                  >
                    <span>{t(entry.key)}</span>
                    <span aria-hidden className="rtl:rotate-180">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
