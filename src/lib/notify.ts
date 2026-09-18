import toast from 'react-hot-toast';

const messages: Record<string, string> = {
  'Failed to load data': 'تعذر تحميل البيانات',
  'Failed to load providers': 'تعذر تحميل المزودين',
  'Failed to load services': 'تعذر تحميل الخدمات',
  'Failed to load orders': 'تعذر تحميل الطلبات',
  'Failed to load payments': 'تعذر تحميل المدفوعات',
  'Failed to load categories': 'تعذر تحميل الأقسام',
  'Failed to load provider services': 'تعذر تحميل خدمات المزود',
  'Provider balance unavailable': 'تعذر جلب رصيد المزود حاليًا',
  'Connection test failed': 'تعذر اختبار الاتصال بالمزود',
  'Provider synchronization failed': 'تعذرت مزامنة خدمات المزود',
  'Failed to read synchronization progress': 'تعذر قراءة حالة المزامنة',
  'Bulk update failed': 'تعذر تطبيق التعديل الجماعي',
  'Save failed': 'تعذر حفظ التغييرات',
  'Delete failed': 'تعذر تنفيذ الحذف',
  'Action failed': 'تعذر تنفيذ العملية',
  'Payment failed': 'تعذر إنشاء عملية الدفع',
  'Confirmation failed': 'تعذر تأكيد عملية الدفع',
  'Crypto payment failed': 'تعذر إنشاء فاتورة الدفع الإلكتروني',
  'Invalid coupon': 'كود الخصم غير صالح أو غير متاح',
  'Withdrawal failed': 'تعذر إرسال طلب السحب',
  'Failed to load ticket': 'تعذر تحميل التذكرة',
  'Failed to send message': 'تعذر إرسال الرسالة',
  'Authentication failed': 'تعذر إتمام تسجيل الدخول. راجع البيانات وحاول مرة أخرى.',
  'Your balance is not enough to complete this order.': 'رصيدك الحالي غير كافٍ لإتمام هذا الطلب.',
  'Please enter a valid service link.': 'من فضلك أدخل رابط الخدمة بشكل صحيح.',
  'This service is currently unavailable. Please choose another service.': 'الخدمة غير متاحة حالياً. من فضلك اختر خدمة أخرى.',
  'We could not create your order right now. Your balance was not charged. Please try again.': 'تعذر إنشاء الطلب حالياً. لم يتم خصم أي مبلغ من رصيدك. حاول مرة أخرى.',
};

const ar = () => {
  try { return localStorage.getItem('lang') === 'ar'; } catch { return false; }
};

function translateMessage(input: unknown): string {
  const raw = String(input ?? '').trim();
  if (!raw) return ar() ? 'حدث خطأ غير متوقع. حاول مرة أخرى.' : 'Something went wrong. Please try again.';
  if (messages[raw]) return ar() ? messages[raw] : raw;
  return raw;
}

/**
 * Customer-facing error text.
 *
 * Two kinds of failure exist:
 *  1. Something the CUSTOMER can act on (amount below the minimum, wrong wallet number, not enough
 *     balance, wrong quantity, unavailable service …) → say exactly what to change and how.
 *  2. Something INTERNAL (gateway outage, misconfiguration, database) → reassure the customer that
 *     nothing was charged, tell them what to do next, and give the support reference the admin can
 *     look up in the system logs. Never show the raw cause, provider wording or codes.
 */
