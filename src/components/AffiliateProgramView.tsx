import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Share2,
  Copy,
  Check,
  DollarSign,
  Users,
  Award,
  ArrowUpRight,
  TrendingUp,
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X
} from 'lucide-react';

export const AffiliateProgramView: React.FC = () => {
  const {
    language,
    userProfile,
    affiliateReferrals,
    affiliatePayoutRequests,
    affiliateCommissionRate,
    userRequestPayout
  } = useApp();

  const isAr = language === 'ar';
  const [copied, setCopied] = useState(false);

  // Payout Request Modal
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<string>('25');
  const [payoutMethod, setPayoutMethod] = useState<'Vodafone Cash' | 'InstaPay' | 'PayPal' | 'USDT TRC20'>('Vodafone Cash');
  const [payoutDetails, setPayoutDetails] = useState('');
  const [payoutError, setPayoutError] = useState('');

  const referralLink = `https://smmrapid.com/ref/${userProfile.id || 'usr-admin-real'}`;

  // Filter referrals for current user
  const myReferrals = affiliateReferrals.filter(
    (r) => r.referrerId === userProfile.id || r.referrerName === userProfile.name || r.referrerUserId === userProfile.id
  );

  const totalEarned = myReferrals.reduce((sum, r) => sum + (r.commissionEarnedUSD ?? r.commissionEarned ?? 0), 0);

  // Total already approved/paid or pending
  const myPayouts = affiliatePayoutRequests.filter((p) => p.userId === (userProfile.id || 'usr-admin-real'));
  const totalRequested = myPayouts.reduce((sum, p) => sum + p.amount, 0);
  const availableForPayout = Math.max(0, totalEarned - totalRequested);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenPayout = () => {
    setPayoutError('');
    setPayoutAmount(Math.max(10, Math.min(50, availableForPayout)).toString());
    setPayoutDetails('');
    setIsPayoutModalOpen(true);
  };

  const handleSubmitPayout = (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutError('');
    const amt = Number(payoutAmount);

    if (isNaN(amt) || amt < 10) {
      setPayoutError(isAr ? 'الحد الأدنى لطلب السحب هو 10 دولار أمريكي' : 'Minimum payout request is $10 USD');
      return;
    }

    if (amt > availableForPayout) {
      setPayoutError(isAr ? 'المبلغ المطلوب أكبر من رصيدك المتاح للسحب' : 'Amount exceeds available payout balance');
      return;
    }

    if (!payoutDetails.trim()) {
      setPayoutError(isAr ? 'يرجى كتابة رقم المحفظة أو الحساب لاستلام الأرباح' : 'Please provide receiving wallet or account info');
      return;
    }

    const success = userRequestPayout(amt, payoutMethod, payoutDetails.trim());
    if (success) {
      setIsPayoutModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 border border-purple-500/20 p-6 sm:p-8 text-white shadow-xl">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold">
            <Award className="w-3.5 h-3.5 text-purple-400" />
            <span>{isAr ? `اربح ${affiliateCommissionRate}% عمولة مدى الحياة!` : `Earn ${affiliateCommissionRate}% Lifetime Commission!`}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black leading-tight">
            {isAr ? 'برنامج الشركاء والتسويق بالعمولة' : 'Affiliate & Partner Program'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {isAr
              ? `شارك رابط الإحالة الخاص بك مع أصدقائك أو متابعيك، واحصل على عمولة فورية بنسبة ${affiliateCommissionRate}% عن كل عملية شحن أو شراء يقومون بها على المنصة، مع سحب فوري لأرباحك عبر كاش أو إنستاباي أو كريبتو!`
              : `Share your referral link with clients and friends. Earn an instant ${affiliateCommissionRate}% cut on every deposit and order they make, with fast payouts directly to your wallet!`}
          </p>

          {/* Referral Link Box */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              {isAr ? 'رابط الإحالة المباشر الخاص بحسابك:' : 'Your Exclusive Referral Link:'}
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-700">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="bg-transparent border-none text-xs sm:text-sm font-mono text-cyan-300 px-3 py-2 focus:outline-none flex-1 truncate"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الرابط' : 'Copy Link')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Available Balance & Payout CTA */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {isAr ? 'الرصيد المتاح للسحب' : 'Available for Payout'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-emerald-500 font-mono mb-3">
              ${availableForPayout.toFixed(2)}
            </div>
            <button
              onClick={handleOpenPayout}
              disabled={availableForPayout < 10}
              className={`w-full py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
                availableForPayout >= 10
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/25 cursor-pointer'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>{isAr ? 'طلب سحب الأرباح الآن' : 'Request Payout'}</span>
            </button>
            {availableForPayout < 10 && (
              <span className="text-[10px] text-slate-400 text-center block mt-1.5">
                {isAr ? '(الحد الأدنى للسحب: $10)' : '(Min payout: $10)'}
              </span>
            )}
          </div>
        </div>

        {/* Total Earnings */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {isAr ? 'إجمالي الأرباح التاريخية' : 'Lifetime Earnings'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-purple-500 font-mono mb-2">
            ${totalEarned.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-400">
            {isAr ? `بنسبة ${affiliateCommissionRate}% ثابتة على كافة العمليات` : `Fixed ${affiliateCommissionRate}% on all referrals`}
          </p>
        </div>

        {/* Total Referrals */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {isAr ? 'المستخدمين المُسجلين عبرك' : 'Active Referrals'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-blue-500 font-mono mb-2">
            {myReferrals.length} {isAr ? 'عميل' : 'users'}
          </div>
          <p className="text-[11px] text-slate-400">
            {isAr ? 'إحالات مسجلة وموثقة في حسابك' : 'Verified registrations linked to you'}
          </p>
        </div>

      </div>

      {/* Referrals & Payouts Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Referrals Table */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            <span>{isAr ? 'سجل المستخدمين والمبيعات' : 'Referred Users Activity'}</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="text-[10px] text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                <tr>
                  <th className="py-2">{isAr ? 'العميل' : 'Client'}</th>
                  <th className="py-2 text-center">{isAr ? 'تاريخ التسجيل' : 'Date'}</th>
                  <th className="py-2 text-center">{isAr ? 'مشترياته' : 'Spent'}</th>
                  <th className="py-2 text-start sm:text-end">{isAr ? 'ربحك' : 'Your Cut'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {myReferrals.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      {isAr ? 'لم يقم أي عميل بالتسجيل عبر رابطك بعد.' : 'No referrals registered yet.'}
                    </td>
                  </tr>
                ) : (
                  myReferrals.map((r) => (
                    <tr key={r.id}>
                      <td className="py-3">
                        <div className="font-bold text-slate-900 dark:text-white">{r.referredUserName}</div>
                        <div className="text-[10px] text-slate-400">{r.referredUserEmail || r.referredUserId}</div>
                      </td>
                      <td className="py-3 text-center text-slate-500 font-mono text-[11px]">{r.dateJoined || r.registeredDate}</td>
                      <td className="py-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        ${(r.totalPurchasesUSD ?? r.totalDeposits ?? 0).toFixed(2)}
                      </td>
                      <td className="py-3 text-start sm:text-end font-mono font-black text-emerald-500">
                        +${(r.commissionEarnedUSD ?? r.commissionEarned ?? 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payout History */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-500" />
            <span>{isAr ? 'سجل طلبات السحب والتحويلات' : 'Payout Requests History'}</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="text-[10px] text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                <tr>
                  <th className="py-2">{isAr ? 'المبلغ' : 'Amount'}</th>
                  <th className="py-2">{isAr ? 'طريقة السحب' : 'Method'}</th>
                  <th className="py-2 text-center">{isAr ? 'التاريخ' : 'Date'}</th>
                  <th className="py-2 text-start sm:text-end">{isAr ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {myPayouts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      {isAr ? 'لا توجد طلبات سحب سابقة.' : 'No payout requests made.'}
                    </td>
                  </tr>
                ) : (
                  myPayouts.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 font-mono font-black text-slate-900 dark:text-white">
                        ${p.amount.toFixed(2)}
                      </td>
                      <td className="py-3">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{p.method}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-xs">{p.payoutDetails}</div>
                      </td>
                      <td className="py-3 text-center text-slate-500 font-mono text-[11px]">{p.createdAt}</td>
                      <td className="py-3 text-start sm:text-end">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            p.status === 'approved'
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : p.status === 'pending'
                              ? 'bg-amber-500/15 text-amber-500'
                              : 'bg-rose-500/15 text-rose-500'
                          }`}
                        >
                          {p.status === 'approved'
                            ? (isAr ? 'تم التحويل' : 'Paid')
                            : p.status === 'pending'
                            ? (isAr ? 'قيد المراجعة' : 'Pending')
                            : (isAr ? 'مرفوض' : 'Rejected')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Payout Request Modal */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base flex items-center gap-2 text-slate-900 dark:text-white">
                <Wallet className="w-5 h-5 text-emerald-500" />
                <span>{isAr ? 'طلب سحب أرباح التسويق' : 'Request Commission Payout'}</span>
              </h3>
              <button
                onClick={() => setIsPayoutModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {payoutError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{payoutError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitPayout} className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-slate-500 dark:text-slate-400 font-bold block">{isAr ? 'الرصيد المتاح للسحب:' : 'Available Balance:'}</span>
                <span className="text-xl font-mono font-black text-emerald-500">${availableForPayout.toFixed(2)} USD</span>
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {isAr ? 'المبلغ المطلوب سحبه ($ USD):' : 'Requested Payout Amount ($ USD):'}
                </label>
                <input
                  type="number"
                  min="10"
                  max={availableForPayout}
                  step="1"
                  required
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 font-mono text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {isAr ? 'طريقة التحويل المفضلة:' : 'Payout Method:'}
                </label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Vodafone Cash">{isAr ? 'فودافون كاش (مصر)' : 'Vodafone Cash (Egypt)'}</option>
                  <option value="InstaPay">{isAr ? 'إنستاباي / بنك مصري' : 'InstaPay / Bank Transfer'}</option>
                  <option value="PayPal">PayPal</option>
                  <option value="USDT TRC20">USDT (Crypto TRC20)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {isAr ? 'رقم المحفظة / عنوان المحفظة / بريد PayPal:' : 'Wallet Number / Receiving Address / Email:'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    payoutMethod === 'Vodafone Cash'
                      ? '010xxxxxxxx'
                      : payoutMethod === 'InstaPay'
                      ? 'IPA Address (username@instapay)'
                      : payoutMethod === 'PayPal'
                      ? 'user@paypal.com'
                      : 'TRC20 USDT Address...'
                  }
                  value={payoutDetails}
                  onChange={(e) => setPayoutDetails(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-md shadow-emerald-500/25"
                >
                  {isAr ? 'إرسال طلب السحب' : 'Submit Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
