import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { notify } from '../../lib/notify';
import { Save, PlugZap, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function AdminSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [siteName, setSiteName] = useState('RapidSMM');
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [vodafoneCashNumber, setVodafoneCashNumber] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [siteLogo, setSiteLogo] = useState('');
  const [affiliateComm, setAffiliateComm] = useState('5');
  const [usdExchangeRate, setUsdExchangeRate] = useState('50');
  const [defaultProfitMargin, setDefaultProfitMargin] = useState('50');
  const [shahnawyEnabled, setShahnawyEnabled] = useState(false);
  const [shahnawyBaseUrl, setShahnawyBaseUrl] = useState('https://gate.sha7nawy.com');
  const [shahnawyPublicKey, setShahnawyPublicKey] = useState('');
  const [shahnawySecretKey, setShahnawySecretKey] = useState('');
  const [shahnawyMerchantWalletNumber, setShahnawyMerchantWalletNumber] = useState('');
  const [shahnawyMinAmount, setShahnawyMinAmount] = useState('5');
  const [shahnawyMaxAmount, setShahnawyMaxAmount] = useState('10000');
  const [walletIntroAr, setWalletIntroAr] = useState(''); const [walletIntroEn, setWalletIntroEn] = useState('');
  const [walletVerificationAr, setWalletVerificationAr] = useState(''); const [walletVerificationEn, setWalletVerificationEn] = useState('');
  const [vfAr, setVfAr] = useState(''); const [vfEn, setVfEn] = useState('');
  const [orAr, setOrAr] = useState(''); const [orEn, setOrEn] = useState('');
  const [etAr, setEtAr] = useState(''); const [etEn, setEtEn] = useState('');
  const [cryptoIntroAr, setCryptoIntroAr] = useState(''); const [cryptoIntroEn, setCryptoIntroEn] = useState('');
  const [cryptoInvoiceAr, setCryptoInvoiceAr] = useState(''); const [cryptoInvoiceEn, setCryptoInvoiceEn] = useState('');

  const { data: settings } = useQuery({
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
      if (settings.site_name) setSiteName(settings.site_name);
      if (settings.currency_symbol) setCurrencySymbol(settings.currency_symbol);
      if (settings.vodafone_cash_number) setVodafoneCashNumber(settings.vodafone_cash_number);
      if (settings.site_description) setSiteDescription(settings.site_description);
      if (settings.support_email) setSupportEmail(settings.support_email);
      if (settings.site_logo) setSiteLogo(settings.site_logo);
      if (settings.affiliate_commission_percentage) setAffiliateComm(settings.affiliate_commission_percentage);
      if (settings.usd_exchange_rate) setUsdExchangeRate(settings.usd_exchange_rate);
      if (settings.default_profit_margin) setDefaultProfitMargin(settings.default_profit_margin);
      setShahnawyEnabled(settings.shahnawy_enabled === 'true');
      if (settings.shahnawy_base_url) setShahnawyBaseUrl(settings.shahnawy_base_url);
      if (settings.shahnawy_public_key) setShahnawyPublicKey(settings.shahnawy_public_key);
      if (settings.shahnawy_secret_key) setShahnawySecretKey(settings.shahnawy_secret_key);
      if (settings.shahnawy_merchant_wallet_number) setShahnawyMerchantWalletNumber(settings.shahnawy_merchant_wallet_number);
      if (settings.shahnawy_min_amount) setShahnawyMinAmount(settings.shahnawy_min_amount);
      if (settings.shahnawy_max_amount) setShahnawyMaxAmount(settings.shahnawy_max_amount);
      setWalletIntroAr(settings.add_funds_wallet_intro_ar || 'أدخل رقم محفظتك الشخصية. سيتم إرسال طلب الدفع إلى هذه المحفظة.'); setWalletIntroEn(settings.add_funds_wallet_intro_en || 'Enter your personal wallet number. A payment request will be sent to that wallet.');
      setWalletVerificationAr(settings.add_funds_wallet_verification_ar || 'يتم التحقق من عملية الدفع تلقائياً قبل إضافة الرصيد.'); setWalletVerificationEn(settings.add_funds_wallet_verification_en || 'The payment is verified automatically before the balance is added.');
      setVfAr(settings.add_funds_vf_instruction_ar || 'بعد إنشاء طلب الدفع، قم بتأكيد العملية من محفظة Vodafone Cash.'); setVfEn(settings.add_funds_vf_instruction_en || 'After creating the payment request, confirm it from Vodafone Cash.');
      setOrAr(settings.add_funds_or_instruction_ar || 'بعد إنشاء طلب الدفع، وافق على العملية من محفظة Orange Cash.'); setOrEn(settings.add_funds_or_instruction_en || 'After creating the payment request, approve it from Orange Cash.');
      setEtAr(settings.add_funds_et_instruction_ar || 'بعد إنشاء طلب الدفع، وافق على العملية من e& Money / Etisalat Cash.'); setEtEn(settings.add_funds_et_instruction_en || 'After creating the payment request, approve it from e& Money / Etisalat Cash.');
      setCryptoIntroAr(settings.add_funds_crypto_intro_ar || 'ادفع بالدولار باستخدام بوابة الدفع بالعملات الرقمية المتاحة.'); setCryptoIntroEn(settings.add_funds_crypto_intro_en || 'Pay in USD using the available crypto payment gateway.');
      setCryptoInvoiceAr(settings.add_funds_crypto_invoice_ar || 'افتح الفاتورة وأكمل الدفع. تتم إضافة الرصيد بعد تأكيد العملية من بوابة الدفع.'); setCryptoInvoiceEn(settings.add_funds_crypto_invoice_en || 'Open the invoice and complete the payment. Your balance is credited after the gateway confirms it.');
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
      notify.success('Settings updated');
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    }
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
      shahnawy_enabled: String(shahnawyEnabled),
      shahnawy_base_url: shahnawyBaseUrl,
      shahnawy_public_key: shahnawyPublicKey,
      shahnawy_secret_key: shahnawySecretKey,
      shahnawy_merchant_wallet_number: shahnawyMerchantWalletNumber,
      shahnawy_min_amount: shahnawyMinAmount,
      shahnawy_max_amount: shahnawyMaxAmount,
      add_funds_wallet_intro_ar: walletIntroAr, add_funds_wallet_intro_en: walletIntroEn,
      add_funds_wallet_verification_ar: walletVerificationAr, add_funds_wallet_verification_en: walletVerificationEn,
      add_funds_vf_instruction_ar: vfAr, add_funds_vf_instruction_en: vfEn, add_funds_or_instruction_ar: orAr, add_funds_or_instruction_en: orEn, add_funds_et_instruction_ar: etAr, add_funds_et_instruction_en: etEn,
      add_funds_crypto_intro_ar: cryptoIntroAr, add_funds_crypto_intro_en: cryptoIntroEn, add_funds_crypto_invoice_ar: cryptoInvoiceAr, add_funds_crypto_invoice_en: cryptoInvoiceEn,
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
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Settings</h3>
        <button onClick={handleSave} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" /> Save Settings</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Site Name</label>
          <input type="text" value={siteName} onChange={e => setSiteName(e.target.value)} className="input-primary w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Site Description (SEO)</label>
          <input type="text" value={siteDescription} onChange={e => setSiteDescription(e.target.value)} className="input-primary w-full" />
        </div>
        <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4"><label className="block text-sm font-bold text-slate-800">Default provider profit margin (%)</label><p className="mt-1 text-xs text-slate-500">Used when creating a new provider. Existing providers keep their own margin until you edit them.</p><input type="number" min="0" max="10000" step="0.1" value={defaultProfitMargin} onChange={e=>setDefaultProfitMargin(e.target.value)} className="input-primary mt-3 max-w-xs"/></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency Symbol</label>
            <input type="text" value={currencySymbol} onChange={e => setCurrencySymbol(e.target.value)} className="input-primary w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Support Email <span className="text-red-500">*</span></label>
            <input type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} className="input-primary w-full" placeholder="support@yourdomain.com" />
            {!supportEmail && (
              <p className="text-xs text-amber-600 mt-1">Required for payment processors (e.g. Heleket and electronic-wallet gateway) — set a real, monitored email here so it appears on your public Contact page.</p>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Site Logo URL</label>
          <input type="url" value={siteLogo} onChange={e => setSiteLogo(e.target.value)} className="input-primary w-full" placeholder="https://..." />
        </div>
        
        <div className="border-t pt-6">
          <h4 className="text-sm font-bold text-gray-900 mb-4">Affiliate System</h4>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Commission Percentage (%)</label>
            <input type="number" step="0.1" value={affiliateComm} onChange={e => setAffiliateComm(e.target.value)} className="input-primary w-full max-w-xs" />
            <p className="text-xs text-gray-500 mt-1">Percentage earned by affiliates on approved payments.</p>
          </div>
        </div>
        <div className="border-t pt-6">
          <h4 className="text-sm font-bold text-gray-900 mb-2">Add Funds — Customer Instructions</h4>
          <p className="text-xs text-gray-500 mb-4">Edit the instructions customers see on the Add Funds page. Keep both languages clear and actionable.</p>
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Wallet introduction — العربية</label><textarea value={walletIntroAr} onChange={e=>setWalletIntroAr(e.target.value)} className="input-primary min-h-24 w-full" /></div>
              <div><label className="block text-sm font-medium mb-1">Wallet introduction — English</label><textarea value={walletIntroEn} onChange={e=>setWalletIntroEn(e.target.value)} className="input-primary min-h-24 w-full" /></div>
              <div><label className="block text-sm font-medium mb-1">Automatic verification — العربية</label><textarea value={walletVerificationAr} onChange={e=>setWalletVerificationAr(e.target.value)} className="input-primary min-h-24 w-full" /></div>
              <div><label className="block text-sm font-medium mb-1">Automatic verification — English</label><textarea value={walletVerificationEn} onChange={e=>setWalletVerificationEn(e.target.value)} className="input-primary min-h-24 w-full" /></div>
            </div>
            {[['Vodafone Cash',vfAr,setVfAr,vfEn,setVfEn],['Orange Cash',orAr,setOrAr,orEn,setOrEn],['Etisalat Cash',etAr,setEtAr,etEn,setEtEn],['Crypto payment',cryptoIntroAr,setCryptoIntroAr,cryptoIntroEn,setCryptoIntroEn],['Crypto invoice',cryptoInvoiceAr,setCryptoInvoiceAr,cryptoInvoiceEn,setCryptoInvoiceEn]].map(([label,arv,setar,env,seten]:any)=><div key={label} className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">{label} — العربية</label><textarea value={arv} onChange={e=>setar(e.target.value)} className="input-primary min-h-20 w-full" /></div><div><label className="block text-sm font-medium mb-1">{label} — English</label><textarea value={env} onChange={e=>seten(e.target.value)} className="input-primary min-h-20 w-full" /></div></div>)}
          </div>
        </div>
        <div className="border-t pt-6">
          <h4 className="text-sm font-bold text-gray-900 mb-4">Payment Methods Settings</h4>
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h5 className="font-bold text-gray-900">المحفظة الإلكترونية — Sha7nawy Gate</h5>
                <p className="text-xs text-gray-600 mt-1">Vodafone Cash / Orange Cash / Etisalat Cash. بيانات البوابة تبقى على السيرفر ولا يتم إرسال Secret Key للعميل.</p>
              </div>
              <button type="button" onClick={() => setShahnawyEnabled(v => !v)} className={`px-4 py-2 rounded-lg text-sm font-semibold ${shahnawyEnabled ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'}`}>{shahnawyEnabled ? 'Enabled' : 'Disabled'}</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label><input value={shahnawyBaseUrl} onChange={e=>setShahnawyBaseUrl(e.target.value)} className="input-primary w-full" placeholder="https://gate.sha7nawy.com" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Merchant Wallet Number</label><input value={shahnawyMerchantWalletNumber} onChange={e=>setShahnawyMerchantWalletNumber(e.target.value.replace(/\D/g,'').slice(0,11))} className="input-primary w-full" placeholder="01XXXXXXXXX" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Public Key</label><input value={shahnawyPublicKey} onChange={e=>setShahnawyPublicKey(e.target.value)} className="input-primary w-full" placeholder="Public API key" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Secret Key</label><input type="password" value={shahnawySecretKey} onChange={e=>setShahnawySecretKey(e.target.value)} className="input-primary w-full" placeholder="Secret API key" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Minimum EGP</label><input type="number" min="1" value={shahnawyMinAmount} onChange={e=>setShahnawyMinAmount(e.target.value)} className="input-primary w-full" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Maximum EGP</label><input type="number" min="1" value={shahnawyMaxAmount} onChange={e=>setShahnawyMaxAmount(e.target.value)} className="input-primary w-full" /></div>
            </div>
            <div className="rounded-xl bg-white border border-indigo-100 p-4 text-xs text-gray-600 space-y-2">
              <p><strong>Webhook:</strong> <code>/api/shahnawy/webhook</code> — يتم إنشاؤه تلقائياً من PUBLIC_APP_URL.</p>
              <p><strong>أمان إضافي:</strong> النظام لا يثق في Webhook وحده؛ عند وصوله يعيد الاستعلام عن العملية باستخدام Secret Key ويتأكد من المبلغ والحالة قبل إضافة الرصيد.</p>
              <p><strong>ملاحظة:</strong> رقم المحفظة هنا هو رقم المحفظة المستقبلة الذي تريد عرضه للعملاء. ملف الـAPI المرفق لا يرسل رقم المستلم ضمن طلب Create، لذلك لا يتم اختراع باراميتر غير موجود في التوثيق.</p>
            </div>
          </div>
          <div className="mt-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Exchange Rate (EGP per 1 USD)</label>
            <input type="number" step="0.01" min="0.01" value={usdExchangeRate} onChange={e => setUsdExchangeRate(e.target.value)} className="input-primary w-full max-w-xs" />
            <p className="text-xs text-gray-500 mt-1">المحفظة الداخلية بالدولار. المبلغ المدفوع بالجنيه يتم تحويله للدولار بهذا السعر قبل إضافة الرصيد.</p>
          </div>
          <div className="border-t mt-5 pt-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Heleket Connection</label>
            <p className="text-xs text-gray-500 mb-2">اختبار بوابة العملات الرقمية الموجودة حالياً.</p>
            <button type="button" onClick={() => heleketStatus.refetch()} disabled={heleketStatus.isFetching} className="btn-secondary inline-flex items-center gap-2">
              {heleketStatus.isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlugZap className="w-4 h-4" />} Test Heleket Connection
            </button>
            {heleketStatus.data && <div className={`mt-3 text-sm rounded-lg p-3 flex items-start gap-2 ${heleketStatus.data.connectionOk ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>{heleketStatus.data.connectionOk ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}<div>{heleketStatus.data.connectionOk ? <span>Connected. Merchant {heleketStatus.data.maskedMerchant} is recognized by Heleket.</span> : <span>{heleketStatus.data.error || 'Connection failed.'}</span>}</div></div>}
          </div>
        </div>
      </div>
    </div>
  );
}
