import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleX, Copy, Download, Link2, Network, RefreshCw, Search, Trash2, TrendingUp } from 'lucide-react';
import { notify } from '../../lib/notify';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import AdminPagination from './AdminPagination';
import { useTranslation } from '../../lib/i18n';

const e = async (r: Response, f: string) => { const b = await r.json().catch(() => ({})); return b?.error || f; };
const PAGE_SIZE = 100;

const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const fmt = (n: number) => n.toLocaleString();
const money = (n: number) => '$' + n.toFixed(2);

const STATUS_TABS: { value: string; en: string; ar: string }[] = [
  { value: 'all', en: 'All', ar: 'الكل' },
  { value: 'Processing', en: 'Processing', ar: 'قيد المعالجة' },
  { value: 'In Progress', en: 'In Progress', ar: 'قيد التنفيذ' },
  { value: 'Pending', en: 'Pending', ar: 'معلّق' },
  { value: 'Completed', en: 'Completed', ar: 'مكتمل' },
  { value: 'Partial', en: 'Partial', ar: 'جزئي' },
  { value: 'Canceled', en: 'Canceled', ar: 'ملغى' },
  { value: 'Refunded', en: 'Refunded', ar: 'مسترجع' },
];

const statusKey = (s: string) => {
  const k = String(s || '').toLowerCase().replace(/[\s-]/g, '');
  return ['pending', 'processing', 'inprogress', 'completed', 'partial', 'canceled', 'refunded'].includes(k) ? k : 'default';
};

