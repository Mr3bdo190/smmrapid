import { useEffect, useState } from 'react';
import { Link, useRouter } from '../../lib/router';
import { useT, useLocale } from '../../i18n';
import { useAuth } from '../../auth/AuthProvider';
import { fetchAdminUser, fetchAdminUsers, setUserRoles, setUserStatus } from '../../data/admin';
import type { AdminUserRow } from '../../data/admin';
import { useAsync } from '../../lib/useAsync';
import { Button, Card, ConfirmDialog, EmptyState, ErrorBanner, Money, Skeleton, StatusPill, TextField } from '../../ui';
import { FailureCard, PageHeader, RequireAuth } from '../../components/shared';
import { AdminGate, AdminNav } from '../../admin/AdminGate';

/**
 * The users panel.
 *
 * Two things it deliberately cannot do: move a balance (that is the wallet ledger's job, behind
 * `wallets.adjust`) and delete an account. What it can do — suspend, reactivate, change roles — is
 * reversible, separately permissioned, and every one of those actions shows up in the account's own
 * audit trail, which this page displays rather than describing.
 */

const STATUSES = ['', 'active', 'pending', 'suspended'] as const;
const ROLES = ['admin', 'finance', 'support'] as const;
const PAGE_SIZE = 25;

export function AdminUsers() {
  return (
    <RequireAuth>
      <AdminGate permission="users.view">
        <UsersPanel />
      </AdminGate>
    </RequireAuth>
  );
}

function statusTone(status: string) {
  switch (status) {
    case 'active':
      return 'ok' as const;
    case 'pending':
      return 'warn' as const;
    case 'suspended':
      return 'danger' as const;
    default:
      return 'neutral' as const;
  }
}

