import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';

export default function ClientTransactions() {
  const { user } = useAuth();

  const { data: transactions = [] } = useQuery({
    queryKey: ['client-transactions'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/client/transactions', user, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load data');
      return res.json();
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden w-full">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {transactions.map((p: any) => (
                <tr key={p.id}>
                  <td className="px-6 py-4 text-sm">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm">{p.description}</td>
                  <td className={`px-6 py-4 text-sm font-bold ${Number(p.amount) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{Number(p.amount) >= 0 ? '+' : ''}${Number(p.amount).toFixed(4)}</td>
                  <td className="px-6 py-4 text-sm"><span className="px-2 py-1 rounded w-fit text-xs bg-gray-100 text-gray-700">{p.type}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
    </div>
  );
}
