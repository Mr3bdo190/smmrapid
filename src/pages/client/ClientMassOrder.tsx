import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { notify } from '../../lib/notify';
import { useTranslation } from '../../lib/i18n';
import { CheckCircle2, ListOrdered, Loader2, Send, Wallet, X } from 'lucide-react';

/** The server accepts 1–100 order lines per submission. */
const MAX_LINES = 100;
const num = (v: any) => Number(v || 0);

/** Illustrative — the customer replaces every part with their own values. */
const EXAMPLE_LINES = [
  '5f3c1e7a-9b21-4d3f-8f0a-1c2d3e4f5a6b | https://instagram.com/username | 1000',
  '7a1b2c3d-4e5f-4a6b-9c8d-0e1f2a3b4c5d | https://tiktok.com/@username/video/123 | 5000',
];

export default function ClientMassOrder() {
  const [ordersText, setOrdersText] = useState('');
  const [result, setResult] = useState<{ ids: string[]; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { user, dbUser } = useAuth();
  const { t, lang } = useTranslation();

  /** Bilingual copy helper: the app's language toggle picks the primary string. */
  const L = (ar: string, en: string) => (lang === 'ar' ? ar : en);

  /** The real lines the server will parse: one order per line, empty lines dropped. */
  const lines = useMemo(() => ordersText.split(/\r?\n/).map(l => l.trim()).filter(Boolean), [ordersText]);
  const incomplete = useMemo(
    () => lines.filter(line => line.split('|').map(p => p.trim()).filter(Boolean).length < 3).length,
    [lines]);
  const overLimit = lines.length > MAX_LINES;
  const balance = num(dbUser?.balance);

  const submit = async () => {
    if (!ordersText.trim()) return notify.error(t('massOrder.pleaseEnter'));

    setSubmitting(true);
    const token = await user?.getIdToken();
    try {
      const res = await apiFetch('/api/client/orders/mass', user, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ordersText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place orders');
      notify.success(data.message || 'Mass orders processed');
      setResult({
        ids: Array.isArray(data.orderIds) ? data.orderIds.map((id: any) => String(id)) : [],
        message: String(data.message || ''),
      });
      setOrdersText('');
    } catch (err: any) {
      notify.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMassOrder = (e: React.FormEvent) => {
    e.preventDefault();
    submit();
  };

  const field = 'h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
  const hint = 'text-xs text-on-surface-variant';
  const secondaryBtn = 'inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface-container px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high';

  return (
    <div className="flex flex-col gap-gutter-lg">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-space-md">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 font-display text-headline-lg text-on-surface">
            <ListOrdered className="h-6 w-6 shrink-0 text-primary" /> {t('massOrder.title')}
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            {L('أرسل عدة طلبات مرة واحدة: سطر واحد لكل طلب، وسيتم إنشاء الطلبات وخصم التكلفة من رصيدك.',
              'Send several orders at once: one line per order. The orders are created and the total is charged from your balance.')}
          </p>
        </div>
        <Link to="/dashboard/services" className={`${secondaryBtn} shrink-0`}>
          {t('nav.services')}
        </Link>
      </div>

      {/* ── Result of the last submission ──────────────────────────────────── */}
      {result && (
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-on-surface">{result.message || L('تم إرسال الطلبات.', 'Orders submitted.')}</p>
                <p className={`${hint} mt-0.5`}>
                  {L(`تم إنشاء ${result.ids.length} طلب. تابعها من سجل الطلبات.`, `${result.ids.length} orders created. Follow them in your order history.`)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/dashboard/orders" className="inline-flex h-9 items-center rounded-lg bg-surface-container-high px-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-bright">
                {t('nav.orderHistory')}
              </Link>
              <button
                type="button"
                onClick={() => setResult(null)}
                aria-label={t('common.close')}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          {result.ids.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {result.ids.map(id => (
                <li key={id} className="rounded-md bg-surface-container-low px-2 py-1 font-mono text-xs tabular-nums text-on-surface">
                  #{id}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-gutter-lg lg:grid-cols-3">
        {/* ── How to send ─────────────────────────────────────────────────── */}
        <form className="flex flex-col gap-space-xl rounded-xl border border-outline-variant bg-surface-container p-5 lg:col-span-2 md:p-6" onSubmit={handleMassOrder}>
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-headline-sm text-on-surface">{L('طريقة الإرسال', 'How to send')}</h2>
            <p className="text-sm text-on-surface-variant">{t('massOrder.format')}</p>

            <div className="flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface-container-low p-3">
              <span className="text-xs font-semibold text-on-surface-variant">{L('مثال (استبدل القيم ببياناتك)', 'Example (replace every value with your own)')}</span>
              {EXAMPLE_LINES.map(line => (
                <code key={line} className="break-all font-mono text-xs text-on-surface-variant">{line}</code>
              ))}
            </div>

            <ul className="flex flex-col gap-2 text-sm text-on-surface-variant">
              <li>• {L('سطر واحد لكل طلب، ويمكن إرسال 100 سطر كحد أقصى في المرة الواحدة.', 'One line per order, up to 100 lines per submission.')}</li>
              <li>• {L('افصل الأجزاء الثلاثة بالرمز | : معرّف الخدمة، الرابط، الكمية.', 'Separate the three parts with | : service ID, link, quantity.')}</li>
              <li>• {L('معرّف الخدمة موجود في صفحة الخدمات، والكمية يجب أن تكون داخل حدود الخدمة (للخدمات المفردة استخدم 1).', 'You can find service IDs on the Services page. The quantity must be inside the limits of that service (use 1 for single-item services).')}</li>
              <li>• {L('يجب أن يكون الرصيد كافياً لتحمّل تكلفة كل الطلبات، وإلا لن يتم إنشاء أي طلب.', 'Your balance must cover all the orders, otherwise none of them are created.')}</li>
            </ul>
          </section>

          {/* ── The order lines ───────────────────────────────────────────── */}
          <section className="flex flex-col gap-2 border-t border-outline-variant pt-space-xl">
            <label htmlFor="mass-orders" className="text-sm font-semibold text-on-surface">{t('massOrder.ordersLabel')}</label>
            <textarea
              id="mass-orders"
              rows={10}
              value={ordersText}
              onChange={(e) => setOrdersText(e.target.value)}
              className="min-h-56 w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-3 font-mono text-sm leading-relaxed text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder={L('معرّف الخدمة | الرابط | الكمية', 'service ID | link | quantity')}
            />
            <p className={hint}>
              {lines.length === 0
                ? L('لم تتم إضافة أي سطر بعد. كل سطر سيصبح طلباً منفصلاً.', 'No lines added yet. Each line becomes a separate order.')
                : L(`تم تجهيز ${lines.length} سطر للخادم (الحد الأقصى ${MAX_LINES}).`, `${lines.length} lines ready to send (maximum ${MAX_LINES}).`)}
            </p>
            {incomplete > 0 && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-300">
                {L(`يوجد ${incomplete} سطر ناقص: كل سطر يحتاج ثلاثة أجزاء مفصولة بالرمز |.`, `${incomplete} line(s) look incomplete: each line needs three parts separated by |.`)}
              </p>
            )}
            {overLimit && (
              <p className="rounded-lg border border-error/40 bg-error-container p-2 text-xs text-on-error-container">
                {L(`لديك ${lines.length} سطر، والحد الأقصى ${MAX_LINES} سطر في المرة الواحدة.`, `You have ${lines.length} lines; the maximum is ${MAX_LINES} per submission.`)}
              </p>
            )}
          </section>
        </form>

        {/* ── Submission summary ──────────────────────────────────────────── */}
        <aside className="lg:col-span-1">
          <div className="flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container p-5 lg:sticky lg:top-20">
            <h2 className="font-display text-headline-sm text-on-surface">{L('ملخص الإرسال', 'Submission summary')}</h2>

            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-on-surface-variant">{L('أسطر جاهزة', 'Lines ready')}</span>
                <span className="font-mono tabular-nums text-on-surface">{lines.length}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-on-surface-variant">{L('الحد الأقصى للمرة الواحدة', 'Maximum per submission')}</span>
                <span className="font-mono tabular-nums text-on-surface">{MAX_LINES}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-outline-variant pt-3">
                <span className="flex items-center gap-2 text-on-surface-variant"><Wallet className="h-4 w-4" /> {t('common.balance')}</span>
                <span className="font-mono tabular-nums text-on-surface">${balance.toFixed(4)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={!ordersText.trim() || submitting}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary-container text-base font-bold text-on-primary-container shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition-all hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? <><Loader2 className="h-5 w-5 animate-spin" /> {L('جاري الإرسال...', 'Sending...')}</>
                : <><Send className="h-5 w-5" /> {t('massOrder.submit')}</>}
            </button>

            {!ordersText.trim() && !submitting && <p className={`${hint} text-center`}>{t('massOrder.pleaseEnter')}</p>}
            <p className={`${hint} text-center`}>
              {L('يتم إنشاء الطلبات وخصم التكلفة من رصيدك عند الإرسال.', 'The orders are created and charged from your balance as soon as you send them.')}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
