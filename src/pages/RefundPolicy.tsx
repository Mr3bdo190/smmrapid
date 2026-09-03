import { useQuery } from '@tanstack/react-query';
import PublicPageShell from './PublicPageShell';
import { useTranslation } from '../lib/i18n';

const SECTIONS_EN = [
  { h: '1. Digital delivery', b: 'All services sold on this platform are digital and delivered directly to the social media link or account you provide. There is no physical shipping. Delivery begins automatically once your payment has been confirmed.' },
  { h: '2. Delivery timeframes', b: 'Most orders begin processing within minutes of payment confirmation. Larger orders may be delivered gradually over hours or days, depending on the service. Estimated timeframes are shown for each service before you order, and are estimates rather than guarantees, since delivery depends on third-party provider networks.' },
  { h: '3. Order cancellation', b: 'An order can be canceled and refunded to your wallet balance if it has not yet started processing. Once an order has begun delivering, cancellation is handled case by case — contact support with your order ID and we will review it.' },
  { h: '4. Refund eligibility', b: 'You may be eligible for a refund (credited back to your wallet balance) if: (a) an order fails to start or complete due to an error on our end or our provider\u2019s end, (b) you were charged more than once for the same order, or (c) an order was placed in error and has not yet begun processing. Refunds are reviewed and issued manually by our support team after you contact us with your order ID.' },
  { h: '5. Non-refundable situations', b: 'Refunds are not available for: services that were delivered as described, drops in engagement counts caused by the third-party platform\u2019s own moderation after delivery, incorrect links or usernames submitted by you, or accounts that were private, deleted, or restricted at the time of delivery.' },
  { h: '6. Wallet balance vs. cash refunds', b: 'Refunds are issued as wallet balance by default, which can be used for future orders immediately. If you paid by card through Kashier and prefer a refund to your original payment method rather than wallet balance, mention this when you contact support; card refunds may take several business days to appear depending on your bank.' },
  { h: '7. Cryptocurrency payments', b: 'Cryptocurrency payments are final once confirmed on the blockchain and cannot be reversed by us. If an order paid for with crypto is eligible for a refund under this policy, the refund will be credited to your wallet balance for use on the platform.' },
  { h: '8. How to request a refund or report an issue', b: 'Sign in and open a support ticket from your dashboard with your order ID, or use our Contact page if you do not have an account. Include as much detail as possible so we can investigate quickly.' },
];

const SECTIONS_AR = [
  { h: '١. التنفيذ الرقمي', b: 'كل الخدمات المباعة على هذه المنصة رقمية ويتم تنفيذها مباشرة على رابط أو حساب التواصل الاجتماعي الذي تقدمه. لا يوجد شحن فعلي. يبدأ التنفيذ تلقائياً فور تأكيد دفعتك.' },
  { h: '٢. مدة التنفيذ', b: 'معظم الطلبات تبدأ المعالجة خلال دقائق من تأكيد الدفع. الطلبات الكبيرة قد تُنفذ تدريجياً على مدار ساعات أو أيام، حسب الخدمة. المدد التقديرية تظهر لكل خدمة قبل الطلب، وهي تقديرية وليست مضمونة، لأن التنفيذ يعتمد على شبكات مزودين خارجية.' },
  { h: '٣. إلغاء الطلب', b: 'يمكن إلغاء الطلب واسترجاع قيمته لرصيد محفظتك إذا لم يبدأ التنفيذ بعد. بمجرد بدء تنفيذ الطلب، يتم التعامل مع الإلغاء حالة بحالة — تواصل مع الدعم برقم الطلب وسنراجعه.' },
  { h: '٤. أهلية الاسترجاع', b: 'قد تكون مؤهلاً لاسترجاع (يُضاف كرصيد لمحفظتك) إذا: (أ) فشل الطلب في البدء أو الاكتمال بسبب خطأ من جانبنا أو من جانب المزود، (ب) تم خصم المبلغ منك أكثر من مرة لنفس الطلب، أو (ج) تم تقديم الطلب بالخطأ ولم يبدأ التنفيذ بعد. تتم مراجعة طلبات الاسترجاع وإصدارها يدوياً من فريق الدعم بعد تواصلك معنا برقم الطلب.' },
  { h: '٥. حالات لا يشملها الاسترجاع', b: 'لا يتوفر الاسترجاع في حالة: الخدمات التي تم تنفيذها كما هو موصوف، انخفاض أعداد التفاعل بسبب إجراءات المنصة الخارجية نفسها بعد التنفيذ، روابط أو أسماء مستخدمين خاطئة أدخلتها أنت، أو الحسابات التي كانت خاصة أو محذوفة أو مقيدة وقت التنفيذ.' },
  { h: '٦. رصيد المحفظة مقابل الاسترجاع النقدي', b: 'يتم إصدار الاسترجاع كرصيد بالمحفظة افتراضياً، ويمكن استخدامه فوراً لطلبات مستقبلية. إذا دفعت ببطاقة عبر Kashier وتفضل الاسترجاع لوسيلة الدفع الأصلية بدلاً من رصيد المحفظة، اذكر ذلك عند التواصل مع الدعم؛ قد يستغرق استرجاع البطاقة عدة أيام عمل حسب بنكك.' },
  { h: '٧. مدفوعات العملات الرقمية', b: 'مدفوعات العملات الرقمية نهائية بمجرد تأكيدها على البلوكتشين ولا يمكننا عكسها. إذا كان الطلب المدفوع بعملة رقمية مؤهلاً للاسترجاع بموجب هذه السياسة، سيتم إضافة القيمة لرصيد محفظتك لاستخدامها على المنصة.' },
  { h: '٨. كيفية طلب الاسترجاع أو الإبلاغ عن مشكلة', b: 'سجل الدخول وافتح تذكرة دعم من لوحة التحكم برقم طلبك، أو استخدم صفحة التواصل معنا إذا لم يكن لديك حساب. أرفق أكبر قدر ممكن من التفاصيل لنتمكن من المراجعة بسرعة.' },
];

export default function RefundPolicy() {
  const { t, lang } = useTranslation();
  const { data: config } = useQuery({
    queryKey: ['client-config'],
    queryFn: async () => { const res = await fetch('/api/client/config'); if (!res.ok) throw new Error('API Error'); return res.json(); }
  });
  const sections = lang === 'ar' ? SECTIONS_AR : SECTIONS_EN;
  const siteName = config?.siteName || 'RapidSMM';

  return (
    <PublicPageShell title={t('legal.refund')}>
      <p className="text-sm text-slate-500">{t('legal.lastUpdated', { date: new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) })}</p>
      <p>{lang === 'ar' ? `توضح هذه السياسة كيف يتعامل ${siteName} مع إلغاء الطلبات واسترجاع الأموال.` : `This policy explains how ${siteName} handles order cancellations and refunds.`}</p>
      {sections.map(s => (
        <section key={s.h}>
          <h2 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "'Manrope', sans-serif" }}>{s.h}</h2>
          <p>{s.b}</p>
        </section>
      ))}
    </PublicPageShell>
  );
}
