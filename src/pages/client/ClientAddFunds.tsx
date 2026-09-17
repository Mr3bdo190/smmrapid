import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, Bitcoin, CheckCircle2, Clock, Copy, Info, RefreshCw, Smartphone, Wallet,
} from 'lucide-react';
import { apiFetch, apiJson } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../lib/i18n';
import { notify } from '../../lib/notify';

const WALLET_ORDER = ['vf_cash', 'or_cash', 'et_cash'] as const;
type WalletKind = typeof WALLET_ORDER[number];

const WALLET_NAMES: Record<WalletKind, { en: string; ar: string }> = {
  vf_cash: { en: 'Vodafone Cash', ar: 'فودافون كاش' },
  or_cash: { en: 'Orange Cash', ar: 'أورنج كاش' },
  et_cash: { en: 'e& Money / Etisalat Cash', ar: 'اتصالات كاش / e& Money' },
};

/** How long a created payment request stays "open" before the customer is asked to start over. */
const PAY_WINDOW_SECONDS = 60;
/** Balance/payment status is re-checked automatically at this interval (the gateway webhook is the source of truth). */
const POLL_MS = 10_000;

type ActivePayment = {
  kind: 'wallet' | 'crypto';
  paymentId: string;
  reference?: string | null;
  paymentUrl?: string | null;
  amountLabel: string;      // what the customer pays (EGP for wallets, USD for crypto)
  creditLabel: string;      // what lands in the wallet, in USD
  walletKind?: WalletKind;
  walletNumber?: string;
  startedAt: number;
  expiresAt: number | null; // null = adopted from a previous visit, so no countdown is shown
};

