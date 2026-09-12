import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notify } from '../../lib/notify';
import { Search, Star, CheckCircle2, RefreshCw, Info, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { useTranslation } from '../../lib/i18n';

const readError = async (res: Response, fallback: string) => { const b = await res.json().catch(() => ({})); return b?.error || b?.message || fallback; };
const num = (v: any) => Number(v || 0);
const serviceDetails = (s: any) => {
  const meta = s?.providerMeta || {};
  const explicit = String(s?.description || meta.description || '').trim();
  if (explicit && !/^Service details are available/i.test(explicit)) return explicit;
  const parts:string[] = [];
  if (meta.type) parts.push(`Type: ${meta.type}`);
  if (meta.providerRate != null) parts.push(Number(s?.minQuantity) === 1 && Number(s?.maxQuantity) === 1 ? `Provider price per item: ${meta.providerRate} USD` : `Provider rate: ${meta.providerRate} USD / 1K`);
  if (meta.providerMin != null || meta.providerMax != null) parts.push(`Limits: ${Number(meta.providerMin ?? s?.minQuantity ?? 0).toLocaleString()} – ${Number(meta.providerMax ?? s?.maxQuantity ?? 0).toLocaleString()}`);
  parts.push(`Refill: ${meta.refillable ?? s?.refillable ? 'Available' : 'Not available'}`);
  parts.push(`Cancel: ${meta.cancelable ?? s?.cancelable ? 'Available' : 'Not available'}`);
  if (meta.dripfeed) parts.push('Drip-feed: Available');
  if (meta.category) parts.push(`Provider category: ${meta.category}`);
  return parts.length ? parts.join(' • ') : 'No extra description was supplied by this provider.';
};


export default function ClientNewOrder() {
  const { user, dbUser } = useAuth();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [categoryId, setCategoryId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [search, setSearch] = useState('');
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<any>(null);
  const [favorites, setFavorites] = useState<string[]>(() => JSON.parse(localStorage.getItem('favoriteServices') || '[]'));
  const [recent, setRecent] = useState<string[]>(() => JSON.parse(localStorage.getItem('recentServices') || '[]'));

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
  const providerMeta = selectedService?.providerMeta || {};
  const currency = 'USD';
  const singleUnit = !!selectedService && Number(selectedService.minQuantity) === 1 && Number(selectedService.maxQuantity) === 1;
  const totalPrice = selectedService && quantity ? (singleUnit ? num(selectedService.pricePer1k) * Number(quantity) : num(selectedService.pricePer1k) * Number(quantity) / 1000) : 0;
  const validQty = !!selectedService && (singleUnit ? quantity === 1 : typeof quantity === 'number' && quantity >= selectedService.minQuantity && quantity <= selectedService.maxQuantity);

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
      const tok = await user!.getIdToken();
      const r = await apiFetch('/api/client/orders', user, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }, body: JSON.stringify({ serviceId, link, quantity: Number(quantity), couponCode: couponCode.trim() || undefined }) });
      if (!r.ok) throw new Error(await readError(r, 'Failed to place order'));
      return r.json();
    },
    onSuccess: () => { notify.success(t('newOrder.orderPlaced')); setLink(''); setQuantity(''); qc.invalidateQueries({ queryKey: ['client-orders'] }); qc.invalidateQueries({ queryKey: ['client-dashboard'] }); qc.invalidateQueries({ queryKey: ['client-me'] }); },
    onError: (e: any) => notify.error(e.message)
  });

  return <div className="space-y-6 max-w-7xl mx-auto" dir="auto">
    <section className="rounded-2xl bg-gradient-to-r from-indigo-700 to-violet-700 text-white p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div><h1 className="text-2xl font-black">{t('newOrder.title') || 'New Order'}</h1><p className="text-indigo-100 mt-1">Choose a category, then choose the exact service. All synchronized service details appear automatically.</p></div>
        <div className="rounded-xl bg-white/10 px-4 py-3 text-sm"><span className="text-indigo-100">{t('common.balance')}</span><strong className="block text-xl">{num(dbUser?.balance).toFixed(4)} {currency}</strong></div>
      </div>
    </section>

    <section className="bg-white rounded-2xl border shadow-sm p-5">
      <div className="flex items-center justify-between gap-3 mb-5"><div><h2 className="font-black text-lg">Choose your service</h2><p className="text-sm text-gray-500">Two simple steps: category → service.</p></div><button type="button" onClick={() => servicesQ.refetch()} className="btn-secondary"><RefreshCw className="w-4 h-4" /> {t('common.refresh')}</button></div>
      {servicesQ.isLoading ? <div className="py-12 text-center text-gray-500">{t('common.loading')}</div> : servicesQ.isError ? <div className="py-10 text-center"><p className="text-red-600 font-semibold mb-3">Failed to load services.</p><button className="btn-primary" onClick={() => servicesQ.refetch()}>{t('common.refresh')}</button></div> : <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="label-primary">1. {t('newOrder.chooseCategory')} / القسم</label><select className="input-primary h-12" value={categoryId} onChange={e => { setCategoryId(e.target.value); setServiceId(''); setQuantity(''); setSearch(''); }}><option value="">Select category</option>{categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="label-primary">2. Service / الخدمة</label><select className="input-primary h-12" disabled={!categoryId} value={serviceId} onChange={e => chooseService(e.target.value)}><option value="">{categoryId ? 'Select service' : 'Select category first'}</option>{visibleServices.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        </div>
        {categoryId && <div className="mt-4 flex flex-col md:flex-row gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" /><input className="input-primary pl-9" placeholder={t('newOrder.searchInCategory')} value={search} onChange={e => setSearch(e.target.value)} /></div><span className="text-sm text-gray-500 self-center">{visibleServices.length} service(s) in this category</span></div>}
      </>}
    </section>

    {selectedService && <section className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      <div className="p-6 border-b bg-gray-50"><div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4"><div><span className="text-xs font-semibold text-indigo-600">{t('newOrder.serviceDetails')}</span><h3 className="text-2xl font-black text-gray-900 mt-1 break-words">{selectedService.name}</h3><span className="sr-only">{t('newOrder.selectedService')}</span><p className="text-sm text-gray-500 mt-1">{selectedService.category?.name}</p></div><button type="button" onClick={() => toggleFavorite(selectedService.id)} className="btn-secondary shrink-0"><Star className={`w-4 h-4 ${favorites.includes(selectedService.id) ? 'fill-yellow-400 text-yellow-500' : ''}`} />{favorites.includes(selectedService.id) ? 'Favorite' : 'Add favorite'}</button></div></div>
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3"><div className="p-4 rounded-xl bg-indigo-50"><span className="text-xs text-gray-500">{singleUnit ? 'Price / item' : 'Rate / 1K'}</span><b className="block text-lg text-indigo-700">{num(selectedService.pricePer1k).toFixed(4)} {currency}</b></div><div className="p-4 rounded-xl bg-gray-50"><span className="text-xs text-gray-500">{t('newOrder.minimum')}</span><b className="block">{Number(selectedService.minQuantity).toLocaleString()}</b></div><div className="p-4 rounded-xl bg-gray-50"><span className="text-xs text-gray-500">{t('newOrder.maximum')}</span><b className="block">{Number(selectedService.maxQuantity).toLocaleString()}</b></div><div className="p-4 rounded-xl bg-emerald-50"><span className="text-xs text-gray-500">Refill</span><b className="block text-emerald-700">{selectedService.refillable ? 'Available' : 'No'}</b></div><div className="p-4 rounded-xl bg-blue-50"><span className="text-xs text-gray-500">Cancel</span><b className="block text-blue-700">{selectedService.cancelable ? 'Available' : 'No'}</b></div><div className="p-4 rounded-xl bg-gray-50"><span className="text-xs text-gray-500">Cashback</span><b className="block">{selectedService.cashbackPercentage || 0}%</b></div></div>
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5"><div className="flex gap-2 items-center font-bold text-gray-900"><Info className="w-4 h-4 text-indigo-600" /> Service information</div><p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap leading-7">{serviceDetails(selectedService)}</p><div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 text-xs"><div className="rounded-xl bg-white border p-3"><span className="text-gray-500">Type</span><b className="block mt-1">{providerMeta.type || "Default"}</b></div><div className="rounded-xl bg-white border p-3"><span className="text-gray-500">Provider ID</span><b className="block mt-1 font-mono">{providerMeta.sourceServiceId || selectedService.providerServiceId || "—"}</b></div><div className="rounded-xl bg-white border p-3"><span className="text-gray-500">Refill</span><b className="block mt-1">{providerMeta.refillable ?? selectedService.refillable ? "Yes" : "No"}</b></div><div className="rounded-xl bg-white border p-3"><span className="text-gray-500">Cancel</span><b className="block mt-1">{providerMeta.cancelable ?? selectedService.cancelable ? "Yes" : "No"}</b></div></div></div>
        <form onSubmit={e => { e.preventDefault(); if (!validQty) return notify.error(singleUnit ? 'This service accepts exactly 1 item.' : t('newOrder.quantityRange', { min: selectedService.minQuantity, max: selectedService.maxQuantity })); if (totalPrice > num(dbUser?.balance)) return notify.error(t('newOrder.insufficientBalance')); order.mutate(); }} className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_260px] gap-4 items-end border-t pt-5">
          <div><label className="label-primary">{singleUnit ? 'Email / Account / Required data' : 'Link'}</label><input required type="text" value={link} onChange={e => setLink(e.target.value)} className="input-primary" placeholder={singleUnit ? 'Enter the email, account ID, or required data' : 'https://...'} /></div>
          {singleUnit ? <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4"><div className="text-xs text-gray-500">Quantity</div><div className="text-xl font-black text-indigo-700 mt-1">1 item — fixed</div><div className="text-xs text-gray-500 mt-1">This service is sold as one package/item. The price above is charged once.</div></div> : <div><label className="label-primary">Quantity</label><input required type="number" value={quantity} min={selectedService.minQuantity} max={selectedService.maxQuantity} onChange={e => setQuantity(e.target.value === '' ? '' : Number(e.target.value))} className="input-primary" placeholder={`${selectedService.minQuantity} - ${selectedService.maxQuantity}`} /><div className="flex flex-wrap gap-2 mt-2">{[selectedService.minQuantity, Math.min(selectedService.maxQuantity, selectedService.minQuantity * 2), Math.min(selectedService.maxQuantity, 1000), Math.min(selectedService.maxQuantity, 10000)].filter((v: number, i: number, a: number[]) => v > 0 && a.indexOf(v) === i).map((v: number) => <button type="button" key={v} onClick={() => setQuantity(v)} className="text-xs px-2 py-1 rounded border hover:border-indigo-400">{v.toLocaleString()}</button>)}</div></div>}
          <div className="rounded-xl bg-gray-950 text-white p-4"><div className="text-xs text-gray-400">{t('newOrder.estimatedCharge')}</div><div className="text-2xl font-black mt-1">{totalPrice.toFixed(4)} {currency}</div><div className="text-xs mt-2">{t('common.balance')}: {num(dbUser?.balance).toFixed(4)} {currency}</div><div className="mt-2 text-xs">{validQty ? <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Valid quantity</span> : <span className="text-amber-300">Enter a quantity within the limits</span>}</div></div>
          <button disabled={order.isPending || !link || !validQty} className="btn-primary lg:col-span-3 w-full">{order.isPending ? 'Placing order...' : 'Confirm order'}</button>
        </form>
      </div>
    </section>}

    {recent.length > 0 && <div className="text-sm text-gray-500 flex gap-2 items-center"><Zap className="w-4 h-4" /> Recent services: {recent.filter(id => services.some((s: any) => s.id === id)).slice(0, 5).map(id => services.find((s: any) => s.id === id)?.name).filter(Boolean).join(' • ')}</div>}
  </div>;
}
