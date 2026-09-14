import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { Users, Copy, MousePointerClick, UserPlus, Wallet, RefreshCw } from 'lucide-react';
import { notify } from '../../lib/notify';
import { useTranslation } from '../../lib/i18n';

export default function ClientAffiliates() {
  const { user } = useAuth();
  const { t, dir } = useTranslation();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [destination, setDestination] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);

  const { data: config = { minWithdrawalAmount: 5 } } = useQuery({
    queryKey: ['client-config'],
    queryFn: async () => {
      const r = await apiFetch('/api/client/config');
      if (!r.ok) return { minWithdrawalAmount: 5 };
      return r.json();
    },
  });
  const minWithdrawal = config?.minWithdrawalAmount || 5;

  const withdrawals = useQuery({
    queryKey: ['affiliate-withdrawals'],
    enabled: !!user,
    queryFn: async () => {
      const token = await user!.getIdToken();
      const r = await apiFetch('/api/client/affiliates/withdrawals', user, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok ? r.json() : [];
    },
  });

  const requestWithdrawal = async () => {
    setIsRequesting(true);
    try {
      const amt = parseFloat(amount);
      if (isNaN(amt) || amt <= 0) {
        notify.info(t('affiliates.withdrawAmount') || 'Please enter a valid amount.');
        setIsRequesting(false);
        return;
      }
      if (amt < minWithdrawal) {
        notify.info(t('errors.minWithdrawal', { min: minWithdrawal.toFixed(2) }) || `Minimum withdrawal amount is $${minWithdrawal.toFixed(2)}.`);
        setIsRequesting(false);
        return;
      }
      const token = await user!.getIdToken();
      const r = await apiFetch('/api/client/affiliates/withdrawals', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: amt, method, destination }),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) {
        const errMsg = b.error || b.message || 'Withdrawal failed';
        setIsRequesting(false);
        if (b.code === 'MIN_AMOUNT_ERROR' || b.errorKey === 'MIN_AMOUNT_ERROR' || errMsg?.includes('Minimum withdrawal')) {
          const minMatch = errMsg?.match(/\$\s*(\d+(?:\.\d+)?)/) || errMsg?.match(/(\d+(?:\.\d+)?)/);
          const min = minMatch ? parseFloat(minMatch[1]) : minWithdrawal;
          notify.info(t('errors.minWithdrawal', { min: min.toFixed(2) }) || `Minimum withdrawal amount is $${min}.`);
        } else if (errMsg?.includes('Insufficient') || b.code === 'INSUFFICIENT_BALANCE' || b.errorKey === 'INSUFFICIENT_BALANCE') {
          notify.error(t('affiliates.insufficientBalance') || 'Insufficient affiliate balance for this withdrawal.');
        } else if (b.code === 'AFFILIATE_WITHDRAWAL_FAILED' || b.errorKey === 'AFFILIATE_WITHDRAWAL_FAILED') {
          notify.error(t('affiliates.withdrawFailed') || errMsg);
        } else if (errMsg) {
          notify.error(errMsg);
        } else {
          notify.error(t('affiliates.withdrawFailed') || 'Withdrawal failed. Please try again.');
        }
        return;
      }
      notify.success(t('affiliates.withdrawalRequested'));
      setIsRequesting(false);
      setAmount('');
      setMethod('');
      setDestination('');
      await withdrawals.refetch();
    } catch (e: any) {
      const errMsg = e?.message || e?.error || 'Withdrawal failed';
      if (errMsg?.includes('Insufficient') || e?.code === 'INSUFFICIENT_BALANCE' || e?.errorKey === 'INSUFFICIENT_BALANCE') {
        notify.error(t('affiliates.insufficientBalance') || 'Insufficient affiliate balance for this withdrawal.');
      } else if (errMsg?.includes('Minimum') || e?.code === 'MIN_AMOUNT_ERROR' || e?.errorKey === 'MIN_AMOUNT_ERROR') {
        notify.info(t('errors.minWithdrawal', { min: minWithdrawal.toFixed(2) }) || `Minimum withdrawal amount is $${minWithdrawal.toFixed(2)}.`);
      } else if (errMsg) {
        notify.error(errMsg);
      } else {
        notify.error(t('affiliates.withdrawFailed') || 'Withdrawal failed. Please try again.');
      }
      setIsRequesting(false);
    }
  };

  const query = useQuery({
    queryKey: ['client-affiliates-stats'],
    enabled: !!user,
    queryFn: async () => {
      const token = await user!.getIdToken();
      const res = await apiFetch('/api/client/affiliates/stats', user, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        let b: any = {};
        try { b = await res.json(); } catch {}
        throw new Error(b.error || 'Failed to load affiliate stats');
      }
      return res.json();
    },
  });

  const stats = query.data;
  const refLink = stats?.referralLink || (stats?.referralCode ? `${window.location.origin}/?ref=${stats.referralCode}` : '');

  // Compute available affiliate balance: total commission minus approved (paid) withdrawals
  const paidWithdrawals = (withdrawals.data || []).filter((w: any) => w.status === 'Approved');
  const totalPaid = paidWithdrawals.reduce((sum: number, w: any) => sum + Number(w.amount), 0);
  const availableBalance = Number(stats?.totalCommission || 0) - totalPaid;

  const copy = async () => {
    if (!refLink) return notify.error(t('affiliates.linkNotReady'));
    try {
      await navigator.clipboard.writeText(refLink);
      notify.success(t('affiliates.linkCopied'));
    } catch {
      notify.error(t('affiliates.copyFailed'));
    }
  };

  return (
    <div className="space-y-6 max-w-6xl" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="text-indigo-600" />
            {t('affiliates.title')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('affiliates.subtitle')}</p>
        </div>
        <button className="btn-secondary" onClick={() => query.refetch()}>
          <RefreshCw className="w-4 h-4 inline mr-1" />
          {t('common.refresh')}
        </button>
      </div>

      {/* Referral Link */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('affiliates.yourLink')}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('affiliates.linkHint')}</p>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            readOnly
            value={query.isLoading ? t('common.loading') : refLink || t('affiliates.generating')}
            className="input-field flex-1 font-mono text-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
          <button onClick={copy} className="btn-primary">
            <Copy className="w-4 h-4 inline mr-1" />
            {t('affiliates.copyLink')}
          </button>
        </div>
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {t('affiliates.code')} <span className="font-mono font-bold text-gray-900 dark:text-white">{stats?.referralCode || '—'}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          [t('affiliates.clicks'), stats?.clicks || 0, MousePointerClick],
          [t('affiliates.signups'), stats?.signups || 0, UserPlus],
          [t('affiliates.paidReferrals'), stats?.paidReferrals || 0, Users],
          [t('affiliates.referralDeposits'), `$${Number(stats?.referralDeposits || 0).toFixed(2)}`, Wallet],
          [t('affiliates.earnings'), `$${Number(stats?.totalCommission || 0).toFixed(2)}`, Wallet],
        ].map(([l, v, I]: any) => (
          <div key={l} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
            <I className="w-5 h-5 text-indigo-600 mb-3" />
            <p className="text-xs text-gray-500 dark:text-gray-400">{l}</p>
            <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{v}</p>
          </div>
        ))}
      </div>

      {/* Available Affiliate Balance */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border border-indigo-200 dark:border-indigo-800 rounded-xl p-6">
        <h3 className="font-bold text-gray-900 dark:text-white mb-1">{t('affiliates.availableBalance')}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t('affiliates.availableBalanceHint')}</p>
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-black text-indigo-700 dark:text-indigo-300">${availableBalance.toFixed(4)}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{config?.currencyCode || 'USD'}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4 text-center">
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{t('affiliates.totalEarnings')}</span>
            <div className="text-lg font-bold text-gray-900 dark:text-white">${Number(stats?.totalCommission || 0).toFixed(4)}</div>
          </div>
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{t('affiliates.totalPaidOut')}</span>
            <div className="text-lg font-bold text-gray-900 dark:text-white">${totalPaid.toFixed(4)}</div>
          </div>
        </div>
      </div>

      {/* Withdrawals Section */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('affiliates.withdraw')}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t('affiliates.withdrawDesc')}</p>

        {/* Min withdrawal hint */}
        {availableBalance < minWithdrawal && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
            {t('affiliates.insufficientBalance') || 'Your available affiliate balance is below the minimum withdrawal amount.'}
          </p>
        )}

        <div className="grid md:grid-cols-3 gap-3">
          <input
            className="input-primary dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
            type="number"
            min="0"
            step="0.0001"
            placeholder={t('affiliates.withdrawAmount')}
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
          <select
            className="input-primary dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
            value={method}
            onChange={e => setMethod(e.target.value)}
          >
            <option value="">{t('affiliates.withdrawMethod')}</option>
            <option>Bank / Wallet</option>
            <option>Crypto</option>
            <option>Other</option>
          </select>
          <input
            className="input-primary dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
            placeholder={t('affiliates.withdrawDestination')}
            value={destination}
            onChange={e => setDestination(e.target.value)}
          />
        </div>
        <button className="btn-primary mt-3" onClick={requestWithdrawal} disabled={isRequesting}>
          {isRequesting ? (t('common.loading') || 'Requesting...') : t('affiliates.withdrawRequest')}
        </button>

        {/* Withdrawals History */}
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[600px] w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {['Amount', 'Method', 'Status', 'Date'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-400 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {(withdrawals.data || []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-xs text-gray-500 dark:text-gray-400">
                    {t('affiliates.noWithdrawals') || 'No withdrawal requests yet.'}
                  </td>
                </tr>
              ) : (
                (withdrawals.data || []).map((w: any) => (
                  <tr key={w.id}>
                    <td className="px-3 py-2 text-gray-900 dark:text-white">${Number(w.amount).toFixed(4)}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{w.method}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{w.status}</td>
                    <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{new Date(w.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Commission History */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 font-bold text-gray-900 dark:text-white">
          {t('affiliates.commissionHistory')}
        </div>
        <table className="min-w-[700px] w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              {[t('affiliates.referredUser'), t('affiliates.payment'), t('affiliates.commission'), t('transactions.date')].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 dark:text-gray-400 uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {stats?.commissions?.length ? (
              stats.commissions.map((c: any) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{c.referredEmail}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">{c.paymentId?.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-emerald-600 font-semibold">${Number(c.amount).toFixed(4)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{new Date(c.createdAt).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400">
                  {t('affiliates.noCommissions')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
