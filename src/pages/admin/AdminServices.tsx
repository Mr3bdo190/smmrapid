import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminServices() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ categoryId: '', name: '', pricePer1k: '', minQuantity: 10, maxQuantity: 10000 });

  const { data: services = [] } = useQuery({
    queryKey: ['admin-services'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/client/services`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!user,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/admin/categories`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      return json.data || json;
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = await user?.getIdToken();
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      setIsModalOpen(false);
      toast.success('Service added');
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Services</h3>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary"><Plus className="w-4 h-4 mr-2" /> Add Service</button>
      </div>
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden w-full">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price/1k</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(services.data || services).map((s: any) => (
              <tr key={s.id}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{s.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{s.category?.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">${Number(s.pricePer1k).toFixed(4)}</td>
                <td className="px-6 py-4 text-sm">{s.status}</td>
                <td className="px-6 py-4 text-sm"><button onClick={async()=>{const token=await user?.getIdToken();const res=await fetch(`/api/admin/services/${s.id}`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({...s,status:s.status==='active'?'inactive':'active',categoryId:s.categoryId,pricePer1k:s.pricePer1k,minQuantity:s.minQuantity,maxQuantity:s.maxQuantity})});if(res.ok){toast.success('Service updated');queryClient.invalidateQueries({queryKey:['admin-services']});}else toast.error('Update failed')}} className="text-indigo-600 hover:underline">{s.status==='active'?'Deactivate':'Activate'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold mb-4">Add Service</h3>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(formData); }} className="space-y-4">
              <select required value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className="input-primary">
                <option value="">Select Category</option>
                {categories.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input required type="text" placeholder="Service Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-primary" />
              <input required type="number" step="0.0001" placeholder="Price Per 1k" value={formData.pricePer1k} onChange={e => setFormData({...formData, pricePer1k: e.target.value})} className="input-primary" />
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