function UsersPanel() {
  const { t } = useT();
  const { formatNumber, formatDate } = useLocale();
  const { user, account } = useAuth();
  const { query, navigate } = useRouter();

  const canSuspend = (account?.permissions ?? []).includes('users.suspend');
  const canSetRoles = (account?.permissions ?? []).includes('users.roles');

  const q = query.get('q') ?? '';
  const status = query.get('status') ?? '';
  const page = Math.max(1, Number(query.get('page') ?? '1') || 1);

  const [term, setTerm] = useState(q);
  useEffect(() => setTerm(q), [q]);

  const [openUser, setOpenUser] = useState<AdminUserRow | null>(null);
  const [pending, setPending] = useState<{ row: AdminUserRow; action: 'suspend' | 'reactivate' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const list = useAsync(
    () => fetchAdminUsers(user, { q: q || undefined, status: status || undefined, page, pageSize: PAGE_SIZE }),
    [q, status, page, Boolean(user)],
    { skip: !user },
  );

  const go = (next: { q?: string; status?: string; page?: number }) => {
    const search = new URLSearchParams();
    const nextQ = next.q ?? q;
    const nextStatus = next.status ?? status;
    const nextPage = next.page ?? 1;
    if (nextQ) search.set('q', nextQ);
    if (nextStatus) search.set('status', nextStatus);
    if (nextPage > 1) search.set('page', String(nextPage));
    const suffix = search.toString();
    navigate(`/admin/users${suffix ? `?${suffix}` : ''}`);
  };

  useEffect(() => {
    if (term === q) return;
    const timer = setTimeout(() => go({ q: term, page: 1 }), 400);
    return () => clearTimeout(timer);
    // deliberately keyed on the text only: navigating on every render would loop
    // eslint-disable-next-line
  }, [term, q]);

  const users = list.data?.users ?? [];
  const total = list.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const apply = async () => {
    if (!pending) return;
    setBusy(true);
    setFailure(null);
    try {
      const result = await setUserStatus(user, pending.row.id, pending.action);
      setNotice(`${t(pending.action === 'suspend' ? 'admin.users.suspend' : 'admin.users.reactivate')} — ${pending.row.email}`);
      setPending(null);
      list.reload();
      void result;
    } catch (error) {
      setFailure(error);
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    'admin.users.column.user',
    'admin.users.column.status',
    'admin.users.column.balance',
    'admin.users.column.orders',
    'admin.users.column.created',
  ];

  return (
    <div>
      <PageHeader title={t('admin.title')} subtitle={t('admin.subtitle')} />
      <AdminNav />

      <Card>
        <div className="flex flex-col gap-3">
          <TextField
            label={t('admin.users.search')}
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            type="search"
          />
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((entry) => (
              <button
                key={entry || 'all'}
                type="button"
                className={`pill ${status === entry ? 'pill-accent' : 'pill-neutral'}`}
                aria-pressed={status === entry}
                onClick={() => go({ status: entry, page: 1 })}
              >
                {entry ? t(`admin.users.status.${entry}` as never) : t('services.category.all')}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {notice ? <div className="banner banner-ok mt-4">{notice}</div> : null}
      {failure ? (
        <div className="mt-4">
          <ErrorBanner error={failure} onRetry={list.reload} />
        </div>
      ) : null}

      {list.error && !list.data ? (
        <div className="mt-5">
          <FailureCard error={list.error} onRetry={list.reload} />
        </div>
      ) : list.loading && !list.data ? (
        <Card className="mt-5">
          <Skeleton lines={5} />
        </Card>
      ) : users.length === 0 ? (
        <Card className="mt-5">
          <EmptyState title={t('admin.users.empty.title')} message={t('admin.users.empty.message')} />
        </Card>
      ) : (
        <div className="mt-5">
          <p className="micro mb-3">{t('admin.users.count', { count: total })}</p>

          <div className="hidden lg:block">
            <Card padded={false}>
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--color-line)]">
                    {columns.map((key) => (
                      <th key={key} scope="col" className="micro px-3 py-3 text-start font-medium">
                        {t(key as never)}
                      </th>
                    ))}
                    <th scope="col" className="micro px-3 py-3 text-start font-medium">{' '}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--color-line)] last:border-0">
                      <td className="px-3 py-3">
                        <span>{row.displayName ?? '—'}</span>
                        <span className="block text-[12px] text-[var(--color-ink-faint)]">{row.email}</span>
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill tone={statusTone(row.status)} label={t(`admin.users.status.${row.status}` as never)} />
                      </td>
                      <td className="px-3 py-3">
                        <Money minor={row.wallet.balanceMinor} currency={row.wallet.currency} />
                      </td>
                      <td className="num px-3 py-3">{formatNumber(row.orders)}</td>
                      <td className="px-3 py-3 text-[var(--color-ink-muted)]">{formatDate(row.createdAt)}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => setOpenUser(row)}>
                            {t('services.card.details')}
                          </Button>
                          {canSuspend && row.id !== account?.user.id ? (
                            <Button
                              size="sm"
                              variant={row.status === 'suspended' ? 'secondary' : 'danger'}
                              disabled={busy}
                              onClick={() => setPending({ row, action: row.status === 'suspended' ? 'reactivate' : 'suspend' })}
                            >
                              {row.status === 'suspended' ? t('admin.users.reactivate') : t('admin.users.suspend')}
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <ul className="flex flex-col gap-3 lg:hidden">
            {users.map((row) => (
              <li key={row.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="font-medium">{row.displayName ?? row.email}</span>
                      <p className="text-[12px] text-[var(--color-ink-faint)]">{row.email}</p>
                    </div>
                    <StatusPill tone={statusTone(row.status)} label={t(`admin.users.status.${row.status}` as never)} />
                  </div>
                  <p className="mt-2 text-[13px]">
                    <Money minor={row.wallet.balanceMinor} currency={row.wallet.currency} /> ·{' '}
                    <span className="num">{formatNumber(row.orders)}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setOpenUser(row)}>
                      {t('services.card.details')}
                    </Button>
                  </div>
                </Card>
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
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        title={t(pending?.action === 'suspend' ? 'admin.users.suspend' : 'admin.users.reactivate')}
        description={t('admin.users.suspendConfirm', { email: pending?.row.email ?? '' })}
        busy={busy}
        onConfirm={apply}
        onCancel={() => setPending(null)}
      />

      {openUser ? (
        <UserDetail
          row={openUser}
          canSetRoles={canSetRoles}
          onClose={() => setOpenUser(null)}
          onRolesSaved={() => setNotice(t('admin.users.rolesSaved'))}
        />
      ) : null}

      <p className="micro mt-6">
        <Link to="/admin" className="hover:text-[var(--color-ink)]">
          ← {t('admin.nav.dashboard')}
        </Link>
      </p>
    </div>
  );
}

function UserDetail({
  row,
  canSetRoles,
  onClose,
  onRolesSaved,
}: {
  row: AdminUserRow;
  canSetRoles: boolean;
  onClose: () => void;
  onRolesSaved: () => void;
}) {
  const { t } = useT();
  const { formatDateTime, formatNumber } = useLocale();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [roles, setRoles] = useState<string[]>([]);

  const detail = useAsync(() => fetchAdminUser(user, row.id), [row.id, Boolean(user)], { skip: !user });

  useEffect(() => {
    if (detail.data?.roles) setRoles(detail.data.roles);
  }, [detail.data?.roles]);

  const save = async () => {
    setBusy(true);
    setFailure(null);
    try {
      await setUserRoles(user, row.id, roles);
      onRolesSaved();
      detail.reload();
    } catch (error) {
      setFailure(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-5">
      <Card
        title={row.email}
        actions={
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t('common.close')}
          </Button>
        }
      >
        {detail.loading && !detail.data ? (
          <Skeleton lines={4} />
        ) : detail.error && !detail.data ? (
          <ErrorBanner error={detail.error} onRetry={detail.reload} />
        ) : (
          <>
            <dl className="flex flex-col gap-2 text-[14px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--color-ink-muted)]">{t('admin.users.column.balance')}</dt>
                <dd>
                  <Money minor={detail.data!.user.wallet.balanceMinor} currency={detail.data!.user.wallet.currency} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--color-ink-muted)]">{t('admin.users.column.orders')}</dt>
                <dd className="num">{formatNumber(detail.data!.user.orders)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--color-ink-muted)]">{t('admin.users.column.created')}</dt>
                <dd>{formatDateTime(detail.data!.user.createdAt)}</dd>
              </div>
            </dl>

            <div className="mt-5">
              <p className="label">{t('admin.users.roles')}</p>
              <p className="mt-1 text-[12px] text-[var(--color-ink-muted)]">{t('admin.users.rolesHint')}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ROLES.map((role) => {
                  const on = roles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      className={`pill ${on ? 'pill-accent' : 'pill-neutral'}`}
                      aria-pressed={on}
                      disabled={!canSetRoles}
                      onClick={() => setRoles((current) => (on ? current.filter((entry) => entry !== role) : [...current, role]))}
                    >
                      {role}
                    </button>
                  );
                })}
              </div>
              {canSetRoles ? (
                <Button className="mt-3" variant="secondary" disabled={busy} onClick={save}>
                  {busy ? t('common.loading') : t('admin.users.rolesSave')}
                </Button>
              ) : null}
              {failure ? (
                <div className="mt-3">
                  <ErrorBanner error={failure} />
                </div>
              ) : null}
            </div>

            <div className="mt-6">
              <p className="label">{t('admin.users.trail')}</p>
              <ul className="mt-2 flex flex-col">
                {(detail.data!.auditTrail ?? []).map((entry, index) => (
                  <li key={`${entry.action}-${index}`} className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] py-2 text-[13px] last:border-0">
                    <span className="num">{entry.action}</span>
                    <span className="text-[var(--color-ink-muted)]">{formatDateTime(entry.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
