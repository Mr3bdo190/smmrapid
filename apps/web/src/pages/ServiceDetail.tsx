import { useEffect, useState } from 'react';
import { Link, useRouter } from '../lib/router';
import { useT, useLocale } from '../i18n';
import { useAuth } from '../auth/AuthProvider';
import { createOrder, fetchService, quoteOrder } from '../data/api';
import { ApiError } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { Button, Card, ErrorBanner, Money, Skeleton, Spinner, StatusPill, TextField } from '../ui';
import { PageHeader, localizedName, unitKey } from '../components/shared';

/**
 * One service, and the form that orders it.
 *
 * The form is deliberately three fields plus an optional coupon, and it quotes as you type: the API
 * decides the price from the database, so the customer sees the exact number the wallet will be
 * charged before they confirm. A balance that is too small is said in advance, with the shortfall,
 * rather than discovered as a failed request.
 */
export function ServiceDetail({ slug }: { slug: string }) {
  const { t } = useT();
  const { formatNumber, formatCurrency } = useLocale();
  const { user, account, refreshAccount } = useAuth();
  const { navigate } = useRouter();

  const [target, setTarget] = useState('');
  const [quantityInput, setQuantityInput] = useState('');
  const [variantId, setVariantId] = useState('');
  const [coupon, setCoupon] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);

  const service = useAsync(() => fetchService(slug), [slug]);

  const detail = service.data;
  const variant = detail?.variants.find((entry) => entry.id === variantId) ?? null;
  const minQuantity = variant?.minQuantity ?? detail?.minQuantity ?? 1;
  const maxQuantity = variant?.maxQuantity ?? detail?.maxQuantity ?? 1;

  // the quantity follows the keyboard with a short pause, so the price is live without a request storm
  useEffect(() => {
    const parsed = Number(quantityInput.replace(/[^\d]/g, ''));
    const timer = setTimeout(() => setQuantity(Number.isFinite(parsed) ? parsed : 0), 300);
    return () => clearTimeout(timer);
  }, [quantityInput]);

  const quote = useAsync(
    () => quoteOrder({ serviceSlug: slug, quantity, variantId: variantId || null, couponCode: coupon || null }, user),
    [slug, quantity, variantId, coupon, Boolean(user)],
    { skip: !detail || quantity <= 0, keepPrevious: true },
  );

  // the first variant is the default offer, and switching service must not keep a stale choice
  useEffect(() => {
    setVariantId(detail?.variants[0]?.id ?? '');
  }, [detail?.id, detail?.variants]);

  const price = quote.data;
  const balanceMinor = account?.wallet.balanceMinor ?? 0;
  const shortfall = price ? Math.max(0, price.totalMinor - balanceMinor) : 0;
  const canAfford = price ? shortfall === 0 : false;
  const quantityValid = quantity >= minQuantity && quantity <= maxQuantity;

  const submit = async () => {
    setSubmitting(true);
    setFailure(null);
    try {
      const order = await createOrder(user, {
        serviceSlug: slug,
        target: target.trim(),
        quantity,
        variantId: variantId || null,
        couponCode: coupon || null,
      });
      await refreshAccount();
      navigate(`/orders/${order.publicId}?placed=1`);
    } catch (error) {
      setFailure(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (service.loading && !detail) {
    return (
      <Card>
        <Skeleton lines={6} />
      </Card>
    );
  }

  if (service.error && !detail) {
    const code = service.error instanceof ApiError ? service.error.code : '';
    const offSale = code === 'PRICING_SERVICE_UNAVAILABLE' || code === 'PRICING_SERVICE_NOT_FOUND';
    return (
      <Card className="mx-auto max-w-[560px]">
        {offSale ? (
          <>
            <h1 className="display text-[20px] font-semibold">{t('service.notFound.title')}</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-ink-muted)]">
              {t('service.notFound.message')}
            </p>
            {service.error instanceof ApiError && service.error.message ? (
              <p className="mt-2 text-[13px] text-[var(--color-ink-faint)]">{service.error.message}</p>
            ) : null}
            <Link to="/services" className="btn btn-primary mt-4">
              {t('service.back')}
            </Link>
          </>
        ) : (
          <ErrorBanner error={service.error} onRetry={service.reload} />
        )}
      </Card>
    );
  }

  if (!detail) return null;

  return (
    <div>
      <Link to="/services" className="micro inline-block hover:text-[var(--color-ink)]">
        ← {t('service.back')}
      </Link>

      <PageHeader
        title={localizedName(detail)}
        subtitle={detail.category ? localizedName(detail.category) : undefined}
        actions={
          detail.estimatedTime ? (
            <StatusPill tone="info" label={t('service.estimated', { value: detail.estimatedTime })} />
          ) : null
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
        <Card title={t('service.features')}>
          <p className="flex items-baseline gap-2">
            <Money minor={detail.priceMinor} currency={detail.currency} className="text-[26px] font-semibold" />
            <span className="text-[13px] text-[var(--color-ink-muted)]">{t(unitKey(detail.priceUnit))}</span>
          </p>

          <p className="mt-2 text-[13px] text-[var(--color-ink-muted)] num">
            {t('service.limits', { min: formatNumber(minQuantity), max: formatNumber(maxQuantity) })}
          </p>

          <ul className="mt-4 flex flex-wrap gap-2">
            {detail.supportsRefill ? <li className="pill pill-ok">{t('service.feature.refill')}</li> : null}
            {detail.supportsCancel ? <li className="pill pill-info">{t('service.feature.cancel')}</li> : null}
            {detail.supportsDripFeed ? <li className="pill pill-accent">{t('service.feature.drip')}</li> : null}
          </ul>

          {detail.variants.length > 0 ? (
            <div className="mt-5">
              <p className="label">{t('service.variant.label')}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {detail.variants.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={`pill ${variantId === entry.id ? 'pill-accent' : 'pill-neutral'}`}
                    aria-pressed={variantId === entry.id}
                    onClick={() => setVariantId(entry.id)}
                  >
                    {localizedName(entry)} ·{' '}
                    <Money minor={entry.priceMinor} currency={detail.currency} className="text-[12px]" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </Card>

        <Card title={t('service.form.title')} className="lg:sticky lg:top-20 lg:self-start">
          <div className="flex flex-col gap-4">
            <TextField
              label={t('service.target.label')}
              hint={t(`service.target.hint.${detail.inputType}` as never)}
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              required
              autoComplete="off"
            />

            <TextField
              label={t('service.quantity.label')}
              hint={t('service.quantity.hint', { min: formatNumber(minQuantity), max: formatNumber(maxQuantity) })}
              value={quantityInput}
              onChange={(event) => setQuantityInput(event.target.value)}
              inputMode="numeric"
              required
              className="num"
              error={quantity > 0 && !quantityValid ? t('service.quantity.hint', { min: formatNumber(minQuantity), max: formatNumber(maxQuantity) }) : undefined}
            />

            <TextField
              label={t('service.coupon.label')}
              hint={t('service.coupon.hint')}
              value={coupon}
              onChange={(event) => setCoupon(event.target.value.toUpperCase())}
              autoComplete="off"
            />

            <div className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-sunken)] p-3">
              {quote.loading && !price ? (
                <p className="flex items-center gap-2 text-[13px] text-[var(--color-ink-muted)]">
                  <Spinner className="h-4 w-4" /> {t('common.loading')}
                </p>
              ) : price ? (
                <dl className="flex flex-col gap-1.5 text-[13px]">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[var(--color-ink-muted)]">
                      {t('service.quote.unit', { unit: formatNumber(price.priceUnit === 'per_item' ? 1 : 1000) })}
                    </dt>
                    <dd>
                      <Money minor={price.unitPriceMinor} currency={price.currency} />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[var(--color-ink-muted)]">{t('service.quote.charge')}</dt>
                    <dd>
                      <Money minor={price.chargeMinor} currency={price.currency} />
                    </dd>
                  </div>
                  {price.discountMinor > 0 ? (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-[var(--color-ok)]">{t('service.quote.discount')}</dt>
                      <dd className="text-[var(--color-ok)]">
                        −<Money minor={price.discountMinor} currency={price.currency} />
                      </dd>
                    </div>
                  ) : null}
                  <div className="mt-1 flex items-center justify-between gap-3 border-t border-[var(--color-line)] pt-2">
                    <dt className="font-semibold">{t('service.quote.total')}</dt>
                    <dd>
                      <Money minor={price.totalMinor} currency={price.currency} className="text-[17px] font-semibold" />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[var(--color-ink-muted)]">{t('service.quote.balance')}</dt>
                    <dd>
                      <Money minor={balanceMinor} currency={price.currency} />
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-[13px] text-[var(--color-ink-muted)]">{t('service.quote.title')}</p>
              )}
            </div>

            {price && !canAfford ? (
              <p className="rounded-[var(--radius-sm)] bg-[var(--color-warn-soft)] px-3 py-2 text-[13px] leading-relaxed text-[var(--color-warn)]">
                {t('service.quote.insufficient', { amount: formatCurrency(shortfall / 100, price.currency) })}
                <Link to="/wallet" className="ms-2 font-semibold underline">
                  {t('nav.wallet')}
                </Link>
              </p>
            ) : null}

            {failure ? <ErrorBanner error={failure} /> : null}

            {!user ? (
              <Link to="/signin" className="btn btn-primary w-full">
                {t('common.signIn')}
              </Link>
            ) : (
              <Button
                className="w-full"
                disabled={submitting || !price || !canAfford || !target.trim() || !quantityValid}
                onClick={submit}
              >
                {submitting
                  ? t('service.submitting')
                  : price
                    ? t('service.submit', { amount: `${formatNumber(price.totalMinor / 100)} ${price.currency}` })
                    : t('common.loading')}
              </Button>
            )}

          </div>
        </Card>
      </div>
    </div>
  );
}
