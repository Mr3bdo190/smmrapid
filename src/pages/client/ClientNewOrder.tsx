import React, { useState } from "react";
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';

export default function ClientNewOrder() {
  const { user, dbUser } = useAuth();
  const queryClient = useQueryClient();
  const [serviceId, setServiceId] = useState('');
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');

  const { data: services = [] } = useQuery({
    queryKey: ['client-services'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/client/services', user, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load data');
      return res.json();
    },
    enabled: !!user,
  });

  const selectedService = services.find((s: any) => s.id === serviceId);
  const totalPrice = selectedService && quantity ? (Number(selectedService.pricePer1k) / 1000) * Number(quantity) : 0;

  const submitOrderMutation = useMutation({
    mutationFn: async (payload: any) => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/client/orders', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to place order');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Order placed successfully!');
      setLink('');
      setQuantity('');
      queryClient.invalidateQueries({ queryKey: ['client-orders'] });
      setTimeout(() => window.location.reload(), 1000);
    },
    onError: (err: any) => toast.error(err.message)
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId) return toast.error('Please select a service');
    if (totalPrice > Number(dbUser?.balance || 0)) return toast.error('Insufficient balance.');
    submitOrderMutation.mutate({ serviceId, link, quantity: Number(quantity) });
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">New Order</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
          <select value={serviceId} onChange={e => setServiceId(e.target.value)} className="input-primary">
            <option value="" disabled>Choose a Service</option>
            {services.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name} - ${Number(s.pricePer1k).toFixed(4)} per 1000</option>
            ))}
          </select>
        </div>
        {selectedService && (
          <div className="bg-indigo-50 p-4 rounded-md border border-indigo-100 text-sm text-indigo-800 space-y-2">
            <div>
              <span className="font-medium">Min order:</span> {selectedService.minQuantity} <br/>
              <span className="font-medium">Max order:</span> {selectedService.maxQuantity}
            </div>
            {selectedService.description && (
              <div className="pt-2 border-t border-indigo-200">
                <span className="font-medium block mb-1">Description:</span>
                <p className="whitespace-pre-wrap">{selectedService.description}</p>
              </div>
            )}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Link</label>
          <input required type="url" value={link} onChange={e => setLink(e.target.value)} className="input-primary" placeholder="https://..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
          <input required type="number" min={selectedService?.minQuantity || 1} max={selectedService?.maxQuantity || 100000} value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="input-primary" placeholder="1000" />
        </div>
        <div className="pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <span className="text-gray-700 font-medium">Total Charge:</span>
            <span className="text-2xl font-bold text-indigo-600">${totalPrice.toFixed(4)}</span>
          </div>
          <button type="submit" disabled={submitOrderMutation.isPending || !serviceId || !quantity} className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm disabled:opacity-70">
            {submitOrderMutation.isPending ? 'Placing Order...' : 'Place Order'}
          </button>
        </div>
      </form>
    </div>
  );
}
