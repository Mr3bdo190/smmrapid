import { useState } from 'react';
import { Link } from '../lib/router';
import { useT, useLocale } from '../i18n';
import { useAuth } from '../auth/AuthProvider';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../data/api';
import { useAsync } from '../lib/useAsync';
import { Button, Card, EmptyState, ErrorBanner, Skeleton, StatusPill } from '../ui';
import { FailureCard, PageHeader, RequireAuth } from '../components/shared';

/**
 * Notifications: what happened to this customer's money, orders and tickets.
 *
 * Read state is the server's (`read_at`), so the badge in the header and this list can never
 * disagree — opening the page marks what is shown, and the unread count comes back from the same
 * response that marked it.
 */
export function Notifications() {
  return (
    <RequireAuth>
      <NotificationsView />
    </RequireAuth>
  );
}

function NotificationsView() {
  const { t } = useT();
  const { formatDateTime } = useLocale();
  const { user } = useAuth();
  const [failure, setFailure] = useState<unknown>(null);
  const [marking, setMarking] = useState(false);

  const list = useAsync(() => fetchNotifications(user, { limit: 50 }), [Boolean(user)], { skip: !user });
  const notifications = list.data?.notifications ?? [];
  const unread = list.data?.unread ?? 0;

  const markAll = async () => {
    setMarking(true);
    setFailure(null);
    try {
      await markAllNotificationsRead(user);
      list.reload();
    } catch (error) {
      setFailure(error);
    } finally {
      setMarking(false);
    }
  };

  const openOne = async (id: string) => {
    try {
      await markNotificationRead(user, id);
      list.reload();
    } catch (error) {
      setFailure(error);
    }
  };

  return (
    <div className="mx-auto max-w-[760px]">
      <PageHeader
        title={t('notifications.title')}
        subtitle={t('notifications.subtitle')}
        actions={
          unread > 0 ? (
            <Button variant="secondary" disabled={marking} onClick={markAll}>
              {marking ? t('common.loading') : t('notifications.markAll')}
            </Button>
          ) : (
            <span className="micro">{t('notifications.marked')}</span>
          )
        }
      />

      {failure ? (
        <div className="mb-4">
          <ErrorBanner error={failure} />
        </div>
      ) : null}

      {list.error && !list.data ? (
        <FailureCard error={list.error} onRetry={list.reload} />
      ) : list.loading && !list.data ? (
        <Card>
          <Skeleton lines={4} />
        </Card>
      ) : notifications.length === 0 ? (
        <Card>
          <EmptyState title={t('notifications.empty.title')} message={t('notifications.empty.message')} />
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {notifications.map((entry) => (
            <li key={entry.id}>
              <Card className={entry.readAt ? '' : 'border-[var(--color-accent)]'}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-medium">{entry.title}</span>
                      {!entry.readAt ? <StatusPill tone="accent" label={t('notifications.title')} /> : null}
                    </div>
                    {entry.body ? (
                      <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">{entry.body}</p>
                    ) : null}
                    <p className="mt-1 text-[12px] text-[var(--color-ink-faint)]">{formatDateTime(entry.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.link ? (
                      <Link to={entry.link} className="btn btn-ghost" onClick={() => void openOne(entry.id)}>
                        {t('notifications.openOrder')}
                      </Link>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => void openOne(entry.id)}>
                        {t('common.confirm')}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
