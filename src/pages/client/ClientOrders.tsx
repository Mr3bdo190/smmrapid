import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; import { apiFetch } from '../../lib/api'; import { notify } from '../../lib/notify';
import { useTranslation } from '../../lib/i18n';
import { BadgeCheck, Banknote, Copy, Download, ExternalLink, Home, Info, Landmark, RefreshCcw, RefreshCw, Search, TrendingUp, X, Zap } from 'lucide-react';

const readErr = async (r: Response, fallback: string) => { const b = await r.json().catch(() => ({})); return b?.error || fallback; };
const CANCELABLE_STATUSES = ['Pending', 'Processing', 'In Progress'];
const REFILLABLE_STATUSES = ['Completed', 'Partial'];
const ACTIVE_STATUSES = ['Pending', 'Processing', 'In Progress'];

/** Real order status → design-system status-badge modifier (see status-badge rules in index.css). */
const STATUS_BADGE: Record<string, string> = {
  Pending: 's-pending', Processing: 's-processing', 'In Progress': 's-inprogress',
  Completed: 's-completed', Partial: 's-partial', Canceled: 's-canceled', Refunded: 's-refunded',
};
/** Status → progress-bar / remaining-count tone, mirroring the mockup's per-status colors. */
const PROGRESS_TONE: Record<string, { text: string; bar: string }> = {
  'In Progress': { text: 'text-primary', bar: 'bg-primary' },
  Processing: { text: 'text-tertiary', bar: 'bg-tertiary' },
  Completed: { text: 'text-tertiary', bar: 'bg-tertiary' },
  Partial: { text: 'text-secondary', bar: 'bg-secondary' },
  Pending: { text: 'text-outline', bar: 'bg-outline/40' },
  Canceled: { text: 'text-outline', bar: 'bg-error' },
  Refunded: { text: 'text-outline', bar: 'bg-error' },
};
const PROGRESS_FALLBACK = { text: 'text-outline', bar: 'bg-outline/40' };

