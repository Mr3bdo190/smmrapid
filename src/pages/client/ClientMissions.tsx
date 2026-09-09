import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiJson } from '../../lib/api';
import { useTranslation } from '../../lib/i18n';
import { Target, CheckCircle2, Gift, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ClientMissions() {
  const { user } = useAuth();
  const { t, lang } = useTranslation();
  const qc = useQueryClient();
  const { data: missions = [], isLoading } = useQuery({
    queryKey: ['daily-missions'],
    queryFn: () => apiJson<any[]>('/api/client/missions', user),
    enabled: !!user,
  });
  const claim = useMutation({
    mutationFn: (id:string) => apiJson(`/api/client/missions/${id}/claim`, user, { method:'POST' }),
    onSuccess: (d:any) => { toast.success(`${t('missions.reward')}: ${d.rewardAmount}`); qc.invalidateQueries({queryKey:['daily-missions']}); qc.invalidateQueries({queryKey:['client-me']}); },
    onError: (e:any) => toast.error(e.message)
  });
  const labels:any = {
    orders: lang==='ar' ? 'طلبات اليوم' : 'Orders today',
    deposit: lang==='ar' ? 'إيداعات اليوم' : 'Deposited today',
    referrals: lang==='ar' ? 'إحالات اليوم' : 'Referrals today'
  };
  return <div className="max-w-5xl mx-auto space-y-6">
    <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-7 text-white">
      <div className="flex items-center gap-3"><Target/><div><h1 className="text-2xl font-bold">{t('missions.title')}</h1><p className="opacity-90">{t('missions.subtitle')}</p></div></div>
    </div>
    {isLoading ? <div className="p-10 text-center"><Loader2 className="animate-spin inline-block"/></div> :
    <div className="grid md:grid-cols-3 gap-5">
      {missions.map((m:any)=><div key={m.id} className="bg-white rounded-2xl border p-6 shadow-sm">
        <div className="flex justify-between gap-3"><div><h3 className="font-bold text-lg">{m.title}</h3><p className="text-sm text-gray-500 mt-1">{m.description}</p></div><Gift className="text-violet-600 shrink-0"/></div>
        <div className="mt-5 text-sm text-gray-600">{labels[m.type]}: <b>{Math.min(m.progress,m.target)} / {m.target}</b></div>
        <div className="h-2 bg-gray-100 rounded-full mt-2 overflow-hidden"><div className="h-full bg-indigo-600" style={{width:`${Math.min(100,(m.progress/m.target)*100)}%`}}/></div>
        <div className="mt-4 flex items-center justify-between"><span className="font-bold text-emerald-600">+{m.rewardAmount}</span>
          {m.claimed ? <span className="text-sm text-gray-400 flex gap-1"><CheckCircle2 size={16}/> {t('missions.claimed')}</span> :
           <button disabled={!m.completed||claim.isPending} onClick={()=>claim.mutate(m.id)} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-40">{claim.isPending?t('common.loading'):t('missions.claim')}</button>}
        </div>
      </div>)}
    </div>}
  </div>;
}