const MIN_AMOUNT = (a?: string) => ({
  en: a ? `The minimum deposit is $${a}. Increase the amount and try again.` : 'That amount is below the minimum deposit. Increase the amount and try again.',
  ar: a ? `أقل مبلغ للشحن هو $${a}. زوّد المبلغ وحاول مرة أخرى.` : 'المبلغ أقل من الحد الأدنى للشحن. زوّد المبلغ وحاول مرة أخرى.',
});
const AMOUNT_RANGE = (min?: string, max?: string) => ({
  en: min && max ? `Enter an amount between ${min} and ${max} EGP.` : 'Enter a valid amount for this wallet.',
  ar: min && max ? `اكتب مبلغ من ${min} إلى ${max} جنيه.` : 'اكتب مبلغ صحيح للمحفظة.',
});
const QUANTITY_RANGE = (min?: string, max?: string) => ({
  en: min && max ? `Choose a quantity between ${min} and ${max} for this service.` : 'That quantity is outside what this service allows.',
  ar: min && max ? `اختر كمية بين ${min} و${max} حسب حدود الخدمة.` : 'الكمية خارج الحدود المسموح بها في الخدمة.',
});
const INTERNAL = (ref?: string) => ({
  en: `We could not finish that right now. Nothing was deducted from your balance — please try again in a moment${ref ? `, or contact support with reference ${ref}` : ''}.`,
  ar: `تعذر إتمام العملية حاليًا. لم يتم خصم أي مبلغ من رصيدك — جرّب تاني بعد لحظات${ref ? `، أو راسل الدعم برقم المرجع ${ref}` : ''}.`,
});

const CODE_TEXT: Record<string, (raw: string, ref?: string) => { en: string; ar: string }> = {
  MIN_AMOUNT_ERROR: (raw) => MIN_AMOUNT(firstMoney(raw)),
  INVALID_AMOUNT: (raw) => { const r = rangeOf(raw); return AMOUNT_RANGE(r?.[0], r?.[1]); },
  INVALID_QUANTITY: (raw) => { const r = rangeOf(raw); return QUANTITY_RANGE(r?.[0], r?.[1]); },
  INVALID_WALLET_NUMBER: () => ({
    en: 'Enter your 11-digit wallet number exactly, for example 01012345678.',
    ar: 'اكتب رقم محفظتك 11 رقم بالظبط، مثال: 01012345678.',
  }),
  INVALID_WALLET_METHOD: () => ({
    en: 'That wallet type is not supported. Choose Vodafone Cash, Orange Cash or e& Money.',
    ar: 'نوع المحفظة ده غير مدعوم. اختر فودافون كاش أو أورنج كاش أو اتصالات كاش.',
  }),
  INSUFFICIENT_BALANCE: () => ({
    en: 'Your balance is not enough for this. Top up your balance or lower the amount.',
    ar: 'رصيدك غير كافٍ للعملية. اشحن رصيدك أو قلّل المبلغ.',
  }),
  SERVICE_UNAVAILABLE: () => ({
    en: 'This service is unavailable right now. Please choose another service.',
    ar: 'الخدمة غير متاحة حاليًا. اختر خدمة أخرى.',
  }),
  PAYMENT_NOT_FOUND: () => ({
    en: 'We could not find that payment. Refresh the page or start a new deposit.',
    ar: 'لم نجد عملية الدفع دي. حدّث الصفحة أو ابدأ عملية شحن جديدة.',
  }),
  REFERENCE_MISSING: () => ({
    en: 'This payment has no reference yet. Start the deposit again from the beginning.',
    ar: 'عملية الدفع لسه ملهاش رقم مرجع. ابدأ الشحن من الأول.',
  }),
};

/** Localise one pair without repeating the ar()/en switch at every call site. */
const say = (en: string, arText: string) => (ar() ? arText : en);

/**
 * A payment gateway that is down is OUR problem — but the customer still has to be told which
 * method is off, that no money moved, and what to try instead. Gateway wording never reaches them.
 */
const WALLET_DOWN = (ref?: string) => say(
  `Electronic-wallet top-up is unavailable right now. Nothing was deducted from your balance — try the crypto option if it is shown as available, or top up again in a few minutes${ref ? ` (reference ${ref})` : ''}.`,
  `الشحن بالمحفظة الإلكترونية مش شغال دلوقتي. مفيش أي مبلغ اتخصم من رصيدك — جرّب الشحن بالعملات الرقمية لو ظاهر إنها متاحة، أو جرّب تاني بعد كام دقيقة${ref ? ` (رقم المرجع ${ref})` : ''}.`);
