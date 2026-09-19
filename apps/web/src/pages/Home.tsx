import { Link } from '../lib/router';
import { useT } from '../i18n';
import { useAuth } from '../auth/AuthProvider';
import { fetchServices } from '../data/api';
import { useAsync } from '../lib/useAsync';
import { Card, Money, StatusPill, EmptyState, Skeleton } from '../ui';
import { PageHeader, unitKey, useLocalizedService } from '../components/shared';

/**
 * The front page.
 *
 * It answers three questions in order — what is this, how does it work, what does it cost — and it
 * never shows a service the customer cannot actually order. When the catalogue is empty (a fresh
 * deployment with no supplier synced) the page says so and offers the support ticket, instead of
 * pretending the shop is open with nothing in it.
 */

const STEPS = [
  { title: 'home.how.step1.title', body: 'home.how.step1.body' },
  { title: 'home.how.step2.title', body: 'home.how.step2.body' },
  { title: 'home.how.step3.title', body: 'home.how.step3.body' },
] as const;

export function Home() {
  const { t } = useT();
  const { user } = useAuth();
  const { name } = useLocalizedService();
  const featured = useAsync(() => fetchServices({ featured: true, pageSize: 6 }), []);
  const services = featured.data?.services ?? [];

  return (
    <div className="flex flex-col gap-10">
      <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-raised)]">
        <div className="grid gap-8 p-7 sm:p-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="micro">{t('home.kicker')}</p>
            <h1 className="display mt-2 text-[32px] font-semibold leading-[1.15] tracking-tight sm:text-[40px]">
              {t('home.title')}
            </h1>
            <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-[var(--color-ink-muted)]">
              {t('home.subtitle')}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link to="/services" className="btn btn-primary">
                {t('home.cta.browse')}
              </Link>
              <Link to={user ? '/orders' : '/signin'} className="btn btn-ghost">
                {t('home.cta.orders')}
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="card card-tight">
              <p className="micro">{t('home.trust.wallet.title')}</p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--color-ink-muted)]">
                {t('home.trust.wallet.body')}
              </p>
            </div>
            <div className="card card-tight">
              <p className="micro">{t('home.trust.support.title')}</p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--color-ink-muted)]">
                {t('home.trust.support.body')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <PageHeader title={t('home.how.title')} />
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="card">
              <span className="num grid h-7 w-7 place-items-center rounded-full bg-[var(--color-accent-soft)] text-[13px] font-semibold text-[var(--color-accent-ink)]">
                {index + 1}
              </span>
              <h2 className="display mt-3 text-[16px] font-semibold">{t(step.title)}</h2>
              <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--color-ink-muted)]">{t(step.body)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <PageHeader
          title={t('services.title')}
          subtitle={t('services.subtitle')}
          actions={
            <Link to="/services" className="btn btn-ghost">
              {t('services.card.details')}
            </Link>
          }
        />

        {featured.loading ? (
          <Card>
            <Skeleton lines={4} />
          </Card>
        ) : services.length === 0 ? (
          <Card>
            <EmptyState
              title={t('home.empty.title')}
              message={t('home.empty.message')}
              action={
                <Link to={user ? '/support' : '/signin'} className="btn btn-primary">
                  {t('home.empty.action')}
                </Link>
              }
            />
          </Card>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <li key={service.id} className="card flex flex-col">
                <StatusPill tone="accent" label={name(service.category) || service.category.name} />
                <h3 className="display mt-2.5 text-[16px] font-semibold leading-snug">{name(service)}</h3>
                <p className="mt-3 flex items-baseline gap-1.5">
                  <Money minor={service.priceMinor} currency={service.currency} className="text-[20px] font-semibold" />
                  <span className="text-[12px] text-[var(--color-ink-muted)]">{t(unitKey(service.priceUnit))}</span>
                </p>
                <div className="mt-4">
                  <Link to={`/services/${service.slug}`} className="btn btn-primary w-full">
                    {t('services.card.order')}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
