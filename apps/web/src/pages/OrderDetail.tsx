import { useState } from 'react';
import { Link, useRouter } from '../lib/router';
import { useT, useLocale } from '../i18n';
import { useAuth } from '../auth/AuthProvider';
import { fetchOrder, repeatOrder } from '../data/api';
import { ApiError } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { Button, Card, EmptyState, ErrorBanner, Money, Skeleton, StatusPill } from '../ui';
import { PageHeader, RequireAuth, localizedName, statusKey, statusTone } from '../components/shared';

/**
 * One order, in full: what was ordered, what it cost, how far it got, what came back, and the way to
 * order the same thing again. A failed order says in plain words that the money returned — that is
 * the question a customer actually has when they see a red status.
 */
export function OrderDetail({ publicId }: { publicId: string }) {
  return (
    <RequireAuth>
      <OrderView publicId={publicId} />
    </RequireAuth>
  );
}

function OrderView({ publicId }: { publicId: string }) {
  const { t } = useT();
  const { formatNumber, formatDateTime } = useLocale();
  const { user } = useAuth();
  const { query, navigate } = useRouter();
  const [repeating, setRepeating] = useState(false);
  const [repeatError, setRepeatError] = useState<unknown>(null);
  const [repeatDone, setRepeatDone] = useState<string | null>(null);

  const order = useAsync(() => fetchOrder(user, publicId), [publicId, Boolean(user)], { skip: !user });
  const data = order.data;
  const placed = query.get('placed') === '1';

  const repeat = async () => {
    setRepeating(true);
    setRepeatError(null);
    try {
      const result = await repeatOrder(user, publicId);
      setRepeatDone(result.order.publicId);
    } catch (error) {
      setRepeatError(error);
    } finally {
      setRepeating(false);
    }
  };

  if (order.loading && !data) {
    return (
      <Card>
        <Skeleton lines={6} />
      </Card>
    );
  }

  if (order.error && !data) {
    const missing = order.error instanceof ApiError && order.error.status === 404;
    return (
      <Card className="mx-auto max-w-[560px]">
        {missing ? (
          <EmptyState
            title={t('orders.detail.notFound.title')}
            message={t('orders.detail.notFound.message')}
            action={
              <Link to="/orders" className="btn btn-primary">
                {t('orders.title')}
              </Link>
            }
          />
        ) : (
          <ErrorBanner error={order.error} onRetry={order.reload} />
        )}
      </Card>
    );
  }

  if (!data) return null;

  const remains = data.remains;
  const delivered = remains !== null && data.quantity ? Math.max(0, Math.min(data.quantity, data.quantity - remains)) : null;
  const progress = delivered !== null && data.quantity ? Math.round((delivered / data.quantity) * 100) : null;
  const failed = data.status === 'failed' || data.status === 'canceled';

  return (
    <div>
      <Link to="/orders" className="micro inline-block hover:text-[var(--color-ink)]">
        ← {t('orders.title')}
      </Link>

      <PageHeader
        title={t('orders.detail.title', { id: data.publicId })}
        subtitle={formatDateTime(data.createdAt)}
        actions={<StatusPill tone={statusTone(data.status)} label={t(statusKey(data.status) as never)} />}
      />

      {placed ? (
        <div className="banner banner-ok mb-5">
          {t('service.placed', { id: data.publicId })}
        </div>
      ) : null}

      {repeatDone ? (
        <div className="banner banner-ok mb-5">
          {t('orders.detail.repeatDone', { id: repeatDone })}
        </div>
      ) : null}

      {failed ? (
        <div className="banner banner-warn mb-5 flex flex-wrap items-center justify-between gap-3">
          <span>
            <strong className="font-semibold">{t('orders.detail.failed.title')}</strong>{' '}
            {t('orders.detail.failed.message')}
          </span>
          <Link to="/wallet" className="btn btn-ghost">
            {t('nav.wallet')}
          </Link>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card title={localizedName(data.service)}>
          <dl className="flex flex-col gap-3 text-[14px]">
            {progress !== null ? (
              <div>
                <dt className="micro">{t('orders.detail.progress')}</dt>
                <dd className="mt-1.5">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-sunken)]" role="presentation">
                    <div
                      className="h-full rounded-full bg-[var(--color-accent)]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="num mt-1.5 text-[13px] text-[var(--color-ink-muted)]">
                    {formatNumber(delivered ?? 0)} / {formatNumber(data.quantity)} ({formatNumber(progress)}%)
                  </p>
                </dd>
              </div>
            ) : null}

            <div>
              <dt className="micro">{t('orders.column.target')}</dt>
              <dd className="mt-0.5 break-all text-[var(--color-ink)]">{data.target}</dd>
            </div>

            <div>
              <dt className="micro">{t('orders.column.quantity')}</dt>
              <dd className="num mt-0.5">{formatNumber(data.quantity)}</dd>
            </div>

            {remains !== null ? (
              <div>
                <dt className="micro">{t('orders.detail.remaining')}</dt>
                <dd className="num mt-0.5">{formatNumber(remains)}</dd>
              </div>
            ) : null}

            {data.startCount !== null ? (
              <div>
                <dt className="micro">{t('orders.detail.startCount')}</dt>
                <dd className="num mt-0.5">{formatNumber(data.startCount)}</dd>
              </div>
            ) : null}

            <div>
              <dt className="micro">{t('orders.detail.updatedLabel')}</dt>
              <dd className="mt-0.5 text-[var(--color-ink-muted)]">
                {formatDateTime(data.updatedAt ?? data.createdAt)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card title={t('service.quote.total')}>
          <dl className="flex flex-col gap-2 text-[14px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[var(--color-ink-muted)]">{t('service.quote.charge')}</dt>
              <dd>
                <Money minor={data.chargeMinor} currency={data.currency} />
              </dd>
            </div>
            {data.discountMinor > 0 ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--color-ok)]">{t('service.quote.discount')}</dt>
                <dd className="text-[var(--color-ok)]">
                  −<Money minor={data.discountMinor} currency={data.currency} />
                </dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3 border-t border-[var(--color-line)] pt-2">
              <dt className="font-semibold">{t('service.quote.total')}</dt>
              <dd>
                <Money minor={data.totalMinor} currency={data.currency} className="text-[17px] font-semibold" />
              </dd>
            </div>
            {data.refundedMinor > 0 ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--color-ok)]">{t('orders.detail.refunded')}</dt>
                <dd className="text-[var(--color-ok)]">
                  +<Money minor={data.refundedMinor} currency={data.currency} />
                </dd>
              </div>
            ) : null}
          </dl>

          {repeatError ? (
            <div className="mt-4">
              <ErrorBanner error={repeatError} />
            </div>
          ) : null}

          <div className="mt-4 flex flex-col gap-2">
            <Button variant="secondary" disabled={repeating} onClick={repeat}>
              {repeating ? t('orders.detail.repeating') : t('orders.detail.repeat')}
            </Button>
            <Button variant="ghost" onClick={() => navigate(`/services/${data.service.slug}`)}>
              {t('services.card.details')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