/** Status tab rail: reuses the i18n status keys, inline EN/AR only for the two tabs without one. */
const STATUS_TABS: Array<{ value: string; key?: string; en?: string; ar?: string; tone: string }> = [
  { value: 'all', en: 'All', ar: 'الكل', tone: 'text-on-primary-container' },
  { value: 'Pending', key: 'status.pending', tone: 'text-outline' },
  { value: 'Processing', key: 'status.processing', tone: 'text-tertiary' },
  { value: 'In Progress', en: 'In Progress', ar: 'قيد التنفيذ', tone: 'text-primary' },
  { value: 'Completed', key: 'status.completed', tone: 'text-on-surface' },
  { value: 'Partial', key: 'status.partial', tone: 'text-secondary' },
  { value: 'Canceled', key: 'status.canceled', tone: 'text-error' },
  { value: 'Refunded', key: 'status.refunded', tone: 'text-error' },
];

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
  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['client-orders'], enabled: !!user, refetchInterval: 30000,
    queryFn: async () => { const t = await user!.getIdToken(); const r = await apiFetch('/api/client/orders', user, { headers: { Authorization: `Bearer ${t}` } }); if (!r.ok) throw new Error('Failed to load orders'); return r.json(); }
  });

  const refill = useMutation({
    mutationFn: async (id: string) => { const t = await user!.getIdToken(); const r = await apiFetch(`/api/client/orders/${id}/refill`, user, { method: 'POST', headers: { Authorization: `Bearer ${t}` } }); if (!r.ok) throw new Error(await readErr(r, 'Refill request failed')); return r.json(); },
    onSuccess: () => { notify.success('Refill requested — we\'ll update the order once the provider responds'); qc.invalidateQueries({ queryKey: ['client-orders'] }); },
    onError: (e: any) => notify.error(e.message),
  });
  const cancel = useMutation({
    mutationFn: async (id: string) => { const t = await user!.getIdToken(); const r = await apiFetch(`/api/client/orders/${id}/cancel`, user, { method: 'POST', headers: { Authorization: `Bearer ${t}` } }); if (!r.ok) throw new Error(await readErr(r, 'Cancel request failed')); return r.json(); },
    onSuccess: (data: any) => { notify.success(Number(data?.refundedAmount || 0) > 0 ? 'Order canceled. The unfulfilled quantity was refunded to your wallet.' : 'Cancellation requested. The provider is processing it now; your refund will be calculated from the unfulfilled quantity.'); qc.invalidateQueries({ queryKey: ['client-orders'] }); qc.invalidateQueries({ queryKey: ['client-me'] }); },
    onError: (e: any) => notify.error(e.message),
  });

  const refreshOrder = useMutation({
    mutationFn: async (id: string) => { const t = await user!.getIdToken(); const r = await apiFetch(`/api/client/orders/${id}/refresh`, user, { method: 'POST', headers: { Authorization: `Bearer ${t}` } }); if (!r.ok) throw new Error(await readErr(r, 'Could not refresh order')); return r.json(); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-orders'] }); qc.invalidateQueries({ queryKey: ['client-me'] }); },
    onError: (e: any) => notify.error(e.message),
  });

  const orderList: any[] = orders as any;
  const rows = orderList.filter((o: any) => (status === 'all' || o.status === status) && (`${o.id} ${o.service?.name || ''} ${o.link}`.toLowerCase().includes(q.toLowerCase())));
  const exportCsv = () => {
    const csv = ['Order ID,Service,Link,Quantity,Start Count,Remains,Charge,Status,Created', ...rows.map((o: any) => [o.id, o.service?.name || '', o.link, o.quantity, o.startCount ?? '', o.remains ?? '', o.charge, o.status, o.createdAt].map(v => `"${String(v ?? '').replaceAll('"', '""')}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'orders.csv'; a.click(); notify.success('Orders exported');
  };

  const copyId = (id: any) => { navigator.clipboard?.writeText(String(id)); notify.success(t('common.copied')); };
  const statusLabel = (s: string) => { const key = STATUS_LABEL_KEY[s]; if (key) return t(key); return s === 'In Progress' ? (lang === 'ar' ? 'قيد التنفيذ' : 'In Progress') : s; };
  const tabLabel = (tab: typeof STATUS_TABS[number]) => tab.key ? t(tab.key) : (lang === 'ar' ? String(tab.ar) : String(tab.en));

  /* ---------- KPI figures — all computed from the real orders array ---------- */
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

  return (
    <div className="flex flex-col gap-gutter-lg">
      {/* Breadcrumb + banner */}
      <div className="flex flex-col gap-space-md md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-space-2xs">
          <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-on-surface-variant">
            <Link className="flex items-center gap-space-2xs transition-colors hover:text-primary" to="/dashboard">
              <Home className="h-[16px] w-[16px] shrink-0" />
              <span>{t('nav.dashboard')}</span>
            </Link>
            <span>/</span>
            <span>{lang === 'ar' ? 'العمليات' : 'Operations'}</span>
            <span>/</span>
            <span className="font-medium text-primary">{t('nav.orderHistory')}</span>
          </div>
          <div className="flex items-baseline gap-space-md">
            <h1 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">{lang === 'ar' ? 'سجل الطلبات وتتبعها' : 'Order History & Tracking'}</h1>
            <span className="rounded bg-surface-container-high px-space-xs py-space-2xs font-code-xs text-code-xs font-semibold uppercase tracking-wider text-tertiary">{lang === 'ar' ? 'المحرك مباشر' : 'Live Engine Active'}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-space-sm sm:flex-nowrap">
          <div className="relative w-full sm:w-72">
            <Search className="absolute start-space-md top-1/2 -translate-y-1/2 text-outline h-[20px] w-[20px] shrink-0" />
            <input className="h-10 w-full rounded-xl bg-surface-container ps-10 pe-space-md font-body-sm text-body-sm text-on-surface transition-all placeholder:text-outline focus:bg-surface-container-high focus:outline-none" placeholder={lang === 'ar' ? 'تصفية حسب رقم الطلب أو الرابط...' : 'Filter by Order ID, target URL...'} type="text" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <button className="flex h-10 items-center gap-space-xs rounded-xl bg-surface-container px-space-md font-label-lg text-label-lg text-on-surface shadow-sm transition-colors hover:bg-surface-container-high" onClick={() => refetch()} type="button">
            <RefreshCw className="h-[18px] w-[18px] shrink-0" />
            <span className="hidden lg:inline">{t('common.refresh')}</span>
          </button>
          <button className="flex h-10 items-center gap-space-xs rounded-xl bg-primary px-space-md font-label-lg text-label-lg text-on-primary shadow-sm transition-colors hover:bg-primary-fixed" onClick={exportCsv} type="button">
            <Download className="h-[18px] w-[18px] shrink-0" />
            <span>{t('common.export')}</span>
          </button>
        </div>
      </div>

      {/* KPI tiles — counts, sums and rates derived from the orders above */}
      <div className="grid grid-cols-2 gap-space-md md:grid-cols-4">
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container p-space-lg shadow-sm">
          <div className="absolute -end-4 -bottom-4 h-20 w-20 rounded-full bg-primary/5 blur-xl transition-all group-hover:bg-primary/10"></div>
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="font-label-sm text-label-sm uppercase tracking-wider">{lang === 'ar' ? 'إجمالي المرسل' : 'Total Dispatched'}</span>
            <TrendingUp className="text-primary h-[20px] w-[20px] shrink-0" />
          </div>
          <div className="mt-space-md flex items-baseline justify-between">
            <span className="font-headline-lg text-headline-lg font-bold text-on-surface">{totalOrders.toLocaleString()}</span>
            <span className="flex items-center font-code-xs text-code-xs text-tertiary">{lang === 'ar' ? `+${dispatchedToday} اليوم` : `+${dispatchedToday} today`}</span>
          </div>
        </div>
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container p-space-lg shadow-sm">
          <div className="absolute -end-4 -bottom-4 h-20 w-20 rounded-full bg-tertiary/5 blur-xl transition-all group-hover:bg-tertiary/10"></div>
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="font-label-sm text-label-sm uppercase tracking-wider">{lang === 'ar' ? 'قيد التنفيذ الفعلي' : 'Active Execution'}</span>
            <RefreshCcw className="text-tertiary h-[20px] w-[20px] shrink-0" />
          </div>
          <div className="mt-space-md flex items-baseline justify-between">
            <span className="font-headline-lg text-headline-lg font-bold text-tertiary">{activeCount.toLocaleString()}</span>
            <span className="font-code-xs text-code-xs text-on-surface-variant">{inProgressCount.toLocaleString()} {lang === 'ar' ? 'قيد التنفيذ' : 'In-Progress'}</span>
          </div>
        </div>
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container p-space-lg shadow-sm">
          <div className="absolute -end-4 -bottom-4 h-20 w-20 rounded-full bg-secondary/5 blur-xl transition-all group-hover:bg-secondary/10"></div>
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="font-label-sm text-label-sm uppercase tracking-wider">{lang === 'ar' ? 'إجمالي المصروف (30 يوم)' : 'Total Spent (30D)'}</span>
            <Landmark className="text-secondary h-[20px] w-[20px] shrink-0" />
          </div>
          <div className="mt-space-md flex items-baseline justify-between">
            <span className="font-headline-lg text-headline-lg font-bold text-on-surface">{money(spent30d)}</span>
            <span className="font-code-xs text-code-xs text-on-surface-variant">{t('common.currency')}</span>
          </div>
        </div>
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container p-space-lg shadow-sm">
          <div className="absolute -end-4 -bottom-4 h-20 w-20 rounded-full bg-primary-container/10 blur-xl transition-all group-hover:bg-primary-container/20"></div>
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="font-label-sm text-label-sm uppercase tracking-wider">{lang === 'ar' ? 'معدل الإنجاز' : 'Fulfillment Rate'}</span>
            <BadgeCheck className="text-primary h-[20px] w-[20px] shrink-0" />
          </div>
          <div className="mt-space-md flex items-baseline justify-between">
            <span className="font-headline-lg text-headline-lg font-bold text-on-surface">{fulfillmentRate.toFixed(1)}%</span>
            <span className="font-code-xs text-code-xs text-tertiary">{refundRate.toFixed(1)}% {lang === 'ar' ? 'مسترد' : 'refund'}</span>
          </div>
        </div>
      </div>

      {/* Status tabs — wired to the existing status state */}
      <div className="scrollbar-none flex items-center gap-space-xs overflow-x-auto pb-space-xs">
        {STATUS_TABS.map(tab => {
          const active = status === tab.value;
          const count = tab.value === 'all' ? totalOrders : countBy(tab.value);
          return (
            <button key={tab.value} onClick={() => setStatus(tab.value)} type="button"
              className={active
                ? 'flex items-center gap-space-xs whitespace-nowrap rounded-lg bg-primary-container px-space-md py-space-xs font-label-lg text-label-lg text-on-primary-container shadow-sm'
                : 'flex items-center gap-space-xs whitespace-nowrap rounded-lg bg-surface-container px-space-md py-space-xs font-label-lg text-label-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface'}>
              <span>{tabLabel(tab)}</span>
              <span className={active
                ? 'rounded bg-on-primary-container/20 px-space-xs py-space-2xs font-code-xs text-code-xs font-semibold'
                : `rounded bg-surface-container-highest px-space-xs py-space-2xs font-code-xs text-code-xs ${tab.tone}`}>{count.toLocaleString()}</span>
            </button>
          );
        })}
      </div>

      {/* Orders table */}
      <div className="w-full overflow-hidden rounded-xl bg-surface-container shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-start font-body-sm text-body-sm">
            <thead>
              <tr className="bg-surface-container-lowest font-code-xs text-code-xs uppercase tracking-wider text-on-surface-variant">
                <th className="w-28 px-space-md py-space-md text-start">{lang === 'ar' ? 'رقم الطلب' : 'Order ID'}</th>
                <th className="w-36 px-space-md py-space-md text-start">{lang === 'ar' ? 'الإنشاء' : 'Created'}</th>
                <th className="w-48 px-space-md py-space-md text-start">{lang === 'ar' ? 'الرابط المستهدف' : 'Target URL'}</th>
                <th className="px-space-md py-space-md text-start">{lang === 'ar' ? 'تفاصيل الخدمة' : 'Service Details'}</th>
                <th className="w-32 px-space-md py-space-md text-start">{lang === 'ar' ? 'التكلفة / السعر' : 'Charge / Rate'}</th>
                <th className="w-28 px-space-md py-space-md text-start">{lang === 'ar' ? 'الكمية' : 'Quantity'}</th>
                <th className="w-36 px-space-md py-space-md text-start">{lang === 'ar' ? 'التقدم' : 'Progress'}</th>
                <th className="w-32 px-space-md py-space-md text-center">{t('common.status')}</th>
                <th className="w-36 px-space-md py-space-md text-end">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="text-on-surface">
              {isLoading ? <tr><td colSpan={9} className="p-space-xl text-center text-on-surface-variant">{t('common.loading')}</td></tr> : rows.length ? rows.map((o: any) => {
                const canRefill = o.service?.refillable && REFILLABLE_STATUSES.includes(o.status);
                const canCancel = o.service?.cancelable && CANCELABLE_STATUSES.includes(o.status) && !o.cancelRequested;
                const canRefresh = !!o.providerOrderId && ACTIVE_STATUSES.includes(o.status);
                const refunded = num(o.refundedAmount);
                const created = o.createdAt ? new Date(o.createdAt) : null;
                const quantity = num(o.quantity);
                const remains = num(o.remains);
                const pct = quantity > 0 ? Math.min(100, Math.max(0, ((quantity - remains) / quantity) * 100)) : 0;
                const tone = PROGRESS_TONE[o.status] || PROGRESS_FALLBACK;
                return (
                  <tr key={o.id} className="h-11 transition-colors hover:bg-surface-container-high/40">
                    <td className="px-space-md py-space-md font-code-sm text-code-sm">
                      <div className="flex items-center gap-space-xs">
                        <span className="font-bold text-primary">#{String(o.id).slice(0, 8)}</span>
                        <button className="flex h-6 w-6 items-center justify-center rounded bg-surface-container-high text-outline transition-colors hover:bg-surface-bright hover:text-on-surface" onClick={() => copyId(o.id)} title={t('common.copy')} type="button">
                          <Copy className="h-[14px] w-[14px] shrink-0" />
                        </button>
                      </div>
                    </td>
                    <td className="px-space-md py-space-md">
                      <div className="flex flex-col">
                        <span className="font-body-sm text-body-sm text-on-surface">{created ? created.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '-'}</span>
                        <span className="font-code-xs text-code-xs text-on-surface-variant">{created ? created.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour12: false }) : ''}</span>
                      </div>
                    </td>
                    <td className="px-space-md py-space-md">
                      <div className="group flex items-center gap-space-xs">
                        <span className="max-w-[160px] truncate font-code-xs text-code-xs text-tertiary" title={o.link}>{o.link}</span>
                        <a className="text-outline transition-colors hover:text-tertiary" href={o.link} rel="noreferrer" target="_blank">
                          <ExternalLink className="h-[16px] w-[16px] shrink-0" />
                        </a>
                      </div>
                    </td>
                    <td className="px-space-md py-space-md">
                      <div className="flex max-w-sm flex-col gap-space-2xs">
                        <div className="flex items-center gap-space-xs">
                          {o.service?.id && <span className="rounded bg-surface-container-high px-space-xs py-space-2xs font-code-xs text-code-xs font-semibold text-secondary">ID {String(o.service.id).slice(0, 8)}</span>}
                          <span className="truncate font-label-sm text-label-sm font-semibold text-on-surface">{o.service?.name}</span>
                        </div>
                        {o.cancelRequested ? (
                          <div className="flex items-center gap-space-xs font-code-xs text-code-xs text-error">
                            <Info className="h-[14px] w-[14px] shrink-0" />
                            <span>{lang === 'ar' ? 'تم طلب الإلغاء' : 'Cancellation requested'}</span>
                          </div>
                        ) : o.status === 'Partial' && refunded > 0 ? (
                          <div className="flex items-center gap-space-xs font-code-xs text-code-xs text-secondary">
                            <Banknote className="h-[14px] w-[14px] shrink-0" />
                            <span>{lang === 'ar' ? `المسترد: ${money(refunded)} إلى الرصيد` : `Refunded: ${money(refunded)} to balance`}</span>
                          </div>
                        ) : o.providerOrderId ? (
                          <div className="flex items-center gap-space-xs font-body-sm text-body-sm text-outline">
                            <Zap className="text-primary h-[14px] w-[14px] shrink-0" />
                            <span className="font-code-xs text-code-xs text-on-surface-variant">{lang === 'ar' ? 'مرجع المزود: ' : 'Provider ref: '}{o.providerOrderId}</span>
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-space-md py-space-md">
                      <div className="flex flex-col font-code-sm text-code-sm">
                        <span className={o.status === 'Canceled' || o.status === 'Refunded' ? 'font-bold text-outline line-through' : 'font-bold text-on-surface'}>{money(o.charge)}</span>
                        <span className="font-code-xs text-code-xs text-on-surface-variant">{quantity > 0 ? `${money(num(o.charge) / quantity * 1000)} / 1k` : '-'}</span>
                      </div>
                    </td>
                    <td className="px-space-md py-space-md font-code-sm text-code-sm font-semibold">
                      <span className={o.status === 'Canceled' || o.status === 'Refunded' ? 'text-outline' : undefined}>{quantity.toLocaleString()}</span>
                    </td>
                    <td className="px-space-md py-space-md font-code-xs text-code-xs">
                      <div className="flex flex-col gap-space-2xs">
                        <div className="flex justify-between text-on-surface-variant">
                          <span>{lang === 'ar' ? 'البداية: ' : 'Start: '}{Number.isFinite(Number(o.startCount)) ? num(o.startCount).toLocaleString() : '-'}</span>
                          <span className={`font-semibold ${tone.text}`}>{lang === 'ar' ? 'المتبقي: ' : 'Remains: '}{Number.isFinite(Number(o.remains)) ? remains.toLocaleString() : '-'}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                          <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-space-md py-space-md text-center">
                      <span className={`status-badge ${STATUS_BADGE[o.status] || 's-default'}`}>{statusLabel(o.status)}</span>
                    </td>
                    <td className="px-space-md py-space-md text-end">
                      <div className="flex items-center justify-end gap-space-xs">
                        {canRefresh && <button disabled={refreshOrder.isPending} onClick={() => refreshOrder.mutate(o.id)} className="flex items-center gap-space-2xs rounded bg-surface-container-high px-space-xs py-1 font-label-sm text-label-sm text-on-surface-variant transition-colors hover:bg-surface-bright disabled:opacity-50" title="Refresh order status" type="button">
                          <RefreshCw className="h-[14px] w-[14px] shrink-0" />
                          <span>{lang === 'ar' ? 'تحديث الحالة' : 'Update status'}</span>
                        </button>}
                        {canRefill && <button disabled={refill.isPending} onClick={() => refill.mutate(o.id)} className="flex items-center gap-space-2xs rounded bg-surface-container-high px-space-xs py-1 font-label-sm text-label-sm text-tertiary transition-colors hover:bg-surface-bright disabled:opacity-50" title="Request refill" type="button">
                          <RefreshCw className="h-[14px] w-[14px] shrink-0" />
                          <span>{lang === 'ar' ? 'إعادة تعبئة' : 'Refill'}</span>
                        </button>}
                        {canCancel && <button disabled={cancel.isPending} onClick={() => confirm('Cancel this order and refund it to your wallet?') && cancel.mutate(o.id)} className="flex items-center gap-space-2xs rounded bg-error-container/20 px-space-xs py-1 font-label-sm text-label-sm text-error transition-colors hover:bg-error-container/40 disabled:opacity-50" title="Cancel order" type="button">
                          <X className="h-[14px] w-[14px] shrink-0" />
                          <span>{t('common.cancel')}</span>
                        </button>}
                        {!canRefill && !canCancel && <span className="text-outline">-</span>}
                      </div>
                    </td>
                  </tr>
                );
              }) : <tr><td colSpan={9} className="p-space-xl text-center text-on-surface-variant">No matching orders found.</td></tr>}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
