
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { Gift, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminMysteryBoxes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', minAmount: '', maxAmount: '', probability: '' });

  const { data: tiers = [] } = useQuery({
    queryKey: ['admin-mystery-tiers'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await fetch('/api/admin/mystery-boxes', { headers: { Authorization: `Bearer ${token}` } });
      return res.ok ? res.json() : [];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = await user?.getIdToken();
      const res = await fetch('/api/admin/mystery-boxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create tier');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-mystery-tiers'] });
      setIsModalOpen(false);
      setFormData({ name: '', minAmount: '', maxAmount: '', probability: '' });
      toast.success('Tier created successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Gift className="w-5 h-5"/> Mystery Box Tiers</h3>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4"/> Add Tier</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Min / Max ($)</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Probability (%)</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {tiers.map((t: any) => (
              <tr key={t.id}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{t.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">${Number(t.minAmount).toFixed(2)} - ${Number(t.maxAmount).toFixed(2)}</td>
                <td className="px-6 py-4 text-sm">{t.probability}%</td>
                <td className="px-6 py-4 text-sm"><span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">{t.status}</span></td>
                <td className="px-6 py-4 text-sm"><button onClick={async()=>{const token=await user?.getIdToken();const res=await fetch(`/api/admin/mystery-boxes/${t.id}`,{method:'DELETE',headers:{Authorization:`Bearer ${token}`}});if(res.ok){toast.success('Tier deactivated');queryClient.invalidateQueries({queryKey:['admin-mystery-tiers']});}else toast.error('Action failed')}} className="text-red-600 hover:underline">Deactivate</button></td>
              </tr>
            ))}
            {tiers.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No tiers found.</td></tr>}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold mb-4">Add Mystery Box Tier</h3>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tier Name (e.g. Bronze, Gold)</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-primary" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Amount ($)</label>
                  <input required type="number" step="0.01" value={formData.minAmount} onChange={e => setFormData({...formData, minAmount: e.target.value})} className="input-primary" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Amount ($)</label>
                  <input required type="number" step="0.01" value={formData.maxAmount} onChange={e => setFormData({...formData, maxAmount: e.target.value})} className="input-primary" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Probability Weight (e.g. 50)</label>
                <input required type="number" value={formData.probability} onChange={e => setFormData({...formData, probability: e.target.value})} className="input-primary" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