const CRYPTO_DOWN = (ref?: string) => say(
  `Crypto top-up is unavailable right now. Nothing was deducted — use an electronic wallet, or try again in a few minutes${ref ? ` (reference ${ref})` : ''}.`,
  `الشحن بالعملات الرقمية مش شغال دلوقتي. مفيش أي مبلغ اتخصم — استخدم المحفظة الإلكترونية، أو جرّب تاني بعد كام دقيقة${ref ? ` (رقم المرجع ${ref})` : ''}.`);
const RATE_LIMIT_TEXT = () => say(
  'You have made too many attempts in a short time. Wait about a minute, then try again — nothing was charged.',
  'عملت محاولات كتير في وقت قصير. استنى حوالي دقيقة وجرّب تاني — مفيش أي مبلغ اتخصم.');

/** Coupon refusals carry a precise reason — keep it, in the customer's own language. */
const COUPON_TEXT = (raw: string) => {
  const r = String(raw).toLowerCase();
  if (/expire/.test(r)) return say(
    'This coupon has expired. Remove it or use another code — the order total will be recalculated.',
    'الكوبون ده انتهت صلاحيته. شيله أو استخدم كود تاني — إجمالي الطلب هيتحسب من جديد.');
  if (/already used|usage limit|limit reached/.test(r)) return say(
    'This coupon has already been used the maximum number of times. Remove it and continue without it.',
    'الكوبون ده استُخدم بأقصى عدد مسموح. شيله وكمّل الطلب من غيره.');
  if (/minimum/.test(r)) return say(
    'This coupon needs a bigger order. Increase the quantity, or continue without the coupon.',
    'الكوبون ده محتاج طلب أكبر. زوّد الكمية، أو كمّل من غير الكوبون.');
  return say(
    'That coupon code is not valid. Check the spelling, or continue without it.',
    'كود الخصم ده غير صحيح. راجع كتابته، أو كمّل من غير كوبون.');
};

/**
 * Every code a CUSTOMER can reach, answered with three things: what happened, whether money moved,
 * and the exact next step. Codes listed here are checked BEFORE the internal-code block.
 */
