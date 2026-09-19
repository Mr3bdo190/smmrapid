import type { ReactNode } from 'react';
import { Link, usePathname } from '../lib/router';
import { useT } from '../i18n';
import { useAuth } from '../auth/AuthProvider';
import { Card, EmptyState, Skeleton } from '../ui';

/**
 * The admin gate and its navigation.
 *
 * The check here is a *courtesy*: it decides what the panel shows, not what the server allows. Every
 * admin endpoint authorises the request on its own, so a customer who types /admin/services sees this
 * explanation and, if they called the API directly anyway, gets a 403 from the server and no data.
 * Hiding a button is never the control.
 */

const SECTIONS = [
  { to: '/admin', key: 'admin.nav.dashboard', permission: null },
  { to: '/admin/services', key: 'admin.nav.services', permission: 'services.view' },
  { to: '/admin/users', key: 'admin.nav.users', permission: 'users.view' },
] as const;

export function useIsStaff(): { ready: boolean; allowed: boolean; permissions: string[] } {
  const { ready, account } = useAuth();
  const permissions = account?.permissions ?? [];
  return {
    ready,
    allowed: permissions.some((permission) => permission.startsWith('services.') || permission.startsWith('users.') || permission.startsWith('orders.') || permission === 'reports.view'),
    permissions,
  };
}

export function AdminGate({ children, permission }: { children: ReactNode; permission?: string }) {
  const { t } = useT();
  const { ready, account } = useAuth();
  const staff = useIsStaff();

  if (!ready || !account) {
    return (
      <Card>
        <Skeleton lines={3} />
        <p className="mt-3 text-[13px] text-[var(--color-ink-muted)]">{t('admin.loading')}</p>
      </Card>
    );
  }

  const permissions = account.permissions ?? [];
  const allowed = permission ? permissions.includes(permission) : staff.allowed;

  if (!allowed) {
    return (
      <Card className="mx-auto max-w-[560px]">
        <EmptyState
          title={t('admin.denied.title')}
          message={t('admin.denied.message')}
          action={
            <Link to="/" className="btn btn-ghost">
              {t('nav.home')}
            </Link>
          }
        />
      </Card>
    );
  }

  return <>{children}</>;
}

export function AdminNav() {
  const { t } = useT();
  const path = usePathname();
  const { permissions } = useIsStaff();

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-[var(--color-line)] pb-3" aria-label={t('admin.title')}>
      {SECTIONS.map((section) => {
        const visible = section.permission === null || permissions.includes(section.permission);
        if (!visible) return null;
        const active = path === section.to;
        return (
          <Link
            key={section.to}
            to={section.to}
            aria-current={active ? 'page' : undefined}
            className={`rounded-[var(--radius-xs)] px-3 py-2 text-[14px] ${
              active
                ? 'bg-[var(--color-accent-soft)] font-semibold text-[var(--color-accent-ink)]'
                : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-sunken)]'
            }`}
          >
            {t(section.key)}
          </Link>
        );
      })}
    </nav>
  );
}
