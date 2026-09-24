import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PaymentGatewayConfig } from '../../types';
import {
  CreditCard,
  Smartphone,
  Bitcoin,
  CheckCircle2,
  XCircle,
  Edit2,
  DollarSign,
  Percent,
  Sliders,
  AlertTriangle,
  Info,
  ShieldCheck,
  Save,
  X
} from 'lucide-react';

export const AdminGatewaysTab: React.FC = () => {
  const { language, paymentGateways, adminUpdateGateway, adminToggleGateway } = useApp();
  const isAr = language === 'ar';

  const [editingGateway, setEditingGateway] = useState<PaymentGatewayConfig | null>(null);
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [minDeposit, setMinDeposit] = useState<number>(5);
  const [maxDeposit, setMaxDeposit] = useState<number>(5000);
  const [depositBonusPercent, setDepositBonusPercent] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState<number | undefined>(undefined);
  const [instructionsAr, setInstructionsAr] = useState('');
  const [instructionsEn, setInstructionsEn] = useState('');

  const handleOpenEdit = (gw: PaymentGatewayConfig) => {
    setEditingGateway(gw);
    setNameAr(gw.nameAr);
    setNameEn(gw.nameEn);
    setAccountNumber(gw.accountNumber || '');
    setAccountName(gw.accountName || '');
    setMinDeposit(gw.minDepositUSD ?? gw.minDeposit ?? 1);
    setMaxDeposit(gw.maxDepositUSD ?? gw.maxDeposit ?? 1000);
    setDepositBonusPercent(gw.depositBonusPercent ?? gw.bonusPercent ?? 0);
    setExchangeRate(gw.exchangeRate ?? 50);
    setInstructionsAr(gw.instructionsAr || '');
    setInstructionsEn(gw.instructionsEn || '');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGateway) return;

    adminUpdateGateway(editingGateway.id, {
      nameAr,
      nameEn,
      accountNumber,
      accountName,
      minDepositUSD: Number(minDeposit),
      maxDepositUSD: Number(maxDeposit),
      depositBonusPercent: Number(depositBonusPercent),
      exchangeRate: exchangeRate ? Number(exchangeRate) : undefined,
      instructionsAr,
      instructionsEn
    });

    setEditingGateway(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-500" />
            <span>{isAr ? 'إدارة بوابات ومحافظ الدفع الإلكتروني' : 'Payment Gateways & Wallets Manager'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {isAr
              ? 'التحكم الكامل في بوابات الدفع، أرقام محافظ الكاش، نسب البونص الإضافي، وسعر صرف الجنيه المصري.'
              : 'Full control over active payment gateways, receiving wallet numbers, deposit bonuses, and exchange rates.'}
          </p>
        </div>
      </div>

      {/* Grid of Payment Gateways */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {paymentGateways.map((gw) => {
          const isWallet = gw.type === 'wallet';
          const isCrypto = gw.type === 'crypto';

          return (
            <div
              key={gw.id}
              className={`p-5 rounded-3xl border transition-all ${
                gw.enabled
                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200/60 dark:border-slate-800/50 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg ${
                      isWallet
                        ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        : isCrypto
                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                    }`}
                  >
                    {isWallet ? (
                      <Smartphone className="w-5 h-5" />
                    ) : isCrypto ? (
                      <Bitcoin className="w-5 h-5" />
                    ) : (
                      <CreditCard className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {isAr ? gw.nameAr : gw.nameEn}
                    </h3>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {(gw.providerKey || gw.id || '').toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Status Toggle */}
                <button
                  type="button"
                  onClick={() => adminToggleGateway(gw.id, !gw.enabled)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-black cursor-pointer transition-colors flex items-center gap-1.5 ${
                    gw.enabled
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {gw.enabled ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isAr ? 'مفعلة' : 'Active'}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{isAr ? 'معطلة' : 'Disabled'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Gateway Attributes */}
              <div className="space-y-2 text-xs border-y border-slate-100 dark:border-slate-800/80 py-3.5 my-3.5">
                {gw.accountNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">
                      {isAr ? 'رقم المحفظة / الحساب:' : 'Account / Wallet:'}
                    </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 select-all">
                      {gw.accountNumber}
                    </span>
                  </div>
                )}
                {gw.accountName && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">
                      {isAr ? 'اسم المستلم:' : 'Holder Name:'}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                      {gw.accountName}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">
                    {isAr ? 'الحد الأدنى / الأقصى:' : 'Min / Max Limit:'}
                  </span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    ${gw.minDepositUSD ?? gw.minDeposit ?? 1} - ${gw.maxDepositUSD ?? gw.maxDeposit ?? 1000}
                  </span>
                </div>
                {(gw.depositBonusPercent ?? gw.bonusPercent ?? 0) > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">
                      {isAr ? 'بونص إيداع إضافي:' : 'Bonus Boost:'}
                    </span>
                    <span className="font-bold text-emerald-500 flex items-center gap-0.5">
                      <Percent className="w-3 h-3" />
                      <span>+{gw.depositBonusPercent ?? gw.bonusPercent}%</span>
                    </span>
                  </div>
                )}
                {gw.exchangeRate && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">
                      {isAr ? 'سعر الصرف المعتمد:' : 'Exchange Rate:'}
                    </span>
                    <span className="font-mono font-bold text-blue-500">
                      1 USD = {gw.exchangeRate} EGP
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-1">
                <button
                  onClick={() => handleOpenEdit(gw)}
                  className="w-full py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تعديل بيانات البوابة' : 'Edit Gateway Settings'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Gateway Modal */}
      {editingGateway && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-500" />
                <span>{isAr ? `تعديل بوابة: ${editingGateway.nameAr}` : `Edit Gateway: ${editingGateway.nameEn}`}</span>
              </h3>
              <button
                onClick={() => setEditingGateway(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isAr ? 'الاسم (عربي):' : 'Name (Arabic):'}
                  </label>
                  <input
                    type="text"
                    required
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isAr ? 'الاسم (إنجليزي):' : 'Name (English):'}
                  </label>
                  <input
                    type="text"
                    required
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {isAr ? 'رقم المحفظة / الحساب / عنوان التحويل:' : 'Wallet Number / Receiving Address:'}
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="010xxxxxxxx or USDT Address"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {isAr ? 'اسم صاحب الحساب / المستلم:' : 'Account Holder Name:'}
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isAr ? 'الحد الأدنى ($):' : 'Min ($):'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={minDeposit}
                    onChange={(e) => setMinDeposit(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isAr ? 'الحد الأقصى ($):' : 'Max ($):'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxDeposit}
                    onChange={(e) => setMaxDeposit(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isAr ? 'بونص إضافي (%):' : 'Bonus (%):'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={depositBonusPercent}
                    onChange={(e) => setDepositBonusPercent(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {exchangeRate !== undefined && (
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isAr ? 'سعر صرف الجنيه المصري (1 USD = X EGP):' : 'EGP Exchange Rate (1 USD = X EGP):'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={exchangeRate || ''}
                    onChange={(e) => setExchangeRate(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {isAr ? 'تعليمات التحويل للعميل (عربي):' : 'Transfer Instructions (Arabic):'}
                </label>
                <textarea
                  rows={2}
                  value={instructionsAr}
                  onChange={(e) => setInstructionsAr(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingGateway(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black shadow-md shadow-blue-500/25 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isAr ? 'حفظ التعديلات' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
