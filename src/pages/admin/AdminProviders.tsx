
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { Server } from 'lucide-react';

import { useQueryClient, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

function ProviderRow({ p }: { p: any }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: balance, isLoading } = useQuery({
    queryKey: ['provider-balance', p.id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/providers/${p.id}/balance`, { headers: { Authorization: `Bearer ${await user?.getIdToken()}` } });
      return res.json();
    }
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/providers/${p.id}/sync`, { method: 'POST', headers: { Authorization: `Bearer ${await user?.getIdToken()}` } });
      if (!res.ok) throw new Error('Sync failed');
      return res.json();
    },
    onSuccess: () => toast.success('Services synchronized')
  });

  return (
    <tr>
      <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.name}</td>
      <td className="px-6 py-4 text-sm text-gray-500">{p.apiUrl}</td>
      <td className="px-6 py-4 text-sm font-medium">
        {isLoading ? '...' : (balance?.balance ? `${balance.balance} ${balance.currency || ''}` : 'Error')}
      </td>
      <td className="px-6 py-4 text-sm"><span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">{p.status}</span></td>
      <td className="px-6 py-4 text-sm">
         <button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} className="text-blue-600 hover:underline">
           {syncMutation.isPending ? 'Syncing...' : 'Sync Services'}
         </button>
      </td>
    </tr>
  );
}

export default function AdminProviders() {
  const { user } = useAuth();
  
  const { data: providers = [] } = useQuery({
    queryKey: ['admin-providers'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await fetch('/api/admin/providers', { headers: { Authorization: `Bearer ${await user?.getIdToken()}` } });
      return res.ok ? res.json() : [];
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Server className="w-5 h-5"/> API Providers</h3>
        <button className="btn-primary">Add Provider</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">URL</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Balance</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {providers.map((p: any) => (
              <ProviderRow key={p.id} p={p}  />
            ))}
            {providers.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No providers found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
