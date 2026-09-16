import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { Check, X, Search, RefreshCw } from 'lucide-react';
import { notify } from '../../lib/notify';
import { useState, useMemo, useEffect } from 'react';
import AdminPagination from './AdminPagination';

async function readApiError(res: Response, fallback: string) {
  const body = await res.json().catch(() => ({}));
  return body?.error || body?.message || fallback;
}

const PAGE_SIZE = 100;

export default function AdminPayments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [q,setQ]=useState(''); const [status,setStatus]=useState('all'); const [page,setPage]=useState(1);
  useEffect(()=>{setPage(1)},[status]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-payments', page, status],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), status });
      const res = await apiFetch(`/api/admin/payments?${params}`, user, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to load payments'));
      return res.json();
    },
    enabled: !!user,
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
      const token = await user?.getIdToken();
      const res = await apiFetch(`/api/admin/payments/${id}/${action}`, user, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await readApiError(res, `Failed to ${action} payment`));
      return { action, data: await res.json() };
    },
    onSuccess: ({ action }) => {
      notify.success(action === 'approve' ? 'Payment approved and balance credited' : 'Payment rejected');
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['client-me'] });
      queryClient.invalidateQueries({ queryKey: ['client-transactions'] });
    },
    onError: (e: any) => notify.error(e, 'Payment operation failed'),
  });

  const payments = data?.data || [];
  const total = data?.total || 0;
  // Text search runs over the currently loaded page only — narrow the status filter first for a large history.
  const rows = useMemo(() => payments.filter((p:any) => `${p.user?.email||''} ${p.method||''} ${p.transactionId||''}`.toLowerCase().includes(q.toLowerCase())), [payments,q]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between gap-3 flex-wrap">
        <h3 className="text-xl font-bold text-on-surface tracking-tight">Transactions & Payments</h3>
        <button className="btn-secondary" onClick={()=>queryClient.invalidateQueries({queryKey:['admin-payments']})}><RefreshCw className="w-4 h-4 inline mr-1"/>Refresh</button>
      </div>
      <div className="bg-surface-container border border-outline-variant rounded-xl p-4 flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-3 w-4 h-4 text-outline"/>
          <input className="input-primary pl-9 bg-surface-container-high border border-outline-variant text-on-surface" placeholder="Search this page: email, method or transaction ID" value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
        <select className="input-primary w-auto bg-surface-container-high border border-outline-variant text-on-surface" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="all">All statuses</option><option>Pending</option><option>Approved</option><option>Rejected</option>
        </select>
      </div>
      {isError && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{(error as Error)?.message || 'Failed to load payments'}</div>}
      <div className="bg-surface-container rounded-xl shadow-sm border border-outline-variant overflow-hidden w-full">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-outline-variant">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-on-surface-variant uppercase">User</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-on-surface-variant uppercase">Method / Tx ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-on-surface-variant uppercase">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-on-surface-variant uppercase">Status & Time</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-on-surface-variant uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-surface-container divide-y divide-outline-variant">
              {isLoading && <tr><td colSpan={5} className="px-6 py-10 text-center text-on-surface-variant">Loading payments...</td></tr>}
              {!isLoading && rows.length === 0 && <tr><td colSpan={5} className="px-6 py-10 text-center text-on-surface-variant">No payments found.</td></tr>}
              {rows.map((p: any) => {
                const pending = p.status === 'Pending';
                const gatewayVerified = p.method === 'Heleket' || p.method === 'المحفظة الإلكترونية';
                const egpAmount = p.transactionDetails?.egpAmount;
                return <tr key={p.id} className="hover:bg-surface-container-high/60">
                  <td className="px-6 py-4 text-sm text-on-surface">{p.user?.email || p.userId}</td>
                  <td className="px-6 py-4 text-sm text-on-surface">
                    <div>{p.method}</div>
                    <div className="text-xs text-outline break-all">{p.transactionId || 'No Tx ID'}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-emerald-600">${Number(p.amount).toFixed(4)}{egpAmount && <div className="text-xs font-normal text-outline">({Number(egpAmount).toFixed(2)} EGP @ {p.transactionDetails?.rate})</div>}</td>
                  <td className="px-6 py-4 text-sm">
                    <div>
                      <span className={`px-2 py-1 rounded text-xs ${p.status === 'Approved' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200' : p.status === 'Rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'}`}>{p.status}</span>
                    </div>
                    <span className="text-xs text-on-surface-variant mt-1 block">{p.createdAt ? new Date(p.createdAt).toLocaleString() : '-'}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    {pending && gatewayVerified && <span className="text-xs text-outline italic">Awaiting gateway confirmation</span>}
                    {pending && !gatewayVerified && <div className="flex justify-end gap-2">
                      <button type="button" disabled={resolveMutation.isPending} onClick={() => resolveMutation.mutate({ id: p.id, action: 'approve' })} className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 p-2 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900 disabled:opacity-50" title="Approve"><Check className="w-4 h-4" /></button>
                      <button type="button" disabled={resolveMutation.isPending} onClick={() => resolveMutation.mutate({ id: p.id, action: 'reject' })} className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-2 rounded hover:bg-red-100 dark:hover:bg-red-900 disabled:opacity-50" title="Reject"><X className="w-4 h-4" /></button>
                    </div>}
                  </td>
                </tr>;
              })}
            </tbody>
          </table>
          <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
}
