import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, Search, CheckCircle2, Trash2, RefreshCw, Server, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { notify } from '../../lib/notify';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { useTranslation } from '../../lib/i18n';
import AdminPagination from './AdminPagination';

const PAGE_SIZE = 100;
type Tab = 'reports' | 'logs';

const levelIcons: Record<string, any> = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export default function AdminSystemReports() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('reports');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [logLevel, setLogLevel] = useState('');
  const [logPage, setLogPage] = useState(1);

  useEffect(() => { setPage(1); }, [status]);
  useEffect(() => { setLogPage(1); }, [logLevel]);

  // --- System Reports (existing) ---
  const reportsQ = useQuery({
    queryKey: ['admin-reports', page, status],
    enabled: !!user,
    queryFn: async () => {
      const token = await user!.getIdToken();
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), status });
      const r = await apiFetch(`/api/admin/reports?${params}`, user, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error('Failed to load reports');
      return r.json();
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await user!.getIdToken();
      const r = await apiFetch(`/api/admin/reports/${id}/status`, user, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'Resolved' }),
      });
      if (!r.ok) throw new Error('Failed to resolve report');
      return r.json();
    },
    onSuccess: () => { notify.success('Report resolved'); qc.invalidateQueries({ queryKey: ['admin-reports'] }); },
    onError: (e: any) => notify.error(e.message),
  });

  const reportRows = reportsQ.data?.data || [];
  const reportTotal = reportsQ.data?.total || 0;
  const reportFiltered = reportRows.filter((r: any) =>
    `${r.action} ${r.location} ${r.errorReason}`.toLowerCase().includes(q.toLowerCase())
  );

  // --- System Logs (new, from system_logs table) ---
  const logsQ = useQuery({
    queryKey: ['admin-system-logs', logPage, logLevel],
    enabled: !!user,
    queryFn: async () => {
      const token = await user!.getIdToken();
      const params = new URLSearchParams({ page: String(logPage), pageSize: String(PAGE_SIZE) });
      if (logLevel) params.set('level', logLevel);
      const r = await apiFetch(`/api/admin/system-logs?${params}`, user, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error('Failed to load logs');
      return r.json();
    },
  });

  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      const token = await user!.getIdToken();
      const r = await apiFetch('/api/admin/system-logs', user, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error('Failed to clear logs');
      return r.json();
    },
    onSuccess: () => { notify.success('Old logs cleared'); qc.invalidateQueries({ queryKey: ['admin-system-logs'] }); },
    onError: (e: any) => notify.error(e.message),
  });

  const logRows = logsQ.data?.data || [];
  const logTotal = logsQ.data?.total || 0;

  return (
    <div className="space-y-5" dir="ltr">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            {t('admin.settings.systemReports')}
          </h3>
          <p className="text-sm text-on-surface-variant">
            {activeTab === 'reports'
              ? t('admin.settings.reportsSubtitle')
              : t('settings.systemLogsSubtitle')}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-outline-variant">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('reports')}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'reports'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300'
                : 'border-transparent text-on-surface-variant hover:text-on-surface dark:hover:text-gray-200'
            }`}
          >
            {t('admin.settings.systemReports')}
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'logs'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300'
                : 'border-transparent text-on-surface-variant hover:text-on-surface dark:hover:text-gray-200'
            }`}
          >
            {t('settings.systemLogs')}
          </button>
        </nav>
      </div>

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <>
          <div className="bg-surface-container border-outline-variant rounded-xl p-4 flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-3 w-4 h-4 text-outline" />
              <input
                className="input-primary pl-9 bg-surface-container-high border-outline-variant text-on-surface"
                placeholder="Search this page: action, location or error"
                value={q}
                onChange={e => setQ(e.target.value)}
              />
            </div>
            <select
              className="input-primary w-auto bg-surface-container-high border-outline-variant text-on-surface"
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="Unresolved">Unresolved</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          <div className="bg-surface-container border-outline-variant rounded-xl overflow-x-auto">
            <table className="min-w-[1000px] w-full">
              <thead className="bg-surface-container-low dark:bg-gray-900">
                <tr>
                  {['Date', 'Action', 'Location', 'Error / Reason', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-on-surface-variant uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {reportsQ.isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-on-surface-variant">Loading...</td>
                  </tr>
                ) : (
                  reportFiltered.map((r: any) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-on-surface">{r.action}</td>
                      <td className="px-4 py-3 text-sm text-on-surface-variant">{r.location}</td>
                      <td className="px-4 py-3 text-sm text-red-600">{r.errorReason}</td>
                      <td className="px-4 py-3 text-sm text-on-surface-variant">{r.status}</td>
                      <td className="px-4 py-3">
                        {r.status !== 'Resolved' && (
                          <button
                            className="text-emerald-600 hover:text-emerald-700"
                            disabled={resolveMutation.isPending}
                            onClick={() => resolveMutation.mutate(r.id)}
                          >
                            <CheckCircle2 className="w-4 h-4 inline mr-1" />
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
                {!reportsQ.isLoading && !reportFiltered.length && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                      No reports found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {total > PAGE_SIZE && (
            <AdminPagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {/* System Logs Tab */}
      {activeTab === 'logs' && (
        <>
          <div className="bg-surface-container border-outline-variant rounded-xl p-4 flex-wrap gap-3 items-center justify-between">
            <div className="flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-3 w-4 h-4 text-outline" />
                <input
                  className="input-primary pl-9 bg-surface-container-high border-outline-variant text-on-surface"
                  placeholder={t('settings.filterByLevel')}
                  value={q}
                  onChange={e => setQ(e.target.value)}
                />
              </div>
              <select
                className="input-primary w-auto bg-surface-container-high border-outline-variant text-on-surface"
                value={logLevel}
                onChange={e => setLogLevel(e.target.value)}
              >
                <option value="">All levels</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
              <button
                onClick={() => logsQ.refetch()}
                disabled={logsQ.isFetching}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${logsQ.isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => clearLogsMutation.mutate()}
                disabled={clearLogsMutation.isPending}
                className="btn-secondary inline-flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
                {t('settings.clearOldLogs')}
              </button>
            </div>
          </div>

          <div className="bg-surface-container border-outline-variant rounded-xl overflow-x-auto">
            <table className="min-w-[1000px] w-full">
              <thead className="bg-surface-container-low dark:bg-gray-900">
                <tr>
                  {['Time', 'Level', 'Message', 'Details'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-on-surface-variant uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {logsQ.isLoading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-on-surface-variant">
                      {t('settings.loadingLogs')}
                    </td>
                  </tr>
                ) : (
                  logRows
                    .filter((r: any) =>
                      q === '' ||
                      r.message?.toLowerCase().includes(q.toLowerCase()) ||
                      r.level?.toLowerCase().includes(q.toLowerCase())
                    )
                    .map((r: any) => {
                      const Icon = levelIcons[r.level] || Server;
                      return (
                        <tr key={r.id}>
                          <td className="px-4 py-3 text-xs text-on-surface-variant">
                            {new Date(r.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                              r.level === 'error'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                : r.level === 'warning'
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                            }`}>
                              <Icon className="w-3 h-3" />
                              {r.level}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-on-surface">{r.message}</td>
                          <td className="px-4 py-3 text-sm text-on-surface-variant max-w-xs truncate">
                            {r.details || '-'}
                          </td>
                        </tr>
                      );
                    })
                )}
                {!logsQ.isLoading && !logRows.length && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-on-surface-variant">
                      No logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {logTotal > PAGE_SIZE && (
            <AdminPagination
              page={logPage}
              pageSize={PAGE_SIZE}
              total={logTotal}
              onPageChange={setLogPage}
            />
          )}
        </>
      )}
    </div>
  );
}