export default function ClientAddFunds() {
  const { user, dbUser } = useAuth();
  const { t, dir } = useTranslation();
  const ar = dir === 'rtl';
  const qc = useQueryClient();

  const [method, setMethod] = useState<'wallet' | 'crypto' | null>(null);
  const [walletKind, setWalletKind] = useState<WalletKind>('vf_cash');
  const [amount, setAmount] = useState('');
  const [number, setNumber] = useState('');
  const [active, setActive] = useState<ActivePayment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const creditedRef = useRef<string | null>(null);

  const { data: config } = useQuery({
    queryKey: ['client-config'],
    queryFn: async () => {
      const r = await apiFetch('/api/client/config');
      if (!r.ok) throw new Error('Failed to load configuration');
      return r.json();
    },
    staleTime: 60_000,
  });

  const walletEnabled = !!config?.shahnawyEnabled;
  const cryptoEnabled = !!config?.heleketEnabled;
  const minEgp = Number(config?.shahnawyMinAmount || 5);
  const maxEgp = Number(config?.shahnawyMaxAmount || 10000);
  const rate = Number(config?.usdExchangeRate || 50);
  const minDeposit = Number(config?.minDepositAmount || 1);
  const currency = config?.currencySymbol || '$';
  // instructions follow whichever wallet is in play: the live payment when one is being tracked,
  // otherwise the wallet picked in the form.
  const instrKind: WalletKind = (active?.walletKind || walletKind) as WalletKind;
  const walletInstructions = config?.addFunds?.methods?.[instrKind];
  const walletIntro = config?.addFunds?.walletIntro;
  const walletVerification = config?.addFunds?.walletVerification;

  // Payments are the source of truth: the gateway webhook writes the final status here.
  const paymentsQ = useQuery({
    queryKey: ['client-payments'],
    queryFn: () => apiJson<any[]>('/api/client/payments', user),
    enabled: !!user,
    refetchInterval: active ? POLL_MS : false,
  });
  const payments: any[] = (paymentsQ.data as any[]) || [];
  const record = active ? payments.find(p => p.id === active.paymentId) : undefined;
  const status: 'Pending' | 'Approved' | 'Rejected' | undefined = record?.status;
  const paid = status === 'Approved';
  const failed = status === 'Rejected';

  /* ---------------------------------- clock ---------------------------------- */
  useEffect(() => {
    if (!active || active.expiresAt === null || paid) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active, paid]);

  const secondsLeft = active?.expiresAt ? Math.max(0, Math.ceil((active.expiresAt - now) / 1000)) : null;
  const windowOver = secondsLeft !== null && secondsLeft <= 0 && !paid;

  /* --------------- returning from the gateway: adopt the open payment --------------- */
  useEffect(() => {
    if (!user || active) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.get('payment')) return;
    const open = payments.find(p => p.status === 'Pending');
    if (!open) return;
    adopt(open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, payments, active]);

  /* --------------------- when the balance lands, refresh the app --------------------- */
  useEffect(() => {
    if (!active || !paid || creditedRef.current === active.paymentId) return;
    creditedRef.current = active.paymentId;
    qc.invalidateQueries({ queryKey: ['client-me'] });
    qc.invalidateQueries({ queryKey: ['client-dashboard'] });
    qc.invalidateQueries({ queryKey: ['client-transactions'] });
    notify.success(`${t('addFunds.paidTitle')} ${active.creditLabel}`);
  }, [active, paid, qc, t]);

  function adopt(p: any) {
    const td = p.transactionDetails || {};
    setActive({
      kind: p.method === 'Heleket' ? 'crypto' : 'wallet',
      paymentId: p.id,
      reference: td.reference || p.transactionId || null,
      paymentUrl: null,
      amountLabel: td.egpAmount ? `${Number(td.egpAmount).toLocaleString()} ${ar ? 'ج.م' : 'EGP'}` : `${currency}${Number(p.amount).toFixed(2)}`,
      creditLabel: `${currency}${Number(p.amount).toFixed(2)}`,
      walletKind: td.walletMethod,
      walletNumber: td.senderWallet,
      startedAt: Date.parse(p.createdAt) || Date.now(),
      expiresAt: null,
    });
    setMethod(p.method === 'Heleket' ? 'crypto' : 'wallet');
  }

  /* --------------------------------- creation --------------------------------- */
  const usdAmount = useMemo(() => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return method === 'crypto' ? n : n / (rate || 1);
  }, [amount, method, rate]);

  const numberOk = /^01\d{9}$/.test(number);
  const amountOk = useMemo(() => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return false;
    if (method === 'crypto') return n >= minDeposit;
    return n >= minEgp && n <= maxEgp && usdAmount >= minDeposit;
  }, [amount, method, minEgp, maxEgp, minDeposit, usdAmount]);

  const disabledReason = !amount
    ? t('addFunds.amountEgp')
    : !amountOk
      ? (method === 'crypto'
        ? `${t('common.balance')}: ${currency}${minDeposit}`
        : `${ar ? 'المبلغ المتاح' : 'Allowed range'}: ${minEgp} – ${maxEgp}`)
      : method === 'wallet' && !numberOk
        ? t('addFunds.walletNumberHint')
        : '';

  async function createWalletPayment() {
    setSubmitting(true);
    try {
      const res = await apiJson<any>('/api/shahnawy/create', user, {
        method: 'POST',
        body: JSON.stringify({ amount: Number(amount), number, method: walletKind }),
      });
      const startedAt = Date.now();
      setActive({
        kind: 'wallet',
        paymentId: res.paymentId,
        reference: res.reference || res.transactionId || null,
        amountLabel: `${Number(res.amountEgp || amount).toLocaleString()} ${ar ? 'ج.م' : 'EGP'}`,
        creditLabel: `${currency}${Number(res.usdAmount || usdAmount).toFixed(2)}`,
        walletKind,
        walletNumber: number,
        startedAt,
        expiresAt: startedAt + PAY_WINDOW_SECONDS * 1000,
      });
      setNow(Date.now());
      await paymentsQ.refetch();
      notify.success(t('addFunds.paymentCreated'));
      scrollUp();
    } catch (err: any) {
      notify.error(err, t('addFunds.paymentCreated'));
    } finally {
      setSubmitting(false);
    }
  }

  async function createCryptoInvoice() {
    setSubmitting(true);
    try {
      const res = await apiJson<any>('/api/heleket/create', user, {
        method: 'POST',
        body: JSON.stringify({ amount: Number(amount) }),
      });
      const startedAt = Date.now();
      setActive({
        kind: 'crypto',
        paymentId: res.paymentId,
        reference: res.orderId || res.invoiceUuid || null,
        paymentUrl: res.paymentUrl || null,
        amountLabel: `${currency}${Number(amount).toFixed(2)}`,
        creditLabel: `${currency}${Number(amount).toFixed(2)}`,
        startedAt,
        expiresAt: startedAt + PAY_WINDOW_SECONDS * 1000,
      });
      setNow(Date.now());
      await paymentsQ.refetch();
      notify.success(t('addFunds.invoiceCreated'));
      scrollUp();
    } catch (err: any) {
      notify.error(err, t('addFunds.creatingInvoice'));
    } finally {
      setSubmitting(false);
    }
  }

  /** Ask the server to verify with the gateway right now (the webhook stays the source of truth). */
  async function checkNow() {
    if (!active) return;
    setChecking(true);
    try {
      if (active.kind === 'wallet') {
        const res = await apiJson<any>('/api/shahnawy/confirm', user, {
          method: 'POST',
          body: JSON.stringify({ paymentId: active.paymentId }),
        });
        if (res?.status === 'completed') {
          notify.success(t('addFunds.paymentConfirmed'));
        } else {
          notify.info(t('addFunds.paymentStillPending'));
        }
      }
      await paymentsQ.refetch();
    } catch (err: any) {
      notify.error(err, t('addFunds.checkNow'));
    } finally {
      setChecking(false);
    }
  }

  function scrollUp() {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startOver() {
    setActive(null);
    setAmount('');
    setNumber('');
    setSubmitting(false);
    setChecking(false);
    creditedRef.current = null;
    paymentsQ.refetch();
  }

  const copy = (value: string, label?: string) => {
    navigator.clipboard?.writeText(value);
    notify.success(label || t('common.copied'));
  };

  const lastChecked = paymentsQ.dataUpdatedAt ? new Date(paymentsQ.dataUpdatedAt).toLocaleTimeString() : '—';
  const step = (n: number, label: string) => (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-black text-white">{n}</span>
  );

  /* ------------------------------- status banner ------------------------------- */
  const statusChip = () => {
    if (paid) return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-black text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={14} />{t('addFunds.statusPaid')}</span>;
    if (failed) return <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/12 px-3 py-1 text-xs font-black text-red-600 dark:text-red-400"><AlertTriangle size={14} />{t('addFunds.statusFailed')}</span>;
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/12 px-3 py-1 text-xs font-black text-amber-600 dark:text-amber-400"><Clock size={14} />{t('addFunds.statusPending')}</span>;
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5" dir={dir}>
      {/* ------------------------------- header ------------------------------- */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-on-surface">{t('addFunds.title')}</h1>
          <p className="mt-1 text-sm text-on-surface-variant">{t('addFunds.chooseMethod')}</p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container px-4 py-2 text-sm">
          <span className="text-on-surface-variant">{t('common.balance')}: </span>
          <b className="tabular-nums text-on-surface">{currency}{Number(dbUser?.balance || 0).toFixed(4)}</b>
        </div>
      </div>

      {/* --------------------- active payment: countdown + status --------------------- */}
      {active && (
        <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant px-5 py-4">
            <div className="flex items-center gap-2">
              {step(3, '')}
              <h2 className="text-base font-black text-on-surface">
                {active.kind === 'wallet' ? t('addFunds.paymentWallet') : t('addFunds.crypto')}
              </h2>
            </div>
            {statusChip()}
          </div>

          <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-4">
              {paid ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/8 p-4">
                  <p className="flex items-center gap-2 text-sm font-black text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 size={17} />{t('addFunds.paidTitle')}
                  </p>
                  <p className="mt-1.5 text-sm text-on-surface-variant">{t('addFunds.paidBody')}</p>
                  <p className="mt-2 text-lg font-black tabular-nums text-emerald-700 dark:text-emerald-300">+ {active.creditLabel}</p>
                </div>
              ) : (
                <div className={`rounded-xl border p-4 ${windowOver ? 'border-amber-500/30 bg-amber-500/8' : 'border-outline-variant bg-surface-container-high'}`}>
                  <p className={`flex items-center gap-2 text-sm font-black ${windowOver ? 'text-amber-700 dark:text-amber-300' : 'text-on-surface'}`}>
                    {windowOver ? <AlertTriangle size={17} /> : <Info size={17} />}
                    {windowOver ? t('addFunds.notPaidTitle') : t('addFunds.paymentStillPending')}
                  </p>
                  <p className="mt-1.5 text-sm text-on-surface-variant">
                    {windowOver ? `${t('addFunds.windowExpired')} ${t('addFunds.notPaidBody')}` : t('addFunds.notPaidBody')}
                  </p>
                </div>
              )}

              {/* what the customer must do, in the wallet's own words from the admin settings */}
              {active.kind === 'wallet' && !paid && (
                <div className="rounded-xl border border-outline-variant bg-surface-container-high p-4">
                  <p className="flex items-center gap-2 text-sm font-black text-on-surface">
                    <Smartphone size={16} />
                    {t('addFunds.instructions')} — {ar ? WALLET_NAMES[instrKind].ar : WALLET_NAMES[instrKind].en}
                  </p>
                  {walletInstructions && (
                    <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">{ar ? walletInstructions.ar : walletInstructions.en}</p>
                  )}
                  {walletIntro && <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">{ar ? walletIntro.ar : walletIntro.en}</p>}
                  {walletVerification && (
                    <p className="mt-1.5 text-xs text-on-surface-variant/90">{ar ? walletVerification.ar : walletVerification.en}</p>
                  )}
                </div>
              )}

              {active.kind === 'crypto' && !paid && (
                <div className="rounded-xl border border-outline-variant bg-surface-container-high p-4">
                  <p className="flex items-center gap-2 text-sm font-black text-on-surface"><Bitcoin size={16} />{t('addFunds.invoiceInstruction')}</p>
                  {config?.addFunds?.cryptoIntro && (
                    <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">{ar ? config.addFunds.cryptoIntro.ar : config.addFunds.cryptoIntro.en}</p>
                  )}
                  {active.paymentUrl ? (
                    <a href={active.paymentUrl} target="_blank" rel="noreferrer"
                      className="btn-primary mt-3 inline-flex items-center gap-2">
                      {t('addFunds.openInvoice')}
                    </a>
                  ) : (
                    <p className="mt-2 text-sm text-on-surface-variant">{t('addFunds.noInvoice')}</p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                <span>{t('addFunds.autoCheck')}</span>
                <span>· {t('addFunds.lastChecked')}: <b className="tabular-nums">{lastChecked}</b></span>
              </div>
            </div>

            {/* ------------------------------ aside ------------------------------ */}
            <aside className="space-y-3 rounded-xl border border-outline-variant bg-surface-container-high p-4">
              <p className="text-xs font-black uppercase tracking-wider text-on-surface-variant">{t('addFunds.paymentSummary')}</p>

              {active.expiresAt !== null && !paid && (
                <div className="rounded-xl border border-outline-variant bg-surface-container p-3 text-center">
                  <p className="text-xs font-bold text-on-surface-variant">{t('addFunds.timeLeft')}</p>
                  <p className={`mt-1 text-3xl font-black tabular-nums ${windowOver ? 'text-amber-600 dark:text-amber-400' : 'text-violet-600 dark:text-violet-400'}`}>
                    {String(Math.floor((secondsLeft || 0) / 60)).padStart(2, '0')}:{String((secondsLeft || 0) % 60).padStart(2, '0')}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                    <div className="h-full rounded-full bg-violet-600 transition-[width] duration-1000"
                      style={{ width: `${Math.max(0, Math.min(100, ((secondsLeft || 0) / PAY_WINDOW_SECONDS) * 100))}%` }} />
                  </div>
                  <p className="mt-2 text-[11px] text-on-surface-variant">{t('addFunds.payWindow')}: {PAY_WINDOW_SECONDS} {ar ? 'ثانية' : 's'}</p>
                </div>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-on-surface-variant">{active.kind === 'wallet' ? t('addFunds.amountEgp') : t('addFunds.amountUsd')}</span>
                  <b className="tabular-nums text-on-surface">{active.amountLabel}</b>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-on-surface-variant">{t('addFunds.approxCredit')}</span>
                  <b className="tabular-nums text-violet-600 dark:text-violet-400">{active.creditLabel}</b>
                </div>
                {active.walletNumber && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-on-surface-variant">{t('addFunds.payFrom')}</span>
                    <button onClick={() => copy(active.walletNumber!)} className="inline-flex items-center gap-1.5 font-mono text-xs text-on-surface hover:text-violet-600">
                      {active.walletNumber}<Copy size={12} />
                    </button>
                  </div>
                )}
                {active.reference && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-on-surface-variant">{t('addFunds.reference')}</span>
                    <button onClick={() => copy(active.reference!)} className="inline-flex max-w-[150px] items-center gap-1.5 truncate font-mono text-xs text-on-surface hover:text-violet-600">
                      <span className="truncate">{active.reference}</span><Copy size={12} />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2 border-t border-outline-variant pt-3">
                {!paid && (
                  <button onClick={checkNow} disabled={checking}
                    className="btn-primary flex w-full items-center justify-center gap-2">
                    <RefreshCw size={15} className={checking ? 'animate-spin' : ''} />
                    {checking ? t('addFunds.checking') : t('addFunds.checkNow')}
                  </button>
                )}
                <button onClick={startOver} className="btn-secondary flex w-full items-center justify-center gap-2">
                  {t('addFunds.newRequest')}
                </button>
                {paid && (
                  <Link to="/dashboard/transactions" className="btn-ghost flex w-full items-center justify-center">
                    {t('addFunds.openTransactions')}
                  </Link>
                )}
              </div>
            </aside>
          </div>
        </section>
      )}

      {/* ------------------------- method picker / form ------------------------- */}
      {!active && (
        <>
          <section className="rounded-2xl border border-outline-variant bg-surface-container p-5">
            <div className="mb-4 flex items-center gap-2">
              {step(1, '')}
              <h2 className="text-base font-black text-on-surface">{t('addFunds.methods')}</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button onClick={() => walletEnabled && setMethod('wallet')} disabled={!walletEnabled}
                className={`rounded-xl border p-4 text-start transition-colors ${method === 'wallet' ? 'border-violet-600 bg-violet-500/8' : 'border-outline-variant bg-surface-container-high hover:border-violet-500/40'} ${walletEnabled ? '' : 'opacity-60'}`}>
                <span className="flex items-center gap-2 text-sm font-black text-on-surface"><Wallet size={17} />{t('addFunds.eWallet')}</span>
                <span className="mt-1.5 block text-xs leading-relaxed text-on-surface-variant">{t('addFunds.methodWalletDesc')}</span>
                <span className={`mt-2.5 inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${walletEnabled ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400' : 'bg-surface-container-high text-on-surface-variant'}`}>
                  {walletEnabled ? t('addFunds.availableNow') : t('addFunds.walletUnavailable')}
                </span>
              </button>

              <button onClick={() => cryptoEnabled && setMethod('crypto')} disabled={!cryptoEnabled}
                className={`rounded-xl border p-4 text-start transition-colors ${method === 'crypto' ? 'border-violet-600 bg-violet-500/8' : 'border-outline-variant bg-surface-container-high hover:border-violet-500/40'} ${cryptoEnabled ? '' : 'opacity-60'}`}>
                <span className="flex items-center gap-2 text-sm font-black text-on-surface"><Bitcoin size={17} />{t('addFunds.crypto')}</span>
                <span className="mt-1.5 block text-xs leading-relaxed text-on-surface-variant">{t('addFunds.methodCryptoDesc')}</span>
                <span className={`mt-2.5 inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${cryptoEnabled ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400' : 'bg-surface-container-high text-on-surface-variant'}`}>
                  {cryptoEnabled ? t('addFunds.availableNow') : t('addFunds.cryptoUnavailable')}
                </span>
              </button>
            </div>
          </section>

          {method === 'wallet' && walletEnabled && (
            <section className="rounded-2xl border border-outline-variant bg-surface-container p-5">
              <div className="mb-4 flex items-center gap-2">
                {step(2, '')}
                <h2 className="text-base font-black text-on-surface">{t('addFunds.selectWallet')}</h2>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {WALLET_ORDER.map(kind => {
                  const on = walletKind === kind;
                  return (
                    <button key={kind} onClick={() => setWalletKind(kind)}
                      className={`rounded-xl border px-4 py-3 text-sm font-bold transition-colors ${on ? 'border-violet-600 bg-violet-500/8 text-on-surface' : 'border-outline-variant bg-surface-container-high text-on-surface-variant hover:border-violet-500/40'}`}>
                      {ar ? WALLET_NAMES[kind].ar : WALLET_NAMES[kind].en}
                    </button>
                  );
                })}
              </div>

              {/* the selected wallet's own instructions, straight from the admin settings */}
              <div className="mt-4 rounded-xl border border-outline-variant bg-surface-container-high p-4">
                <p className="flex items-center gap-2 text-sm font-black text-on-surface">
                  <Info size={16} />
                  {t('addFunds.instructions')} — {ar ? WALLET_NAMES[walletKind].ar : WALLET_NAMES[walletKind].en}
                </p>
                {walletInstructions && (
                  <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">{ar ? walletInstructions.ar : walletInstructions.en}</p>
                )}
                {walletIntro && <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">{ar ? walletIntro.ar : walletIntro.en}</p>}
                {walletVerification && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-on-surface-variant/90"><CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-500" />{ar ? walletVerification.ar : walletVerification.en}</p>
                )}
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="label-primary text-on-surface-variant" htmlFor="af-amount">
                    {t('addFunds.amountEgp')} <span className="font-normal">({Number(minEgp).toLocaleString()} – {Number(maxEgp).toLocaleString()})</span>
                  </label>
                  <input id="af-amount" className="input-primary bg-surface-container-high" inputMode="decimal" value={amount}
                    onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))} placeholder="500" />
                  <p className="mt-1.5 text-xs text-on-surface-variant">{t('addFunds.amountHint')}</p>
                </div>
                <div>
                  <label className="label-primary text-on-surface-variant" htmlFor="af-number">
                    {t('addFunds.walletNumber')} <span className="font-normal">({t('addFunds.walletNumberHint')})</span>
                  </label>
                  <input id="af-number" className="input-primary bg-surface-container-high font-mono" inputMode="numeric" maxLength={11}
                    value={number} onChange={e => setNumber(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="01xxxxxxxxx"
                    aria-invalid={!!number && !numberOk} />
                  {!!number && !numberOk && <p className="mt-1.5 text-xs font-bold text-red-600 dark:text-red-400">{t('addFunds.walletNumberHint')}</p>}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-high p-4">
                <div className="text-sm">
                  <p className="text-on-surface-variant">{t('addFunds.approxCredit')}</p>
                  <p className="text-xl font-black tabular-nums text-violet-600 dark:text-violet-400">{currency}{usdAmount.toFixed(2)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {disabledReason && <span className="text-xs text-on-surface-variant">{disabledReason}</span>}
                  <button onClick={createWalletPayment} disabled={submitting || !amountOk || !numberOk}
                    className="btn-primary flex items-center gap-2">
                    {submitting ? t('addFunds.creating') : t('addFunds.create')}
                  </button>
                </div>
              </div>
            </section>
          )}

          {method === 'crypto' && cryptoEnabled && (
            <section className="rounded-2xl border border-outline-variant bg-surface-container p-5">
              <div className="mb-4 flex items-center gap-2">
                {step(2, '')}
                <h2 className="text-base font-black text-on-surface">{t('addFunds.crypto')}</h2>
              </div>

              <div className="rounded-xl border border-outline-variant bg-surface-container-high p-4">
                <p className="flex items-center gap-2 text-sm font-black text-on-surface"><Info size={16} />{t('addFunds.instructions')}</p>
                {config?.addFunds?.cryptoIntro && (
                  <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">{ar ? config.addFunds.cryptoIntro.ar : config.addFunds.cryptoIntro.en}</p>
                )}
                {config?.addFunds?.cryptoInvoiceInstruction && (
                  <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">{ar ? config.addFunds.cryptoInvoiceInstruction.ar : config.addFunds.cryptoInvoiceInstruction.en}</p>
                )}
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="label-primary text-on-surface-variant" htmlFor="af-usd">
                    {t('addFunds.amountUsd')} <span className="font-normal">({ar ? 'أقل مبلغ' : 'min'} {currency}{minDeposit})</span>
                  </label>
                  <input id="af-usd" className="input-primary bg-surface-container-high" inputMode="decimal" value={amount}
                    onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))} placeholder="20" />
                  <p className="mt-1.5 text-xs text-on-surface-variant">{t('addFunds.cryptoDesc')}</p>
                </div>
                <div className="flex flex-col justify-end gap-2">
                  <p className="text-sm text-on-surface-variant">{t('addFunds.approxCredit')}: <b className="tabular-nums text-on-surface">{currency}{usdAmount.toFixed(2)}</b></p>
                  <div className="flex flex-wrap items-center gap-3">
                    {disabledReason && <span className="text-xs text-on-surface-variant">{disabledReason}</span>}
                    <button onClick={createCryptoInvoice} disabled={submitting || !amountOk} className="btn-primary flex items-center gap-2">
                      {submitting ? t('addFunds.creatingInvoice') : t('addFunds.createInvoice')}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* -------------------- recent payment attempts (transparency) -------------------- */}
      {!active && payments.length > 0 && (
        <section className="rounded-2xl border border-outline-variant bg-surface-container p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-black text-on-surface">{t('addFunds.paymentWallet')}</h2>
            <button onClick={() => paymentsQ.refetch()} className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 hover:underline dark:text-violet-400">
              <RefreshCw size={13} />{t('common.refresh')}
            </button>
          </div>
          <div className="divide-y divide-outline-variant">
            {payments.slice(0, 5).map((p: any) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-on-surface">
                    {p.method === 'Heleket' ? t('addFunds.crypto') : t('addFunds.eWallet')} · {currency}{Number(p.amount).toFixed(2)}
                  </p>
                  <p className="text-xs text-on-surface-variant">{new Date(p.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${p.status === 'Approved' ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400' : p.status === 'Rejected' ? 'bg-red-500/12 text-red-600 dark:text-red-400' : 'bg-amber-500/12 text-amber-600 dark:text-amber-400'}`}>
                    {p.status === 'Approved' ? t('addFunds.statusPaid') : p.status === 'Rejected' ? t('addFunds.statusFailed') : t('addFunds.statusPending')}
                  </span>
                  {p.status === 'Pending' && (
                    <button onClick={() => adopt(p)} className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 hover:underline dark:text-violet-400">
                      {ar ? 'متابعة' : 'Track'}<ArrowLeft size={12} className={ar ? '' : 'rotate-180'} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
