import { useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { Wallet, CreditCard } from 'lucide-react';

export default function ClientAddFunds() {
  const { user } = useAuth();
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'vodafone' | 'kashier' | 'heleket'>('vodafone');
  const [phoneNumber, setPhoneNumber] = useState('');

  const { data: config } = useQuery({
    queryKey: ['client-config'],
    queryFn: async () => {
      const res = await apiFetch('/api/client/config', user);
      return res.ok ? res.json() : {};
    }
  });

  const submitPayment = useMutation({
    mutationFn: async (payload: any) => {
      const token = await user?.getIdToken();
      if (paymentMethod === 'heleket') {
        const res = await apiFetch('/api/heleket/create', user, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ amount: payload.amount })
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Heleket payment init failed');
        return res.json();
      } else if (paymentMethod === 'kashier') {
        const res = await apiFetch('/api/kashier/create', user, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ amount: payload.amount })
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Payment init failed');
        return res.json();
      } else {
        const res = await apiFetch('/api/client/payments', user, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Payment submit failed');
        return res.json();
      }
    },
    onSuccess: (data) => {
      if ((paymentMethod === 'kashier' || paymentMethod === 'heleket') && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        toast.success('Payment request submitted for review!');
        setAmount('');
        setPhoneNumber('');
      }
    },
    onError: (err: any) => toast.error(err.message)
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount < 1) return toast.error('Enter valid amount');
    submitPayment.mutate({ amount: Number(amount), method: paymentMethod === 'vodafone' ? 'Vodafone Cash' : 'Kashier', transactionDetails: { sender_phone_number: phoneNumber } });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Add Funds</h2>
      <div className="flex gap-4 mb-8">
        <button onClick={() => setPaymentMethod('vodafone')} className={`flex-1 py-4 px-6 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'vodafone' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
          <Wallet className="w-8 h-8" /> <span className="font-semibold">Vodafone Cash</span>
        </button>
        <button onClick={() => setPaymentMethod('kashier')} className={`flex-1 py-4 px-6 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'kashier' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
          <CreditCard className="w-8 h-8" /> <span className="font-semibold">Credit/Debit (Kashier)</span>
        </button>
        <button onClick={() => setPaymentMethod('heleket')} className={`flex-1 py-4 px-6 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'heleket' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
          <CreditCard className="w-8 h-8" /> <span className="font-semibold">Crypto (Heleket)</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input type="number" required min="1" value={amount} onChange={e => setAmount(Number(e.target.value))} className="input-primary" placeholder="Amount" />
          </div>
          {paymentMethod === 'vodafone' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg">
                <h4 className="font-semibold text-indigo-800 mb-2">Vodafone Cash Instructions</h4>
                <p className="text-sm text-indigo-700">1. Transfer the amount you wish to add to this number: <strong className="text-lg bg-white px-2 py-1 rounded ml-2 shadow-sm">{config?.vodafoneCashNumber || 'Not set'}</strong></p>
                <p className="text-sm text-indigo-700 mt-2">2. Enter the phone number you transferred <strong>from</strong> below, along with the exact amount you sent.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your (Sender) Phone Number</label>
                <input type="tel" required value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="input-primary" placeholder="010XXXXXXXX" />
              </div>
            </div>
          )}
          <button type="submit" disabled={submitPayment.isPending} className="w-full btn-primary py-3">
            {submitPayment.isPending ? 'Processing...' : 'Submit Payment'}
          </button>
        </form>
      </div>
    </div>
  );
}
