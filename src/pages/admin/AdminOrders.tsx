import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, RefreshCw, Download, FileDown, Trash2 } from 'lucide-react';
import { notify } from '../../lib/notify';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import AdminPagination from './AdminPagination';
import { useTranslation } from '../../lib/i18n';

const e = async (r: Response, f: string) => { const b = await r.json().catch(() => ({})); return b?.error || f; };
const PAGE_SIZE = 100;

export default function AdminOrders() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { t, dir } = useTranslation();
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');

  useEffect(() => { const tm = setTimeout(() => { setQ(qInput); setPage(1); }, 400); return () => clearTimeout(tm); }, [qInput]);
  useEffect(() => { setPage(1); }, [status]);

  const oq = useQuery({
    queryKey: ['admin-orders', page, q, status],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async () => {
      const token = await user!.getIdToken();
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), status, ...(q ? { q } : {}) });
      const r = await apiFetch(`/api/admin/orders?${params}`, user, { headers: { Authorization: 'Bearer ' + token } });
      if (!r.ok) throw new Error(await e(r, 'Failed to load orders'));
      return r.json();
    },
  });

  const refresh = useMutation({
    mutationFn: async (id: string) => {
      const token = await user!.getIdToken();
      const r = await apiFetch(`/api/admin/orders/${id}/refresh`, user, { method: 'POST', headers: { Authorization: 'Bearer ' + token } });
      if (!r.ok) throw new Error(await e(r, 'Refresh failed'));
      return r.json();
    },
    onSuccess: () => { notify.success(t('admin.orders.refreshSuccess') || 'Order refreshed'); qc.invalidateQueries({ queryKey: ['admin-orders'] }); },
    onError: (x: any) => notify.error(x.message),
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, newStatus }: { ids: string[]; newStatus: string }) => {
      const token = await user!.getIdToken();
      const r = await apiFetch('/api/admin/orders/bulk-status', user, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ orderIds: ids, status: newStatus }),
      });
      if (!r.ok) throw new Error(await e(r, 'Bulk update failed'));
      return r.json();
    },
    onSuccess: (data: any) => { notify.success(t('common.bulkUpdated')); qc.invalidateQueries({ queryKey: ['admin-orders'] }); setSelected(new Set()); },
    onError: (x: any) => notify.error(x.message),
  });

  const handleBulkStatus = () => {
    if (!bulkStatus || selected.size === 0) return;
    bulkStatusMutation.mutate({ ids: Array.from(selected), newStatus: bulkStatus });
  };

  const handleExport = (scope: 'page' | 'all') => {
    const params = new URLSearchParams({ status, ...(q ? { q } : {} });
    if (scope === 'page') params.set('page', String(page));
    window.open(`/api/admin/orders/export?${params}`, '_blank');
    notify.success(t('common.exportSuccess'));
  };

  const rows = oq.data?.data || [];
  const total = oq.data?.total || 0;
  const allSelected = rows.length > 0 && rows.every((r: any) => selected.has(r.id));

  return (
    <div className="space-y-5" dir={dir}>
      <div className="flex justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-xl font-bold">{t('admin.orders.title')}</h3>
          <p className="text-sm text-gray-500">{t('admin.orders.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => oq.refetch()}><RefreshCw className="w-4 h-4 inline mr-1" /> {t('common.refresh')}</button>
          <button className="btn-secondary" onClick={() => handleExport('page')}><Download className="w-4 h-4 inline mr-1" /> {t('common.exportPage')}</button>
          <button className="btn-secondary" onClick={() => handleExport('all')}><FileDown className="w-4 h-4 inline mr-1" /> {t('common.exportAll')}</button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-wrap gap-3 items-center">
          <span className="text-sm font-medium text-indigo-900">{t('common.selected', { count: selected.size })}</span>
          <select className="input-primary w-auto" value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}>
            <option value="">{t('admin.orders.selectStatus')}</option>
            {['Pending', 'Processing', 'In Progress', 'Completed', 'Partial', 'Canceled', 'Refunded'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button className="btn-primary" onClick={handleBulkStatus} disabled={bulkStatusMutation.isPending}>
            {t('common.apply')}
          </button>
          <button className="btn-secondary" onClick={() => { setSelected(new Set()); setBulkStatus(''); }}>
            {t('common.cancel')}
          </button>
        </div>
      )}

      <div className="bg-white border rounded-xl p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
          <input
            className="input-primary pl-9"
            placeholder={t('admin.orders.searchPlaceholder')}
            value={qInput}
            onChange={x => setQInput(x.target.value)}
          />
        </div>
        <select className="input-primary w-auto" value={status} onChange={x => setStatus(x.target.value)}>
          <option value="all">{t('common.allStatuses')}</option>
          {['Pending', 'Processing', 'In Progress', 'Completed', 'Partial', 'Canceled', 'Refunded'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="min-w-[1100px] w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={e => {
                    if (e.target.checked) setSelected(new Set(rows.map((r: any) => r.id)));
                    else setSelected(new Set());
                  }}
                />
              </th>
              {['ID', 'User', 'Service', 'Mode', 'Qty', 'Start', 'Remains', 'Charge', 'Status', 'Provider ID', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 uppercase">{t(`admin.orders.headers.${h}`, h)}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {oq.isLoading
              ? <tr><td colSpan={12} className="p-8 text-center">{t('common.loading')}</td></tr>
              : rows.length
                ? rows.map((o: any) => (
                    <tr key={o.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(o.id)}
                          onChange={e => {
                            const newSet = new Set(selected);
                            if (e.target.checked) newSet.add(o.id);
                            else newSet.delete(o.id);
                            setSelected(newSet);
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{o.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-sm">{o.user?.email || '-'}</td>
                      <td className="px-4 py-3 text-sm font-medium">{o.service?.name || '-'}</td>
                      <td className="px-4 py-3 text-xs">{o.service?.executionMode === 'manual' ? t('admin.orders.manual') : t('admin.orders.provider')}</td>
                      <td className="px-4 py-3 text-sm">{o.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{o.startCount ?? '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{o.remains ?? '-'}</td>
                      <td className="px-4 py-3 text-sm font-bold">${Number(o.charge).toFixed(4)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium
                          ${o.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : ''}
                          ${o.status === 'Canceled' || o.status === 'Refunded' ? 'bg-red-100 text-red-800' : ''}
                          ${['Pending', 'Processing', 'In Progress', 'Partial'].includes(o.status) ? 'bg-amber-100 text-amber-800' : ''}
                        `}>{o.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">{o.providerOrderId || '-'}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => refresh.mutate(o.id)} className="text-indigo-600 hover:text-indigo-900" title={t('common.refresh')}><RefreshCw className="w-4 h-4 inline" /></button>
                        <button onClick={() => { const tr = confirm(t('admin.orders.cancelConfirm')); if (tr) { apiFetch(`/api/admin/orders/${o.id}/cancel`, user, { method: 'POST' }).then(() => { qc.invalidateQueries({ queryKey: ['admin-orders'] }); notify.success(t('admin.orders.cancelRequested')); }); } }} className="text-red-600 hover:text-red-900 ml-2" title={t('admin.orders.cancel')}><Trash2 className="w-4 h-4 inline" /></button>
                      </td>
                    </tr>
                  ))
                : <tr><td colSpan={12} className="p-8 text-center text-gray-500">{t('orders.noMatching')}</td></tr>
            }
          </tbody>
        </table>
        <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}
