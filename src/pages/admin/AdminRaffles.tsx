import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { Ticket, Plus, Play, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminRaffles() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: 'Weekly Raffle', prizeAmount: '', ticketPrice: '', maxTickets: '', maxTicketsPerUser: '', endDate: '' });

  const { data: raffles = [], isLoading } = useQuery({
    queryKey: ['admin-raffles'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/admin/raffles', user, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load raffles');
      return res.json();
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = await user?.getIdToken();
      const payload = {
        ...data,
        maxTickets: data.maxTickets ? parseInt(data.maxTickets) : null,
        maxTicketsPerUser: data.maxTicketsPerUser ? parseInt(data.maxTicketsPerUser) : null,
      };
      const res = await apiFetch('/api/admin/raffles', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to create raffle');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-raffles'] });
      setIsModalOpen(false);
      setFormData({ title: 'Weekly Raffle', prizeAmount: '', ticketPrice: '', maxTickets: '', maxTicketsPerUser: '', endDate: '' });
      toast.success('Raffle created successfully');
    },
    onError: (err: any) => toast.error(err.message)
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string, action: 'close' | 'draw' }) => {
      const token = await user?.getIdToken();
      const res = await apiFetch(`/api/admin/raffles/${id}/${action}`, user, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to ${action} raffle`);
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-raffles'] });
      toast.success(`Raffle ${variables.action}d successfully`);
    },
    onError: (err: any) => toast.error(err.message)
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Ticket className="w-5 h-5"/> Raffles Management</h3>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4"/> Create Raffle</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Prize</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tickets</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">End Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {raffles.map((r: any) => (
                  <tr key={r.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.title || 'Weekly Raffle'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">${Number(r.prizeAmount).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${Number(r.ticketPrice).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {r.ticketsCount} {r.maxTickets ? ` / ${r.maxTickets}` : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(r.endDate).toLocaleString()}
                      {new Date() > new Date(r.endDate) && r.status === 'Open' && (
                        <span className="ml-2 text-xs text-red-500 font-bold">(Ended)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${r.status === 'Open' ? 'bg-green-100 text-green-800' : 
                          r.status === 'Closed' ? 'bg-gray-100 text-gray-800' : 
                          'bg-indigo-100 text-indigo-800'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {r.status === 'Open' && (
                        <button 
                          onClick={() => actionMutation.mutate({ id: r.id, action: 'close' })}
                          className="text-red-600 hover:text-red-900 flex items-center gap-1 justify-end ml-auto"
                        >
                          <XCircle className="w-4 h-4" /> Close
                        </button>
                      )}
                      {r.status === 'Closed' && (
                        <button 
                          onClick={() => actionMutation.mutate({ id: r.id, action: 'draw' })}
                          className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1 justify-end ml-auto"
                        >
                          <Play className="w-4 h-4" /> Draw Winner
                        </button>
                      )}
                      {r.status === 'Drawn' && r.winnerId && (
                         <span className="text-emerald-600 font-medium">Winner Drawn</span>
                      )}
                    </td>
                  </tr>
                ))}
                {raffles.length === 0 && <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">No raffles found. Create one to get started.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-6 text-gray-900">Create New Raffle</h3>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="input-primary" placeholder="e.g. Weekly Jackpot" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prize Amount ($)</label>
                  <input required type="number" step="0.01" min="0.01" value={formData.prizeAmount} onChange={e => setFormData({...formData, prizeAmount: e.target.value})} className="input-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ticket Price ($)</label>
                  <input required type="number" step="0.01" min="0" value={formData.ticketPrice} onChange={e => setFormData({...formData, ticketPrice: e.target.value})} className="input-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Total Tickets</label>
                  <input type="number" min="1" placeholder="Optional" value={formData.maxTickets} onChange={e => setFormData({...formData, maxTickets: e.target.value})} className="input-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Per User</label>
                  <input type="number" min="1" placeholder="Optional" value={formData.maxTicketsPerUser} onChange={e => setFormData({...formData, maxTicketsPerUser: e.target.value})} className="input-primary" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input required type="datetime-local" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="input-primary" />
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary px-6 py-2">Create Raffle</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
