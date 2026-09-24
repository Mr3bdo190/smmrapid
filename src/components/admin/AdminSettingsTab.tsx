import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Settings,
  Shield,
  Smartphone,
  Coins,
  AlertTriangle,
  Bell,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  Save,
  DollarSign,
  MessageSquare,
  Sparkles,
  Zap,
  Globe,
  Key,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Lock
} from 'lucide-react';

export const AdminSettingsTab: React.FC = () => {
  const {
    language,
    platformSettings,
    adminUpdateSettings,
    testGatewayConnection,
    showToast
  } = useApp();

  const isAr = language === 'ar';

  const [formSettings, setFormSettings] = useState({ ...platformSettings });
  const [broadcastMessage, setBroadcastMessage] = useState('');
  
  // Gateway test state
  const [testingSha7nawy, setTestingSha7nawy] = useState(false);
  const [sha7nawyResult, setSha7nawyResult] = useState<{ success?: boolean; message?: string; pingMs?: number } | null>(null);
  const [copiedSha7nawyWebhook, setCopiedSha7nawyWebhook] = useState(false);

  const [testingHeleket, setTestingHeleket] = useState(false);
  const [heleketResult, setHeleketResult] = useState<{ success?: boolean; message?: string; pingMs?: number } | null>(null);
  const [copiedHeleketWebhook, setCopiedHeleketWebhook] = useState(false);

  // Sync if platformSettings change in context
  React.useEffect(() => {
    setFormSettings((prev) => ({
      ...prev,
      ...platformSettings
    }));
  }, [platformSettings]);

  const handleToggle = (key: keyof typeof platformSettings) => {
    setFormSettings((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    adminUpdateSettings({
      ...formSettings,
      egpExchangeRate: Number(formSettings.egpExchangeRate)
    });
  };

  const handleTestSha7nawy = async () => {
    setTestingSha7nawy(true);
    setSha7nawyResult(null);
    try {
      const res = await testGatewayConnection('sha7nawy');
      setSha7nawyResult(res);
      showToast({
        type: res.success ? 'success' : 'warning',
        title: isAr ? 'فحص بوابة شحناوي' : 'Sha7nawy Connection Check',
        message: res.message || (res.success ? 'تم الاتصال بالخادم بنجاح' : 'تعذر الاتصال')
      });
    } catch (e: any) {
      setSha7nawyResult({ success: false, message: e.message });
    } finally {
      setTestingSha7nawy(false);
    }
  };

  const handleTestHeleket = async () => {
    setTestingHeleket(true);
    setHeleketResult(null);
    try {
      const res = await testGatewayConnection('heleket');
      setHeleketResult(res);
      showToast({
        type: res.success ? 'success' : 'warning',
        title: isAr ? 'فحص بوابة Heleket' : 'Heleket Connection Check',
        message: res.message || (res.success ? 'تم الاتصال بخوادم Heleket بنجاح' : 'تعذر الاتصال')
      });
    } catch (e: any) {
      setHeleketResult({ success: false, message: e.message });
    } finally {
      setTestingHeleket(false);
    }
  };

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
  const defaultSha7nawyWebhook = `${currentOrigin}/api/webhooks/sha7nawy`;
  const defaultHeleketWebhook = `${currentOrigin}/api/webhooks/heleket`;

  const copyToClipboard = (text: string, type: 'sha7nawy' | 'heleket') => {
    navigator.clipboard.writeText(text);
    if (type === 'sha7nawy') {
      setCopiedSha7nawyWebhook(true);
      setTimeout(() => setCopiedSha7nawyWebhook(false), 2000);
    } else {
      setCopiedHeleketWebhook(true);
      setTimeout(() => setCopiedHeleketWebhook(false), 2000);
    }
  };

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;

    showToast({
      type: 'info',
      title: isAr ? 'إشعار عام لجميع العملاء' : 'Global Platform Broadcast',
      message: broadcastMessage.trim()
    });
    setBroadcastMessage('');
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-amber-500" />
            <span>{isAr ? 'التحكم الشامل في ميزات وإعدادات الموقع' : 'Platform Features & System Configuration'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {isAr
              ? 'التحكم في تشغيل وإيقاف كل ميزة ميزة، ضبط أرقام محافظ فودافون وأورنج وإتصالات كاش، وسعر الصرف.'
              : 'Toggle platform features granularly, update receiving wallet phone numbers, exchange rates, and broadcasts.'}
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>{isAr ? 'حفظ وتطبيق جميع الإعدادات' : 'Save Platform Settings'}</span>
        </button>
      </div>

      <form onSubmit={handleSaveAll} className="space-y-8">
        
        {/* Section 1: Granular Feature-by-Feature Controls */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="font-black text-base text-slate-900 dark:text-white">
              {isAr ? 'التحكم في ميزات المنصة (ميزة ميزة)' : 'Granular Feature Toggles'}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Maintenance Mode */}
            <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
              formSettings.maintenanceMode
                ? 'bg-rose-500/[0.08] border-rose-500/30'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
            }`}>
              <div className="space-y-1 pe-3">
                <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{isAr ? 'وضع الصيانة العام (Maintenance)' : 'Platform Maintenance Mode'}</span>
                  {formSettings.maintenanceMode && (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-rose-500 text-white">
                      {isAr ? 'نشط' : 'Active'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isAr ? 'إيقاف قبول الطلبات مؤقتاً لتحديث الخوادم والصيانة.' : 'Temporarily prevent new orders for server upgrades.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('maintenanceMode')}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  formSettings.maintenanceMode ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    formSettings.maintenanceMode ? 'start-6.5' : 'start-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Registration Allowed */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="space-y-1 pe-3">
                <div className="font-bold text-xs text-slate-900 dark:text-white">
                  {isAr ? 'السماح بتسجيل مستخدمين جدد' : 'Allow New User Registration'}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isAr ? 'فتح أو إغلاق إمكانية إنشاء حسابات جديدة على الموقع.' : 'Enable or pause open registration of new clients.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('allowRegistrations')}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  formSettings.allowRegistrations ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    formSettings.allowRegistrations ? 'start-6.5' : 'start-0.5'
                  }`}
                />
              </button>
            </div>

            {/* E-Wallets Payment Gateways */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="space-y-1 pe-3">
                <div className="font-bold text-xs text-slate-900 dark:text-white">
                  {isAr ? 'تفعيل بوابات المحافظ الإلكترونية المصرية' : 'E-Wallets Gateways'}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isAr ? 'فودافون كاش، أورنج كاش، اتصالات كاش، وإنستاباي.' : 'Vodafone, Orange, Etisalat Cash & InstaPay.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('eWalletsEnabled')}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  formSettings.eWalletsEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    formSettings.eWalletsEnabled ? 'start-6.5' : 'start-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Crypto USDT Payment */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="space-y-1 pe-3">
                <div className="font-bold text-xs text-slate-900 dark:text-white">
                  {isAr ? 'تفعيل الدفع بالعملات الرقمية (Crypto USDT)' : 'Crypto USDT Payments'}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isAr ? 'السماح للعملاء بالإيداع المباشر لعنوان USDT TRC20.' : 'Allow deposits directly to USDT TRC20 address.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('cryptoEnabled')}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  formSettings.cryptoEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    formSettings.cryptoEnabled ? 'start-6.5' : 'start-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Auto-Refill Guarantee */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="space-y-1 pe-3">
                <div className="font-bold text-xs text-slate-900 dark:text-white">
                  {isAr ? 'زر التعويض التلقائي (Auto-Refill Button)' : 'Auto-Refill Guarantee Button'}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isAr ? 'السماح للعملاء بالضغط على زر تعويض النقص في صفحة طلباتي.' : 'Allow clients to trigger refill on dropped orders.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('autoRefillSystem')}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  formSettings.autoRefillSystem ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    formSettings.autoRefillSystem ? 'start-6.5' : 'start-0.5'
                  }`}
                />
              </button>
            </div>

          </div>
        </div>

        {/* Section 2: E-Wallet Numbers & Financial Configuration */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Coins className="w-5 h-5 text-emerald-500" />
            <h3 className="font-black text-base text-slate-900 dark:text-white">
              {isAr ? 'أرقام محافظ استلام الأموال وسعر الصرف' : 'Official Wallet Receiver Numbers & Exchange Rate'}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* EGP Exchange Rate */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isAr ? 'سعر صرف الدولار (مقابل الجنيه المصري):' : 'USD to EGP Rate (1$ = ? EGP):'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  required
                  value={formSettings.egpExchangeRate}
                  onChange={(e) => setFormSettings({ ...formSettings, egpExchangeRate: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-mono text-base font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="font-bold text-xs text-slate-500 shrink-0">{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </div>

            {/* Vodafone Cash Receiver Number */}
            <div>
              <label className="block text-xs font-bold text-red-600 dark:text-red-400 mb-1.5 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                <span>{isAr ? 'رقم فودافون كاش المعتمد للاستلام:' : 'Vodafone Cash Receiver Phone:'}</span>
              </label>
              <input
                type="text"
                required
                value={formSettings.vodafoneCashNumber}
                onChange={(e) => setFormSettings({ ...formSettings, vodafoneCashNumber: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-mono text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Orange Cash Receiver Number */}
            <div>
              <label className="block text-xs font-bold text-orange-600 dark:text-orange-400 mb-1.5 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                <span>{isAr ? 'رقم أورنج كاش المعتمد للاستلام:' : 'Orange Cash Receiver Phone:'}</span>
              </label>
              <input
                type="text"
                required
                value={formSettings.orangeCashNumber}
                onChange={(e) => setFormSettings({ ...formSettings, orangeCashNumber: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-mono text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Etisalat Cash Receiver Number */}
            <div>
              <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                <span>{isAr ? 'رقم إتصالات كاش المعتمد للاستلام:' : 'Etisalat Cash Receiver Phone:'}</span>
              </label>
              <input
                type="text"
                required
                value={formSettings.etisalatCashNumber}
                onChange={(e) => setFormSettings({ ...formSettings, etisalatCashNumber: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-mono text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* InstaPay Username / Address */}
            <div>
              <label className="block text-xs font-bold text-purple-600 dark:text-purple-400 mb-1.5 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5" />
                <span>{isAr ? 'معرف أو رقم إنستاباي InstaPay:' : 'InstaPay IPA / Address:'}</span>
              </label>
              <input
                type="text"
                required
                value={formSettings.instaPayUsername}
                onChange={(e) => setFormSettings({ ...formSettings, instaPayUsername: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-mono text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* USDT TRC20 Wallet */}
            <div>
              <label className="block text-xs font-bold text-cyan-600 dark:text-cyan-400 mb-1.5 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5" />
                <span>{isAr ? 'عنوان محفظة كريبتو USDT TRC20:' : 'USDT TRC20 Address:'}</span>
              </label>
              <input
                type="text"
                required
                value={formSettings.usdtTrc20Address}
                onChange={(e) => setFormSettings({ ...formSettings, usdtTrc20Address: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-mono text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

          </div>
        </div>

        {/* Section 3: Automated Payment Gateways Integration (Sha7nawy & Heleket) */}
        <div className="space-y-6">
          
          {/* Strict Auto-Verification Enforcement Banner */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-500/30 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">
                    {isAr ? 'فرض التحقق التلقائي الإلزامي لعمليات الدفع (Gateway Verification)' : 'Mandatory Payment Gateway Verification'}
                  </h4>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    formSettings.autoVerifyPayments
                      ? 'bg-emerald-500 text-white'
                      : 'bg-amber-500 text-white'
                  }`}>
                    {formSettings.autoVerifyPayments ? (isAr ? 'مُفعّل ومفروض' : 'Active & Enforced') : (isAr ? 'معطل' : 'Disabled')}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {isAr
                    ? 'عند تفعيل هذا الخيار، لا تتم أي عملية إيداع أو إضافة رصيد للمستخدم إلا بعد التحقق الآلي والربط المباشر مع بوابات الدفع (شحناوي للمحافظ أو هيليكيت للعملات الرقمية).'
                    : 'When active, no deposits will be credited until successfully verified by Sha7nawy (E-wallets) or Heleket (Crypto) gateways.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggle('autoVerifyPayments')}
              className={`w-14 h-7 rounded-full transition-colors relative cursor-pointer shrink-0 self-end sm:self-auto ${
                formSettings.autoVerifyPayments ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full bg-white absolute top-0.5 transition-transform ${
                  formSettings.autoVerifyPayments ? 'start-7.5' : 'start-0.5'
                }`}
              />
            </button>
          </div>

          {/* GATEWAY 1: SHA7NAWY GATE (E-Wallets) */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            
            {/* Header with Enable Switch & Logo */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center font-black text-xl">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base text-slate-900 dark:text-white">
                      {isAr ? 'بوابة شحناوي (Sha7nawy Gate) - المحافظ الإلكترونية' : 'Sha7nawy Gateway (E-Wallets)'}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20">
                      فودافون • أورنج • إتصالات كاش
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isAr
                      ? 'تأكيد ودفع آلي مباشر بدون تدخل بشري عبر طلب كود *9*1# لفودافون وتطبيقات المحافظ الإلكترونية.'
                      : 'Automated direct deduction and confirmation via USSD & mobile wallet apps.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  {formSettings.sha7nawyEnabled ? (isAr ? 'البوابة مفعلة' : 'Gateway Enabled') : (isAr ? 'البوابة معطلة' : 'Gateway Disabled')}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggle('sha7nawyEnabled')}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    formSettings.sha7nawyEnabled ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                      formSettings.sha7nawyEnabled ? 'start-6.5' : 'start-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Sha7nawy Credentials Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Base URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-rose-500" />
                  <span>{isAr ? 'رابط خادم API (Base URL):' : 'API Base URL:'}</span>
                </label>
                <input
                  type="text"
                  value={formSettings.sha7nawyBaseUrl || 'https://api.sha7nawy.com'}
                  onChange={(e) => setFormSettings({ ...formSettings, sha7nawyBaseUrl: e.target.value })}
                  placeholder="https://api.sha7nawy.com"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-mono text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Public Key (For Payment Creation & Confirmation) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-rose-500" />
                  <span>{isAr ? 'المفتاح العام (Public Key - للإنشاء والتأكيد):' : 'Public Key (Create & Confirm):'}</span>
                </label>
                <input
                  type="password"
                  value={formSettings.sha7nawyPublicKey || ''}
                  onChange={(e) => setFormSettings({ ...formSettings, sha7nawyPublicKey: e.target.value })}
                  placeholder={isAr ? 'ألصق المفتاح العام لبوابة شحناوي هنا...' : 'Paste Sha7nawy Public Key...'}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Secret Key (For Payment Info) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-rose-500" />
                  <span>{isAr ? 'المفتاح السري (Secret Key - لفحص العمليات):' : 'Secret Key (Info Check):'}</span>
                </label>
                <input
                  type="password"
                  value={formSettings.sha7nawySecretKey || ''}
                  onChange={(e) => setFormSettings({ ...formSettings, sha7nawySecretKey: e.target.value })}
                  placeholder={isAr ? 'ألصق المفتاح السري لبوابة شحناوي...' : 'Paste Sha7nawy Secret Key...'}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Webhook URL with Copy Button */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-rose-500" />
                  <span>{isAr ? 'رابط الويبهوك التلقائي (Webhook IPN URL):' : 'Automated Webhook IPN URL:'}</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formSettings.sha7nawyWebhookUrl || defaultSha7nawyWebhook}
                    onChange={(e) => setFormSettings({ ...formSettings, sha7nawyWebhookUrl: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(formSettings.sha7nawyWebhookUrl || defaultSha7nawyWebhook, 'sha7nawy')}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors shrink-0 cursor-pointer"
                    title={isAr ? 'نسخ الرابط لإضافته في إعدادات شحناوي' : 'Copy Webhook URL'}
                  >
                    {copiedSha7nawyWebhook ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

            </div>

            {/* Test Connection Button & Information Box */}
            <div className="p-4 rounded-2xl bg-rose-500/[0.05] border border-rose-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="font-extrabold text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4" />
                  <span>{isAr ? 'اختبار جاهزية الاتصال ببوابة شحناوي' : 'Sha7nawy API Connectivity Test'}</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isAr
                    ? 'فحص استجابة الخادم وسرعة الـ Ping للتحقق من سلامة المفاتيح قبل استقبال مدفوعات العملاء.'
                    : 'Pings Sha7nawy servers to verify valid keys and response latency.'}
                </p>
                {sha7nawyResult && (
                  <div className={`text-xs font-bold mt-2 p-2 rounded-lg ${
                    sha7nawyResult.success ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                  }`}>
                    {sha7nawyResult.message}
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={testingSha7nawy}
                onClick={handleTestSha7nawy}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/25 flex items-center gap-2 transition-all cursor-pointer shrink-0 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingSha7nawy ? 'animate-spin' : ''}`} />
                <span>{testingSha7nawy ? (isAr ? 'جاري الفحص...' : 'Testing...') : (isAr ? 'فحص الاتصال الآن' : 'Test Connection')}</span>
              </button>
            </div>

          </div>

          {/* GATEWAY 2: HELEKET CRYPTO GATEWAY */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            
            {/* Header with Enable Switch & Logo */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center font-black text-xl">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base text-slate-900 dark:text-white">
                      {isAr ? 'بوابة هيلكيت (Heleket Gate) - العملات الرقمية والكريبتو' : 'Heleket Crypto Gateway'}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      USDT TRC20 • BEP20 • BTC • ETH
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isAr
                      ? 'إنشاء فواتير دفع رقمية مشفرة وتأكيد الإيداع تلقائياً على البلوكتشين فور وصول التأكيدات.'
                      : 'Generate crypto invoices with instant blockchain confirmation and automated wallet credit.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  {formSettings.heleketEnabled ? (isAr ? 'البوابة مفعلة' : 'Gateway Enabled') : (isAr ? 'البوابة معطلة' : 'Gateway Disabled')}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggle('heleketEnabled')}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    formSettings.heleketEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                      formSettings.heleketEnabled ? 'start-6.5' : 'start-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Heleket Credentials Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Base URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-amber-500" />
                  <span>{isAr ? 'رابط API بوابة Heleket:' : 'Heleket API URL:'}</span>
                </label>
                <input
                  type="text"
                  value={formSettings.heleketBaseUrl || 'https://api.heleket.com'}
                  onChange={(e) => setFormSettings({ ...formSettings, heleketBaseUrl: e.target.value })}
                  placeholder="https://api.heleket.com"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-mono text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Merchant ID */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-500" />
                  <span>{isAr ? 'معرف التاجر (Merchant ID):' : 'Merchant ID:'}</span>
                </label>
                <input
                  type="text"
                  value={formSettings.heleketMerchantId || ''}
                  onChange={(e) => setFormSettings({ ...formSettings, heleketMerchantId: e.target.value })}
                  placeholder="e.g. MERCH-892182"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* API Key */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span>{isAr ? 'المفتاح البرمجي (API Key):' : 'API Key:'}</span>
                </label>
                <input
                  type="password"
                  value={formSettings.heleketApiKey || ''}
                  onChange={(e) => setFormSettings({ ...formSettings, heleketApiKey: e.target.value })}
                  placeholder={isAr ? 'ألصق Heleket API Key...' : 'Paste Heleket API Key...'}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Secret Key */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-500" />
                  <span>{isAr ? 'مفتاح التوقيع والأمان (Secret Key):' : 'IPN Secret Key:'}</span>
                </label>
                <input
                  type="password"
                  value={formSettings.heleketSecretKey || ''}
                  onChange={(e) => setFormSettings({ ...formSettings, heleketSecretKey: e.target.value })}
                  placeholder={isAr ? 'ألصق Heleket Secret...' : 'Paste Secret Key...'}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Webhook URL */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                  <span>{isAr ? 'رابط الويبهوك لتأكيد البلوكتشين (Webhook IPN):' : 'Heleket IPN Webhook URL:'}</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formSettings.heleketWebhookUrl || defaultHeleketWebhook}
                    onChange={(e) => setFormSettings({ ...formSettings, heleketWebhookUrl: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(formSettings.heleketWebhookUrl || defaultHeleketWebhook, 'heleket')}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors shrink-0 cursor-pointer"
                    title={isAr ? 'نسخ رابط الويبهوك' : 'Copy Webhook URL'}
                  >
                    {copiedHeleketWebhook ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

            </div>

            {/* Test Connection Button & Information Box */}
            <div className="p-4 rounded-2xl bg-amber-500/[0.05] border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="font-extrabold text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4" />
                  <span>{isAr ? 'اختبار اتصال بوابة Heleket' : 'Heleket API Ping & Health Check'}</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isAr
                    ? 'فحص استجابة الربط مع شبكة Heleket للتأكد من وصول إشعارات التحويل الرقمي.'
                    : 'Verifies Merchant credentials and IPN webhook handshake.'}
                </p>
                {heleketResult && (
                  <div className={`text-xs font-bold mt-2 p-2 rounded-lg ${
                    heleketResult.success ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                  }`}>
                    {heleketResult.message}
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={testingHeleket}
                onClick={handleTestHeleket}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/25 flex items-center gap-2 transition-all cursor-pointer shrink-0 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingHeleket ? 'animate-spin' : ''}`} />
                <span>{testingHeleket ? (isAr ? 'جاري الفحص...' : 'Testing...') : (isAr ? 'فحص الاتصال الآن' : 'Test Connection')}</span>
              </button>
            </div>

          </div>

        </div>

        {/* Section 4: Global Broadcast to All Clients */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Bell className="w-5 h-5 text-blue-500" />
            <h3 className="font-black text-base text-slate-900 dark:text-white">
              {isAr ? 'بث تنبيه وإشعار فوري لجميع المستخدمين' : 'Broadcast Live Notification to All Users'}
            </h3>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAr
              ? 'أرسل تنبيهاً فورياً يظهر كبانر أعلى الشاشة لجميع زوار وعملاء الموقع.'
              : 'Dispatch an immediate announcement banner to all connected users.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder={isAr ? 'اكتب نص الإشعار العام هنا (مثال: خصم 20% على خدمات تيك توك بمناسبة نهاية الأسبوع)...' : 'Type broadcast announcement...'}
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleBroadcast}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span>{isAr ? 'بث الإشعار الآن' : 'Broadcast'}</span>
            </button>
          </div>
        </div>

      </form>

    </div>
  );
};
