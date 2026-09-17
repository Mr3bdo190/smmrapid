import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { notify } from '../../lib/notify';
import { useTranslation } from '../../lib/i18n';
import { ArrowRight, Banknote, Copy, Download, ExternalLink, Info, Loader2, Package, RefreshCw, Search, X } from 'lucide-react';

const readErr = async (r: Response, fallback: string) => { const b = await r.json().catch(() => ({})); return b?.error || fallback; };
const CANCELABLE_STATUSES = ['Pending', 'Processing', 'In Progress'];
const REFILLABLE_STATUSES = ['Completed', 'Partial'];
const ACTIVE_STATUSES = ['Pending', 'Processing', 'In Progress'];

/** Real order status → design-system status-badge modifier (see status-badge rules in index.css). */
const STATUS_BADGE: Record<string, string> = {
  Pending: 's-pending', Processing: 's-processing', 'In Progress': 's-inprogress',
  Completed: 's-completed', Partial: 's-partial', Canceled: 's-canceled', Refunded: 's-refunded',
};

/** The status filter options — same set of statuses the screen always offered. */
const STATUS_OPTIONS = ['all', 'Pending', 'Processing', 'In Progress', 'Completed', 'Partial', 'Canceled', 'Refunded'];

/** Order status → existing i18n key (the enum has one status without a key: In Progress). */
const STATUS_LABEL_KEY: Record<string, string | undefined> = {
  Pending: 'status.pending', Processing: 'status.processing', Completed: 'status.completed',
  Partial: 'status.partial', Canceled: 'status.canceled', Refunded: 'status.refunded',
};

