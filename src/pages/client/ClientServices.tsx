import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { Tags } from 'lucide-react';
import { useTranslation } from '../../lib/i18n';

export default function ClientServices() {
  const { user } = useAuth();
  const { t } = useTranslation();

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
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100 flex items-center gap-2"><Tags className="text-indigo-600 dark:text-indigo-400"/> {t('services.title')}</h2>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto w-full">
        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-slate-700">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('services.category')}</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('newOrder.service')}</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('services.rate')}</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('services.minMax')}</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Options</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-100 dark:divide-gray-700">
            {services.map((s: any) => (
              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 dark:hover:bg-slate-700/50">
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">{s.category?.name || 'N/A'}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100 dark:text-gray-200">{s.name}</td>
                <td className="px-6 py-4 text-sm text-right text-emerald-600 dark:text-emerald-400 font-semibold">${Number(s.pricePer1k).toFixed(4)} <span className="text-[11px] text-gray-400 dark:text-gray-500 font-normal">{Number(s.minQuantity)===1&&Number(s.maxQuantity)===1?' / item':' / 1K'}</span></td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{s.minQuantity} / {s.maxQuantity}</td><td className="px-6 py-4 text-sm text-right">{s.refillable?'Refill available':'-'}{s.cancelable?' · Cancel available':''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
