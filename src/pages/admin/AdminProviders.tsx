import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { Server, Plus, Trash2, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

async function apiError(res: Response, fallback: string) { const d = await res.json().catch(() => ({})); return d?.error || fallback; }

export default function AdminProviders() {
  const { user } = useAuth(); const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', apiUrl: '', apiKey: '', profitMargin: 50, status: 'active' });
  const { data: providers = [], isLoading, isError, error } = useQuery({
    queryKey: ['admin-providers'], enabled: !!user,
    queryFn: async () => { const token = await user?.getIdToken(); const res = await apiFetch('/api/admin/providers', user, { headers: { Authorization: `Bearer ${token}` } }); if (!res.ok) throw new Error(await apiError(res,'Failed to load providers')); return res.json(); }
  });
  const createMutation = useMutation({
    mutationFn: async () => { const token = await user?.getIdToken(); const res = await apiFetch('/api/admin/providers', user, { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`}, body:JSON.stringify(form) }); if(!res.ok) throw new Error(await apiError(res,'Failed to create provider')); return res.json(); },
    onSuccess:()=>{toast.success('Provider added');setOpen(false);setForm({name:'',apiUrl:'',apiKey:'',profitMargin:50,status:'active'});queryClient.invalidateQueries({queryKey:['admin-providers']});},
    onError:(e:any)=>toast.error(e.message)
  });
  const deleteMutation = useMutation({
    mutationFn: async (id:string)=>{const token=await user?.getIdToken();const res=await apiFetch(`/api/admin/providers/${id}`,user,{method:'DELETE',headers:{Authorization:`Bearer ${token}`}});if(!res.ok)throw new Error(await apiError(res,'Failed to deactivate provider'));return res.json();},
    onSuccess:()=>{toast.success('Provider deactivated');queryClient.invalidateQueries({queryKey:['admin-providers']});},onError:(e:any)=>toast.error(e.message)
  });
  return <div className="space-y-6">
    <div className="flex justify-between items-center gap-3"><h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Server className="w-5 h-5"/> API Providers</h3><button type="button" onClick={()=>setOpen(true)} className="btn-primary"><Plus className="w-4 h-4 mr-2 inline"/> Add Provider</button></div>
    {open && <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"><form onSubmit={e=>{e.preventDefault();createMutation.mutate()}} className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg space-y-4">
      <div className="flex justify-between items-center"><h4 className="text-lg font-bold">Add Provider</h4><button type="button" onClick={()=>setOpen(false)}><X/></button></div>
      <input required className="input-primary w-full" placeholder="Provider name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
      <input required type="url" className="input-primary w-full" placeholder="https://provider.example/api/v2" value={form.apiUrl} onChange={e=>setForm({...form,apiUrl:e.target.value})}/>
      <input required type="password" className="input-primary w-full" placeholder="API key" value={form.apiKey} onChange={e=>setForm({...form,apiKey:e.target.value})}/>
      <input required type="number" min="0" max="10000" className="input-primary w-full" placeholder="Profit margin %" value={form.profitMargin} onChange={e=>setForm({...form,profitMargin:Number(e.target.value)})}/>
      <div className="flex gap-3 justify-end"><button type="button" onClick={()=>setOpen(false)} className="btn-secondary">Cancel</button><button disabled={createMutation.isPending} className="btn-primary">{createMutation.isPending?'Saving...':'Save'}</button></div>
    </form></div>}
    {isError && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{(error as Error)?.message}</div>}
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-100">
      <thead className="bg-gray-50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Name</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">URL</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Balance</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th></tr></thead>
      <tbody className="bg-white divide-y divide-gray-100">{isLoading && <tr><td colSpan={5} className="px-6 py-8 text-center">Loading...</td></tr>}{!isLoading && providers.length===0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No providers found.</td></tr>}{providers.map((p:any)=><ProviderRow key={p.id} p={p} user={user} onDelete={()=>deleteMutation.mutate(p.id)} deleting={deleteMutation.isPending}/>)}</tbody>
    </table></div></div>
  </div>;
}

function ProviderRow({p,user,onDelete,deleting}:{p:any,user:any,onDelete:()=>void,deleting:boolean}) {
  const queryClient=useQueryClient();
  const {data:balance,isLoading}=useQuery({queryKey:['provider-balance',p.id],enabled:!!user,queryFn:async()=>{const token=await user?.getIdToken();const res=await apiFetch(`/api/admin/providers/${p.id}/balance`,user,{headers:{Authorization:`Bearer ${token}`}});if(!res.ok)throw new Error(await apiError(res,'Provider balance unavailable'));return res.json();}});
  const sync=useMutation({mutationFn:async()=>{const token=await user?.getIdToken();const res=await apiFetch(`/api/admin/providers/${p.id}/sync`,user,{method:'POST',headers:{Authorization:`Bearer ${token}`}});if(!res.ok)throw new Error(await apiError(res,'Provider synchronization failed'));return res.json();},onSuccess:d=>{toast.success(`Synced ${d.synced??0} services (${d.created??0} new, ${d.updated??0} updated)`);queryClient.invalidateQueries({queryKey:['admin-services']});},onError:(e:any)=>toast.error(e.message)});
  return <tr><td className="px-6 py-4 text-sm font-medium">{p.name}</td><td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{p.apiUrl}</td><td className="px-6 py-4 text-sm">{isLoading?'...':balance?`${balance.balance??'0'} ${balance.currency||''}`:'Unavailable'}</td><td className="px-6 py-4 text-sm">{p.status}</td><td className="px-6 py-4 text-sm"><div className="flex gap-3"><button type="button" onClick={()=>sync.mutate()} disabled={sync.isPending} className="text-blue-600 hover:underline disabled:opacity-50"><RefreshCw className="w-4 h-4 inline mr-1"/>{sync.isPending?'Syncing...':'Sync'}</button><button type="button" onClick={()=>{if(confirm(`Deactivate ${p.name}?`))onDelete()}} disabled={deleting} className="text-red-600 hover:underline disabled:opacity-50"><Trash2 className="w-4 h-4 inline mr-1"/>Deactivate</button></div></td></tr>;
}
