import { useEffect, useState } from 'react';
import { Link, useRouter } from '../lib/router';
import { useT, useLocale } from '../i18n';
import { fetchCategories, fetchServices } from '../data/api';
import { useAsync } from '../lib/useAsync';
import { Button, Card, EmptyState, Money, Skeleton, StatusPill, TextField } from '../ui';
import { FailureCard, PageHeader, unitKey, useLocalizedService } from '../components/shared';

/**
 * The catalogue.
 *
 * The search box, the category filter and the page number live in the URL, so a filtered list can be
 * shared, bookmarked, and returned to with the browser's back button — and no state has to be kept
 * in two places. Typing debounces into the URL rather than firing a request per keystroke.
 */

const PAGE_SIZE = 12;

export function Services() {
  const { t } = useT();
  const { formatNumber } = useLocale();
  const { name } = useLocalizedService();
  const { query, navigate } = useRouter();

  const category = query.get('category') ?? '';
  const q = query.get('q') ?? '';
  const page = Math.max(1, Number(query.get('page') ?? '1') || 1);

  const [term, setTerm] = useState(q);
  useEffect(() => setTerm(q), [q]);

  const go = (next: { category?: string; q?: string; page?: number }) => {
    const search = new URLSearchParams();
    const nextCategory = next.category ?? category;
    const nextQ = next.q ?? q;
    const nextPage = next.page ?? 1;
    if (nextCategory) search.set('category', nextCategory);
    if (nextQ) search.set('q', nextQ);
    if (nextPage > 1) search.set('page', String(nextPage));
    const suffix = search.toString();
    navigate(`/services${suffix ? `?${suffix}` : ''}`);
  };

  // typing waits for a pause, so the list does not flicker on every character
  useEffect(() => {
    if (term === q) return;
    const timer = setTimeout(() => go({ q: term, page: 1 }), 400);
    return () => clearTimeout(timer);
    // deliberately keyed on the text only: `go` changes on every render and would loop
  }, [term, q]);

  const categories = useAsync(() => fetchCategories(), []);
  const list = useAsync(() => fetchServices({ category: category || undefined, q: q || undefined, page, pageSize: PAGE_SIZE }), [category, q, page]);

  const services = list.data?.services ?? [];
  const total = list.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(category || q);

  return (
    <div>
      <PageHeader
        title={t('services.title')}
        subtitle={t('services.subtitle')}
        actions={
          list.loading && services.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={list.reload}>
              {t('common.refreshing')}
            </Button>
          ) : null
        }
      />

      <Card className="mb-5">
        <div className="flex flex-col gap-4">
          <TextField
            label={t('services.search.label')}
            placeholder={t('services.search.placeholder')}
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            type="search"
            inputMode="search"
          />

          <div>
            <p className="label">{t('services.categories.label')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => go({ category: '', page: 1 })}
                className={`pill ${category ? 'pill-neutral' : 'pill-accent'}`}
                aria-pressed={!category}
              >
                {t('services.category.all')}
              </button>
              {(categories.data ?? []).map((entry) => (
                <button
                  key={entry.slug}
                  type="button"
                  onClick={() => go({ category: entry.slug, page: 1 })}
                  className={`pill ${category === entry.slug ? 'pill-accent' : 'pill-neutral'}`}
                  aria-pressed={category === entry.slug}
                >
                  {name(entry)} <span className="num opacity-70">({formatNumber(entry.serviceCount)})</span>
                </button>
              ))}
              {categories.loading && !categories.data ? <Skeleton className="h-7 w-24 rounded-full" lines={0} /> : null}
            </div>
          </div>
        </div>
      </Card>

      {list.error && !list.data ? (
        <FailureCard error={list.error} title={t('services.error.title')} onRetry={list.reload} />
      ) : list.loading && !list.data ? (
        <Card>
          <Skeleton lines={5} />
        </Card>
      ) : services.length === 0 ? (
        <Card>
          <EmptyState
            title={t('services.empty.title')}
            message={t('services.empty.message')}
            action={
              hasFilters ? (
                <Button variant="secondary" onClick={() => go({ category: '', q: '', page: 1 })}>
                  {t('services.empty.clear')}
                </Button>
              ) : null
            }
          />
        </Card>
      ) : (
        <>
          <p className="micro mb-3">{t('services.count', { count: total })}</p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => {
              const min = service.variants.length
                ? Math.min(...service.variants.map((variant) => variant.minQuantity))
                : service.minQuantity;
              const max = service.variants.length
                ? Math.max(...service.variants.map((variant) => variant.maxQuantity))
                : service.maxQuantity;
              return (
                <li key={service.id} className="card flex flex-col">
                  <StatusPill tone="accent" label={name(service.category) || service.category.name} />
                  <h2 className="display mt-2.5 text-[16px] font-semibold leading-snug">{name(service)}</h2>

                  <p className="mt-3 flex items-baseline gap-1.5">
                    <Money minor={service.priceMinor} currency={service.currency} className="text-[20px] font-semibold" />
                    <span className="text-[12px] text-[var(--color-ink-muted)]">{t(unitKey(service.priceUnit))}</span>
                  </p>

                  <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[var(--color-ink-muted)]">
                    <span className="num">{t('services.card.min', { count: min })}</span>
                    <span className="num">{t('services.card.max', { count: max })}</span>
                    {service.estimatedTime ? <span>{service.estimatedTime}</span> : null}
                  </p>

                  <div className="mt-4 flex gap-2">
                    <Link to={`/services/${service.slug}`} className="btn btn-primary flex-1">
                      {t('services.card.order')}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>

          {lastPage > 1 ? (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button variant="ghost" disabled={page <= 1} onClick={() => go({ page: page - 1 })}>
                {t('common.previous')}
              </Button>
              <span className="num text-[13px] text-[var(--color-ink-muted)]">
                {t('common.page')} {formatNumber(page)} {t('common.of')} {formatNumber(lastPage)}
              </span>
              <Button variant="ghost" disabled={page >= lastPage} onClick={() => go({ page: page + 1 })}>
                {t('common.next')}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
