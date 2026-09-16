import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { useTranslation } from '../../lib/i18n';

export default function ClientTransactions() {
  const { user } = useAuth();
  const { t } = useTranslation();

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
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('nav.transactions')}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 -mt-4">{t('transactions.subtitle')}</p>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden w-full">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('transactions.date')}</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('transactions.description')}</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('transactions.amount')}</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('transactions.type')}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-100 dark:divide-slate-700">
              {transactions.length === 0 && <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">{t('transactions.none')}</td></tr>}
              {transactions.map((p: any) => (
                <tr key={p.id}>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{p.description}</td>
                  <td className={`px-6 py-4 text-sm font-bold ${Number(p.amount) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>${Number(p.amount).toFixed(4)}</td>
                  <td className="px-6 py-4 text-sm"><span className="px-2 py-1 rounded w-fit text-xs bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300">{p.type}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
    </div>
  );
}
