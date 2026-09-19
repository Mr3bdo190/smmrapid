import type { Locale } from './locale';

/**
 * ── THE error catalogue ───────────────────────────────────────────────────────────────────────
 *
 * Every error a customer can see is defined **here and only here**: a code maps to a title (what
 * happened), a message (why, in plain language) and a nextStep (exactly what to do now), in both
 * Arabic and English, plus an optional `actionLabel` for the button that performs that next step.
 *
 * Why one module: the API, the client and the UI all speak in codes. If the copy lived next to
 * each call site, a new server code would eventually reach a customer as a blank banner. Here a
 * code that has no copy is a **compile-time error** (`ErrorCatalogue` is a mapped type over the
 * `ErrorCode` union), and a code that is not in the union at all still degrades safely through
 * `describeError` → `UNKNOWN_ERROR_COPY` + the server message + the support reference.
 *
 * Codes come from:
 *   - `apps/api/src/middleware/error-handler.ts` (INTERNAL_ERROR, NOT_FOUND, VALIDATION_ERROR)
 *   - `apps/api/src/modules/auth/middleware.ts` (AUTH_REQUIRED, TOKEN_*, ACCOUNT_DISABLED, FORBIDDEN)
 *   - `apps/api/src/modules/auth/routes.ts` (RATE_LIMITED) and the auth/DB config guards
 *   - `apps/api/src/modules/wallet/*` (WALLET_*)
 *   - `apps/api/src/modules/pricing/*` (PRICING_*) — the price calculator's own refusals
 *   - the provider adapters (PROVIDER_*, CREDENTIAL_*) — the names, the HTTP status and the
 *     Arabic wording are kept in step with `docs/ERROR_CODES.md`, which is the contract
 *   - the client itself (NETWORK_ERROR, REQUEST_FAILED) and Firebase Auth (`auth/*`)
 *
 * Rewriting rules for the copy (owner's product priority): short sentences, no server jargon, no
 * blame, always end with an action the customer can actually take.
 */
