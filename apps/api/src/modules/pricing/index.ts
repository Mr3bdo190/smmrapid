/**
 * Phase 6 — the pricing engine.
 *
 * Public surface of the module. The parent session wires it in with three lines:
 *
 *     // apps/api/src/routes/index.ts
 *     import { createPricingModule } from '../modules/pricing/index.js';
 *     import { pricingDbDeps } from '../modules/pricing/service.js';
 *     const pricing = createPricingModule({ auth: deps.auth, pricing: pricingDbDeps });
 *     app.use('/api/pricing', pricing.router);
 *     app.use('/api/admin/pricing', pricing.adminRouter);
 *
 * and adds the module to the esbuild entry list in apps/api/package.json (see the phase report),
 * so `dist/modules/pricing/*` exists for the tests and for the bundle.
 *
 * What this module owns: how a supplier cost becomes a customer price (`derivePriceFromCost`,
 * `resolveMarkup`), what a quantity costs (`quantityCharge`), what a coupon may take off
 * (`couponDiscount`) and how the catalogue is repriced when a cost or a markup changes
 * (`recomputePrices`). It owns no money movement: charges happen in the wallet module, and the
 * order phase takes a quote from here before it touches the ledger.
 */
export {
  PRICING_DEFAULTS,
  SETTING_KEYS,
  type AdminServicePricing,
  type CouponRecord,
  type CouponScope,
  type CouponType,
  type PricePreview,
  type PricePreviewInput,
  type PricingDeps,
  type PricingModuleDeps,
  type PricingQuote,
  type PricingSettings,
  type PublicServicePrice,
  type PublicVariant,
  type QuoteRequest,
  type RecomputeInput,
  type RecomputeSkipReason,
  type RecomputeSummary,
  type ServicePricingRecord,
  type ServiceRepriceResult,
  type ServiceVariantRecord,
} from './types.js';

export { PRICING_ERROR_CODES, pricingError } from './errors.js';
export type { PricingErrorCode } from './errors.js';

export {
  type MarkupSource,
  type ResolvedMarkup,
  assertOrderNotTooSmall,
  assertPriceAvailable,
  assertQuantityInRange,
  couponAppliesToService,
  couponDiscount,
  derivePriceFromCost,
  isCouponWithinWindow,
  marginMinor,
  marginPercentOf,
  quantityCharge,
  recomputeSkipReason,
  resolveMarkup,
  toIntegerMinor,
  toPercentValue,
  totalAfterDiscount,
} from './engine.js';

export {
  RECOMPUTE_LIMIT,
  RECOMPUTE_REPORT_LIMIT,
  adminServicePricing,
  getServicePrice,
  loadSettings,
  normalizeCouponCode,
  previewPrice,
  pricingDbDeps,
  quote,
  recomputePrices,
  toPricingError,
} from './service.js';

export { PRICING_PERMISSIONS, createPricingModule, optionalAuth } from './routes.js';

/** Re-exported so a caller can render the same envelope from a test or a script. */
export { AppError, errorHandler, notFoundHandler } from '../../middleware/error-handler.js';