const CUSTOMER_CODE_TEXT: Record<string, (raw: string, ref?: string) => string> = {
  RATE_LIMITED: () => RATE_LIMIT_TEXT(),
  TOO_MANY_REQUESTS: () => RATE_LIMIT_TEXT(),
  ACCOUNT_DISABLED: () => say(
    'Your account is on hold, so this action was not allowed. Nothing was charged — contact support and we will reactivate it for you.',
    'حسابك موقوف مؤقتًا، فالعملية دي مش مسموح بيها. مفيش أي مبلغ اتخصم — راسل الدعم ونرجّع حسابك شغال.'),
  TOKEN_REQUIRED: () => say(
    'Your session has expired. Sign in again to continue — nothing was lost.',
    'انتهت جلستك. سجّل الدخول تاني وكمّل — مفيش أي حاجة ضاعت.'),
  UNAUTHORIZED: () => say(
    'Your session has expired. Sign in again to continue — nothing was lost.',
    'انتهت جلستك. سجّل الدخول تاني وكمّل — مفيش أي حاجة ضاعت.'),
  INVALID_TOKEN: () => say(
    'Your session has expired. Sign in again to continue — nothing was lost.',
    'انتهت جلستك. سجّل الدخول تاني وكمّل — مفيش أي حاجة ضاعت.'),
  INVALID_API_KEY: () => say(
    'Your API key is not valid. Create a new key from this page and try again.',
    'مفتاح الـ API بتاعك غير صالح. اعمل مفتاح جديد من الصفحة دي وجرّب تاني.'),
  FORBIDDEN: () => say(
    'You do not have access to this. If you think that is a mistake, contact support.',
    'مالكش صلاحية للوصول لده. لو بتحس إن ده غلط، راسل الدعم.'),
  SINGLE_UNIT_REQUIRED: () => say(
    'This service is sold as a single item — set the quantity to 1.',
    'الخدمة دي تُباع كقطعة واحدة — خلّي الكمية 1.'),
  INVALID_LINK: () => say(
    'Type the target exactly as this service needs it — a link, an email, a number or any text.',
    'اكتب البيانات المطلوبة زي ما الخدمة محتاجاها — رابط أو إيميل أو رقم أو أي نص.'),
  NOT_FOUND: () => say(
    'That item was not found — it may have been removed. Refresh the page and try again.',
    'العنصر ده مش موجود — ممكن يكون اتشال. حدّث الصفحة وجرّب تاني.'),
  VALIDATION_ERROR: () => say(
    'Some details are missing or not valid. Review the highlighted fields and try again.',
    'فيه بيانات ناقصة أو غير صحيحة. راجع الحقول المطلوبة وجرّب تاني.'),
  INVALID_REQUEST: () => say(
    'Some details are missing or not valid. Review the fields and try again.',
    'فيه بيانات ناقصة أو غير صحيحة. راجع الحقول وجرّب تاني.'),
  COUPON_INVALID: (raw) => COUPON_TEXT(raw),
  INVALID_COUPON: (raw) => COUPON_TEXT(raw),
  COUPON_CREATE_FAILED: (raw) => COUPON_TEXT(raw),
  INVALID_PAYMENT: () => say(
    'We could not match this payment to your account. Start the deposit again — nothing was charged to you.',
    'معرفناش نطابق الدفعة دي بحسابك. ابدأ الشحن من جديد — مفيش أي مبلغ اتخصم منك.'),
  PAYMENT_MISMATCH: () => say(
    'We could not match this payment to your account. Start the deposit again — nothing was charged to you.',
    'معرفناش نطابق الدفعة دي بحسابك. ابدأ الشحن من جديد — مفيش أي مبلغ اتخصم منك.'),
  ORDER_CANCEL_FAILED: () => say(
    'We could not cancel this order — it may already be finished, or this service does not allow cancellation. Refresh the order to see its latest status.',
    'معرفناش نلغي الطلب ده — ممكن يكون خلص، أو الخدمة مش بتسمح بالإلغاء. اعمل تحديث للطلب وشوف حالته الأخيرة.'),
  CANCEL_ERROR: () => say(
    'We could not cancel this order — it may already be finished, or this service does not allow cancellation. Refresh the order to see its latest status.',
    'معرفناش نلغي الطلب ده — ممكن يكون خلص، أو الخدمة مش بتسمح بالإلغاء. اعمل تحديث للطلب وشوف حالته الأخيرة.'),
  ORDER_REFRESH_FAILED: () => say(
    'We could not refresh this order right now. Try again in a moment — your order is unaffected.',
    'معرفناش نحدّث الطلب دلوقتي. جرّب تاني بعد لحظة — طلبك زي ما هو.'),
  REFRESH_ERROR: () => say(
    'We could not refresh this order right now. Try again in a moment — your order is unaffected.',
    'معرفناش نحدّث الطلب دلوقتي. جرّب تاني بعد لحظة — طلبك زي ما هو.'),
  ORDER_REFILL_FAILED: () => say(
    'We could not submit the refill request — this service may not allow refills, or the order is not completed yet. Refresh to check the status.',
    'معرفناش نبعت طلب إعادة التعبئة — ممكن الخدمة مش بتسمح بالإعادة، أو الطلب لسه مش مكتمل. اعمل تحديث وشوف الحالة.'),
  REFILL_ERROR: () => say(
    'We could not submit the refill request — this service may not allow refills, or the order is not completed yet. Refresh to check the status.',
    'معرفناش نبعت طلب إعادة التعبئة — ممكن الخدمة مش بتسمح بالإعادة، أو الطلب لسه مش مكتمل. اعمل تحديث وشوف الحالة.'),
  TICKET_CREATE_FAILED: () => say(
    'We could not open the ticket. Write a clear subject and message, then try again.',
    'معرفناش نفتح التذكرة. اكتب موضوع ورسالة واضحين، وجرّب تاني.'),
  TICKET_MESSAGE_FAILED: () => say(
    'Your message was not sent. Check your connection and try again — the ticket is still open.',
    'الرسالة مابعتتش. راجع اتصالك وجرّب تاني — التذكرة لسه مفتوحة.'),
  TICKET_LOAD_FAILED: () => say(
    'We could not load this ticket. Refresh the page to see the latest replies.',
    'معرفناش نحمّل التذكرة دي. حدّث الصفحة عشان تشوف آخر الردود.'),
  INVALID_TICKET: () => say(
    'We could not load this ticket. Refresh the page, or open a new one.',
    'معرفناش نحمّل التذكرة دي. حدّث الصفحة، أو افتح تذكرة جديدة.'),
  TICKET_CLOSED: () => say(
    'This ticket is closed. Open a new one and we will follow up there.',
    'التذكرة دي مقفولة. افتح تذكرة جديدة ونكمل معاك هناك.'),
  INVALID_SUBJECT: () => say(
    'Write a clear subject for the ticket, then send it again.',
    'اكتب موضوع واضح للتذكرة، وابعت تاني.'),
  INVALID_MESSAGE: () => say(
    'Write the message you want to send, then try again.',
    'اكتب الرسالة اللي عايز تبعتها وجرّب تاني.'),
  SHORTLINK_START_FAILED: () => say(
    'We could not start this task right now. Try again in a moment.',
    'معرفناش نبدأ المهمة دي دلوقتي. جرّب تاني بعد لحظة.'),
  SHORTLINK_CLAIM_FAILED: () => say(
    'We could not confirm the task completion right now. Your progress is kept — try again in a moment.',
    'معرفناش نتأكد من إتمام المهمة دلوقتي. تقدمك محفوظ — جرّب تاني بعد لحظة.'),
  ALREADY_CLAIMED: () => say(
    'You have already claimed the reward for this task.',
    'أنت قبضت مكافأة المهمة دي بالفعل.'),
  RAFFLE_BUY_FAILED: () => say(
    'We could not complete this purchase. Nothing was deducted — try again, or pick another number.',
    'معرفناش نكمّل الشراء. مفيش أي مبلغ اتخصم — جرّب تاني أو اختار رقم تاني.'),
  PROFILE_UPDATE_FAILED: () => say(
    'We could not save your profile changes right now. Your current details are unchanged — try again in a moment.',
    'معرفناش نحفظ تعديلات الملف الشخصي دلوقتي. بياناتك الحالية زي ما هي — جرّب تاني بعد لحظة.'),
  AFFILIATE_WITHDRAWAL_FAILED: () => say(
    'We could not submit the withdrawal request. Check the amount and your payment details, then try again — nothing was deducted.',
    'معرفناش نبعت طلب السحب. راجع المبلغ وبيانات الدفع وجرّب تاني — مفيش أي مبلغ اتخصم.'),
};

