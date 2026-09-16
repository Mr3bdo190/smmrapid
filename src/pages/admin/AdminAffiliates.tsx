import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, RefreshCw, Users, MousePointerClick, Wallet, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';

const readError = async (r: Response) => { try { const b = await r.json(); return b?.error || b?.message || `Request failed (${r.status})`; } catch { return `Request failed (${r.status})`; } };

export default function AdminAffiliates() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const query = useQuery({
    queryKey: ['admin-affiliates'], enabled: !!user, queryFn: async () => {
      const token = await user!.getIdToken();
      const r = await apiFetch('/api/admin/affiliates', user, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(await readError(r));
      return r.json();
    }
  });
  const data = query.data || { summary: {}, affiliates: [], recentCommissions: [] };
  const rows = useMemo(() => (data.affiliates || []).filter((x:any) => `${x.name || ''} ${x.email || ''} ${x.referralCode || ''}`.toLowerCase().includes(q.toLowerCase())), [data.affiliates, q]);
  const s = data.summary || {};
  return <div className="space-y-6">
    <div className="flex-wrap items-center justify-between gap-3">
      <div><h3 className="text-xl font-bold text-on-surface">Affiliate Control Center</h3><p className="text-sm text-on-surface-variant">Track referrals, signups, deposits and commissions.</p></div>
      <button className="btn-secondary" onClick={() => query.refetch()}><RefreshCw className="w-4 h-4 inline mr-1"/>Refresh</button>
    </div>
    <div className="grid-cols-2 lg:grid-cols-4 gap-4">
      {[['Clicks',s.clicks||0,MousePointerClick],['Signups',s.signups||0,Users],['Referral Deposits',s.deposited||0,TrendingUp],['Commissions',s.commissions||0,Wallet]].map(([label,value,Icon]:any)=><div key={label} className="bg-surface-container border-outline-variant rounded-xl p-5 shadow-sm"><Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-3"/><p className="text-xs text-on-surface-variant">{label}</p><p className="text-2xl font-bold text-on-surface">{label==='Referral Deposits'||label==='Commissions' ? `$${Number(value).toFixed(2)}` : value}</p></div>)}
    </div>
    <div className="bg-surface-container border-outline-variant rounded-xl p-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-outline"/>
        <input className="input-primary pl-9 w-full bg-surface-container-high border-outline-variant text-on-surface" placeholder="Search affiliate name, email or referral code..." value={q} onChange={e=>setQ(e.target.value)}/>
      </div>
    </div>
    <div className="bg-surface-container border-outline-variant rounded-xl overflow-x-auto shadow-sm">
      <table className="min-w-[1050px] w-full">
        <thead className="bg-surface-container-low">
          <tr>
            {['Affiliate','Referral Code','Clicks','Signups','Paid Referrals','Referral Deposits','Commission','Joined'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {query.isLoading?<tr><td colSpan={8} className="p-8 text-center text-on-surface-variant">Loading...</td></tr>
          :rows.length?rows.map((r:any)=><tr key={r.id}>
            <td className="px-4 py-3">
              <div className="font-medium text-on-surface">{r.name||'Unnamed'}</div>
              <div className="text-xs text-on-surface-variant">{r.email}</div>
            </td>
            <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{r.referralCode||'-'}</td>
            <td className="px-4 py-3 text-on-surface-variant">{r.clicks}</td>
            <td className="px-4 py-3 text-on-surface-variant">{r.signups}</td>
            <td className="px-4 py-3 text-on-surface-variant">{r.paidReferrals}</td>
            <td className="px-4 py-3 text-on-surface-variant">${Number(r.referralDeposits||0).toFixed(2)}</td>
            <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-semibold">${Number(r.totalCommission||0).toFixed(2)}</td>
            <td className="px-4 py-3 text-xs text-on-surface-variant">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}</td>
          </tr>):<tr><td colSpan={8} className="p-8 text-center text-on-surface-variant">No affiliates found.</td></tr>}
        </tbody>
      </table>
    </div>
    <div className="bg-surface-container border-outline-variant rounded-xl overflow-x-auto shadow-sm">
      <div className="p-4 border-b border-outline-variant font-bold text-on-surface">Recent Commissions</div>
      <table className="min-w-[800px] w-full">
        <thead className="bg-surface-container-low">
          <tr>{['Affiliate','Referral','Payment','Amount','Date'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {(data.recentCommissions||[]).map((c:any)=><tr key={c.id}>
            <td className="px-4 py-3 text-sm text-on-surface-variant">{c.affiliateEmail}</td>
            <td className="px-4 py-3 text-sm text-on-surface-variant">{c.referredEmail}</td>
            <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{c.paymentId?.slice(0,8)}</td>
            <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400">${Number(c.amount||0).toFixed(4)}</td>
            <td className="px-4 py-3 text-xs text-on-surface-variant">{new Date(c.createdAt).toLocaleString()}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
  </div>;
}
