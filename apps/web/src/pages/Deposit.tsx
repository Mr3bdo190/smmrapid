import { useEffect, useState } from 'react';
import { Link, useRouter } from '../lib/router';
import { useT, useLocale } from '../i18n';
import { useAuth } from '../auth/AuthProvider';
import { confirmDeposit, createDeposit, fetchDeposit, fetchGateways } from '../data/api';
import { ApiError } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { Button, Card, EmptyState, ErrorBanner, Money, Skeleton, StatusPill, TextField } from '../ui';
import { FailureCard, PageHeader, RequireAuth } from '../components/shared';
import type { PaymentGatewayKey, PublicPayment, ShahnawyMethod } from '../data/types';

/**
 * Adding funds.
 *
 * The page never asks the customer to trust it about the money: after the gateway answers, the
 * balance shown in the header is reloaded from the server, and "waiting" is a state the customer can
 * leave the page in — the webhook credits the wallet whether or not this tab is open.
 */

const METHODS: ShahnawyMethod[] = ['vf_cash', 'or_cash', 'et_cash'];

export function Deposit() {
  return (
    <RequireAuth>
      <DepositFlow />
    </RequireAuth>
  );
}

function DepositFlow() {
  const { t } = useT();
  const { formatNumber, formatCurrency, formatDateTime } = useLocale();
  const { user, refreshAccount } = useAuth();
  const { navigate } = useRouter();

  const [gateway, setGateway] = useState<PaymentGatewayKey | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [method, setMethod] = useState<ShahnawyMethod>('vf_cash');
  const [walletNumber, setWalletNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [payment, setPayment] = useState<PublicPayment | null>(null);
  const [checking, setChecking] = useState(false);

  const gateways = useAsync(() => fetchGateways(user), [Boolean(user)], { skip: !user });
  const available = gateways.data ?? [];

  // the first method is the default choice, and it must be one the server actually offers
  useEffect(() => {
    if (!gateway && available.length > 0) setGateway(available[0]!.key);
  }, [available, gateway]);

  const selected = available.find((entry) => entry.key === gateway) ?? null;
  const amountMinor = Math.round(Number(amountInput.replace(/[^\d.]/g, '')) * 100);
  const amountValid = Boolean(selected && amountMinor >= selected.minMinor && amountMinor <= selected.maxMinor);
  const needsWallet = selected?.key === 'shahnawy';
  const walletValid = !needsWallet || /^\d{11}$/.test(walletNumber.trim());

  const submit = async () => {
    if (!selected || !amountValid) return;
    setSubmitting(true);
    setFailure(null);
    try {
      const created = await createDeposit(user, {
        gateway: selected.key,
        amountMinor,
        method: needsWallet ? method : null,
        walletNumber: needsWallet ? walletNumber.trim() : null,
      });
      setPayment(created);
      await refreshAccount();
    } catch (error) {
      setFailure(error);
    } finally {
      setSubmitting(false);
    }
  };

  const check = async () => {
    if (!payment) return;
    setChecking(true);
    setFailure(null);
    try {
      await confirmDeposit(user, payment.publicId);
      const fresh = await fetchDeposit(user, payment.publicId);
      setPayment(fresh);
      await refreshAccount();
    } catch (error) {
      setFailure(error);
    } finally {
      setChecking(false);
    }
  };

  if (gateways.loading && !gateways.data) {
    return (
      <Card>
        <Skeleton lines={4} />
      </Card>
    );
  }

  if (gateways.error && !gateways.data) {
    return <FailureCard error={gateways.error} onRetry={gateways.reload} />;
  }

  if (available.length === 0) {
    return (
      <Card className="mx-auto max-w-[560px]">
        <EmptyState
          title={t('deposit.unavailable.title')}
          message={t('deposit.unavailable.message')}
          action={
            <Link to="/support" className="btn btn-primary">
              {t('deposit.unavailable.action')}
            </Link>
          }
        />
      </Card>
    );
  }

  /* ── after the deposit exists: what to send, or what happened ─────────────────────────────── */

  if (payment) {
    const done = payment.status === 'completed';
    const rejected = payment.status === 'rejected' || payment.status === 'expired';

    return (
      <div className="mx-auto max-w-[620px]">
        <PageHeader
          title={t('deposit.title')}
          subtitle={`${payment.publicId} · ${formatDateTime(payment.createdAt)}`}
          actions={
            <StatusPill tone={done ? 'ok' : rejected ? 'danger' : 'info'} label={t(`deposit.status.${payment.status}` as never)} />
          }
        />

        {done ? (
          <div className="banner banner-ok mb-4">
            <strong className="font-semibold">{t('deposit.done.title')}</strong> {t('deposit.done.message')}
          </div>
        ) : rejected ? (
          <div className="banner banner-danger mb-4">
            <strong className="font-semibold">{t('deposit.rejected.title')}</strong> {t('deposit.rejected.message')}
          </div>
        ) : (
          <div className="banner banner-warn mb-4">
            <strong className="font-semibold">{t('deposit.pending.title')}</strong> {t('deposit.pending.message')}
          </div>
        )}

        <Card title={t('deposit.instructions.title')}>
          <dl className="flex flex-col gap-3 text-[14px]">
            {payment.walletNumber ? (
              <div>
                <dt className="micro">{t('deposit.instructions.wallet')}</dt>
                <dd className="num mt-0.5 text-[18px] font-semibold">{payment.walletNumber}</dd>
              </div>
            ) : null}
            <div>
              <dt className="micro">{t('deposit.instructions.amount')}</dt>
              <dd className="mt-0.5">
                <Money
                  minor={payment.gatewayAmountMinor ?? payment.amountMinor}
                  currency={payment.gatewayCurrency ?? payment.currency}
                  className="text-[18px] font-semibold"
                />
              </dd>
            </div>
            <div>
              <dt className="micro">{t('deposit.instructions.reference')}</dt>
              <dd className="num mt-0.5">{payment.publicId}</dd>
            </div>
            {payment.instructions ? (
              <div>
                <dd className="mt-0.5 whitespace-pre-line text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
                  {payment.instructions}
                </dd>
              </div>
            ) : null}
          </dl>

          {failure ? (
            <div className="mt-4">
              <ErrorBanner error={failure} />
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            {payment.payUrl && !done ? (
              <a href={payment.payUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
                {t('deposit.openGateway')}
              </a>
            ) : null}
            {!done && !rejected ? (
              <Button variant="secondary" disabled={checking} onClick={check}>
                {checking ? t('deposit.checking') : t('deposit.check')}
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => navigate('/wallet')}>
              {t('nav.wallet')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  /* ── the form ─────────────────────────────────────────────────────────────────────────────── */

  return (
    <div className="mx-auto max-w-[620px]">
      <PageHeader title={t('deposit.title')} subtitle={t('deposit.subtitle')} />

      <Card>
        <div className="flex flex-col gap-5">
          <div>
            <p className="label">{t('deposit.gateway.label')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {available.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  className={`pill ${gateway === entry.key ? 'pill-accent' : 'pill-neutral'}`}
                  aria-pressed={gateway === entry.key}
                  onClick={() => setGateway(entry.key)}
                >
                  {t(`deposit.gateway.${entry.key}` as never)}
                </button>
              ))}
            </div>
            {selected ? (
              <p className="num mt-2 text-[12px] text-[var(--color-ink-muted)]">
                {t('deposit.amount.hint', {
                  min: formatCurrency(selected.minMinor / 100, selected.currency),
                  max: formatCurrency(selected.maxMinor / 100, selected.currency),
                })}
              </p>
            ) : null}
          </div>

          <TextField
            label={t('deposit.amount.label')}
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
            inputMode="decimal"
            required
            className="num"
            hint={selected ? selected.currency : undefined}
            error={amountInput && !amountValid ? t('deposit.amount.label') : undefined}
          />

          {needsWallet ? (
            <>
              <div>
                <p className="label">{t('deposit.method.label')}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {METHODS.map((entry) => (
                    <button
                      key={entry}
                      type="button"
                      className={`pill ${method === entry ? 'pill-accent' : 'pill-neutral'}`}
                      aria-pressed={method === entry}
                      onClick={() => setMethod(entry)}
                    >
                      {t(`deposit.method.${entry}` as never)}
                    </button>
                  ))}
                </div>
              </div>

              <TextField
                label={t('deposit.wallet.label')}
                hint={t('deposit.wallet.hint')}
                value={walletNumber}
                onChange={(event) => setWalletNumber(event.target.value.replace(/[^\d]/g, '').slice(0, 11))}
                inputMode="numeric"
                required
                className="num"
                error={walletNumber && !walletValid ? t('deposit.wallet.hint') : undefined}
              />
            </>
          ) : null}

          {failure ? <ErrorBanner error={failure} /> : null}

          {failure instanceof ApiError && failure.code === 'PAYMENT_GATEWAY_UNAVAILABLE' ? (
            <p className="text-[13px] text-[var(--color-ink-muted)]">{t('deposit.unavailable.message')}</p>
          ) : null}

          <Button className="w-full" disabled={submitting || !amountValid || !walletValid} onClick={submit}>
            {submitting
              ? t('deposit.submitting')
              : t('deposit.submit') + (amountValid && selected ? ` · ${formatNumber(amountMinor / 100)} ${selected.currency}` : '')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
