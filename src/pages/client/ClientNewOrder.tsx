import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { notify } from '../../lib/notify';
import {
  ArrowRight, BadgeCheck, CheckCircle2, ChevronDown, Clipboard, Layers, Link2, Loader2,
  MousePointerClick, RefreshCw, Search, Star, Wallet, X, Zap,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { useTranslation } from '../../lib/i18n';

const readError = async (res: Response, fallback: string) => { const b = await res.json().catch(() => ({})); return b?.error || b?.message || fallback; };
const num = (v: any) => Number(v || 0);
const shortId = (id: any) => String(id || '').slice(0, 8);
const QUICK_ADDS = [500, 1000, 5000, 10000, 25000];

export default function ClientNewOrder() {
  const { user, dbUser } = useAuth();
  const qc = useQueryClient();
  const { t, lang } = useTranslation();
  const [categoryId, setCategoryId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [search, setSearch] = useState('');
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<any>(null);
  const [favorites, setFavorites] = useState<string[]>(() => JSON.parse(localStorage.getItem('favoriteServices') || '[]'));
  const [recent, setRecent] = useState<string[]>(() => JSON.parse(localStorage.getItem('recentServices') || '[]'));
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  /** Inline EN/AR for the few labels that have no i18n key yet. */
  const en = (e: string, a: string) => (lang === 'ar' ? a : e);

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

  const categories = useMemo(() => Array.from(new Map(services.map((s: any) => [s.category?.id, s.category])).values())
    .filter(Boolean).sort((a: any, b: any) => num(a.sortOrder) - num(b.sortOrder)), [services]);
  const categoryServices = useMemo(() => services.filter((s: any) => s.category?.id === categoryId), [services, categoryId]);
  const visibleServices = useMemo(() => categoryServices
    .filter((s: any) => !search || String(s.name).toLowerCase().includes(search.toLowerCase()))
    .sort((a: any, b: any) => num(a.sortOrder) - num(b.sortOrder) || String(a.name).localeCompare(String(b.name))), [categoryServices, search]);

  const selectedService = services.find((s: any) => s.id === serviceId);
  const singleUnit = !!selectedService && num(selectedService.minQuantity) === 1 && num(selectedService.maxQuantity) === 1;
  const totalPrice = selectedService && quantity
    ? (singleUnit ? num(selectedService.pricePer1k) * Number(quantity) : num(selectedService.pricePer1k) * Number(quantity) / 1000)
    : 0;
  const validQty = !!selectedService && (singleUnit ? quantity === 1 : typeof quantity === 'number' && quantity >= num(selectedService.minQuantity) && quantity <= num(selectedService.maxQuantity));
  const discount = num(couponResult?.discount);
  const estimatedCharge = Math.max(0, Number(totalPrice) - discount);
  const balance = num(dbUser?.balance);
  const remaining = balance - estimatedCharge;
  const sufficient = balance + 0.0000001 >= estimatedCharge;

  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id) ? favorites.filter(x => x !== id) : [...favorites, id];
    setFavorites(next); localStorage.setItem('favoriteServices', JSON.stringify(next));
  };
  const chooseService = (id: string) => {
    const picked = services.find((s: any) => s.id === id);
    if (picked?.category?.id && picked.category.id !== categoryId) { setCategoryId(picked.category.id); setSearch(''); }
    setServiceId(id);
    setQuantity(picked && num(picked.minQuantity) === 1 && num(picked.maxQuantity) === 1 ? 1 : '');
    const next = [id, ...recent.filter(x => x !== id)].slice(0, 8);
    setRecent(next); localStorage.setItem('recentServices', JSON.stringify(next));
  };
  const addQuantity = (delta: number) => {
    if (!selectedService || singleUnit) return;
    const min = num(selectedService.minQuantity) || 1;
    const max = num(selectedService.maxQuantity) || min;
    const current = typeof quantity === 'number' ? quantity : 0;
    setQuantity(Math.min(max, Math.max(min, current + delta)));
  };
  const pasteLink = async () => {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) setLink(text.trim());
      }
    } catch { /* clipboard blocked — the field stays editable for a manual paste */ }
  };
  const copyServiceId = async () => {
    if (!selectedService) return;
    try {
      await navigator.clipboard.writeText(String(selectedService.id));
      setCopied(true); notify.success(t('newOrder.copied')); setTimeout(() => setCopied(false), 2000);
    } catch { notify.error(en('Could not copy the service ID.', 'تعذر نسخ معرف الخدمة.')); }
  };

  const validateCoupon = async () => {
    try {
      if (!couponCode.trim()) return setCouponResult(null);
      const tok = await user!.getIdToken();
      const r = await apiFetch('/api/client/coupons/validate', user, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }, body: JSON.stringify({ code: couponCode, subtotal: totalPrice }) });
      const data = await r.json();
      if (!r.ok) { const err: any = new Error(data?.error || 'Invalid coupon'); err.code = data?.code; throw err; }
      setCouponResult(data); notify.success(`-$${Number(data.discount).toFixed(4)}`);
    } catch (e: any) { setCouponResult(null); notify.error(e, 'Invalid coupon'); }
  };

  const order = useMutation({
    mutationFn: async () => {
      if (!selectedService) throw new Error('SERVICE_UNAVAILABLE');
      if (!validQty) throw new Error('INVALID_QUANTITY');
      if (!link.trim()) throw new Error('INVALID_LINK');
      if (!sufficient) throw new Error('INSUFFICIENT_BALANCE');
      const tok = await user!.getIdToken();
      const r = await apiFetch('/api/client/orders', user, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }, body: JSON.stringify({ serviceId, link, quantity: Number(quantity), couponCode: couponCode.trim() || undefined }) });
      if (!r.ok) {
        const b = await r.json().catch(() => ({}));
        const err: any = new Error(b?.error || 'Failed to place order');
        err.code = b?.code; err.ref = b?.ref; err.status = r.status;
        throw err;
      }
      return r.json();
    },
    onSuccess: (data: any) => {
      notify.success(t('newOrder.orderPlaced'));
      setPlacedOrderId(String(data?.orderId || ''));
      setLink(''); setQuantity(''); setCouponCode(''); setCouponResult(null);
      qc.invalidateQueries({ queryKey: ['client-orders'] });
      qc.invalidateQueries({ queryKey: ['client-dashboard'] });
      qc.invalidateQueries({ queryKey: ['client-me'] });
    },
    onError: (e: any) => notify.error(e, t('newOrder.orderFailed'))
  });

  const canSubmit = !!selectedService && validQty && !!link.trim() && sufficient && !order.isPending;

  const recentServices = useMemo(
    () => recent.filter(id => services.some((s: any) => s.id === id)).slice(0, 4)
      .map(id => services.find((s: any) => s.id === id)).filter(Boolean),
    [recent, services]);

  const field = 'h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
  const label = 'flex items-center gap-2 text-sm font-semibold text-on-surface';
  const hint = 'text-xs text-on-surface-variant';
  const stepBadge = 'grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-container text-xs font-bold text-on-primary-container';

  return (
    <div className="flex flex-col gap-gutter-lg">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-space-md">
        <div className="min-w-0">
          <h1 className="font-display text-headline-lg text-on-surface">{t('newOrder.title')}</h1>
          <p className={`${hint} mt-1`}>{t('newOrder.subtitle')}</p>
        </div>
        <Link to="/dashboard/mass-order" className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-outline-variant bg-surface-container px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high">
          <Layers className="h-4 w-4" /> {t('nav.massOrder')}
        </Link>
      </div>

      {placedOrderId && (
        <div className="flex flex-wrap items-center justify-between gap-space-md rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-on-surface">{t('newOrder.orderPlaced')}</p>
              <p className="font-mono text-xs text-on-surface-variant">#{shortId(placedOrderId)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/dashboard/orders" className="inline-flex h-9 items-center rounded-lg bg-surface-container-high px-3 text-sm font-semibold text-on-surface hover:bg-surface-bright">{t('nav.orderHistory')}</Link>
            <button type="button" onClick={() => setPlacedOrderId(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface" aria-label={t('common.close')}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-gutter-lg lg:grid-cols-3">
        {/* ── Form ─────────────────────────────────────────────────────────── */}
        <form
          className="flex flex-col gap-space-xl rounded-xl border border-outline-variant bg-surface-container p-5 lg:col-span-2 md:p-6"
          onSubmit={e => {
            e.preventDefault();
            if (!selectedService) return notify.error(t('newOrder.selectPrompt'));
            if (!validQty) return notify.error(singleUnit ? en('This service accepts exactly 1 item.', 'هذه الخدمة تقبل قطعة واحدة فقط.') : t('newOrder.quantityRange', { min: selectedService?.minQuantity, max: selectedService?.maxQuantity }));
            if (!link.trim()) return notify.error(t('newOrder.link'));
            if (!sufficient) return notify.error(t('newOrder.insufficientBalance'));
            order.mutate();
          }}
        >
          {servicesQ.isError && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-error/40 bg-error-container p-3 text-sm text-on-error-container">
              <span>{en('We could not load the services list.', 'تعذر تحميل قائمة الخدمات.')}</span>
              <button type="button" onClick={() => servicesQ.refetch()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-surface-container px-3 font-semibold">
                <RefreshCw className="h-4 w-4" /> {t('common.refresh')}
              </button>
            </div>
          )}

          {/* 1 · Category */}
          <div className="flex flex-col gap-2">
            <label htmlFor="category-select" className={label}>
              <span className={stepBadge}>1</span> {t('newOrder.chooseCategory')}
            </label>
            <div className="relative">
              <select
                id="category-select"
                value={categoryId}
                onChange={e => { setCategoryId(e.target.value); setServiceId(''); setQuantity(''); setSearch(''); }}
                className={`${field} cursor-pointer appearance-none pe-10`}
              >
                <option value="">{t('newOrder.chooseCategory')}</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name} ({services.filter((s: any) => s.category?.id === c.id).length})</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            </div>
          </div>

          {/* 2 · Service */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="service-select" className={label}>
                <span className={stepBadge}>2</span> {t('newOrder.selectedService')}
              </label>
              <button type="button" onClick={() => servicesQ.refetch()} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <RefreshCw className={`h-3.5 w-3.5 ${servicesQ.isFetching ? 'animate-spin' : ''}`} /> {t('common.refresh')}
              </button>
            </div>

            {categoryId && visibleServices.length > 6 && (
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('newOrder.searchInCategory')} className={`${field} ps-9`} />
              </div>
            )}

            <div className="relative">
              <select
                id="service-select"
                disabled={!categoryId || servicesQ.isLoading}
                value={serviceId}
                onChange={e => chooseService(e.target.value)}
                className={`${field} cursor-pointer appearance-none pe-10 disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <option value="">
                  {!categoryId ? en('Choose a category first', 'اختر القسم أولاً')
                    : visibleServices.length ? t('newOrder.selectService')
                    : t('newOrder.noServicesInCategory')}
                </option>
                {visibleServices.map((s: any) => (
                  <option key={s.id} value={s.id}>#{shortId(s.id)} — {s.name} — ${num(s.pricePer1k).toFixed(4)}/{en('1k', '1000')}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            </div>

            {servicesQ.isLoading && <p className={hint}>{t('common.loading')}</p>}
            {!categoryId && <p className={hint}>{en('Choose a category to load its services.', 'اختر القسم لتحميل خدماته.')}</p>}

            {/* Selected service summary */}
            {selectedService && (
              <div className="mt-1 flex flex-col gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-on-surface">{selectedService.name}</p>
                    <button type="button" onClick={copyServiceId} className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs text-on-surface-variant hover:text-on-surface">
                      ID #{shortId(selectedService.id)} <Clipboard className="h-3 w-3" /> {copied ? t('newOrder.copied') : t('newOrder.copyServiceId')}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-tertiary">${num(selectedService.pricePer1k).toFixed(4)} <span className="text-xs font-normal text-on-surface-variant">/ {t('newOrder.perThousand')}</span></span>
                    <button type="button" onClick={() => toggleFavorite(selectedService.id)} className="grid h-8 w-8 place-items-center rounded-lg bg-surface-container-high text-on-surface-variant transition-colors hover:text-on-surface" title={en('Favourite', 'مفضلة')}>
                      <Star className={`h-4 w-4 ${favorites.includes(selectedService.id) ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-surface-container-high px-2 py-1 text-xs text-on-surface-variant">
                    {t('newOrder.minimum')}: <b className="font-mono text-on-surface">{num(selectedService.minQuantity).toLocaleString()}</b>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-surface-container-high px-2 py-1 text-xs text-on-surface-variant">
                    {t('newOrder.maximum')}: <b className="font-mono text-on-surface">{num(selectedService.maxQuantity).toLocaleString()}</b>
                  </span>
                  {selectedService.refillable && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">
                      <BadgeCheck className="h-3.5 w-3.5" /> {en('Refill available', 'إعادة التعبئة متاحة')}
                    </span>
                  )}
                  {selectedService.cancelable && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-1 text-xs text-sky-400">
                      <X className="h-3.5 w-3.5" /> {en('Cancellation available', 'الإلغاء متاح')}
                    </span>
                  )}
                  {num(selectedService.cashbackPercentage) > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-2 py-1 text-xs text-violet-300">
                      <Wallet className="h-3.5 w-3.5" /> {t('newOrder.cashback')} {num(selectedService.cashbackPercentage)}%
                    </span>
                  )}
                </div>
                {String(selectedService.description || '').trim() && (
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-on-surface-variant">{String(selectedService.description).trim()}</p>
                )}
              </div>
            )}
          </div>

          {/* 3 · Target */}
          <div className="flex flex-col gap-2">
            <label htmlFor="target-link" className={label}>
              <span className={stepBadge}>3</span> {t('newOrder.targetLink')}
            </label>
            <div className="relative">
              <Link2 className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <input
                id="target-link"
                type="text"
                value={link}
                onChange={e => setLink(e.target.value)}
                placeholder={singleUnit ? en('email@example.com or account ID', 'البريد الإلكتروني أو معرّف الحساب') : 'https://instagram.com/username'}
                className={`${field} ps-9 pe-24`}
              />
              <button type="button" onClick={pasteLink} className="absolute end-2 top-1/2 inline-flex h-8 -translate-y-1/2 items-center gap-1 rounded-md bg-surface-container-high px-2 text-xs font-medium text-on-surface-variant transition-colors hover:text-on-surface">
                <Clipboard className="h-3.5 w-3.5" /> {en('Paste', 'لصق')}
              </button>
            </div>
            <p className={hint}>{singleUnit
              ? en('Enter the account data this service needs (email, ID, or link).', 'أدخل البيانات المطلوبة للخدمة (بريد، معرف، أو رابط).')
              : en('Paste the public link of the post, video or profile you want to grow.', 'الصق الرابط العام للمنشور أو الفيديو أو الحساب المطلوب.')}</p>
          </div>

          {/* 4 · Quantity */}
          <div className="flex flex-col gap-2">
            <label htmlFor="order-quantity" className={label}>
              <span className={stepBadge}>4</span> {t('newOrder.quantity')}
            </label>
            {singleUnit ? (
              <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
                <p className="text-sm font-semibold text-on-surface">{en('1 item — fixed', 'قطعة واحدة — ثابتة')}</p>
                <p className={`${hint} mt-1`}>{en('This service is sold as a single item, so the price above is charged once.', 'تُباع هذه الخدمة كوحدة واحدة، ويُخصم السعر أعلاه مرة واحدة.')}</p>
              </div>
            ) : (
              <>
                <input
                  id="order-quantity"
                  type="number"
                  inputMode="numeric"
                  min={selectedService?.minQuantity}
                  max={selectedService?.maxQuantity}
                  value={quantity}
                  onChange={e => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder={selectedService ? `${selectedService.minQuantity} - ${selectedService.maxQuantity}` : en('Choose a service first', 'اختر الخدمة أولاً')}
                  disabled={!selectedService}
                  className={`${field} font-mono tabular-nums disabled:opacity-60`}
                />
                {selectedService && (
                  <div className="flex flex-wrap gap-2">
                    {QUICK_ADDS.map(add => (
                      <button
                        key={add}
                        type="button"
                        onClick={() => addQuantity(add)}
                        className={`h-8 rounded-md px-2.5 font-mono text-xs transition-colors ${quantity === add ? 'bg-primary-container font-semibold text-on-primary-container' : 'bg-surface-container-high text-on-surface hover:bg-surface-bright'}`}
                      >
                        +{add >= 1000 ? `${add / 1000}k` : add}
                      </button>
                    ))}
                  </div>
                )}
                {selectedService && (
                  <p className={`${hint} flex items-center gap-1`}>
                    {validQty ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> {t('newOrder.quantityValid')}</>
                      : <><MousePointerClick className="h-3.5 w-3.5" /> {t('newOrder.quantityRange', { min: num(selectedService.minQuantity).toLocaleString(), max: num(selectedService.maxQuantity).toLocaleString() })}</>}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Coupon */}
          <div className="flex flex-col gap-2 border-t border-outline-variant pt-space-lg">
            <label htmlFor="coupon-code" className={label}>{en('Coupon code', 'كود الخصم')} <span className="text-xs font-normal text-on-surface-variant">({en('optional', 'اختياري')})</span></label>
            <div className="flex gap-2">
              <input id="coupon-code" value={couponCode} onChange={e => { setCouponCode(e.target.value); setCouponResult(null); }} placeholder={en('Enter a coupon code', 'أدخل كود الخصم')} className={`${field} font-mono uppercase`} />
              <button type="button" onClick={validateCoupon} disabled={!couponCode.trim()} className="h-11 shrink-0 rounded-lg border border-outline-variant bg-surface-container px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-50">
                {en('Apply', 'تطبيق')}
              </button>
            </div>
            {discount > 0 && <p className="text-xs font-medium text-emerald-400">−${discount.toFixed(4)} {en('applied to this order', 'تم تخصيمها من الطلب')}</p>}
          </div>

          {recentServices.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-outline-variant pt-space-lg">
              <span className="text-xs font-semibold uppercase tracking-wider text-outline">{t('newOrder.recent')}</span>
              <div className="flex flex-wrap gap-2">
                {recentServices.map((s: any) => (
                  <button key={s.id} type="button" onClick={() => chooseService(s.id)} className="inline-flex max-w-full items-center gap-1 rounded-md bg-surface-container-high px-2.5 py-1.5 text-xs text-on-surface transition-colors hover:bg-surface-bright">
                    <Zap className="h-3.5 w-3.5 shrink-0 text-tertiary" /> <span className="truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>

        {/* ── Summary ──────────────────────────────────────────────────────── */}
        <aside className="lg:col-span-1">
          <div className="flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container p-5 lg:sticky lg:top-20">
            <h2 className="font-display text-headline-sm text-on-surface">{t('newOrder.estimatedCharge')}</h2>

            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-on-surface-variant">{t('newOrder.service')}</span>
                <span className="min-w-0 truncate text-end font-medium text-on-surface">{selectedService?.name || '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-on-surface-variant">{t('newOrder.quantity')}</span>
                <span className="font-mono tabular-nums text-on-surface">{quantity ? Number(quantity).toLocaleString() : '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-on-surface-variant">{t('newOrder.perThousand')}</span>
                <span className="font-mono tabular-nums text-on-surface">{selectedService ? `$${num(selectedService.pricePer1k).toFixed(4)}` : '—'}</span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-on-surface-variant">{en('Discount', 'الخصم')}</span>
                  <span className="font-mono tabular-nums text-emerald-400">−${discount.toFixed(4)}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 border-t border-outline-variant pt-3">
                <span className="font-semibold text-on-surface">{t('newOrder.totalCharge')}</span>
                <span className="font-mono text-lg font-bold tabular-nums text-tertiary">${estimatedCharge.toFixed(4)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-on-surface-variant">{t('common.balance')}</span>
                <span className="font-mono tabular-nums text-on-surface">${balance.toFixed(4)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-on-surface-variant">{en('Remaining after order', 'المتبقي بعد الطلب')}</span>
                <span className={`font-mono tabular-nums ${remaining < 0 ? 'text-rose-400' : 'text-on-surface'}`}>${remaining.toFixed(4)}</span>
              </div>
            </div>

            {!sufficient && estimatedCharge > 0 && (
              <div className="flex flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="text-xs font-medium text-amber-300">{t('newOrder.insufficientBalance')}</p>
                <Link to="/dashboard/add-funds" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary-container text-sm font-semibold text-on-primary-container hover:bg-primary">
                  <Wallet className="h-4 w-4" /> {t('nav.addFunds')}
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={() => order.mutate()}
              disabled={!canSubmit || order.isPending}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary-container text-base font-bold text-on-primary-container shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition-all hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {order.isPending ? <><Loader2 className="h-5 w-5 animate-spin" /> {t('newOrder.placingOrder')}</>
                : <><ArrowRight className="h-5 w-5 rtl:rotate-180" /> {t('newOrder.placeOrder')}</>}
            </button>

            {!canSubmit && !order.isPending && (
              <p className={`${hint} text-center`}>
                {!selectedService ? t('newOrder.selectPrompt')
                  : !validQty ? t('newOrder.enterValidQuantity')
                  : !link.trim() ? t('newOrder.link')
                  : t('newOrder.insufficientBalance')}
              </p>
            )}

            <p className={`${hint} text-center`}>{en('The charge is deducted from your wallet the moment the order is accepted.', 'يُخصم المبلغ من رصيدك لحظة قبول الطلب.')}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
