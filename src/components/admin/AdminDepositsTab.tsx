import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DepositRequest } from '../../types';
import {
  Coins,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  Check,
  Smartphone,
  Phone,
  ArrowDownRight,
  ShieldCheck,
  AlertCircle,
  Wallet
} from 'lucide-react';

export const AdminDepositsTab: React.FC = () => {
  const {
    language,
    depositRequests,
    adminApproveDeposit,
    adminRejectDeposit,
    platformSettings
  } = useApp();

  const isAr = language === 'ar';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Reject modal state
  const [rejectingReq, setRejectingReq] = useState<DepositRequest | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  const filteredRequests = depositRequests.filter((req) => {
    const matchesSearch =
      req.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.senderNumber && req.senderNumber.includes(searchTerm)) ||
      (req.transferReference && req.transferReference.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesProvider = providerFilter === 'all' || req.walletProvider === providerFilter;

    return matchesSearch && matchesStatus && matchesProvider;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingReq) return;
    adminRejectDeposit(
      rejectingReq.id,
      rejectReason.trim() || (isAr ? 'بيانات التحويل غير مطابقة ولم يتم استلام المبلغ.' : 'Payment details could not be verified.')
    );
    setRejectingReq(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Coins className="w-6 h-6 text-amber-500" />
            <span>{isAr ? 'مراجعة وتأكيد شحن المحافظ والمدفوعات' : 'E-Wallet Deposit Review & Approvals'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {isAr
              ? 'مطابقة تحويلات فودافون كاش، أورنج كاش، إتصالات كاش، إنستاباي، والتحقق من أرقام هواتف العملاء وإضافة الأرصدة.'
              : 'Match and verify Vodafone, Orange, Etisalat, InstaPay transfers using client sender phone numbers.'}
          </p>
        </div>

        {/* Current EGP exchange rate info badge */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold self-start sm:self-auto">
          <span>{isAr ? 'سعر صرف الجنيه:' : 'EGP Rate:'}</span>
          <span className="font-mono text-sm font-black">1$ = {platformSettings.egpExchangeRate} ج.م</span>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-3" />
          <input
            type="text"
            placeholder={isAr ? 'بحث برقم المحفظة، الاسم، كود الطلب، أو مرجع التحويل...' : 'Search by phone, name, ID, or reference code...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl ps-10 pe-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">{isAr ? 'جميع الحالات' : 'All Status'}</option>
            <option value="pending">{isAr ? 'قيد المراجعة المعلقة' : 'Pending Review'}</option>
            <option value="approved">{isAr ? 'مقبول ومضاف' : 'Approved'}</option>
            <option value="rejected">{isAr ? 'مرفوض' : 'Rejected'}</option>
          </select>

          {/* Provider */}
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">{isAr ? 'جميع المحافظ والوسائل' : 'All Providers'}</option>
            <option value="vodafone">{isAr ? 'فودافون كاش' : 'Vodafone Cash'}</option>
            <option value="orange">{isAr ? 'أورنج كاش' : 'Orange Cash'}</option>
            <option value="etisalat">{isAr ? 'إتصالات كاش' : 'Etisalat Cash'}</option>
            <option value="instapay">{isAr ? 'إنستاباي مصر' : 'InstaPay'}</option>
          </select>
        </div>

      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400">
            <Coins className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="font-bold text-slate-600 dark:text-slate-300 text-sm">
              {isAr ? 'لا توجد طلبات إيداع تطابق المعايير المختارة' : 'No deposit requests found'}
            </p>
          </div>
        ) : (
          filteredRequests.map((req) => {
            const isPending = req.status === 'pending';
            const totalToCredit = Number(((req.amountUSD || 0) + (req.bonusAmount || 0)).toFixed(2));

            return (
              <div
                key={req.id}
                className={`p-5 rounded-3xl border transition-all ${
                  isPending
                    ? 'bg-amber-500/[0.03] dark:bg-amber-500/[0.04] border-amber-500/30 shadow-xs'
                    : req.status === 'approved'
                    ? 'bg-white dark:bg-slate-900 border-emerald-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-75'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left: User & Wallet provider & Sender Number */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {req.id}
                      </span>

                      {/* Provider Badge */}
                      <span
                        className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                          req.walletProvider === 'vodafone'
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                            : req.walletProvider === 'orange'
                            ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
                            : req.walletProvider === 'etisalat'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : req.walletProvider === 'instapay'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                            : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                        }`}
                      >
                        {req.walletProvider === 'vodafone' ? 'فودافون كاش'
                          : req.walletProvider === 'orange' ? 'أورنج كاش'
                          : req.walletProvider === 'etisalat' ? 'إتصالات كاش'
                          : req.walletProvider === 'instapay' ? 'إنستاباي مصر'
                          : req.method}
                      </span>

                      {/* Status */}
                      <span
                        className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                          req.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                            : req.status === 'rejected'
                            ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/30 animate-pulse'
                        }`}
                      >
                        {req.status === 'approved' ? (isAr ? 'تم الشحن والموافقة' : 'Approved')
                          : req.status === 'rejected' ? (isAr ? 'مرفوض' : 'Rejected')
                          : (isAr ? 'في انتظار موافقة المشرف' : 'Pending')}
                      </span>

                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{req.timestamp}</span>
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs">
                      <div>
                        <span className="text-slate-400">{isAr ? 'العميل:' : 'Client:'}</span>{' '}
                        <strong className="text-slate-900 dark:text-white font-bold">{req.userName}</strong>{' '}
                        <span className="text-slate-400 font-mono text-[11px]">({req.userEmail})</span>
                      </div>
                    </div>

                    {/* Prominent SENDER PHONE NUMBER BOX */}
                    {req.senderNumber ? (
                      <div className="inline-flex items-center gap-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                        <Phone className="w-3.5 h-3.5 text-cyan-500" />
                        <span className="text-slate-500 dark:text-slate-400">
                          {isAr ? 'رقم المحفظة المحول منها:' : 'Sender Wallet Phone:'}
                        </span>
                        <span className="font-mono font-black text-sm text-cyan-600 dark:text-cyan-400 tracking-wider">
                          {req.senderNumber}
                        </span>
                        <button
                          onClick={() => handleCopy(req.senderNumber!, req.id + '-sender')}
                          className="p-1 hover:text-cyan-500 text-slate-400 rounded transition-colors"
                          title={isAr ? 'نسخ رقم الهاتف' : 'Copy Phone'}
                        >
                          {copiedId === req.id + '-sender' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic">
                        {isAr ? 'لم يتم إدخال رقم محفظة محول (دفع عبر بوابة تلقائية)' : 'No sender phone specified'}
                      </div>
                    )}

                    {req.transferReference && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {isAr ? 'الرقم المرجعي للتحويل:' : 'Ref Code:'}{' '}
                        <span className="text-slate-700 dark:text-slate-300 font-bold">{req.transferReference}</span>
                      </div>
                    )}
                    {req.notes && req.status === 'rejected' && (
                      <div className="text-xs text-rose-500 font-bold">
                        {isAr ? 'سبب الرفض: ' : 'Reason: '}{req.notes}
                      </div>
                    )}
                  </div>

                  {/* Right: Amounts & Admin Action Buttons */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                    
                    {/* Amount Block */}
                    <div className="text-left sm:text-right">
                      <div className="font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        ${(req.amountUSD ?? 0).toFixed(2)}
                        {(req.bonusAmount ?? 0) > 0 && (
                          <span className="text-xs text-amber-500 font-semibold ms-1.5 font-sans">
                            (+${(req.bonusAmount ?? 0).toFixed(2)} بونص)
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">
                        ≈ {(req.amountEGP ?? Math.round((req.amountUSD || 0) * (platformSettings?.egpExchangeRate || 50))).toLocaleString()} {isAr ? 'جنيه مصري (EGP)' : 'EGP'}
                      </div>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                        {isAr ? `الصافي الذي سيضاف: $${totalToCredit.toFixed(2)}` : `Total credit: $${totalToCredit.toFixed(2)}`}
                      </div>
                    </div>

                    {/* Action buttons if Pending */}
                    {isPending && (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => adminApproveDeposit(req.id)}
                          className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>{isAr ? 'قبول وإضافة الرصيد فوراً' : 'Approve & Credit'}</span>
                        </button>

                        <button
                          onClick={() => setRejectingReq(req)}
                          className="px-3 py-2 rounded-xl border border-rose-500/30 hover:bg-rose-500/10 text-rose-500 font-bold text-xs transition-colors cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span className="hidden sm:inline ms-1">{isAr ? 'رفض' : 'Reject'}</span>
                        </button>
                      </div>
                    )}

                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reject Modal */}
      {rejectingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <h3 className="font-black text-base text-rose-500 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{isAr ? 'رفض طلب الشحن' : 'Reject Deposit Request'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr
                ? `أنت على وشك رفض طلب الشحن رقم ${rejectingReq.id} بقيمة $${rejectingReq.amountUSD}. يرجى توضيح السبب للعميل.`
                : `Rejecting deposit #${rejectingReq.id}. Please specify the reason.`}
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {isAr ? 'سبب الرفض (سيظهر للعميل في الإشعارات):' : 'Rejection Reason (Sent to Client):'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={isAr ? 'مثال: لم يتم استلام المبلغ على الرقم الموضح، أو رقم المحفظة غير مطابق...' : 'e.g. Funds not received'}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRejectingReq(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-md shadow-rose-500/25"
                >
                  {isAr ? 'تأكيد الرفض' : 'Confirm Reject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
