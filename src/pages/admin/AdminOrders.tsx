import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminOrders() {
  const { user } = useAuth();
  
  const { data: orders = [] } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await fetch('/api/admin/orders', { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    }
  });

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900 tracking-tight">All Orders</h3>
      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((o: any) => (
              <tr key={o.id}>
                <td className="px-6 py-4 text-sm font-mono text-gray-500">{o.id.substring(0,8)}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{o.user?.email}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{o.service?.name}</td>
                <td className="px-6 py-4 text-sm"><span className="px-2 py-1 rounded bg-gray-100">{o.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
