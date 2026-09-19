/**
 * Pricing-level errors.
 *
 * Every failure the pricing engine can hand to a customer becomes one of the codes below,
 * answered as `{ success: false, error: { code, message, details } }`. The rules (owner's
 * priority, docs/PROGRESS.md §1.1):
 *
 *  - a code is stable, SCREAMING_SNAKE, and documented in `docs/ERROR_CODES.md` — a code that is
 *    not in that file does not exist, and the pricing test suite fails if one is answered;
 *  - the Arabic sentence says what happened, whether money moved, and what to do next; the
 *    English gloss travels in the same string so a client can render either language;
 *  - nothing here forwards a database, driver or supplier message: `details` carries only data we
 *    produced (the allowed quantity range, the minimum order amount).
 *
 * `AppError` is imported rather than re-implemented so the global handler renders the one
 * envelope. Callers must match on `code`, never on `instanceof` (each build entry bundles its own
 * copy of these classes).
 */
import { AppError } from '../../middleware/error-handler.js';

/** Every code this module is allowed to answer with. Kept in sync with docs/ERROR_CODES.md. */
export const PRICING_ERROR_CODES = [
  'PRICING_SERVICE_NOT_FOUND',
  'PRICING_SERVICE_UNAVAILABLE',
  'PRICING_VARIANT_NOT_FOUND',
  'PRICING_PRICE_UNAVAILABLE',
  'PRICING_QUANTITY_OUT_OF_RANGE',
  'PRICING_ORDER_TOO_SMALL',
  'PRICING_COUPON_NOT_FOUND',
  'PRICING_COUPON_EXPIRED',
  'PRICING_COUPON_SCOPE_MISMATCH',
  'PRICING_COUPON_MIN_ORDER',
  'PRICING_COUPON_USAGE_LIMIT',
  'PRICING_COUPON_ALREADY_USED',
] as const;

export type PricingErrorCode = (typeof PRICING_ERROR_CODES)[number];

/** Builds a customer-safe pricing error. `details` is additive data only — never a secret. */
export function pricingError(
  code: PricingErrorCode,
  message: string,
  status = 422,
  details?: Record<string, unknown>,
): AppError {
  return new AppError(code, message, status, details);
}

/** The service (or one of its variants) the customer asked about is not in the catalogue. */
export function serviceNotFound(): AppError {
  return pricingError(
    'PRICING_SERVICE_NOT_FOUND',
    'الخدمة المطلوبة مش موجودة في القائمة، وما اتخصمش أي مبلغ. ارجع لقائمة الخدمات واختر خدمة موجودة، ولو فتحت الرابط من مكان قديم حدّث الصفحة. '
      + '(That service is not in our catalogue — nothing was charged. Pick a service from the list; if you opened an old link, reload the page.)',
    404,
  );
}

/** In the catalogue as a row, but deliberately not on sale right now. */
export function serviceUnavailable(): AppError {
  return pricingError(
    'PRICING_SERVICE_UNAVAILABLE',
    'الخدمة دي مش متاحة للحجز دلوقتي، وما اتخصمش أي مبلغ. اختر خدمة تانية متاحة، ولو محتاجها بالتحديد كلّم الدعم. '
      + '(That service is not on sale at the moment — nothing was charged. Choose another service, or contact support if you need this one.)',
    422,
  );
}

export function variantNotFound(): AppError {
  return pricingError(
    'PRICING_VARIANT_NOT_FOUND',
    'الخيار اللي اخترته مش موجود أو مش متاح في الخدمة دي، وما اتخصمش أي مبلغ. ارجع للخدمة واختر خيارًا من القائمة المعروضة. '
      + '(That option is not available for this service — nothing was charged. Reopen the service and pick an option from the list.)',
    404,
  );
}

/** The service row carries no price and no supplier cost to derive one from. */
export function priceUnavailable(): AppError {
  return pricingError(
    'PRICING_PRICE_UNAVAILABLE',
    'سعر الخدمة دي لسه ما اتحددش من عندنا، فمش قادرين نحسب المبلغ النهائي، وما اتخصمش أي مبلغ. اختر خدمة تانية متاحة، ولو محتاج الخدمة دي كلّم الدعم يحدّد سعرها. '
      + '(This service has no price set yet, so we cannot work out the total — nothing was charged. Choose another service, or contact support so we can price this one.)',
    409,
  );
}