const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const money = (v: any) => `$${num(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const DAY_MS = 24 * 60 * 60 * 1000;

export default function ClientOrders() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { t, lang } = useTranslation();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');

  /** Inline EN/AR for labels that have no i18n key yet. */
  const en = (e: string, a: string) => (lang === 'ar' ? a : e);

  const { data: orders = [], isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['client-orders'], enabled: !!user, refetchInterval: 30000,
    queryFn: async () => { const t = await user!.getIdToken(); const r = await apiFetch('/api/client/orders', user, { headers: { Authorization: `Bearer ${t}` } }); if (!r.ok) throw new Error('Failed to load orders'); return r.json(); }
  });

  const refill = useMutation({
    mutationFn: async (id: string) => { const t = await user!.getIdToken(); const r = await apiFetch(`/api/client/orders/${id}/refill`, user, { method: 'POST', headers: { Authorization: `Bearer ${t}` } }); if (!r.ok) throw new Error(await readErr(r, 'Refill request failed')); return r.json(); },
    onSuccess: () => { notify.success('Refill requested — we\'ll update the order once the provider responds'); qc.invalidateQueries({ queryKey: ['client-orders'] }); },
    onError: (e: any) => notify.error(e),
  });
  const cancel = useMutation({
    mutationFn: async (id: string) => { const t = await user!.getIdToken(); const r = await apiFetch(`/api/client/orders/${id}/cancel`, user, { method: 'POST', headers: { Authorization: `Bearer ${t}` } }); if (!r.ok) throw new Error(await readErr(r, 'Cancel request failed')); return r.json(); },
    onSuccess: (data: any) => { notify.success(Number(data?.refundedAmount || 0) > 0 ? 'Order canceled. The unfulfilled quantity was refunded to your wallet.' : 'Cancellation requested. The provider is processing it now; your refund will be calculated from the unfulfilled quantity.'); qc.invalidateQueries({ queryKey: ['client-orders'] }); qc.invalidateQueries({ queryKey: ['client-me'] }); },
    onError: (e: any) => notify.error(e),
  });

  const refreshOrder = useMutation({
    mutationFn: async (id: string) => { const t = await user!.getIdToken(); const r = await apiFetch(`/api/client/orders/${id}/refresh`, user, { method: 'POST', headers: { Authorization: `Bearer ${t}` } }); if (!r.ok) throw new Error(await readErr(r, 'Could not refresh order')); return r.json(); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-orders'] }); qc.invalidateQueries({ queryKey: ['client-me'] }); },
    onError: (e: any) => notify.error(e),
  });

  const orderList: any[] = orders as any;
  const rows = orderList.filter((o: any) => (status === 'all' || o.status === status) && (`${o.id} ${o.service?.name || ''} ${o.link}`.toLowerCase().includes(q.toLowerCase())));
  const exportCsv = () => {
    const csv = ['Order ID,Service,Link,Quantity,Start Count,Remains,Charge,Status,Created', ...rows.map((o: any) => [o.id, o.service?.name || '', o.link, o.quantity, o.startCount ?? '', o.remains ?? '', o.charge, o.status, o.createdAt].map(v => `"${String(v ?? '').replaceAll('"', '""')}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'orders.csv'; a.click(); notify.success('Orders exported');
  };

  const copyId = (id: any) => { navigator.clipboard?.writeText(String(id)); notify.success(t('common.copied')); };
  const statusLabel = (s: string) => { const key = STATUS_LABEL_KEY[s]; if (key) return t(key); return s === 'In Progress' ? (lang === 'ar' ? 'قيد التنفيذ' : 'In Progress') : s; };

  /* ---------- Summary figures — all computed from the real orders array ---------- */
  const nowMs = Date.now();
  const startOfTodayMs = new Date().setHours(0, 0, 0, 0);
  const countBy = (s: string) => orderList.filter((o: any) => o.status === s).length;
  const totalOrders = orderList.length;
  const inProgressCount = countBy('In Progress');
  const activeCount = countBy('Processing') + inProgressCount;
  const dispatchedToday = orderList.filter((o: any) => new Date(o.createdAt).getTime() >= startOfTodayMs).length;
  const spent30d = orderList.filter((o: any) => nowMs - new Date(o.createdAt).getTime() <= 30 * DAY_MS).reduce((sum: number, o: any) => sum + num(o.charge), 0);
  const fulfilledCount = countBy('Completed') + countBy('Partial');
  const refundedCount = countBy('Canceled') + countBy('Refunded');
  const fulfillmentRate = totalOrders ? (fulfilledCount / totalOrders) * 100 : 0;
  const refundRate = totalOrders ? (refundedCount / totalOrders) * 100 : 0;

  /* Shared field styling — touch-sized, token-based, RTL-safe. */
  const field = 'h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest text-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
  const label = 'text-sm font-semibold text-on-surface';
  const hint = 'text-xs text-on-surface-variant';
  const statCard = 'flex flex-col rounded-xl border border-outline-variant bg-surface-container p-4';

  const busy = refreshOrder.isPending || refill.isPending || cancel.isPending;

  return (
    <div className="flex flex-col gap-gutter-lg">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-space-md">
        <div className="min-w-0">
          <h1 className="font-display text-headline-lg text-on-surface">{t('nav.orderHistory')}</h1>
          <p className={`${hint} mt-1`}>{en('Every order you placed, with its status, charge and progress.', 'كل طلب قمت به مع حالته وتكلفته وتقدمه.')}</p>
        </div>
        <Link
          to="/dashboard/new-order"
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-primary-container px-5 text-sm font-semibold text-on-primary-container transition-colors hover:opacity-90"
        >
          <ArrowRight className="h-4 w-4 rtl:rotate-180" /> {t('nav.newOrder')}
        </Link>
      </div>

      {/* ── 1 · Summary ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-space-md lg:grid-cols-4">
        <div className={statCard}>
          <span className="text-sm text-on-surface-variant">{en('Total orders', 'إجمالي الطلبات')}</span>
          <span className="mt-1 font-mono text-xl font-bold tabular-nums text-on-surface">{totalOrders.toLocaleString()}</span>
          <span className={`${hint} mt-1`}>
            {dispatchedToday > 0 ? en(`+${dispatchedToday} placed today`, `+${dispatchedToday} اليوم`) : en('None placed today', 'لا طلبات اليوم')}
          </span>
        </div>
        <div className={statCard}>
          <span className="text-sm text-on-surface-variant">{en('In progress', 'قيد التنفيذ')}</span>
          <span className="mt-1 font-mono text-xl font-bold tabular-nums text-tertiary">{activeCount.toLocaleString()}</span>
          <span className={`${hint} mt-1`}>{inProgressCount.toLocaleString()} {en('running right now', 'يعمل الآن')}</span>
        </div>
        <div className={statCard}>
          <span className="text-sm text-on-surface-variant">{en('Spent (last 30 days)', 'المصروف (آخر 30 يوم)')}</span>
          <span className="mt-1 font-mono text-xl font-bold tabular-nums text-on-surface">{money(spent30d)}</span>
          <span className={`${hint} mt-1`}>{t('common.currency')}</span>
        </div>
        <div className={statCard}>
          <span className="text-sm text-on-surface-variant">{en('Delivered rate', 'معدل التسليم')}</span>
          <span className="mt-1 font-mono text-xl font-bold tabular-nums text-on-surface">{fulfillmentRate.toFixed(1)}%</span>
          <span className={`${hint} mt-1`}>{refundRate.toFixed(1)}% {en('refunded or canceled', 'مسترد أو ملغي')}</span>
        </div>
      </div>

      {/* ── 2 · Find your orders ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-space-lg rounded-xl border border-outline-variant bg-surface-container p-5">
        <div className="flex flex-col gap-space-md md:flex-row md:items-end">
          <div className="flex flex-1 flex-col gap-2">
            <label htmlFor="order-search" className={label}>{en('Search orders', 'ابحث في الطلبات')}</label>
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <input
                id="order-search"
                type="text"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder={en('Search order, service or link', 'ابحث برقم الطلب أو الخدمة أو الرابط')}
                className={`${field} ps-9 pe-3`}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 md:w-56">
            <label htmlFor="order-status" className={label}>{t('common.status')}</label>
            <select
              id="order-status"
              value={status}
              onChange={e => setStatus(e.target.value)}
              className={`${field} cursor-pointer px-3`}
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s === 'all' ? en('All statuses', 'كل الحالات') : statusLabel(s)}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> {t('common.refresh')}
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
            >
              <Download className="h-4 w-4" /> {t('common.export')}
            </button>
          </div>
        </div>
        <p className={hint}>
          {orderList.length === 0
            ? en('Your orders will be listed here.', 'ستظهر طلباتك هنا.')
            : rows.length === orderList.length
              ? en(`Showing all ${orderList.length} orders.`, `عرض كل الطلبات (${orderList.length}).`)
              : en(`Showing ${rows.length} of ${orderList.length} orders.`, `عرض ${rows.length} من ${orderList.length} طلب.`)}{' '}
          {en('The list refreshes automatically every 30 seconds.', 'يتم تحديث القائمة تلقائياً كل 30 ثانية.')}
        </p>
      </div>

      {/* ── 3 · Your orders ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-space-lg rounded-xl border border-outline-variant bg-surface-container p-5">
        <div className="flex flex-wrap items-center justify-between gap-space-md">
          <h2 className="font-display text-headline-sm text-on-surface">{en('Your orders', 'طلباتك')}</h2>
          <span className="text-sm text-on-surface-variant">{rows.length.toLocaleString()} {en('shown', 'معروض')}</span>
        </div>

        {isError && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-error/40 bg-error-container p-3 text-sm text-on-error-container">
            <span>{en('We could not load your orders.', 'تعذر تحميل طلباتك.')}</span>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-surface-container px-3 font-semibold"
            >
              <RefreshCw className="h-4 w-4" /> {t('common.retry')}
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="mt-2 text-sm font-semibold text-on-surface">{t('common.loading')}</p>
            <p className={hint}>{en('Fetching your latest orders…', 'جارٍ جلب أحدث طلباتك…')}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-8 text-center">
            <Package className="h-8 w-8 text-outline" />
            <p className="text-sm font-semibold text-on-surface">
              {orderList.length === 0
                ? en("You haven't placed any orders yet.", 'لم تقم بأي طلب حتى الآن.')
                : en('No orders match your search or filter.', 'لا توجد طلبات مطابقة للبحث أو الفلتر.')}
            </p>
            <p className={`${hint} max-w-md`}>
              {orderList.length === 0
                ? en('Place your first order and it will show up here with live progress.', 'أنشئ أول طلب وسيظهر هنا مع تقدمه المباشر.')
                : en('Try a different search term, or choose “All statuses”.', 'جرّب كلمة بحث أخرى أو اختر «كل الحالات».')}
            </p>
            {orderList.length === 0 ? (
              <Link
                to="/dashboard/new-order"
                className="mt-2 inline-flex h-11 items-center gap-2 rounded-lg bg-primary-container px-5 text-sm font-semibold text-on-primary-container transition-colors hover:opacity-90"
              >
                <ArrowRight className="h-4 w-4 rtl:rotate-180" /> {t('nav.newOrder')}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => { setQ(''); setStatus('all'); }}
                className="mt-2 inline-flex h-11 items-center rounded-lg border border-outline-variant bg-surface-container px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
              >
                {en('Clear search and filters', 'مسح البحث والفلاتر')}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-start text-sm">
              <thead>
                <tr className="border-b border-outline-variant text-sm text-on-surface-variant">
                  <th className="px-4 py-3 text-start font-semibold">{en('Service', 'الخدمة')}</th>
                  <th className="px-4 py-3 text-start font-semibold">{en('Link', 'الرابط')}</th>
                  <th className="px-4 py-3 text-start font-semibold">{en('Quantity', 'الكمية')}</th>
                  <th className="px-4 py-3 text-start font-semibold">{en('Charge', 'التكلفة')}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t('common.status')}</th>
                  <th className="px-4 py-3 text-start font-semibold">{en('Created', 'تاريخ الإنشاء')}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="text-on-surface">
                {rows.map((o: any) => {
                  const canRefill = o.service?.refillable && REFILLABLE_STATUSES.includes(o.status);
                  const canCancel = o.service?.cancelable && CANCELABLE_STATUSES.includes(o.status) && !o.cancelRequested;
                  const canRefresh = !!o.providerOrderId && ACTIVE_STATUSES.includes(o.status);
                  const refunded = num(o.refundedAmount);
                  const created = o.createdAt ? new Date(o.createdAt) : null;
                  const validCreated = created && !Number.isNaN(created.getTime());
                  const quantity = num(o.quantity);
                  const hasRemains = Number.isFinite(Number(o.remains));
                  const hasStart = Number.isFinite(Number(o.startCount));
                  const remains = num(o.remains);
                  const delivered = Math.min(quantity, Math.max(0, quantity - remains));
                  const dead = o.status === 'Canceled' || o.status === 'Refunded';
                  return (
                    <tr key={o.id} className="border-b border-outline-variant last:border-0 transition-colors hover:bg-surface-container-high/40">
                      <td className="px-4 py-3 align-top">
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="truncate text-sm font-semibold text-on-surface">{o.service?.name || en('Service unavailable', 'الخدمة غير متاحة')}</span>
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs tabular-nums text-on-surface-variant">#{String(o.id).slice(0, 8)}</span>
                            <button
                              type="button"
                              onClick={() => copyId(o.id)}
                              title={t('common.copy')}
                              aria-label={t('common.copy')}
                              className="inline-flex h-7 items-center gap-1 rounded-md bg-surface-container-high px-2 text-xs text-on-surface-variant transition-colors hover:bg-surface-bright hover:text-on-surface"
                            >
                              <Copy className="h-3.5 w-3.5" /> {t('common.copy')}
                            </button>
                          </span>
                          {quantity > 0 && (hasRemains || hasStart) && (
                            <span className={hint}>
                              {en('Delivered', 'تم التسليم')} <b className="font-mono tabular-nums text-on-surface">{delivered.toLocaleString()}</b> {en('of', 'من')}{' '}
                              <span className="font-mono tabular-nums">{quantity.toLocaleString()}</span>
                              {hasRemains && <> · <span className="font-mono tabular-nums">{remains.toLocaleString()}</span> {en('remaining', 'متبقٍ')}</>}
                              {hasStart && <> · {en('started at', 'البداية')} <span className="font-mono tabular-nums">{num(o.startCount).toLocaleString()}</span></>}
                            </span>
                          )}
                          {o.cancelRequested ? (
                            <span className="flex items-center gap-1 text-xs text-error">
                              <Info className="h-3.5 w-3.5 shrink-0" /> {en('Cancellation requested', 'تم طلب الإلغاء')}
                            </span>
                          ) : o.status === 'Partial' && refunded > 0 ? (
                            <span className="flex items-center gap-1 text-xs text-success">
                              <Banknote className="h-3.5 w-3.5 shrink-0" />
                              {en(`Refunded ${money(refunded)} to your balance`, `تم استرداد ${money(refunded)} إلى رصيدك`)}
                            </span>
                          ) : o.providerOrderId ? (
                            <span className={hint}>
                              {en('Provider order', 'الطلب لدى المزود')} <span className="font-mono tabular-nums">{o.providerOrderId}</span>
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-2">
                          <a
                            href={o.link}
                            target="_blank"
                            rel="noreferrer"
                            title={o.link}
                            className="max-w-[220px] truncate font-mono text-sm text-tertiary hover:underline"
                          >
                            {o.link}
                          </a>
                          <a
                            href={o.link}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={en('Open link', 'فتح الرابط')}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant transition-colors hover:bg-surface-bright hover:text-on-surface"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top font-mono text-sm font-semibold tabular-nums">
                        <span className={`${dead ? 'text-outline' : 'text-on-surface'}`}>{quantity.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col">
                          <span className={`font-mono text-sm font-semibold tabular-nums ${dead ? 'text-outline line-through' : 'text-on-surface'}`}>{money(o.charge)}</span>
                          {quantity > 0 && <span className={hint}>{money(num(o.charge) / quantity * 1000)} / 1k</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className={`status-badge ${STATUS_BADGE[o.status] || 's-default'}`}>{statusLabel(o.status)}</span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col">
                          <span className="text-sm text-on-surface">
                            {validCreated ? created!.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—'}
                          </span>
                          {validCreated && <span className={hint}>{created!.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour12: false })}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-end">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {canRefresh && (
                            <button
                              disabled={refreshOrder.isPending}
                              onClick={() => refreshOrder.mutate(o.id)}
                              title={en('Sync status', 'مزامنة الحالة')}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-50"
                              type="button"
                            >
                              <RefreshCw className={`h-4 w-4 ${refreshOrder.isPending ? 'animate-spin' : ''}`} />
                              {refreshOrder.isPending ? en('Updating…', 'جارٍ التحديث…') : en('Update status', 'تحديث الحالة')}
                            </button>
                          )}
                          {canRefill && (
                            <button
                              disabled={refill.isPending}
                              onClick={() => refill.mutate(o.id)}
                              title={en('Request a refill if this order drops', 'اطلب إعادة التعبئة إذا نقص الطلب')}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm font-medium text-tertiary transition-colors hover:bg-surface-container-high disabled:opacity-50"
                              type="button"
                            >
                              <RefreshCw className="h-4 w-4" />
                              {refill.isPending ? en('Requesting…', 'جارٍ الطلب…') : en('Refill', 'إعادة تعبئة')}
                            </button>
                          )}
                          {canCancel && (
                            <button
                              disabled={cancel.isPending}
                              onClick={() => confirm('Cancel this order and refund it to your wallet?') && cancel.mutate(o.id)}
                              title={en('Cancel this order and refund the unfulfilled part', 'إلغاء الطلب واسترداد الجزء غير المنفذ')}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-error/40 bg-error-container/40 px-3 text-sm font-medium text-error transition-colors hover:bg-error-container disabled:opacity-50"
                              type="button"
                            >
                              <X className="h-4 w-4" />
                              {cancel.isPending ? en('Canceling…', 'جارٍ الإلغاء…') : t('common.cancel')}
                            </button>
                          )}
                          {!canRefresh && !canRefill && !canCancel && (
                            <span className="text-sm text-outline" title={en('Nothing left to do for this order', 'لا إجراءات متاحة لهذا الطلب')}>
                              {en('No actions available', 'لا إجراءات متاحة')}
                            </span>
                          )}
                        </div>
                        {busy && <p className={`${hint} mt-1`}>{en('Talking to the provider…', 'جارٍ التواصل مع المزود…')}</p>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
