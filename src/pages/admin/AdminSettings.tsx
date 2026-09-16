import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { notify } from '../../lib/notify';
import { useTranslation } from '../../lib/i18n';
import {
  Save, PlugZap, CheckCircle2, XCircle, Loader2,
  Settings, Wallet, BarChart3, Globe, Key, Shield,
} from 'lucide-react';

type Tab = 'general' | 'financial' | 'api' | 'payments';

const tabs: { id: Tab; labelKey: string; icon: any }[] = [
  { id: 'general', labelKey: 'admin.settings.general', icon: Settings },
  { id: 'financial', labelKey: 'admin.settings.financial', icon: Wallet },
  { id: 'api', labelKey: 'admin.settings.apiSettings', icon: Key },
  { id: 'payments', labelKey: 'admin.settings.paymentMethods', icon: PlugZap },
];

export default function AdminSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('general');

  // --- Form state ---
  const [siteName, setSiteName] = useState('RapidSMM');
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [vodafoneCashNumber, setVodafoneCashNumber] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [siteLogo, setSiteLogo] = useState('');
  const [affiliateComm, setAffiliateComm] = useState('5');
  const [usdExchangeRate, setUsdExchangeRate] = useState('50');
  const [defaultProfitMargin, setDefaultProfitMargin] = useState('50');
  const [minDeposit, setMinDeposit] = useState('1');
  const [minWithdrawal, setMinWithdrawal] = useState('5');
  const [shahnawyEnabled, setShahnawyEnabled] = useState(false);
  const [shahnawyBaseUrl, setShahnawyBaseUrl] = useState('https://gate.sha7nawy.com');
  const [shahnawyPublicKey, setShahnawyPublicKey] = useState('');
  const [shahnawySecretKey, setShahnawySecretKey] = useState('');
  const [shahnawyMerchantWalletNumber, setShahnawyMerchantWalletNumber] = useState('');
  const [shahnawyMinAmount, setShahnawyMinAmount] = useState('5');
  const [shahnawyMaxAmount, setShahnawyMaxAmount] = useState('10000');
  const [walletIntroAr, setWalletIntroAr] = useState('');
  const [walletIntroEn, setWalletIntroEn] = useState('');
  const [walletVerificationAr, setWalletVerificationAr] = useState('');
  const [walletVerificationEn, setWalletVerificationEn] = useState('');
  const [vfAr, setVfAr] = useState(''); const [vfEn, setVfEn] = useState('');
  const [orAr, setOrAr] = useState(''); const [orEn, setOrEn] = useState('');
  const [etAr, setEtAr] = useState(''); const [etEn, setEtEn] = useState('');
  const [cryptoIntroAr, setCryptoIntroAr] = useState(''); const [cryptoIntroEn, setCryptoIntroEn] = useState('');
  const [cryptoInvoiceAr, setCryptoInvoiceAr] = useState(''); const [cryptoInvoiceEn, setCryptoInvoiceEn] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/admin/settings', user, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load data');
      return res.json();
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (settings) {
      setSiteName(settings.site_name || 'RapidSMM');
      setCurrencySymbol(settings.currency_symbol || '$');
      setVodafoneCashNumber(settings.vodafone_cash_number || '');
      setSiteDescription(settings.site_description || '');
      setSupportEmail(settings.support_email || '');
      setSiteLogo(settings.site_logo || '');
      setAffiliateComm(settings.affiliate_commission_percentage || '5');
      setUsdExchangeRate(settings.usd_exchange_rate || '50');
      setDefaultProfitMargin(settings.default_profit_margin || '50');
      setMinDeposit(settings.min_deposit_amount || '1');
      setMinWithdrawal(settings.min_withdrawal_amount || '5');
      setShahnawyEnabled(settings.shahnawy_enabled === 'true');
      setShahnawyBaseUrl(settings.shahnawy_base_url || 'https://gate.sha7nawy.com');
      setShahnawyPublicKey(settings.shahnawy_public_key || '');
      setShahnawySecretKey(settings.shahnawy_secret_key || '');
      setShahnawyMerchantWalletNumber(settings.shahnawy_merchant_wallet_number || '');
      setShahnawyMinAmount(settings.shahnawy_min_amount || '5');
      setShahnawyMaxAmount(settings.shahnawy_max_amount || '10000');
      setWalletIntroAr(settings.add_funds_wallet_intro_ar || 'أدخل رقم محفظتك الشخصية. سيتم إرسال طلب الدفع إلى هذه المحفظة.');
      setWalletIntroEn(settings.add_funds_wallet_intro_en || 'Enter your personal wallet number. A payment request will be sent to that wallet.');
      setWalletVerificationAr(settings.add_funds_wallet_verification_ar || 'يتم التحقق من عملية الدفع تلقائياً قبل إضافة الرصيد.');
      setWalletVerificationEn(settings.add_funds_wallet_verification_en || 'The payment is verified automatically before the balance is added.');
      setVfAr(settings.add_funds_vf_instruction_ar || 'بعد إنشاء طلب الدفع، قم بتأكيد العملية من محفظة Vodafone Cash.');
      setVfEn(settings.add_funds_vf_instruction_en || 'After creating the payment request, confirm it from Vodafone Cash.');
      setOrAr(settings.add_funds_or_instruction_ar || 'بعد إنشاء طلب الدفع، وافق على العملية من محفظة Orange Cash.');
      setOrEn(settings.add_funds_or_instruction_en || 'After creating the payment request, approve it from Orange Cash.');
      setEtAr(settings.add_funds_et_instruction_ar || 'بعد إنشاء طلب الدفع، وافق على العملية من e& Money / Etisalat Cash.');
      setEtEn(settings.add_funds_et_instruction_en || 'After creating the payment request, approve it from e& Money / Etisalat Cash.');
      setCryptoIntroAr(settings.add_funds_crypto_intro_ar || 'ادفع بالدولار باستخدام بوابة الدفع بالعملات الرقمية المتاحة.');
      setCryptoIntroEn(settings.add_funds_crypto_intro_en || 'Pay in USD using the available crypto payment gateway.');
      setCryptoInvoiceAr(settings.add_funds_crypto_invoice_ar || 'افتح الفاتورة وأكمل الدفع. تتم إضافة الرصيد بعد تأكيد العملية من بوابة الدفع.');
      setCryptoInvoiceEn(settings.add_funds_crypto_invoice_en || 'Open the invoice and complete the payment. Your balance is credited after the gateway confirms it.');
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/admin/settings', user, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update settings');
      return res.json();
    },
    onSuccess: () => {
      notify.success(t('common.saved'));
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
    onError: () => notify.error(t('common.saveFailed')),
  });

  const handleSave = () => {
    updateMutation.mutate({
      site_name: siteName,
      currency_symbol: currencySymbol,
      vodafone_cash_number: vodafoneCashNumber,
      site_description: siteDescription,
      support_email: supportEmail,
      site_logo: siteLogo,
      affiliate_commission_percentage: affiliateComm,
      usd_exchange_rate: usdExchangeRate,
      default_profit_margin: defaultProfitMargin,
      min_deposit_amount: minDeposit,
      min_withdrawal_amount: minWithdrawal,
      shahnawy_enabled: String(shahnawyEnabled),
      shahnawy_base_url: shahnawyBaseUrl,
      shahnawy_public_key: shahnawyPublicKey,
      shahnawy_secret_key: shahnawySecretKey,
      shahnawy_merchant_wallet_number: shahnawyMerchantWalletNumber,
      shahnawy_min_amount: shahnawyMinAmount,
      shahnawy_max_amount: shahnawyMaxAmount,
      add_funds_wallet_intro_ar: walletIntroAr, add_funds_wallet_intro_en: walletIntroEn,
      add_funds_wallet_verification_ar: walletVerificationAr, add_funds_wallet_verification_en: walletVerificationEn,
      add_funds_vf_instruction_ar: vfAr, add_funds_vf_instruction_en: vfEn,
      add_funds_or_instruction_ar: orAr, add_funds_or_instruction_en: orEn,
      add_funds_et_instruction_ar: etAr, add_funds_et_instruction_en: etEn,
      add_funds_crypto_intro_ar: cryptoIntroAr, add_funds_crypto_intro_en: cryptoIntroEn,
      add_funds_crypto_invoice_ar: cryptoInvoiceAr, add_funds_crypto_invoice_en: cryptoInvoiceEn,
    });
  };

  const heleketStatus = useQuery({
    queryKey: ['admin-heleket-status'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/admin/heleket/status', user, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: false,
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{t('nav.admin.settings')}</h3>
        <button onClick={handleSave} className="btn-primary flex items-center gap-2" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t('admin.settings.save')}
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-gray-900 rounded-t-xl shadow-sm">
        <nav className="flex overflow-x-auto" dir="ltr">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(tab.labelKey)}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-slate-800 rounded-b-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 min-h-[400px]">
        {/* General Settings Tab */}
        {activeTab === 'general' && (
          <div className="space-y-6" dir="ltr">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('admin.settings.general')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">{t('admin.settings.siteName')}</label>
                <input type="text" value={siteName} onChange={e => setSiteName(e.target.value)}
                  className="input-primary w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">{t('admin.settings.currencySymbol')}</label>
                <input type="text" value={currencySymbol} onChange={e => setCurrencySymbol(e.target.value)}
                  className="input-primary w-full" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">{t('admin.settings.siteDescription')}</label>
                <input type="text" value={siteDescription} onChange={e => setSiteDescription(e.target.value)}
                  className="input-primary w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">{t('admin.settings.supportEmail')}</label>
                <input type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)}
                  className="input-primary w-full placeholder-gray-400 dark:placeholder-gray-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">{t('admin.settings.siteLogo')}</label>
                <input type="url" value={siteLogo} onChange={e => setSiteLogo(e.target.value)}
                  className="input-primary w-full placeholder-gray-400 dark:placeholder-gray-500" />
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-slate-700 pt-6" dir="ltr">
              <h5 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4">{t('admin.settings.affiliate')}</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">{t('admin.settings.commission')}</label>
                  <input type="number" step="0.1" value={affiliateComm} onChange={e => setAffiliateComm(e.target.value)}
                    className="input-primary w-full max-w-xs" />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('admin.settings.commissionDesc')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">{t('admin.settings.profitMargin')}</label>
                  <input type="number" min="0" max="10000" step="0.1" value={defaultProfitMargin} onChange={e => setDefaultProfitMargin(e.target.value)}
                    className="input-primary w-full max-w-xs" />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('admin.settings.profitMarginDesc')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Financial Limits Tab */}
        {activeTab === 'financial' && (
          <div className="space-y-6" dir="ltr">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('admin.settings.financial')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">{t('settings.minDeposit')}</label>
                <input type="number" min="0" step="0.01" value={minDeposit} onChange={e => setMinDeposit(e.target.value)}
                  className="input-primary w-full max-w-xs" />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('settings.minDepositDesc')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">{t('settings.minWithdrawal')}</label>
                <input type="number" min="0" step="0.01" value={minWithdrawal} onChange={e => setMinWithdrawal(e.target.value)}
                  className="input-primary w-full max-w-xs" />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('settings.minWithdrawalDesc')}</p>
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
              <h5 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4">{t('admin.settings.exchange')}</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">{t('admin.settings.exchangeRate')}</label>
                  <input type="number" step="0.01" min="0.01" value={usdExchangeRate} onChange={e => setUsdExchangeRate(e.target.value)}
                    className="input-primary w-full max-w-xs" />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('admin.settings.exchangeRateDesc')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* API Settings Tab */}
        {activeTab === 'api' && (
          <div className="space-y-6" dir="ltr">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Key className="w-5 h-5" /> {t('admin.settings.apiSettings')}
            </h4>
            <div className="rounded-xl bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">{t('admin.settings.sha7nawyPublic')}</label>
                <input value={shahnawyPublicKey} onChange={e => setShahnawyPublicKey(e.target.value)}
                  className="input-primary w-full placeholder-gray-400 dark:placeholder-gray-500" placeholder="Public API key" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">{t('admin.settings.sha7nawySecret')}</label>
                <input type="password" value={shahnawySecretKey} onChange={e => setShahnawySecretKey(e.target.value)}
                  className="input-primary w-full placeholder-gray-400 dark:placeholder-gray-500" placeholder="Secret API key" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">{t('admin.settings.baseUrl')}</label>
                  <input value={shahnawyBaseUrl} onChange={e => setShahnawyBaseUrl(e.target.value)}
                    className="input-primary w-full placeholder-gray-400 dark:placeholder-gray-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">{t('admin.settings.merchantWallet')}</label>
                  <input value={shahnawyMerchantWalletNumber} onChange={e => setShahnawyMerchantWalletNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    className="input-primary w-full placeholder-gray-400 dark:placeholder-gray-500" placeholder="01XXXXXXXXX" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">{t('admin.settings.minEgp')}</label>
                  <input type="number" min="1" value={shahnawyMinAmount} onChange={e => setShahnawyMinAmount(e.target.value)}
                    className="input-primary w-full placeholder-gray-400 dark:placeholder-gray-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">{t('admin.settings.maxEgp')}</label>
                  <input type="number" min="1" value={shahnawyMaxAmount} onChange={e => setShahnawyMaxAmount(e.target.value)}
                    className="input-primary w-full placeholder-gray-400 dark:placeholder-gray-500" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Methods Tab */}
        {activeTab === 'payments' && (
          <div className="space-y-6" dir="ltr">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <PlugZap className="w-5 h-5" /> {t('admin.settings.paymentMethods')}
            </h4>

            {/* Sha7nawy Gate */}
            <div className="rounded-xl border border-indigo-100 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-900/20 p-5 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h5 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    {t('admin.settings.sha7nawyGate')}
                  </h5>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {t('admin.settings.sha7nawyDesc')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShahnawyEnabled(v => !v)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                    shahnawyEnabled
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {shahnawyEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              <div className="rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-4 text-xs text-gray-600 dark:text-gray-400 space-y-2">
                <p><strong>{t('admin.settings.webhook')}:</strong> <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">/api/shahnawy/webhook</code> — {t('admin.settings.webhookDesc')}</p>
                <p><strong>{t('admin.settings.security')}:</strong> {t('admin.settings.securityDesc')}</p>
              </div>
            </div>

            {/* Add Funds Instructions */}
            <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
              <h5 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">{t('admin.settings.addFundsInstructions')}</h5>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                {t('admin.settings.addFundsDesc')}
              </p>
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                      {t('admin.settings.walletIntroAr')}
                    </label>
                    <textarea
                      value={walletIntroAr}
                      onChange={e => setWalletIntroAr(e.target.value)}
                      className="input-primary min-h-24 w-full resize-y"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                      {t('admin.settings.walletIntroEn')}
                    </label>
                    <textarea
                      value={walletIntroEn}
                      onChange={e => setWalletIntroEn(e.target.value)}
                      className="input-primary min-h-24 w-full resize-y"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                      {t('admin.settings.walletVerificationAr')}
                    </label>
                    <textarea
                      value={walletVerificationAr}
                      onChange={e => setWalletVerificationAr(e.target.value)}
                      className="input-primary min-h-24 w-full resize-y"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                      {t('admin.settings.walletVerificationEn')}
                    </label>
                    <textarea
                      value={walletVerificationEn}
                      onChange={e => setWalletVerificationEn(e.target.value)}
                      className="input-primary min-h-24 w-full resize-y"
                    />
                  </div>
                </div>

                {[
                  ['Vodafone Cash', vfAr, setVfAr, vfEn, setVfEn],
                  ['Orange Cash', orAr, setOrAr, orEn, setOrEn],
                  ['Etisalat Cash', etAr, setEtAr, etEn, setEtEn],
                  ['Crypto payment', cryptoIntroAr, setCryptoIntroAr, cryptoIntroEn, setCryptoIntroEn],
                  ['Crypto invoice', cryptoInvoiceAr, setCryptoInvoiceAr, cryptoInvoiceEn, setCryptoInvoiceEn],
                ].map(([label, arv, setAr, env, setEn]: any) => (
                  <div key={label} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                        {label} — العربية
                      </label>
                      <textarea
                        value={arv}
                        onChange={e => setAr(e.target.value)}
                        className="input-primary min-h-20 w-full resize-y"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                        {label} — English
                      </label>
                      <textarea
                        value={env}
                        onChange={e => setEn(e.target.value)}
                        className="input-primary min-h-20 w-full resize-y"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Heleket Connection */}
            <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                {t('admin.settings.heleketConnection')}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {t('admin.settings.heleketTest')}
              </p>
              <button
                type="button"
                onClick={() => heleketStatus.refetch()}
                disabled={heleketStatus.isFetching}
                className="btn-secondary inline-flex items-center gap-2"
              >
                {heleketStatus.isFetching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PlugZap className="w-4 h-4" />
                )}
                {t('admin.settings.testHeleket')}
              </button>
              {heleketStatus.data && (
                <div
                  className={`mt-3 text-sm rounded-lg p-3 flex items-start gap-2 ${
                    heleketStatus.data.connectionOk
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                      : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                  }`}
                >
                  {heleketStatus.data.connectionOk ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  )}
                  <div>
                    {heleketStatus.data.connectionOk ? (
                      <span>
                        {t('admin.settings.connected')}{' '}
                        {heleketStatus.data.maskedMerchant}.
                      </span>
                    ) : (
                      <span>{heleketStatus.data.error || t('admin.settings.connectionFailed')}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
