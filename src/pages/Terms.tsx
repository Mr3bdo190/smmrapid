import { useQuery } from '@tanstack/react-query';
import PublicPageShell from './PublicPageShell';
import { useTranslation } from '../lib/i18n';

const SECTIONS_EN = [
  { h: '1. Who we are', b: 'This website ("the Service") is a self-service platform that sells social media marketing services — such as followers, likes, views and comments — delivered to accounts and links you provide. By creating an account or placing an order, you agree to these Terms.' },
  { h: '2. Eligibility', b: 'You must be at least 18 years old, or the age of legal majority in your jurisdiction, to create an account and make purchases. You are responsible for the accuracy of the information you provide.' },
  { h: '3. How orders work', b: 'You add funds to your account wallet, then place an order for a specific service by providing a link and a quantity. Orders are dispatched automatically to our provider network once payment clears. Delivery times vary by service and are estimates, not guarantees.' },
  { h: '4. Acceptable use', b: 'You may only order services for accounts, pages, or content you own or are authorized to promote. You may not use the Service to target private accounts without consent, to harass or impersonate others, or for any unlawful purpose. We reserve the right to suspend accounts that violate this policy.' },
  { h: '5. Platform policies', b: 'Third-party platforms (Instagram, TikTok, YouTube, Facebook, etc.) have their own terms of service. Using growth services may carry risk under those platforms\u2019 policies. We are not affiliated with, endorsed by, or responsible for the policies of any third-party platform.' },
  { h: '6. Payments', b: 'We accept Vodafone Cash, card payments processed through Kashier, and cryptocurrency. Wallet balances are recorded in an internal ledger and are non-transferable between accounts.' },
  { h: '7. Refunds and cancellations', b: 'See our separate Refund & Delivery Policy for details on when orders can be refunded or canceled.' },
  { h: '8. Limitation of liability', b: 'The Service is provided "as is." We do not guarantee specific engagement outcomes, follower retention, or algorithmic effects on any third-party platform. To the maximum extent permitted by law, we are not liable for indirect, incidental, or consequential damages arising from use of the Service.' },
  { h: '9. Account suspension', b: 'We may suspend or terminate accounts that engage in fraud, chargebacks, abuse of the referral or rewards system, or violations of these Terms.' },
  { h: '10. Changes to these Terms', b: 'We may update these Terms from time to time. Continued use of the Service after changes take effect constitutes acceptance of the revised Terms.' },
  { h: '11. Contact', b: 'Questions about these Terms can be sent through our Contact page.' },
];

const SECTIONS_AR = [
  { h: '١. من نحن', b: 'هذا الموقع ("الخدمة") هو منصة ذاتية الخدمة تبيع خدمات تسويق عبر مواقع التواصل الاجتماعي — مثل المتابعين واللايكات والمشاهدات والتعليقات — يتم تنفيذها للحسابات والروابط التي تقدمها. بإنشائك حساباً أو تقديمك طلباً، فإنك توافق على هذه الشروط.' },
  { h: '٢. الأهلية', b: 'يجب أن يكون عمرك 18 عاماً على الأقل، أو سن الرشد القانوني في بلدك، لإنشاء حساب وإجراء عمليات شراء. أنت مسؤول عن دقة المعلومات التي تقدمها.' },
  { h: '٣. كيف تعمل الطلبات', b: 'تقوم بشحن رصيد محفظتك، ثم تطلب خدمة معينة بتقديم رابط وكمية. تُرسل الطلبات تلقائياً لشبكة مزودينا فور تأكيد الدفع. أوقات التنفيذ تختلف حسب الخدمة وهي تقديرية وليست مضمونة.' },
  { h: '٤. الاستخدام المقبول', b: 'يجوز لك فقط طلب خدمات لحسابات أو صفحات أو محتوى تملكه أو مصرح لك بالترويج له. لا يجوز استخدام الخدمة لاستهداف حسابات خاصة دون موافقة، أو للمضايقة أو انتحال الهوية، أو لأي غرض غير قانوني. نحتفظ بالحق في تعليق الحسابات التي تخالف هذه السياسة.' },
  { h: '٥. سياسات المنصات', b: 'المنصات الخارجية (إنستجرام، تيك توك، يوتيوب، فيسبوك، إلخ) لها شروط خدمة خاصة بها. استخدام خدمات النمو قد يحمل مخاطر بموجب سياسات تلك المنصات. نحن غير تابعين لأي منصة خارجية ولسنا مسؤولين عن سياساتها.' },
  { h: '٦. الدفع', b: 'نقبل فودافون كاش، والدفع بالبطاقة عبر Kashier، والعملات الرقمية. أرصدة المحفظة مسجلة في سجل داخلي وغير قابلة للتحويل بين الحسابات.' },
  { h: '٧. الاسترجاع والإلغاء', b: 'راجع سياسة الاسترجاع والتنفيذ المنفصلة لمعرفة تفاصيل متى يمكن استرجاع الطلبات أو إلغاؤها.' },
  { h: '٨. حدود المسؤولية', b: 'تُقدَّم الخدمة "كما هي". نحن لا نضمن نتائج تفاعل محددة، أو الاحتفاظ بالمتابعين، أو أي تأثيرات خوارزمية على أي منصة خارجية. إلى أقصى حد يسمح به القانون، لسنا مسؤولين عن أي أضرار غير مباشرة أو عرضية أو تبعية ناتجة عن استخدام الخدمة.' },
  { h: '٩. تعليق الحساب', b: 'يجوز لنا تعليق أو إنهاء الحسابات التي تقوم بالاحتيال، أو عمليات استرداد المدفوعات، أو إساءة استخدام نظام الإحالة أو المكافآت، أو مخالفة هذه الشروط.' },
  { h: '١٠. التعديلات على هذه الشروط', b: 'قد نقوم بتحديث هذه الشروط من وقت لآخر. استمرار استخدامك للخدمة بعد سريان التعديلات يعني موافقتك على الشروط المُحدثة.' },
  { h: '١١. التواصل', b: 'يمكن إرسال أي استفسارات حول هذه الشروط عبر صفحة التواصل معنا.' },
];

export default function Terms() {
  const { t, lang } = useTranslation();
  const { data: config } = useQuery({
    queryKey: ['client-config'],
    queryFn: async () => { const res = await fetch('/api/client/config'); if (!res.ok) throw new Error('API Error'); return res.json(); }
  });
  const sections = lang === 'ar' ? SECTIONS_AR : SECTIONS_EN;
  const siteName = config?.siteName || 'RapidSMM';

  return (
    <PublicPageShell title={t('legal.terms')}>
      <p className="text-sm text-slate-500">{t('legal.lastUpdated', { date: new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) })}</p>
      <p>{lang === 'ar' ? `هذه الشروط تحكم استخدامك لموقع ${siteName}.` : `These Terms govern your use of ${siteName}.`}</p>
      {sections.map(s => (
        <section key={s.h}>
          <h2 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "'Manrope', sans-serif" }}>{s.h}</h2>
          <p>{s.b}</p>
        </section>
      ))}
    </PublicPageShell>
  );
}
