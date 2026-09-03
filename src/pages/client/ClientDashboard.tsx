import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { Wallet, ShoppingCart, TrendingUp, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ClientDashboard() {
  const { user, dbUser } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['client-dashboard'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/client/dashboard', user, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      return res.json();
    },
    enabled: !!user,
  });

  if (isLoading) return <div className="p-6 text-gray-500 flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Loading dashboard...</div>;
  if (isError) return <div className="p-6 text-red-500 flex items-center gap-2"><AlertCircle className="w-5 h-5" /> Error loading dashboard.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome Back!</h2>
        <p className="mt-1 text-sm text-gray-500">Here is an overview of your account activity.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-6 shadow-lg text-white relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-indigo-100 text-sm font-medium">Current Balance</p>
            <h3 className="text-4xl font-bold mt-2">${Number(dbUser?.balance || 0).toFixed(4)}</h3>
            <Link to="/dashboard/add-funds" className="mt-4 inline-flex items-center text-sm font-medium bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors">
              Add Funds <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <Wallet className="absolute right-4 bottom-4 w-24 h-24 text-white opacity-10 transform rotate-12" />
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-12 h-12 flex items-center justify-center"><TrendingUp className="w-6 h-6" /></div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Total Spent</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">${data?.totalSpent || '0.00'}</h3>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl w-12 h-12 flex items-center justify-center"><ShoppingCart className="w-6 h-6" /></div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Total Orders</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{data?.totalOrders || 0}</h3>
          </div>
        </div>
      </div>
    </div>
  );
}
