
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { ListOrdered } from 'lucide-react';

export default function ClientMassOrder() {
  const [ordersText, setOrdersText] = useState('');
  const { user } = useAuth();

  const handleMassOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ordersText.trim()) return toast.error('Please enter orders');
    
    const token = await user?.getIdToken();
    try {
      const res = await fetch('/api/client/orders/mass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ordersText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place orders');
      toast.success(data.message || 'Mass orders processed');
      setOrdersText('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><ListOrdered className="text-indigo-600"/> Mass Order</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleMassOrder} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Orders</label>
            <textarea
              rows={10}
              value={ordersText}
              onChange={(e) => setOrdersText(e.target.value)}
              className="w-full input-field font-mono text-sm"
              placeholder="service_id | link | quantity\nservice_id | link | quantity"
            />
            <p className="text-xs text-gray-500 mt-2">Format: service_id | link | quantity</p>
          </div>
          <button type="submit" className="btn-primary w-full md:w-auto">Submit Orders</button>
        </form>
      </div>
    </div>
  );
}