export function quantityOutOfRange(minQuantity: number, maxQuantity: number): AppError {
  return pricingError(
    'PRICING_QUANTITY_OUT_OF_RANGE',
    `الكمية اللي طلبتها بره النطاق المسموح للخدمة دي (من ${minQuantity} إلى ${maxQuantity})، وما اتخصمش أي مبلغ. صحّح الكمية داخل النطاق وجرّب تاني. `
      + `(The quantity is outside what this service allows (${minQuantity} to ${maxQuantity}) — nothing was charged. Use a quantity inside that range and try again.)`,
    422,
    { minQuantity, maxQuantity },
  );
}

export function orderTooSmall(orderMinMinor: number, totalMinor: number): AppError {
  return pricingError(
    'PRICING_ORDER_TOO_SMALL',
    'قيمة الطلب أقل من أقل مبلغ نقدر نستقبله، وما اتخصمش أي مبلغ. زوّد الكمية شوية لحد ما قيمة الطلب تبقى أكبر، وجرّب تاني. '
      + '(The order total is below the smallest amount we accept — nothing was charged. Increase the quantity a little and try again.)',
    422,
    { orderMinMinor, totalMinor },
  );
}

export function couponNotFound(): AppError {
  return pricingError(
    'PRICING_COUPON_NOT_FOUND',
    'كود الكوبون ده مش موجود عندنا أو مش مفعّل، وما اتخصمش أي مبلغ. راجع الكود مظبوط زي ما وصلك، أو كمّل من غير كوبون. '
      + '(That coupon code does not exist or is not active — nothing was charged. Check the code, or continue without a coupon.)',
    404,
  );
}

export function couponExpired(): AppError {
  return pricingError(
    'PRICING_COUPON_EXPIRED',
    'الكوبون ده مش ساري دلوقتي (إما انتهى أو لسه ما بدأش)، وما اتخصمش أي مبلغ. استخدم كوبونًا ساريًا، أو كمّل من غير كوبون. '
      + '(That coupon is not valid at the moment — it has expired or has not started — and nothing was charged. Use a valid coupon, or continue without one.)',
    422,
  );
}

export function couponScopeMismatch(): AppError {
  return pricingError(
    'PRICING_COUPON_SCOPE_MISMATCH',
    'الكوبون ده مخصَّص لقسم أو خدمة تانية، وما اتخصمش أي مبلغ. طبّقه على الخدمة المخصَّص لها، أو كمّل من غير الكوبون. '
      + '(That coupon belongs to another category or service — nothing was charged. Apply it to the service it belongs to, or continue without it.)',
    422,
  );
}

export function couponMinOrder(minOrderMinor: number): AppError {
  return pricingError(
    'PRICING_COUPON_MIN_ORDER',
    'الكوبون ده بيشتغل لما قيمة الطلب توصل حد أدنى، والطلب الحالي أقل من كده، وما اتخصمش أي مبلغ. زوّد الكمية لحد ما توصله، أو كمّل من غير الكوبون. '
      + '(This coupon needs a larger order before it applies — nothing was charged. Increase the quantity up to the minimum, or continue without the coupon.)',
    422,
    { minOrderMinor },
  );
}

export function couponUsageLimit(): AppError {
  return pricingError(
    'PRICING_COUPON_USAGE_LIMIT',
    'الكوبون ده وصل للحد الأقصى لعدد مرات الاستخدام، وما اتخصمش أي مبلغ. كمّل من غير الكوبون، ولو محتاج مساعدة كلّم الدعم. '
      + '(This coupon has reached its maximum number of uses — nothing was charged. Continue without it, or contact support.)',
    409,
  );
}

export function couponAlreadyUsed(perUserLimit: number): AppError {
  return pricingError(
    'PRICING_COUPON_ALREADY_USED',
    `الكوبون ده استخدمته قبل كده، وكل عميل يقدر يستخدمه ${perUserLimit} مرة، وما اتخصمش أي مبلغ. كمّل من غير الكوبون أو استخدم كوبونًا تاني. `
      + `(You have already used this coupon, which allows ${perUserLimit} use(s) per customer — nothing was charged. Continue without it, or use another code.)`,
    409,
    { perUserLimit },
  );
}
