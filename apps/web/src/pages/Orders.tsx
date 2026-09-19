import { Link, useRouter } from '../lib/router';
import { useT, useLocale } from '../i18n';
import { useAuth } from '../auth/AuthProvider';
import { fetchOrders } from '../data/api';
import { useAsync } from '../lib/useAsync';
import { Button, Card, EmptyState, Money, Skeleton, StatusPill } from '../ui';
import { FailureCard, PageHeader, RequireAuth, localizedName, statusKey, statusTone } from '../components/shared';

/**
 * The order history: one row per order, filterable, and honest about how much of it was actually
 * delivered (a partial order shows the refund next to what was charged rather than only its status).
 */

const FILTERS: { value: string; labelKey: string }[] = [
  { value: '', labelKey: 'orders.filter.all' },
  { value: 'pending', labelKey: 'orders.status.pending' },
  { value: 'in_progress', labelKey: 'orders.status.in_progress' },
  { value: 'processing', labelKey: 'orders.status.processing' },
  { value: 'completed', labelKey: 'orders.status.completed' },
  { value: 'partial', labelKey: 'orders.status.partial' },
  { value: 'canceled', labelKey: 'orders.status.canceled' },
  { value: 'failed', labelKey: 'orders.status.failed' },
];

const PAGE_SIZE = 20;

export function Orders() {
  return (
    <RequireAuth>
      <OrdersList />
    </RequireAuth>
  );
}

function OrdersList() {
  const { t } = useT();
  const { formatNumber, formatDate } = useLocale();
  const { user } = useAuth();
  const { query, navigate } = useRouter();

  const status = query.get('status') ?? '';
  const page = Math.max(1, Number(query.get('page') ?? '1') || 1);

  const list = useAsync(
    () => fetchOrders(user, { status: status || undefined, page, pageSize: PAGE_SIZE }),
    [status, page, Boolean(user)],
    { skip: !user },
  );

  const orders = list.data?.orders ?? [];
  const total = list.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const go = (next: { status?: string; page?: number }) => {
    const search = new URLSearchParams();
    const nextStatus = next.status ?? status;
    const nextPage = next.page ?? 1;
    if (nextStatus) search.set('status', nextStatus);
    if (nextPage > 1) search.set('page', String(nextPage));
    const suffix = search.toString();
    navigate(`/orders${suffix ? `?${suffix}` : ''}`);
  };

  return (
    <div>
      <PageHeader
        title={t('orders.title')}
        subtitle={t('orders.subtitle')}
        actions={
          <Link to="/services" className="btn btn-primary">
            {t('orders.empty.action')}
          </Link>
        }
      />

      <Card className="mb-5">
        <p className="label">{t('orders.filter.label')}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.value || 'all'}
              type="button"
              className={`pill ${status === filter.value ? 'pill-accent' : 'pill-neutral'}`}
              aria-pressed={status === filter.value}
              onClick={() => go({ status: filter.value, page: 1 })}
            >
              {t(filter.labelKey as never)}
            </button>
          ))}
        </div>
      </Card>

      {list.error && !list.data ? (
        <FailureCard error={list.error} onRetry={list.reload} />
      ) : list.loading && !list.data ? (
        <Card>
          <Skeleton lines={5} />
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <EmptyState
            title={t('orders.empty.title')}
            message={t('orders.empty.message')}
            action={
              <Link to="/services" className="btn btn-primary">
                {t('orders.empty.action')}
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          <p className="micro mb-3">{t('orders.count', { count: total })}</p>

          {/* Desktop: a real table. Mobile: the same rows as cards — a table cannot be read on a phone. */}
          <div className="hidden md:block">
            <Card padded={false}>
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--color-line)] text-start">
                    {['orders.column.id', 'orders.column.service', 'orders.column.quantity', 'orders.column.charge', 'orders.column.status', 'orders.column.date'].map(
                      (key) => (
                        <th key={key} scope="col" className="micro px-4 py-3 text-start font-medium">
                          {t(key as never)}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.publicId} className="border-b border-[var(--color-line)] last:border-0">
                      <td className="px-4 py-3">
                        <Link to={`/orders/${order.publicId}`} className="num font-medium text-[var(--color-accent-ink)] hover:underline">
                          {order.publicId}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{localizedName(order.service)}</td>
                      <td className="num px-4 py-3">{formatNumber(order.quantity)}</td>
                      <td className="px-4 py-3">
                        <Money minor={order.totalMinor} currency={order.currency} />
                        {order.refundedMinor > 0 ? (
                          <span className="ms-2 text-[12px] text-[var(--color-ok)]">
                            (<Money minor={order.refundedMinor} currency={order.currency} />)
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill tone={statusTone(order.status)} label={t(statusKey(order.status) as never)} />
                      </td>
                      <td className="px-4 py-3 text-[var(--color-ink-muted)]">{formatDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <ul className="flex flex-col gap-3 md:hidden">
            {orders.map((order) => (
              <li key={order.publicId}>
                <Link to={`/orders/${order.publicId}`} className="card block">
                  <div className="flex items-center justify-between gap-3">
                    <span className="num text-[13px] font-medium">{order.publicId}</span>
                    <StatusPill tone={statusTone(order.status)} label={t(statusKey(order.status) as never)} />
                  </div>
                  <p className="mt-2 text-[14px]">{localizedName(order.service)}</p>
                  <p className="num mt-1 text-[13px] text-[var(--color-ink-muted)]">
                    {formatNumber(order.quantity)} · <Money minor={order.totalMinor} currency={order.currency} />
                  </p>
                  <p className="mt-1 text-[12px] text-[var(--color-ink-faint)]">{formatDate(order.createdAt)}</p>
                </Link>
              </li>
            ))}
          </ul>

          {lastPage > 1 ? (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button variant="ghost" disabled={page <= 1} onClick={() => go({ page: page - 1 })}>
                {t('common.previous')}
              </Button>
              <span className="num text-[13px] text-[var(--color-ink-muted)]">
                {t('common.page')} {formatNumber(page)} {t('common.of')} {formatNumber(lastPage)}
              </span>
              <Button variant="ghost" disabled={page >= lastPage} onClick={() => go({ page: page + 1 })}>
                {t('common.next')}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
