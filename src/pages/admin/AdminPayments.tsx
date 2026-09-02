import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPayments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: payments = [] } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await fetch('/api/admin/payments', { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    }
  });

    const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/admin/payments/${id}/approve`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });


  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/admin/payments/${id}/reject`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('API Error');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Payment rejected');
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
    }
  });
      if (!res.ok) throw new Error('API Error');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Payment approved');
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
    }
  });

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900 tracking-tight">Transactions & Payments</h3>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden w-full">
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Method / Tx ID</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status & Time</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {payments.map((p: any) => (
              <tr key={p.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-4 text-sm text-gray-900">{p.user?.email}</td>
                <td className="px-6 py-4 text-sm text-gray-900 flex flex-col">
                  <span>{p.method}</span>
                  <span className="text-xs text-gray-400">{p.transactionId || 'No Tx ID'}</span>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-emerald-600">${Number(p.amount).toFixed(4)}</td>
                <td className="px-6 py-4 text-sm flex flex-col">
                  <span className={`px-2 py-1 rounded w-fit text-xs ${p.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : p.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{p.status}</span>
                  <span className="text-xs text-gray-500 mt-1">{new Date(p.createdAt).toLocaleString()}</span>
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  {p.status === 'Pending' && (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => approveMutation.mutate(p.id)} className="text-emerald-600 bg-emerald-50 p-2 rounded hover:bg-emerald-100" title="Approve">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => rejectMutation.mutate(p.id)} className="text-red-600 bg-red-50 p-2 rounded hover:bg-red-100" title="Reject">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>

              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
