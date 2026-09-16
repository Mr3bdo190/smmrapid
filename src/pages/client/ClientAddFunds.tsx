import { useState } from 'react';
import { Link } from 'react-router-dom';
import { notify } from '../../lib/notify';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation, translations } from '../../lib/i18n';
import { apiFetch } from '../../lib/api';
import { Wallet, ShieldCheck, Bitcoin, ExternalLink } from 'lucide-react';

const walletMethods = [{ value: 'vf_cash', label: 'Vodafone Cash' }, { value: 'or_cash', label: 'Orange Cash' }, { value: 'et_cash', label: 'Etisalat Cash' }];

/** Quick-fill chips of the design's amount step. */
const presetValues = [50, 100, 250, 500, 1000, 2500];

export default function ClientAddFunds() {
  const { user, dbUser } = useAuth();
  const { t, dir, lang } = useTranslation();
  const [gateway, setGateway] = useState<'wallet' | 'crypto'>('wallet');
  const [amount, setAmount] = useState<number | ''>('');
  const [walletMethod, setWalletMethod] = useState('vf_cash');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pendingPayment, setPendingPayment] = useState<any>(null);
  const [cryptoPayment, setCryptoPayment] = useState<any>(null);
  const [receipt, setReceipt] = useState<any>(null);

  const { data: config } = useQuery({
    queryKey: ['client-config'],
    queryFn: async () => {
      const r = await apiFetch('/api/client/config', user);
      return r.ok ? r.json() : {};
    },
  });

  const handleApiError = (res: Response) => {
    if (!res.ok) {
      return res.json().then((b: any) => {
        throw new Error(b.error || b.message || b.errorKey || 'Request failed');
      }).catch(() => {
        throw new Error('Request failed');
      });
    }
    return res.json();
  };

  const walletPay = useMutation({
    mutationFn: async () => {
      const token = await user?.getIdToken();
      const r = await apiFetch('/api/shahnawy/create', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: Number(amount), number: phoneNumber, method: walletMethod }),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 400 && b.code === 'MIN_AMOUNT_ERROR') {
          const minMatch = b.error?.match(/\$(\d+(?:\.\d+)?)/);
          const min = minMatch ? parseFloat(minMatch[1]) : 1;
          throw new Error(t('errors.minAmount', { min: min.toFixed(2) }));
        }
        throw new Error(b.error || b.message || 'Payment failed');
      }
      return b;
    },
    onSuccess: (b) => {
      setReceipt(null);
      setPendingPayment(b);
      notify.success(t('addFunds.paymentCreated'));
    },
    onError: (e: any) => notify.error(e.message),
  });

  const confirmWallet = useMutation({
    mutationFn: async () => {
      const token = await user?.getIdToken();
      const r = await apiFetch('/api/shahnawy/confirm', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ paymentId: pendingPayment?.paymentId }),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok && r.status !== 202) throw new Error(b.error || b.message || 'Confirmation failed');
      return b;
    },
    onSuccess: (b) => {
      if (b.status === 'completed') {
        notify.success(t('addFunds.paymentConfirmed'));
        setReceipt({ payment: pendingPayment, result: b, method: selected.label, number: phoneNumber });
        setPendingPayment(null);
        setAmount('');
        setPhoneNumber('');
      } else {
        notify.info(t('addFunds.paymentStillPending'));
      }
    },
    onError: (e: any) => notify.error(e.message),
  });

  const cryptoPay = useMutation({
    mutationFn: async () => {
      const token = await user?.getIdToken();
      const r = await apiFetch('/api/heleket/create', user, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: Number(amount) }),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 400 && b.code === 'MIN_AMOUNT_ERROR') {
          const minMatch = b.error?.match(/\$(\d+(?:\.\d+)?)/);
          const min = minMatch ? parseFloat(minMatch[1]) : 1;
          throw new Error(t('errors.minAmount', { min: min.toFixed(2) }));
        }
        throw new Error(b.error || b.message || 'Crypto payment failed');
      }
      return b;
    },
    onSuccess: (b) => {
      setCryptoPayment({ ...b, requestedAmount: Number(amount) });
      notify.success(t('addFunds.invoiceCreated'));
    },
    onError: (e: any) => notify.error(e.message),
  });

  const rate = Number(config?.usdExchangeRate || 0);
  const usdPreview = amount && rate ? Number(amount) / rate : null;
  const selected = walletMethods.find(x => x.value === walletMethod) || walletMethods[0];
  const addFunds = config?.addFunds || {};
  const walletIntro = addFunds.walletIntro?.[lang] || '';
  const walletVerification = addFunds.walletVerification?.[lang] || '';
  const methodInstruction = addFunds.methods?.[walletMethod]?.[lang] || '';
  const cryptoIntro = addFunds.cryptoIntro?.[lang] || '';
  const cryptoInvoiceInstruction = addFunds.cryptoInvoiceInstruction?.[lang] || '';

  const currencySymbol = config?.currencySymbol || '$';
  const currencyCode = config?.currencyCode || 'USD';
  const cryptoCurrency = config?.heleketCurrency || 'USD';
  const balance = Number((dbUser as any)?.balance || 0);
  const walletMin = Number(config?.shahnawyMinAmount || 5);
  const walletMax = Number(config?.shahnawyMaxAmount || 10000);
  const cryptoMin = Number(config?.minDepositAmount || 1);

  /** Secondary-language twin of a translated key, mirroring the shell's bilingual labels. */
  const alt = (key: string) => {
    const entry = (translations as any)[key];
    if (!entry) return '';
    return lang === 'ar' ? entry.en : entry.ar;
  };
  const lang2 = (en: string, ar: string) => (lang === 'ar' ? ar : en);
  const copy = (value?: string | null) => {
    if (!value) return;
    navigator.clipboard?.writeText(String(value));
    notify.success(t('common.copied'));
  };
  const statusKey = (value?: string | null) => {
    const key = String(value || '').toLowerCase().replace(/[^a-z]/g, '');
    return ['pending', 'processing', 'inprogress', 'completed', 'partial', 'canceled', 'refunded'].includes(key) ? key : 'default';
  };
  const amountText = amount ? ` (${gateway === 'crypto' ? currencySymbol : ''}${Number(amount).toFixed(2)}${gateway === 'crypto' ? '' : ' EGP'})` : '';
  const creditedUsd = gateway === 'crypto' ? (amount ? Number(amount) : null) : usdPreview;
  const presets = presetValues.filter(v => (gateway === 'wallet' ? v <= walletMax : true));
  const createdAt = cryptoPayment?.expiresAt ? new Date(cryptoPayment.expiresAt) : null;

  const ctaLabel = gateway === 'wallet'
    ? (walletPay.isPending ? t('addFunds.creating') : `${t('addFunds.create')}${amountText}`)
    : (!config?.heleketEnabled
      ? t('addFunds.cryptoUnavailable')
      : cryptoPay.isPending ? t('addFunds.creatingInvoice') : `${t('addFunds.createInvoice')}${amountText}`);

  return (
    <div dir={dir} className="flex flex-col gap-gutter-lg">
      {/* ── Page banner (design: Add Funds & Payment Hub header) ─────────────── */}
      <div className="flex flex-col gap-space-md lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-space-sm">
            <h1 className="font-display text-headline-lg text-on-surface tracking-tight">{t('addFunds.title')}</h1>
            <span className="font-display text-headline-sm font-normal tracking-tight text-primary">{alt('addFunds.title')}</span>
            <span className="flex items-center gap-1 rounded-lg bg-tertiary-container/30 px-space-sm py-space-2xs font-mono text-code-xs text-tertiary shadow-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-tertiary" />
              {lang2('Instant Automated Credit', 'شحن آلي فوري')}
            </span>
          </div>
          <p className="mt-1 font-sans text-body-sm text-on-surface-variant">{t('addFunds.chooseMethod')}</p>
        </div>
        {/* Live gateway state — bound to the real gateway flags from /api/client/config */}
        <div className="flex items-center gap-space-sm rounded-xl bg-surface-container-low px-space-md py-space-xs shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-label-sm uppercase leading-none tracking-wider text-on-surface-variant">{lang2('Gateway Engine', 'بوابة الدفع')}</span>
            <span className="flex flex-wrap items-center gap-space-sm font-mono text-code-xs font-semibold text-on-surface">
              <span className="flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${config?.shahnawyEnabled ? 'bg-tertiary animate-pulse' : 'bg-outline'}`} />
                {t('addFunds.eWallet')}
              </span>
              <span className="flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${config?.heleketEnabled ? 'bg-tertiary animate-pulse' : 'bg-outline'}`} />
                {t('addFunds.crypto')}
              </span>
            </span>
          </div>
          <span className="material-symbols-outlined text-base text-tertiary">bolt</span>
        </div>
      </div>

      {/* ── Metric row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container p-space-lg shadow-bevel transition-shadow hover:shadow-float">
          <div className="pointer-events-none absolute -top-8 -end-8 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
          <div className="flex items-center justify-between">
            <span className="font-mono text-label-sm uppercase tracking-wider text-on-surface-variant">{lang2('Available Balance', 'الرصيد المتاح')}</span>
            <span className="material-symbols-outlined text-lg text-tertiary">account_balance_wallet</span>
          </div>
          <div className="mt-space-md flex items-baseline gap-space-xs">
            <span className="font-display text-headline-xl font-bold tracking-tight text-on-surface tabular-nums">{currencySymbol}{balance.toFixed(2)}</span>
            <span className="font-mono text-code-xs text-on-surface-variant">{currencyCode}</span>
          </div>
          <div className="mt-space-sm flex items-center justify-between font-mono text-code-xs text-tertiary">
            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">check_circle</span>{t('addFunds.autoVerify')}</span>
          </div>
        </div>
      </div>

      {/* ── Deposit operations: form (7) + vault & safety (5) ───────────────── */}
      <div className="grid grid-cols-1 gap-space-lg lg:grid-cols-12">
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-gutter-lg lg:col-span-7">
          <div className="flex flex-col gap-gutter-lg rounded-xl bg-surface-container p-space-xl shadow-bevel">
            {/* Step 1 — payment method */}
            <div className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-container font-mono text-code-xs font-semibold text-on-primary-container">1</span>
                  <span className="font-display text-headline-sm text-on-surface">{t('addFunds.chooseWallet')}</span>
                </div>
                <span className="font-mono text-code-xs text-tertiary">{lang2('Direct API Linked', 'مرتبط بالـ API مباشرة')}</span>
              </div>

              <div className="mt-space-xs grid grid-cols-1 gap-space-sm sm:grid-cols-2">
                {/* Crypto gateway card */}
                <button
                  type="button"
                  onClick={() => setGateway('crypto')}
                  disabled={!config?.heleketEnabled}
                  aria-pressed={gateway === 'crypto'}
                  className={`relative flex flex-col justify-between rounded-xl p-space-md text-start shadow-sm transition-all disabled:opacity-50 ${
                    gateway === 'crypto' ? 'bg-surface-container-high ring-2 ring-primary' : 'bg-surface-container-low hover:bg-surface-container-high'
                  }`}
                >
                  <span className="absolute end-2.5 top-2.5 rounded bg-surface-container-highest px-space-xs py-space-2xs font-mono text-code-xs text-on-surface-variant">
                    {cryptoCurrency}
                  </span>
                  <div className="flex items-center gap-space-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-highest text-primary"><Bitcoin className="h-5 w-5" /></div>
                    <div className="flex flex-col">
                      <span className="font-sans text-label-lg font-semibold text-on-surface">{t('addFunds.crypto')}</span>
                      <span className="font-mono text-code-xs text-on-surface-variant">{cryptoCurrency} • {t('addFunds.cryptoDesc')}</span>
                    </div>
                  </div>
                  <div className="mt-space-md flex items-center justify-between pt-space-xs">
                    <span className="font-mono text-code-xs text-on-surface-variant">{t('addFunds.cryptoWalletDesc')}</span>
                    <span className="material-symbols-outlined text-base text-primary">{gateway === 'crypto' ? 'check_circle' : 'arrow_forward'}</span>
                  </div>
                </button>

                {/* Electronic wallet cards — one per real method supported by the gateway */}
                {walletMethods.map(m => {
                  const instruction = addFunds.methods?.[m.value]?.[lang] || '';
                  const active = gateway === 'wallet' && walletMethod === m.value;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => { setGateway('wallet'); setWalletMethod(m.value); }}
                      disabled={!config?.shahnawyEnabled}
                      aria-pressed={active}
                      className={`relative flex flex-col justify-between rounded-xl p-space-md text-start shadow-sm transition-all disabled:opacity-50 ${
                        active ? 'bg-surface-container-high ring-2 ring-primary' : 'bg-surface-container-low hover:bg-surface-container-high'
                      }`}
                    >
                      <span className="absolute end-2.5 top-2.5 rounded bg-surface-container-highest px-space-xs py-space-2xs font-mono text-code-xs text-on-surface-variant">
                        {walletMin}–{walletMax} EGP
                      </span>
                      <div className="flex items-center gap-space-sm">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-highest text-primary"><Wallet className="h-5 w-5" /></div>
                        <div className="flex flex-col">
                          <span className="font-sans text-label-lg font-semibold text-on-surface">{m.label}</span>
                          <span className="font-mono text-code-xs text-on-surface-variant">{instruction || t('addFunds.walletMethods')}</span>
                        </div>
                      </div>
                      <div className="mt-space-md flex items-center justify-between pt-space-xs">
                        <span className="font-mono text-code-xs text-on-surface-variant">{t('addFunds.amountEgp')}</span>
                        <span className="material-symbols-outlined text-base text-primary">{active ? 'check_circle' : 'arrow_forward'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {!config?.shahnawyEnabled && (
                <div className="flex items-start gap-space-sm rounded-xl bg-error-container/20 p-space-md text-on-surface shadow-sm">
                  <span className="material-symbols-outlined mt-0.5 shrink-0 text-xl text-error">warning</span>
                  <span className="font-sans text-body-sm text-on-surface-variant">{t('addFunds.walletUnavailable')}</span>
                </div>
              )}
              {!config?.heleketEnabled && (
                <div className="flex items-start gap-space-sm rounded-xl bg-error-container/20 p-space-md text-on-surface shadow-sm">
                  <span className="material-symbols-outlined mt-0.5 shrink-0 text-xl text-error">warning</span>
                  <span className="font-sans text-body-sm text-on-surface-variant">{t('addFunds.cryptoUnavailable')}</span>
                </div>
              )}
            </div>

            {/* Step 2 — amount */}
            <div className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-container font-mono text-code-xs font-semibold text-on-primary-container">2</span>
                  <span className="font-display text-headline-sm text-on-surface">{gateway === 'wallet' ? t('addFunds.amountEgp') : t('addFunds.amountUsd')}</span>
                </div>
                <span className="font-mono text-code-xs text-outline">
                  {gateway === 'wallet'
                    ? `${lang2('Min', 'الأدنى')}: ${walletMin} EGP | ${lang2('Max', 'الأعلى')}: ${walletMax} EGP`
                    : `${lang2('Min', 'الأدنى')}: ${currencySymbol}${cryptoMin.toFixed(2)} | ${lang2('Max', 'الأعلى')}: ${currencySymbol}1,000,000.00`}
                </span>
              </div>

              <div className="relative">
                <span className="material-symbols-outlined absolute start-space-md top-1/2 -translate-y-1/2 text-lg text-tertiary">attach_money</span>
                {gateway === 'wallet' ? (
                  <input
                    type="number"
                    min={walletMin}
                    max={walletMax}
                    value={amount}
                    onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="h-10 w-full rounded-xl bg-surface-container-low ps-10 pe-space-md font-mono text-code-sm font-semibold text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                ) : (
                  <input
                    type="number"
                    min="1"
                    max="1000000"
                    step="0.01"
                    value={amount}
                    onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="10"
                    className="h-10 w-full rounded-xl bg-surface-container-low ps-10 pe-space-md font-mono text-code-sm font-semibold text-on-surface shadow-sm placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-space-xs pt-1">
                <span className="me-1 font-mono text-label-sm text-outline">{lang2('Pre-sets:', 'قيم سريعة:')}</span>
                {presets.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(v)}
                    className={`rounded-lg px-space-md py-1 font-mono text-code-xs transition-colors ${
                      Number(amount) === v ? 'bg-primary-container font-semibold text-on-primary-container shadow-sm' : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    +{gateway === 'wallet' ? 'EGP ' : currencySymbol}{v.toLocaleString()}
                  </button>
                ))}
              </div>

              {gateway === 'wallet' && (
                <div className="pt-space-xs">
                  <label className="mb-1 block font-label-sm text-label-sm text-on-surface-variant">{t('addFunds.paymentWallet')}</label>
                  <input
                    type="tel"
                    maxLength={11}
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    className="h-10 w-full rounded-xl bg-surface-container-low px-space-md font-mono text-code-sm text-on-surface shadow-sm placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="01XXXXXXXXX"
                    aria-label={t('addFunds.paymentWallet')}
                  />
                </div>
              )}

              {gateway === 'wallet' && methodInstruction && (
                <div className="flex items-start gap-space-md rounded-xl bg-surface-container-low p-space-md shadow-sm">
                  <span className="material-symbols-outlined mt-0.5 text-lg text-secondary">info</span>
                  <div className="flex flex-col font-sans text-body-sm leading-relaxed text-on-surface-variant">
                    <span className="font-semibold text-on-surface">{t('addFunds.autoPayment')}</span>
                    <span className="mt-0.5">{methodInstruction}</span>
                    <span className="mt-0.5 font-mono text-code-xs">{t('addFunds.autoVerify')}</span>
                  </div>
                </div>
              )}

              {gateway === 'crypto' && cryptoIntro && (
                <div className="flex items-start gap-space-md rounded-xl bg-surface-container-low p-space-md shadow-sm">
                  <span className="material-symbols-outlined mt-0.5 text-lg text-secondary">info</span>
                  <div className="flex flex-col font-sans text-body-sm leading-relaxed text-on-surface-variant">
                    <span className="font-semibold text-on-surface">{t('addFunds.crypto')}</span>
                    <span className="mt-0.5">{cryptoIntro}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 3 — real-time credit preview */}
            <div className="flex flex-col gap-space-sm rounded-xl bg-surface-container-low p-space-lg shadow-sm">
              <div className="flex items-center justify-between pb-space-xs">
                <span className="font-mono text-label-sm uppercase tracking-wider text-on-surface-variant">{lang2('Instant Calculation', 'تفاصيل الحساب الفوري')}</span>
                <span className="font-mono text-code-xs text-tertiary">{lang2('Net + Credit', 'الصافي + الرصيد')}</span>
              </div>
              <div className="flex items-center justify-between font-sans text-body-sm">
                <span className="text-on-surface-variant">{gateway === 'wallet' ? t('addFunds.amountEgp') : t('addFunds.amountUsd')}</span>
                <span className="font-mono text-code-sm font-semibold text-on-surface">
                  {amount === '' ? '—' : gateway === 'wallet' ? `${Number(amount).toFixed(2)} EGP` : `${currencySymbol}${Number(amount).toFixed(2)} ${currencyCode}`}
                </span>
              </div>
              {gateway === 'wallet' && (
                <div className="flex items-center justify-between font-sans text-body-sm">
                  <span className="text-on-surface-variant">{lang2('Exchange rate', 'سعر الصرف')}</span>
                  <span className="font-mono text-code-sm text-on-surface-variant">{rate > 0 ? `1 ${currencyCode} = ${rate} EGP` : '—'}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-space-sm">
                <div className="flex flex-col">
                  <span className="font-sans text-label-lg font-semibold text-on-surface">{t('addFunds.approxCredit')}</span>
                  <span className="font-mono text-code-xs text-on-surface-variant">{lang2('Automated webhook verification', 'تحقق تلقائي عبر الويبهوك')}</span>
                </div>
                <span className="font-display text-headline-lg font-mono tracking-tight text-primary">
                  {creditedUsd === null ? '—' : `${currencySymbol}${creditedUsd.toFixed(2)} ${currencyCode}`}
                </span>
              </div>
            </div>

            {/* Primary CTA — same handlers and disabled rules as before */}
            <button
              type="button"
              onClick={() => (gateway === 'wallet' ? walletPay.mutate() : cryptoPay.mutate())}
              disabled={gateway === 'wallet'
                ? (walletPay.isPending || !amount || !/^01\d{9}$/.test(phoneNumber))
                : (cryptoPay.isPending || !amount || !config?.heleketEnabled)}
              className="group flex h-12 w-full items-center justify-center gap-space-sm rounded-xl bg-primary-container font-display text-headline-sm text-on-primary-container shadow-md transition-all hover:bg-primary disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-xl transition-transform group-hover:scale-110">bolt</span>
              <span>{ctaLabel}</span>
            </button>

            <div className="flex flex-wrap items-center justify-center gap-gutter-lg font-mono text-code-xs text-on-surface-variant">
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm text-tertiary">lock</span>{lang2('256-Bit SSL Encrypted', 'تشفير SSL 256 بت')}</span>
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm text-tertiary">speed</span>{lang2('Real-time Verification', 'تحقق فوري')}</span>
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm text-tertiary">verified_user</span>{lang2('Anti-Fraud Protection', 'حماية من الاحتيال')}</span>
            </div>

            {/* Pending wallet request — receipt ledger (design: secure checkout receipt) */}
            {pendingPayment && !receipt && (
              <div className="relative flex flex-col overflow-hidden rounded-xl bg-surface-container-low shadow-bevel">
                <div className="h-1 w-full bg-gradient-to-r from-tertiary via-primary-container to-secondary" />
                <div className="flex flex-col gap-space-md p-space-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-base text-primary">receipt_long</span>
                      <span className="font-sans text-label-lg font-semibold text-on-surface">{t('addFunds.invoiceReady')}</span>
                    </div>
                    <span className={`status-badge s-${statusKey(pendingPayment.status)}`}>{String(pendingPayment.status || 'pending')}</span>
                  </div>

                  <div className="grid grid-cols-1 gap-x-space-xl gap-y-space-sm font-sans text-body-sm md:grid-cols-2">
                    <div className="flex items-center justify-between py-space-2xs">
                      <span className="text-outline">{lang2('Transaction ID:', 'معرّف العملية:')}</span>
                      <div className="flex items-center gap-space-xs">
                        <span className="font-mono text-code-sm font-semibold text-on-surface">{pendingPayment.transactionId || pendingPayment.paymentId || '—'}</span>
                        <button type="button" onClick={() => copy(pendingPayment.transactionId || pendingPayment.paymentId)} className="flex h-6 w-6 items-center justify-center rounded bg-surface-container-high text-tertiary transition-colors hover:bg-surface-bright" title={t('common.copy')}>
                          <span className="material-symbols-outlined text-xs">content_copy</span>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-space-2xs">
                      <span className="text-outline">{t('addFunds.reference')}:</span>
                      <span className="font-mono text-code-sm text-on-surface">{pendingPayment.reference || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between py-space-2xs">
                      <span className="text-outline">{t('addFunds.paymentWallet')}:</span>
                      <span className="font-mono text-code-sm text-on-surface">{selected.label} • {phoneNumber}</span>
                    </div>
                    <div className="flex items-center justify-between py-space-2xs">
                      <span className="text-outline">{t('addFunds.amountEgp')}:</span>
                      <span className="font-mono text-code-sm text-on-surface">{pendingPayment.amountEgp ?? '—'} EGP</span>
                    </div>
                    {pendingPayment.usdAmount && (
                      <div className="flex items-center justify-between py-space-2xs">
                        <span className="text-outline">{t('addFunds.approxCredit')}</span>
                        <span className="font-mono text-code-sm font-semibold text-tertiary">{currencySymbol}{pendingPayment.usdAmount} {currencyCode}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-space-2xs">
                    <span className="font-mono text-code-xs text-on-surface-variant">{walletVerification}</span>
                    <button
                      type="button"
                      onClick={() => confirmWallet.mutate()}
                      disabled={confirmWallet.isPending}
                      className="inline-flex items-center justify-center gap-space-xs rounded-xl bg-primary-container px-space-lg py-space-sm font-label-lg font-semibold text-on-primary-container shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition-all hover:bg-primary disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-lg">bolt</span>
                      {confirmWallet.isPending ? t('addFunds.verifying') : t('addFunds.confirmPayment')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Credited — success receipt (design: payment confirmed receipt modal) */}
            {receipt && (
              <div className="relative flex flex-col overflow-hidden rounded-xl bg-surface-container-low shadow-bevel">
                <div className="h-1 w-full bg-gradient-to-r from-tertiary via-primary-container to-secondary" />
                <button type="button" onClick={() => setReceipt(null)} title={t('common.close')} className="absolute end-space-md top-space-md z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface">
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
                <div className="flex flex-col gap-space-lg p-space-xl">
                  <div className="relative flex flex-col items-center text-center">
                    <div className="pointer-events-none absolute -top-3 h-28 w-28 rounded-full bg-tertiary/15 blur-2xl" />
                    <div className="relative mb-space-md flex h-16 w-16 items-center justify-center rounded-full bg-surface-container shadow-lg shadow-tertiary/20">
                      <span className="material-symbols-outlined text-3xl text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <span className="pointer-events-none absolute inset-0 animate-ping rounded-full border-2 border-tertiary/30" />
                    </div>
                    <span className="mb-space-2xs flex items-center gap-space-2xs rounded bg-surface-container px-space-xs py-space-2xs font-mono text-code-xs uppercase tracking-wider text-tertiary">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-tertiary" />
                      {receipt.result?.status || 'completed'}
                    </span>
                    <h2 className="font-display text-headline-lg tracking-tight text-on-surface">{t('addFunds.paymentConfirmed')}</h2>
                  </div>

                  <div className="rounded-xl bg-surface-container p-space-lg shadow-inner">
                    <div className="flex flex-col justify-between rounded-lg bg-surface-container-high p-space-md">
                      <div className="mb-space-xs flex items-center justify-between">
                        <span className="font-mono text-label-sm uppercase text-outline">{lang2('Credited Amount', 'المبلغ المضاف')}</span>
                        <span className="material-symbols-outlined text-base text-tertiary">savings</span>
                      </div>
                      <div className="flex items-baseline gap-space-xs">
                        <span className="font-display text-headline-xl font-extrabold tracking-tight text-on-surface">{receipt.payment?.usdAmount || (receipt.payment?.amountEgp && rate ? (Number(receipt.payment.amountEgp) / rate).toFixed(2) : '—')}</span>
                        <span className="font-mono text-code-sm font-semibold text-tertiary">{currencyCode}</span>
                      </div>
                      <div className="mt-space-2xs font-mono text-code-xs text-on-surface-variant">{receipt.payment?.amountEgp || '—'} EGP</div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-space-md rounded-xl bg-surface-container p-space-lg">
                    <div className="flex items-center justify-between pb-space-xs">
                      <div className="flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-base text-primary">receipt_long</span>
                        <span className="font-sans text-label-lg font-semibold text-on-surface">{lang2('Receipt Ledger', 'تفاصيل الإيصال')}</span>
                      </div>
                      <span className="rounded bg-surface-container-lowest px-space-xs py-space-2xs font-mono text-code-xs text-tertiary">{lang2('STATUS:', 'الحالة:')} {receipt.result?.status || 'completed'}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-x-space-xl gap-y-space-sm font-sans text-body-sm md:grid-cols-2">
                      <div className="flex items-center justify-between py-space-2xs">
                        <span className="text-outline">{lang2('Transaction ID:', 'معرّف العملية:')}</span>
                        <div className="flex items-center gap-space-xs">
                          <span className="font-mono text-code-sm font-semibold text-on-surface">
                            {receipt.result?.data?.transaction_id || receipt.result?.data?.id || receipt.payment?.transactionId || receipt.payment?.paymentId || '—'}
                          </span>
                          <button type="button" onClick={() => copy(receipt.result?.data?.transaction_id || receipt.result?.data?.id || receipt.payment?.transactionId || receipt.payment?.paymentId)} title={t('common.copy')} className="flex h-6 w-6 items-center justify-center rounded bg-surface-container-high text-tertiary transition-colors hover:bg-surface-bright">
                            <span className="material-symbols-outlined text-xs">content_copy</span>
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-space-2xs">
                        <span className="text-outline">{lang2('Payment Method:', 'وسيلة الدفع:')}</span>
                        <span className="flex items-center gap-space-xs">
                          <span className="material-symbols-outlined text-sm text-tertiary">currency_exchange</span>
                          <span className="font-label-sm text-label-sm text-on-surface">{receipt.method}{receipt.number ? ` • ${receipt.number}` : ''}</span>
                        </span>
                      </div>
                      {receipt.payment?.reference && (
                        <div className="flex items-center justify-between py-space-2xs">
                          <span className="text-outline">{t('addFunds.reference')}:</span>
                          <span className="font-mono text-code-sm text-on-surface">{receipt.payment.reference}</span>
                        </div>
                      )}
                      {receipt.payment?.transactionId && receipt.payment?.paymentId && (
                        <div className="flex items-center justify-between py-space-2xs">
                          <span className="text-outline">{lang2('Payment record:', 'سجل الدفع:')}</span>
                          <span className="font-mono text-code-xs text-on-surface-variant">{receipt.payment.paymentId}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-space-sm sm:flex-row">
                    <Link to="/dashboard/new-order" className="flex w-full items-center justify-center gap-space-xs rounded-xl bg-primary-container px-space-lg py-space-sm font-label-lg text-on-primary-container shadow-lg shadow-primary-container/20 transition-all hover:bg-primary sm:flex-1">
                      <span className="material-symbols-outlined text-lg">bolt</span>
                      {t('nav.newOrder')}
                    </Link>
                    <button type="button" onClick={() => setReceipt(null)} className="flex w-full items-center justify-center gap-space-xs rounded-xl bg-surface-container px-space-lg py-space-sm font-label-lg text-on-surface transition-colors hover:bg-surface-container-high sm:w-auto">
                      <span className="material-symbols-outlined text-lg">arrow_back</span>
                      {t('common.close')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Crypto invoice — receipt ledger bound to the real /api/heleket/create response */}
            {gateway === 'crypto' && cryptoPayment && (
              <div className="relative flex flex-col overflow-hidden rounded-xl bg-surface-container-low shadow-bevel">
                <div className="h-1 w-full bg-gradient-to-r from-tertiary via-primary-container to-secondary" />
                <div className="flex flex-col gap-space-md p-space-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-base text-primary">receipt_long</span>
                      <span className="font-sans text-label-lg font-semibold text-on-surface">{t('addFunds.invoiceReady')}</span>
                    </div>
                    {createdAt && (
                      <span className="rounded bg-surface-container-lowest px-space-xs py-space-2xs font-mono text-code-xs text-tertiary">
                        {lang2('Expires', 'تنتهي')}: {createdAt.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-x-space-xl gap-y-space-sm font-sans text-body-sm md:grid-cols-2">
                    <div className="flex items-center justify-between py-space-2xs">
                      <span className="text-outline">{lang2('Invoice ID:', 'معرّف الفاتورة:')}</span>
                      <div className="flex items-center gap-space-xs">
                        <span className="font-mono text-code-sm font-semibold text-on-surface">{cryptoPayment.invoiceUuid || cryptoPayment.orderId || cryptoPayment.paymentId || '—'}</span>
                        <button type="button" onClick={() => copy(cryptoPayment.invoiceUuid || cryptoPayment.orderId || cryptoPayment.paymentId)} title={t('common.copy')} className="flex h-6 w-6 items-center justify-center rounded bg-surface-container-high text-tertiary transition-colors hover:bg-surface-bright">
                          <span className="material-symbols-outlined text-xs">content_copy</span>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-space-2xs">
                      <span className="text-outline">{lang2('Order reference:', 'مرجع الطلب:')}</span>
                      <span className="font-mono text-code-sm text-on-surface">{cryptoPayment.orderId || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between py-space-2xs">
                      <span className="text-outline">{lang2('Payment Method:', 'وسيلة الدفع:')}</span>
                      <span className="flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-sm text-tertiary">currency_bitcoin</span>
                        <span className="font-label-sm text-label-sm text-on-surface">{cryptoCurrency}</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-space-2xs">
                      <span className="text-outline">{t('addFunds.amountUsd')}:</span>
                      <span className="font-mono text-code-sm text-tertiary font-semibold">{currencySymbol}{Number(cryptoPayment.requestedAmount || 0).toFixed(2)} {currencyCode}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-space-2xs">
                    <span className="font-mono text-code-xs text-on-surface-variant">{cryptoInvoiceInstruction}</span>
                    {cryptoPayment.paymentUrl ? (
                      <a href={cryptoPayment.paymentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-space-xs rounded-xl bg-primary-container px-space-lg py-space-sm font-label-lg font-semibold text-on-primary-container shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition-all hover:bg-primary">
                        {t('addFunds.openInvoice')} <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : (
                      <p className="font-sans text-body-sm text-error">{t('addFunds.noInvoice')}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-gutter-lg lg:col-span-5">
          {/* Crypto vault — bound to the real invoice fields when one exists */}
          {gateway === 'crypto' ? (
            <div className="relative flex flex-col gap-space-md overflow-hidden rounded-xl bg-surface-container p-space-xl shadow-bevel">
              <div className="pointer-events-none absolute -top-5 end-0 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className={`h-2.5 w-2.5 rounded-full ${cryptoPayment ? 'bg-tertiary animate-pulse' : 'bg-outline'}`} />
                  <span className="font-display text-headline-sm text-on-surface">{lang2('Crypto Vault', 'محفظة الدفع الرقمية')}</span>
                </div>
                <span className="rounded bg-surface-container-high px-space-xs py-space-2xs font-mono text-code-xs text-tertiary">{cryptoCurrency}</span>
              </div>

              {cryptoPayment ? (
                <>
                  <div className="flex flex-col items-center gap-space-md rounded-xl bg-surface-container-low p-space-md shadow-sm sm:flex-row">
                    <div className="flex shrink-0 items-center justify-center rounded-lg bg-on-surface p-2.5 shadow-inner">
                      <svg className="h-28 w-28 text-surface-container-lowest" fill="currentColor" viewBox="0 0 100 100" aria-hidden="true">
                        <rect height="26" rx="4" width="26" x="5" y="5" />
                        <rect className="text-surface-container-lowest" fill="currentColor" height="18" width="18" x="9" y="9" />
                        <rect height="10" width="10" x="13" y="13" />
                        <rect height="26" rx="4" width="26" x="69" y="5" />
                        <rect className="text-surface-container-lowest" fill="currentColor" height="18" width="18" x="73" y="9" />
                        <rect height="10" width="10" x="77" y="77" />
                        <rect height="26" rx="4" width="26" x="5" y="69" />
                        <rect className="text-surface-container-lowest" fill="currentColor" height="18" width="18" x="9" y="73" />
                        <rect height="10" width="10" x="13" y="77" />
                        <rect height="12" width="6" x="36" y="8" />
                        <rect height="6" width="8" x="46" y="8" />
                        <rect height="6" width="20" x="38" y="24" />
                        <rect height="6" width="12" x="5" y="38" />
                        <rect height="16" width="8" x="22" y="38" />
                        <rect className="text-primary-container" fill="currentColor" height="26" rx="2" width="26" x="36" y="36" />
                        <rect className="text-surface-container-lowest" fill="currentColor" height="14" width="14" x="42" y="42" />
                        <rect className="text-background" fill="currentColor" height="8" rx="4" width="8" x="45" y="45" />
                        <rect height="8" width="12" x="68" y="38" />
                        <rect height="6" width="10" x="84" y="38" />
                        <rect height="12" width="6" x="68" y="52" />
                        <rect height="6" width="14" x="80" y="50" />
                        <rect height="12" width="10" x="36" y="68" />
                        <rect height="6" width="14" x="50" y="72" />
                        <rect height="8" width="24" x="38" y="84" />
                        <rect height="26" rx="4" width="26" x="68" y="68" />
                        <rect className="text-surface-container-lowest" fill="currentColor" height="18" width="18" x="72" y="72" />
                        <rect height="10" width="10" x="76" y="76" />
                      </svg>
                    </div>
                    <div className="flex min-w-0 flex-col gap-space-xs text-center sm:text-start">
                      <span className="font-mono text-label-sm uppercase tracking-wider text-on-surface-variant">{lang2('Selected asset:', 'الأصل المحدد:')}</span>
                      <span className="font-mono text-headline-sm text-on-surface">{cryptoCurrency} • Heleket</span>
                      <span className="flex items-center justify-center gap-1 font-mono text-code-xs text-tertiary sm:justify-start">
                        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-tertiary" />
                        {lang2('Awaiting gateway confirmation', 'في انتظار تأكيد البوابة')}
                      </span>
                      <a href={cryptoPayment.paymentUrl || '#'} target="_blank" rel="noreferrer" className="font-sans text-body-sm leading-tight text-on-surface-variant hover:text-on-surface">
                        {t('addFunds.openInvoice')}
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-space-xs">
                    <div className="flex flex-col items-center justify-center gap-space-2xs rounded-xl bg-surface-container-high p-space-sm text-primary shadow-sm">
                      <span className="flex items-center gap-space-2xs">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-tertiary" />
                        <span className="font-sans text-label-lg font-semibold">{cryptoCurrency}</span>
                      </span>
                      <span className="font-mono text-code-xs text-on-surface-variant">{lang2('Heleket checkout gateway', 'بوابة الدفع Heleket')}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-space-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-sans text-label-sm text-on-surface-variant">{t('addFunds.reference')}</span>
                      <span className="font-mono text-code-xs text-tertiary">{cryptoPayment.paymentId}</span>
                    </div>
                    <div className="flex items-center gap-space-xs rounded-xl bg-surface-container-lowest p-space-xs shadow-inner">
                      <span className="min-w-0 flex-1 truncate px-space-sm font-mono text-code-sm tracking-tight text-primary">{cryptoPayment.invoiceUuid || cryptoPayment.orderId}</span>
                      <button type="button" onClick={() => copy(cryptoPayment.invoiceUuid || cryptoPayment.orderId)} className="flex shrink-0 items-center gap-1 rounded-lg bg-surface-container-high px-space-md py-space-xs font-label-sm text-label-sm text-on-surface shadow-sm transition-colors hover:bg-surface-bright">
                        <span className="material-symbols-outlined text-base">content_copy</span>
                        <span>{t('common.copy')}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-space-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-sans text-label-sm text-on-surface-variant">{t('addFunds.amountUsd')}</span>
                      <span className="font-mono text-code-xs text-error">{lang2('Exact Amount Only', 'المبلغ الدقيق فقط')}</span>
                    </div>
                    <div className="flex items-center gap-space-xs rounded-xl bg-surface-container-lowest p-space-xs shadow-inner">
                      <span className="min-w-0 flex-1 truncate px-space-sm font-mono text-headline-sm font-bold tracking-tight text-tertiary">
                        {Number(cryptoPayment.requestedAmount || 0).toFixed(2)} {cryptoCurrency}
                      </span>
                      <button type="button" onClick={() => copy(Number(cryptoPayment.requestedAmount || 0).toFixed(2))} className="flex shrink-0 items-center gap-1 rounded-lg bg-surface-container-high px-space-md py-space-xs font-label-sm text-label-sm text-on-surface shadow-sm transition-colors hover:bg-surface-bright">
                        <span className="material-symbols-outlined text-base text-primary">copy_all</span>
                        <span>{t('common.copy')}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-space-sm">
                        <span className="relative flex h-3 w-3">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-tertiary opacity-75" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-tertiary" />
                        </span>
                        <span className="font-mono text-code-xs text-on-surface">{lang2('Listening for gateway settlement…', 'في انتظار تسوية البوابة…')}</span>
                      </div>
                      {createdAt && <span className="font-mono text-code-xs text-on-surface-variant">{createdAt.toLocaleTimeString()}</span>}
                    </div>
                    <div className="grid grid-cols-3 gap-space-xs pt-space-xs">
                      <div className="flex items-center gap-space-xs rounded-lg bg-surface-container-high p-space-xs">
                        <span className="material-symbols-outlined text-xs text-tertiary">check_circle</span>
                        <div className="flex flex-col">
                          <span className="font-label-sm text-label-sm leading-none text-on-surface">1. {lang2('Invoice', 'الفاتورة')}</span>
                          <span className="font-mono text-code-xs text-tertiary">{lang2('Created', 'تم الإنشاء')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-space-xs rounded-lg bg-surface-container-high/60 p-space-xs">
                        <span className="material-symbols-outlined animate-spin text-xs text-on-surface-variant">refresh</span>
                        <div className="flex flex-col">
                          <span className="font-label-sm text-label-sm leading-none text-on-surface-variant">2. {lang2('Confirms', 'التأكيد')}</span>
                          <span className="font-mono text-code-xs text-on-surface-variant">{lang2('Gateway', 'البوابة')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-space-xs rounded-lg bg-surface-container-high/30 p-space-xs">
                        <span className="material-symbols-outlined text-xs text-outline">account_balance_wallet</span>
                        <div className="flex flex-col">
                          <span className="font-label-sm text-label-sm leading-none text-outline">3. {lang2('Credited', 'الإضافة')}</span>
                          <span className="font-mono text-code-xs text-outline">{lang2('Automatic', 'تلقائي')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {cryptoInvoiceInstruction && (
                    <div className="flex items-start gap-space-md rounded-xl bg-surface-container p-space-md shadow-sm">
                      <span className="material-symbols-outlined mt-0.5 text-lg text-secondary">info</span>
                      <div className="flex flex-col font-sans text-body-sm leading-relaxed text-on-surface-variant">
                        <span className="font-semibold text-on-surface">{lang2('Important note', 'تنبيه هام')}:</span>
                        <span>{cryptoInvoiceInstruction}</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-start gap-space-md rounded-xl bg-surface-container-low p-space-md shadow-sm">
                  <span className="material-symbols-outlined mt-0.5 text-lg text-secondary">info</span>
                  <div className="flex flex-col font-sans text-body-sm leading-relaxed text-on-surface-variant">
                    <span className="font-semibold text-on-surface">{t('addFunds.crypto')}</span>
                    <span>{cryptoIntro}</span>
                    <span className="mt-0.5 font-mono text-code-xs">{t('addFunds.cryptoWalletDesc')}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative flex flex-col gap-space-md overflow-hidden rounded-xl bg-surface-container p-space-xl shadow-bevel">
              <div className="pointer-events-none absolute -top-5 end-0 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <Wallet className="h-5 w-5 text-primary" />
                  <span className="font-display text-headline-sm text-on-surface">{t('addFunds.eWallet')}</span>
                </div>
                <span className="rounded bg-surface-container-high px-space-xs py-space-2xs font-mono text-code-xs text-tertiary">{selected.label}</span>
              </div>
              <div className="flex flex-col gap-space-xs">
                <span className="font-mono text-label-sm uppercase tracking-wider text-on-surface-variant">{t('addFunds.walletIntro')}</span>
                <span className="font-sans text-body-sm leading-relaxed text-on-surface-variant">{walletIntro}</span>
                <span className="font-mono text-code-xs text-tertiary">{walletVerification}</span>
              </div>
              {rate > 0 && (
                <div className="flex flex-col gap-space-xs rounded-xl bg-surface-container-low p-space-md shadow-sm">
                  <div className="flex items-center justify-between font-sans text-label-sm text-on-surface-variant">
                    <span>{lang2('Exchange rate', 'سعر الصرف')}</span>
                    <span className="font-mono text-code-xs text-tertiary">{`1 ${currencyCode} = ${rate} EGP`}</span>
                  </div>
                  <div className="flex items-center justify-between font-sans text-label-sm text-on-surface-variant">
                    <span>{t('addFunds.amountEgp')}</span>
                    <span className="font-mono text-code-xs">{`${walletMin} – ${walletMax} EGP`}</span>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-space-md rounded-xl bg-surface-container-low p-space-md shadow-sm">
                <span className="material-symbols-outlined mt-0.5 text-lg text-secondary">info</span>
                <div className="flex flex-col font-sans text-body-sm leading-relaxed text-on-surface-variant">
                  <span className="font-semibold text-on-surface">{t('addFunds.autoPayment')}</span>
                  <span>{methodInstruction || t('addFunds.walletMethods')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Deposit safety protocol — every line restates a real system rule */}
          <div className="flex flex-col gap-space-sm rounded-xl bg-surface-container p-space-lg shadow-bevel">
            <div className="flex items-center justify-between">
              <span className="font-display text-headline-sm text-on-surface">{lang2('Deposit Safety Protocol', 'قواعد وأمان الشحن')}</span>
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col gap-space-sm pt-space-xs">
              <div className="flex items-start gap-space-sm">
                <span className="material-symbols-outlined mt-0.5 shrink-0 text-lg text-tertiary">timer</span>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface">{lang2('Instant Automated Credit', 'شحن آلي فوري')}</span>
                  <span className="font-sans text-body-sm text-on-surface-variant">{t('addFunds.autoVerify')}</span>
                </div>
              </div>
              {rate > 0 && (
                <div className="flex items-start gap-space-sm">
                  <span className="material-symbols-outlined mt-0.5 shrink-0 text-lg text-primary">currency_exchange</span>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md text-on-surface">{lang2('Exchange rate applied', 'تطبيق سعر الصرف')}</span>
                    <span className="font-sans text-body-sm text-on-surface-variant">{lang2(`Wallet deposits are converted at 1 ${currencyCode} = ${rate} EGP by the gateway.`, `يتم تحويل إيداعات المحفظة بسعر 1 ${currencyCode} = ${rate} جنيه عبر البوابة.`)}</span>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-space-sm">
                <span className="material-symbols-outlined mt-0.5 shrink-0 text-lg text-outline">receipt_long</span>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface">{lang2('Invoice Verification', 'التحقق من الفاتورة')}</span>
                  <span className="font-sans text-body-sm text-on-surface-variant">{t('addFunds.invoiceInstruction')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