export const ERROR_CODES = [
  /* ── API: identity & session ─────────────────────────────────────────────────────────────── */
  'AUTH_REQUIRED',
  'TOKEN_INVALID',
  'TOKEN_EXPIRED',
  'ACCOUNT_DISABLED',
  'FORBIDDEN',
  /* ── API: request shape & service health ─────────────────────────────────────────────────── */
  'VALIDATION_ERROR',
  'RATE_LIMITED',
  'NOT_FOUND',
  'INTERNAL_ERROR',
  'DB_UNAVAILABLE',
  'AUTH_NOT_CONFIGURED',
  /* ── wallet (phase 5) ────────────────────────────────────────────────────────────────────── */
  'WALLET_NOT_FOUND',
  'WALLET_INSUFFICIENT_FUNDS',
  'WALLET_LIMIT_EXCEEDED',
  'WALLET_INVALID_CURSOR',
  'WALLET_MOVEMENT_REJECTED',
  /* ── pricing engine (phase 6) — names are the contract, per docs/ERROR_CODES.md ──────────── */
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
  /* ── orders (phase 8) — the money path: one order, one charge ───────────────────────────── */
  'ORDER_NOT_FOUND',
  'ORDER_TARGET_INVALID',
  'ORDER_IDEMPOTENCY_CONFLICT',
  'ORDER_NOT_REPEATABLE',
  'ORDER_DUPLICATE_TARGET',
  'ORDER_DISPATCH_FAILED',
  /* ── payments (phase 9) ─────────────────────────────────────────────────────────────── */
  'PAYMENT_NOT_FOUND',
  'PAYMENT_GATEWAY_OFF',
  'PAYMENT_GATEWAY_UNCONFIGURED',
  'PAYMENT_AMOUNT_OUT_OF_RANGE',
  'PAYMENT_METHOD_INVALID',
  'PAYMENT_WALLET_NUMBER_INVALID',
  'PAYMENT_ALREADY_RESOLVED',
  'PAYMENT_PENDING_CONFIRMATION',
  'PAYMENT_EXPIRED',
  'PAYMENT_GATEWAY_UNREACHABLE',
  'PAYMENT_GATEWAY_REJECTED',
  'PAYMENT_GATEWAY_AUTH_FAILED',
  'PAYMENT_SIGNATURE_INVALID',
  /* ── providers + credentials (phase 7) — names are the contract, per docs/ERROR_CODES.md ─── */
  'PROVIDER_NOT_FOUND',
  'PROVIDER_NOT_CONFIGURED',
  'PROVIDER_ADAPTER_UNKNOWN',
  'PROVIDER_CAPABILITY_UNSUPPORTED',
  'PROVIDER_SLUG_TAKEN',
  'PROVIDER_CONFIG_UNAVAILABLE',
  'PROVIDER_UNREACHABLE',
  'PROVIDER_TIMEOUT',
  'PROVIDER_HTTP_ERROR',
  'PROVIDER_RATE_LIMITED',
  'PROVIDER_EMPTY_RESPONSE',
  'PROVIDER_BAD_RESPONSE',
  'PROVIDER_AUTH_FAILED',
  'PROVIDER_REJECTED',
  'CREDENTIAL_INVALID',
  'CREDENTIAL_UNREADABLE',
  'CREDENTIAL_ENCRYPTION_UNAVAILABLE',
  /* ── client-side synthetic codes ─────────────────────────────────────────────────────────── */
  'NETWORK_ERROR',
  'REQUEST_FAILED',
  /* ── Firebase Auth (client SDK) ──────────────────────────────────────────────────────────── */
  'auth/invalid-email',
  'auth/missing-email',
  'auth/missing-password',
  'auth/weak-password',
  'auth/email-already-in-use',
  'auth/invalid-credential',
  'auth/wrong-password',
  'auth/user-not-found',
  'auth/user-disabled',
  'auth/too-many-requests',
  'auth/network-request-failed',
  'auth/operation-not-allowed',
  'auth/invalid-api-key',
  'auth/api-key-not-valid',
  'auth/unauthorized-domain',
  'auth/configuration-not-found',
  'auth/internal-error',
  'auth/popup-blocked',
  'auth/cancelled-popup-request',
  'auth/requires-recent-login',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** The three sentences the owner requires on every error, plus the next action\'s button label. */
export type ErrorCopy = {
  /** What happened. */
  title: string;
  /** Why it happened, in plain language. */
  message: string;
  /** Exactly what to do next. */
  nextStep: string;
  /** Button label for that next step, when a specific action exists. */
  actionLabel?: string;
};

type LocaleCopy = { readonly en: ErrorCopy; readonly ar: ErrorCopy };

/** A mapped type over the code union: a missing code, locale or sentence fails the typecheck. */
export type ErrorCatalogue = { readonly [C in ErrorCode]: LocaleCopy };

/**
 * Copy for a code that is not in the catalogue (a newer server, a typo in a code, a brand-new
 * phase). This is intentionally never blank and never a stack trace.
 */
export const UNKNOWN_ERROR_COPY: Readonly<Record<Locale, ErrorCopy>> = {
  en: {
    title: 'Something unexpected went wrong',
    message: 'We could not complete this operation. Nothing was changed on your account.',
    nextStep: 'Try again in a moment. If it happens again, send us the reference below and we will sort it out with you.',
  },
  ar: {
    title: 'حصل خطأ غير متوقع',
    message: 'العملية ما اكتملتش، ومفيش أي حاجة اتغيرت في حسابك.',
    nextStep: 'جرّب تاني بعد لحظات. لو حصل تاني، ابعتلنا رقم المرجع اللي تحت ونحلّها معاك.',
  },
};

export const ERROR_CATALOGUE: ErrorCatalogue = {
  /* ── identity & session ──────────────────────────────────────────────────────────────────── */
  AUTH_REQUIRED: {
    en: { title: 'You need to sign in', message: 'We cannot show your details because there is no signed-in session on this device.', nextStep: 'Sign in again and pick up where you left off.', actionLabel: 'Sign in again' },
    ar: { title: 'لازم تسجّل دخول الأول', message: 'مش قادرين نعرض بياناتك لأن مفيش جلسة دخول مفتوحة على الجهاز ده.', nextStep: 'سجّل دخول من جديد وكمّل من حيث وقفت.', actionLabel: 'سجّل دخول من جديد' },
  },
  TOKEN_INVALID: {
    en: { title: 'Your sign-in is not valid any more', message: 'The sign-in key on this device does not match your account, so we stopped the request.', nextStep: 'Sign out and sign in again.', actionLabel: 'Sign in again' },
    ar: { title: 'تسجيل دخولك مش صالح خلاص', message: 'مفتاح الدخول اللي على الجهاز ده مش مطابق لحسابك، فوقفنا الطلب.', nextStep: 'اخرج وسجّل دخول من جديد.', actionLabel: 'سجّل دخول من جديد' },
  },
  TOKEN_EXPIRED: {
    en: { title: 'Your session has expired', message: 'Sessions end after a long period without activity. This is normal and nothing was lost.', nextStep: 'Sign in again to carry on.', actionLabel: 'Sign in again' },
    ar: { title: 'انتهت مدة الجلسة', message: 'الجلسة بتنتهي بعد فترة طويلة من غير استخدام، وده طبيعي ومفيش أي حاجة اتضاعت.', nextStep: 'سجّل دخول من جديد وكمّل.', actionLabel: 'سجّل دخول من جديد' },
  },
  ACCOUNT_DISABLED: {
    en: { title: 'Your account is on hold', message: 'This account is not active right now, so access to it is paused.', nextStep: 'Contact support with the reference below and we will review the account quickly.', actionLabel: 'Contact support' },
    ar: { title: 'حسابك موقوف مؤقتًا', message: 'الحساب مش نشط حاليًا، فالدخول عليه متوقّف مؤقتًا.', nextStep: 'راسل الدعم مع رقم المرجع اللي تحت وهنراجع الحساب بسرعة.', actionLabel: 'كلّم الدعم' },
  },
  FORBIDDEN: {
    en: { title: 'You do not have access to this', message: 'Your account does not hold the permission this action needs.', nextStep: 'If you need it, contact support and we will review your access.', actionLabel: 'Contact support' },
    ar: { title: 'مالكش صلاحية لكده', message: 'حسابك ما عندوش الصلاحية اللي العملية دي محتاجاها.', nextStep: 'لو محتاجها، كلّم الدعم ونراجع صلاحياتك معاك.', actionLabel: 'كلّم الدعم' },
  },

  /* ── request shape & service health ──────────────────────────────────────────────────────── */
  VALIDATION_ERROR: {
    en: { title: 'Some details are missing or not valid', message: 'The request contained a field that does not match the required format, so nothing was saved.', nextStep: 'Correct the highlighted details and send it again.' },
    ar: { title: 'في بيانات ناقصة أو غير صحيحة', message: 'الطلب فيه حقل مش مطابق للشكل المطلوب، فما اتسجّلش أي حاجة.', nextStep: 'صحّح البيانات المعلَّمة وابعت الطلب تاني.' },
  },
  RATE_LIMITED: {
    en: { title: 'Too many attempts at once', message: 'You have reached the number of attempts allowed in this period.', nextStep: 'Wait a minute, then try again.' },
    ar: { title: 'محاولات كتير في وقت قصير', message: 'وصلت للحد المسموح بيه من المحاولات في الفترة دي.', nextStep: 'استنى دقيقة وجرّب تاني.' },
  },
  NOT_FOUND: {
    en: { title: 'We could not find that', message: 'The page or the data you asked for does not exist, or it has moved.', nextStep: 'Go back to the previous page and try again.', actionLabel: 'Go back' },
    ar: { title: 'مش لاقيين اللي بتطلبه', message: 'الصفحة أو البيانات اللي طلبتها مش موجودة، أو اتنقلت من مكانها.', nextStep: 'ارجع للصفحة اللي قبلها وجرّب تاني.', actionLabel: 'رجوع' },
  },
  INTERNAL_ERROR: {
    en: { title: 'Something went wrong on our side', message: 'The operation did not complete and nothing on your account was changed.', nextStep: 'Try again. If it repeats, send us the reference below and we will trace it.' },
    ar: { title: 'حصل خطأ من عندنا', message: 'العملية ما اكتملتش، ومفيش أي حاجة اتغيرت في حسابك.', nextStep: 'جرّب تاني، ولو تكرر ابعتلنا رقم المرجع اللي تحت وهنتبعه.' },
  },
  DB_UNAVAILABLE: {
    en: { title: 'The service is unavailable for a moment', message: 'Our database is not reachable right now, so nothing was changed.', nextStep: 'Wait a minute and try again. If it keeps happening, send us the reference below.' },
    ar: { title: 'الخدمة مش متاحة لحظة', message: 'قاعدة البيانات مش متاحة دلوقتي، فمفيش أي تغيير حصل.', nextStep: 'استنى دقيقة وجرّب تاني. لو المشكلة كملت، ابعتلنا رقم المرجع اللي تحت.' },
  },
  AUTH_NOT_CONFIGURED: {
    en: { title: 'Sign-in is temporarily unavailable', message: 'The sign-in service is not fully configured on the server yet, so signing in is paused.', nextStep: 'Try again shortly. If it stays down, contact support and we will finish the setup.', actionLabel: 'Contact support' },
    ar: { title: 'تسجيل الدخول مش متاح مؤقتًا', message: 'خدمة تسجيل الدخول لسه مش مكتملة الإعدادات على السيرفر، فالدخول متوقّف.', nextStep: 'جرّب بعد شوية. لو فضلت واقفة، كلّم الدعم ونكمّل الإعداد.', actionLabel: 'كلّم الدعم' },
  },

  /* ── wallet ──────────────────────────────────────────────────────────────────────────────── */
  WALLET_NOT_FOUND: {
    en: { title: 'Your wallet is not ready yet', message: 'This account does not have a wallet row yet, so nothing was charged.', nextStep: 'Sign in again so we can provision it. If it stays like this, contact support.', actionLabel: 'Sign in again' },
    ar: { title: 'محفظتك لسه مش جاهزة', message: 'الحساب ده لسه مالوش محفظة، فما اتخصمش أي مبلغ.', nextStep: 'سجّل دخول من جديد ونجهّزها لك. لو فضلت زي ما هي، كلّم الدعم.', actionLabel: 'سجّل دخول من جديد' },
  },
  WALLET_INSUFFICIENT_FUNDS: {
    en: { title: 'Your balance is not enough', message: 'The available balance does not cover this operation, so nothing was charged.', nextStep: 'Top up your wallet, or lower the amount, then try again.', actionLabel: 'Add funds' },
    ar: { title: 'رصيدك لا يكفي لإتمام الطلب', message: 'الرصيد المتاح في المحفظة أقل من المبلغ المطلوب، ولم يتم خصم أي مبلغ.', nextStep: 'أضف رصيدًا للمحفظة، ثم أعد المحاولة.', actionLabel: 'أضف رصيدًا' },
  },
  WALLET_LIMIT_EXCEEDED: {
    en: { title: 'That amount is above your limit', message: 'The operation is larger than the limit allowed on this account, so nothing was charged.', nextStep: 'Use a smaller amount. If you need a higher limit, contact support and we will review it.', actionLabel: 'Contact support' },
    ar: { title: 'المبلغ أكبر من الحد المسموح', message: 'العملية أكبر من الحد المسموح لحسابك، فما اتخصمش أي مبلغ.', nextStep: 'استخدم مبلغًا أصغر. ولو محتاج حد أعلى، كلّم الدعم ونراجعه معاك.', actionLabel: 'كلّم الدعم' },
  },
  WALLET_INVALID_CURSOR: {
    en: { title: 'This list is out of date', message: 'The position you were reading from is no longer valid, so we did not show the next page.', nextStep: 'Reload the list and continue from the start.', actionLabel: 'Reload' },
    ar: { title: 'القائمة دي قديمة', message: 'نقطة القراءة اللي كنت واقف عندها مبقتش صالحة، فعرضنا الصفحة اللي بعدها لسه.', nextStep: 'حدّث القائمة وابدأ من الأول.', actionLabel: 'حدّث القائمة' },
  },
  WALLET_MOVEMENT_REJECTED: {
    en: { title: 'The movement was rejected by the ledger', message: 'Our ledger refused this movement, so nothing was charged or added.', nextStep: 'Try again once. If it is rejected again, contact support with the code and reference below.', actionLabel: 'Contact support' },
    ar: { title: 'الحركة اترفضت من الدفتر', message: 'دفتر الحسابات رفض الحركة دي، فما اتخصمش وما اتضافش أي مبلغ.', nextStep: 'جرّب مرة تانية. ولو اترفضت تاني، كلّم الدعم مع الكود ورقم المرجع اللي تحت.', actionLabel: 'كلّم الدعم' },
  },

  /* ── pricing engine (phase 6) ─────────────────────────────────────────────────────────────── */
  PRICING_SERVICE_NOT_FOUND: {
    en: { title: 'That service is not available', message: 'The service you asked for is no longer in our list, so nothing was charged.', nextStep: 'Go back to the services and pick one that is there. If you opened an old link, reload the page.', actionLabel: 'Back to services' },
    ar: { title: 'الخدمة دي مش متاحة', message: 'الخدمة اللي طلبتها مبقتش موجودة في القائمة عندنا، فما اتخصمش أي مبلغ.', nextStep: 'ارجع لقائمة الخدمات واختار خدمة موجودة. ولو فتحت رابط قديم، حدّث الصفحة.', actionLabel: 'رجوع للخدمات' },
  },
  PRICING_SERVICE_UNAVAILABLE: {
    en: { title: 'This service is paused for now', message: 'We are not taking orders for this service at the moment, so nothing was charged.', nextStep: 'Choose another service that is available. If you need this one in particular, contact support.', actionLabel: 'Contact support' },
    ar: { title: 'الخدمة دي متوقفة مؤقتًا', message: 'مش بنستقبل طلبات على الخدمة دي دلوقتي، فما اتخصمش أي مبلغ.', nextStep: 'اختار خدمة تانية متاحة. ولو محتاج الخدمة دي بالتحديد، كلّم الدعم.', actionLabel: 'كلّم الدعم' },
  },
  PRICING_VARIANT_NOT_FOUND: {
    en: { title: 'That option is not available', message: 'The option you picked is not offered for this service, so nothing was charged.', nextStep: 'Reopen the service and choose one of the options shown in the list.' },
    ar: { title: 'الخيار ده مش متاح', message: 'الخيار اللي اخترته مش متاح في الخدمة دي، فما اتخصمش أي مبلغ.', nextStep: 'افتح الخدمة تاني واختار خيارًا من القائمة المعروضة.' },
  },
  PRICING_PRICE_UNAVAILABLE: {
    en: { title: 'This service has no price yet', message: 'We cannot work out the total for this service because its price is not set, so nothing was charged.', nextStep: 'Choose another service, or contact support so we can price this one.', actionLabel: 'Contact support' },
    ar: { title: 'سعر الخدمة دي لسه ما اتحددش', message: 'مش قادرين نحسب المبلغ النهائي للخدمة دي لأن سعرها لسه ما اتحددش، فما اتخصمش أي مبلغ.', nextStep: 'اختار خدمة تانية، أو كلّم الدعم نحدّد سعر الخدمة دي.', actionLabel: 'كلّم الدعم' },
  },
  PRICING_QUANTITY_OUT_OF_RANGE: {
    en: { title: 'That quantity is outside the allowed range', message: 'This service takes a quantity between the minimum and the maximum shown on its page, and nothing was charged.', nextStep: 'Set a quantity inside that range and try again.' },
    ar: { title: 'الكمية بره النطاق المسموح', message: 'الخدمة دي بتقبل كمية من الحد الأدنى للحد الأقصى اللي مكتوب في صفحتها، وما اتخصمش أي مبلغ.', nextStep: 'حدّد كمية داخل النطاق ده وجرّب تاني.' },
  },
  PRICING_ORDER_TOO_SMALL: {
    en: { title: 'The order is below our smallest amount', message: 'The total is smaller than the least we can accept, so nothing was charged.', nextStep: 'Increase the quantity a little and try again.' },
    ar: { title: 'قيمة الطلب أقل من الحد الأدنى', message: 'قيمة الطلب أقل من أقل مبلغ نقدر نستقبله، فما اتخصمش أي مبلغ.', nextStep: 'زوّد الكمية شوية وجرّب تاني.' },
  },
  PRICING_COUPON_NOT_FOUND: {
    en: { title: 'That coupon code is not valid', message: 'We have no active coupon with that code, so nothing was charged.', nextStep: 'Check the code and type it exactly as you received it, or continue without a coupon.' },
    ar: { title: 'كود الكوبون مش صحيح', message: 'مفيش كوبون مفعّل بالكود ده عندنا، فما اتخصمش أي مبلغ.', nextStep: 'راجع الكود واكتبه بالظبط زي ما وصلك، أو كمّل من غير كوبون.' },
  },
  PRICING_COUPON_EXPIRED: {
    en: { title: 'This coupon is not valid now', message: 'The coupon has expired or has not started yet, so nothing was charged.', nextStep: 'Use a valid coupon, or continue without one.' },
    ar: { title: 'الكوبون ده مش ساري دلوقتي', message: 'الكوبون إما انتهى أو لسه ما بدأش، فما اتخصمش أي مبلغ.', nextStep: 'استخدم كوبونًا ساريًا، أو كمّل من غير كوبون.' },
  },
  PRICING_COUPON_SCOPE_MISMATCH: {
    en: { title: 'This coupon is for another service', message: 'The coupon belongs to a different category or service, so nothing was charged.', nextStep: 'Apply it to the service it belongs to, or continue without it.' },
    ar: { title: 'الكوبون ده لخدمة تانية', message: 'الكوبون مخصَّص لقسم أو خدمة تانية، فما اتخصمش أي مبلغ.', nextStep: 'طبّقه على الخدمة المخصَّص لها، أو كمّل من غير الكوبون.' },
  },
  PRICING_COUPON_MIN_ORDER: {
    en: { title: 'This coupon needs a larger order', message: 'The coupon only applies from a minimum order value, and this order is below it, so nothing was charged.', nextStep: 'Increase the quantity until you reach that minimum, or continue without the coupon.' },
    ar: { title: 'الكوبون محتاج طلب أكبر', message: 'الكوبون بيشتغل لما قيمة الطلب توصل حد أدنى، والطلب الحالي أقل من كده، فما اتخصمش أي مبلغ.', nextStep: 'زوّد الكمية لحد ما توصل الحد الأدنى، أو كمّل من غير الكوبون.' },
  },
  PRICING_COUPON_USAGE_LIMIT: {
    en: { title: 'This coupon has been used up', message: 'The coupon reached its maximum number of uses, so nothing was charged.', nextStep: 'Continue without the coupon. If you think this is wrong, contact support.', actionLabel: 'Contact support' },
    ar: { title: 'الكوبون ده استُخدم بالكامل', message: 'الكوبون وصل للحد الأقصى لعدد مرات الاستخدام، فما اتخصمش أي مبلغ.', nextStep: 'كمّل من غير الكوبون. ولو شايف إن ده غلط، كلّم الدعم.', actionLabel: 'كلّم الدعم' },
  },
  PRICING_COUPON_ALREADY_USED: {
    en: { title: 'You have already used this coupon', message: 'Each customer may use this coupon a limited number of times, and you have reached it, so nothing was charged.', nextStep: 'Continue without the coupon, or use a different code.' },
    ar: { title: 'استخدمت الكوبون ده قبل كده', message: 'كل عميل يقدر يستخدم الكوبون ده عدد مرات محدود، وانت وصلت للنهاية، فما اتخصمش أي مبلغ.', nextStep: 'كمّل من غير الكوبون، أو استخدم كودًا تاني.' },
  },

  /* ── orders (phase 8) ─────────────────────────────────────────────────────────────────────── */
  ORDER_NOT_FOUND: {
    en: { title: 'We cannot find that order', message: 'This order is not on your account, so there is nothing to show.', nextStep: 'Check the order number again. If you are sure it is right, contact support.', actionLabel: 'Contact support' },
    ar: { title: 'مش لاقيين الطلب ده', message: 'الطلب ده مش موجود على حسابك، فمفيش حاجة نعرضها.', nextStep: 'راجع رقم الطلب تاني. ولو متأكد إنه صح، كلّم الدعم ونشوفه معاك.', actionLabel: 'كلّم الدعم' },
  },
  ORDER_TARGET_INVALID: {
    en: { title: 'That link cannot be used', message: 'The link or username does not fit this service, so nothing was ordered and nothing was charged.', nextStep: 'Correct the link or username and try again.', actionLabel: 'Try again' },
    ar: { title: 'الرابط ده مش صالح', message: 'الرابط أو اليوزر مش مناسب للخدمة دي، فما اتعملش أي طلب وما اتخصمش أي مبلغ.', nextStep: 'صلّح الرابط أو اليوزر وجرّب تاني.', actionLabel: 'جرّب تاني' },
  },
  ORDER_IDEMPOTENCY_CONFLICT: {
    en: { title: 'This request was already used', message: 'The same attempt was sent earlier with different details, so no order was created.', nextStep: 'Start the order again from the form.', actionLabel: 'Start again' },
    ar: { title: 'المحاولة دي اتستخدمت قبل كده', message: 'نفس المحاولة اتبعتت قبل كده ببيانات مختلفة، فما اتعملش أي طلب.', nextStep: 'ابدأ الطلب من جديد من الفورم.', actionLabel: 'ابدأ من جديد' },
  },
  ORDER_NOT_REPEATABLE: {
    en: { title: 'This order cannot be repeated', message: 'The service stopped, or its price and quantity range changed, so we cannot place the same order again.', nextStep: 'Pick another service, or try again in a little while.', actionLabel: 'Choose a service' },
    ar: { title: 'مش ممكن تكرر الطلب ده', message: 'الخدمة اتوقفت، أو سعرها ومدى الكمية اتغيّروا، فمش ممكن نعمل نفس الطلب تاني.', nextStep: 'اختار خدمة تانية، أو جرّب تاني بعد شوية.', actionLabel: 'اختار خدمة' },
  },
  ORDER_DUPLICATE_TARGET: {
    en: { title: 'You already have an open order for this link', message: 'Two open orders for the same service and the same link would compete with each other, so we did not create a second one.', nextStep: 'Wait for the current order to finish, or contact support if you really need a second one.', actionLabel: 'Contact support' },
    ar: { title: 'عندك طلب مفتوح على نفس الرابط', message: 'طلبين مفتوحين على نفس الخدمة ونفس الرابط بيزاحموا بعض، فما عملناش طلب تاني.', nextStep: 'استنى الطلب الحالي يخلّص، أو كلّم الدعم لو محتاج طلب تاني فعلًا.', actionLabel: 'كلّم الدعم' },
  },
  ORDER_DISPATCH_FAILED: {
    en: { title: 'We cannot send this order right now', message: 'The supplier for this service is not reachable from our side, so the order was not submitted and nothing extra was charged.', nextStep: 'We retry automatically. If it stays like this, contact support with the reference below.', actionLabel: 'Contact support' },
    ar: { title: 'مش قادرين نرسل الطلب دلوقتي', message: 'مزوّد الخدمة دي مش متاح من عندنا، فما ابعتناش الطلب وما اتخصمش أي مبلغ إضافي.', nextStep: 'بنجرّب تلقائيًا. ولو المشكلة كملت، كلّم الدعم برقم المرجع اللي تحت.', actionLabel: 'كلّم الدعم' },
  },
  /* ── payments (phase 9) ─────────────────────────────────────────────────────────────────── */
  PAYMENT_NOT_FOUND: {
    en: { title: 'We cannot find that payment', message: 'This payment is not on your account, so there is nothing to show.', nextStep: 'Check the payment number again. If you are sure it is right, contact support.', actionLabel: 'Contact support' },
    ar: { title: 'مش لاقيين عملية الدفع دي على حسابك', message: 'مش لاقيين عملية الدفع دي على حسابك.', nextStep: 'راجع رقم العملية، ولو متأكد إنه صح كلّم الدعم.', actionLabel: 'Contact support' },
  },
  PAYMENT_GATEWAY_OFF: {
    en: { title: 'This deposit method is paused', message: 'We are not accepting deposits through this method right now, so no payment was started.', nextStep: 'Choose another method, or try again later.', actionLabel: 'Choose a method' },
    ar: { title: 'طريقة الدفع دي متوقفة مؤقتًا', message: 'طريقة الدفع دي متوقفة مؤقتًا.', nextStep: 'اختار طريقة دفع تانية، أو جرّب تاني بعد شوية.', actionLabel: 'Choose a method' },
  },
  PAYMENT_GATEWAY_UNCONFIGURED: {
    en: { title: 'This deposit method is not ready yet', message: 'The provider credentials for this method are missing on our side, so no payment was started.', nextStep: 'Try another method. If every method is unavailable, contact support.', actionLabel: 'Contact support' },
    ar: { title: 'طريقة الدفع دي لسه مش مظبوطة عندنا', message: 'طريقة الدفع دي لسه مش مظبوطة عندنا.', nextStep: 'جرّب طريقة تانية، وكلّم الدعم لو كل الطرق واقفة.', actionLabel: 'Contact support' },
  },
  PAYMENT_AMOUNT_OUT_OF_RANGE: {
    en: { title: 'That amount is not allowed', message: 'The amount is outside the range this method accepts, so nothing was charged.', nextStep: 'Enter an amount inside the range shown on the page.', actionLabel: 'Change amount' },
    ar: { title: 'المبلغ المطلوب أكبر أو أصغر من المسموح', message: 'المبلغ المطلوب أكبر أو أصغر من المسموح.', nextStep: 'ادخل مبلغ داخل الحدود المكتوبة في الصفحة.', actionLabel: 'Change amount' },
  },
  PAYMENT_METHOD_INVALID: {
    en: { title: 'That wallet is not supported', message: 'The chosen wallet is not one of the methods this provider supports.', nextStep: 'Pick one of the wallets offered on the page.', actionLabel: 'Choose a method' },
    ar: { title: 'طريقة الدفع المختارة مش متاحة', message: 'طريقة الدفع المختارة مش متاحة.', nextStep: 'اختار واحدة من الطرق المعروضة.', actionLabel: 'Choose a method' },
  },
  PAYMENT_WALLET_NUMBER_INVALID: {
    en: { title: 'That wallet number is not valid', message: 'The wallet number must be 11 digits, so no payment was started.', nextStep: 'Type your 11-digit wallet number and try again.', actionLabel: 'Fix the number' },
    ar: { title: 'رقم المحفظة غلط — لازم 11 رقم زي 01012345678', message: 'رقم المحفظة غلط — لازم 11 رقم زي 01012345678.', nextStep: 'اكتب رقم المحفظة صح وجرّب تاني.', actionLabel: 'Fix the number' },
  },
  PAYMENT_ALREADY_RESOLVED: {
    en: { title: 'This payment is already settled', message: 'The payment was already approved or closed, so this action changed nothing.', nextStep: 'Check the payment status. Contact support if something looks wrong.', actionLabel: 'Contact support' },
    ar: { title: 'عملية الدفع دي اتقفلت خلاص، وما اتغيرش أي حاجة', message: 'عملية الدفع دي اتقفلت خلاص، وما اتغيرش أي حاجة.', nextStep: 'راجع حالة العملية، وابعت تذكرة لو محتاج مساعدة.', actionLabel: 'Contact support' },
  },
  PAYMENT_PENDING_CONFIRMATION: {
    en: { title: 'Waiting for your approval', message: 'Your wallet has not approved the withdrawal yet, so the money has not moved.', nextStep: 'Approve it on your phone (Vodafone: dial *9*1#), then press check again.', actionLabel: 'Check again' },
    ar: { title: 'المحفظة لسه ما أكدتش العملية', message: 'المحفظة لسه ما أكدتش العملية. أكّدها من موبايلك الأول وبعدها اضغط تحديث.', nextStep: 'أكّد العملية من موبايلك (مثلاً *9*1# لفودافون) وبعدها اضغط تحديث.', actionLabel: 'Check again' },
  },
  PAYMENT_EXPIRED: {
    en: { title: 'The confirmation time ran out', message: 'The confirmation window closed, so the payment was cancelled and nothing was charged.', nextStep: 'Start a new deposit if you still want to top up.', actionLabel: 'Start again' },
    ar: { title: 'انتهت مدة التأكيد، فالعملية اتلغت وما اتخصمش أي مبلغ', message: 'انتهت مدة التأكيد، فالعملية اتلغت وما اتخصمش أي مبلغ.', nextStep: 'ابدأ عملية دفع جديدة لو لسه محتاج تشحن.', actionLabel: 'Start again' },
  },
  PAYMENT_GATEWAY_UNREACHABLE: {
    en: { title: 'The payment provider is not answering', message: 'We could not reach the payment provider, so nothing was charged and no payment was created.', nextStep: 'Wait a moment and try again.', actionLabel: 'Try again' },
    ar: { title: 'مزوّد الدفع مش متاح دلوقتي، وما اتخصمش أي مبلغ', message: 'مزوّد الدفع مش متاح دلوقتي، وما اتخصمش أي مبلغ.', nextStep: 'استنى شوية وجرّب تاني.', actionLabel: 'Try again' },
  },
  PAYMENT_GATEWAY_REJECTED: {
    en: { title: 'The payment provider refused this request', message: 'The provider refused the request as sent, so nothing was charged.', nextStep: 'Check your details and try again. Contact support if it keeps happening.', actionLabel: 'Try again' },
    ar: { title: 'مزوّد الدفع رفض الطلب، وما اتخصمش أي مبلغ', message: 'مزوّد الدفع رفض الطلب، وما اتخصمش أي مبلغ.', nextStep: 'راجع البيانات وجرّب تاني، وكلّم الدعم لو تكررت.', actionLabel: 'Try again' },
  },
  PAYMENT_GATEWAY_AUTH_FAILED: {
    en: { title: 'Our payment settings were refused', message: 'The provider refused our credentials, so no payment could start. This one is ours, not yours.', nextStep: 'Contact support — we will fix it. No need to retry right now.', actionLabel: 'Contact support' },
    ar: { title: 'بيانات الدخول بتاعتنا عند مزوّد الدفع اترفضت — المشكلة عندنا مش عندك', message: 'بيانات الدخول بتاعتنا عند مزوّد الدفع اترفضت — المشكلة عندنا مش عندك.', nextStep: 'كلّم الدعم، وما تعيدش المحاولة دلوقتي.', actionLabel: 'Contact support' },
  },
  PAYMENT_SIGNATURE_INVALID: {
    en: { title: 'That notification was not from the provider', message: 'The notification\'s signature did not match, so it was ignored and nothing changed.', nextStep: 'Nothing to do — this is an internal alert.', },
    ar: { title: 'الإشعار ده مش جاي من مزوّد الدفع، فاتجاهلناه', message: 'الإشعار ده مش جاي من مزوّد الدفع، فاتجاهلناه.', nextStep: 'مفيش حاجة مطلوبة منك — ده تنبيه داخلي.', },
  },
  /* ── providers + credentials ────────────────────────────────────────────────────────────── */
  PROVIDER_NOT_FOUND: {
    en: { title: 'That supplier no longer exists', message: 'The supplier we were asked to use is not in our list any more, so nothing was changed.', nextStep: 'Pick a supplier that still exists, or add it again before retrying.', actionLabel: 'Contact support' },
    ar: { title: 'المزوّد ده مش موجود', message: 'المزوّد المطلوب مش موجود عندنا، فما اتغيرش أي حاجة.', nextStep: 'ارجع لقائمة المزوّدين واختار مزوّدًا موجودًا، ولو المزوّد اتمسح أضِفه من جديد.', actionLabel: 'كلّم الدعم' },
  },
  PROVIDER_NOT_CONFIGURED: {
    en: { title: 'This supplier is not configured', message: 'The supplier has no valid API address saved, so we did not contact anyone.', nextStep: 'Contact support and we will save the correct API address (it starts with https://), then try again.', actionLabel: 'Contact support' },
    ar: { title: 'إعدادات المزوّد ناقصة', message: 'بيانات المزوّد ناقصة: مفيش عنوان API صالح، فما اتصلناش بأي مزوّد.', nextStep: 'كلّم الدعم يضيف عنوان API الصحيح للمزوّد (بيبدأ بـ https://)، وبعدين جرّب تاني.', actionLabel: 'كلّم الدعم' },
  },
  PROVIDER_ADAPTER_UNKNOWN: {
    en: { title: 'That supplier type is not supported', message: 'The supplier type selected is not one this system knows, so nothing was changed.', nextStep: 'Choose a supplier type from the supported list, or contact support to add the new type.', actionLabel: 'Contact support' },
    ar: { title: 'نوع المزوّد غير مدعوم', message: 'نوع المزوّد المختار مش مدعوم في النظام، فما اتغيرش أي حاجة.', nextStep: 'اختار نوع مزوّد من القائمة المدعومة، أو كلّم الدعم ونضيف النوع الجديد.', actionLabel: 'كلّم الدعم' },
  },
  PROVIDER_CAPABILITY_UNSUPPORTED: {
    en: { title: 'This supplier cannot do that', message: 'The supplier does not offer this operation — cancelling an order, for example — so nothing was changed.', nextStep: 'Use a supplier that supports it. If you cannot find one, contact support and we will point you to one.', actionLabel: 'Contact support' },
    ar: { title: 'المزوّد ده مش بيدعم العملية دي', message: 'المزوّد مش بيوفّر العملية دي (زي إلغاء الطلب مثلاً)، فما اتغيرش أي حاجة.', nextStep: 'استخدم مزوّدًا بيدعمها، ولو مش لاقي كلّم الدعم وهنوجّهك لمزوّد مناسب.', actionLabel: 'كلّم الدعم' },
  },
  PROVIDER_SLUG_TAKEN: {
    en: { title: 'That short name is taken', message: 'Another supplier is already saved with the same short name, so nothing new was created.', nextStep: 'Choose a different short name (lower-case letters, numbers and dashes) and save again.' },
    ar: { title: 'الاسم المختصر محجوز', message: 'في مزوّد تاني مسجَّل بنفس الاسم المختصر، فما اتعملش أي مزوّد جديد.', nextStep: 'اختار اسمًا مختصرًا مختلف (حروف إنجليزية صغيرة وأرقام وشرطات) واحفظ تاني.' },
  },
  PROVIDER_CONFIG_UNAVAILABLE: {
    en: { title: 'Supplier settings cannot be saved yet', message: 'This version of the database cannot store the supplier operations and fields, so nothing was changed.', nextStep: 'Contact support to apply the database update, then save the settings again.', actionLabel: 'Contact support' },
    ar: { title: 'إعدادات المزوّد مش قابلة للحفظ حاليًا', message: 'النسخة الحالية من قاعدة البيانات مش بتدعم حفظ أسماء العمليات والحقول للمزوّد، فما اتغيرش أي حاجة.', nextStep: 'كلّم الدعم لتطبيق تحديث قاعدة البيانات، وبعدين احفظ الإعدادات تاني.', actionLabel: 'كلّم الدعم' },
  },
  PROVIDER_UNREACHABLE: {
    en: { title: 'We could not reach the supplier', message: 'The supplier network or site did not answer, so nothing was changed.', nextStep: 'Try again in a few minutes. If it keeps happening, contact support to check the address.', actionLabel: 'Try again' },
    ar: { title: 'معرفناش نوصل للمزوّد', message: 'شبكة المزوّد أو موقعه مش مستجيب، فما اتغيرش أي حاجة.', nextStep: 'جرّب تاني بعد كام دقيقة. ولو كملت، كلّم الدعم نتأكد من العنوان.', actionLabel: 'جرّب تاني' },
  },
  PROVIDER_TIMEOUT: {
    en: { title: 'The supplier took too long', message: 'The supplier did not answer before the deadline, so nothing was changed.', nextStep: 'Try again in a moment — and do not resend the same request several times at once.', actionLabel: 'Try again' },
    ar: { title: 'المزوّد اتأخر في الرد', message: 'المزوّد ما ردّش قبل ما المهلة تنتهي، فما اتغيرش أي حاجة.', nextStep: 'جرّب تاني بعد لحظات، ومتبعتش نفس الطلب أكتر من مرة في نفس الوقت.', actionLabel: 'جرّب تاني' },
  },
  PROVIDER_HTTP_ERROR: {
    en: { title: 'The supplier answered with an error', message: 'The supplier returned an error status of its own, so nothing was changed.', nextStep: 'Try again. If the same error comes back, contact support with the time you tried.' },
    ar: { title: 'المزوّد ردّ بخطأ من عنده', message: 'المزوّد ردّ بحالة خطأ من عنده، فما اتغيرش أي حاجة.', nextStep: 'جرّب تاني، ولو رجع نفس الخطأ كلّم الدعم وقولّه وقت المحاولة.' },
  },
  PROVIDER_RATE_LIMITED: {
    en: { title: 'The supplier is asking us to slow down', message: 'We sent too many requests to the supplier at once, so this one was not executed.', nextStep: 'Wait a few minutes and try again.', actionLabel: 'Try again' },
    ar: { title: 'المزوّد بيطلب منّا نهدّي', message: 'بعتنا طلبات كتير للمزوّد في وقت قصير، فالطلب ده ما اتنفّذش.', nextStep: 'استنى كام دقيقة وجرّب تاني.', actionLabel: 'جرّب تاني' },
  },
  PROVIDER_EMPTY_RESPONSE: {
    en: { title: 'The supplier sent nothing we could read', message: 'The supplier answered with an empty response, so nothing was saved.', nextStep: 'Try again in a few minutes. If it repeats, contact support.' },
    ar: { title: 'المزوّد ردّ برد فاضي', message: 'رد المزوّد كان فاضي، فما اتحفظش أي حاجة.', nextStep: 'جرّب تاني بعد كام دقيقة. ولو كررها، كلّم الدعم.' },
  },
  PROVIDER_BAD_RESPONSE: {
    en: { title: 'We could not read the supplier answer', message: 'The supplier answered in a different or incomplete format, so nothing was saved.', nextStep: 'Try again. If it repeats, contact support so we can review the supplier settings.', actionLabel: 'Contact support' },
    ar: { title: 'رد المزوّد مش مفهوم', message: 'المزوّد ردّ بصيغة مختلفة أو ناقصة عن المتوقع، فما اتحفظش أي حاجة.', nextStep: 'جرّب تاني. ولو كررها، كلّم الدعم نراجع إعدادات المزوّد.', actionLabel: 'كلّم الدعم' },
  },
  PROVIDER_AUTH_FAILED: {
    en: { title: 'The supplier refused our API key', message: 'Our supplier key was rejected, so the request was not executed.', nextStep: 'Contact support and we will save the correct supplier API key, then try again.', actionLabel: 'Contact support' },
    ar: { title: 'المزوّد رفض مفتاحنا', message: 'المزوّد رفض مفتاح الـ API بتاعنا، فما اتنفّذش أي حاجة.', nextStep: 'كلّم الدعم يحفظ مفتاح الـ API الصحيح للمزوّد من جديد، وبعدين جرّب تاني.', actionLabel: 'كلّم الدعم' },
  },
  PROVIDER_REJECTED: {
    en: { title: 'The supplier refused this order', message: 'The supplier refused the request — an unsuitable quantity, or a service that is not available — so nothing was executed.', nextStep: 'Check the order details or the service settings. If you need help, contact support.', actionLabel: 'Contact support' },
    ar: { title: 'المزوّد رفض الطلب', message: 'المزوّد رفض الطلب (مثلاً كمية غير مناسبة أو خدمة غير متاحة)، فما اتنفّذش أي حاجة.', nextStep: 'راجع بيانات الطلب أو إعدادات الخدمة، ولو محتاج مساعدة كلّم الدعم.', actionLabel: 'كلّم الدعم' },
  },
  CREDENTIAL_INVALID: {
    en: { title: 'The API key is empty', message: 'No supplier API key was sent, so nothing was saved.', nextStep: 'Enter the supplier API key and save again.' },
    ar: { title: 'مفتاح الـ API فاضي', message: 'مفتاح الـ API الخاص بالمزوّد كان فاضي، فما اتحفظش أي حاجة.', nextStep: 'اكتب مفتاح الـ API الخاص بالمزوّد واحفظ تاني.' },
  },
  CREDENTIAL_UNREADABLE: {
    en: { title: 'The saved API key cannot be read', message: 'The stored key can no longer be decrypted (the encryption key changed, or the data is damaged), so we did not contact the supplier.', nextStep: 'Contact support so we can save the supplier API key again.', actionLabel: 'Contact support' },
    ar: { title: 'مفتاح الـ API المحفوظ مش قابل للقراءة', message: 'المفتاح المخزّن مبقتش نقدر نفكّه (مفتاح التشفير اتغير أو البيانات تلفت)، فما اتصلناش بالمزوّد.', nextStep: 'كلّم الدعم نحفظ مفتاح الـ API من جديد.', actionLabel: 'كلّم الدعم' },
  },
  CREDENTIAL_ENCRYPTION_UNAVAILABLE: {
    en: { title: 'Supplier keys cannot be saved right now', message: 'This server is missing the encryption key that protects supplier credentials, so the API key was not saved.', nextStep: 'Contact support — and do not keep retrying until that key is configured.', actionLabel: 'Contact support' },
    ar: { title: 'مفاتيح المزوّدين مش قابلة للحفظ حاليًا', message: 'مفتاح التشفير اللي بيحمي بيانات المزوّدين مش مظبوط على السيرفر، فمفتاح الـ API ما اتحفظش.', nextStep: 'كلّم الدعم — ومتكررش المحاولة قبل ما المفتاح يتظبط.', actionLabel: 'كلّم الدعم' },
  },
  /* ── client-side synthetic codes ─────────────────────────────────────────────────────────── */
  NETWORK_ERROR: {
    en: { title: 'No connection to the server', message: 'Your device could not reach us, so the request never left your browser.', nextStep: 'Check your internet connection and try again.', actionLabel: 'Try again' },
    ar: { title: 'مفيش اتصال بالسيرفر', message: 'جهازك مش قادر يوصلنا، فالطلب ما خرجش من المتصفح أصلاً.', nextStep: 'اتأكد من اتصال الإنترنت وجرّب تاني.', actionLabel: 'جرّب تاني' },
  },
  REQUEST_FAILED: {
    en: { title: 'The request did not complete', message: 'The request did not reach the server in a usable state.', nextStep: 'Try again. If it keeps failing, contact support.', actionLabel: 'Try again' },
    ar: { title: 'الطلب ما اكتملش', message: 'الطلب ما وصلش للسيرفر بالشكل الصحيح.', nextStep: 'جرّب تاني. ولو فشل كل مرة، كلّم الدعم.', actionLabel: 'جرّب تاني' },
  },

  /* ── Firebase Auth ───────────────────────────────────────────────────────────────────────── */
  'auth/invalid-email': {
    en: { title: 'That email address is not valid', message: 'What you typed is not an email address we can use.', nextStep: 'Write it in this shape: name@example.com' },
    ar: { title: 'البريد الإلكتروني ده غير صحيح', message: 'اللي كتبته مش شكل بريد إلكتروني نقدر نستخدمه.', nextStep: 'اكتبه بالشكل ده: name@example.com' },
  },
  'auth/missing-email': {
    en: { title: 'Your email is required', message: 'The email field is empty.', nextStep: 'Type your email address and try again.' },
    ar: { title: 'البريد الإلكتروني مطلوب', message: 'خانة البريد الإلكتروني فاضية.', nextStep: 'اكتب بريدك الإلكتروني وجرّب تاني.' },
  },
  'auth/missing-password': {
    en: { title: 'Your password is required', message: 'The password field is empty.', nextStep: 'Type your password and try again.' },
    ar: { title: 'كلمة السر مطلوبة', message: 'خانة كلمة السر فاضية.', nextStep: 'اكتب كلمة السر وجرّب تاني.' },
  },
  'auth/weak-password': {
    en: { title: 'That password is too weak', message: 'Passwords must be at least 8 characters long.', nextStep: 'Choose a password of 8 characters or more, and try again.' },
    ar: { title: 'كلمة السر ضعيفة', message: 'كلمة السر لازم تكون 8 أحرف على الأقل.', nextStep: 'اختار كلمة سر من 8 أحرف أو أكتر، وجرّب تاني.' },
  },
  'auth/email-already-in-use': {
    en: { title: 'That email is already registered', message: 'An account with this email already exists with us.', nextStep: 'Sign in with it, or reset the password if you do not remember it.', actionLabel: 'Sign in instead' },
    ar: { title: 'البريد ده مسجّل بالفعل', message: 'في حساب عندنا بنفس البريد ده.', nextStep: 'سجّل دخول بيه، أو استعد كلمة السر لو مش فاكرها.', actionLabel: 'سجّل دخول بيه' },
  },
  'auth/invalid-credential': {
    en: { title: 'Email or password is incorrect', message: 'Those details do not match any account of ours.', nextStep: 'Check both fields and try again, or reset your password.', actionLabel: 'Reset the password' },
    ar: { title: 'البريد أو كلمة السر غلط', message: 'البيانات دي مش مطابقة لأي حساب عندنا.', nextStep: 'راجع الخانتين وجرّب تاني، أو استعد كلمة السر.', actionLabel: 'استعد كلمة السر' },
  },
  'auth/wrong-password': {
    en: { title: 'Email or password is incorrect', message: 'Those details do not match any account of ours.', nextStep: 'Check both fields and try again, or reset your password.', actionLabel: 'Reset the password' },
    ar: { title: 'البريد أو كلمة السر غلط', message: 'البيانات دي مش مطابقة لأي حساب عندنا.', nextStep: 'راجع الخانتين وجرّب تاني، أو استعد كلمة السر.', actionLabel: 'استعد كلمة السر' },
  },
  'auth/user-not-found': {
    en: { title: 'No account with that email', message: 'We have no account registered with this email address.', nextStep: 'Check the address, or create a new account.', actionLabel: 'Create an account' },
    ar: { title: 'مفيش حساب بالبريد ده', message: 'مفيش حساب مسجّل عندنا بالبريد الإلكتروني ده.', nextStep: 'راجع البريد، أو اعمل حساب جديد.', actionLabel: 'اعمل حساب جديد' },
  },
  'auth/user-disabled': {
    en: { title: 'This account is disabled', message: 'Sign-in for this account has been turned off.', nextStep: 'Contact support and we will help you get it back.', actionLabel: 'Contact support' },
    ar: { title: 'الحساب ده موقوف', message: 'تسجيل الدخول للحساب ده متوقّف من عندنا.', nextStep: 'كلّم الدعم وهنساعدك ترجّعه شغال.', actionLabel: 'كلّم الدعم' },
  },
  'auth/too-many-requests': {
    en: { title: 'Too many attempts at once', message: 'Sign-in was blocked temporarily because of repeated attempts.', nextStep: 'Wait a few minutes, or reset your password to get in another way.', actionLabel: 'Reset the password' },
    ar: { title: 'محاولات كتير في وقت قصير', message: 'تسجيل الدخول اتوقف مؤقتًا بسبب تكرار المحاولات.', nextStep: 'استنى كام دقيقة، أو استعد كلمة السر وادخل بطريقة تانية.', actionLabel: 'استعد كلمة السر' },
  },
  'auth/network-request-failed': {
    en: { title: 'We could not reach the sign-in service', message: 'The sign-in request did not reach us, so nothing happened.', nextStep: 'Check your internet connection and try again.', actionLabel: 'Try again' },
    ar: { title: 'تعذّر الوصول لخدمة الدخول', message: 'طلب تسجيل الدخول ما وصلناش، فما حصلش أي حاجة.', nextStep: 'اتأكد من اتصال الإنترنت وجرّب تاني.', actionLabel: 'جرّب تاني' },
  },
  'auth/operation-not-allowed': {
    en: { title: 'This sign-in method is switched off', message: 'Email and password sign-in is not enabled for this project yet.', nextStep: 'Contact support — this is a server-side setting and we will turn it on.', actionLabel: 'Contact support' },
    ar: { title: 'طريقة الدخول دي مش مفعّلة', message: 'تسجيل الدخول بالبريد وكلمة السر مش مفعّل في المشروع ده لسه.', nextStep: 'كلّم الدعم — دي إعدادات على السيرفر وإحنا بنفعّلها.', actionLabel: 'كلّم الدعم' },
  },
  'auth/invalid-api-key': {
    en: { title: 'The project configuration is wrong', message: 'The project key this page is using is not valid, so sign-in cannot run.', nextStep: 'Contact support with the reference below and we will correct it.', actionLabel: 'Contact support' },
    ar: { title: 'إعدادات المشروع غلط', message: 'مفتاح المشروع المستخدم في الصفحة دي مش صالح، فتسجيل الدخول ما ينفعش يشتغل.', nextStep: 'كلّم الدعم مع رقم المرجع اللي تحت ونصلّحها.', actionLabel: 'كلّم الدعم' },
  },
  'auth/api-key-not-valid': {
    en: { title: 'The project configuration is wrong', message: 'The project key this page is using is not valid, so sign-in cannot run.', nextStep: 'Contact support with the reference below and we will correct it.', actionLabel: 'Contact support' },
    ar: { title: 'إعدادات المشروع غلط', message: 'مفتاح المشروع المستخدم في الصفحة دي مش صالح، فتسجيل الدخول ما ينفعش يشتغل.', nextStep: 'كلّم الدعم مع رقم المرجع اللي تحت ونصلّحها.', actionLabel: 'كلّم الدعم' },
  },
  'auth/unauthorized-domain': {
    en: { title: 'This domain is not authorised', message: 'The address you are using is not on the list of domains allowed to sign in.', nextStep: 'Contact support and we will add the domain.', actionLabel: 'Contact support' },
    ar: { title: 'الدومين ده مش مصرّح له', message: 'العنوان اللي بتستخدمه مش مضاف في قائمة الدومينات المسموح لها بالدخول.', nextStep: 'كلّم الدعم ونضيف الدومين.', actionLabel: 'كلّم الدعم' },
  },
  'auth/configuration-not-found': {
    en: { title: 'Sign-in is not set up', message: 'The sign-in settings are missing for this project, so signing in cannot work.', nextStep: 'Contact support and we will finish the setup.', actionLabel: 'Contact support' },
    ar: { title: 'تسجيل الدخول مش متظبّط', message: 'إعدادات تسجيل الدخول ناقصة في المشروع ده، فالدخول ما ينفعش يشتغل.', nextStep: 'كلّم الدعم ونكمّل الإعداد.', actionLabel: 'كلّم الدعم' },
  },
  'auth/internal-error': {
    en: { title: 'Temporary problem in the sign-in service', message: 'The sign-in service returned an unexpected error, so nothing happened.', nextStep: 'Wait a moment and try again.', actionLabel: 'Try again' },
    ar: { title: 'مشكلة مؤقتة في خدمة الدخول', message: 'خدمة الدخول رجّعت خطأ غير متوقع، فما حصلش أي حاجة.', nextStep: 'استنى شوية وجرّب تاني.', actionLabel: 'جرّب تاني' },
  },
  'auth/popup-blocked': {
    en: { title: 'Your browser blocked the pop-up window', message: 'The sign-in window could not open because the browser stopped it.', nextStep: 'Allow pop-ups for this site and try again.' },
    ar: { title: 'المتصفح منع النافذة المنبثقة', message: 'نافذة تسجيل الدخول ما قدرتش تفتح لأن المتصفح منعها.', nextStep: 'اسمح بالنوافذ المنبثقة للموقع ده وجرّب تاني.' },
  },
  'auth/cancelled-popup-request': {
    en: { title: 'The sign-in attempt was cancelled', message: 'The sign-in window was closed before it finished, so nothing happened.', nextStep: 'Try again when you are ready.' },
    ar: { title: 'محاولة الدخول اتلغت', message: 'نافذة تسجيل الدخول اتقفلت قبل ما تكمّل، فما حصلش أي حاجة.', nextStep: 'جرّب تاني لما تكون جاهز.' },
  },
  'auth/requires-recent-login': {
    en: { title: 'Please sign in again', message: 'This action needs a recent sign-in before it can run.', nextStep: 'Sign in again and repeat the action.', actionLabel: 'Sign in again' },
    ar: { title: 'سجّل دخول من جديد', message: 'العملية دي محتاجة جلسة دخول حديثة قبل ما تنفّذ.', nextStep: 'سجّل دخول تاني وكرّر العملية.', actionLabel: 'سجّل دخول من جديد' },
  },
};

const ERROR_CODE_SET: ReadonlySet<string> = new Set(ERROR_CODES);

export function isErrorCode(code: string): code is ErrorCode {
  return ERROR_CODE_SET.has(code);
}

/** The copy for a code, or the unknown-code fallback. Never returns undefined, never blank. */
export function errorCopyFor(code: string, locale: Locale): ErrorCopy {
  return isErrorCode(code) ? ERROR_CATALOGUE[code][locale] : UNKNOWN_ERROR_COPY[locale];
}
