import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet, CheckCircle2, XCircle, RefreshCw, Clock, User as UserIcon, Calendar } from 'lucide-react';
import { notify } from '../../lib/notify';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { useTranslation } from '../../lib/i18n';

type StatusFilter = 'all' | 'Pending' | 'Approved' | 'Rejected';

const statusColors: Record<string, string> = {
  Pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800',
  Approved: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800',
  Rejected: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800',
};

const statusIcons: Record<string, any> = {
  Pending: Clock,
  Approved: CheckCircle2,
  Rejected: XCircle,
};

export default function AdminWithdrawals() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { t, dir } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const { data: withdrawalsData = [], refetch } = useQuery({
    queryKey: ['admin-affiliate-withdrawals'],
    enabled: !!user,
    queryFn: async () => {
      const token = await user!.getIdToken();
      const r = await apiFetch('/api/admin/affiliate-withdrawals', user, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error('Failed to load affiliate withdrawals');
      return r.json() as Promise<any[]>;
    },
  });

  const filtered = withdrawalsData.filter(w => statusFilter === 'all' || w.status === statusFilter);

  const resolveMutation = useMutation({
    mutationFn: async ({ id, status, adminNote }: { id: string; status: 'Approved' | 'Rejected'; adminNote?: string }) => {
      const token = await user!.getIdToken();
      const r = await apiFetch(`/api/admin/affiliate-withdrawals/${id}`, user, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: status.toLowerCase(), adminNote }),
      });
      if (!r.ok) {
        const b = await r.json().catch(() => ({}));
        throw new Error(b.error || 'Failed to update withdrawal');
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-affiliate-withdrawals'] });
    },
    onError: (e: any) => {
      const errMsg = e?.errorKey || e?.code || e?.message;
      notify.error(typeof errMsg === 'string' ? errMsg : 'Action failed');
    },
  });

  const handleApprove = (id: string) => {
    const note = window.prompt(
      t('admin.withdrawals.approvePrompt') || 'Approve this affiliate withdrawal? Add an admin note (optional):',
      ''
    );
    if (note !== null) {
      resolveMutation.mutate({ id, status: 'Approved', adminNote: note.trim() || undefined });
    }
  };

  const handleReject = (id: string) => {
    const note = window.prompt(
      t('admin.withdrawals.rejectPrompt') || 'Reject this affiliate withdrawal? Add an admin note (optional):',
      ''
    );
    if (note !== null) {
      resolveMutation.mutate({ id, status: 'Rejected', adminNote: note.trim() || undefined });
    }
  };

  if (resolveMutation.isSuccess) {
    notify.success(t('admin.withdrawals.resolvedSuccess') || 'Withdrawal updated successfully');
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('admin.withdrawals.title') || 'Affiliate Withdrawals (سحوبات الأرباح/الإحالات)'}</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t('admin.withdrawals.subtitle') || 'Manage affiliate commission withdrawal requests. These are strictly for referral/affiliate earnings.'}</p>
          </div>
          <button
            onClick={() => refetch()}
            className="mt-4 sm:mt-0 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {t('common.refresh')}
          </button>
        </div>

        <div className="mb-4">
          <div className="flex gap-2 flex-wrap">
            {(['all', 'Pending', 'Approved', 'Rejected'] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  statusFilter === s
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                {s === 'all' ? (t('admin.withdrawals.all') || 'All Statuses') : s}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          {withdrawalsData.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t('admin.withdrawals.noRequests') || 'No withdrawal requests found.'}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <p>No withdrawals in this status.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">{t('admin.withdrawals.user') || 'User'}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">{t('admin.withdrawals.amount') || 'Amount'}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">{t('admin.withdrawals.method') || 'Method'}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">{t('admin.withdrawals.destination') || 'Destination'}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">{t('admin.withdrawals.status') || 'Status'}</th>
                    <th	className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">{t('admin.withdrawals.created') || 'Created'}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {filtered.map((w: any) => {
                    const Icon = statusIcons[w.status] || Clock;
                    return (
                      <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900 dark:text-gray-200">
                              {w.user_name || w.user_email || w.userId || '-'}
                              {w.user_email && w.user_email !== (w.user_name || w.userId) ? ` (${w.user_email})` : ''}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">${Number(w.amount).toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-700 dark:text-gray-300">{w.method}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate" title={w.destination}>
                            {w.destination}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${statusColors[w.status] || statusColors.Pending}`}>
                            <Icon className="w-3 h-3" />
                            {w.status}
                            {w.resolvedAt && <Calendar className="w-3 h-3 ml-1 opacity-50" />}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(w.createdAt).toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {w.status === 'Pending' ? (
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                onClick={() => handleApprove(w.id)}
                                className="p-1.5 text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/30 rounded transition-colors"
                                title="Approve"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReject(w.id)}
                                className="p-1.5 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 rounded transition-colors"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          ) : w.adminNote ? (
                            <span className="text-xs text-gray-400 dark:text-gray-500" title={w.adminNote}>
                              {w.adminNote.length > 20 ? w.adminNote.substring(0, 20) + '...' : w.adminNote}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
