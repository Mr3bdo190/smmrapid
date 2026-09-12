import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notify } from '../../lib/notify';

import { LifeBuoy, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../lib/i18n';

export default function ClientTickets() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/client/tickets', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, message })
      });
      if (!res.ok) throw new Error('Failed to create ticket');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-tickets'] });
      setIsModalOpen(false);
      setSubject('');
      setMessage('');
      notify.success(t('tickets.created'));
    },
    onError: (err: any) => notify.error(err.message)
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ['client-tickets'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/client/tickets', user, { headers: { Authorization: `Bearer ${token}` } });
      return res.ok ? res.json() : [];
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><LifeBuoy className="text-indigo-600"/> {t('nav.tickets')}</h2>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">{t('tickets.newTicket')}</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto w-full">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">{t('tickets.subject')}</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">{t('common.status')}</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">{t('transactions.date')}</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {tickets.map((tk: any) => (
              <tr key={tk.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{tk.subject}</td>
                <td className="px-6 py-4 text-sm"><span className="px-2 py-1 rounded bg-gray-100">{tk.status}</span></td>
                <td className="px-6 py-4 text-sm text-gray-500">{new Date(tk.createdAt).toLocaleString()}</td>
                <td className="px-6 py-4 text-right"><Link to={`/dashboard/tickets/${tk.id}`} className="text-indigo-600 hover:text-indigo-900"><Eye className="w-4 h-4"/></Link></td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">{t('tickets.none')}</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold mb-4">{t('tickets.createNew')}</h3>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tickets.subject')}</label>
                <input required type="text" value={subject} onChange={e => setSubject(e.target.value)} className="input-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tickets.message')}</label>
                <textarea required rows={4} value={message} onChange={e => setMessage(e.target.value)} className="input-primary"></textarea>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md">{t('common.cancel')}</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">{t('tickets.submit')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
