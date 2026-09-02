
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';
import { Plus, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminShortlinks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', url: '', rewardAmount: '' });

  const { data: shortlinks = [] } = useQuery({
    queryKey: ['admin-shortlinks'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await fetch('/api/admin/shortlinks', { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = await user?.getIdToken();
      const res = await fetch('/api/admin/shortlinks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shortlinks'] });
      setIsModalOpen(false);
      toast.success('Shortlink added');
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Link2 className="w-5 h-5"/> Shortlinks</h3>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary"><Plus className="w-4 h-4 mr-2" /> Add Link</button>
      </div>
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden w-full">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reward</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {shortlinks.map((s: any) => (
              <tr key={s.id}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{s.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-[200px]">{s.url}</td>
                <td className="px-6 py-4 text-sm font-bold text-emerald-600">${Number(s.rewardAmount).toFixed(4)}</td>
                <td className="px-6 py-4 text-sm"><span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">{s.status}</span></td>
                <td className="px-6 py-4 text-sm"><button onClick={async()=>{const token=await user?.getIdToken();const res=await fetch(`/api/admin/shortlinks/${s.id}`,{method:'DELETE',headers:{Authorization:`Bearer ${token}`}});if(res.ok){toast.success('Shortlink deactivated');queryClient.invalidateQueries({queryKey:['admin-shortlinks']});}else toast.error('Action failed')}} className="text-red-600 hover:underline">Deactivate</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold mb-4">Add Shortlink</h3>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(formData); }} className="space-y-4">
              <input required type="text" placeholder="Provider / Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-primary" />
              <input required type="url" placeholder="URL" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} className="input-primary" />
              <input required type="number" step="0.0001" placeholder="Reward Amount ($)" value={formData.rewardAmount} onChange={e => setFormData({...formData, rewardAmount: e.target.value})} className="input-primary" />
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md">Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
