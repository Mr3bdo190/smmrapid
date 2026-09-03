
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { History } from 'lucide-react';

export default function AdminAuditLogs() {
  const { user } = useAuth();
  
  const { data: logs = [] } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/admin/audit', user, { headers: { Authorization: `Bearer ${token}` } });
      return res.ok ? res.json() : [];
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><History className="w-5 h-5"/> Audit Logs</h3>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto w-full">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Admin ID</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Entity</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Details</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {logs.map((log: any) => (
              <tr key={log.id}>
                <td className="px-6 py-4 text-sm text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="px-6 py-4 text-sm text-gray-500 font-mono text-xs">{log.adminId.substring(0, 8)}...</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{log.actionType}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{log.entityType} ({log.entityId.substring(0,8)})</td>
                <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-[200px]">{log.details || `${log.oldValue || 'none'} -> ${log.newValue || 'none'}`}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No audit logs found.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
