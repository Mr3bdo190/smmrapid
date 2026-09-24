import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Share2,
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  Percent,
  Clock,
  ArrowUpRight,
  Sliders,
  AlertCircle,
  CheckCheck,
  Ban
} from 'lucide-react';

export const AdminAffiliatesTab: React.FC = () => {
  const {
    language,
    affiliateReferrals,
    affiliatePayoutRequests,
    affiliateCommissionRate,
    adminUpdateAffiliateSettings,
    adminApprovePayout,
    adminRejectPayout
  } = useApp();
  const isAr = language === 'ar';

  const [newRate, setNewRate] = useState<number>(affiliateCommissionRate);
  const [activeSubTab, setActiveSubTab] = useState<'payouts' | 'referrals'>('payouts');

  const pendingPayouts = affiliatePayoutRequests.filter((p) => p.status === 'pending');
  const totalCommissionPaid = affiliatePayoutRequests
    .filter((p) => p.status === 'approved')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalGeneratedSales = affiliateReferrals.reduce(
    (sum, r) => sum + (r.totalPurchasesUSD ?? r.totalDeposits ?? 0),
    0
  );

  const handleSaveRate = (e: React.FormEvent) => {
    e.preventDefault();
    adminUpdateAffiliateSettings(Number(newRate));
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Share2 className="w-6 h-6 text-purple-500" />
            <span>{isAr ? 'إدارة نظام التسويق بالعمولة (الأفلييت)' : 'Affiliate Program & Payouts'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {isAr
              ? 'مراقبة إحالات المستخدمين، اعتماد وتصريف طلبات سحب الأرباح، وتعديل النسبة المئوية للعمولة.'
              : 'Monitor user referrals, approve payout transactions, and adjust platform commission rates.'}
          </p>
        </div>

        {/* Commission Rate Settings Box */}
        <form onSubmit={handleSaveRate} className="flex items-center gap-2 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 ps-2 flex items-center gap-1">
            <Percent className="w-3.5 h-3.5 text-purple-500" />
            <span>{isAr ? 'نسبة العمولة:' : 'Rate:'}</span>
          </span>
          <input
            type="number"
            min="1"
            max="50"
            value={newRate}
            onChange={(e) => setNewRate(Number(e.target.value))}
            className="w-16 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1 text-xs font-mono font-black text-center text-slate-900 dark:text-white focus:outline-none"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            {isAr ? 'تحديث' : 'Save'}
          </button>
        </form>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 font-bold mb-1">{isAr ? 'طلبات السحب المعلقة' : 'Pending Payouts'}</div>
          <div className="text-2xl font-black text-amber-500 font-mono flex items-center gap-2">
            <span>{pendingPayouts.length}</span>
            {pendingPayouts.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-sans">
                {isAr ? 'بحاجة لمراجعة' : 'Action needed'}
              </span>
            )}
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 font-bold mb-1">{isAr ? 'إجمالي الأرباح المدفوعة' : 'Total Paid Out'}</div>
          <div className="text-2xl font-black text-emerald-500 font-mono">
            ${totalCommissionPaid.toFixed(2)}
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 font-bold mb-1">{isAr ? 'مبيعات الإحالات الكلية' : 'Referred Sales'}</div>
          <div className="text-2xl font-black text-blue-500 font-mono">
            ${totalGeneratedSales.toFixed(2)}
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 font-bold mb-1">{isAr ? 'عمولة الشركاء الحالية' : 'Commission Rate'}</div>
          <div className="text-2xl font-black text-purple-500 font-mono">
            {affiliateCommissionRate}%
          </div>
        </div>
      </div>

      {/* Sub Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab('payouts')}
          className={`px-4 py-2 rounded-2xl font-bold text-xs transition-colors flex items-center gap-2 ${
            activeSubTab === 'payouts'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span>{isAr ? 'طلبات سحب الأرباح' : 'Payout Requests'}</span>
          {pendingPayouts.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center">
              {pendingPayouts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('referrals')}
          className={`px-4 py-2 rounded-2xl font-bold text-xs transition-colors flex items-center gap-2 ${
            activeSubTab === 'referrals'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span>{isAr ? 'سجل الإحالات والمبيعات' : 'Referral Log'}</span>
          <span className="text-[10px] opacity-75">({affiliateReferrals.length})</span>
        </button>
      </div>

      {/* Tab 1: Payout Requests */}
      {activeSubTab === 'payouts' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-extrabold text-[10px]">
                <tr>
                  <th className="p-4">{isAr ? 'معرّف الطلب' : 'ID'}</th>
                  <th className="p-4">{isAr ? 'العميل / الشريك' : 'Partner'}</th>
                  <th className="p-4">{isAr ? 'المبلغ' : 'Amount'}</th>
                  <th className="p-4">{isAr ? 'طريقة السحب والبيانات' : 'Method & Details'}</th>
                  <th className="p-4">{isAr ? 'التاريخ' : 'Date'}</th>
                  <th className="p-4">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-4 text-center">{isAr ? 'الإجراء' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {affiliatePayoutRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      {isAr ? 'لا توجد طلبات سحب أرباح حتى الآن.' : 'No payout requests recorded.'}
                    </td>
                  </tr>
                ) : (
                  affiliatePayoutRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-500">{req.id}</td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-white">{req.userName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{req.userId}</div>
                      </td>
                      <td className="p-4 font-mono font-black text-emerald-500 text-sm">
                        ${req.amount.toFixed(2)}
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">{req.method}</span>
                        <span className="text-[11px] font-mono text-slate-500 block truncate max-w-xs">{req.payoutDetails}</span>
                      </td>
                      <td className="p-4 text-slate-500 text-[11px]">{req.createdAt}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                            req.status === 'approved'
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : req.status === 'pending'
                              ? 'bg-amber-500/15 text-amber-500'
                              : 'bg-rose-500/15 text-rose-500'
                          }`}
                        >
                          {req.status === 'approved'
                            ? (isAr ? 'تم التحويل' : 'Approved')
                            : req.status === 'pending'
                            ? (isAr ? 'قيد المراجعة' : 'Pending')
                            : (isAr ? 'مرفوض' : 'Rejected')}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {req.status === 'pending' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => adminApprovePayout(req.id)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span>{isAr ? 'تحويل واعتماد' : 'Approve'}</span>
                            </button>
                            <button
                              onClick={() => adminRejectPayout(req.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold text-xs transition-colors cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>{isAr ? 'رفض' : 'Reject'}</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Referral Log */}
      {activeSubTab === 'referrals' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-extrabold text-[10px]">
                <tr>
                  <th className="p-4">{isAr ? 'المُسَوّق (الشريك)' : 'Referrer'}</th>
                  <th className="p-4">{isAr ? 'المستخدم المُحال' : 'Referred User'}</th>
                  <th className="p-4">{isAr ? 'تاريخ التسجيل' : 'Date Joined'}</th>
                  <th className="p-4">{isAr ? 'إجمالي المشتريات' : 'Total Purchases'}</th>
                  <th className="p-4">{isAr ? 'العمولة المستحقة' : 'Commission Earned'}</th>
                  <th className="p-4">{isAr ? 'حالة الحساب' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {affiliateReferrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white">{ref.referrerName || ref.referrerUserId}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{ref.referrerId || ref.referrerUserId}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white">{ref.referredUserName}</div>
                      <div className="text-[10px] text-slate-400">{ref.referredUserEmail || ref.referredUserId}</div>
                    </td>
                    <td className="p-4 text-slate-500 font-mono text-[11px]">{ref.dateJoined || ref.registeredDate}</td>
                    <td className="p-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                      ${(ref.totalPurchasesUSD ?? ref.totalDeposits ?? 0).toFixed(2)}
                    </td>
                    <td className="p-4 font-mono font-black text-emerald-500">
                      +${(ref.commissionEarnedUSD ?? ref.commissionEarned ?? 0).toFixed(2)}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-black text-[10px]">
                        {isAr ? 'مستمر / نشط' : 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
