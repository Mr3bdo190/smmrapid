import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { Users, Copy, MousePointerClick, UserPlus, Wallet, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '../../lib/i18n';

export default function ClientAffiliates() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const query = useQuery({ queryKey:['client-affiliates-stats'], enabled:!!user, queryFn:async()=>{
    const token=await user!.getIdToken(); const res=await apiFetch('/api/client/affiliates/stats',user,{headers:{Authorization:`Bearer ${token}`}});
    if(!res.ok){let b:any={};try{b=await res.json()}catch{} throw new Error(b.error||'Failed to load affiliate stats');} return res.json();
  }});
  const stats=query.data; const refLink=stats?.referralLink || (stats?.referralCode?`${window.location.origin}/?ref=${stats.referralCode}`:'');
  const copy=async()=>{if(!refLink)return toast.error(t('affiliates.linkNotReady'));try{await navigator.clipboard.writeText(refLink);toast.success(t('affiliates.linkCopied'));}catch{toast.error(t('affiliates.copyFailed'))}};
  return <div className="space-y-6 max-w-6xl">
    <div className="flex items-center justify-between"><div><h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Users className="text-indigo-600"/> {t('affiliates.title')}</h2><p className="text-sm text-gray-500 mt-1">{t('affiliates.subtitle')}</p></div><button className="btn-secondary" onClick={()=>query.refetch()}><RefreshCw className="w-4 h-4 inline mr-1"/>{t('common.refresh')}</button></div>
    <div className="bg-white rounded-xl border p-6"><h3 className="font-bold mb-2">{t('affiliates.yourLink')}</h3><p className="text-sm text-gray-500 mb-4">{t('affiliates.linkHint')}</p><div className="flex flex-col md:flex-row gap-3"><input readOnly value={query.isLoading?t('common.loading'):refLink||t('affiliates.generating')} className="input-field flex-1 font-mono text-sm bg-gray-50"/><button onClick={copy} className="btn-primary"><Copy className="w-4 h-4 inline mr-1"/>{t('affiliates.copyLink')}</button></div><div className="mt-3 text-xs text-gray-500">{t('affiliates.code')} <span className="font-mono font-bold">{stats?.referralCode||'—'}</span></div></div>
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">{[[t('affiliates.clicks'),stats?.clicks||0,MousePointerClick],[t('affiliates.signups'),stats?.signups||0,UserPlus],[t('affiliates.paidReferrals'),stats?.paidReferrals||0,Users],[t('affiliates.referralDeposits'),`$${Number(stats?.referralDeposits||0).toFixed(2)}`,Wallet],[t('affiliates.earnings'),`$${Number(stats?.totalCommission||0).toFixed(2)}`,Wallet]].map(([l,v,I]:any)=><div key={l} className="bg-white p-5 rounded-xl border"><I className="w-5 h-5 text-indigo-600 mb-3"/><p className="text-xs text-gray-500">{l}</p><p className="text-2xl font-bold mt-1">{v}</p></div>)}</div>
    <div className="bg-white border rounded-xl overflow-x-auto"><div className="p-4 border-b font-bold">{t('affiliates.referredUsers')}</div><table className="min-w-[700px] w-full"><thead className="bg-gray-50"><tr>{[t('affiliates.user'),t('common.status'),t('affiliates.joined')].map(h=><th key={h} className="px-4 py-3 text-left text-xs text-gray-500 uppercase">{h}</th>)}</tr></thead><tbody className="divide-y">{stats?.referred?.length?stats.referred.map((u:any)=><tr key={u.id}><td className="px-4 py-3 text-sm">{u.email}</td><td className="px-4 py-3 text-sm">{u.status}</td><td className="px-4 py-3 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td></tr>):<tr><td colSpan={3} className="p-8 text-center text-gray-500">{t('affiliates.noReferrals')}</td></tr>}</tbody></table></div>
    <div className="bg-white border rounded-xl overflow-x-auto"><div className="p-4 border-b font-bold">{t('affiliates.commissionHistory')}</div><table className="min-w-[700px] w-full"><thead className="bg-gray-50"><tr>{[t('affiliates.referredUser'),t('affiliates.payment'),t('affiliates.commission'),t('transactions.date')].map(h=><th key={h} className="px-4 py-3 text-left text-xs text-gray-500 uppercase">{h}</th>)}</tr></thead><tbody className="divide-y">{stats?.commissions?.length?stats.commissions.map((c:any)=><tr key={c.id}><td className="px-4 py-3 text-sm">{c.referredEmail}</td><td className="px-4 py-3 font-mono text-xs">{c.paymentId?.slice(0,8)}</td><td className="px-4 py-3 text-emerald-600 font-semibold">${Number(c.amount).toFixed(4)}</td><td className="px-4 py-3 text-xs">{new Date(c.createdAt).toLocaleString()}</td></tr>):<tr><td colSpan={4} className="p-8 text-center text-gray-500">{t('affiliates.noCommissions')}</td></tr>}</tbody></table></div>
  </div>;
}
