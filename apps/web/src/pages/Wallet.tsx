import { useState } from 'react';
import { Link } from '../lib/router';
import { useT, useLocale } from '../i18n';
import { useAuth } from '../auth/AuthProvider';
import { fetchDeposits, fetchLedger, fetchWallet } from '../data/api';
import { useAsync } from '../lib/useAsync';
import { Button, Card, EmptyState, LedgerTable, Money, Skeleton, StatusPill } from '../ui';
import type { Tone } from '../ui';
import { FailureCard, PageHeader, RequireAuth } from '../components/shared';
import type { DepositStatus } from '../data/types';

/**
 * The wallet: what is spendable, what is still on its way, and the statement that explains both.
 *
 * The statement is the ledger itself (a cursor page, loaded on demand) rather than a summary the
 * browser assembles — a balance a customer cannot trace back to entries is the thing support tickets
 * are made of.
 */

const DEPOSIT_TONE: Record<DepositStatus, Tone> = {
  pending: 'info',
  completed: 'ok',
  rejected: 'danger',
  expired: 'neutral',
};

export function Wallet() {
  return (
    <RequireAuth>
      <WalletView />
    </RequireAuth>
  );
}

function WalletView() {
  const { t } = useT();
  const { formatDateTime } = useLocale();
  const { user, account, refreshAccount } = useAuth();
  const [extraEntries, setExtraEntries] = useState<{ id: string; occurredAt: string; type: string; amountMinor: number; currency: string; balanceAfterMinor: number; reference: string | null }[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const wallet = useAsync(() => fetchWallet(user), [Boolean(user)], { skip: !user });
  const ledger = useAsync(() => fetchLedger(user, { limit: 20 }), [Boolean(user)], { skip: !user });
  const deposits = useAsync(() => fetchDeposits(user), [Boolean(user)], { skip: !user });

  const summary = wallet.data;
  const firstPage = (ledger.data?.transactions ?? []).map((entry) => ({
    id: entry.id,
    occurredAt: entry.createdAt,
    type: entry.type,
    amountMinor: entry.amountMinor,
    currency: entry.currency,
    balanceAfterMinor: entry.balanceAfterMinor,
    reference: entry.description ?? entry.orderId ?? entry.paymentId ?? null,
  }));

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const page = await fetchLedger(user, { limit: 20, cursor: cursor ?? ledger.data?.nextCursor ?? null });
      setExtraEntries((current) => [
        ...current,
        ...page.transactions.map((entry) => ({
          id: entry.id,
          occurredAt: entry.createdAt,
          type: entry.type,
          amountMinor: entry.amountMinor,
          currency: entry.currency,
          balanceAfterMinor: entry.balanceAfterMinor,
          reference: entry.description ?? entry.orderId ?? entry.paymentId ?? null,
        })),
      ]);
      setCursor(page.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  };

  const hasMore = cursor ? extraEntries.length > 0 : Boolean(ledger.data?.hasMore);

  return (
    <div>
      <PageHeader
        title={t('wallet.title')}
        subtitle={t('wallet.subtitle')}
        actions={
          <>
            <Link to="/wallet/deposit" className="btn btn-primary">
              {t('wallet.deposit')}
            </Link>
            <Button variant="ghost" onClick={() => { wallet.reload(); ledger.reload(); void refreshAccount(); }}>
              {t('common.refresh')}
            </Button>
          </>
        }
      />

      {wallet.error && !summary ? (
        <FailureCard error={wallet.error} onRetry={wallet.reload} />
      ) : !summary ? (
        <Card>
          <Skeleton lines={3} />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <p className="micro">{t('service.quote.balance')}</p>
            <p className="mt-1.5">
              <Money minor={summary.balanceMinor} currency={summary.currency} className="text-[30px] font-semibold" />
            </p>
          </Card>
          <Card>
            <p className="micro">{t('wallet.deposits.title')}</p>
            <p className="mt-1.5">
              <Money minor={summary.pendingMinor} currency={summary.currency} className="text-[30px] font-semibold" />
            </p>
            <p className="mt-1 text-[12px] text-[var(--color-ink-muted)]">{t('deposit.pending.title')}</p>
          </Card>
        </div>
      )}

      <div className="mt-6">
        <h2 className="display mb-3 text-[18px] font-semibold">{t('wallet.ledger.title')}</h2>
        {ledger.error && !ledger.data ? (
          <FailureCard error={ledger.error} onRetry={ledger.reload} />
        ) : (
          <>
            <LedgerTable entries={[...firstPage, ...extraEntries]} loading={ledger.loading && !ledger.data} />
            {hasMore ? (
              <div className="mt-3 flex justify-center">
                <Button variant="ghost" disabled={loadingMore} onClick={loadMore}>
                  {loadingMore ? t('common.loading') : t('services.loadMore')}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="mt-8">
        <h2 className="display mb-3 text-[18px] font-semibold">{t('wallet.deposits.title')}</h2>
        {deposits.loading && !deposits.data ? (
          <Card>
            <Skeleton lines={3} />
          </Card>
        ) : (deposits.data ?? []).length === 0 ? (
          <Card>
            <EmptyState
              title={t('wallet.deposits.empty')}
              action={
                <Link to="/wallet/deposit" className="btn btn-primary">
                  {t('wallet.deposit')}
                </Link>
              }
            />
          </Card>
        ) : (
          <Card padded={false}>
            <ul>
              {(deposits.data ?? []).map((deposit) => (
                <li
                  key={deposit.publicId}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3 last:border-0"
                >
                  <div>
                    <p className="num text-[13px] font-medium">{deposit.publicId}</p>
                    <p className="mt-0.5 text-[12px] text-[var(--color-ink-muted)]">
                      {t(`deposit.gateway.${deposit.gateway}` as never)} · {formatDateTime(deposit.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Money minor={deposit.amountMinor} currency={deposit.currency} />
                    <StatusPill
                      tone={DEPOSIT_TONE[deposit.status] ?? 'neutral'}
                      label={t(`deposit.status.${deposit.status}` as never)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {account ? (
        <p className="micro mt-6">{t('nav.signedInAs', { email: account.user.email })}</p>
      ) : null}
    </div>
  );
}
