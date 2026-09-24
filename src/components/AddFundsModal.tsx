import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { PAYMENT_METHODS } from '../data/mockData';
import { EWalletProvider } from '../types';
import {
  X,
  CreditCard,
  Smartphone,
  Coins,
  ShieldCheck,
  Wallet,
  Zap,
  Lock,
  Gift,
  Copy,
  Check,
  Info,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  QrCode
} from 'lucide-react';

interface AddFundsModalProps {
  onClose: () => void;
}

export const AddFundsModal: React.FC<AddFundsModalProps> = ({ onClose }) => {
  const {
    language,
    platformSettings,
    submitDepositRequest,
    createSha7nawyPayment,
    confirmSha7nawyPayment,
    createHeleketPayment,
    checkHeleketPayment,
    showToast
  } = useApp();

  const isAr = language === 'ar';

  const [selectedMethodId, setSelectedMethodId] = useState<string>('wallets');
  const [selectedWalletProvider, setSelectedWalletProvider] = useState<EWalletProvider>('vodafone');
  const [senderWalletNumber, setSenderWalletNumber] = useState<string>('');
  const [transferRefCode, setTransferRefCode] = useState<string>('');
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const [customAmount, setCustomAmount] = useState<string>('50');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [isProcessing, setIsProcessing] = useState(false);

  // Verification View States: 'form' | 'sha7nawy_pending' | 'sha7nawy_success' | 'heleket_pending' | 'heleket_success'
  const [viewState, setViewState] = useState<'form' | 'sha7nawy_pending' | 'sha7nawy_success' | 'heleket_pending' | 'heleket_success'>('form');

  // Sha7nawy Verification Details
  const [sha7nawyData, setSha7nawyData] = useState<{
    refCode: string;
    actionCode: string;
    instructions: string;
    amountEgp: number;
    amountUsd: number;
    phone: string;
    txId?: string;
  } | null>(null);
  const [sha7nawyCountdown, setSha7nawyCountdown] = useState<number>(60);
  const [sha7nawyStatusMessage, setSha7nawyStatusMessage] = useState<string>('');
  const [isConfirmingSha7nawy, setIsConfirmingSha7nawy] = useState<boolean>(false);

  // Heleket Verification Details
  const [heleketData, setHeleketData] = useState<{
    invoiceId: string;
    address: string;
    currency: string;
    amountUsd: number;
    amountCrypto: number;
    txId?: string;
  } | null>(null);
  const [heleketCountdown, setHeleketCountdown] = useState<number>(3600);
  const [isCheckingHeleket, setIsCheckingHeleket] = useState<boolean>(false);
  const [copiedCryptoAddress, setCopiedCryptoAddress] = useState(false);

  // Polling timers
  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Countdown timer for Sha7nawy (60 seconds)
  useEffect(() => {
    let timer: any;
    if (viewState === 'sha7nawy_pending' && sha7nawyCountdown > 0) {
      timer = setInterval(() => {
        setSha7nawyCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setSha7nawyStatusMessage(isAr ? 'انتهت مهلة الـ 60 ثانية لتأكيد المعاملة. يمكنك إعادة المحاولة.' : 'Session timed out. Please retry.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [viewState, sha7nawyCountdown, isAr]);

  // Countdown timer for Heleket (1 hour)
  useEffect(() => {
    let timer: any;
    if (viewState === 'heleket_pending' && heleketCountdown > 0) {
      timer = setInterval(() => {
        setHeleketCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [viewState, heleketCountdown]);

  const selectedMethod = PAYMENT_METHODS.find((m) => m.id === selectedMethodId) || PAYMENT_METHODS[0];

  // Bonus calculation
  const numAmount = Number(customAmount) || 0;
  const bonusPct = numAmount >= 250 ? 0.15 : numAmount >= 100 ? 0.10 : numAmount >= 50 ? 0.05 : 0;
  const bonusAmount = Number((numAmount * bonusPct).toFixed(2));
  const totalCredited = Number((numAmount + bonusAmount).toFixed(2));
  const egpEquivalent = Math.round(numAmount * (platformSettings.egpExchangeRate || 50));

  const presetAmounts = [10, 25, 50, 100, 250];

  const handleSelectPreset = (val: number) => {
    setCustomAmount(val.toString());
  };

  // Get active receiver wallet number (Fallback / InstaPay)
  const getReceiverDetails = () => {
    switch (selectedWalletProvider) {
      case 'vodafone':
        return {
          title: isAr ? 'فودافون كاش - Vodafone Cash' : 'Vodafone Cash',
          number: platformSettings.vodafoneCashNumber,
          color: 'from-rose-500 to-red-600',
          badge: isAr ? 'تحقق آلي عبر شحناوي' : 'Sha7nawy Instant Gate'
        };
      case 'orange':
        return {
          title: isAr ? 'أورنج كاش - Orange Cash' : 'Orange Cash',
          number: platformSettings.orangeCashNumber,
          color: 'from-orange-500 to-amber-600',
          badge: isAr ? 'تحقق آلي عبر شحناوي' : 'Sha7nawy Instant Gate'
        };
      case 'etisalat':
        return {
          title: isAr ? 'إتصالات كاش - Etisalat Cash' : 'Etisalat Cash',
          number: platformSettings.etisalatCashNumber,
          color: 'from-emerald-500 to-green-600',
          badge: isAr ? 'تحقق آلي عبر شحناوي' : 'Sha7nawy Instant Gate'
        };
      case 'instapay':
        return {
          title: isAr ? 'إنستاباي مصر - InstaPay' : 'InstaPay Egypt',
          number: platformSettings.instaPayUsername,
          color: 'from-purple-600 to-indigo-600',
          badge: isAr ? 'بدون رسوم' : 'Zero Fees'
        };
    }
  };

  const currentReceiver = getReceiverDetails();

  const handleCopyReceiverNumber = () => {
    navigator.clipboard.writeText(currentReceiver.number);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  const copyCryptoAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedCryptoAddress(true);
    setTimeout(() => setCopiedCryptoAddress(false), 2000);
  };

  // SHA7NAWY: Confirm payment check
  const performSha7nawyConfirmation = async (refCode: string) => {
    setIsConfirmingSha7nawy(true);
    try {
      const res = await confirmSha7nawyPayment(refCode);
      if (res.success && res.status === 'completed') {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setSha7nawyData((prev) => prev ? { ...prev, txId: res.data?.gateway_tx_id || res.data?.id } : null);
        setViewState('sha7nawy_success');
        return true;
      } else {
        setSha7nawyStatusMessage(res.message || (isAr ? 'العملية قيد انتظار موافقتك على الهاتف' : 'Pending authorization'));
        return false;
      }
    } catch (e: any) {
      setSha7nawyStatusMessage(e.message);
      return false;
    } finally {
      setIsConfirmingSha7nawy(false);
    }
  };

  // HELEKET: Check blockchain status
  const performHeleketCheck = async (invoiceId: string) => {
    setIsCheckingHeleket(true);
    try {
      const res = await checkHeleketPayment(invoiceId);
      if (res.success && res.status === 'completed') {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setHeleketData((prev) => prev ? { ...prev, txId: res.data?.gateway_tx_id || res.data?.id } : null);
        setViewState('heleket_success');
        return true;
      } else {
        showToast({
          type: 'info',
          title: isAr ? 'فحص البلوكتشين عبر Heleket' : 'Blockchain Status',
          message: res.error || (isAr ? 'في انتظار وصول تأكيدات الشبكة' : 'Awaiting network confirmation')
        });
        return false;
      }
    } catch (e: any) {
      showToast({
        type: 'warning',
        title: isAr ? 'خطأ أثناء الفحص' : 'Check Error',
        message: e.message
      });
      return false;
    } finally {
      setIsCheckingHeleket(false);
    }
  };

  // Primary Submit Handler
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalletError(null);

    if (numAmount < selectedMethod.min) {
      setWalletError(isAr ? `الحد الأدنى للإيداع هو $${selectedMethod.min}` : `Minimum deposit is $${selectedMethod.min}`);
      return;
    }

    // 1. Electronic Wallets (Vodafone, Orange, Etisalat) via SHA7NAWY GATEWAY
    if (selectedMethodId === 'wallets') {
      if (selectedWalletProvider === 'vodafone' || selectedWalletProvider === 'orange' || selectedWalletProvider === 'etisalat') {
        if (!senderWalletNumber.trim() || senderWalletNumber.trim().length < 10) {
          setWalletError(
            isAr
              ? 'يرجى إدخال رقم محفظتك المكون من 11 رقماً (مثال: 010xxxxxxxx أو 012xxxxxxxx أو 011xxxxxxxx).'
              : 'Please enter your valid 11-digit mobile wallet number.'
          );
          return;
        }

        setIsProcessing(true);
        const methodMap: Record<string, 'vf_cash' | 'or_cash' | 'et_cash'> = {
          vodafone: 'vf_cash',
          orange: 'or_cash',
          etisalat: 'et_cash'
        };

        const res = await createSha7nawyPayment({
          number: senderWalletNumber.trim(),
          amountUSD: numAmount,
          method: methodMap[selectedWalletProvider]
        });

        setIsProcessing(false);

        if (res.success && res.data) {
          setSha7nawyData({
            refCode: res.data.ref_code,
            actionCode: res.data.action_code,
            instructions: res.data.instructions,
            amountEgp: res.data.amount_egp,
            amountUsd: res.data.amount_usd,
            phone: senderWalletNumber.trim()
          });
          setSha7nawyCountdown(60);
          setSha7nawyStatusMessage(res.data.instructions);
          setViewState('sha7nawy_pending');

          // Auto-poll every 3.5 seconds
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = setInterval(() => {
            performSha7nawyConfirmation(res.data.ref_code);
          }, 3500);

        } else {
          setWalletError(res.error || (isAr ? 'تعذر بدء طلب الدفع عبر شحناوي' : 'Failed to start payment via Sha7nawy'));
        }
        return;
      }

      // InstaPay (Direct reference submission with admin auto-match)
      if (selectedWalletProvider === 'instapay') {
        if (!senderWalletNumber.trim()) {
          setWalletError(isAr ? 'يرجى إدخال رقم أو عنوان حساب InstaPay المحول منه.' : 'Please enter your InstaPay sender address/number.');
          return;
        }
        setIsProcessing(true);
        setTimeout(() => {
          submitDepositRequest({
            method: 'instapay',
            walletProvider: 'instapay',
            senderNumber: senderWalletNumber.trim(),
            transferReference: transferRefCode.trim(),
            amountUSD: numAmount
          });
          setIsProcessing(false);
          showToast({
            type: 'info',
            title: isAr ? 'تم تسجيل إيداع InstaPay' : 'InstaPay Request Submitted',
            message: isAr ? 'جاري التحقق الفوري ومطابقة المعاملة لإضافة الرصيد.' : 'Verifying transaction to credit your balance.'
          });
          onClose();
        }, 800);
        return;
      }
    }

    // 2. Crypto via HELEKET GATEWAY
    if (selectedMethodId === 'crypto') {
      setIsProcessing(true);
      const res = await createHeleketPayment({
        amountUSD: numAmount,
        currency: 'USDT-TRC20'
      });
      setIsProcessing(false);

      if (res.success && res.data) {
        setHeleketData({
          invoiceId: res.data.invoice_id,
          address: res.data.address,
          currency: res.data.currency,
          amountUsd: res.data.amount_usd,
          amountCrypto: res.data.amount_crypto
        });
        setHeleketCountdown(3600);
        setViewState('heleket_pending');

        // Auto-poll every 6 seconds
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = setInterval(() => {
          performHeleketCheck(res.data.invoice_id);
        }, 6000);

      } else {
        setWalletError(res.error || (isAr ? 'فشل إنشاء فاتورة الدفع عبر بوابة Heleket' : 'Failed to generate invoice'));
      }
      return;
    }

    // Other methods (Card / etc.)
    setIsProcessing(true);
    setTimeout(() => {
      submitDepositRequest({
        method: selectedMethodId as any,
        senderNumber: cardNumber.slice(-4),
        amountUSD: numAmount
      });
      setIsProcessing(false);
      showToast({
        type: 'info',
        title: isAr ? 'طلب الدفع قيد المعالجة المباشرة' : 'Processing Payment',
        message: isAr ? 'يتم التحقق من بوابة الدفع لإتمام الشحن.' : 'Payment is being verified.'
      });
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative text-slate-900 dark:text-white">
        
        {/* ================= HEADER ================= */}
        <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">
                {isAr ? 'شحن الرصيد والتحقق عبر بوابات الدفع' : 'Automated Gateway Payment & Funds'}
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {isAr ? 'بوابة شحناوي (Sha7nawy) • بوابة هيلكيت (Heleket) • تأكيد آلي فوري' : 'Sha7nawy Gate • Heleket Crypto • Instant Auto-Verification'}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= VIEW 1: SHA7NAWY PENDING VERIFICATION ================= */}
        {viewState === 'sha7nawy_pending' && sha7nawyData && (
          <div className="p-6 space-y-6 text-center animate-in zoom-in-95 duration-200">
            
            {/* Status Icon & Timer */}
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-rose-500/10 border-2 border-rose-500 flex items-center justify-center text-rose-500 animate-pulse">
                  <Smartphone className="w-10 h-10" />
                </div>
                <div className="absolute -bottom-1 -end-1 bg-rose-600 text-white font-mono font-black text-xs px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{sha7nawyCountdown}s</span>
                </div>
              </div>

              <div>
                <h4 className="font-black text-lg text-slate-900 dark:text-white">
                  {isAr ? 'يرجى تأكيد السحب على هاتفك الآن' : 'Authorize Deduction on Your Mobile Phone'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  {sha7nawyData.instructions}
                </p>
              </div>
            </div>

            {/* USSD / Action Details Box */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-start space-y-3">
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{isAr ? 'الرقم المرجعي (Ref Code):' : 'Reference Code:'}</span>
                <span className="font-mono font-black text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">
                  {sha7nawyData.refCode}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{isAr ? 'رقم محفظتك:' : 'Your Wallet Number:'}</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {sha7nawyData.phone}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{isAr ? 'المبلغ المطلوب سحبه:' : 'Amount to Deduct:'}</span>
                <span className="font-black text-rose-600 dark:text-rose-400 text-sm">
                  {(sha7nawyData.amountEgp ?? 0).toLocaleString()} {isAr ? 'جنيه مصري' : 'EGP'}
                  <span className="text-[10px] text-slate-400 font-normal ms-1">(${sha7nawyData.amountUsd})</span>
                </span>
              </div>

              {sha7nawyData.actionCode && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    {isAr ? 'كود التحقق على الهاتف:' : 'USSD Phone Code:'}
                  </span>
                  <span className="font-mono font-black text-xl text-rose-600 dark:text-rose-400 tracking-wider">
                    {sha7nawyData.actionCode}
                  </span>
                </div>
              )}

            </div>

            {/* Live Polling Status */}
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-500" />
              <span>
                {sha7nawyStatusMessage || (isAr ? 'في انتظار موافقة العميل على الهاتف...' : 'Awaiting mobile confirmation...')}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                disabled={isConfirmingSha7nawy || sha7nawyCountdown === 0}
                onClick={() => performSha7nawyConfirmation(sha7nawyData.refCode)}
                className="w-full py-3.5 px-4 rounded-xl font-black text-sm text-white bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 shadow-md shadow-rose-500/25 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isConfirmingSha7nawy ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isAr ? 'جاري التحقق من السحب...' : 'Verifying Deduction...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isAr ? 'تمت الموافقة على هاتفي - إضافة الرصيد فوراً' : 'I Confirmed on Phone - Credit My Wallet'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                  setViewState('form');
                }}
                className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                {isAr ? 'إلغاء أو تعديل البيانات' : 'Cancel or Edit Info'}
              </button>
            </div>

          </div>
        )}

        {/* ================= VIEW 2: SHA7NAWY SUCCESS ================= */}
        {viewState === 'sha7nawy_success' && sha7nawyData && (
          <div className="p-6 space-y-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-1">
              <h4 className="font-black text-xl text-slate-900 dark:text-white">
                {isAr ? 'تم تأكيد الإيداع وإضافة الرصيد بنجاح! 🎉' : 'Payment Confirmed & Balance Credited! 🎉'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr
                  ? 'تم التحقق من بوابة شحnaوي بنجاح وتمت إضافة المبلغ إلى محفظتك على الفور.'
                  : 'Transaction verified by Sha7nawy and funds credited instantly.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-start space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">{isAr ? 'المبلغ المضاف:' : 'Amount Credited:'}</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  +${sha7nawyData.amountUsd.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isAr ? 'رقم المعاملة:' : 'Transaction ID:'}</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{sha7nawyData.txId || sha7nawyData.refCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isAr ? 'حالة العملية:' : 'Status:'}</span>
                <span className="font-bold text-emerald-600">{isAr ? 'مكتمل وموثق آلياً' : 'Completed & Verified'}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 px-4 rounded-xl font-black text-sm text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
            >
              {isAr ? 'تم - بدء استخدام الرصيد الآن' : 'Done - Start Ordering'}
            </button>
          </div>
        )}

        {/* ================= VIEW 3: HELEKET PENDING VERIFICATION ================= */}
        {viewState === 'heleket_pending' && heleketData && (
          <div className="p-6 space-y-6 text-center animate-in zoom-in-95 duration-200">
            
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center">
                <Coins className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-black text-lg text-slate-900 dark:text-white">
                  {isAr ? 'فاتورة الدفع المشفرة (بوابة Heleket)' : 'Heleket Crypto Payment Invoice'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isAr ? 'قم بتحويل المبلغ بدقة لعنوان المحفظة أدناه، وسيتم التأكيد فوراً عبر البلوكتشين.' : 'Transfer exact amount to the address below. Auto-credited on confirmation.'}
                </p>
              </div>
            </div>

            {/* Address & Amount Box */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-start space-y-3">
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{isAr ? 'رقم الفاتورة (Invoice):' : 'Invoice ID:'}</span>
                <span className="font-mono font-bold text-amber-500">{heleketData.invoiceId}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{isAr ? 'الشبكة والعملة:' : 'Network & Currency:'}</span>
                <span className="font-bold text-slate-900 dark:text-white">{heleketData.currency} (TRC20)</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{isAr ? 'المبلغ المطلوب إرساله بالضبط:' : 'Exact Amount to Send:'}</span>
                <span className="font-mono font-black text-amber-500 text-sm">
                  {heleketData.amountCrypto} USDT
                </span>
              </div>

              {/* Deposit Address Box with Copy */}
              <div className="space-y-1 pt-1">
                <span className="text-[11px] text-slate-400 block font-bold">
                  {isAr ? 'عنوان الإيداع (Deposit Address):' : 'Deposit Address:'}
                </span>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="font-mono text-xs font-bold text-amber-400 break-all select-all flex-1">
                    {heleketData.address}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyCryptoAddress(heleketData.address)}
                    className="p-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shrink-0 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCryptoAddress ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCryptoAddress ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ' : 'Copy')}</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Live Blockchain Poller */}
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
              <span>{isAr ? 'نظام Heleket يفحص شبكة البلوكتشين تلقائياً كل بضع ثوانٍ...' : 'Auto-polling blockchain for incoming confirmations...'}</span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                disabled={isCheckingHeleket}
                onClick={() => performHeleketCheck(heleketData.invoiceId)}
                className="w-full py-3.5 px-4 rounded-xl font-black text-sm text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-500/25 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isCheckingHeleket ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isAr ? 'جاري فحص تأكيدات الشبكة...' : 'Checking Confirmations...'}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>{isAr ? 'فحص وتأكيد وصول الإيداع (Check Blockchain)' : 'Verify Payment via Heleket'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                  setViewState('form');
                }}
                className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                {isAr ? 'الرجوع لاختيار وسيلة أخرى' : 'Back to Payment Methods'}
              </button>
            </div>

          </div>
        )}

        {/* ================= VIEW 4: HELEKET SUCCESS ================= */}
        {viewState === 'heleket_success' && heleketData && (
          <div className="p-6 space-y-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-1">
              <h4 className="font-black text-xl text-slate-900 dark:text-white">
                {isAr ? 'تم تأكيد الإيداع عبر Heleket بنجاح! 💎' : 'Crypto Deposit Confirmed! 💎'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr
                  ? 'تم استلام وتأكيد المعاملة المشفرة على البلوكتشين، وأصبح الرصيد متاحاً في حسابك.'
                  : 'Blockchain confirmations reached. Wallet balance updated.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-start space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">{isAr ? 'المبلغ المضاف:' : 'Credited Amount:'}</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  +${heleketData.amountUsd.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isAr ? 'معرف الفاتورة:' : 'Invoice ID:'}</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{heleketData.invoiceId}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 px-4 rounded-xl font-black text-sm text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
            >
              {isAr ? 'إغلاق والبدء في تقديم الطلبات' : 'Close & Start Ordering'}
            </button>
          </div>
        )}

        {/* ================= VIEW 0: MAIN PAYMENT FORM ================= */}
        {viewState === 'form' && (
          <form onSubmit={handleDepositSubmit} className="p-5 sm:p-6 space-y-5">
            
            {/* Method Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                {isAr ? '1. اختر وسيلة الدفع المعتمدة:' : '1. Select Payment Method:'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = selectedMethodId === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedMethodId(method.id)}
                      className={`flex items-start gap-3 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                        {method.id === 'wallets' && <Wallet className="w-4 h-4 text-rose-500" />}
                        {method.id === 'card' && <CreditCard className="w-4 h-4 text-blue-500" />}
                        {method.id === 'apple_pay' && <Smartphone className="w-4 h-4 text-slate-800 dark:text-white" />}
                        {method.id === 'crypto' && <Coins className="w-4 h-4 text-amber-500" />}
                        {method.id === 'paypal' && <ShieldCheck className="w-4 h-4 text-sky-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-xs block truncate">
                          {isAr ? method.nameAr : method.nameEn}
                        </span>
                        <span className="inline-block text-[10px] text-emerald-500 font-semibold mt-0.5">
                          {method.id === 'wallets' ? (isAr ? 'بوابة شحناوي الآلية' : 'Sha7nawy Gateway') : method.id === 'crypto' ? (isAr ? 'بوابة Heleket' : 'Heleket Gateway') : (isAr ? method.badgeAr : method.badgeEn)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {isAr ? '2. حدد المبلغ المراد إيداعه:' : '2. Deposit Amount ($ USD):'}
                </label>
                {bonusPct > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    <Gift className="w-3.5 h-3.5" />
                    {isAr ? `+${bonusPct * 100}% رصيد هدية مجاناً` : `+${bonusPct * 100}% Free Bonus`}
                  </span>
                )}
              </div>

              {/* Presets */}
              <div className="grid grid-cols-5 gap-2">
                {presetAmounts.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`py-2 px-1 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                      Number(customAmount) === p
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-transparent shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    ${p}
                  </button>
                ))}
              </div>

              {/* Custom Input */}
              <div className="relative">
                <span className="absolute start-4 top-3 text-slate-400 font-bold text-base">$</span>
                <input
                  type="number"
                  min={selectedMethod.min}
                  max={selectedMethod.max}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl ps-9 pe-4 py-3 text-lg font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {selectedMethodId === 'wallets' && (
                <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-100 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
                  <span>{isAr ? 'المقابل التقريبي بالجنيه المصري:' : 'Approximate EGP Equivalent:'}</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {(egpEquivalent || 0).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                    <span className="text-[10px] text-slate-400 font-normal ms-1">
                      (1$ = {platformSettings.egpExchangeRate} ج.م)
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Electronic Wallets Specific Flow: Vodafone Cash, Orange, Etisalat via Sha7nawy */}
            {selectedMethodId === 'wallets' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-rose-50/20 dark:from-slate-950 dark:to-rose-950/20 border border-rose-500/30 space-y-4 text-xs animate-in fade-in duration-150">
                
                {/* Sha7nawy Gateway Badge */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400">
                    <Smartphone className="w-4 h-4" />
                    <span>{isAr ? 'بوابة شحناوي (Sha7nawy) - سحب وتأكيد آلي' : 'Sha7nawy Gateway - Automated Verification'}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-black border border-emerald-500/20">
                    {isAr ? 'مباشر 100%' : 'Direct API'}
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-200 font-bold mb-2 text-xs">
                    {isAr ? 'اختر محفظتك الإلكترونية:' : 'Select Your Mobile Wallet:'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'vodafone' as const, labelAr: 'فودافون كاش', labelEn: 'Vodafone Cash', color: 'border-red-500/50 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400' },
                      { id: 'orange' as const, labelAr: 'أورنج كاش', labelEn: 'Orange Cash', color: 'border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400' },
                      { id: 'etisalat' as const, labelAr: 'إتصالات كاش', labelEn: 'Etisalat Cash', color: 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' },
                      { id: 'instapay' as const, labelAr: 'إنستاباي مصر', labelEn: 'InstaPay Egypt', color: 'border-purple-500/50 bg-purple-50/50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400' }
                    ].map((w) => {
                      const isWSelected = selectedWalletProvider === w.id;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => setSelectedWalletProvider(w.id)}
                          className={`p-2.5 rounded-xl border font-bold text-center text-xs transition-all cursor-pointer ${
                            isWSelected
                              ? `${w.color} ring-2 ring-rose-500 shadow-xs`
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {isAr ? w.labelAr : w.labelEn}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SENDER WALLET NUMBER INPUT */}
                <div className="space-y-1">
                  <label className="block text-slate-800 dark:text-slate-100 font-extrabold text-xs">
                    {isAr ? 'أدخل رقم محفظتك (المكون من 11 رقماً) *' : 'Enter Your 11-Digit Mobile Wallet Number *'}
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder={isAr ? 'مثال: 01012345678 أو 012... أو 011...' : 'e.g. 01012345678 or your wallet number'}
                    value={senderWalletNumber}
                    onChange={(e) => {
                      setSenderWalletNumber(e.target.value);
                      if (walletError) setWalletError(null);
                    }}
                    className={`w-full bg-white dark:bg-slate-900 border rounded-xl px-3.5 py-2.5 font-mono text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
                      walletError ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-slate-800 focus:ring-rose-500'
                    }`}
                  />
                  <span className="text-[10px] text-slate-400 block">
                    {isAr
                      ? 'سيتم إرسال طلب سحب آلي عبر شحناوي لهاتفك، لتأكيده بكود *9*1# (فودافون) أو التطبيق (أورنج/اتصالات).'
                      : 'An automated USSD deduction request will be triggered to your phone.'}
                  </span>
                </div>

                {selectedWalletProvider === 'instapay' && (
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                      <span>{isAr ? 'حساب إنستاباي المعتمد للتحويل إليه:' : 'Designated InstaPay Address:'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                      <span className="font-mono text-sm font-black text-slate-900 dark:text-white">
                        {currentReceiver.number}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyReceiverNumber}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs transition-colors shrink-0 shadow-xs cursor-pointer"
                      >
                        {copiedNumber ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedNumber ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ' : 'Copy')}</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Crypto Heleket Banner */}
            {selectedMethodId === 'crypto' && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-amber-500">
                  <div className="flex items-center gap-1.5">
                    <Coins className="w-4 h-4" />
                    <span>{isAr ? 'بوابة هيلكيت (Heleket Gate) - العملات المشفرة' : 'Heleket Crypto Gateway'}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-black">
                    USDT TRC20
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {isAr
                    ? 'سيتم توليد عنوان إيداع مخصص ومراقب لحظياً بواسطة Heleket لتأكيد البلوكتشين آلياً.'
                    : 'A dedicated monitored invoice address will be generated via Heleket API.'}
                </p>
              </div>
            )}

            {/* Error Message */}
            {walletError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>{walletError}</span>
              </div>
            )}

            {/* Breakdown Box */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>{isAr ? 'المبلغ المطلوب إيداعه:' : 'Deposit Amount:'}</span>
                <span className="font-mono font-bold">${numAmount.toFixed(2)}</span>
              </div>
              {bonusAmount > 0 && (
                <div className="flex justify-between text-amber-500 font-semibold">
                  <span>{isAr ? 'رصيد إضافي مجاني (بونص):' : 'Extra Bonus Added:'}</span>
                  <span className="font-mono">+${bonusAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-emerald-600 dark:text-emerald-400 pt-1 border-t border-emerald-500/20">
                <span>{isAr ? 'الرصيد الذي سيصل لمحفظتك فور التحقق:' : 'Total Credited to Wallet:'}</span>
                <span className="font-mono text-base">${totalCredited.toFixed(2)}</span>
              </div>
            </div>

            {/* Submit Action */}
            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={isProcessing || numAmount < selectedMethod.min}
                className="w-full py-3.5 px-4 rounded-xl font-black text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-md shadow-emerald-500/25 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isAr ? 'جاري الاتصال ببوابة الدفع والتحقق...' : 'Connecting to Gateway...'}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-white" />
                    <span>
                      {selectedMethodId === 'wallets' && selectedWalletProvider !== 'instapay'
                        ? (isAr ? `بدء الدفع الآلي عبر شحناوي ($${totalCredited.toFixed(2)})` : `Start Automated Sha7nawy Deduction ($${totalCredited.toFixed(2)})`)
                        : selectedMethodId === 'crypto'
                        ? (isAr ? `إنشاء فاتورة Heleket المشفرة ($${totalCredited.toFixed(2)})` : `Generate Heleket Crypto Invoice ($${totalCredited.toFixed(2)})`)
                        : (isAr ? `تأكيد الشحن الآمن ($${totalCredited.toFixed(2)})` : `Confirm Secure Deposit ($${totalCredited.toFixed(2)})`)}
                    </span>
                  </>
                )}
              </button>
              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>{isAr ? 'تأكيد إلزامي عبر بوابات الدفع الرسمية • حماية 100%' : 'Strict Gateway Verification • 100% Secure'}</span>
              </div>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