/** Gateway outages: the customer is told the method is off, not what broke inside. */
const WALLET_GATEWAY_CODES = /^(GATEWAY_NOT_CONFIGURED|GATEWAY_DISABLED|GATEWAY_UNAUTHORIZED|SHA7NAWY_CREATE_ERROR|SHA7NAWY_CONFIRM_ERROR|RATE_NOT_CONFIGURED)$/;
const CRYPTO_GATEWAY_CODES = /^(HELEKET_CREATE_ERROR|MERCHANT_UNKNOWN|INVALID_MERCHANT_ID|INVALID_MERCHANT)$/;

// Internal-only codes: always replaced by the neutral message (+ support reference).
const INTERNAL_CODES = /^(INTERNAL_ERROR|RATE_NOT_CONFIGURED|GATEWAY_(NOT_CONFIGURED|DISABLED|UNAUTHORIZED)|MERCHANT_UNKNOWN|INVALID_MERCHANT_ID|SHA7NAWY_(CREATE|CONFIRM)_ERROR|HELEKET_CREATE_ERROR|ORDER_CREATION_FAILED|PROVIDER_ORDER_FAILED|MASS_ORDER_ERROR|DB_UNAVAILABLE|AUTH_DB_UNAVAILABLE)$/;

const firstMoney = (raw: string) => (String(raw).match(/\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)/) || [])[1];
const rangeOf = (raw: string) => {
  const m = String(raw).match(/([0-9][0-9,]*(?:\.[0-9]+)?)\s*(?:and|to|إلى|و)\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i);
  return m ? [m[1], m[2]] : null;
};

