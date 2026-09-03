import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { Shield, ShieldAlert, DollarSign, Eye, X } from 'lucide-react';
import toast from 'react-hot-toast';

function UserDetailsModal({ userId, onClose }: { userId: string, onClose: () => void }) {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-user-details', userId],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch(`/api/admin/users/${userId}`, user, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load user details');
      return res.json();
    }
  });

  if (isLoading) return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full shadow-xl">Loading details...</div>
    </div>
  );
  if (!data) return null;

  const { user: u, orders, payments, tickets } = data;
  const completedOrders = orders.filter((o: any) => o.status === 'Completed').length;
  const pendingOrders = orders.filter((o: any) => o.status === 'Pending').length;
  const totalSpent = orders.reduce((acc: number, curr: any) => acc + Number(curr.charge), 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-5xl w-full shadow-xl my-8 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900">User Details: {u.email}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <p className="text-sm font-medium text-indigo-800">Current Balance</p>
              <p className="text-2xl font-bold text-indigo-900">${Number(u.balance).toFixed(4)}</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
              <p className="text-sm font-medium text-emerald-800">Total Spent</p>
              <p className="text-2xl font-bold text-emerald-900">${totalSpent.toFixed(4)}</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
              <p className="text-sm font-medium text-amber-800">Total Orders</p>
              <p className="text-2xl font-bold text-amber-900">{orders.length}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <p className="text-sm font-medium text-blue-800">Completed Orders</p>
              <p className="text-2xl font-bold text-blue-900">{completedOrders}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Recent Orders</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead><tr><th className="text-left py-2 text-gray-500">Service</th><th className="text-left py-2 text-gray-500">Quantity</th><th className="text-left py-2 text-gray-500">Charge</th><th className="text-left py-2 text-gray-500">Status</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {orders.slice(0, 5).map((o: any) => (
                    <tr key={o.id}><td className="py-2">{o.service?.name}</td><td className="py-2">{o.quantity}</td><td className="py-2">${Number(o.charge).toFixed(4)}</td><td className="py-2">{o.status}</td></tr>
                  ))}
                  {orders.length === 0 && <tr><td colSpan={4} className="py-2 text-gray-500">No orders found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Recent Payments</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead><tr><th className="text-left py-2 text-gray-500">Date</th><th className="text-left py-2 text-gray-500">Method</th><th className="text-left py-2 text-gray-500">Amount</th><th className="text-left py-2 text-gray-500">Status</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {payments.slice(0, 5).map((p: any) => (
                    <tr key={p.id}><td className="py-2">{new Date(p.createdAt).toLocaleDateString()}</td><td className="py-2">{p.method}</td><td className="py-2 text-emerald-600 font-bold">${Number(p.amount).toFixed(4)}</td><td className="py-2">{p.status}</td></tr>
                  ))}
                  {payments.length === 0 && <tr><td colSpan={4} className="py-2 text-gray-500">No payments found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [balanceModal, setBalanceModal] = useState<{id: string, email: string} | null>(null);
  const [balanceAmount, setBalanceAmount] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/admin/users', user, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load data');
      return res.json();
    },
    enabled: !!user,
  });

  const balanceMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: string, amount: number }) => {
      const token = await user?.getIdToken();
      const res = await apiFetch(`/api/admin/users/${id}/balance`, user, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount })
      });
      if (!res.ok) throw new Error('API Error');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Balance updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-details'] });
    },
  });

  const handleAddBalanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanceModal) return;
    const amount = parseFloat(balanceAmount);
    if (!isNaN(amount) && amount !== 0) {
      balanceMutation.mutate({ id: balanceModal.id, amount });
    }
    setBalanceModal(null);
    setBalanceAmount('');
  };

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const token = await user?.getIdToken();
      const res = await apiFetch(`/api/admin/users/${id}/status`, user, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('API Error');
      return res.json();
    },
    onSuccess: () => {
      toast.success('User status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-details'] });
    },
  });

  if (isLoading) return <div>Loading users...</div>;

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900 tracking-tight">User Management</h3>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {users.map((u: any) => (
                <tr key={u.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{u.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{u.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">${Number(u.balance).toFixed(4)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => setSelectedUser(u.id)} className="text-indigo-600 hover:text-indigo-900" title="View Details"><Eye className="w-5 h-5 inline" /></button>
                    {u.status === 'suspended' ? (
                      <button onClick={() => statusMutation.mutate({ id: u.id, status: 'active' })} className="text-emerald-600 hover:text-emerald-900 ml-3" title="Activate"><Shield className="w-5 h-5 inline" /></button>
                    ) : (
                      <button onClick={() => statusMutation.mutate({ id: u.id, status: 'suspended' })} className="text-red-600 hover:text-red-900 ml-3" title="Suspend"><ShieldAlert className="w-5 h-5 inline" /></button>
                    )}
                    <button onClick={() => setBalanceModal({ id: u.id, email: u.email })} className="text-indigo-600 hover:text-indigo-900 ml-3" title="Edit Balance"><DollarSign className="w-5 h-5 inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      
      {selectedUser && <UserDetailsModal userId={selectedUser} onClose={() => setSelectedUser(null)} />}
      
      {balanceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Balance for {balanceModal.email}</h3>
            <form onSubmit={handleAddBalanceSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount to Add / Subtract</label>
                <input type="number" step="0.01" value={balanceAmount} onChange={e => setBalanceAmount(e.target.value)} placeholder="e.g. 50 or -10" className="input-primary w-full" required />
                <p className="text-xs text-gray-500 mt-2">Use positive numbers to add balance, negative numbers to subtract.</p>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setBalanceModal(null)} className="px-4 py-2 border rounded-md">Cancel</button>
                <button type="submit" className="btn-primary">Update Balance</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
