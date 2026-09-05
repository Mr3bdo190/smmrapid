import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Search, Star, Copy, Clock3, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { useTranslation } from '../../lib/i18n';

const readError = async (res: Response, fallback: string) => { const b = await res.json().catch(()=>({})); return b?.error || b?.message || fallback; };

export default function ClientNewOrder() {
  const { user, dbUser } = useAuth(); const qc = useQueryClient(); const { t } = useTranslation();
  const [categoryId,setCategoryId]=useState(''); const [serviceId,setServiceId]=useState(''); const [search,setSearch]=useState('');
  const [link,setLink]=useState(''); const [quantity,setQuantity]=useState<number|''>('');
  const [favorites,setFavorites]=useState<string[]>(()=>JSON.parse(localStorage.getItem('favoriteServices')||'[]'));
  const [recent,setRecent]=useState<string[]>(()=>JSON.parse(localStorage.getItem('recentServices')||'[]'));
  const {data:services=[],isLoading}=useQuery({queryKey:['client-services'],enabled:!!user,queryFn:async()=>{const t=await user!.getIdToken();const r=await apiFetch('/api/client/services',user,{headers:{Authorization:`Bearer ${t}`}});if(!r.ok)throw new Error(await readError(r,'Failed to load services'));return r.json();}});
  const categories=useMemo(()=>Array.from(new Map(services.map((s:any)=>[s.category?.id,s.category])).values()).filter(Boolean).sort((a:any,b:any)=>a.sortOrder-b.sortOrder),[services]);
  const categoryServices=useMemo(()=>services.filter((s:any)=>s.category?.id===categoryId && s.name.toLowerCase().includes(search.toLowerCase())),[services,categoryId,search]);
  const selectedService=services.find((s:any)=>s.id===serviceId);
  const totalPrice=selectedService&&quantity?Number(selectedService.pricePer1k)*Number(quantity)/1000:0;
  const toggleFavorite=(id:string)=>{const next=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];setFavorites(next);localStorage.setItem('favoriteServices',JSON.stringify(next));};
  const chooseService=(id:string)=>{setServiceId(id);const next=[id,...recent.filter(x=>x!==id)].slice(0,8);setRecent(next);localStorage.setItem('recentServices',JSON.stringify(next));};
  const order=useMutation({mutationFn:async()=>{const t=await user!.getIdToken();const r=await apiFetch('/api/client/orders',user,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${t}`},body:JSON.stringify({serviceId,link,quantity:Number(quantity)})});if(!r.ok)throw new Error(await readError(r,'Failed to place order'));return r.json();},onSuccess:()=>{toast.success('Order placed successfully');setLink('');setQuantity('');qc.invalidateQueries({queryKey:['client-orders']});qc.invalidateQueries({queryKey:['client-dashboard']});qc.invalidateQueries({queryKey:['client-me']});},onError:(e:any)=>toast.error(e.message)});
  const copy=async(text:string)=>{await navigator.clipboard?.writeText(text);toast.success('Copied');};
  const validQty=!!selectedService && typeof quantity==='number' && quantity>=selectedService.minQuantity && quantity<=selectedService.maxQuantity;
  return <div className="space-y-6 max-w-6xl mx-auto">
    <div><h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><ShoppingCart className="text-indigo-600"/> Create New Order</h2><p className="text-sm text-gray-500 mt-1">Choose a category first, then select a service to see all details.</p></div>
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-5">
        <div><label className="label-primary">1. Category</label><select value={categoryId} onChange={e=>{setCategoryId(e.target.value);setServiceId('');}} className="input-primary"><option value="">Choose a category</option>{categories.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        {categoryId && <div><label className="label-primary">2. Service</label><div className="relative mb-3"><Search className="absolute left-3 top-3 w-4 h-4 text-gray-400"/><input className="input-primary pl-9" placeholder="Search services in this category..." value={search} onChange={e=>setSearch(e.target.value)}/></div><select value={serviceId} onChange={e=>chooseService(e.target.value)} className="input-primary" size={Math.min(8,Math.max(3,categoryServices.length))}>{categoryServices.map((s:any)=><option key={s.id} value={s.id}>{s.name} — {Number(s.pricePer1k).toFixed(4)} {t('common.currency')}/1K</option>)}</select>{!categoryServices.length&&<p className="text-sm text-gray-500 mt-2">No active services found in this category.</p>}</div>}
        <div className="flex flex-wrap gap-2">{recent.filter(id=>services.some((s:any)=>s.id===id)).slice(0,5).map(id=>{const s=services.find((x:any)=>x.id===id);return <button key={id} type="button" onClick={()=>{setCategoryId(s.category.id);chooseService(id)}} className="text-xs px-2 py-1 rounded-full bg-gray-100 hover:bg-indigo-50">Recent: {s.name.slice(0,28)}</button>})}</div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        {!selectedService?<div className="h-full min-h-[320px] flex items-center justify-center text-center text-gray-400">Select a service to view its full details.</div>:<div className="space-y-5">
          <div className="flex justify-between gap-3"><div><p className="text-xs text-gray-500">Selected service</p><h3 className="text-xl font-bold text-gray-900">{selectedService.name}</h3><p className="text-sm text-indigo-600">{selectedService.category?.name}</p></div><button type="button" onClick={()=>toggleFavorite(selectedService.id)} className="p-2 rounded-lg border hover:bg-gray-50" title="Favorite"><Star className={`w-5 h-5 ${favorites.includes(selectedService.id)?'fill-yellow-400 text-yellow-500':'text-gray-400'}`}/></button></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><div className="p-3 bg-indigo-50 rounded-lg"><span className="text-xs text-gray-500">Rate / 1K</span><b className="block text-indigo-700">{Number(selectedService.pricePer1k).toFixed(4)} {t('common.currency')}</b></div><div className="p-3 bg-gray-50 rounded-lg"><span className="text-xs text-gray-500">Minimum</span><b className="block">{selectedService.minQuantity}</b></div><div className="p-3 bg-gray-50 rounded-lg"><span className="text-xs text-gray-500">Maximum</span><b className="block">{selectedService.maxQuantity}</b></div><div className="p-3 bg-emerald-50 rounded-lg"><span className="text-xs text-gray-500">Cashback</span><b className="block text-emerald-700">{selectedService.cashbackPercentage||0}%</b></div></div>
          {selectedService.description&&<div className="rounded-lg border bg-gray-50 p-4 text-sm whitespace-pre-wrap"><b className="block mb-1">Service details</b>{selectedService.description}</div>}
          <button type="button" onClick={()=>copy(selectedService.id)} className="text-xs text-gray-500 hover:text-indigo-600 flex items-center gap-1"><Copy className="w-3 h-3"/> Copy Service ID</button>
          <form onSubmit={e=>{e.preventDefault();if(!validQty)return toast.error(`Quantity must be between ${selectedService.minQuantity} and ${selectedService.maxQuantity}`);if(totalPrice>Number(dbUser?.balance||0))return toast.error('Insufficient balance');order.mutate()}} className="space-y-4 border-t pt-5">
            <div><label className="label-primary">Target Link</label><input required type="url" value={link} onChange={e=>setLink(e.target.value)} className="input-primary" placeholder="https://..."/></div>
            <div><label className="label-primary">Quantity</label><input required type="number" value={quantity} min={selectedService.minQuantity} max={selectedService.maxQuantity} onChange={e=>setQuantity(e.target.value===''?'':Number(e.target.value))} className="input-primary" placeholder={`${selectedService.minQuantity} - ${selectedService.maxQuantity}`}/><div className="flex gap-2 mt-2">{[selectedService.minQuantity,Math.min(selectedService.maxQuantity,selectedService.minQuantity*2),Math.min(selectedService.maxQuantity,1000)].filter((v,i,a)=>v>0&&a.indexOf(v)===i).map(v=><button type="button" key={v} onClick={()=>setQuantity(v)} className="text-xs px-2 py-1 rounded border">{v.toLocaleString()}</button>)}</div></div>
            <div className="rounded-xl bg-gray-900 text-white p-4 flex justify-between items-center"><div><span className="text-xs text-gray-400">Estimated charge</span><div className="text-2xl font-bold">{totalPrice.toFixed(4)} {t('common.currency')}</div></div><div className="text-right text-xs text-gray-400">Balance: {Number(dbUser?.balance||0).toFixed(4)} {t('common.currency')}<br/>{validQty?<span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Quantity valid</span>:<span>Enter a valid quantity</span>}</div></div>
            <button disabled={order.isPending||!link||!validQty} className="btn-primary w-full">{order.isPending?'Placing...':'Place Order'}</button>
          </form>
        </div>}
      </div>
    </div>
  </div>;
}
