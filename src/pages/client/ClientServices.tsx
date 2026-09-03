
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { Tags } from 'lucide-react';

export default function ClientServices() {
  const { user } = useAuth();
  
  const { data: services = [], isLoading } = useQuery({
    queryKey: ['client-services-list'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/client/services', user, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load data');
      return res.json();
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Tags className="text-indigo-600"/> Services List</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto w-full">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Service</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Rate per 1k</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Min / Max</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {services.map((s: any) => (
              <tr key={s.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-4 text-sm text-gray-500 font-mono">{s.id.substring(0,8)}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{s.category?.name || 'N/A'}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{s.name}</td>
                <td className="px-6 py-4 text-sm text-right text-emerald-600 font-semibold">${Number(s.pricePer1k).toFixed(4)}</td>
                <td className="px-6 py-4 text-sm text-right text-gray-500">{s.minQuantity} / {s.maxQuantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
