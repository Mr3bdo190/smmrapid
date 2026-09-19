import { useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useT } from '../i18n';
import type { MessageKey } from '../i18n';
import { Button, Card, ErrorBanner, Money, Skeleton, StatusPill } from '../ui';

/**
 * The signed-in account view.
 *
 * Migrated to the bilingual foundation: every label comes from the dictionary, money is rendered by
 * `<Money>` (integer minor units → `Intl` in the active locale), the status is a `<StatusPill>`
 * with an icon and a spoken tone, and the load failure goes through `<ErrorBanner>`, which turns
 * the server code into {title, message, nextStep} — or, for a code the catalogue does not know yet,
 * shows the server's message plus the support reference instead of a blank screen.
 */
type AccountStatusKey = Extract<MessageKey, `account.status.${string}`>;

const STATUS_KEYS: Readonly<Record<string, AccountStatusKey>> = {
  active: 'account.status.active',
  pending: 'account.status.pending',
  suspended: 'account.status.suspended',
  deleted: 'account.status.deleted',
};

function Fact({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--color-line)] py-2.5 last:border-b-0">
      <span className="micro">{label}</span>
      <span className={`text-[13px] text-[var(--color-ink)] ${mono ? 'num' : ''}`}>{value}</span>
    </div>
  );
}

export function AccountPanel() {
  const { account, accountError, refreshAccount, signOutUser } = useAuth();
  const { t, formatDate } = useT();
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    try {
      await refreshAccount();
    } finally {
      setBusy(false);
    }
  }

  if (accountError) {
    return (
      <Card className="mx-auto w-full max-w-[560px]" kicker={t('account.kicker')} title={t('account.error.title')}>
        <ErrorBanner error={accountError} onRetry={() => void refresh()} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="ghost" loading={busy} onClick={() => void refresh()}>
            {busy ? t('common.refreshing') : t('common.refresh')}
          </Button>
          <Button variant="ghost" onClick={() => void signOutUser()}>
            {t('common.signOut')}
          </Button>
        </div>
      </Card>
    );
  }

  if (!account) {
    return (
      <Card className="mx-auto w-full max-w-[560px]" kicker={t('account.kicker')}>
        <Skeleton lines={3} />
        <p className="mt-3 text-[13px] text-[var(--color-ink-muted)]">{t('account.loading')}</p>
      </Card>
    );
  }

  const { user, wallet, roles, permissions } = account;
  const statusKey = STATUS_KEYS[user.status];

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="micro">{t('account.kicker')}</p>
            <h1 className="display mt-1 truncate text-[22px] font-semibold">
              {user.displayName || user.email.split('@')[0]}
            </h1>
            <p className="mt-1 text-[13px] text-[var(--color-ink-muted)]">
              <bdi>{user.email}</bdi>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill
              tone={user.emailVerified ? 'ok' : 'warn'}
              label={user.emailVerified ? t('account.emailVerified') : t('account.emailNotVerified')}
            />
            <StatusPill
              tone={user.status === 'active' ? 'accent' : 'neutral'}
              label={statusKey ? t(statusKey) : user.status}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="card-tight p-4">
            <p className="micro">{t('account.wallet.kicker')}</p>
            <p className="mt-1.5">
              <Money
                minor={wallet.balanceMinor}
                currency={wallet.currency}
                className="text-[26px] font-semibold text-[var(--color-ink)]"
              />
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
              {t('account.wallet.note')}
            </p>
          </div>

          <div className="card-tight p-4">
            <p className="micro">{t('account.roles.kicker')}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {roles.length ? (
                roles.map((role) => (
                  <span key={role} className="pill pill-neutral">
                    <bdi>{role}</bdi>
                  </span>
                ))
              ) : (
                <span className="text-[13px] text-[var(--color-ink-muted)]">{t('account.roles.none')}</span>
              )}
            </div>
            <p className="num mt-2 text-[12px] text-[var(--color-ink-faint)]">
              {t('account.roles.permissions', { count: permissions.length })}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <p className="micro mb-2">{t('account.details.kicker')}</p>
          <Fact
            label={t('account.details.id')}
            mono
            value={<bdi>{user.id.slice(0, 8)}</bdi>}
          />
          <Fact
            label={t('account.details.referral')}
            mono={Boolean(user.referralCode)}
            value={
              user.referralCode ? (
                <bdi>{user.referralCode}</bdi>
              ) : (
                t('account.details.referralPending')
              )
            }
          />
          <Fact label={t('account.details.createdAt')} value={formatDate(user.createdAt)} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="ghost" loading={busy} onClick={() => void refresh()}>
            {busy ? t('common.refreshing') : t('account.actions.refresh')}
          </Button>
          <Button variant="ghost" onClick={() => void signOutUser()}>
            {t('common.signOut')}
          </Button>
        </div>
      </Card>

      <Card kicker={t('account.live.kicker')}>
        <ul className="flex flex-col gap-1.5 text-[13px] leading-relaxed text-[var(--color-ink-soft)]">
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-[var(--color-ink-faint)]">
              —
            </span>
            <span>{t('account.live.signIn')}</span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-[var(--color-ink-faint)]">
              —
            </span>
            <span>{t('account.live.server')}</span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-[var(--color-ink-faint)]">
              —
            </span>
            <span>{t('account.live.roles')}</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
