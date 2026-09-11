import { useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { Wallet, ShieldCheck, CheckCircle2 } from 'lucide-react';

const walletMethods = [
  { value: 'vf_cash', label: 'Vodafone Cash', instruction: 'بعد إنشاء الطلب، اطلب *9*1# من خط فودافون خلال دقيقة لتأكيد العملية.' },
  { value: 'or_cash', label: 'Orange Cash', instruction: 'بعد إنشاء الطلب، وافق على طلب الدفع من تطبيق Orange Cash.' },
  { value: 'et_cash', label: 'Etisalat Cash', instruction: 'بعد إنشاء الطلب، وافق على طلب الدفع من تطبيق e& Money / Etisalat Cash.' },
];

export default function ClientAddFunds() {
  const { user } = useAuth();
  const [amount, setAmount] = useState<number | ''>('');
  const [walletMethod, setWalletMethod] = useState('vf_cash');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pendingPayment, setPendingPayment] = useState<any>(null);

  const { data: config } = useQuery({
    queryKey: ['client-config'],
    queryFn: async () => {
      const res = await apiFetch('/api/client/config', user);
      return res.ok ? res.json() : {};
    }
  });

  const submitPayment = useMutation({
    mutationFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/shahnawy/create', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: Number(amount), number: phoneNumber, method: walletMethod })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || body.message || 'Payment initialization failed');
      return body;
    },
    onSuccess: (data) => {
      setPendingPayment(data);
      toast.success('تم إنشاء طلب الدفع. أكّد العملية من محفظتك.');
    },
    onError: (err: any) => toast.error(err.message)
  });

  const confirmPayment = useMutation({
    mutationFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/shahnawy/confirm', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ paymentId: pendingPayment?.paymentId })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 202) throw new Error(body.error || body.message || 'Confirmation failed');
      return { ...body, httpStatus: res.status };
    },
    onSuccess: (data) => {
      if (data.status === 'completed') {
        toast.success('تم تأكيد الدفع وإضافة الرصيد لمحفظتك.');
        setPendingPayment(null);
        setAmount('');
        setPhoneNumber('');
      } else {
        toast(data.message || 'العملية ما زالت معلقة، جرّب التأكيد مرة أخرى.');
      }
    },
    onError: (err: any) => toast.error(err.message)
  });

  const rate = Number(config?.usdExchangeRate || 0);
  const usdPreview = amount && rate > 0 ? Number(amount) / rate : null;
  const selected = walletMethods.find(x => x.value === walletMethod) || walletMethods[0];
  const enabled = config?.shahnawyEnabled;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">إضافة رصيد</h2>
        <p className="text-sm text-gray-500 mt-1">المحفظة الإلكترونية — Crypto (Heleket) متاح أيضاً من طرق الدفع الأخرى.</p>
      </div>

      {!enabled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          الدفع بالمحفظة الإلكترونية غير متاح حالياً. تواصل مع الدعم إذا كنت تحتاج إضافة رصيد.
        </div>
      )}

      {enabled && <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start gap-3 mb-6 rounded-xl bg-indigo-50 border border-indigo-100 p-4">
          <Wallet className="w-6 h-6 text-indigo-600 mt-0.5" />
          <div>
            <h3 className="font-bold text-indigo-900">المحفظة الإلكترونية</h3>
            <p className="text-sm text-indigo-700 mt-1">رقم المحفظة المستقبلة: <strong>{config?.shahnawyMerchantWalletNumber || 'سيتم عرضه عند تفعيل البوابة'}</strong></p>
            <p className="text-xs text-indigo-600 mt-1">يتم التحقق من العملية تلقائياً من بوابة الدفع قبل إضافة أي رصيد.</p>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); if (!amount || Number(amount) < Number(config?.shahnawyMinAmount || 5)) return toast.error(`الحد الأدنى ${config?.shahnawyMinAmount || 5} EGP`); if (!phoneNumber.match(/^01\d{9}$/)) return toast.error('اكتب رقم المحفظة 11 رقم'); submitPayment.mutate(); }} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">اختر المحفظة</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {walletMethods.map(m => <button key={m.value} type="button" onClick={() => setWalletMethod(m.value)} className={`p-4 rounded-xl border-2 text-right transition ${walletMethod === m.value ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <div className="font-semibold text-gray-900">{m.label}</div>
                <div className="text-xs text-gray-500 mt-1">دفع بالمحفظة الإلكترونية</div>
              </button>)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (EGP)</label>
              <input type="number" required min={config?.shahnawyMinAmount || 5} max={config?.shahnawyMaxAmount || 10000} value={amount} onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))} className="input-primary" placeholder="مثال: 100" />
              {usdPreview !== null && <p className="text-xs text-emerald-700 mt-2">سيتم إضافة حوالي <strong>${usdPreview.toFixed(2)}</strong> لرصيدك حسب سعر التحويل الحالي.</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رقم محفظتك</label>
              <input type="tel" required maxLength={11} value={phoneNumber} onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0,11))} className="input-primary" placeholder="010XXXXXXXX" />
              <p className="text-xs text-gray-500 mt-2">هذا هو الرقم الذي ستوافق منه على عملية الدفع.</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="font-semibold text-gray-900 mb-1">طريقة التأكيد</div>
            <p className="text-sm text-gray-600">{selected.instruction}</p>
          </div>

          <button type="submit" disabled={submitPayment.isPending} className="w-full btn-primary py-3">{submitPayment.isPending ? 'جاري إنشاء طلب الدفع...' : 'إنشاء طلب الدفع'}</button>
        </form>
      </div>}

      {pendingPayment && <div className="bg-white rounded-xl shadow-sm border border-emerald-200 p-6">
        <div className="flex items-center gap-2 text-emerald-700 font-bold mb-4"><ShieldCheck className="w-5 h-5" /> طلب دفع قيد التأكيد</div>
        <div className="grid grid-cols-2 gap-4 text-sm mb-5">
          <div><span className="text-gray-500">المبلغ</span><div className="font-bold">{pendingPayment.amountEgp} EGP</div></div>
          <div><span className="text-gray-500">Reference</span><div className="font-bold break-all">{pendingPayment.reference || '-'}</div></div>
        </div>
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 mb-4">{selected.instruction}</div>
        <button onClick={() => confirmPayment.mutate()} disabled={confirmPayment.isPending} className="w-full btn-primary py-3 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> {confirmPayment.isPending ? 'جاري التحقق...' : 'تأكيد الدفع والتحقق من العملية'}
        </button>
      </div>}
    </div>
  );
}
