import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiJson } from '../../lib/api';
import { Plus, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function AdminMissions(){
 const {user}=useAuth(); const qc=useQueryClient();
 const {data:missions=[],isLoading}=useQuery({queryKey:['admin-missions'],queryFn:()=>apiJson<any[]>('/api/admin/missions',user),enabled:!!user});
 const [form,setForm]=useState<any>({title:'',description:'',type:'orders',target:1,rewardAmount:1});
 const save=useMutation({mutationFn:(body:any)=>apiJson('/api/admin/missions',user,{method:'POST',body:JSON.stringify(body)}),onSuccess:()=>{toast.success('Mission created');qc.invalidateQueries({queryKey:['admin-missions']});setForm({title:'',description:'',type:'orders',target:1,rewardAmount:1})},onError:(e:any)=>toast.error(e.message)});
 const toggle=useMutation({mutationFn:(m:any)=>apiJson(`/api/admin/missions/${m.id}`,user,{method:'PUT',body:JSON.stringify({...m,status:m.status==='active'?'inactive':'active'})}),onSuccess:()=>qc.invalidateQueries({queryKey:['admin-missions']})});
 const del=useMutation({mutationFn:(id:string)=>apiJson(`/api/admin/missions/${id}`,user,{method:'DELETE'}),onSuccess:()=>qc.invalidateQueries({queryKey:['admin-missions']})});
 return <div className="max-w-6xl mx-auto space-y-6"><div><h1 className="text-2xl font-bold">Daily Missions</h1><p className="text-gray-500">Control daily tasks, rewards and engagement.</p></div>
 <div className="bg-white border rounded-2xl p-6"><h2 className="font-bold mb-4">Create mission</h2><div className="grid md:grid-cols-5 gap-3">
  <input className="border rounded-lg p-2" placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
  <input className="border rounded-lg p-2" placeholder="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
  <select className="border rounded-lg p-2" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="orders">Orders</option><option value="deposit">Deposit</option><option value="referrals">Referrals</option></select>
  <input className="border rounded-lg p-2" type="number" min="1" placeholder="Target" value={form.target} onChange={e=>setForm({...form,target:Number(e.target.value)})}/>
  <div className="flex gap-2"><input className="border rounded-lg p-2 w-full" type="number" min="0.01" step="0.01" placeholder="Reward" value={form.rewardAmount} onChange={e=>setForm({...form,rewardAmount:Number(e.target.value)})}/><button onClick={()=>save.mutate(form)} className="bg-indigo-600 text-white px-4 rounded-lg"><Plus/></button></div>
 </div></div>
 <div className="bg-white border rounded-2xl overflow-hidden">{isLoading?'Loading...':<table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="p-3 text-left">Mission</th><th className="p-3">Type</th><th className="p-3">Target</th><th className="p-3">Reward</th><th className="p-3">Claims today</th><th className="p-3">Actions</th></tr></thead><tbody>{missions.map((m:any)=><tr key={m.id} className="border-t"><td className="p-3"><b>{m.title}</b><div className="text-gray-500">{m.description}</div></td><td className="p-3 text-center">{m.type}</td><td className="p-3 text-center">{m.target}</td><td className="p-3 text-center">{m.rewardAmount}</td><td className="p-3 text-center">{m.claimsToday}</td><td className="p-3 text-center space-x-2"><button onClick={()=>toggle.mutate(m)} className="px-3 py-1 rounded bg-gray-100">{m.status==='active'?'Disable':'Enable'}</button><button onClick={()=>del.mutate(m.id)} className="px-3 py-1 rounded bg-red-50 text-red-600"><Trash2 size={16}/></button></td></tr>)}</tbody></table>}</div>
 </div>
}
