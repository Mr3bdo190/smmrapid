
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { useState } from 'react';
import { Plus, Link2 } from 'lucide-react';
import { notify } from '../../lib/notify';
import { useTranslation } from '../../lib/i18n';

export default function AdminShortlinks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', url: '', rewardAmount: '' });

  const { data: shortlinks = [] } = useQuery({
    queryKey: ['admin-shortlinks'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/admin/shortlinks', user, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load data');
      return res.json();
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/admin/shortlinks', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shortlinks'] });
      setIsModalOpen(false);
      notify.success('Shortlink added');
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-on-surface flex items-center gap-2"><Link2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400"/> Shortlinks</h3>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary"><Plus className="w-4 h-4 mr-2" /> Add Link</button>
      </div>
      <div className="bg-surface-container rounded-xl shadow-sm border-outline-variant overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
        <table className="min-w-full divide-y divide-outline-variant">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">URL</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">Reward</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {shortlinks.map((s: any) => (
              <tr key={s.id}>
                <td className="px-6 py-4 text-sm font-medium text-on-surface">{s.name}</td>
                <td className="px-6 py-4 text-sm text-on-surface-variant truncate max-w-[200px]">{s.url}</td>
                <td className="px-6 py-4 text-sm font-bold text-emerald-600 dark:text-emerald-400">${Number(s.rewardAmount).toFixed(4)}</td>
                <td className="px-6 py-4 text-sm"><span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded text-xs">{s.status}</span></td>
                <td className="px-6 py-4 text-sm"><button onClick={async()=>{const token=await user?.getIdToken();const res=await apiFetch(`/api/admin/shortlinks/${s.id}`, user,{method:'DELETE',headers:{Authorization: `Bearer ${token}`}});if(res.ok){notify.success('Shortlink deactivated');queryClient.invalidateQueries({queryKey:['admin-shortlinks']});}else notify.error('Action failed')}} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300">Deactivate</button></td>
              </tr>
            ))}
            {shortlinks.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">No shortlinks found.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container border-outline-variant border-outline-variant rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-on-surface mb-4">Add Shortlink</h3>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(formData); }} className="space-y-4">
              <input required type="text" placeholder="Provider / Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-primary bg-surface-container-high border-outline-variant text-on-surface" />
              <input required type="url" placeholder="URL" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} className="input-primary bg-surface-container-high border-outline-variant text-on-surface" />
              <input required type="number" step="0.0001" placeholder="Reward Amount ($)" value={formData.rewardAmount} onChange={e => setFormData({...formData, rewardAmount: e.target.value})} className="input-primary bg-surface-container-high border-outline-variant text-on-surface" />
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border-gray-300 border-outline-variant rounded-md text-on-surface-variant">Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
