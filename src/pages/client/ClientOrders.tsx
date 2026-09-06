import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Search, Download, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext'; import { apiFetch } from '../../lib/api'; import toast from 'react-hot-toast';

const readErr = async (r: Response, fallback: string) => { const b = await r.json().catch(() => ({})); return b?.error || fallback; };
const CANCELABLE_STATUSES = ['Pending', 'Processing', 'In Progress'];
const REFILLABLE_STATUSES = ['Completed', 'Partial'];

export default function ClientOrders() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['client-orders'], enabled: !!user, refetchInterval: 30000,
    queryFn: async () => { const t = await user!.getIdToken(); const r = await apiFetch('/api/client/orders', user, { headers: { Authorization: `Bearer ${t}` } }); if (!r.ok) throw new Error('Failed to load orders'); return r.json(); }
  });

  const refill = useMutation({
    mutationFn: async (id: string) => { const t = await user!.getIdToken(); const r = await apiFetch(`/api/client/orders/${id}/refill`, user, { method: 'POST', headers: { Authorization: `Bearer ${t}` } }); if (!r.ok) throw new Error(await readErr(r, 'Refill request failed')); return r.json(); },
    onSuccess: () => { toast.success('Refill requested — we\'ll update the order once the provider responds'); qc.invalidateQueries({ queryKey: ['client-orders'] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const cancel = useMutation({
    mutationFn: async (id: string) => { const t = await user!.getIdToken(); const r = await apiFetch(`/api/client/orders/${id}/cancel`, user, { method: 'POST', headers: { Authorization: `Bearer ${t}` } }); if (!r.ok) throw new Error(await readErr(r, 'Cancel request failed')); return r.json(); },
    onSuccess: () => { toast.success('Order canceled — refund will reflect in your wallet shortly'); qc.invalidateQueries({ queryKey: ['client-orders'] }); qc.invalidateQueries({ queryKey: ['client-me'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const rows = orders.filter((o: any) => (status === 'all' || o.status === status) && (`${o.id} ${o.service?.name || ''} ${o.link}`.toLowerCase().includes(q.toLowerCase())));
  const exportCsv = () => {
    const csv = ['Order ID,Service,Link,Quantity,Charge,Status,Created', ...rows.map((o: any) => [o.id, o.service?.name || '', o.link, o.quantity, o.charge, o.status, o.createdAt].map(v => `"${String(v ?? '').replaceAll('"', '""')}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'orders.csv'; a.click(); toast.success('Orders exported');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between gap-3">
        <h2 className="text-2xl font-bold">Order History</h2>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => refetch()}><RefreshCw className="w-4 h-4 inline mr-1" />Refresh</button>
          <button className="btn-secondary" onClick={exportCsv}><Download className="w-4 h-4 inline mr-1" />Export CSV</button>
        </div>
      </div>
      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]"><Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" /><input className="input-primary pl-9" placeholder="Search order, service or link" value={q} onChange={e => setQ(e.target.value)} /></div>
        <select className="input-primary w-auto" value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option>{['Pending', 'Processing', 'In Progress', 'Completed', 'Partial', 'Canceled', 'Refunded'].map(s => <option key={s}>{s}</option>)}</select>
      </div>
      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="min-w-[1000px] w-full text-left">
          <thead className="bg-gray-50"><tr>{['ID', 'Service', 'Link', 'Quantity', 'Charge', 'Status', 'Created', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-xs text-gray-500 uppercase">{h}</th>)}</tr></thead>
          <tbody className="divide-y">
            {isLoading ? <tr><td colSpan={8} className="p-8 text-center">Loading...</td></tr> : rows.length ? rows.map((o: any) => {
              const canRefill = o.service?.refillable && REFILLABLE_STATUSES.includes(o.status);
              const canCancel = o.service?.cancelable && CANCELABLE_STATUSES.includes(o.status) && !o.cancelRequested;
              return (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-mono text-xs">{o.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-sm font-medium">{o.service?.name}</td>
                  <td className="px-4 py-3 text-sm max-w-[200px] truncate">{o.link}</td>
                  <td className="px-4 py-3 text-sm">{o.quantity}</td>
                  <td className="px-4 py-3 text-sm font-semibold">${Number(o.charge).toFixed(4)}</td>
                  <td className="px-4 py-3 text-sm"><span className="px-2 py-1 rounded-full bg-gray-100">{o.status}</span>{o.cancelRequested && <span className="ml-1 text-xs text-amber-600">(cancel pending)</span>}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{o.createdAt ? new Date(o.createdAt).toLocaleString() : '-'}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {canRefill && <button disabled={refill.isPending} onClick={() => refill.mutate(o.id)} className="text-indigo-600 hover:text-indigo-900 mr-3" title="Request refill"><RotateCcw className="w-4 h-4 inline mr-1" />Refill</button>}
                    {canCancel && <button disabled={cancel.isPending} onClick={() => confirm('Cancel this order and refund it to your wallet?') && cancel.mutate(o.id)} className="text-red-600 hover:text-red-900" title="Cancel order"><XCircle className="w-4 h-4 inline mr-1" />Cancel</button>}
                    {!canRefill && !canCancel && <span className="text-gray-300">-</span>}
                  </td>
                </tr>
              );
            }) : <tr><td colSpan={8} className="p-8 text-center text-gray-500">No matching orders.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
