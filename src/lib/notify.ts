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

export function friendlyError(error: any, fallback?: string) {
  const raw = error?.message || error?.error || error?.code || fallback || '';
  const upper = String(raw).toUpperCase();
  if (upper.includes('AUTH_DB_UNAVAILABLE') || upper.includes('DB_UNAVAILABLE')) return ar() ? 'الخدمة غير متاحة مؤقتًا. حاول مرة أخرى بعد قليل.' : 'The service is temporarily unavailable. Please try again shortly.';
  if (upper.includes('INVALID-CREDENTIAL') || upper.includes('INVALID_CREDENTIAL')) return ar() ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : 'The email or password is incorrect.';
  if (upper.includes('EMAIL-ALREADY-IN-USE') || upper.includes('EMAIL_EXISTS')) return ar() ? 'هذا البريد الإلكتروني مستخدم بالفعل. جرّب تسجيل الدخول.' : 'This email is already registered. Try signing in.';
  if (upper.includes('WEAK-PASSWORD')) return ar() ? 'كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل.' : 'Your password is too weak. Use at least 8 characters.';
  if (upper.includes('TOO-MANY-REQUESTS')) return ar() ? 'تمت محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.' : 'Too many attempts. Please wait a moment and try again.';
  if (upper.includes('NETWORK-REQUEST-FAILED') || upper.includes('FAILED TO FETCH')) return ar() ? 'تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.' : 'Could not connect to the server. Check your connection and try again.';
  if (upper.includes('SYNC_IN_PROGRESS')) return ar() ? 'المزامنة تعمل بالفعل. انتظر حتى تكتمل قبل بدء مزامنة جديدة.' : 'Synchronization is already running. Please wait until it finishes.';
  if (upper.includes('INSUFFICIENT')) return ar() ? 'رصيدك غير كافٍ لإتمام العملية.' : 'Your balance is not sufficient for this operation.';
  if (upper.includes('INVALID_QUANTITY')) return ar() ? 'الكمية غير صحيحة. اختر كمية داخل حدود الخدمة.' : 'The quantity is invalid. Choose an amount within the service limits.';
  if (upper.includes('INVALID_LINK')) return ar() ? 'من فضلك أدخل رابط الخدمة بشكل صحيح.' : 'Please enter a valid service link.';
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
