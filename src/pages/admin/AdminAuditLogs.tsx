import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { History, RefreshCw } from 'lucide-react';
import AdminPagination from './AdminPagination';

const PAGE_SIZE = 100;

export default function AdminAuditLogs() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-audit-logs', page],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      const res = await apiFetch(`/api/admin/audit?${params}`, user, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load audit logs');
      return res.json();
    },
    enabled: !!user,
  });

  const logs = data?.data || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-on-surface flex items-center gap-2"><History className="w-5 h-5"/> Audit Logs</h3>
        <button className="btn-secondary" onClick={() => refetch()}><RefreshCw className="w-4 h-4 inline mr-1"/>Refresh</button>
      </div>
      <div className="bg-surface-container rounded-xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="overflow-x-auto w-full">
        <table className="min-w-full divide-y divide-outline-variant">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-on-surface-variant uppercase">Date</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-on-surface-variant uppercase">Admin ID</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-on-surface-variant uppercase">Action</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-on-surface-variant uppercase">Entity</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-on-surface-variant uppercase">Details</th>
            </tr>
          </thead>
          <tbody className="bg-surface-container divide-y divide-outline-variant">
            {isLoading && <tr><td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">Loading...</td></tr>}
            {!isLoading && logs.map((log: any) => (
              <tr key={log.id}>
                <td className="px-6 py-4 text-sm text-on-surface-variant">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="px-6 py-4 text-sm text-on-surface-variant font-mono text-xs">{log.adminId.substring(0, 8)}...</td>
                <td className="px-6 py-4 text-sm font-medium text-on-surface">{log.actionType}</td>
                <td className="px-6 py-4 text-sm text-on-surface-variant">{log.entityType} ({log.entityId.substring(0,8)})</td>
                <td className="px-6 py-4 text-sm text-on-surface-variant truncate max-w-[200px]">{log.details || `${log.oldValue || 'none'} -> ${log.newValue || 'none'}`}</td>
              </tr>
            ))}
            {!isLoading && logs.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">No audit logs found.</td></tr>}
          </tbody>
        </table>
        <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
}
