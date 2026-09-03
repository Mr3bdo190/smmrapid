import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { Users, ShoppingCart, Wallet, RefreshCw, AlertCircle } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/admin/stats', user, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('API Error');
      return res.json();
    },
    enabled: !!user,
  });

  if (isLoading) return <div className="p-6 text-gray-500 flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Loading dashboard...</div>;
  if (isError) return <div className="p-6 text-red-500 flex items-center gap-2"><AlertCircle className="w-5 h-5" /> Error loading dashboard.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard Overview</h2>
        <p className="mt-1 text-sm text-gray-500">Monitor your platform's core metrics and activity.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-4 rounded-xl bg-blue-100 text-blue-600"><Users className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Users</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{data?.totalUsers || 0}</h3>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-4 rounded-xl bg-indigo-100 text-indigo-600"><ShoppingCart className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Orders</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{data?.totalOrders || 0}</h3>
          </div>
        </div>
      </div>
    </div>
  );
}
