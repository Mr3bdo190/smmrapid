import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Loader2, RefreshCw, Wallet } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { useTranslation } from '../../lib/i18n';

const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const money = (v: any) => `$${num(v).toFixed(4)}`;
/** Signed amount the way the wallet stores it: `+$10.0000` for credits, `-$3.2000` for debits. */
const signedAmount = (v: any) => `${num(v) >= 0 ? '+' : '-'}$${Math.abs(num(v)).toFixed(4)}`;
const isCredit = (v: any) => num(v) >= 0;
/** Ledger rows carry `credit` / `debit`; anything else falls back to the raw value. */
const typeLabel = (type: any, credit: boolean, ar: boolean) => {
  const raw = String(type || '').toLowerCase();
  if (raw === 'credit') return ar ? 'إضافة' : 'Credit';
  if (raw === 'debit') return ar ? 'خصم' : 'Debit';
  return String(type || '') || (credit ? (ar ? 'إضافة' : 'Credit') : (ar ? 'خصم' : 'Debit'));
};

export default function ClientTransactions() {
  const { user } = useAuth();
  const { t, lang } = useTranslation();

  /** Inline EN/AR for labels that have no i18n key yet. */
  const en = (e: string, a: string) => (lang === 'ar' ? a : e);

  const { data: transactions = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['client-transactions'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/client/transactions', user, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load data');
      return res.json();
    },
    enabled: !!user,
  });

  const rows: any[] = transactions as any;
  /* Totals computed from the rows the ledger actually returned. */
  const credited = rows.filter((p: any) => num(p.amount) >= 0).reduce((sum: number, p: any) => sum + num(p.amount), 0);
  const debited = rows.filter((p: any) => num(p.amount) < 0).reduce((sum: number, p: any) => sum + Math.abs(num(p.amount)), 0);

  const hint = 'text-xs text-on-surface-variant';
  const statCard = 'flex flex-col rounded-xl border border-outline-variant bg-surface-container-low p-4';

  const formatDate = (value: any) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  return (
    <div className="flex flex-col gap-gutter-lg">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-space-md">
        <div className="min-w-0">
          <h1 className="font-display text-headline-lg text-on-surface">{t('nav.transactions')}</h1>
          <p className={`${hint} mt-1`}>{t('transactions.subtitle')}</p>
        </div>
        <Link
          to="/dashboard/add-funds"
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-primary-container px-5 text-sm font-semibold text-on-primary-container transition-colors hover:opacity-90"
        >
          <Wallet className="h-4 w-4" /> {t('nav.addFunds')}
        </Link>
      </div>

      {/* ── 1 · Wallet summary ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-space-lg rounded-xl border border-outline-variant bg-surface-container p-5">
        <div>
          <h2 className="font-display text-headline-sm text-on-surface">{en('Wallet summary', 'ملخص المحفظة')}</h2>
          <p className={`${hint} mt-1`}>{en('Totals calculated from the transactions listed below.', 'الإجماليات محسوبة من المعاملات المدرجة بالأسفل.')}</p>
        </div>
        <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
          <div className={statCard}>
            <span className="flex items-center gap-2 text-sm text-on-surface-variant">
              <ArrowDownLeft className="h-4 w-4 text-success" /> {en('Added to your balance', 'أُضيف إلى رصيدك')}
            </span>
            <span className="mt-1 font-mono text-xl font-bold tabular-nums text-success">{credited > 0 ? `+${money(credited)}` : money(0)}</span>
            <span className={`${hint} mt-1`}>{en('Deposits, refunds and cashback', 'إيداعات ومبالغ مستردة وكاش باك')}</span>
          </div>
          <div className={statCard}>
            <span className="flex items-center gap-2 text-sm text-on-surface-variant">
              <ArrowUpRight className="h-4 w-4 text-error" /> {en('Taken from your balance', 'خُصم من رصيدك')}
            </span>
            <span className="mt-1 font-mono text-xl font-bold tabular-nums text-error">{debited > 0 ? `-${money(debited)}` : money(0)}</span>
            <span className={`${hint} mt-1`}>{en('Order charges and other spending', 'تكاليف الطلبات ومصروفات أخرى')}</span>
          </div>
        </div>
      </div>

      {/* ── 2 · Transaction history ────────────────────────────────────────── */}
      <div className="flex flex-col gap-space-lg rounded-xl border border-outline-variant bg-surface-container p-5">
        <div className="flex flex-wrap items-center justify-between gap-space-md">
          <h2 className="font-display text-headline-sm text-on-surface">{en('Transaction history', 'سجل المعاملات')}</h2>
          <span className="text-sm text-on-surface-variant">
            {rows.length.toLocaleString()} {rows.length === 1 ? en('transaction', 'معاملة') : en('transactions', 'معاملات')}
          </span>
        </div>

        {isError && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-error/40 bg-error-container p-3 text-sm text-on-error-container">
            <span>{en('We could not load your transactions.', 'تعذر تحميل معاملاتك.')}</span>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-surface-container px-3 font-semibold"
            >
              <RefreshCw className="h-4 w-4" /> {t('common.retry')}
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="mt-2 text-sm font-semibold text-on-surface">{t('common.loading')}</p>
            <p className={hint}>{en('Fetching your wallet history…', 'جارٍ جلب سجل محفظتك…')}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-8 text-center">
            <Wallet className="h-8 w-8 text-outline" />
            <p className="text-sm font-semibold text-on-surface">{t('transactions.none')}</p>
            <p className={`${hint} max-w-md`}>
              {en('Deposits, order charges and refunds will appear here once they happen.', 'ستظهر هنا عمليات الإيداع وخصومات الطلبات والمبالغ المستردة بمجرد حدوثها.')}
            </p>
            <Link
              to="/dashboard/add-funds"
              className="mt-2 inline-flex h-11 items-center gap-2 rounded-lg bg-primary-container px-5 text-sm font-semibold text-on-primary-container transition-colors hover:opacity-90"
            >
              <Wallet className="h-4 w-4" /> {t('nav.addFunds')}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-start text-sm">
              <thead>
                <tr className="border-b border-outline-variant text-sm text-on-surface-variant">
                  <th className="px-4 py-3 text-start font-semibold">{t('transactions.date')}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t('transactions.description')}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t('transactions.type')}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t('transactions.amount')}</th>
                </tr>
              </thead>
              <tbody className="text-on-surface">
                {rows.map((p: any) => {
                  const credit = isCredit(p.amount);
                  const created = formatDate(p.createdAt);
                  return (
                    <tr key={p.id} className="border-b border-outline-variant last:border-0 transition-colors hover:bg-surface-container-high/40">
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col">
                          <span className="text-sm text-on-surface">
                            {created ? created.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—'}
                          </span>
                          {created && <span className={hint}>{created.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour12: false })}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className="text-sm text-on-surface">{p.description || en('No description', 'بدون وصف')}</span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${credit ? 'border-success/30 bg-success-container text-success' : 'border-error/30 bg-error-container text-error'}`}
                        >
                          {credit ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                          {typeLabel(p.type, credit, lang === 'ar')}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-end">
                        <span className={`font-mono text-sm font-semibold tabular-nums ${credit ? 'text-success' : 'text-error'}`}>
                          {signedAmount(p.amount)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