export default function AdminOrders() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { t, dir, lang } = useTranslation();
  const L = (en: string, ar: string) => (lang === 'ar' ? ar : en);
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');

  useEffect(() => { const tm = setTimeout(() => { setQ(qInput); setPage(1); }, 400); return () => clearTimeout(tm); }, [qInput]);
  useEffect(() => { setPage(1); }, [status]);

  const oq = useQuery({
    queryKey: ['admin-orders', page, q, status],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async () => {
      const token = await user!.getIdToken();
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), status, ...(q ? { q } : {}) });
      const r = await apiFetch('/api/admin/orders?' + params, user, { headers: { Authorization: 'Bearer ' + token } });
      if (!r.ok) throw new Error(await e(r, 'Failed to load orders'));
      return r.json();
    },
  });

  const refresh = useMutation({
    mutationFn: async (id: string) => {
      const token = await user!.getIdToken();
      const r = await apiFetch('/api/admin/orders/' + id + '/refresh', user, { method: 'POST', headers: { Authorization: 'Bearer ' + token } });
      if (!r.ok) throw new Error(await e(r, 'Refresh failed'));
      return r.json();
    },
    onSuccess: () => { notify.success(t('admin.orders.refreshSuccess') || 'Order refreshed'); qc.invalidateQueries({ queryKey: ['admin-orders'] }); },
    onError: (x: any) => notify.error(x),
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, newStatus }: { ids: string[]; newStatus: string }) => {
      const token = await user!.getIdToken();
      const r = await apiFetch('/api/admin/orders/bulk-status', user, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ orderIds: ids, status: newStatus }),
      });
      if (!r.ok) throw new Error(await e(r, 'Bulk update failed'));
      return r.json();
    },
    onSuccess: (data: any) => { notify.success(t('common.bulkUpdated')); qc.invalidateQueries({ queryKey: ['admin-orders'] }); setSelected(new Set()); },
    onError: (x: any) => notify.error(x),
  });

  const handleBulkStatus = () => {
    if (!bulkStatus || selected.size === 0) return;
    bulkStatusMutation.mutate({ ids: Array.from(selected), newStatus: bulkStatus });
  };

  // Mass Cancel -> the page's real bulk action, applied with the cancel status.
  const handleMassCancel = () => {
    if (selected.size === 0 || bulkStatusMutation.isPending) return;
    if (!confirm(t('admin.orders.cancelConfirm'))) return;
    bulkStatusMutation.mutate({ ids: Array.from(selected), newStatus: 'Canceled' });
  };

  const handleRowCancel = (id: string) => {
    const tr = confirm(t('admin.orders.cancelConfirm'));
    if (!tr) return;
    apiFetch('/api/admin/orders/' + id + '/cancel', user, { method: 'POST' }).then(() => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      notify.success(t('admin.orders.cancelRequested'));
    });
  };

  const handleExport = async (scope: 'page' | 'all') => {
    const params = new URLSearchParams({ status, ...(q ? { q } : {}) });
    if (scope === 'page') params.set('page', String(page));
    const token = await user?.getIdToken();
    const response = await apiFetch('/api/admin/orders/export?' + params, user, { headers: { Authorization: 'Bearer ' + token } });
    if (!response.ok) { notify.error('Export failed'); return; }
    const blob = new Blob([await response.text()], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders-export.csv';
    a.click();
    URL.revokeObjectURL(url);
    notify.success(t('admin.orders.exportSuccess'));
  };

  const copyText = (val: string) => { navigator.clipboard?.writeText(val); notify.success(t('common.copied')); };

  const rows: any[] = oq.data?.data || [];
  const total = oq.data?.total || 0;
  const allSelected = rows.length > 0 && rows.every((r: any) => selected.has(r.id));

  // ── KPIs — computed from the real orders array ─────────────────────────────
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
  const todayCount = rows.filter((o: any) => { const d = new Date(o.createdAt); return !isNaN(d.getTime()) && d.getTime() >= midnight.getTime(); }).length;
  const gross = rows.reduce((s: number, o: any) => s + num(o.charge), 0);
  const cost = rows.reduce((s: number, o: any) => s + num(o.cost), 0);
  const profit = gross - cost;
  const marginPct = gross > 0 ? (profit / gross) * 100 : 0;
  const costPct = gross > 0 ? (cost / gross) * 100 : 0;
  const avgTicket = rows.length ? gross / rows.length : 0;
  const todayPct = rows.length ? Math.round((todayCount / rows.length) * 100) : 0;
  const realized = rows.reduce((s: number, o: any) => {
    const qty = num(o.quantity);
    const done = Math.max(0, Math.min(qty, qty - num(o.remains)));
    return s + num(o.charge) * (qty > 0 ? done / qty : 0);
  }, 0);
  const realizedPct = gross > 0 ? Math.round((realized / gross) * 100) : 0;

  // ── Provider mesh health — derived from the loaded orders ─────────────────
  const syncedCount = rows.filter((o: any) => !!o.providerOrderId).length;
  const pendingDispatch = rows.filter((o: any) => !o.providerOrderId).length;
  const errCount = rows.filter((o: any) => !!o.providerError).length;

  return (
    <div className="flex flex-col gap-gutter-lg" dir={dir}>
      {/* ─── Page heading ──────────────────────────────────────────────────── */}
      <div>
        <h3 className="font-display text-headline-lg font-bold tracking-tight text-on-surface">{t('admin.orders.title')}</h3>
        <p className="mt-space-2xs font-body-sm text-body-sm text-on-surface-variant">{t('admin.orders.subtitle')}</p>
      </div>

      {/* ─── Provider mesh status strip ────────────────────────────────────── */}
      <div className="flex flex-col justify-between gap-space-md rounded-xl bg-surface-container p-space-lg shadow-md lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-space-lg">
          <div className="flex items-center gap-space-sm">
            <span className={`h-2.5 w-2.5 animate-pulse rounded-full shadow-sm ${errCount > 0 ? 'bg-error' : 'bg-tertiary'}`} />
            <span className="font-mono text-label-sm uppercase tracking-widest text-on-surface-variant">{L('Provider Mesh Core', 'شبكة المزودين الأساسية')}</span>
            <span className="rounded bg-surface-container-high px-space-xs py-space-2xs font-mono text-code-xs text-tertiary">{syncedCount} / {rows.length} {L('Synced', 'متزامن')}</span>
          </div>
          <div className="hidden items-center gap-space-md font-mono text-code-xs sm:flex">
            <span className="flex items-center gap-space-2xs rounded bg-surface-container-low px-space-xs py-space-2xs text-on-surface-variant">
              <span className="h-1.5 w-1.5 rounded-full bg-tertiary" /> {L('Synced', 'متزامن')}: <strong className="text-on-surface">{syncedCount}</strong>
            </span>
            <span className="flex items-center gap-space-2xs rounded bg-surface-container-low px-space-xs py-space-2xs text-on-surface-variant">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" /> {L('Pending dispatch', 'بانتظار الإرسال')}: <strong className="text-on-surface">{pendingDispatch}</strong>
            </span>
            <span className="flex items-center gap-space-2xs rounded bg-surface-container-low px-space-xs py-space-2xs text-on-surface-variant">
              <span className={`h-1.5 w-1.5 rounded-full ${errCount > 0 ? 'bg-error' : 'bg-tertiary'}`} /> {L('Provider errors', 'أخطاء المزود')}: <strong className="text-on-surface">{errCount}</strong>
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-space-sm">
          <button type="button" onClick={() => oq.refetch()} title={t('common.refresh')} aria-label={t('common.refresh')}
            className="flex items-center gap-space-xs rounded-xl bg-surface-container-high px-space-md py-space-sm font-label-lg text-label-lg text-on-surface shadow-sm transition-colors hover:bg-surface-bright">
            <RefreshCw className="h-4 w-4 text-primary" />
            <span>{t('common.refresh')}</span>
          </button>
          <button type="button" onClick={handleMassCancel} disabled={selected.size === 0 || bulkStatusMutation.isPending}
            className="flex items-center gap-space-xs rounded-xl bg-error-container px-space-md py-space-sm font-label-lg text-label-lg text-on-error-container shadow-sm transition-colors hover:bg-error-container/80 disabled:opacity-50">
            <CircleX className="h-[18px] w-[18px] shrink-0" />
            <span>{L('Mass Cancel', 'إلغاء جماعي')}</span>
          </button>
          <button type="button" onClick={() => handleExport('all')} title={t('common.exportAll')}
            className="flex items-center gap-space-xs rounded-xl bg-surface-container-highest px-space-md py-space-sm font-label-lg text-label-lg text-on-surface-variant transition-colors hover:bg-surface-bright hover:text-on-surface">
            <Download className="h-[18px] w-[18px] shrink-0" />
            <span>{L('Export Log', 'تصدير السجل')}</span>
          </button>
          <button type="button" onClick={() => handleExport('page')}
            className="flex items-center gap-space-xs rounded-xl bg-surface-container-highest px-space-md py-space-sm font-label-lg text-label-lg text-on-surface-variant transition-colors hover:bg-surface-bright hover:text-on-surface">
            <Download className="h-[18px] w-[18px] shrink-0" />
            <span>{t('common.exportPage')}</span>
          </button>
        </div>
      </div>

      {/* ─── KPI tiles (real sums / counts) ────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-gutter-sm md:grid-cols-2 lg:grid-cols-4">
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container p-space-lg shadow-md">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{L("Today's Orders", 'طلبات اليوم')}</span>
            <span className="rounded bg-surface-container-high px-space-xs py-space-2xs font-mono text-code-xs text-primary">{todayPct}%</span>
          </div>
          <div className="mt-space-md">
            <div className="font-display text-headline-lg font-bold text-on-surface">{fmt(todayCount)}</div>
            <p className="mt-space-2xs font-mono text-code-xs text-on-surface-variant">{fmt(rows.length)} {L('orders loaded', 'طلب محمّل')}</p>
          </div>
          <div className="mt-space-md h-1.5 w-full overflow-hidden rounded-full bg-surface-container-lowest">
            <div className="h-full rounded-full bg-primary" style={{ width: todayPct + '%' }} />
          </div>
        </div>

        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container p-space-lg shadow-md">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{L('Gross Volume', 'إجمالي المبيعات')}</span>
            <TrendingUp className="text-tertiary h-[20px] w-[20px] shrink-0" />
          </div>
          <div className="mt-space-md">
            <div className="font-display text-headline-lg font-bold text-on-surface">{money(gross)}</div>
            <p className="mt-space-2xs font-mono text-code-xs text-on-surface-variant">{L('Avg ticket', 'متوسط الطلب')} {money(avgTicket)}</p>
          </div>
          <div className="mt-space-md h-1.5 w-full overflow-hidden rounded-full bg-surface-container-lowest">
            <div className="h-full rounded-full bg-tertiary" style={{ width: realizedPct + '%' }} />
          </div>
        </div>

        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container p-space-lg shadow-md">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{L('Provider Cost', 'تكلفة المزود')}</span>
            <Network className="text-secondary h-[20px] w-[20px] shrink-0" />
          </div>
          <div className="mt-space-md">
            <div className="font-display text-headline-lg font-bold text-on-surface">{money(cost)}</div>
            <p className="mt-space-2xs font-mono text-code-xs text-on-surface-variant">{costPct.toFixed(1)}% {L('of gross volume', 'من إجمالي المبيعات')}</p>
          </div>
          <div className="mt-space-md h-1.5 w-full overflow-hidden rounded-full bg-surface-container-lowest">
            <div className="h-full rounded-full bg-secondary" style={{ width: costPct + '%' }} />
          </div>
        </div>

        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container p-space-lg shadow-md">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{L('Net Margin', 'الهامش الصافي')}</span>
            <span className="rounded bg-surface-container-high px-space-xs py-space-2xs font-mono text-code-xs text-tertiary">{marginPct.toFixed(1)}%</span>
          </div>
          <div className="mt-space-md">
            <div className={`font-display text-headline-lg font-bold ${profit >= 0 ? 'text-tertiary' : 'text-error'}`}>{profit >= 0 ? '+' : '-'}{money(Math.abs(profit))}</div>
            <p className="mt-space-2xs font-mono text-code-xs text-on-surface-variant">{L('Net profit realized', 'صافي الربح المحقق')}</p>
          </div>
          <div className="mt-space-md h-1.5 w-full overflow-hidden rounded-full bg-surface-container-lowest">
            <div className="h-full rounded-full bg-tertiary-container" style={{ width: Math.max(0, Math.min(100, marginPct)) + '%' }} />
          </div>
        </div>
      </div>

      {/* ─── Search + status filter tabs ──────────────────────────────────── */}
      <div className="flex flex-col items-stretch justify-between gap-space-md lg:flex-row lg:items-center">
        <div className="relative max-w-xl flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-outline h-[20px] w-[20px] shrink-0" />
          <input
            type="search"
            className="h-11 w-full rounded-xl bg-surface-container pe-space-md ps-11 font-body-sm text-body-sm text-on-surface shadow-sm placeholder:text-outline focus:bg-surface-container-high focus:outline-none"
            placeholder={t('admin.orders.searchPlaceholder') || 'Search order ID, service, or provider ID...'}
            value={qInput}
            onChange={x => setQInput(x.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-space-xs">
          {STATUS_TABS.map(tab => {
            const active = status === tab.value;
            const isErrorTab = tab.value === 'Canceled' || tab.value === 'Refunded';
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatus(tab.value)}
                title={tab.value === 'all' ? t('common.allStatuses') : undefined}
                className={`status-tab flex h-11 items-center gap-space-2xs whitespace-nowrap rounded-xl px-space-md font-label-md text-label-md transition-all ${
                  active
                    ? 'bg-primary-container text-on-primary-container shadow-sm'
                    : `bg-surface-container hover:bg-surface-container-high ${isErrorTab ? 'text-error' : 'text-on-surface-variant'}`
                }`}
              >
                {isErrorTab && !active ? <span className="h-1.5 w-1.5 rounded-full bg-error" /> : null}
                <span>{lang === 'ar' ? tab.ar : tab.en}</span>
                {active ? <span className="font-mono text-code-xs">({fmt(total)})</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Order Execution Matrix ───────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl bg-surface-container shadow-xl">
        <div className="flex flex-col items-start justify-between gap-space-md bg-surface-container-high px-space-lg py-space-md lg:flex-row lg:items-center">
          <div className="flex items-center gap-space-md">
            <span className="font-display text-headline-sm text-on-surface">{L('Order Execution Matrix', 'مصفوفة تنفيذ الطلبات')}</span>
            <span className="rounded-lg bg-surface-container-lowest px-space-sm py-space-2xs font-mono text-code-xs text-tertiary">{L('Real-time Hook Active', 'مزامنة فورية نشطة')}</span>
          </div>
          <div className="flex flex-wrap items-center gap-space-sm">
            <span className="font-mono text-code-xs text-on-surface-variant">{t('common.selected', { count: selected.size })}</span>
            <button type="button" onClick={() => setSelected(allSelected ? new Set() : new Set(rows.map((r: any) => r.id)))}
              className="font-label-sm text-label-sm text-primary hover:underline">
              {t('common.selectAll')}
            </button>
            {selected.size > 0 && (
              <>
                <select
                  className="h-[30px] w-auto rounded-lg border border-outline-variant bg-surface-container-lowest px-space-sm font-mono text-code-xs text-on-surface focus:border-primary focus:outline-none"
                  value={bulkStatus}
                  onChange={ev => setBulkStatus(ev.target.value)}
                >
                  <option value="">{t('admin.orders.selectStatus')}</option>
                  {['Pending', 'Processing', 'In Progress', 'Completed', 'Partial', 'Canceled', 'Refunded'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button type="button" onClick={handleBulkStatus} disabled={bulkStatusMutation.isPending}
                  className="inline-flex h-[30px] items-center justify-center rounded-lg bg-primary-container px-space-sm font-label-sm text-label-sm text-on-primary-container transition-colors hover:bg-primary disabled:opacity-50">
                  {t('common.apply')}
                </button>
                <button type="button" onClick={() => { setSelected(new Set()); setBulkStatus(''); }}
                  className="inline-flex h-[30px] items-center justify-center rounded-lg bg-surface-container-lowest px-space-sm font-label-sm text-label-sm text-on-surface-variant transition-colors hover:bg-surface-bright hover:text-on-surface">
                  {t('common.cancel')}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-start font-body-sm text-body-sm">
            <thead className="bg-surface-container-lowest font-mono text-code-xs uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="w-10 px-space-md py-space-md text-center">
                  <input
                    type="checkbox"
                    className="cursor-pointer rounded bg-surface-container-high accent-primary"
                    checked={allSelected}
                    onChange={ev => {
                      if (ev.target.checked) setSelected(new Set(rows.map((r: any) => r.id)));
                      else setSelected(new Set());
                    }}
                  />
                </th>
                <th className="px-space-md py-space-md text-start">{L('Order ID & User', 'رقم الطلب والمستخدم')}</th>
                <th className="px-space-md py-space-md text-start">{L('Provider Node', 'عقدة المزود')}</th>
                <th className="px-space-md py-space-md text-start">{L('Service & Link', 'الخدمة والرابط')}</th>
                <th className="px-space-md py-space-md text-start">{L('Delivery Progress', 'تقدم التنفيذ')}</th>
                <th className="px-space-md py-space-md text-start">{L('Economics', 'الاقتصاديات')}</th>
                <th className="px-space-md py-space-md text-start">{t('admin.orders.headers.status')}</th>
                <th className="px-space-md py-space-md text-end" title={t('admin.orders.headers.actions')}>{L('Quick Dispatch', 'إرسال سريع')}</th>
              </tr>
            </thead>
            <tbody className="text-on-surface">
              {oq.isLoading
                ? <tr><td colSpan={8} className="p-space-xl text-center font-body-sm text-on-surface-variant">{t('common.loading')}</td></tr>
                : rows.length
                  ? rows.map((o: any) => {
                      const qty = num(o.quantity);
                      const done = Math.max(0, Math.min(qty, qty - num(o.remains)));
                      const pct = qty > 0 ? Math.round((done / qty) * 100) : 0;
                      const isFailed = o.status === 'Canceled' || o.status === 'Refunded';
                      const online = o.status !== 'Completed' && o.status !== 'Canceled' && o.status !== 'Refunded';
                      const charge = num(o.charge);
                      const rowProfit = charge - num(o.cost);
                      const profitPct = charge > 0 ? (rowProfit / charge) * 100 : 0;
                      const initials = String(o.user?.name || o.user?.email || '?').trim().charAt(0).toUpperCase() || '?';
                      return (
                        <tr key={o.id} className="h-11 border-b border-outline-variant/60 transition-colors last:border-0 hover:bg-primary/[0.04] dark:hover:bg-white/[0.02]">
                          <td className="px-space-md py-space-md text-center">
                            <input
                              type="checkbox"
                              className="cursor-pointer rounded bg-surface-container-high accent-primary"
                              checked={selected.has(o.id)}
                              onChange={ev => {
                                const newSet = new Set(selected);
                                if (ev.target.checked) newSet.add(o.id);
                                else newSet.delete(o.id);
                                setSelected(newSet);
                              }}
                            />
                          </td>
                          <td className="px-space-md py-space-md" title={t('admin.orders.headers.user')}>
                            <div className="flex items-center gap-space-sm">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-highest font-mono text-code-xs font-bold text-primary">{initials}</div>
                              <div className="flex min-w-0 flex-col">
                                <span className={`font-mono text-code-sm font-bold ${isFailed ? 'text-error' : 'text-primary'}`} title={t('admin.orders.headers.id')}>#{String(o.id).slice(0, 8)}</span>
                                <span className="max-w-[180px] truncate font-body-sm text-body-sm leading-tight text-on-surface" title={o.user?.email || '-'}>{o.user?.email || '-'}</span>
                                <span className="max-w-[180px] truncate font-mono text-code-xs text-tertiary">{o.user?.name || o.user?.role || '-'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-space-md py-space-md">
                            <div className="flex flex-col">
                              <span className="font-label-md text-label-md text-on-surface" title={t('admin.orders.headers.mode')}>
                                {o.service?.executionMode === 'manual' ? t('admin.orders.manual') : t('admin.orders.provider')}
                              </span>
                              <span className="flex min-w-0 items-center gap-space-2xs font-mono text-code-xs text-on-surface-variant" title={t('admin.orders.headers.provider_id')}>
                                ID: <span className="max-w-[140px] truncate font-semibold text-primary">{o.providerOrderId || '-'}</span>
                                {o.providerOrderId
                                  ? <button type="button" onClick={() => copyText(String(o.providerOrderId))} title={t('common.copy')} aria-label={t('common.copy')} className="inline-flex shrink-0 cursor-pointer items-center text-tertiary transition-colors hover:text-primary"><Copy className="h-3.5 w-3.5" /></button>
                                  : null}
                              </span>
                              {o.providerError
                                ? <span className="flex items-center gap-space-2xs font-mono text-code-xs font-semibold text-error">{L('Err', 'خطأ')}: {o.providerError}</span>
                                : <span className={`font-mono text-code-xs ${o.providerOrderId ? 'text-on-surface-variant' : 'text-secondary'}`}>
                                    {o.providerOrderId
                                      ? L('Synced', 'متزامن')
                                      : L('Awaiting dispatch', 'بانتظار الإرسال')}
                                  </span>}
                            </div>
                          </td>
                          <td className="max-w-xs px-space-md py-space-md" title={t('admin.orders.headers.service')}>
                            <div className="flex min-w-0 flex-col">
                              <div className="flex min-w-0 items-center gap-space-xs">
                                <span className="shrink-0 rounded bg-surface-container-lowest px-space-xs py-space-2xs font-mono text-code-xs text-on-surface-variant">
                                  SID: {o.service?.id ? String(o.service.id).slice(0, 8) : '-'}
                                </span>
                                <span className="truncate font-label-md text-label-md font-medium text-on-surface" title={o.service?.name || '-'}>{o.service?.name || '-'}</span>
                              </div>
                              <a href={o.link} target="_blank" rel="noreferrer"
                                className="mt-space-2xs flex items-center gap-space-2xs truncate font-mono text-code-xs text-tertiary hover:underline">
                                <Link2 className="h-[14px] w-[14px] shrink-0" />
                                {o.link}
                              </a>
                            </div>
                          </td>
                          <td className="w-48 px-space-md py-space-md" title={t('admin.orders.headers.remains')}>
                            <div className="flex flex-col gap-space-2xs">
                              <div className="flex justify-between font-mono text-code-xs">
                                <span className="text-on-surface" title={t('admin.orders.headers.qty')}>
                                  {pct === 0 ? L('Queued', 'في الانتظار') : `${fmt(done)} / ${fmt(qty)}`}
                                </span>
                                <span className={`font-bold ${isFailed ? 'text-error' : o.status === 'Pending' ? 'text-secondary' : 'text-tertiary'}`}>{pct}%</span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-lowest">
                                <div
                                  className={`h-full rounded-full ${isFailed ? 'bg-error' : o.status === 'Pending' ? 'bg-secondary' : o.status === 'Processing' ? 'animate-pulse bg-surface-bright' : o.status === 'Partial' ? 'bg-primary' : 'bg-tertiary'}`}
                                  style={{ width: Math.max(2, Math.min(100, pct)) + '%' }}
                                />
                              </div>
                              <span className="font-mono text-code-xs text-on-surface-variant">
                                {pct === 0
                                  ? `${t('admin.orders.headers.qty')}: ${fmt(qty)}`
                                  : `${t('admin.orders.headers.start')}: ${fmt(num(o.startCount))}`}
                              </span>
                            </div>
                          </td>
                          <td className="px-space-md py-space-md">
                            <div className="flex flex-col font-mono text-code-xs">
                              <span className="text-on-surface-variant">{L('Cost', 'التكلفة')}: <strong className="text-on-surface">{money(num(o.cost))}</strong></span>
                              <span className="text-on-surface-variant">{t('admin.orders.headers.charge')}: <strong className="text-on-surface">{money(charge)}</strong></span>
                              {charge > 0
                                ? <span className={`font-bold ${rowProfit >= 0 ? 'text-tertiary' : 'text-error'}`}>
                                    {L('Profit', 'الربح')}: {rowProfit >= 0 ? '+' : '-'}{money(Math.abs(rowProfit))} ({profitPct.toFixed(1)}%)
                                  </span>
                                : <span className="font-medium text-on-surface-variant">{L('Margin: Pending', 'الهامش: قيد الانتظار')}</span>}
                            </div>
                          </td>
                          <td className="px-space-md py-space-md">
                            <span className={`status-badge s-${statusKey(o.status)}`}>{o.status}</span>
                          </td>
                          <td className="px-space-md py-space-md text-end">
                            <div className="flex items-center justify-end gap-space-xs">
                              <button type="button" onClick={() => refresh.mutate(o.id)} disabled={refresh.isPending}
                                aria-label="Sync status" title="Sync Status"
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-high text-on-surface transition-colors hover:bg-surface-bright disabled:opacity-50">
                                <RefreshCw className="h-4 w-4" />
                              </button>
                              {online
                                ? <button type="button" onClick={() => handleRowCancel(o.id)} aria-label={t('admin.orders.cancel')} title={t('admin.orders.cancel')}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-container text-on-error-container transition-colors hover:opacity-90">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  : <tr><td colSpan={8} className="p-space-xl text-center font-body-sm text-on-surface-variant">{t('orders.noMatching')}</td></tr>
              }
            </tbody>
          </table>
        </div>
        <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}
