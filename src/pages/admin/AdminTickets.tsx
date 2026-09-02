import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { LifeBuoy, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminTickets() {
  const { user } = useAuth();
  
  const { data: tickets = [] } = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await fetch('/api/admin/tickets', { headers: { Authorization: `Bearer ${token}` } });
      return res.ok ? res.json() : [];
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><LifeBuoy className="w-5 h-5"/> Support Tickets</h3>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Subject</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Created</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {tickets.map((t: any) => (
              <tr key={t.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{t.user?.email}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{t.subject}</td>
                <td className="px-6 py-4 text-sm"><span className="px-2 py-1 rounded bg-gray-100">{t.status}</span></td>
                <td className="px-6 py-4 text-sm text-gray-500">{new Date(t.createdAt).toLocaleString()}</td>
                <td className="px-6 py-4 text-right"><Link to={`/admin/tickets/${t.id}`} className="text-indigo-600 hover:text-indigo-900"><Eye className="w-4 h-4"/></Link></td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No support tickets found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
