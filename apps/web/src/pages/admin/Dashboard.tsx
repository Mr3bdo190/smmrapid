import { Link } from '../../lib/router';
import { useT, useLocale } from '../../i18n';
import { useAuth } from '../../auth/AuthProvider';
import { fetchAdminServices, fetchAdminUsers } from '../../data/admin';
import { useAsync } from '../../lib/useAsync';
import { Button, Card, EmptyState, Skeleton } from '../../ui';
import { FailureCard, PageHeader, RequireAuth } from '../../components/shared';
import { AdminGate, AdminNav } from '../../admin/AdminGate';

/**
 * The overview: the two numbers that decide whether the shop can sell at all (how many services are
 * on sale, how many accounts exist), and a way into the page that fixes it.
 *
 * It reads the same endpoints the services and users pages read, so the dashboard can never disagree
 * with them about the count.
 */
export function AdminDashboard() {
  return (
    <RequireAuth>
      <AdminGate>
        <Overview />
      </AdminGate>
    </RequireAuth>
  );
}

function Overview() {
  const { t } = useT();
  const { formatNumber } = useLocale();
  const { user, account } = useAuth();

  const canSeeServices = (account?.permissions ?? []).includes('services.view');
  const canSeeUsers = (account?.permissions ?? []).includes('users.view');

  const services = useAsync(() => fetchAdminServices(user, { pageSize: 1 }), [Boolean(user)], {
    skip: !user || !canSeeServices,
  });
  const users = useAsync(() => fetchAdminUsers(user, { pageSize: 1 }), [Boolean(user)], {
    skip: !user || !canSeeUsers,
  });

  const shop = services.data?.shop ?? null;

  return (
    <div>
      <PageHeader title={t('admin.title')} subtitle={t('admin.subtitle')} />
      <AdminNav />

      {services.error && !services.data ? (
        <FailureCard error={services.error} onRetry={services.reload} />
      ) : services.loading && !services.data && canSeeServices ? (
        <Card>
          <Skeleton lines={3} />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="micro">{t('admin.stat.active')}</p>
            <p className="num mt-1 text-[30px] font-semibold text-[var(--color-ok)]">
              {formatNumber(shop?.active ?? 0)}
            </p>
          </Card>
          <Card>
            <p className="micro">{t('admin.stat.inactive')}</p>
            <p className="num mt-1 text-[30px] font-semibold text-[var(--color-warn)]">
              {formatNumber(shop?.inactive ?? 0)}
            </p>
          </Card>
          <Card>
            <p className="micro">{t('admin.stat.users')}</p>
            <p className="num mt-1 text-[30px] font-semibold">
              {canSeeUsers ? formatNumber(users.data?.total ?? 0) : '—'}
            </p>
          </Card>
        </div>
      )}

      {shop && shop.active === 0 ? (
        <Card className="mt-5">
          <EmptyState
            title={t('admin.stat.emptyShop.title')}
            message={t('admin.stat.emptyShop.message')}
            action={
              canSeeServices ? (
                <Link to="/admin/services" className="btn btn-primary">
                  {t('admin.stat.emptyShop.action')}
                </Link>
              ) : null
            }
          />
        </Card>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {canSeeServices ? (
          <Link to="/admin/services" className="btn btn-secondary">
            {t('admin.nav.services')}
          </Link>
        ) : null}
        {canSeeUsers ? (
          <Link to="/admin/users" className="btn btn-ghost">
            {t('admin.nav.users')}
          </Link>
        ) : null}
        <Link to="/orders" className="btn btn-ghost">
          {t('nav.orders')}
        </Link>
        <Button variant="ghost" onClick={() => { services.reload(); users.reload(); }}>
          {t('common.refresh')}
        </Button>
      </div>

      <p className="micro mt-6">{t('nav.signedInAs', { email: account?.user.email ?? '' })}</p>
    </div>
  );
}
