import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { notify } from '../../lib/notify';
import { Search, Star, CheckCircle2, RefreshCw, Info, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { useTranslation } from '../../lib/i18n';

const readError = async (res: Response, fallback: string) => { const b = await res.json().catch(() => ({})); return b?.error || b?.message || fallback; };
const num = (v: any) => Number(v || 0);
const money = (v: any) => num(v).toFixed(2);
const serviceDetails = (s: any) => String(s?.description || '').trim() || 'Service details are available for this service.';
const shortId = (id: any) => String(id || '').slice(0, 8);
/** Quick-add deltas from the design; each one sets the real quantity input inside the service limits. */
const QUICK_ADDS = [500, 1000, 5000, 10000, 25000];
const BOOST_TONES = ['text-primary', 'text-secondary', 'text-tertiary'];
/** Quick-add chip styling; the chip that equals the current quantity is highlighted, as in the design. */
const quickAddClass = (add: number, current: number | '') => `px-space-sm py-space-2xs rounded-lg font-mono text-code-xs transition-all ${current === add ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-high hover:bg-surface-bright text-on-surface'}`;
/** Maps a real category name onto the design's platform glyphs (falls back to a neutral glyph). */
const categoryIcon = (name: any) => {
  const n = String(name || '').toLowerCase();
  if (n.includes('insta')) return 'photo_camera';
  if (n.includes('tiktok') || n.includes('tik tok')) return 'music_note';
  if (n.includes('youtube')) return 'smart_display';
  if (n.includes('telegram')) return 'send';
  if (n.includes('twitter') || n.includes('x/twitter')) return 'tag';
  if (n.includes('facebook')) return 'thumb_up';
  if (n.includes('spotify')) return 'graphic_eq';
  if (n.includes('whatsapp')) return 'chat';
  if (n.includes('snapchat')) return 'camera';
  if (n.includes('discord')) return 'forum';
  if (n.includes('linkedin')) return 'work';
  return 'category';
};

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
  const [bannerOpen, setBannerOpen] = useState(false);

  /** Inline EN/AR for mockup copy that has no i18n key (i18n.tsx is out of scope for this task). */
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

  const categories = useMemo(() => Array.from(new Map(services.map((s: any) => [s.category?.id, s.category])).values()).filter(Boolean).sort((a: any, b: any) => a.sortOrder - b.sortOrder), [services]);
  const categoryServices = useMemo(() => services.filter((s: any) => s.category?.id === categoryId), [services, categoryId]);

  const visibleServices = useMemo(() => categoryServices
    .filter((s: any) => !search || String(s.name).toLowerCase().includes(search.toLowerCase()))
    .sort((a: any, b: any) => a.sortOrder - b.sortOrder || String(a.name).localeCompare(String(b.name))), [categoryServices, search]);
  const selectedService = services.find((s: any) => s.id === serviceId);
  const currency = 'USD';
  const singleUnit = !!selectedService && Number(selectedService.minQuantity) === 1 && Number(selectedService.maxQuantity) === 1;
  const totalPrice = selectedService && quantity ? (singleUnit ? num(selectedService.pricePer1k) * Number(quantity) : num(selectedService.pricePer1k) * Number(quantity) / 1000) : 0;
  const validQty = !!selectedService && (singleUnit ? quantity === 1 : typeof quantity === 'number' && quantity >= selectedService.minQuantity && quantity <= selectedService.maxQuantity);
  const discount = num(couponResult?.discount);
  const estimatedCharge = Math.max(0, Number(totalPrice) - discount);
  const balance = num(dbUser?.balance);
  const remaining = Math.max(0, balance - estimatedCharge);
  const sufficient = balance + 0.0000001 >= estimatedCharge;
  const chargeProgress = balance > 0 ? Math.min(100, (estimatedCharge / balance) * 100) : 0;

  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id) ? favorites.filter(x => x !== id) : [...favorites, id];
    setFavorites(next); localStorage.setItem('favoriteServices', JSON.stringify(next));
  };
  const chooseService = (id: string) => {
    setServiceId(id);
    const picked = services.find((s: any) => s.id === id);
    setQuantity(picked && Number(picked.minQuantity) === 1 && Number(picked.maxQuantity) === 1 ? 1 : '');
    const next = [id, ...recent.filter(x => x !== id)].slice(0, 8);
    setRecent(next); localStorage.setItem('recentServices', JSON.stringify(next));
  };
  /** Numbered-step 4 quick-add chips: they add to the real quantity and clamp to the service's real limits. */
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

  const validateCoupon = async () => {
    try {
      if (!couponCode.trim()) return setCouponResult(null);
      const tok = await user!.getIdToken();
      const r = await apiFetch('/api/client/coupons/validate', user, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }, body: JSON.stringify({ code: couponCode, subtotal: totalPrice }) });
      const data = await r.json(); if (!r.ok) throw new Error(data?.error || 'Invalid coupon');
      setCouponResult(data); notify.success(`Coupon applied: -$${Number(data.discount).toFixed(4)}`);
    } catch (e:any) { setCouponResult(null); notify.error(e.message || 'Invalid coupon'); }
  };

  const order = useMutation({
    mutationFn: async () => {
      if (!selectedService) throw new Error('SERVICE_UNAVAILABLE');
      if (!validQty) throw new Error('INVALID_QUANTITY');
      if (!link.trim()) throw new Error('INVALID_LINK');
      if (balance + 0.0000001 < estimatedCharge) throw new Error('INSUFFICIENT_BALANCE');
      const tok = await user!.getIdToken();
      const r = await apiFetch('/api/client/orders', user, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }, body: JSON.stringify({ serviceId, link, quantity: Number(quantity), couponCode: couponCode.trim() || undefined }) });
      if (!r.ok) throw new Error(await readError(r, 'Failed to place order'));
      return r.json();
    },
    onSuccess: () => { notify.success(t('newOrder.orderPlaced')); setBannerOpen(true); setLink(''); setQuantity(''); qc.invalidateQueries({ queryKey: ['client-orders'] }); qc.invalidateQueries({ queryKey: ['client-dashboard'] }); qc.invalidateQueries({ queryKey: ['client-me'] }); },
    onError: (e: any) => notify.error(e.message || e.code || 'ORDER_CREATION_FAILED', t('newOrder.orderFailed'))
  });

  /** Real "Complementary Boosts" rows: the client's real favourites/recent services, then the current category. */
  const boostServices = useMemo(() => {
    const picks: any[] = [];
    for (const id of [...favorites, ...recent]) {
      const s = services.find((x: any) => x.id === id);
      if (s && s.id !== serviceId && !picks.some(p => p.id === s.id)) picks.push(s);
      if (picks.length === 3) break;
    }
    for (const s of categoryServices) {
      if (picks.length === 3) break;
      if (s.id !== serviceId && !picks.some(p => p.id === s.id)) picks.push(s);
    }
    return picks.slice(0, 3);
  }, [favorites, recent, services, categoryServices, serviceId]);

  const recentNames = recent.filter(id => services.some((s: any) => s.id === id)).slice(0, 5).map(id => services.find((s: any) => s.id === id)?.name).filter(Boolean);

  return <div className="flex flex-col gap-gutter-lg" dir="auto">

    {/* ── Dispatch header (mockup: Rapid Node Dispatch / New Dispatch Order / Bulk Mode) ── */}
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
      <div className="flex flex-col">
        <div className="flex items-center gap-space-xs mb-space-2xs">
          <span className="font-mono text-code-xs text-primary uppercase tracking-widest">{en('Rapid Node Dispatch', 'إرسال الطلبات السريع')}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
          <span className="font-mono text-code-xs text-on-surface-variant">{services.length} {en('Services Online', 'خدمة متاحة')}</span>
        </div>
        <div className="flex flex-wrap items-center gap-space-sm">
          <h1 className="font-display text-headline-lg text-on-surface">{en('New Dispatch Order', 'طلب إرسال جديد')}</h1>
          <span className="sr-only">{t('newOrder.title')}</span>
          <span className="font-mono text-code-xs px-space-xs py-space-2xs rounded bg-surface-container-high text-tertiary">v2.4 Direct Feed</span>
        </div>
      </div>
      <div className="flex items-center gap-space-md">
        <div className="flex items-center gap-space-xs bg-surface-container px-space-md py-space-xs rounded-xl shadow-sm">
          <span className="material-symbols-outlined text-secondary text-base">swap_calls</span>
          <span className="font-mono text-code-xs text-on-surface-variant">{en('Bulk Mode:', 'الوضع الجماعي:')}</span>
          <Link to="/dashboard/mass-order" className="font-mono text-code-xs font-semibold text-primary hover:text-on-primary-container px-space-xs py-space-2xs rounded bg-surface-container-high transition-colors">{en('Switch to Mass Order', 'التحويل لطلب جماعي')}</Link>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg">

      {/* ── Dispatch flow column ─────────────────────────────────────────── */}
      <div className="lg:col-span-7 flex flex-col gap-space-lg">
        <div className="bg-surface-container p-space-xl rounded-xl shadow-md flex flex-col gap-space-xl">

          {servicesQ.isLoading ? <div className="py-12 text-center font-mono text-code-sm text-on-surface-variant">{t('common.loading')}</div>
          : servicesQ.isError ? <div className="flex flex-wrap items-center justify-between gap-space-md rounded-xl bg-error-container p-space-md text-on-error-container">
              <span className="font-label-lg text-label-lg">{en('Failed to load services.', 'تعذر تحميل الخدمات.')}</span>
              <button type="button" onClick={() => servicesQ.refetch()} className="inline-flex items-center gap-space-xs rounded-xl border border-outline-variant bg-surface-container px-space-md py-space-sm font-label-lg text-on-surface transition-colors hover:bg-surface-container-high"><RefreshCw className="w-4 h-4" /> {t('common.refresh')}</button>
            </div>
          : <>

          {/* 1 — Platform Category */}
          <div className="flex flex-col gap-space-sm">
            <div className="flex flex-wrap items-center justify-between gap-space-sm">
              <span className="font-mono text-label-sm uppercase tracking-wider text-on-surface-variant flex items-center gap-space-xs">
                <span className="w-5 h-5 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-mono text-code-xs font-semibold">1</span>
                {en('Platform Category', 'القسم / المنصة')}
                <span className="sr-only">{t('newOrder.chooseCategory')}</span>
              </span>
              <div className="flex items-center gap-space-sm">
                <span className="font-mono text-code-xs text-tertiary">{categories.length} {en('Networks Online', 'شبكة متصلة')}</span>
                <button type="button" onClick={() => servicesQ.refetch()} className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface">
                  <RefreshCw className={`w-3.5 h-3.5 ${servicesQ.isFetching ? 'animate-spin' : ''}`} />
                  <span className="sr-only">{t('common.refresh')}</span>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-space-xs">
              {categories.map((c: any) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setCategoryId(c.id); setServiceId(''); setQuantity(''); setSearch(''); }}
                  className={categoryId === c.id
                    ? "group flex flex-col items-center justify-center py-space-md px-space-xs rounded-xl bg-primary-container text-on-primary-container transition-all shadow-sm"
                    : "group flex flex-col items-center justify-center py-space-md px-space-xs rounded-xl bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-bright transition-all shadow-sm"}
                >
                  <span className="material-symbols-outlined text-xl mb-space-2xs">{categoryIcon(c.name)}</span>
                  <span className="font-label-sm text-label-sm text-center break-words">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2 — Select Target Service */}
          <div className="flex flex-col gap-space-sm">
            <div className="flex flex-wrap items-center justify-between gap-space-sm">
              <label htmlFor="service-select" className="font-mono text-label-sm uppercase tracking-wider text-on-surface-variant flex items-center gap-space-xs">
                <span className="w-5 h-5 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center font-mono text-code-xs font-semibold">2</span>
                {en('Select Target Service', 'اختر الخدمة المطلوبة')}
              </label>
              <span className="font-mono text-code-xs text-primary">{selectedService ? `ID: #${shortId(selectedService.id)}` : `${visibleServices.length} ${en('services', 'خدمة')}`}</span>
            </div>
            <div className="relative">
              <select
                id="service-select"
                disabled={!categoryId}
                value={serviceId}
                onChange={e => chooseService(e.target.value)}
                className="w-full bg-surface-container-low text-on-surface font-mono text-code-sm rounded-xl px-space-md py-space-sm pe-12 appearance-none focus:outline-none focus:bg-surface-container-lowest transition-all cursor-pointer disabled:opacity-50"
              >
                <option value="">{!categoryId ? en('Select category first', 'اختر القسم أولاً') : en('Select service', 'اختر الخدمة')}</option>
                {visibleServices.map((s: any) => <option key={s.id} value={s.id}>{`#${shortId(s.id)} - ${s.name} - $${num(s.pricePer1k).toFixed(4)} / 1k`}</option>)}
              </select>
              <span className="material-symbols-outlined absolute end-space-md top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">unfold_more</span>
            </div>
            {categoryId && <div className="flex flex-wrap items-center gap-space-sm">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute start-space-md top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('newOrder.searchInCategory')} className="h-[38px] w-full rounded-lg border border-outline-variant bg-surface-container-lowest ps-10 pe-space-md font-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <span className="font-mono text-code-xs text-on-surface-variant">{visibleServices.length} {en('service(s) in this category', 'خدمة في هذا القسم')}</span>
            </div>}
            {selectedService && <div className="flex flex-wrap items-center gap-space-xs mt-space-2xs">
              <span className="inline-flex items-center gap-space-2xs px-space-xs py-space-2xs rounded bg-surface-container-high text-tertiary font-mono text-code-xs">
                <span className="material-symbols-outlined text-xs">autorenew</span>
                {selectedService.refillable ? en('Refill: Available', 'إعادة التعبئة: متاحة') : en('Refill: Not available', 'إعادة التعبئة: غير متاحة')}
              </span>
              <span className="inline-flex items-center gap-space-2xs px-space-xs py-space-2xs rounded bg-surface-container-high text-secondary font-mono text-code-xs">
                <span className="material-symbols-outlined text-xs">verified</span>
                {selectedService.cancelable ? en('Cancel: Available', 'الإلغاء: متاح') : en('Cancel: Not available', 'الإلغاء: غير متاح')}
              </span>
              <span className="inline-flex items-center gap-space-2xs px-space-xs py-space-2xs rounded bg-surface-container-high text-on-surface font-mono text-code-xs">
                <span className="material-symbols-outlined text-xs">savings</span>
                {t('newOrder.cashback')} {num(selectedService.cashbackPercentage)}%
              </span>
              <button type="button" onClick={() => toggleFavorite(selectedService.id)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant transition-colors hover:bg-surface-bright hover:text-on-surface" title={favorites.includes(selectedService.id) ? en('Favourite', 'مفضلة') : en('Add favourite', 'أضف للمفضلة')}>
                <Star className={`w-3.5 h-3.5 ${favorites.includes(selectedService.id) ? 'fill-yellow-400 text-yellow-500' : ''}`} />
              </button>
              <span className="ms-auto font-mono text-code-sm text-primary font-semibold">${num(selectedService.pricePer1k).toFixed(4)} / 1k</span>
            </div>}
          </div>

          {/* Service Specifications */}
          {selectedService && <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col gap-space-sm shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-space-sm">
              <span className="font-mono text-label-sm text-on-surface uppercase tracking-wider flex items-center gap-space-xs">
                <Info className="w-4 h-4 text-tertiary" />
                {en('Service Specifications', 'مواصفات الخدمة')}
                <span className="sr-only">{t('newOrder.serviceDetails')}</span>
                <span className="sr-only">{t('newOrder.selectedService')}</span>
              </span>
              <span className="font-mono text-code-xs text-tertiary flex items-center gap-space-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                {servicesQ.isFetching ? en('Syncing Endpoint', 'جاري مزامنة المزود') : en('Live Endpoint Healthy', 'الاتصال بالمزود سليم')}
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">{serviceDetails(selectedService)}</p>
            <div className="grid grid-cols-3 gap-space-sm pt-space-xs">
              <div className="flex flex-col bg-surface-container p-space-xs rounded-lg">
                <span className="font-mono text-code-xs text-on-surface-variant uppercase">{en('Min / Max', 'الأقل / الأعلى')}</span>
                <span className="font-mono text-code-sm text-on-surface font-semibold">{num(selectedService.minQuantity).toLocaleString()} / {num(selectedService.maxQuantity).toLocaleString()}</span>
              </div>
              <div className="flex flex-col bg-surface-container p-space-xs rounded-lg">
                <span className="font-mono text-code-xs text-on-surface-variant uppercase">{en('Rate / 1K', 'السعر / 1000')}</span>
                <span className="font-mono text-code-sm text-tertiary font-semibold">${num(selectedService.pricePer1k).toFixed(4)}</span>
              </div>
              <div className="flex flex-col bg-surface-container p-space-xs rounded-lg">
                <span className="font-mono text-code-xs text-on-surface-variant uppercase">{en('Refill Policy', 'سياسة إعادة التعبئة')}</span>
                <span className="font-mono text-code-sm text-secondary font-semibold">{selectedService.refillable ? en('Available', 'متاحة') : en('Not available', 'غير متاحة')}</span>
              </div>
            </div>
          </div>}

          <form onSubmit={e => {
              e.preventDefault();
              if (!validQty) return notify.error(singleUnit ? en('This service accepts exactly 1 item.', 'هذه الخدمة تقبل قطعة واحدة فقط.') : t('newOrder.quantityRange', { min: selectedService?.minQuantity, max: selectedService?.maxQuantity }));
              if (estimatedCharge > balance) return notify.error(t('newOrder.insufficientBalance'));
              order.mutate();
            }} className="flex flex-col gap-space-xl">

            {/* 3 — Target Profile / Media Link */}
            <div className="flex flex-col gap-space-sm">
              <div className="flex flex-wrap items-center justify-between gap-space-sm">
                <label htmlFor="target-link" className="font-mono text-label-sm uppercase tracking-wider text-on-surface-variant flex items-center gap-space-xs">
                  <span className="w-5 h-5 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center font-mono text-code-xs font-semibold">3</span>
                  {en('Target Profile / Media Link', 'الحساب / الرابط المستهدف')}
                </label>
                <span className="font-mono text-code-xs text-on-surface-variant">{singleUnit
                  ? en('Enter the email, account ID, or required data', 'أدخل البريد أو معرّف الحساب أو البيانات المطلوبة')
                  : en('e.g. https://instagram.com/username', 'مثال: https://instagram.com/username')}</span>
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute start-space-md text-on-surface-variant text-base pointer-events-none">{singleUnit ? 'alternate_email' : 'link'}</span>
                <input
                  id="target-link"
                  required
                  type="text"
                  value={link}
                  onChange={e => setLink(e.target.value)}
                  placeholder={singleUnit ? en('email@example.com or account ID', 'البريد الإلكتروني أو معرّف الحساب') : 'https://instagram.com/p/...'}
                  className="w-full bg-surface-container-low text-on-surface font-mono text-code-sm rounded-xl ps-10 pe-24 py-space-sm placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest transition-all"
                />
                <button type="button" onClick={pasteLink} className="absolute end-space-xs px-space-sm py-space-2xs rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-bright font-mono text-code-xs transition-colors flex items-center gap-space-2xs">
                  <span className="material-symbols-outlined text-xs">content_paste</span>
                  <span>{en('Paste', 'لصق')}</span>
                </button>
              </div>
            </div>

            {/* 4 — Quantity To Deliver */}
            <div className="flex flex-col gap-space-sm">
              <div className="flex flex-wrap items-center justify-between gap-space-sm">
                <label htmlFor="order-quantity" className="font-mono text-label-sm uppercase tracking-wider text-on-surface-variant flex items-center gap-space-xs">
                  <span className="w-5 h-5 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center font-mono text-code-xs font-semibold">4</span>
                  {en('Quantity To Deliver', 'الكمية المطلوبة')}
                </label>
                {selectedService && <span className="font-mono text-code-xs text-on-surface-variant">{t('newOrder.minimum')}: {num(selectedService.minQuantity).toLocaleString()} • {t('newOrder.maximum')}: {num(selectedService.maxQuantity).toLocaleString()}</span>}
              </div>
              {singleUnit ? <div className="rounded-xl bg-surface-container-low p-space-md flex flex-col">
                <span className="font-mono text-code-xs text-on-surface-variant uppercase">{t('newOrder.quantity')}</span>
                <span className="font-display text-headline-sm text-primary mt-space-2xs">{en('1 item — fixed', 'قطعة واحدة — ثابتة')}</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant mt-space-2xs">{en('This service is sold as one package/item. The price above is charged once.', 'تُباع هذه الخدمة كوحدة واحدة، ويُخصم السعر أعلاه مرة واحدة.')}</span>
              </div> : <>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute start-space-md text-on-surface-variant text-base pointer-events-none">pin</span>
                  <input
                    id="order-quantity"
                    required
                    type="number"
                    min={selectedService?.minQuantity}
                    max={selectedService?.maxQuantity}
                    value={quantity}
                    onChange={e => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={selectedService ? `${selectedService.minQuantity} - ${selectedService.maxQuantity}` : ''}
                    className="w-full bg-surface-container-low text-on-surface font-display text-headline-sm rounded-xl ps-10 pe-space-md py-space-xs placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest transition-all"
                  />
                </div>
                <div className="flex flex-wrap gap-space-xs">
                  {QUICK_ADDS.map(add => (
                    <button
                      key={add}
                      type="button"
                      onClick={() => addQuantity(add)}
                      className={quickAddClass(add, quantity)}
                    >+{add.toLocaleString()}</button>
                  ))}
                </div>
              </>}
            </div>

            {/* Auto-refill status — a real service flag, shown read-only (the API takes no refill toggle). */}
            {selectedService && <div className="flex items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-container-low">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-lg text-primary">{selectedService.refillable ? 'check_box' : 'check_box_outline_blank'}</span>
                <div className="flex flex-col">
                  <span className="font-label-lg text-label-lg text-on-surface">{selectedService.refillable ? en('Auto-Refill Guarantee Active', 'ضمان إعادة التعبئة التلقائية مُفعّل') : en('Auto-Refill Not Offered', 'إعادة التعبئة التلقائية غير متاحة')}</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">{en('Automated replenish is applied by this provider when a drop occurs.', 'يقوم المزوّد بإعادة التعويض تلقائياً عند حدوث نقص.')}</span>
                </div>
              </div>
              {selectedService.refillable && <span className="material-symbols-outlined text-secondary text-lg">verified_user</span>}
            </div>}

            {/* Calculated charge / order summary + execute */}
            <div className="p-space-lg rounded-xl bg-surface-container-lowest flex flex-col gap-space-md shadow-inner">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
                <div className="flex flex-col">
                  <span className="font-mono text-code-xs text-on-surface-variant uppercase tracking-wider">{en('Calculated Charge', 'التكلفة المحسوبة')}</span>
                  <span className="sr-only">{t('newOrder.estimatedCharge')}</span>
                  <div className="flex items-baseline gap-space-xs">
                    <span className="font-display text-headline-xl text-primary font-bold">${money(estimatedCharge)}</span>
                    <span className="font-mono text-code-xs text-on-surface-variant">{currency}</span>
                  </div>
                </div>
                <div className="flex flex-col sm:items-end">
                  <span className="font-mono text-code-xs text-on-surface-variant uppercase tracking-wider">{en('Account Balance', 'رصيد الحساب')}</span>
                  <span className="sr-only">{t('common.balance')}</span>
                  <span className="font-mono text-code-sm text-tertiary font-semibold">${money(balance)} {currency}</span>
                  <span className="font-mono text-code-xs text-on-surface-variant">{en('Remaining:', 'المتبقي:')} ${money(remaining)}</span>
                </div>
              </div>
              <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
                <div className="bg-tertiary h-full rounded-full transition-all duration-300" style={{ width: `${chargeProgress}%` }} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-space-sm font-mono text-code-xs text-on-surface-variant">
                <span className="flex items-center gap-space-2xs">
                  <span className="material-symbols-outlined text-xs text-tertiary">bolt</span>
                  {en('Endpoint', 'المزوّد')}: #{selectedService ? shortId(selectedService.id) : '—'}
                </span>
                <span className={`${sufficient ? 'text-tertiary' : 'text-on-error-container'}`}>{sufficient ? en('Balance Sufficient', 'الرصيد كافٍ') : en('Insufficient Balance', 'الرصيد غير كافٍ')}</span>
              </div>

              {/* Coupon — existing feature kept (the mockup has no coupon block). */}
              <div className="flex flex-wrap items-center gap-space-sm">
                <div className="relative flex-1 min-w-[160px]">
                  <span className="material-symbols-outlined absolute start-space-sm top-1/2 -translate-y-1/2 text-on-surface-variant text-base">local_offer</span>
                  <input
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value)}
                    placeholder={en('Coupon code', 'كود الخصم')}
                    className="h-[38px] w-full rounded-lg border border-outline-variant bg-surface-container-lowest ps-9 pe-space-md font-mono text-code-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <button type="button" onClick={validateCoupon} className="inline-flex items-center gap-space-xs rounded-xl border border-outline-variant bg-surface-container px-space-md py-space-sm font-label-lg text-on-surface transition-colors hover:bg-surface-container-high">{en('Apply', 'تطبيق')}</button>
                {discount > 0 && <span className="font-mono text-code-xs text-tertiary">{en('Coupon discount:', 'خصم الكوبون:')} -${money(discount)}</span>}
              </div>

              <div className="font-mono text-code-xs">
                {validQty
                  ? <span className="text-tertiary flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {t('newOrder.quantityValid')}</span>
                  : <span className="text-secondary">{t('newOrder.enterValidQuantity')}</span>}
              </div>
            </div>

            <button
              type="submit"
              disabled={order.isPending || !link || !validQty}
              className="w-full py-space-md px-space-lg rounded-xl bg-primary-container hover:bg-primary text-on-primary-container disabled:opacity-50 font-display text-headline-sm flex items-center justify-center gap-space-sm shadow-xl transition-all"
            >
              <span className="material-symbols-outlined text-xl">electric_bolt</span>
              <span>{order.isPending ? t('newOrder.placingOrder') : <>{en('Confirm & Submit Order', 'تأكيد وإرسال الطلب')} (${money(estimatedCharge)})</>}</span>
            </button>

            {order.isSuccess && bannerOpen && <div className="p-space-md rounded-xl bg-surface-container-high text-on-surface flex items-center justify-between gap-space-sm shadow-md">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-tertiary text-2xl">check_circle</span>
                <div className="flex flex-col">
                  <span className="font-label-lg text-label-lg font-semibold text-on-surface">{t('newOrder.orderPlaced')}</span>
                  <span className="font-mono text-code-xs text-tertiary">{en('Task ID', 'معرّف المهمة')} #{(order.data as any)?.orderId}</span>
                </div>
              </div>
              <button type="button" onClick={() => setBannerOpen(false)} className="text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined text-base">close</span></button>
            </div>}
          </form>
          </>}
        </div>

        {recentNames.length > 0 && <div className="flex flex-wrap items-center gap-space-xs font-mono text-code-xs text-on-surface-variant">
          <Zap className="w-3.5 h-3.5 text-tertiary" /> {t('newOrder.recent')} {recentNames.join(' • ')}
        </div>}
      </div>

      {/* ── Right column ─────────────────────────────────────────────────── */}
      <div className="lg:col-span-5 flex flex-col gap-space-lg">

        {/* Complementary Boosts — real services (favourites, recent, current category) */}
        {boostServices.length > 0 && <div className="bg-surface-container p-space-xl rounded-xl shadow-md flex flex-col gap-space-md">
          <div className="flex items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary text-lg">auto_fix_high</span>
              <span className="font-display text-headline-sm text-on-surface">{en('Complementary Boosts', 'عروض مكمّلة')}</span>
            </div>
            <span className="font-mono text-code-xs text-on-surface-variant">{en('Synergy Engine', 'محرّك التكامل')}</span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{en('Orders bundled with simultaneous engagement metrics experience up to 3.4x higher algorithmic retention.', 'الطلبات المرفقة بمقاييس تفاعل متزامنة تحصل على ثبات أعلى في الخوارزمية حتى 3.4 مرة.')}</p>
          <div className="flex flex-col gap-space-sm">
            {boostServices.map((s: any, i: number) => (
              <div key={s.id} className="p-space-sm rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-colors flex items-center justify-between gap-space-sm group cursor-pointer">
                <div className="flex items-center gap-space-sm min-w-0">
                  <div className={`w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center shrink-0 ${BOOST_TONES[i % 3]}`}>
                    <span className="material-symbols-outlined text-base">{categoryIcon(s.category?.name)}</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-lg text-label-lg text-on-surface truncate">{s.name}</span>
                    <span className="font-mono text-code-xs text-on-surface-variant">{en('From', 'من')} ${num(s.pricePer1k).toFixed(4)}/1k • {s.refillable ? en('Refill', 'إعادة تعبئة') : en('No Refill', 'بدون إعادة')}</span>
                  </div>
                </div>
                <button type="button" onClick={() => chooseService(s.id)} className="px-space-sm py-space-2xs rounded-lg bg-surface-container text-tertiary font-mono text-code-xs transition-colors group-hover:bg-tertiary group-hover:text-on-primary shrink-0">{en('Add +', 'إضافة +')}</button>
              </div>
            ))}
          </div>
        </div>}

        {/* Safe Delivery Protocols — design guidance copy, no data binding */}
        <div className="bg-surface-container p-space-xl rounded-xl shadow-md flex flex-col gap-space-md">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-lg">shield</span>
            <span className="font-display text-headline-sm text-on-surface">{en('Safe Delivery Protocols', 'بروتوكولات التسليم الآمن')}</span>
          </div>
          <ul className="flex flex-col gap-space-sm">
            <li className="flex items-start gap-space-sm">
              <span className="material-symbols-outlined text-tertiary text-base mt-0.5">lock_open</span>
              <div className="flex flex-col">
                <span className="font-label-lg text-label-lg text-on-surface">{en('Keep Profile Unlocked', 'اترك الحساب عاماً')}</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">{en("Account must remain strictly public until the entire order state flags 'Completed'.", "يجب أن يبقى الحساب عاماً حتى تصبح حالة الطلب 'مكتمل'.")}</span>
              </div>
            </li>
            <li className="flex items-start gap-space-sm">
              <span className="material-symbols-outlined text-tertiary text-base mt-0.5">edit_off</span>
              <div className="flex flex-col">
                <span className="font-label-lg text-label-lg text-on-surface">{en('Do Not Modify Handle', 'لا تعدّل الاسم أو الرابط')}</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">{en('Changing target username during active injection will result in automatic partial cancellation.', 'تغيير الاسم المستهدف أثناء التنفيذ يؤدي إلى إلغاء جزئي تلقائي.')}</span>
              </div>
            </li>
            <li className="flex items-start gap-space-sm">
              <span className="material-symbols-outlined text-tertiary text-base mt-0.5">layers</span>
              <div className="flex flex-col">
                <span className="font-label-lg text-label-lg text-on-surface">{en('Avoid Redundant Submissions', 'تجنّب الطلبات المكررة')}</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">{en('Wait for active queue to process before dispatching duplicate tasks to the identical URL.', 'انتظر انتهاء الطلبات النشطة قبل إرسال طلب مكرر لنفس الرابط.')}</span>
              </div>
            </li>
          </ul>
        </div>

        {/* Priority Operator Desk — real support route */}
        <div className="bg-gradient-to-br from-surface-container via-surface-container-high to-surface-container p-space-lg rounded-xl shadow-md flex flex-wrap items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-md">
            <div className="relative">
              <img className="w-10 h-10 rounded-full object-cover shadow-sm" alt="" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDXBJTugnaNyYODbd1ReVD2EiKE0hZT1nIqR4McVyXUgejTWHh9CDYslD3gBP1RmWKY2ylnrOnchoQdQKWHsYDKDe70VBTAy6ErZZpNa1ATTvYAYJMtT4fElMFgTHvK9rGRCY-WYfSGztIZTp1AdL79cRPV6W07TivsY6_Z4nK7kU1kvkTIwp0SzgBPPKFEe0_F6IOy-L64MWpxgDlfOPdLz9ODcVMSyQae6pgZgDtuMR2l_Bg0488tHQ" />
              <span className="absolute bottom-0 end-0 w-2.5 h-2.5 rounded-full bg-tertiary ring-2 ring-surface-container" />
            </div>
            <div className="flex flex-col">
              <span className="font-label-lg text-label-lg text-on-surface font-semibold">{en('Priority Operator Desk', 'مكتب الدعم المباشر')}</span>
              <span className="font-mono text-code-xs text-on-surface-variant">{t('tickets.subtitle')}</span>
            </div>
          </div>
          <Link to="/dashboard/tickets" className="px-space-md py-space-xs rounded-xl bg-surface-bright hover:bg-surface-container-highest text-primary font-label-lg text-label-lg flex items-center gap-space-2xs transition-colors">
            <span className="material-symbols-outlined text-sm">chat</span>
            <span>{en('Open Live Chat', 'افتح الدعم المباشر')}</span>
          </Link>
        </div>
      </div>
    </div>
  </div>;
}