export function friendlyError(error: any, fallback?: string) {
  const raw = error?.message || error?.error || error?.code || fallback || '';
  const upper = String(raw).toUpperCase();
  const ref = typeof error?.ref === 'string' ? error.ref : undefined;
  const codeRaw = String(error?.code || '').toUpperCase();

  // 0. A gateway that is down, and every code a customer can act on — answered BEFORE the
  // internal-code block so nothing falls through to the generic wording.
  if (codeRaw && WALLET_GATEWAY_CODES.test(codeRaw)) return WALLET_DOWN(ref);
  if (codeRaw && CRYPTO_GATEWAY_CODES.test(codeRaw)) return CRYPTO_DOWN(ref);
  if (codeRaw && CUSTOMER_CODE_TEXT[codeRaw]) return CUSTOMER_CODE_TEXT[codeRaw](String(raw), ref);

  // 1. Codes we can translate into a specific, actionable instruction.
  if (codeRaw && CODE_TEXT[codeRaw]) {
    const text = CODE_TEXT[codeRaw](String(raw), ref);
    return ar() ? text.ar : text.en;
  }
  // 2. Known internal codes: neutral message + support reference (cause stays in the admin log).
  if (codeRaw && INTERNAL_CODES.test(codeRaw)) {
    const text = INTERNAL(ref);
    return ar() ? text.ar : text.en;
  }
  // 3. Same treatment when only the English text reached us (older/legacy callers).
  if (/minimum (deposit|amount)|الحد الأدنى/i.test(String(raw))) {
    const text = MIN_AMOUNT(firstMoney(raw));
    return ar() ? text.ar : text.en;
  }
  if (/amount must be between|quantity must be between/i.test(String(raw))) {
    const r = rangeOf(raw);
    const text = /quantity/i.test(String(raw)) ? QUANTITY_RANGE(r?.[0], r?.[1]) : AMOUNT_RANGE(r?.[0], r?.[1]);
    return ar() ? text.ar : text.en;
  }
  // Legacy callers that hand us the server's own sentence with no code.
  if (/coupon/i.test(String(raw))) return COUPON_TEXT(String(raw));
  if (/too many|rate limit|rate-limit/i.test(String(raw))) return RATE_LIMIT_TEXT();
  if (/account (is )?(not active|disabled|suspended)/i.test(String(raw))) return CUSTOMER_CODE_TEXT.ACCOUNT_DISABLED(String(raw), ref);
  if (/session (has )?expired|please sign in|unauthor/i.test(String(raw))) return CUSTOMER_CODE_TEXT.UNAUTHORIZED(String(raw), ref);
  if (/could not (start|complete)|temporarily unavailable|not configured/i.test(String(raw)) && !/balance/i.test(String(raw))) {
    const text = INTERNAL(ref);
    return ar() ? text.ar : text.en;
  }

  if (upper.includes('AUTH_DB_UNAVAILABLE') || upper.includes('DB_UNAVAILABLE')) return ar() ? 'الخدمة غير متاحة مؤقتًا. حاول مرة أخرى بعد قليل.' : 'The service is temporarily unavailable. Please try again shortly.';
  if (upper.includes('INVALID-CREDENTIAL') || upper.includes('INVALID_CREDENTIAL')) return ar() ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : 'The email or password is incorrect.';
  if (upper.includes('EMAIL-ALREADY-IN-USE') || upper.includes('EMAIL_EXISTS')) return ar() ? 'هذا البريد الإلكتروني مستخدم بالفعل. جرّب تسجيل الدخول.' : 'This email is already registered. Try signing in.';
  if (upper.includes('WEAK-PASSWORD')) return ar() ? 'كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل.' : 'Your password is too weak. Use at least 8 characters.';
  if (upper.includes('TOO-MANY-REQUESTS')) return ar() ? 'تمت محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.' : 'Too many attempts. Please wait a moment and try again.';
  // Browsers word a dead connection differently ("Failed to fetch", "NetworkError when attempting to
  // fetch resource.", "Load failed" on Safari) — none of that developer wording reaches the customer.
  if (/FAILED TO FETCH|NETWORK-REQUEST-FAILED|NETWORK ?REQUEST|NETWORKERROR|NETWORK ERROR|LOAD FAILED|ERR_NETWORK/.test(upper)) return ar() ? 'تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.' : 'Could not connect to the server. Check your connection and try again.';
  if (upper.includes('SYNC_IN_PROGRESS')) return ar() ? 'المزامنة تعمل بالفعل. انتظر حتى تكتمل قبل بدء مزامنة جديدة.' : 'Synchronization is already running. Please wait until it finishes.';
  if (upper.includes('INSUFFICIENT')) return ar() ? 'رصيدك غير كافٍ لإتمام العملية.' : 'Your balance is not sufficient for this operation.';
  if (upper.includes('INVALID_QUANTITY')) return ar() ? 'الكمية غير صحيحة. اختر كمية داخل حدود الخدمة.' : 'The quantity is invalid. Choose an amount within the service limits.';
  if (upper.includes('INVALID_LINK')) return ar() ? 'من فضلك أدخل رابط الخدمة بشكل صحيح.' : 'Please enter a valid service link.';
  if (upper.includes('PROVIDER_ORDER_FAILED') || upper.includes('PROVIDER_ERROR')) return ar() ? 'تعذر تنفيذ الطلب حالياً. تم إرجاع المبلغ إلى رصيدك تلقائياً — راجع الخدمة أو جرّب مرة أخرى.' : 'We could not complete this order right now. Your amount was refunded automatically — check the service or try again.';
  if (upper.includes('ORDER_CREATION_FAILED') || upper.includes('ORDER_ERROR')) return ar() ? 'تعذر إنشاء الطلب حالياً. لم يتم خصم أي مبلغ من رصيدك. حاول مرة أخرى.' : 'We could not create your order right now. Your balance was not charged. Please try again.';
  if (upper.includes('SERVICE_UNAVAILABLE')) return ar() ? 'الخدمة غير متاحة حالياً. من فضلك اختر خدمة أخرى.' : 'This service is currently unavailable. Please choose another service.';
  if (upper.includes('NOT_FOUND')) return ar() ? 'العنصر المطلوب غير موجود أو لم يعد متاحًا.' : 'The requested item was not found or is no longer available.';
  const translated = translateMessage(raw);
  // Never expose stack traces, raw JSON, internal codes, or developer wording to customers.
  if (/\{[\s\S]*\}|at\s+\w+\s*\(|node_modules|\.tsx?:\d+|\.js:\d+|^[A-Z_]{4,}$|\bHTTP\s*\d{3}\b/i.test(translated)) {
    return ar() ? (fallback ? translateMessage(fallback) : 'تعذر إتمام العملية. حاول مرة أخرى.') : (fallback || 'We could not complete the operation. Please try again.');
  }
  if (ar() && /^(failed|unable|could not|invalid|error|request failed|action failed|save failed|delete failed|refresh failed|loading failed)\b/i.test(translated)) {
    return 'تعذر إتمام العملية. حاول مرة أخرى.';
  }
  return translated;
}

export const notify = {
  success(message: unknown) { toast.success(translateMessage(message)); },
  error(error: unknown, fallback?: string) { toast.error(friendlyError(error, fallback)); },
  info(message: unknown) { toast(translateMessage(message)); },
};
