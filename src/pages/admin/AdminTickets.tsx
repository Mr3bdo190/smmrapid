import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { LifeBuoy, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../lib/i18n';

export default function AdminTickets() {
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const { data: tickets = [] } = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/admin/tickets', user, { headers: { Authorization: `Bearer ${token}` } });
      return res.ok ? res.json() : [];
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"><LifeBuoy className="w-5 h-5 text-indigo-600 dark:text-indigo-400"/> {t('admin.tickets.title')}</h3>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto w-full">
        <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-700/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('common.email')}</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('tickets.subject')}</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('common.status')}</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('common.date')}</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-100 dark:divide-slate-700">
            {tickets.map((t: any) => (
              <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-200">{t.user?.email}</td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">{t.subject}</td>
                <td className="px-6 py-4 text-sm"><span className="px-2 py-1 rounded bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200">{t.status}</span></td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{new Date(t.createdAt).toLocaleString()}</td>
                <td className="px-6 py-4 text-right"><Link to={`/admin/tickets/${t.id}`} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"><Eye className="w-4 h-4"/></Link></td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">{t('admin.tickets.noTickets')}</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
