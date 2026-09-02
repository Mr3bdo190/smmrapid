import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

export default function ClientOrders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: orders = [] } = useQuery({
    queryKey: ['client-orders'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await fetch('/api/client/orders', { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Order History</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden w-full">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-gray-500 text-xs uppercase tracking-wider font-semibold">
                <th className="py-4 px-6">ID</th>
                <th className="py-4 px-6">Service</th>
                <th className="py-4 px-6">Link</th>
                <th className="py-4 px-6 text-right">Quantity</th>
                <th className="py-4 px-6 text-right">Charge</th>
                <th className="py-4 px-6 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o: any) => (
                <tr key={o.id} className="hover:bg-gray-50/50">
                  <td className="py-4 px-6 text-sm text-gray-500 font-mono">{o.id.substring(0,8)}</td>
                  <td className="py-4 px-6 text-sm font-medium text-gray-900">{o.service?.name}</td>
                  <td className="py-4 px-6 text-sm truncate max-w-[200px] text-gray-500">{o.link}</td>
                  <td className="py-4 px-6 text-sm text-right">{o.quantity}</td>
                  <td className="py-4 px-6 text-sm text-right font-medium text-gray-900">${Number(o.charge).toFixed(4)}</td>
                  <td className="py-4 px-6 text-center">
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">{o.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
