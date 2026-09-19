import { useEffect, useState } from 'react';
import { Link, useRouter } from '../../lib/router';
import { useT, useLocale } from '../../i18n';
import { useAuth } from '../../auth/AuthProvider';
import { bulkServices, deleteAdminService, fetchAdminServices, updateAdminService } from '../../data/admin';
import type { AdminServiceRow } from '../../data/admin';
import { useAsync } from '../../lib/useAsync';
import { Button, Card, ConfirmDialog, EmptyState, ErrorBanner, Money, Skeleton, StatusPill, TextField } from '../../ui';
import { FailureCard, PageHeader, RequireAuth } from '../../components/shared';
import { AdminGate, AdminNav } from '../../admin/AdminGate';

/**
 * The services panel: the page that turns a synced catalogue into a shop.
 *
 * Everything here is a deliberate two-step. Changing one service asks for the value and saves it with
 * a before/after audit row; changing many asks for confirmation naming the count, and sends that count
 * as `expectCount` so the server refuses the whole change if the shop moved under us. A panel that
 * edits prices in bulk silently is a panel nobody can audit afterwards.
 */
export function AdminServices() {
  return (
    <RequireAuth>
      <AdminGate permission="services.view">
        <ServicesPanel />
      </AdminGate>
    </RequireAuth>
  );
}

const PAGE_SIZE = 25;

