import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { notify } from '../../lib/notify';
import { AlertCircle, ArrowRight, Bell, CheckCircle2, Clock, Copy, Headphones, LayoutGrid, ListPlus, Loader2, RefreshCw, RotateCcw, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../lib/i18n';

const money = (v:any) => `$${Number(v || 0).toFixed(2)}`;
const num = (v:any) => Number(v || 0);
const shortId = (id:any) => String(id || '').slice(0, 8);
const readError = async (res: Response, fallback: string) => { const b = await res.json().catch(() => ({})); return b?.error || b?.message || fallback; };
const statusSlug:any = { Pending:'pending', Processing:'processing', 'In Progress':'inprogress', Completed:'completed', Partial:'partial', Canceled:'canceled', Refunded:'refunded' };
const REFILLABLE_STATUSES = ['Completed', 'Partial'];

export default function ClientDashboard() {
  const { user, dbUser } = useAuth();
  const { t, lang } = useTranslation();
  const qc = useQueryClient();
  const L = (en: string, ar: string) => (lang === 'ar' ? ar : en);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['client-dashboard'],
    queryFn: async () => { const token = await user?.getIdToken(); const res = await apiFetch('/api/client/dashboard', user, { headers:{Authorization: `Bearer ${token}`} }); if(!res.ok) throw new Error('dashboard'); return res.json(); },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const refill = useMutation({
    mutationFn: async (id: string) => { const tok = await user!.getIdToken(); const r = await apiFetch(`/api/client/orders/${id}/refill`, user, { method: 'POST', headers: { Authorization: `Bearer ${tok}` } }); if (!r.ok) throw new Error(await readError(r, 'Refill request failed')); return r.json(); },
    onSuccess: () => { notify.success(L('Refill request submitted', 'تم إرسال طلب الإعادة')); qc.invalidateQueries({ queryKey: ['client-dashboard'] }); },
    onError: (e:any) => notify.error(e, 'REFILL_FAILED')
  });

  if (isLoading) return <div className="flex items-center gap-space-sm p-space-lg text-sm text-on-surface-variant"><RefreshCw className="h-4 w-4 animate-spin" /> {t('dashboard.loading')}</div>;
  if (isError) return <div className="flex flex-wrap items-center justify-between gap-space-md rounded-xl border border-outline-variant bg-error-container p-space-lg text-on-error-container">
    <span className="flex items-center gap-space-sm text-sm"><AlertCircle className="h-5 w-5 shrink-0" />{t('dashboard.error')}</span>
    <div className="flex flex-wrap items-center gap-space-sm">
      <span className="text-sm">{L('Check your connection, then try again.', 'تحقق من اتصالك ثم حاول مرة أخرى.')}</span>
      <button onClick={()=>refetch()} className="inline-flex h-9 items-center gap-space-xs rounded-lg border border-outline-variant bg-surface-container px-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high">{t('common.retry') || 'Retry'}</button>
    </div>
  </div>;

  const displayName = dbUser?.name || dbUser?.email?.split('@')[0] || t('common.user');
  const s = data?.ordersByStatus || {};
  const activeCount = num(s.pending) + num(s.processing);
  const totalOrders = num(data?.totalOrders);
  const balance = data?.balance ?? dbUser?.balance;
  const recentOrders: any[] = data?.recentOrders || [];
  const openTickets = num(data?.openTickets);
  const unreadNotifications = num(data?.unreadNotifications);
  const [greetPrefix, greetSuffix] = t('dashboard.welcome', { name: '__NAME__' }).split('__NAME__');

  const statCard = 'flex flex-col justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container p-5';
  const statLabel = 'text-sm font-medium text-on-surface-variant';
  const statValue = 'font-display text-headline-lg font-semibold tabular-nums text-on-surface';
  const statFoot = 'text-sm text-on-surface-variant';
  const panel = 'rounded-xl border border-outline-variant bg-surface-container p-5';
  const panelTitle = 'font-display text-headline-sm text-on-surface';
  const linkRow = 'flex items-center justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-3 text-sm transition-colors hover:bg-surface-container-high';

  return <div className="flex flex-col gap-gutter-lg">
    {/* ── Greeting + the two actions a customer actually needs ───────────── */}
    <div className="flex flex-col gap-space-md sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-headline-lg font-semibold tracking-tight text-on-surface">
          {greetPrefix}<span className="text-primary">{displayName}</span>{greetSuffix}
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">{t('dashboard.subtitle')}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/dashboard/new-order" className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary-container px-5 text-sm font-semibold text-on-primary-container transition-colors hover:bg-primary">
          <ListPlus className="h-4 w-4 shrink-0" />
          {t('dashboard.newOrder')}
        </Link>
        <Link to="/dashboard/add-funds" className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface-container px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high">
          <Wallet className="h-4 w-4 shrink-0" />
          {t('dashboard.addFunds')}
        </Link>
        <button type="button" onClick={()=>refetch()} title={t('common.refresh')} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface-container px-4 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface">
          <RefreshCw className={`h-4 w-4 shrink-0 ${isFetching?'animate-spin':''}`} />
          <span className="hidden sm:inline">{t('common.refresh')}</span>
        </button>
      </div>
    </div>

    {/* ── Four plain numbers ─────────────────────────────────────────────── */}
    <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 xl:grid-cols-4">
      {/* Balance */}
      <div className={statCard}>
        <div className="flex items-center justify-between gap-2">
          <span className={statLabel}>{t('dashboard.balance')}</span>
          <Wallet className="h-4 w-4 shrink-0 text-outline" />
        </div>
        <span className={statValue}>{money(balance)}</span>
        <Link to="/dashboard/add-funds" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          {t('dashboard.addFunds')} <ArrowRight className="h-4 w-4 shrink-0 rtl:rotate-180" />
        </Link>
      </div>

      {/* Active orders */}
      <div className={statCard}>
        <div className="flex items-center justify-between gap-2">
          <span className={statLabel}>{L('Active orders', 'طلبات جارية')}</span>
          <Clock className="h-4 w-4 shrink-0 text-outline" />
        </div>
        <span className={statValue}>{activeCount.toLocaleString()}</span>
        <span className={statFoot}>
          {activeCount > 0
            ? <>{num(s.processing).toLocaleString()} {t('status.processing')} · {num(s.pending).toLocaleString()} {t('status.pending')}</>
            : L('No orders are running right now.', 'لا توجد طلبات جارية حالياً.')}
        </span>
      </div>

      {/* Completed */}
      <div className={statCard}>
        <div className="flex items-center justify-between gap-2">
          <span className={statLabel}>{t('dashboard.completedOrders')}</span>
          <CheckCircle2 className="h-4 w-4 shrink-0 text-outline" />
        </div>
        <span className={statValue}>{num(s.completed).toLocaleString()}</span>
        <span className={statFoot}>
          {totalOrders > 0
            ? `${num(s.partial).toLocaleString()} ${t('status.partial')} · ${L('of', 'من')} ${totalOrders.toLocaleString()} ${L('orders', 'طلب')}`
            : t('dashboard.noOrders')}
        </span>
      </div>

      {/* Total spent */}
      <div className={statCard}>
        <div className="flex items-center justify-between gap-2">
          <span className={statLabel}>{t('dashboard.totalSpent')}</span>
          <LayoutGrid className="h-4 w-4 shrink-0 text-outline" />
        </div>
        <span className={statValue}>{money(data?.totalSpent)}</span>
        <span className={statFoot}>{t('dashboard.totalFunded')}: <span className="font-mono tabular-nums text-on-surface">{money(data?.totalFunded)}</span></span>
      </div>
    </div>

    {/* ── Orders + account ──────────────────────────────────────────────── */}
    <div className="grid grid-cols-1 items-start gap-gutter-lg lg:grid-cols-3">
      {/* Recent orders */}
      <div className={`${panel} lg:col-span-2`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className={panelTitle}>{t('dashboard.recentOrders')}</h2>
            <span className="text-sm text-on-surface-variant">({recentOrders.length})</span>
          </div>
          <Link to="/dashboard/orders" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-surface-container-high px-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-bright">
            {t('dashboard.viewAllOrders')}
            <ArrowRight className="h-4 w-4 shrink-0 rtl:rotate-180" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-outline">
                <th className="px-3 py-2 text-start font-medium">{t('orders.service')}</th>
                <th className="px-3 py-2 text-start font-medium">{t('orders.quantity')}</th>
                <th className="px-3 py-2 text-start font-medium">{t('orders.charge')}</th>
                <th className="px-3 py-2 text-start font-medium">{t('common.status')}</th>
                <th className="px-3 py-2 text-start font-medium">{t('common.date')}</th>
                <th className="px-3 py-2 text-end font-medium">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0
                ? <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-on-surface-variant">
                    {t('dashboard.noOrders')} <Link className="font-semibold text-primary hover:underline" to="/dashboard/new-order">{t('nav.newOrder')}</Link>
                  </td>
                </tr>
                : recentOrders.map((o:any) => <tr key={o.id} className="border-t border-outline-variant transition-colors hover:bg-surface-container-high">
                  <td className="px-3 py-3">
                    <div className="flex min-w-0 flex-col">
                      <span className="max-w-xs truncate font-medium text-on-surface">{o.serviceName}</span>
                      <span className="font-mono text-xs text-on-surface-variant">#{shortId(o.id)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-mono text-sm tabular-nums text-on-surface">{num(o.quantity).toLocaleString()}</td>
                  <td className="px-3 py-3 font-mono text-sm font-semibold tabular-nums text-on-surface">{money(o.charge)}</td>
                  <td className="px-3 py-3"><span className={`status-badge s-${statusSlug[o.status] || 'default'}`}>{o.status}</span></td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-on-surface-variant">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="px-3 py-3 text-end">
                    <div className="inline-flex items-center justify-end gap-2">
                      <button type="button" onClick={() => { navigator.clipboard?.writeText(`#${shortId(o.id)}`); notify.success(t('common.copied')); }} title={t('common.copy')} aria-label={t('common.copy')} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-container-high text-on-surface-variant transition-colors hover:text-on-surface">
                        <Copy className="h-4 w-4 shrink-0" />
                      </button>
                      {REFILLABLE_STATUSES.includes(o.status) && <button type="button" onClick={() => refill.mutate(o.id)} disabled={refill.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-surface-container-high px-3 text-sm font-medium text-tertiary transition-colors hover:bg-surface-bright disabled:opacity-50">
                        {refill.isPending ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <RotateCcw className="h-4 w-4 shrink-0" />}
                        {L('Refill', 'إعادة')}
                      </button>}
                    </div>
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-on-surface-variant">{L('Refill is available for completed and partially completed orders.', 'إعادة التعبئة متاحة للطلبات المكتملة والمكتملة جزئياً.')}</p>
      </div>

      {/* Account facts + shortcuts */}
      <div className={`${panel} flex flex-col gap-4`}>
        <h2 className={panelTitle}>{L('Your account', 'حسابك')}</h2>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-3 text-sm">
            <span className="inline-flex items-center gap-2 text-on-surface-variant"><LayoutGrid className="h-4 w-4 shrink-0" /> {t('dashboard.totalOrders')}</span>
            <span className="font-mono text-sm font-semibold tabular-nums text-on-surface">{totalOrders.toLocaleString()}</span>
          </div>
          <Link to="/dashboard/tickets" className={linkRow}>
            <span className="inline-flex items-center gap-2 text-on-surface-variant"><Headphones className="h-4 w-4 shrink-0" /> {t('nav.tickets')}</span>
            <span className={`font-mono text-sm font-semibold tabular-nums ${openTickets > 0 ? 'text-primary' : 'text-on-surface'}`}>{openTickets.toLocaleString()}</span>
          </Link>
          <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-3 text-sm">
            <span className="inline-flex items-center gap-2 text-on-surface-variant"><Bell className="h-4 w-4 shrink-0" /> {t('notifications.title')}</span>
            <span className={`font-mono text-sm font-semibold tabular-nums ${unreadNotifications > 0 ? 'text-primary' : 'text-on-surface'}`}>{unreadNotifications.toLocaleString()}</span>
          </div>
          <p className="text-xs text-on-surface-variant">
            {unreadNotifications > 0
              ? L('You have unread notifications — open the bell in the top bar.', 'لديك إشعارات غير مقروءة — افتح الجرس في الشريط العلوي.')
              : L('You are all caught up. New notifications appear under the bell in the top bar.', 'لا جديد لديك. تظهر الإشعارات الجديدة في أيقونة الجرس بالشريط العلوي.')}
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-outline-variant pt-4">
          <Link to="/dashboard/add-funds" className={linkRow}>
            <span className="inline-flex items-center gap-2 text-on-surface"><Wallet className="h-4 w-4 shrink-0 text-on-surface-variant" /> {t('nav.addFunds')}</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-outline rtl:rotate-180" />
          </Link>
          <Link to="/dashboard/services" className={linkRow}>
            <span className="inline-flex items-center gap-2 text-on-surface"><LayoutGrid className="h-4 w-4 shrink-0 text-on-surface-variant" /> {t('nav.services')}</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-outline rtl:rotate-180" />
          </Link>
          <Link to="/dashboard/tickets" className={linkRow}>
            <span className="inline-flex items-center gap-2 text-on-surface"><Headphones className="h-4 w-4 shrink-0 text-on-surface-variant" /> {t('nav.tickets')}</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-outline rtl:rotate-180" />
          </Link>
          <Link to="/dashboard/orders" className={linkRow}>
            <span className="inline-flex items-center gap-2 text-on-surface"><CheckCircle2 className="h-4 w-4 shrink-0 text-on-surface-variant" /> {t('nav.orderHistory')}</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-outline rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  </div>;
}
