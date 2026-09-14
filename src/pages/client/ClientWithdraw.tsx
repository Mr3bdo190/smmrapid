import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet, RefreshCw, Trash2 } from 'lucide-react';
import { notify } from '../../lib/notify';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { useTranslation } from '../../lib/i18n';

type WithdrawMethod = 'eWallet' | 'crypto' | 'bank' | 'vodafone_cash' | 'orange_cash' | 'etisalat_cash';

const methodOptions = [
  { value: 'vodafone_cash', labelKey: 'client.withdraw.vodafoneCash' },
  { value: 'orange_cash', labelKey: 'client.withdraw.orangeCash' },
  { value: 'etisalat_cash', labelKey: 'client.withdraw.etisalatCash' },
  { value: 'eWallet', labelKey: 'client.withdraw.eWallet' },
  { value: 'crypto', labelKey: 'client.withdraw.crypto' },
  { value: 'bank', labelKey: 'client.withdraw.bankTransfer' },
];

export default function ClientWithdraw() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<WithdrawMethod>('vodafone_cash');
  const [destination, setDestination] = useState('');

  const { data: balance = 0, refetch: refetchBalance } = useQuery({
    queryKey: ['client-balance'],
    enabled: !!user,
    queryFn: async () => {
      const token = await user!.getIdToken();
      const r = await apiFetch('/api/client/me', user, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return 0;
      const data = await r.json();
      return Number(data?.balance || 0);
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const token = await user!.getIdToken();
      const r = await apiFetch('/api/client/withdrawals', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: parseFloat(amount), method, destination }),
      });
      let body: any = {};
      try { body = await r.json(); } catch { /* ignore */ }
      if (!r.ok) {
        const error = new Error(body?.error || 'Withdrawal failed') as any;
        error.status = r.status;
        error.code = body?.code;
        error.errorKey = body?.errorKey;
        error.details = body?.details;
        throw error;
      }
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-balance'] });
      qc.invalidateQueries({ queryKey: ['client-withdrawals'] });
      notify.success(t('client.withdraw.success'));
      setAmount('');
      setDestination('');
    },
    onError: (e: any) => {
      if (e?.errorKey === 'MIN_AMOUNT_ERROR' || e?.details?.min) {
        const min = e.details?.min || '5';
        notify.info(t('client.withdraw.minAmount', { min }) || `Minimum withdrawal amount is $${min}.`);
      } else if (e?.message?.includes('Insufficient')) {
        notify.error(t('client.withdraw.insufficientBalance'));
      } else {
        notify.error(e?.message || t('client.withdraw.error'));
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      notify.info(t('client.withdraw.invalidAmount'));
      return;
    }
    if (amt > balance) {
      notify.error(t('client.withdraw.insufficientBalance'));
      return;
    }
    withdrawMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('client.withdraw.title')}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Balance Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
              <h2 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">{t('client.withdraw.balance')}</h2>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">${balance.toFixed(2)}</p>
              <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                Funds are deducted immediately upon withdrawal request. If the request is rejected,
                your balance will be refunded.
              </p>
            </div>

            {/* Withdrawal History */}
            <div className="mt-6 bg-gray-50 dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
              <h2 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">{t('client.withdraw.history')}</h2>
              <WithdrawalHistory />
            </div>
          </div>

          {/* Withdrawal Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">New Withdrawal Request</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('client.withdraw.amount')}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                    required
                  />
                </div>
                {amount && parseFloat(amount) < 5 && (
                  <p className="mt-1 text-xs text-red-500 dark:text-red-400">{t('client.withdraw.minAmount', { min: '5' })}</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('client.withdraw.method')}</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                >
                  {methodOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('client.withdraw.destination')}</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder={t('client.withdraw.destinationPlaceholder')}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={withdrawMutation.isPending || !amount || !destination}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {withdrawMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  t('client.withdraw.submit')
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function WithdrawalHistory() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { data: history = [] } = useQuery({
    queryKey: ['client-withdrawals'],
    enabled: !!user,
    queryFn: async () => {
      const token = await user!.getIdToken();
      const r = await apiFetch('/api/client/withdrawals', user, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return [];
      return r.json() as Promise<any[]>;
    },
  });

  const statusColors: Record<string, string> = {
    Pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
    Approved: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
    Rejected: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
  };

  if (history.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{t('client.withdraw.noHistory')}</p>;
  }

  return (
    <div className="space-y-3">
      {history.slice(0, 10).map((w: any) => (
        <div key={w.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">${Number(w.amount).toFixed(2)}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${statusColors[w.status] || statusColors.Pending}`}>
                {w.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{w.method} • {w.destination}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(w.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
