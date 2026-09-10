import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Search, Star, ShoppingCart, CheckCircle2, RefreshCw, Ban, Zap, Info } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { useTranslation } from '../../lib/i18n';

const readError = async (res: Response, fallback: string) => { const b = await res.json().catch(()=>({})); return b?.error || b?.message || fallback; };
const num = (v:any) => Number(v || 0);

export default function ClientNewOrder() {
  const { user, dbUser } = useAuth();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [categoryId,setCategoryId]=useState('');
  const [serviceId,setServiceId]=useState('');
  const [search,setSearch]=useState('');
  const [link,setLink]=useState('');
  const [quantity,setQuantity]=useState<number|''>('');
  const [favorites,setFavorites]=useState<string[]>(()=>JSON.parse(localStorage.getItem('favoriteServices')||'[]'));
  const [recent,setRecent]=useState<string[]>(()=>JSON.parse(localStorage.getItem('recentServices')||'[]'));

  const {data:services=[],isLoading,isError,refetch}=useQuery({
    queryKey:['client-services'], enabled:!!user,
    queryFn:async()=>{ const tok=await user!.getIdToken(); const r=await apiFetch('/api/client/services',user,{headers:{Authorization:`Bearer ${tok}`}}); if(!r.ok)throw new Error(await readError(r,'Failed to load services')); return r.json(); }
  });
  const categories=useMemo(()=>Array.from(new Map(services.map((s:any)=>[s.category?.id,s.category])).values()).filter(Boolean).sort((a:any,b:any)=>a.sortOrder-b.sortOrder),[services]);
  const categoryServices=useMemo(()=>services.filter((s:any)=>s.category?.id===categoryId && s.name.toLowerCase().includes(search.toLowerCase())).sort((a:any,b:any)=>a.sortOrder-b.sortOrder),[services,categoryId,search]);
  const selectedService=services.find((s:any)=>s.id===serviceId);
  const providerMeta=selectedService?.providerMeta || {};
  const totalPrice=selectedService&&quantity?num(selectedService.pricePer1k)*Number(quantity)/1000:0;
  const currency=(t('common.currency')||'EGP');
  const toggleFavorite=(id:string)=>{const next=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];setFavorites(next);localStorage.setItem('favoriteServices',JSON.stringify(next));};
  const chooseService=(id:string)=>{setServiceId(id);const next=[id,...recent.filter(x=>x!==id)].slice(0,8);setRecent(next);localStorage.setItem('recentServices',JSON.stringify(next));};
  const order=useMutation({mutationFn:async()=>{const tok=await user!.getIdToken();const r=await apiFetch('/api/client/orders',user,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${tok}`},body:JSON.stringify({serviceId,link,quantity:Number(quantity)})});if(!r.ok)throw new Error(await readError(r,'Failed to place order'));return r.json();},onSuccess:()=>{toast.success(t('newOrder.orderPlaced'));setLink('');setQuantity('');qc.invalidateQueries({queryKey:['client-orders']});qc.invalidateQueries({queryKey:['client-dashboard']});qc.invalidateQueries({queryKey:['client-me']});},onError:(e:any)=>toast.error(e.message)});
  const validQty=!!selectedService && typeof quantity==='number' && quantity>=selectedService.minQuantity && quantity<=selectedService.maxQuantity;

  return <div className="space-y-6 max-w-7xl mx-auto" dir="auto">
    <div className="rounded-2xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 text-white p-6 md:p-8 shadow-lg">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div><div className="text-indigo-200 text-sm mb-1">RapidSMM</div><h2 className="text-2xl md:text-3xl font-black flex items-center gap-2"><ShoppingCart/> {t('newOrder.title')}</h2><p className="text-indigo-100/80 mt-2">{t('newOrder.subtitle')}</p></div>
        <div className="rounded-xl bg-white/10 px-4 py-3 text-sm"><span className="text-indigo-200">{t('common.balance')}</span><strong className="block text-xl">{num(dbUser?.balance).toFixed(4)} {currency}</strong></div>
      </div>
    </div>

    {isError && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 flex items-center justify-between"><span>تعذر تحميل الخدمات.</span><button onClick={()=>refetch()} className="btn-secondary"><RefreshCw className="w-4 h-4"/> إعادة المحاولة</button></div>}

    <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-6">
      <aside className="bg-white rounded-2xl border shadow-sm p-4 h-fit xl:sticky xl:top-4">
        <label className="label-primary">1. اختر القسم</label>
        <div className="space-y-2 mt-3">
          {categories.map((c:any)=><button key={c.id} onClick={()=>{setCategoryId(c.id);setServiceId('');setSearch('');}} className={`w-full text-right rounded-xl px-4 py-3 border transition ${categoryId===c.id?'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm':'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'}`}><span className="font-semibold">{c.name}</span><span className="block text-xs text-gray-500 mt-1">{services.filter((s:any)=>s.category?.id===c.id).length} خدمة</span></button>)}
          {!categories.length&&!isLoading&&<div className="text-sm text-gray-500 p-3">لا توجد أقسام متاحة حالياً.</div>}
        </div>
      </aside>

      <section className="space-y-5">
        {!categoryId ? <div className="bg-white rounded-2xl border shadow-sm min-h-[420px] flex items-center justify-center text-center p-8"><div><div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4"><ShoppingCart/></div><h3 className="text-xl font-bold">{t('newOrder.chooseCategory')}</h3><p className="text-gray-500 mt-2 max-w-md">لن نعرض لك أسماء مزودين أو بيانات داخلية. هتشوف اسم الخدمة بالكامل، وصفها، السعر، الحدود، والخصائص التي تم مزامنتها من مصدر التنفيذ.</p></div></div> : <>
          <div className="bg-white rounded-2xl border shadow-sm p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between"><div><h3 className="font-bold text-lg">{categories.find((c:any)=>c.id===categoryId)?.name}</h3><p className="text-sm text-gray-500">{categoryServices.length} خدمة مطابقة</p></div><div className="relative w-full md:w-96"><Search className="absolute left-3 top-3 w-4 h-4 text-gray-400"/><input className="input-primary pl-9" placeholder={t('newOrder.searchInCategory')} value={search} onChange={e=>setSearch(e.target.value)}/></div></div>
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
            {categoryServices.map((s:any)=><button key={s.id} type="button" onClick={()=>chooseService(s.id)} className={`text-left rounded-2xl border bg-white p-5 hover:shadow-md transition ${serviceId===s.id?'border-indigo-500 ring-2 ring-indigo-100':'border-gray-100'}`}>
              <div className="flex items-start justify-between gap-3"><div><div className="text-xs text-indigo-600 font-semibold mb-1">SERVICE #{s.providerServiceId || '—'}</div><h4 className="font-bold text-gray-900 leading-6 break-words">{s.name}</h4></div><Star onClick={(e)=>{e.stopPropagation();toggleFavorite(s.id)}} className={`shrink-0 w-5 h-5 ${favorites.includes(s.id)?'fill-yellow-400 text-yellow-500':'text-gray-300'}`}/></div>
              <p className="text-sm text-gray-500 mt-3 line-clamp-3">{s.description || `${t('newOrder.serviceDetails')} متاحة عند اختيار الخدمة.`}</p>
              <div className="grid grid-cols-3 gap-2 mt-4 text-xs"><div className="rounded-lg bg-gray-50 p-2"><span className="text-gray-400 block">{t('newOrder.rate1k')}</span><b>{num(s.pricePer1k).toFixed(4)} {currency}</b></div><div className="rounded-lg bg-gray-50 p-2"><span className="text-gray-400 block">{t('newOrder.minimum')}</span><b>{Number(s.minQuantity).toLocaleString()}</b></div><div className="rounded-lg bg-gray-50 p-2"><span className="text-gray-400 block">{t('newOrder.maximum')}</span><b>{Number(s.maxQuantity).toLocaleString()}</b></div></div>
            </button>)}
          </div>
        </>}
      </section>
    </div>

    {selectedService && <section className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      <div className="p-6 border-b bg-gray-50"><div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4"><div><span className="text-xs font-semibold text-indigo-600">{t('newOrder.serviceDetails')}</span><h3 className="text-2xl font-black text-gray-900 mt-1 break-words">{selectedService.name}</h3><span className="sr-only">{t('newOrder.selectedService')}</span><p className="text-sm text-gray-500 mt-1">{selectedService.category?.name}</p></div><button onClick={()=>toggleFavorite(selectedService.id)} className="btn-secondary shrink-0"><Star className={`w-4 h-4 ${favorites.includes(selectedService.id)?'fill-yellow-400 text-yellow-500':''}`}/>{favorites.includes(selectedService.id)?'مفضلة':'إضافة للمفضلة'}</button></div></div>
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3"><div className="p-4 rounded-xl bg-indigo-50"><span className="text-xs text-gray-500">سعر البيع / 1K</span><b className="block text-lg text-indigo-700">{num(selectedService.pricePer1k).toFixed(4)} {currency}</b></div><div className="p-4 rounded-xl bg-gray-50"><span className="text-xs text-gray-500">{t('newOrder.minimum')}</span><b className="block">{Number(selectedService.minQuantity).toLocaleString()}</b></div><div className="p-4 rounded-xl bg-gray-50"><span className="text-xs text-gray-500">{t('newOrder.maximum')}</span><b className="block">{Number(selectedService.maxQuantity).toLocaleString()}</b></div><div className="p-4 rounded-xl bg-emerald-50"><span className="text-xs text-gray-500">Refill</span><b className="block text-emerald-700">{selectedService.refillable?'متاح':'غير متاح'}</b></div><div className="p-4 rounded-xl bg-blue-50"><span className="text-xs text-gray-500">Cancel</span><b className="block text-blue-700">{selectedService.cancelable?'متاح':'غير متاح'}</b></div><div className="p-4 rounded-xl bg-gray-50"><span className="text-xs text-gray-500">Cashback</span><b className="block">{selectedService.cashbackPercentage||0}%</b></div></div>
        <div className="rounded-xl border p-4"><div className="flex gap-2 items-center font-bold"><Info className="w-4 h-4 text-indigo-600"/> وصف وبيانات الخدمة</div><p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap leading-7">{selectedService.description || 'لا يوجد وصف إضافي مقدم من المصدر حالياً.'}</p>{providerMeta.dripfeed && <p className="text-xs text-gray-500 mt-3">Drip-feed: متاح حسب بيانات مصدر التنفيذ.</p>}</div>
        <form onSubmit={e=>{e.preventDefault();if(!validQty)return toast.error(t('newOrder.quantityRange',{min:selectedService.minQuantity,max:selectedService.maxQuantity}));if(totalPrice>num(dbUser?.balance))return toast.error(t('newOrder.insufficientBalance'));order.mutate()}} className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_260px] gap-4 items-end border-t pt-5">
          <div><label className="label-primary">الرابط / Link</label><input required type="url" value={link} onChange={e=>setLink(e.target.value)} className="input-primary" placeholder="https://..."/></div>
          <div><label className="label-primary">الكمية / Quantity</label><input required type="number" value={quantity} min={selectedService.minQuantity} max={selectedService.maxQuantity} onChange={e=>setQuantity(e.target.value===''?'':Number(e.target.value))} className="input-primary" placeholder={`${selectedService.minQuantity} - ${selectedService.maxQuantity}`}/><div className="flex flex-wrap gap-2 mt-2">{[selectedService.minQuantity,Math.min(selectedService.maxQuantity,selectedService.minQuantity*2),Math.min(selectedService.maxQuantity,1000),Math.min(selectedService.maxQuantity,10000)].filter((v,i,a)=>v>0&&a.indexOf(v)===i).map(v=><button type="button" key={v} onClick={()=>setQuantity(v)} className="text-xs px-2 py-1 rounded border hover:border-indigo-400">{v.toLocaleString()}</button>)}</div></div>
          <div className="rounded-xl bg-gray-950 text-white p-4"><div className="text-xs text-gray-400">{t('newOrder.estimatedCharge')}</div><div className="text-2xl font-black mt-1">{totalPrice.toFixed(4)} {currency}</div><div className="text-xs mt-2">الرصيد: {num(dbUser?.balance).toFixed(4)} {currency}</div><div className="mt-2 text-xs">{validQty?<span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> الكمية صحيحة</span>:<span className="text-amber-300">أدخل كمية داخل الحدود</span>}</div></div>
          <button disabled={order.isPending||!link||!validQty} className="btn-primary lg:col-span-3 w-full">{order.isPending?'جاري تنفيذ الطلب...':'تأكيد الطلب'}</button>
        </form>
      </div>
    </section>}

    {recent.length>0 && <div className="text-sm text-gray-500 flex gap-2 items-center"><Zap className="w-4 h-4"/> آخر الخدمات: {recent.filter(id=>services.some((s:any)=>s.id===id)).slice(0,5).map(id=>services.find((s:any)=>s.id===id)?.name).filter(Boolean).join(' • ')}</div>}
  </div>;
}