function ServicesPanel() {
  const { t } = useT();
  const { formatNumber } = useLocale();
  const { user, account } = useAuth();
  const { query, navigate } = useRouter();

  const canEdit = (account?.permissions ?? []).includes('services.edit');
  const canDelete = (account?.permissions ?? []).includes('services.delete');

  const q = query.get('q') ?? '';
  const state = query.get('state') ?? '';
  const page = Math.max(1, Number(query.get('page') ?? '1') || 1);

  const [term, setTerm] = useState(q);
  useEffect(() => setTerm(q), [q]);

  const [selected, setSelected] = useState<string[]>([]);
  const [failure, setFailure] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ action: 'activate' | 'deactivate' | 'feature' | 'unfeature'; ids: string[] } | null>(null);
  const [editing, setEditing] = useState<AdminServiceRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminServiceRow | null>(null);

  const active = state === 'on' ? true : state === 'off' ? false : undefined;
  const list = useAsync(
    () => fetchAdminServices(user, { q: q || undefined, active, page, pageSize: PAGE_SIZE }),
    [q, state, page, Boolean(user)],
    { skip: !user },
  );

  const go = (next: { q?: string; state?: string; page?: number }) => {
    const search = new URLSearchParams();
    const nextQ = next.q ?? q;
    const nextState = next.state ?? state;
    const nextPage = next.page ?? 1;
    if (nextQ) search.set('q', nextQ);
    if (nextState) search.set('state', nextState);
    if (nextPage > 1) search.set('page', String(nextPage));
    const suffix = search.toString();
    navigate(`/admin/services${suffix ? `?${suffix}` : ''}`);
  };

  useEffect(() => {
    if (term === q) return;
    const timer = setTimeout(() => go({ q: term, page: 1 }), 400);
    return () => clearTimeout(timer);
    // deliberately keyed on the text only: navigating on every render would loop
    // eslint-disable-next-line
  }, [term, q]);

  const services = list.data?.services ?? [];
  const shop = list.data?.shop ?? { active: 0, inactive: 0, total: 0 };
  const total = list.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const patch = async (row: AdminServiceRow, body: Parameters<typeof updateAdminService>[2], label: string) => {
    setBusy(true);
    setFailure(null);
    setNotice(null);
    try {
      await updateAdminService(user, row.id, body);
      setNotice(`${label} — ${row.name}`);
      setEditing(null);
      list.reload();
    } catch (error) {
      setFailure(error);
    } finally {
      setBusy(false);
    }
  };

  const applyBulk = async () => {
    if (!confirm) return;
    setBusy(true);
    setFailure(null);
    setNotice(null);
    try {
      const ids = confirm.ids;
      // expectCount makes the server refuse the change as a whole if the shop moved since this list
      const result = await bulkServices(user, confirm.action, { ids, expectCount: ids.length });
      setNotice(t('admin.services.applied', { count: result.changed }));
      setSelected([]);
      setConfirm(null);
      list.reload();
    } catch (error) {
      setFailure(error);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    setFailure(null);
    try {
      await deleteAdminService(user, pendingDelete.id);
      setNotice(`${t('admin.services.delete')} — ${pendingDelete.name}`);
      setPendingDelete(null);
      list.reload();
    } catch (error) {
      setFailure(error);
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));

  return (
    <div>
      <PageHeader title={t('admin.title')} subtitle={t('admin.subtitle')} />
      <AdminNav />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="micro">{t('admin.stat.active')}</p>
          <p className="num mt-1 text-[28px] font-semibold text-[var(--color-ok)]">{formatNumber(shop.active)}</p>
        </Card>
        <Card>
          <p className="micro">{t('admin.stat.inactive')}</p>
          <p className="num mt-1 text-[28px] font-semibold text-[var(--color-warn)]">{formatNumber(shop.inactive)}</p>
        </Card>
        <Card>
          <p className="micro">{t('admin.stat.total')}</p>
          <p className="num mt-1 text-[28px] font-semibold">{formatNumber(shop.total)}</p>
        </Card>
      </div>

      {shop.active === 0 && shop.inactive > 0 ? (
        <div className="banner banner-warn mt-4 flex flex-wrap items-center justify-between gap-3">
          <span>
            <strong className="font-semibold">{t('admin.stat.emptyShop.title')}</strong>{' '}
            {t('admin.stat.emptyShop.message')}
          </span>
          {canEdit ? (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setConfirm({ action: 'activate', ids: services.map((service) => service.id) })}
            >
              {t('admin.services.activate')}
            </Button>
          ) : null}
        </div>
      ) : null}

      <Card className="mt-5">
        <div className="flex flex-col gap-3">
          <TextField
            label={t('admin.services.search')}
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            type="search"
          />
          <div className="flex flex-wrap gap-2">
            {[
              { value: '', label: t('admin.services.filter.all') },
              { value: 'on', label: t('admin.services.filter.active') },
              { value: 'off', label: t('admin.services.filter.inactive') },
            ].map((filter) => (
              <button
                key={filter.value || 'all'}
                type="button"
                className={`pill ${state === filter.value ? 'pill-accent' : 'pill-neutral'}`}
                aria-pressed={state === filter.value}
                onClick={() => go({ state: filter.value, page: 1 })}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {selected.length > 0 && canEdit ? (
        <div className="banner mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="num">{t('admin.services.selected', { count: selected.length })}</span>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setConfirm({ action: 'activate', ids: selected })}>
              {t('admin.services.activate')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirm({ action: 'deactivate', ids: selected })}>
              {t('admin.services.deactivate')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirm({ action: 'feature', ids: selected })}>
              {t('admin.services.feature')}
            </Button>
          </div>
        </div>
      ) : null}

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
          <Skeleton lines={6} />
        </Card>
      ) : services.length === 0 ? (
        <Card className="mt-5">
          <EmptyState title={t('admin.services.empty.title')} message={t('admin.services.empty.message')} />
        </Card>
      ) : (
        <div className="mt-5">
          <p className="micro mb-3">{t('admin.services.count', { count: total })}</p>

          <div className="hidden lg:block">
            <Card padded={false}>
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--color-line)]">
                    {canEdit ? <th scope="col" className="micro px-3 py-3 text-start">{' '}</th> : null}
                    {['admin.services.column.service', 'admin.services.column.provider', 'admin.services.column.price', 'admin.services.column.margin', 'admin.services.column.limits', 'admin.services.column.state'].map((key) => (
                      <th key={key} scope="col" className="micro px-3 py-3 text-start font-medium">
                        {t(key as never)}
                      </th>
                    ))}
                    <th scope="col" className="micro px-3 py-3 text-start font-medium">{' '}</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => {
                    const currency = account?.wallet.currency ?? 'USD';
                    return (
                      <tr key={service.id} className="border-b border-[var(--color-line)] last:border-0">
                        {canEdit ? (
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={selected.includes(service.id)}
                              onChange={() => toggle(service.id)}
                              aria-label={t('admin.services.select', { name: service.name })}
                            />
                          </td>
                        ) : null}
                        <td className="px-3 py-3">
                          <span className="font-medium">{service.name}</span>
                          <span className="num block text-[12px] text-[var(--color-ink-faint)]">{service.slug}</span>
                        </td>
                        <td className="px-3 py-3 text-[var(--color-ink-muted)]">{service.provider?.name ?? '—'}</td>
                        <td className="px-3 py-3">
                          <Money minor={service.priceMinor} currency={currency} />
                          <span className="ms-1.5 text-[12px] text-[var(--color-ink-faint)]">
                            {t(service.priceUnit === 'per_item' ? 'services.card.perItem' : 'services.card.per1000')}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {service.marginPer1000Minor === null ? (
                            '—'
                          ) : (
                            <span className={service.marginPer1000Minor >= 0 ? 'text-[var(--color-ok)]' : 'text-[var(--color-danger)]'}>
                              <Money minor={service.marginPer1000Minor} currency={currency} sign="never" />
                            </span>
                          )}
                        </td>
                        <td className="num px-3 py-3 text-[var(--color-ink-muted)]">
                          {formatNumber(service.minQuantity)} – {formatNumber(service.maxQuantity)}
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill
                            tone={service.deletedAt ? 'neutral' : service.isActive ? 'ok' : 'warn'}
                            label={
                              service.deletedAt
                                ? t('admin.services.state.deleted')
                                : service.isActive
                                  ? t('admin.services.state.on')
                                  : t('admin.services.state.off')
                            }
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {canEdit ? (
                              <>
                                <Button size="sm" variant="ghost" onClick={() => setEditing(service)}>
                                  {t('admin.services.edit.details')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant={service.isActive ? 'ghost' : 'secondary'}
                                  disabled={busy}
                                  onClick={() => void patch(service, { isActive: !service.isActive }, t(service.isActive ? 'admin.services.deactivate' : 'admin.services.activate'))}
                                >
                                  {service.isActive ? t('admin.services.deactivate') : t('admin.services.activate')}
                                </Button>
                              </>
                            ) : null}
                            {canDelete ? (
                              <Button size="sm" variant="danger" onClick={() => setPendingDelete(service)}>
                                {t('admin.services.delete')}
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </div>

          <ul className="flex flex-col gap-3 lg:hidden">
            {services.map((service) => (
              <li key={service.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="font-medium">{service.name}</span>
                      <p className="num text-[12px] text-[var(--color-ink-faint)]">{service.slug}</p>
                    </div>
                    <StatusPill
                      tone={service.deletedAt ? 'neutral' : service.isActive ? 'ok' : 'warn'}
                      label={service.isActive ? t('admin.services.state.on') : t('admin.services.state.off')}
                    />
                  </div>
                  <p className="num mt-2 text-[13px]">
                    <Money minor={service.priceMinor} currency={account?.wallet.currency ?? 'USD'} />{' '}
                    <span className="text-[12px] text-[var(--color-ink-faint)]">
                      {t(service.priceUnit === 'per_item' ? 'services.card.perItem' : 'services.card.per1000')}
                    </span>{' '}
                    · {formatNumber(service.minQuantity)} – {formatNumber(service.maxQuantity)}
                  </p>
                  {canEdit ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(service)}>
                        {t('admin.services.edit.details')}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => void patch(service, { isActive: !service.isActive }, t(service.isActive ? 'admin.services.deactivate' : 'admin.services.activate'))}
                      >
                        {service.isActive ? t('admin.services.deactivate') : t('admin.services.activate')}
                      </Button>
                    </div>
                  ) : null}
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
        open={Boolean(confirm)}
        title={t('admin.services.bulkConfirm.title', { count: confirm?.ids.length ?? 0 })}
        description={t('admin.services.bulkConfirm.body')}
        busy={busy}
        onConfirm={applyBulk}
        onCancel={() => setConfirm(null)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={t('admin.services.delete')}
        description={t('admin.services.deleteConfirm', { name: pendingDelete?.name ?? '' })}
        busy={busy}
        onConfirm={remove}
        onCancel={() => setPendingDelete(null)}
      />

      {editing ? (
        <EditService
          service={editing}
          currency={account?.wallet.currency ?? 'USD'}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={(body) => patch(editing, body, t('admin.services.edit.saved'))}
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

/** The edit form: our price and our quantity rules — never the supplier's numbers. */
function EditService({
  service,
  currency,
  busy,
  onClose,
  onSave,
}: {
  service: AdminServiceRow;
  currency: string;
  busy: boolean;
  onClose: () => void;
  onSave: (body: Parameters<typeof updateAdminService>[2]) => void;
}) {
  const { t } = useT();
  const unit = service.priceUnit === 'per_item' ? 1 : 1000;
  const [price, setPrice] = useState((service.priceMinor / 100).toFixed(2));
  const [name, setName] = useState(service.name);
  const [nameAr, setNameAr] = useState(service.nameAr ?? '');
  const [min, setMin] = useState(String(service.minQuantity));
  const [max, setMax] = useState(String(service.maxQuantity));
  const [estimated, setEstimated] = useState(service.estimatedTime ?? '');

  return (
    <div className="mt-5">
      <Card
        title={t('admin.services.edit.title', { name: service.name })}
        actions={
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t('common.close')}
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={t('admin.services.edit.price', { unit: String(unit) })}
            hint={t('admin.services.edit.priceHint', { currency })}
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            inputMode="decimal"
            className="num"
          />
          <TextField
            label={t('admin.services.edit.estimated')}
            value={estimated}
            onChange={(event) => setEstimated(event.target.value)}
          />
          <TextField label={t('admin.services.edit.name')} value={name} onChange={(event) => setName(event.target.value)} />
          <TextField label={t('admin.services.edit.nameAr')} value={nameAr} onChange={(event) => setNameAr(event.target.value)} />
          <TextField
            label={t('admin.services.edit.minQty')}
            value={min}
            onChange={(event) => setMin(event.target.value)}
            inputMode="numeric"
            className="num"
          />
          <TextField
            label={t('admin.services.edit.maxQty')}
            value={max}
            onChange={(event) => setMax(event.target.value)}
            inputMode="numeric"
            className="num"
          />
        </div>

        <div className="mt-4">
          <Button
            disabled={busy}
            onClick={() =>
              onSave({
                name,
                nameAr: nameAr || null,
                priceMinor: Math.round(Number(price.replace(/[^\d.]/g, '')) * 100),
                minQuantity: Number(min) || service.minQuantity,
                maxQuantity: Number(max) || service.maxQuantity,
                estimatedTime: estimated || null,
              })
            }
          >
            {busy ? t('admin.services.edit.saving') : t('admin.services.edit.save')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
