import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { notify } from '../../lib/notify';
import { RefreshCw, AlertCircle } from 'lucide-react';
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

  const [categoryId, setCategoryId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['client-dashboard'],
    queryFn: async () => { const token = await user?.getIdToken(); const res = await apiFetch('/api/client/dashboard', user, { headers:{Authorization: `Bearer ${token}`} }); if(!res.ok) throw new Error('dashboard'); return res.json(); },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const servicesQ = useQuery({
    queryKey: ['client-services'],
    enabled: !!user,
    queryFn: async () => {
      const tok = await user!.getIdToken();
      const r = await apiFetch('/api/client/services', user, { headers: { Authorization: `Bearer ${tok}` } });
      if (!r.ok) throw new Error(await readError(r, 'Failed to load services'));
      return r.json();
    }
  });
  const services: any[] = servicesQ.data || [];
  const categories = useMemo(() => Array.from(new Map(services.map((s:any) => [s.category?.id, s.category])).values()).filter(Boolean).sort((a:any, b:any) => a.sortOrder - b.sortOrder), [services]);
  const selectedService = services.find((s:any) => s.id === serviceId);
  const visibleServices = useMemo(() => services.filter((s:any) => !categoryId || s.category?.id === categoryId), [services, categoryId]);
  const singleUnit = !!selectedService && num(selectedService.minQuantity) === 1 && num(selectedService.maxQuantity) === 1;
  const estCharge = selectedService && quantity ? (singleUnit ? num(selectedService.pricePer1k) * num(quantity) : num(selectedService.pricePer1k) * num(quantity) / 1000) : 0;
  const validQty = !!selectedService && (singleUnit ? quantity === 1 : typeof quantity === 'number' && quantity >= num(selectedService.minQuantity) && quantity <= num(selectedService.maxQuantity));

  const chooseService = (id: string) => {
    setServiceId(id);
    const picked = services.find((s:any) => s.id === id);
    setQuantity(!picked ? '' : num(picked.minQuantity) === 1 && num(picked.maxQuantity) === 1 ? 1 : num(picked.minQuantity));
  };

  const order = useMutation({
    mutationFn: async () => {
      if (!selectedService) throw new Error(t('newOrder.selectService'));
      if (!validQty) throw new Error(singleUnit ? L('This service accepts exactly 1 item.', 'هذه الخدمة تقبل عنصراً واحداً فقط.') : t('newOrder.quantityRange', { min: selectedService.minQuantity, max: selectedService.maxQuantity }));
      if (!link.trim()) throw new Error(L('Enter the target link first.', 'أدخل الرابط المستهدف أولاً.'));
      if (num(dbUser?.balance) + 0.0000001 < estCharge) throw new Error(t('newOrder.insufficientBalance'));
      const tok = await user!.getIdToken();
      const r = await apiFetch('/api/client/orders', user, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }, body: JSON.stringify({ serviceId, link, quantity: Number(quantity) }) });
      if (!r.ok) throw new Error(await readError(r, 'Failed to place order'));
      return r.json();
    },
    onSuccess: () => { notify.success(t('newOrder.orderPlaced')); setLink(''); setQuantity(selectedService && !singleUnit ? num(selectedService.minQuantity) : ''); qc.invalidateQueries({ queryKey: ['client-dashboard'] }); qc.invalidateQueries({ queryKey: ['client-orders'] }); qc.invalidateQueries({ queryKey: ['client-me'] }); },
    onError: (e:any) => notify.error(e.message || e.code || 'ORDER_CREATION_FAILED', t('newOrder.orderFailed'))
  });

  const refill = useMutation({
    mutationFn: async (id: string) => { const tok = await user!.getIdToken(); const r = await apiFetch(`/api/client/orders/${id}/refill`, user, { method: 'POST', headers: { Authorization: `Bearer ${tok}` } }); if (!r.ok) throw new Error(await readError(r, 'Refill request failed')); return r.json(); },
    onSuccess: () => { notify.success(L('Refill request submitted', 'تم إرسال طلب الإعادة')); qc.invalidateQueries({ queryKey: ['client-dashboard'] }); },
    onError: (e:any) => notify.error(e.message || 'REFILL_FAILED')
  });

  if (isLoading) return <div className="flex items-center gap-space-sm p-space-lg font-body-md text-on-surface-variant"><RefreshCw className="h-4 w-4 animate-spin" /> {t('dashboard.loading')}</div>;
  if (isError) return <div className="flex flex-wrap items-center justify-between gap-space-md rounded-xl border border-outline-variant bg-error-container p-space-lg text-on-error-container"><span className="flex items-center gap-space-sm font-body-md"><AlertCircle className="h-5 w-5" />{t('dashboard.error')}</span><button onClick={()=>refetch()} className="inline-flex items-center gap-space-xs rounded-xl border border-outline-variant bg-surface-container px-space-md py-space-sm font-label-lg text-on-surface transition-colors hover:bg-surface-container-high">{t('common.retry') || 'Retry'}</button></div>;

  const displayName = dbUser?.name || dbUser?.email?.split('@')[0] || t('common.user');
  const s = data?.ordersByStatus || {};
  const activeCount = num(s.pending) + num(s.processing);
  const totalOrders = num(data?.totalOrders);
  const balance = data?.balance ?? dbUser?.balance;
  const deliveryRate = totalOrders > 0 ? ((num(s.completed) / totalOrders) * 100).toFixed(1) : null;
  const [greetPrefix, greetSuffix] = t('dashboard.welcome', { name: '__NAME__' }).split('__NAME__');
  const refillChip = selectedService ? (selectedService.refillable ? L('Auto-Refill: Guaranteed', 'إعادة تعبئة تلقائية: مضمونة') : L('Auto-Refill: Not available', 'إعادة تعبئة تلقائية: غير متاحة')) : '';
  const statusBars = [
    { key:'processing', value:num(s.processing), cls:'bg-tertiary' },
    { key:'pending', value:num(s.pending), cls:'bg-tertiary/70' },
    { key:'completed', value:num(s.completed), cls:'bg-primary' },
    { key:'partial', value:num(s.partial), cls:'bg-secondary' },
    { key:'canceled', value:num(s.canceled), cls:'bg-surface-container-highest' },
    { key:'refunded', value:num(s.refunded), cls:'bg-surface-container-highest' }
  ];
  const barMax = Math.max(1, ...statusBars.map(b => b.value));

  return <div className="flex flex-col gap-gutter-lg">
    {/* Operational Greeting & System Pulse Banner */}
    <div className="radiance relative overflow-hidden rounded-xl bg-surface-container-low p-space-lg shadow-panel md:p-space-xl">
      <div className="relative flex flex-col gap-space-md md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col space-y-space-2xs">
          <div className="flex flex-wrap items-center gap-space-sm">
            <span className="font-code-xs text-code-xs px-space-xs py-space-2xs rounded bg-surface-container text-tertiary uppercase tracking-wider font-semibold">{L('Terminal Active', 'الواجهة نشطة')}</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container font-label-sm text-label-sm text-tertiary">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
              {L('All API Nodes Operational', 'جميع عُقد الربط تعمل')}
            </span>
          </div>
          <h1 className="font-display text-headline-lg font-semibold tracking-tight text-on-surface">
            {greetPrefix}<span className="text-primary">{displayName}</span>{greetSuffix}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">{t('dashboard.overview')}</p>
        </div>
        <div className="flex items-center gap-space-sm self-start md:self-auto">
          <div className="flex items-center gap-space-md bg-surface-container px-space-md py-space-sm rounded-xl">
            <div className="flex flex-col text-end">
              <span className="font-code-xs text-code-xs text-on-surface-variant uppercase">{t('dashboard.totalOrders')}</span>
              <span className="font-code-sm text-code-sm text-tertiary font-semibold">{totalOrders.toLocaleString()}</span>
            </div>
            <span className="material-symbols-outlined text-tertiary text-2xl">speed</span>
          </div>
          <Link to="/dashboard/new-order" className="flex items-center gap-space-xs rounded-xl bg-primary px-space-md py-space-sm font-label-lg text-label-lg font-semibold text-on-primary transition-all hover:brightness-110">
            <span className="material-symbols-outlined text-base">add_task</span>
            <span>{L('Deploy Order', 'أطلق طلباً')}</span>
          </Link>
          <button onClick={()=>refetch()} title={t('common.refresh')} className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface">
            <RefreshCw className={`h-4 w-4 ${isFetching?'animate-spin':''}`}/>
          </button>
        </div>
      </div>
    </div>

    {/* 4 High-Density Stat Metric Cards */}
    <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 xl:grid-cols-4">
      {/* Liquid Balance */}
      <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container p-space-lg shadow-bevel transition-shadow hover:shadow-float">
        <div className="flex items-center justify-between">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{L('Liquid Balance', 'الرصيد السائل')}</span>
          <span className="rounded bg-surface-container-high px-space-xs py-space-2xs font-mono text-code-xs font-medium text-tertiary">{t('common.currency')}</span>
        </div>
        <div className="my-space-sm">
          <span className="font-display text-headline-xl font-bold tracking-tight text-on-surface">{money(balance)}</span>
          <span className="mt-space-2xs block font-mono text-code-xs text-on-surface-variant">{t('dashboard.balance')}</span>
        </div>
        <div className="flex items-center justify-between pt-space-xs">
          <svg className="h-6 w-24 overflow-visible text-tertiary" fill="none" viewBox="0 0 100 24">
            <path d="M0 18 L15 15 L30 19 L48 10 L65 12 L82 4 L100 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path>
          </svg>
          <Link to="/dashboard/add-funds" className="flex items-center gap-1 rounded-lg bg-surface-container-high px-space-sm py-space-2xs font-label-md text-label-md font-semibold text-primary transition-colors hover:bg-surface-container-highest">
            <span className="material-symbols-outlined text-xs">add</span>
            {t('nav.addFunds')}
          </Link>
        </div>
      </div>

      {/* Active Queue */}
      <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container p-space-lg shadow-bevel transition-shadow hover:shadow-float">
        <div className="flex items-center justify-between">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{L('Active Queue', 'قائمة الانتظار النشطة')}</span>
          <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
        </div>
        <div className="my-space-sm">
          <span className="font-display text-headline-xl font-bold tracking-tight text-on-surface">{activeCount.toLocaleString()}</span>
          <div className="mt-space-2xs flex items-center gap-space-sm font-mono text-code-xs text-on-surface-variant">
            <span className="text-tertiary">{num(s.processing)} {t('status.processing')}</span>
            <span>•</span>
            <span className="text-secondary">{num(s.pending)} {t('status.pending')}</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-space-xs">
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
            <div className="h-full bg-tertiary" style={{ width: `${activeCount ? (num(s.processing) / activeCount) * 100 : 0}%` }}></div>
            <div className="h-full bg-secondary" style={{ width: `${activeCount ? (num(s.pending) / activeCount) * 100 : 0}%` }}></div>
          </div>
        </div>
      </div>

      {/* Lifetime Delivery */}
      <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container p-space-lg shadow-bevel transition-shadow hover:shadow-float">
        <div className="flex items-center justify-between">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{L('Lifetime Delivery', 'إجمالي التسليم')}</span>
          <span className="rounded bg-surface-container-high px-space-xs py-space-2xs font-mono text-code-xs text-primary">{deliveryRate ? `${deliveryRate}%` : '—'}</span>
        </div>
        <div className="my-space-sm">
          <span className="font-display text-headline-xl font-bold tracking-tight text-on-surface">{num(s.completed).toLocaleString()}</span>
          <span className="mt-space-2xs block font-mono text-code-xs text-on-surface-variant">{t('dashboard.completedOrders')}</span>
        </div>
        <div className="flex items-center justify-between pt-space-xs">
          <svg className="h-6 w-24 overflow-visible text-primary" fill="none" viewBox="0 0 100 24">
            <path d="M0 22 L20 18 L40 14 L60 8 L80 9 L100 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path>
          </svg>
          <span className="font-mono text-code-xs font-medium text-primary">{num(s.partial)} {t('status.partial')}</span>
        </div>
      </div>

      {/* Account Spent */}
      <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container p-space-lg shadow-bevel transition-shadow hover:shadow-float">
        <div className="flex items-center justify-between">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{L('Account Spent', 'إجمالي المصروف')}</span>
          <span className="rounded bg-surface-container-high px-space-xs py-space-2xs font-mono text-code-xs text-secondary">{num(s.refunded)} {t('status.refunded')}</span>
        </div>
        <div className="my-space-sm">
          <span className="font-display text-headline-xl font-bold tracking-tight text-on-surface">{money(data?.totalSpent)}</span>
          <span className="mt-space-2xs block font-mono text-code-xs text-on-surface-variant">{t('dashboard.totalSpent')}</span>
        </div>
        <div className="flex items-center justify-between pt-space-xs">
          <span className="font-mono text-code-xs text-on-surface-variant">{t('dashboard.totalFunded')}: {money(data?.totalFunded)}</span>
        </div>
      </div>
    </div>

    {/* Main Asymmetric Workspace (2/3 Left, 1/3 Right) */}
    <div className="grid grid-cols-1 items-start gap-gutter-lg lg:grid-cols-12">
      {/* LEFT PANE */}
      <div className="space-y-gutter-lg lg:col-span-8">
        {/* Quick Order Execution Box */}
        <div className="rounded-xl bg-surface-container p-space-lg shadow-panel md:p-space-xl">
          <div className="mb-space-md flex items-center justify-between pb-space-md">
            <div className="flex items-center gap-space-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-container font-bold text-on-primary-container">
                <span className="material-symbols-outlined text-lg">bolt</span>
              </span>
              <div>
                <h2 className="font-display text-headline-md font-semibold text-on-surface">{L('Quick Order Engine', 'محرك الطلب السريع')}</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{L('Instant route to direct SMM provider API pipelines', 'مسار فوري إلى واجهات مزوّدي خدمات السوشيال مباشرة')}</p>
              </div>
            </div>
            {refillChip && <div className="flex items-center gap-space-xs rounded-lg bg-surface-container-high px-space-sm py-space-2xs font-mono text-code-xs text-tertiary">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
              {refillChip}
            </div>}
          </div>
          <form className="space-y-space-md" onSubmit={e => { e.preventDefault(); order.mutate(); }}>
            {/* Category Selector Tabs */}
            <div>
              <label className="mb-space-xs block font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">{L('Category', 'القسم')}</label>
              <div className="grid grid-cols-2 gap-space-xs sm:grid-cols-4">
                {categories.map((c:any) => <button key={c.id} type="button" onClick={() => { setCategoryId(categoryId === c.id ? '' : c.id); setServiceId(''); setQuantity(''); }} className={`flex items-center justify-center gap-space-xs rounded-lg px-space-sm py-space-sm font-label-md text-label-md transition-all ${categoryId === c.id ? 'bg-primary-container text-on-primary-container shadow-bevel' : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'}`}>
                  <span className="truncate">{c.name}</span>
                </button>)}
                {categories.length === 0 && <span className="font-body-sm text-body-sm text-on-surface-variant">{servicesQ.isLoading ? t('common.loading') : t('common.noResults')}</span>}
              </div>
            </div>
            {/* Service Selection */}
            <div>
              <div className="mb-space-2xs flex items-center justify-between">
                <label className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">{L('Service Node', 'عقدة الخدمة')}</label>
                {selectedService && <span className="font-mono text-code-xs text-tertiary">ID #{shortId(selectedService.id)} • {num(selectedService.pricePer1k).toFixed(4)} {t('common.currency')} / 1K</span>}
              </div>
              <div className="relative">
                <select value={serviceId} onChange={e => chooseService(e.target.value)} className="h-11 w-full cursor-pointer appearance-none rounded-lg bg-surface-container-low px-space-md pe-10 font-body-md text-body-md text-on-surface focus:outline-none">
                  <option value="">{t('newOrder.chooseService')}</option>
                  {visibleServices.map((sv:any) => <option key={sv.id} value={sv.id}>{`#${shortId(sv.id)} - ${sv.name} - $${num(sv.pricePer1k).toFixed(2)} / 1k`}</option>)}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-lg text-outline">expand_more</span>
              </div>
              {servicesQ.isError && <div className="mt-space-2xs flex items-center gap-space-sm font-mono text-code-xs text-on-surface-variant">
                <span>{t('orders.failedToLoad')}</span>
                <button type="button" onClick={() => servicesQ.refetch()} className="font-label-md text-label-md text-primary hover:underline">{t('common.retry')}</button>
              </div>}
            </div>
            {/* Destination Target & Quantity In Horizontal Lockup */}
            <div className="grid grid-cols-1 gap-space-md sm:grid-cols-12">
              <div className="sm:col-span-8">
                <label className="mb-space-2xs block font-label-md text-label-md uppercase tracking-wider text-on-surface-variant" htmlFor="target-link">{t('newOrder.targetLink')}</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute start-3 top-1/2 -translate-y-1/2 text-lg text-outline">link</span>
                  <input id="target-link" type="text" value={link} onChange={e => setLink(e.target.value)} placeholder={L('https://instagram.com/username or post link', 'https://instagram.com/username أو رابط المنشور')} className="h-11 w-full rounded-lg bg-surface-container-low ps-10 pe-space-md font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none" />
                </div>
              </div>
              <div className="sm:col-span-4">
                <label className="mb-space-2xs block font-label-md text-label-md uppercase tracking-wider text-on-surface-variant" htmlFor="order-qty">{t('newOrder.quantity')} ({t('newOrder.minimum')}: {selectedService ? num(selectedService.minQuantity).toLocaleString() : '—'})</label>
                <div className="relative">
                  <input id="order-qty" type="number" step={singleUnit ? 1 : 100} min={selectedService ? num(selectedService.minQuantity) : undefined} max={selectedService ? num(selectedService.maxQuantity) : undefined} value={quantity} onChange={e => setQuantity(e.target.value === '' ? '' : Number(e.target.value))} className="h-11 w-full rounded-lg bg-surface-container-low px-space-md font-mono text-code-sm text-on-surface focus:outline-none" />
                </div>
              </div>
            </div>
            {/* Execution Summary & Dispatch Action */}
            <div className="flex flex-col items-center justify-between gap-space-md rounded-xl bg-surface-container-low p-space-md pt-space-sm sm:flex-row">
              <div className="flex items-center gap-space-lg">
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{t('newOrder.estimatedCharge')}</span>
                  <div className="flex items-baseline gap-space-xs">
                    <span className="font-display text-headline-md font-bold text-tertiary">{money(estCharge)}</span>
                    <span className="font-mono text-code-xs text-on-surface-variant">{t('common.currency')}</span>
                  </div>
                </div>
                <div className="h-8 w-px bg-surface-container-highest"></div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{t('common.balance')}</span>
                  <span className="font-mono text-code-sm font-semibold text-on-surface">{money(balance)}</span>
                </div>
              </div>
              <button type="submit" disabled={order.isPending} className="flex h-11 items-center justify-center gap-space-xs rounded-lg bg-primary-container px-space-xl font-label-lg text-label-lg font-semibold text-on-primary-container shadow-bevel transition-all hover:bg-primary disabled:opacity-50">
                <span className="material-symbols-outlined text-base">bolt</span>
                <span>{order.isPending ? t('newOrder.placingOrder') : t('newOrder.placeOrder')}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Recent Orders Live Log */}
        <div className="rounded-xl bg-surface-container p-space-lg shadow-panel md:p-space-xl">
          <div className="mb-space-md flex flex-col justify-between gap-space-sm pb-space-md sm:flex-row sm:items-center">
            <div className="flex items-center gap-space-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-high text-tertiary">
                <span className="material-symbols-outlined text-lg">sync_alt</span>
              </span>
              <div>
                <h3 className="font-display text-headline-sm font-semibold text-on-surface">{L('Telemetry Order Stream', 'تدفق الطلبات اللحظي')}</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{t('dashboard.recentOrdersSubtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-space-xs">
              <Link to="/dashboard/orders" className="flex items-center gap-1 font-label-md text-label-md text-primary transition-colors hover:brightness-125">
                <span>{t('dashboard.viewAllOrders')}</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          </div>
          {/* Orders Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-start font-body-sm text-body-sm">
              <thead>
                <tr className="bg-surface-container-low font-mono text-code-xs uppercase tracking-wider text-on-surface-variant">
                  <th className="rounded-s-lg px-space-md py-space-sm text-start">{t('orders.id')}</th>
                  <th className="px-space-md py-space-sm text-start">{t('orders.service')}</th>
                  <th className="px-space-md py-space-sm text-start">{t('admin.orders.headers.remains')}</th>
                  <th className="px-space-md py-space-sm text-start">{t('orders.quantity')}</th>
                  <th className="px-space-md py-space-sm text-start">{t('orders.charge')}</th>
                  <th className="px-space-md py-space-sm text-start">{t('common.status')}</th>
                  <th className="rounded-e-lg px-space-md py-space-sm text-end">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="space-y-space-xs">
                {(data?.recentOrders || []).length === 0
                  ? <tr>
                    <td colSpan={7} className="px-space-md py-space-md text-center font-body-sm text-body-sm text-on-surface-variant">
                      {t('dashboard.noOrders')} <Link className="font-semibold text-primary hover:underline" to="/dashboard/new-order">{t('nav.newOrder')}</Link>
                    </td>
                  </tr>
                  : (data.recentOrders || []).map((o:any) => <tr key={o.id} className="group transition-colors hover:bg-surface-container-high">
                    <td className="px-space-md py-space-md font-mono text-code-sm font-medium text-tertiary">#{shortId(o.id)}</td>
                    <td className="px-space-md py-space-md">
                      <div className="flex flex-col">
                        <span className="max-w-xs truncate font-medium text-on-surface">{o.serviceName}</span>
                        <span className="font-mono text-code-xs text-on-surface-variant">Node {shortId(o.id)} • {new Date(o.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-space-md py-space-md font-mono text-code-xs text-on-surface-variant">{num(o.remains).toLocaleString()}</td>
                    <td className="px-space-md py-space-md font-mono text-code-sm tabular-nums text-on-surface">{num(o.quantity).toLocaleString()}</td>
                    <td className="px-space-md py-space-md font-mono text-code-sm font-semibold text-on-surface">{money(o.charge)}</td>
                    <td className="px-space-md py-space-md"><span className={`status-badge s-${statusSlug[o.status] || 'default'}`}>{o.status}</span></td>
                    <td className="px-space-md py-space-md text-end">
                      <div className="inline-flex items-center gap-1 opacity-80 transition-opacity group-hover:opacity-100">
                        <button onClick={() => { navigator.clipboard?.writeText(`#${shortId(o.id)}`); notify.success(t('common.copied')); }} title={t('common.copy')} className="rounded bg-surface-container-high p-1.5 text-on-surface-variant transition-colors hover:text-primary">
                          <span className="material-symbols-outlined text-sm">content_copy</span>
                        </button>
                        <Link to="/dashboard/orders" title={t('nav.orderHistory')} className="rounded bg-surface-container-high p-1.5 text-on-surface-variant transition-colors hover:text-tertiary">
                          <span className="material-symbols-outlined text-sm">visibility</span>
                        </Link>
                        {REFILLABLE_STATUSES.includes(o.status) && <button onClick={() => refill.mutate(o.id)} disabled={refill.isPending} title={t('status.refunded')} className="flex items-center gap-1 rounded bg-surface-container-high px-2 py-1 font-label-sm text-label-sm text-tertiary transition-colors hover:bg-surface-container-highest">
                          <span className="material-symbols-outlined text-xs">restart_alt</span>
                          {L('Refill', 'إعادة')}
                        </button>}
                      </div>
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RIGHT PANE */}
      <div className="space-y-gutter-lg lg:col-span-4">
        {/* Account Telemetry */}
        <div className="rounded-xl bg-surface-container p-space-lg shadow-panel">
          <div className="mb-space-sm flex items-center justify-between pb-space-sm">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-lg text-tertiary">dns</span>
              <h3 className="font-display text-headline-sm font-semibold text-on-surface">{L('Account Telemetry', 'بيانات الحساب')}</h3>
            </div>
            <span className="rounded bg-surface-container-high px-space-xs py-space-2xs font-mono text-code-xs text-tertiary">{L('Live Feed', 'بث مباشر')}</span>
          </div>
          <div className="space-y-space-md">
            <div className="flex items-center justify-between rounded-lg bg-surface-container-low p-space-md">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{t('dashboard.totalOrders')}</span>
                <span className="font-display text-headline-md font-bold text-on-surface">{totalOrders.toLocaleString()}</span>
              </div>
              <span className="material-symbols-outlined text-2xl text-primary">timer</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-container-low p-space-md">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{t('dashboard.totalFunded')}</span>
                <span className="font-display text-headline-md font-bold text-tertiary">{money(data?.totalFunded)}</span>
              </div>
              <span className="material-symbols-outlined text-2xl text-tertiary">cloud_done</span>
            </div>
            {/* Live Status Mini Graphic */}
            <div className="space-y-space-xs rounded-lg bg-surface-container-low p-space-md">
              <div className="flex items-center justify-between font-mono text-code-xs text-on-surface-variant">
                <span>{t('admin.dashboard.ordersByStatus')}</span>
                <span className="text-tertiary">{totalOrders.toLocaleString()}</span>
              </div>
              <div className="flex h-8 items-end gap-1">
                {statusBars.map(b => <span key={b.key} title={`${t(`status.${b.key}`)}: ${b.value}`} style={{ height: `${Math.max(8, Math.round((b.value / barMax) * 28))}px` }} className={`flex-1 rounded-t ${b.cls}`}></span>)}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="relative overflow-hidden rounded-xl bg-surface-container p-space-lg shadow-panel">
          <div className="pointer-events-none absolute -end-8 -bottom-8 h-32 w-32 rounded-full bg-secondary/15 blur-2xl"></div>
          <div className="mb-space-sm flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-lg text-secondary">military_tech</span>
              <h3 className="font-display text-headline-sm font-semibold text-on-surface">{t('dashboard.quickActions')}</h3>
            </div>
            <span className="rounded bg-secondary/20 px-2 py-0.5 font-label-sm text-label-sm font-bold uppercase text-secondary">{t('nav.clientArea')}</span>
          </div>
          <div className="space-y-space-xs">
            {[
              { to:'/dashboard/new-order', icon:'add_task', label:t('nav.newOrder') },
              { to:'/dashboard/add-funds', icon:'add_card', label:t('nav.addFunds') },
              { to:'/dashboard/services', icon:'grid_view', label:t('nav.services') },
              { to:'/dashboard/tickets', icon:'support_agent', label:t('nav.tickets') }
            ].map(item => <Link key={item.to} to={item.to} className="flex items-center justify-between rounded-lg bg-surface-container-low p-space-sm transition-colors hover:bg-surface-container-high">
              <span className="flex items-center gap-space-xs font-label-md text-label-md text-on-surface">
                <span className="material-symbols-outlined text-lg text-secondary">{item.icon}</span>
                {item.label}
              </span>
              <span className="material-symbols-outlined text-base text-outline">arrow_forward</span>
            </Link>)}
          </div>
        </div>

        {/* Support & Alerts */}
        <div className="rounded-xl bg-surface-container p-space-lg shadow-panel">
          <div className="mb-space-sm flex items-center justify-between pb-space-sm">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-lg text-primary">campaign</span>
              <h3 className="font-display text-headline-sm font-semibold text-on-surface">{L('Support & Alerts', 'الدعم والتنبيهات')}</h3>
            </div>
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          </div>
          <div className="space-y-space-md">
            <div className="space-y-space-2xs rounded-lg bg-surface-container-low p-space-md">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-tertiary">{t('nav.tickets')}</span>
                <span className="material-symbols-outlined text-sm text-on-surface-variant">support_agent</span>
              </div>
              <h4 className="font-display text-headline-sm font-medium text-on-surface">{num(data?.openTickets).toLocaleString()}</h4>
            </div>
            <div className="space-y-space-2xs rounded-lg bg-surface-container-low p-space-md">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-secondary">{t('notifications.title')}</span>
                <span className="material-symbols-outlined text-sm text-on-surface-variant">notifications</span>
              </div>
              <h4 className="font-display text-headline-sm font-medium text-on-surface">{num(data?.unreadNotifications).toLocaleString()}</h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>;
}
