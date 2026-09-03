
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { ShieldAlert } from 'lucide-react';

export default function AdminSystemReports() {
  const { user } = useAuth();
  
  const { data: reports = [] } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/admin/reports', user, { headers: { Authorization: `Bearer ${token}` } });
      return res.ok ? res.json() : [];
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><ShieldAlert className="w-5 h-5"/> System Reports</h3>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto w-full">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Location</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Error / Reason</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {reports.map((r: any) => (
              <tr key={r.id}>
                <td className="px-6 py-4 text-sm text-gray-500">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{r.action}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{r.location}</td>
                <td className="px-6 py-4 text-sm text-red-600 font-medium">{r.errorReason}</td>
                <td className="px-6 py-4 text-sm"><span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">{r.status}</span></td>
              </tr>
            ))}
            {reports.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No system reports found.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
