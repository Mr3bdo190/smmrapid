import type { ReactNode } from 'react';
import { useT, useLocale } from '../i18n';
import { useAuth } from '../auth/AuthProvider';
import { SignInPanel } from './SignInPanel';
import { Card, ErrorBanner, Skeleton } from '../ui';
import type { Tone } from '../ui';
import type { OrderStatus, PublicService, PriceUnit } from '../data/types';

/**
 * The pieces every page shares: how a heading looks, which tone a status carries, which word a
 * quantity is priced by, and what a signed-out visitor sees instead of a protected page.
 */

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="display text-[26px] font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-[14px] leading-relaxed text-[var(--color-ink-muted)]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** A page that needs an account: the sign-in panel appears in place, so the URL is still the goal. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, user } = useAuth();
  const { t } = useT();

  if (!ready) {
    return (
      <Card className="mx-auto max-w-[520px]">
        <Skeleton lines={3} />
        <p className="mt-3 text-[13px] text-[var(--color-ink-muted)]">{t('shell.loadingSession')}</p>
      </Card>
    );
  }
  if (!user) return <SignInPanel />;
  return <>{children}</>;
}

export function LoadingCard({ label }: { label?: string }) {
  const { t } = useT();
  return (
    <Card>
      <Skeleton lines={4} />
      <p className="mt-3 text-[13px] text-[var(--color-ink-muted)]">{label ?? t('common.loading')}</p>
    </Card>
  );
}

export function FailureCard({ error, title, onRetry }: { error: unknown; title?: string; onRetry?: () => void }) {
  return (
    <Card>
      <ErrorBanner error={error} title={title} onRetry={onRetry} />
    </Card>
  );
}

/** The tone a status carries: green is done, amber is moving, red needs a human, grey is inert. */
export function statusTone(status: OrderStatus | string): Tone {
  switch (status) {
    case 'completed':
      return 'ok';
    case 'in_progress':
    case 'processing':
      return 'accent';
    case 'pending':
      return 'info';
    case 'partial':
      return 'warn';
    case 'canceled':
      return 'neutral';
    case 'refunded':
    case 'failed':
      return 'danger';
    default:
      return 'neutral';
  }
}

/** The dictionary key for a status, so a status is never rendered as its database name. */
export function statusKey(status: string): `orders.status.${string}` {
  return `orders.status.${status}` as `orders.status.${string}`;
}

/** "per 1000" / "per item" — the unit the price on the card belongs to. */
export function unitKey(unit: PriceUnit): 'services.card.per1000' | 'services.card.perItem' {
  return unit === 'per_item' ? 'services.card.perItem' : 'services.card.per1000';
}

/** The service name in the reader's language, falling back to the other one rather than to nothing. */
export function localizedName(row: { name: string; nameAr?: string | null }): string {
  const { locale } = useLocale();
  if (locale === 'ar') return row.nameAr || row.name;
  return row.name || row.nameAr || '';
}

export function useLocalizedService() {
  const { locale } = useLocale();
  const { t } = useT();
  return {
    name: (service: Pick<PublicService, 'name' | 'nameAr'>) =>
      locale === 'ar' ? service.nameAr || service.name : service.name || service.nameAr || '',
    hint: (service: Pick<PublicService, 'inputType'>) => t(`service.target.hint.${service.inputType}` as never),
  };
}
