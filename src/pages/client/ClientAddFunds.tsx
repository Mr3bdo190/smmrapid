import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { notify } from '../../lib/notify';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../lib/i18n';
import { apiFetch } from '../../lib/api';
import { AlertTriangle, ArrowRight, Bitcoin, CheckCircle2, Clock, Copy, ExternalLink, Info, Loader2, Receipt, RefreshCw, ShieldCheck, Wallet, X, Zap } from 'lucide-react';

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

  const configQuery = useQuery({
    queryKey: ['client-config'],
    queryFn: async () => {
      const r = await apiFetch('/api/client/config', user);
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw failure(b, 'Failed to load data', r.status);
      return b;
    },
  });
  const config = configQuery.data;
  const configFailed = configQuery.isError;
  const configErrorNotified = useRef(false);
  useEffect(() => {
    if (configFailed && !configErrorNotified.current) {
      configErrorNotified.current = true;
      notify.error(configQuery.error, 'Failed to load data');
    }
  }, [configFailed, configQuery.error]);

  /**
   * Every failure keeps the server's machine `code` and support `ref`. notify.error() turns a known
   * customer code (minimum amount, invalid wallet number …) into a precise instruction; for internal
   * causes (gateway outage, misconfiguration, DB) it shows a neutral message plus the support
   * reference, while the real cause stays in the admin system log.
   */
  const failure = (body: any, fallback: string, status?: number) => {
    const err: any = new Error(body?.error || body?.message || body?.errorKey || fallback);
    err.code = body?.code;
    err.ref = body?.ref;
    if (status) err.status = status;
    return err;
  };

  const handleApiError = (res: Response) => {
    if (!res.ok) {
      return res.json().catch(() => ({})).then((b: any) => { throw failure(b, 'Request failed', res.status); });
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
      // The server's `code` + `ref` travel with the error: notify.error() maps MIN_AMOUNT_ERROR,
      // INVALID_AMOUNT, INVALID_WALLET_NUMBER … to a specific instruction and hides gateway faults.
      if (!r.ok) throw failure(b, 'Payment failed', r.status);
      return b;
    },
    onSuccess: (b) => {
      setReceipt(null);
      setPendingPayment(b);
      notify.success(t('addFunds.paymentCreated'));
    },
    onError: (e: any) => notify.error(e, lang2(
      'We could not start the wallet deposit. Nothing was deducted from your balance — please try again.',
      'تعذر بدء عملية الشحن بالمحفظة. لم يتم خصم أي مبلغ من رصيدك — حاول مرة أخرى.',
    )),
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
      if (!r.ok && r.status !== 202) throw failure(b, 'Confirmation failed', r.status);
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
    onError: (e: any) => notify.error(e, lang2(
      'We could not confirm the payment yet. Nothing was deducted — check your wallet app, then press confirm again.',
      'تعذر تأكيد عملية الدفع حاليًا. لم يتم خصم أي مبلغ — راجع محفظتك على الموبايل ثم اضغط تأكيد تاني.',
    )),
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
      if (!r.ok) throw failure(b, 'Crypto payment failed', r.status);
      return b;
    },
    onSuccess: (b) => {
      setCryptoPayment({ ...b, requestedAmount: Number(amount) });
      notify.success(t('addFunds.invoiceCreated'));
    },
    onError: (e: any) => notify.error(e, lang2(
      'We could not create the crypto invoice. Nothing was deducted from your balance — please try again.',
      'تعذر إنشاء فاتورة الدفع الرقمية. لم يتم خصم أي مبلغ من رصيدك — حاول مرة أخرى.',
    )),
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

  // ── Deposit limits: read straight from /api/client/config + the server's own hard bounds ──────
  // (cryptoMax mirrors the check in POST /api/heleket/create: amount > 1000000 → INVALID_AMOUNT).
  const cryptoMax = 1000000;
  const amountValue = amount === '' ? NaN : Number(amount);
  const hasAmount = Number.isFinite(amountValue) && amountValue > 0;
  const walletRangeText = `${walletMin} – ${walletMax} EGP`;
  const cryptoRangeText = `${currencySymbol}${cryptoMin.toFixed(2)} – ${currencySymbol}${cryptoMax.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currencyCode}`;
  /** Guidance shown next to the CTA: never invent a limit while the config is still loading. */
  const allowedRangeText = !config
    ? lang2('Deposit limits are still loading…', 'جارٍ تحميل حدود الشحن…')
    : `${lang2('Allowed deposit range', 'نطاق الشحن المسموح')}: ${gateway === 'wallet' ? walletRangeText : cryptoRangeText}`;
  const rangeText = gateway === 'wallet' ? walletRangeText : cryptoRangeText;
  const digitsOk = /^01\d{9}$/.test(phoneNumber);
  const amountLabel = gateway === 'wallet' ? t('addFunds.amountEgp') : t('addFunds.amountUsd');

  /**
   * Why the deposit button is disabled, in plain words — rendered as text beside the button (a
   * tooltip alone would leave the customer guessing). Only real config values are quoted.
   */
  const ctaBlockedReason = (() => {
    if (gateway === 'wallet') {
      if (walletPay.isPending) return '';
      if (!config?.shahnawyEnabled) return t('addFunds.walletUnavailable');
      if (!phoneNumber) return lang2('Enter your 11-digit wallet number to continue.', 'اكتب رقم محفظتك (11 رقم) للمتابعة.');
      if (!digitsOk) return lang2('The wallet number must be 11 digits and start with 01 — for example 01012345678.', 'رقم المحفظة لازم يكون 11 رقم ويبدأ بـ 01 — مثال: 01012345678.');
      if (!hasAmount) return lang2('Enter the amount you want to deposit.', 'اكتب المبلغ اللي عايز تشحنه.');
      if (amountValue < walletMin) return lang2(`The minimum wallet deposit is ${walletMin} EGP — you entered ${amountValue}.`, `أقل مبلغ للشحن بالمحفظة ${walletMin} جنيه — أدخلت ${amountValue}.`);
      if (amountValue > walletMax) return lang2(`The maximum wallet deposit is ${walletMax} EGP — lower the amount to continue.`, `أكبر مبلغ للشحن بالمحفظة ${walletMax} جنيه — قلّل المبلغ للمتابعة.`);
      return '';
    }
    if (cryptoPay.isPending) return '';
    if (!config?.heleketEnabled) return t('addFunds.cryptoUnavailable');
    if (!hasAmount) return lang2('Enter the amount you want to deposit.', 'اكتب المبلغ اللي عايز تشحنه.');
    if (amountValue < cryptoMin) return t('errors.minAmount', { min: cryptoMin.toFixed(2) });
    if (amountValue > cryptoMax) return lang2(`The maximum crypto deposit is ${currencySymbol}${cryptoMax.toLocaleString('en-US')}.`, `أكبر مبلغ للشحن بالعملات الرقمية ${currencySymbol}${cryptoMax.toLocaleString('en-US')}.`);
    return '';
  })();

  const ctaLabel = gateway === 'wallet'
    ? (walletPay.isPending ? t('addFunds.creating') : `${t('addFunds.create')}${amountText}`)
    : (!config?.heleketEnabled
      ? t('addFunds.cryptoUnavailable')
      : cryptoPay.isPending ? t('addFunds.creatingInvoice') : `${t('addFunds.createInvoice')}${amountText}`);
  const ctaBusy = gateway === 'wallet' ? walletPay.isPending : cryptoPay.isPending;

  /** Which screen the customer is on: the form, or the state that replaced it. */
  const screen: 'form' | 'pending' | 'invoice' | 'receipt' = receipt
    ? 'receipt'
    : pendingPayment ? 'pending'
    : (gateway === 'crypto' && cryptoPayment) ? 'invoice'
    : 'form';

  /** The credited amount of the finished payment (server value, or converted from the EGP amount). */
  const receiptUsd = receipt?.payment?.usdAmount || (receipt?.payment?.amountEgp && rate ? (Number(receipt.payment.amountEgp) / rate).toFixed(2) : null);

  /** Summary panel numbers — always the real values of the current state. */
  const summaryAmount = screen === 'pending'
    ? `${pendingPayment?.amountEgp ?? '—'} EGP`
    : screen === 'invoice' ? `${currencySymbol}${Number(cryptoPayment?.requestedAmount || 0).toFixed(2)} ${currencyCode}`
      : screen === 'receipt' ? `${receipt?.payment?.amountEgp ?? '—'} EGP`
        : amount === '' ? '—'
          : gateway === 'wallet' ? `${Number(amount).toFixed(2)} EGP` : `${currencySymbol}${Number(amount).toFixed(2)} ${currencyCode}`;
  const summaryCredit = screen === 'pending'
    ? (pendingPayment?.usdAmount ? `${currencySymbol}${pendingPayment.usdAmount} ${currencyCode}` : '—')
    : screen === 'invoice' ? `${currencySymbol}${Number(cryptoPayment?.requestedAmount || 0).toFixed(2)} ${currencyCode}`
      : screen === 'receipt' ? (receiptUsd ? `${currencySymbol}${receiptUsd} ${currencyCode}` : '—')
        : creditedUsd === null ? '—' : `${currencySymbol}${creditedUsd.toFixed(2)} ${currencyCode}`;
  const summaryIsCrypto = screen === 'invoice' || (screen === 'form' && gateway === 'crypto');

  // ── Shared class tokens (identical vocabulary to ClientNewOrder) ───────────────────────────────
  const field = 'h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
  const label = 'flex items-center gap-2 text-sm font-semibold text-on-surface';
  const hint = 'text-xs text-on-surface-variant';
  const stepBadge = 'grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-container text-xs font-bold text-on-primary-container';
  const stepBlock = 'flex flex-col gap-3 border-t border-outline-variant pt-space-xl';
  const row = 'flex flex-wrap items-center justify-between gap-2 text-sm';
  const rowLabel = 'text-on-surface-variant';
  const rowValue = 'min-w-0 break-all text-end font-mono text-sm tabular-nums text-on-surface';
  const methodCard = 'flex flex-col gap-3 rounded-lg border p-4 text-start transition-colors disabled:cursor-not-allowed disabled:opacity-50';
  const methodActive = 'border-primary bg-primary-container/10';
  const methodIdle = 'border-outline-variant bg-surface-container-low hover:bg-surface-container-high';
  const cardBox = 'rounded-xl border border-outline-variant bg-surface-container p-5 md:p-6';
  const infoBox = 'flex items-start gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-3';
  const ghostBtn = 'inline-flex h-9 items-center gap-1.5 rounded-lg bg-surface-container-high px-3 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-bright';
  const ctaClass = 'inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary-container text-base font-bold text-on-primary-container transition-all hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div dir={dir} className="flex flex-col gap-gutter-lg">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col">
        <h1 className="font-display text-headline-lg text-on-surface">{t('addFunds.title')}</h1>
        <p className={`${hint} mt-1`}>{t('addFunds.chooseMethod')}</p>
      </div>

      {configFailed && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-error/40 bg-error-container p-3 text-sm text-on-error-container">
          <span className="flex items-start gap-2">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            {lang2('We could not load your deposit settings, so the limits below may be out of date or incomplete.', 'تعذر تحميل إعدادات الشحن، فقد تكون الحدود الظاهرة غير مكتملة أو قديمة.')}
          </span>
          <button type="button" onClick={() => configQuery.refetch()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-surface-container px-3 text-sm font-semibold text-on-surface">
            <RefreshCw aria-hidden="true" className={`h-4 w-4 ${configQuery.isFetching ? 'animate-spin' : ''}`} /> {t('common.refresh')}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-gutter-lg lg:grid-cols-3">
        {/* ── Deposit flow: the form, or the state it was replaced by ──────── */}
        <div className="flex flex-col gap-gutter-lg lg:col-span-2">
          {screen === 'form' && (
            <form
              className={`flex flex-col gap-space-xl ${cardBox}`}
              onSubmit={e => { e.preventDefault(); if (gateway === 'wallet') walletPay.mutate(); else cryptoPay.mutate(); }}
            >
              {/* 1 · Payment method */}
              <div className="flex flex-col gap-3">
                <h2 className={label}>
                  <span className={stepBadge}>1</span> {lang2('Choose a payment method', 'اختر وسيلة الدفع')}
                </h2>

                {/* Crypto invoice */}
                <button
                  type="button"
                  onClick={() => setGateway('crypto')}
                  disabled={!config?.heleketEnabled}
                  aria-pressed={gateway === 'crypto'}
                  className={`${methodCard} ${gateway === 'crypto' ? methodActive : methodIdle}`}
                >
                  <span className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-container-high text-primary"><Bitcoin aria-hidden="true" className="h-5 w-5" /></span>
                    <span className="flex min-w-0 flex-col">
                      <span className="text-sm font-semibold text-on-surface">{t('addFunds.crypto')}</span>
                      <span className="text-xs text-on-surface-variant">{cryptoCurrency} · {t('addFunds.cryptoDesc')}</span>
                    </span>
                    {gateway === 'crypto'
                      ? <CheckCircle2 aria-hidden="true" className="ms-auto h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      : <ArrowRight aria-hidden="true" className="ms-auto h-5 w-5 shrink-0 text-on-surface-variant rtl:rotate-180" />}
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    {lang2('Allowed range', 'النطاق المسموح')}: <b className="font-mono tabular-nums text-on-surface">{cryptoRangeText}</b>
                  </span>
                </button>

                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pt-1">
                  <span className="text-sm font-semibold text-on-surface">{t('addFunds.chooseWallet')}</span>
                  <span className={hint}>{t('addFunds.walletMethods')}</span>
                </div>

                {/* Electronic wallets — one card per real method the gateway supports */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {walletMethods.map(m => {
                    const active = gateway === 'wallet' && walletMethod === m.value;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => { setGateway('wallet'); setWalletMethod(m.value); }}
                        disabled={!config?.shahnawyEnabled}
                        aria-pressed={active}
                        className={`${methodCard} ${active ? methodActive : methodIdle}`}
                      >
                        <span className="flex items-center gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-container-high text-primary"><Wallet aria-hidden="true" className="h-5 w-5" /></span>
                          <span className="flex min-w-0 flex-col">
                            <span className="text-sm font-semibold text-on-surface">{m.label}</span>
                            <span className="text-xs text-on-surface-variant">{lang2('Electronic wallet', 'محفظة إلكترونية')}</span>
                          </span>
                          {active
                            ? <CheckCircle2 aria-hidden="true" className="ms-auto h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            : <ArrowRight aria-hidden="true" className="ms-auto h-5 w-5 shrink-0 text-on-surface-variant rtl:rotate-180" />}
                        </span>
                        <span className="text-xs text-on-surface-variant">
                          {lang2('Allowed range', 'النطاق المسموح')}: <b className="font-mono tabular-nums text-on-surface">{walletRangeText}</b>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {!config?.shahnawyEnabled && (
                  <div role="status" className="flex items-start gap-2 rounded-lg border border-error/40 bg-error-container p-3 text-sm text-on-error-container">
                    <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{t('addFunds.walletUnavailable')}</span>
                  </div>
                )}
                {!config?.heleketEnabled && (
                  <div role="status" className="flex items-start gap-2 rounded-lg border border-error/40 bg-error-container p-3 text-sm text-on-error-container">
                    <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{t('addFunds.cryptoUnavailable')}</span>
                  </div>
                )}
              </div>

              {/* 2 · Amount */}
              <div className={stepBlock}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <label htmlFor="deposit-amount" className={label}>
                    <span className={stepBadge}>2</span> {amountLabel}
                  </label>
                  <span className="font-mono text-xs tabular-nums text-on-surface-variant">
                    {lang2('Allowed range', 'النطاق المسموح')}: {rangeText}
                  </span>
                </div>

                <div className="relative">
                  <input
                    id="deposit-amount"
                    type="number"
                    inputMode="decimal"
                    min={gateway === 'wallet' ? walletMin : cryptoMin}
                    max={gateway === 'wallet' ? walletMax : cryptoMax}
                    step={gateway === 'wallet' ? undefined : '0.01'}
                    value={amount}
                    onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={gateway === 'wallet' ? `${walletMin} - ${walletMax}` : '10'}
                    aria-label={amountLabel}
                    className={`${field} pe-16 font-mono tabular-nums`}
                  />
                  <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-on-surface-variant">
                    {gateway === 'wallet' ? 'EGP' : currencyCode}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {presets.map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAmount(v)}
                      className={`h-9 rounded-lg px-3 font-mono text-sm tabular-nums transition-colors ${Number(amount) === v ? 'bg-primary-container font-semibold text-on-primary-container' : 'bg-surface-container-high text-on-surface hover:bg-surface-bright'}`}
                    >
                      {gateway === 'wallet' ? `${v.toLocaleString()} EGP` : `${currencySymbol}${v.toLocaleString()}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3 · Details */}
              <div className={stepBlock}>
                {gateway === 'wallet' ? (
                  <>
                    <label htmlFor="wallet-number" className={label}>
                      <span className={stepBadge}>3</span> {t('addFunds.paymentWallet')}
                    </label>
                    <p className={hint}>{t('addFunds.walletIntro')}</p>
                    <input
                      id="wallet-number"
                      type="tel"
                      inputMode="numeric"
                      maxLength={11}
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      placeholder="01XXXXXXXXX"
                      aria-label={t('addFunds.paymentWallet')}
                      aria-invalid={phoneNumber.length > 0 && !digitsOk}
                      className={`${field} font-mono tabular-nums tracking-wider`}
                    />
                    {phoneNumber.length > 0 && !digitsOk && (
                      <p className="flex items-start gap-1.5 text-xs font-medium text-error">
                        <AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {lang2('Wallet numbers are 11 digits and start with 01, for example 01012345678.', 'رقم المحفظة 11 رقم ويبدأ بـ 01، مثال: 01012345678.')}
                      </p>
                    )}
                    <div className={infoBox}>
                      <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div className="flex flex-col gap-1 text-sm">
                        <span className="font-semibold text-on-surface">{t('addFunds.autoPayment')}</span>
                        {walletIntro && <span className="text-on-surface-variant">{walletIntro}</span>}
                        <span className="text-on-surface-variant">{methodInstruction || t('addFunds.walletMethods')}</span>
                        <span className={hint}>{t('addFunds.autoVerify')}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className={label}>
                      <span className={stepBadge}>3</span> {lang2('What happens next', 'الخطوات التالية')}
                    </h2>
                    <p className={hint}>{t('addFunds.cryptoWalletDesc')}</p>
                    <div className={infoBox}>
                      <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div className="flex flex-col gap-1 text-sm">
                        <span className="font-semibold text-on-surface">{t('addFunds.crypto')}</span>
                        {cryptoIntro && <span className="text-on-surface-variant">{cryptoIntro}</span>}
                        <span className="text-on-surface-variant">
                          {lang2(
                            'Create the invoice, pay the exact amount on the payment page, and your balance is credited automatically once the payment is confirmed.',
                            'أنشئ الفاتورة، وادفع المبلغ بالظبط في صفحة الدفع، وسيتم إضافة الرصيد تلقائياً بعد تأكيد الدفعة.',
                          )}
                        </span>
                        <span className={hint}>{t('addFunds.autoVerify')}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </form>
          )}

          {/* ── Wallet deposit created — awaiting the customer's confirmation ── */}
          {screen === 'pending' && (
            <section className={`flex flex-col gap-space-lg ${cardBox}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Receipt aria-hidden="true" className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-headline-sm text-on-surface">{t('addFunds.invoiceReady')}</h2>
                </div>
                <span className={`status-badge s-${statusKey(pendingPayment?.status)}`}>{String(pendingPayment?.status || 'pending')}</span>
              </div>

              <div className="flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface-container-low p-4 text-sm">
                <div className={row}>
                  <span className={rowLabel}>{lang2('Transaction ID', 'معرّف العملية')}</span>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={rowValue}>{pendingPayment?.transactionId || pendingPayment?.paymentId || '—'}</span>
                    <button type="button" onClick={() => copy(pendingPayment?.transactionId || pendingPayment?.paymentId)} title={t('common.copy')} aria-label={t('common.copy')} className={ghostBtn}>
                      <Copy aria-hidden="true" className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
                <div className={row}>
                  <span className={rowLabel}>{t('addFunds.reference')}</span>
                  <span className={rowValue}>{pendingPayment?.reference || '—'}</span>
                </div>
                <div className={row}>
                  <span className={rowLabel}>{t('addFunds.paymentWallet')}</span>
                  <span className="min-w-0 break-all text-end font-medium text-on-surface">{selected.label} · {phoneNumber}</span>
                </div>
                <div className={row}>
                  <span className={rowLabel}>{t('addFunds.amountEgp')}</span>
                  <span className={rowValue}>{pendingPayment?.amountEgp ?? '—'} EGP</span>
                </div>
                {pendingPayment?.usdAmount && (
                  <div className={row}>
                    <span className={rowLabel}>{t('addFunds.approxCredit')}</span>
                    <span className="min-w-0 text-end font-mono text-sm font-semibold tabular-nums text-tertiary">{currencySymbol}{pendingPayment.usdAmount} {currencyCode}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="flex items-start gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
                  <Zap aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                  {walletVerification}
                </p>
                <p className={hint}>
                  {lang2('Approve the payment request in your wallet app, then confirm it here.', 'وافق على طلب الدفع من تطبيق المحفظة، ثم أكّده من هنا.')}
                </p>
                <button type="button" onClick={() => setPendingPayment(null)} className={`${ghostBtn} w-fit`}>
                  <X aria-hidden="true" className="h-3.5 w-3.5" /> {lang2('Start over', 'ابدأ من جديد')}
                </button>
              </div>
            </section>
          )}

          {/* ── Crypto invoice ───────────────────────────────────────────────── */}
          {screen === 'invoice' && (
            <section className={`flex flex-col gap-space-lg ${cardBox}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Bitcoin aria-hidden="true" className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-headline-sm text-on-surface">{t('addFunds.invoiceReady')}</h2>
                </div>
                {createdAt && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-high px-2.5 py-1 text-xs text-on-surface-variant">
                    <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                    {lang2('Expires', 'تنتهي')}: <b className="font-mono text-on-surface">{createdAt.toLocaleString()}</b>
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 rounded-lg border border-outline-variant bg-surface-container-low p-4">
                <span className={hint}>{amountLabel}</span>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-mono text-2xl font-bold tabular-nums text-tertiary">
                    {currencySymbol}{Number(cryptoPayment?.requestedAmount || 0).toFixed(2)} <span className="text-base">{cryptoCurrency}</span>
                  </span>
                  <button type="button" onClick={() => copy(Number(cryptoPayment?.requestedAmount || 0).toFixed(2))} className={ghostBtn}>
                    <Copy aria-hidden="true" className="h-3.5 w-3.5" /> {t('common.copy')}
                  </button>
                </div>
                <span className={hint}>{lang2('Pay the exact amount shown above.', 'ادفع المبلغ الظاهر بالظبط.')}</span>
              </div>

              <div className="flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface-container-low p-4 text-sm">
                <div className={row}>
                  <span className={rowLabel}>{lang2('Invoice ID', 'معرّف الفاتورة')}</span>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={rowValue}>{cryptoPayment?.invoiceUuid || cryptoPayment?.orderId || cryptoPayment?.paymentId || '—'}</span>
                    <button type="button" onClick={() => copy(cryptoPayment?.invoiceUuid || cryptoPayment?.orderId || cryptoPayment?.paymentId)} title={t('common.copy')} aria-label={t('common.copy')} className={ghostBtn}>
                      <Copy aria-hidden="true" className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
                <div className={row}>
                  <span className={rowLabel}>{lang2('Order reference', 'مرجع الطلب')}</span>
                  <span className={rowValue}>{cryptoPayment?.orderId || '—'}</span>
                </div>
                <div className={row}>
                  <span className={rowLabel}>{t('addFunds.reference')}</span>
                  <span className={rowValue}>{cryptoPayment?.paymentId || '—'}</span>
                </div>
                <div className={row}>
                  <span className={rowLabel}>{lang2('Payment method', 'وسيلة الدفع')}</span>
                  <span className="text-end font-medium text-on-surface">{cryptoCurrency}</span>
                </div>
              </div>

              <div className={infoBox}>
                <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="flex flex-col gap-1 text-sm">
                  <span className="font-semibold text-on-surface">{lang2('Important note', 'تنبيه هام')}</span>
                  <span className="text-on-surface-variant">{cryptoInvoiceInstruction || t('addFunds.invoiceInstruction')}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {cryptoPayment?.paymentUrl ? (
                  <a href={cryptoPayment.paymentUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-surface-container-high px-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-bright">
                    {t('addFunds.openInvoice')} <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <p className="flex items-center gap-1.5 text-sm font-medium text-error">
                    <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" /> {t('addFunds.noInvoice')}
                  </p>
                )}
                <button type="button" onClick={() => setCryptoPayment(null)} className={ghostBtn}>
                  <X aria-hidden="true" className="h-3.5 w-3.5" /> {lang2('Start over', 'ابدأ من جديد')}
                </button>
              </div>
            </section>
          )}

          {/* ── Credited — receipt of the confirmed payment ───────────────────── */}
          {screen === 'receipt' && (
            <section className="flex flex-col gap-space-lg rounded-xl border border-emerald-500/30 bg-surface-container p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 aria-hidden="true" className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-display text-headline-sm text-on-surface">{t('addFunds.paymentConfirmed')}</h2>
                    <p className={`${hint} mt-0.5`}>{t('addFunds.autoVerify')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="status-badge s-completed">{receipt?.result?.status || 'completed'}</span>
                  <button type="button" onClick={() => setReceipt(null)} title={t('common.close')} aria-label={t('common.close')} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface">
                    <X aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1 rounded-lg border border-outline-variant bg-surface-container-low p-4">
                <span className={hint}>{lang2('Credited amount', 'المبلغ المضاف')}</span>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-bold tabular-nums text-tertiary">{receiptUsd ?? '—'}</span>
                  <span className="text-sm font-semibold text-on-surface-variant">{currencyCode}</span>
                </div>
                {receipt?.payment?.amountEgp && (
                  <span className="font-mono text-sm tabular-nums text-on-surface-variant">{receipt.payment.amountEgp} EGP</span>
                )}
              </div>

              <div className="flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface-container-low p-4 text-sm">
                <div className={row}>
                  <span className={rowLabel}>{lang2('Transaction ID', 'معرّف العملية')}</span>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={rowValue}>
                      {receipt?.result?.data?.transaction_id || receipt?.result?.data?.id || receipt?.payment?.transactionId || receipt?.payment?.paymentId || '—'}
                    </span>
                    <button
                      type="button"
                      onClick={() => copy(receipt?.result?.data?.transaction_id || receipt?.result?.data?.id || receipt?.payment?.transactionId || receipt?.payment?.paymentId)}
                      title={t('common.copy')}
                      aria-label={t('common.copy')}
                      className={ghostBtn}
                    >
                      <Copy aria-hidden="true" className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
                <div className={row}>
                  <span className={rowLabel}>{lang2('Payment method', 'وسيلة الدفع')}</span>
                  <span className="min-w-0 break-all text-end font-medium text-on-surface">{receipt?.method}{receipt?.number ? ` · ${receipt.number}` : ''}</span>
                </div>
                {receipt?.payment?.reference && (
                  <div className={row}>
                    <span className={rowLabel}>{t('addFunds.reference')}</span>
                    <span className={rowValue}>{receipt.payment.reference}</span>
                  </div>
                )}
                {receipt?.payment?.transactionId && receipt?.payment?.paymentId && (
                  <div className={row}>
                    <span className={rowLabel}>{lang2('Payment record', 'سجل الدفع')}</span>
                    <span className="min-w-0 break-all text-end font-mono text-xs text-on-surface-variant">{receipt.payment.paymentId}</span>
                  </div>
                )}
                {rate > 0 && (
                  <div className={row}>
                    <span className={rowLabel}>{lang2('Exchange rate', 'سعر الصرف')}</span>
                    <span className="font-mono text-sm tabular-nums text-on-surface-variant">{`1 ${currencyCode} = ${rate} EGP`}</span>
                  </div>
                )}
              </div>

              <button type="button" onClick={() => setReceipt(null)} className={`${ghostBtn} w-fit`}>
                <X aria-hidden="true" className="h-3.5 w-3.5" /> {t('common.close')}
              </button>
            </section>
          )}
        </div>

        {/* ── Summary ──────────────────────────────────────────────────────── */}
        <aside className="lg:col-span-1">
          <div className="flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container p-5 lg:sticky lg:top-20">
            <h2 className="font-display text-headline-sm text-on-surface">{lang2('Deposit summary', 'ملخص الشحن')}</h2>

            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-on-surface-variant">{t('common.balance')}</span>
                <span className="font-mono tabular-nums text-on-surface">{currencySymbol}{balance.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-on-surface-variant">{lang2('Method', 'الوسيلة')}</span>
                <span className="min-w-0 truncate text-end font-medium text-on-surface">
                  {summaryIsCrypto ? t('addFunds.crypto') : `${t('addFunds.eWallet')} · ${selected.label}`}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-on-surface-variant">{amountLabel}</span>
                <span className="font-mono tabular-nums text-on-surface">{summaryAmount}</span>
              </div>
              {gateway === 'wallet' && rate > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-on-surface-variant">{lang2('Exchange rate', 'سعر الصرف')}</span>
                  <span className="font-mono tabular-nums text-on-surface-variant">{`1 ${currencyCode} = ${rate} EGP`}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 border-t border-outline-variant pt-3">
                <span className="font-semibold text-on-surface">
                  {screen === 'receipt' ? lang2('Credited amount', 'المبلغ المضاف') : t('addFunds.approxCredit')}
                </span>
                <span className="font-mono text-lg font-bold tabular-nums text-tertiary">{summaryCredit}</span>
              </div>
            </div>

            {/* Primary action — the single button the customer needs on this screen */}
            {screen === 'form' && (
              <>
                <button
                  type="button"
                  onClick={() => (gateway === 'wallet' ? walletPay.mutate() : cryptoPay.mutate())}
                  disabled={gateway === 'wallet'
                    ? (walletPay.isPending || !amount || !digitsOk)
                    : (cryptoPay.isPending || !amount || !config?.heleketEnabled)}
                  aria-describedby="deposit-cta-hint"
                  title={ctaBlockedReason || allowedRangeText}
                  className={ctaClass}
                >
                  {ctaBusy ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> : <ArrowRight aria-hidden="true" className="h-5 w-5 rtl:rotate-180" />}
                  <span>{ctaLabel}</span>
                </button>

                {/* Why the button is not ready, or the real allowed range — always as text. */}
                <div id="deposit-cta-hint" role="status" aria-live="polite" className="flex flex-col gap-1">
                  <span className={`text-sm ${ctaBlockedReason ? 'font-medium text-error' : 'text-on-surface-variant'}`}>
                    {ctaBlockedReason || allowedRangeText}
                  </span>
                  {gateway === 'wallet' && rate > 0 && (
                    <span className={hint}>
                      {lang2(
                        `Wallet deposits are converted at 1 ${currencyCode} = ${rate} EGP.`,
                        `يتم تحويل إيداعات المحفظة بسعر 1 ${currencyCode} = ${rate} جنيه.`,
                      )}
                    </span>
                  )}
                </div>
              </>
            )}

            {screen === 'pending' && (
              <>
                <button
                  type="button"
                  onClick={() => confirmWallet.mutate()}
                  disabled={confirmWallet.isPending}
                  className={ctaClass}
                >
                  {confirmWallet.isPending ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> : <Zap aria-hidden="true" className="h-5 w-5" />}
                  <span>{confirmWallet.isPending ? t('addFunds.verifying') : t('addFunds.confirmPayment')}</span>
                </button>
                <p className={`${hint} flex items-start gap-1.5`}>
                  <ShieldCheck aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  {t('addFunds.paymentPending')}
                </p>
              </>
            )}

            {screen === 'invoice' && (
              <>
                {cryptoPayment?.paymentUrl ? (
                  <a href={cryptoPayment.paymentUrl} target="_blank" rel="noreferrer" className={ctaClass}>
                    <span>{t('addFunds.openInvoice')}</span>
                    <ExternalLink aria-hidden="true" className="h-5 w-5" />
                  </a>
                ) : (
                  <button type="button" disabled className={ctaClass}>
                    <AlertTriangle aria-hidden="true" className="h-5 w-5" />
                    <span>{t('addFunds.noInvoice')}</span>
                  </button>
                )}
                <p className="flex items-start gap-1.5 text-xs text-on-surface-variant">
                  <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  {t('addFunds.invoiceInstruction')}
                </p>
              </>
            )}

            {screen === 'receipt' && (
              <Link to="/dashboard/new-order" className={ctaClass}>
                <Zap aria-hidden="true" className="h-5 w-5" />
                <span>{t('nav.newOrder')}</span>
              </Link>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
