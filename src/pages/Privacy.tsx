import { useQuery } from '@tanstack/react-query';
import PublicPageShell from './PublicPageShell';
import { useTranslation } from '../lib/i18n';

const SECTIONS_EN = [
  { h: '1. What we collect', b: 'When you create an account we collect your email address and, if you sign in with Google, your basic profile information. When you place an order we store the link and quantity you submit. When you contact support or open a ticket, we store your message.' },
  { h: '2. What we do not collect', b: 'We never see or store your card details — card payments are processed entirely by Kashier, our payment processor. We do not ask for your social media account password; you only provide a public link (such as a profile or post URL).' },
  { h: '3. How we use your data', b: 'We use your data to operate your account, process orders, respond to support requests, prevent fraud, and comply with legal obligations. We do not sell your personal data to third parties.' },
  { h: '4. Third-party services', b: 'We rely on a small number of third-party services to operate: Firebase (authentication), Kashier (card payments), and our order-fulfillment provider network (to deliver the services you order). Each of these providers processes only the data necessary to perform its function.' },
  { h: '5. Data retention', b: 'We retain account and transaction data for as long as your account is active, and afterward for as long as required to meet accounting, legal, or fraud-prevention obligations.' },
  { h: '6. Your rights', b: 'You can request a copy of your data, ask us to correct inaccurate data, or request account deletion by contacting support. We will respond within a reasonable timeframe.' },
  { h: '7. Security', b: 'Your account is protected by Firebase authentication. Every wallet transaction is written to an append-only internal ledger. We apply standard security practices including rate limiting and encrypted connections (HTTPS) across the Service.' },
  { h: '8. Changes to this policy', b: 'We may update this Privacy Policy from time to time. Material changes will be reflected by an updated "last updated" date on this page.' },
  { h: '9. Contact', b: 'Questions about this policy can be sent through our Contact page.' },
];

const SECTIONS_AR = [
  { h: '١. ما الذي نجمعه', b: 'عند إنشاء حساب، نجمع بريدك الإلكتروني، وفي حال تسجيل الدخول بجوجل، معلومات ملفك الشخصي الأساسية. عند تقديم طلب، نخزن الرابط والكمية التي تُدخلها. عند التواصل مع الدعم أو فتح تذكرة، نخزن رسالتك.' },
  { h: '٢. ما لا نجمعه', b: 'نحن لا نرى أو نخزن بيانات بطاقتك أبداً — تتم معالجة مدفوعات البطاقات بالكامل عبر Kashier، معالج الدفع الخاص بنا. لا نطلب كلمة مرور حسابك على مواقع التواصل الاجتماعي؛ تقدم فقط رابطاً عاماً (مثل رابط ملفك الشخصي أو منشور).' },
  { h: '٣. كيف نستخدم بياناتك', b: 'نستخدم بياناتك لتشغيل حسابك، ومعالجة الطلبات، والرد على طلبات الدعم، ومنع الاحتيال، والامتثال للالتزامات القانونية. نحن لا نبيع بياناتك الشخصية لأي طرف ثالث.' },
  { h: '٤. خدمات الطرف الثالث', b: 'نعتمد على عدد قليل من الخدمات الخارجية للتشغيل: Firebase (التوثيق)، Kashier (مدفوعات البطاقات)، وشبكة مزودي التنفيذ (لتنفيذ الخدمات التي تطلبها). كل من هذه الخدمات يعالج فقط البيانات اللازمة لأداء وظيفته.' },
  { h: '٥. مدة الاحتفاظ بالبيانات', b: 'نحتفظ ببيانات الحساب والمعاملات طوال فترة نشاط حسابك، وبعد ذلك للمدة اللازمة للوفاء بالالتزامات المحاسبية أو القانونية أو منع الاحتيال.' },
  { h: '٦. حقوقك', b: 'يمكنك طلب نسخة من بياناتك، أو طلب تصحيح بيانات غير دقيقة، أو طلب حذف حسابك بالتواصل مع الدعم. سنرد خلال فترة زمنية معقولة.' },
  { h: '٧. الأمان', b: 'حسابك محمي بتوثيق Firebase. كل معاملة في المحفظة تُسجل في سجل داخلي دائم. نطبق ممارسات أمان قياسية تشمل تحديد معدل الطلبات واتصالات مشفرة (HTTPS) في كل أنحاء الخدمة.' },
  { h: '٨. التعديلات على هذه السياسة', b: 'قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر. سيتم توضيح التغييرات الجوهرية بتحديث تاريخ "آخر تحديث" في هذه الصفحة.' },
  { h: '٩. التواصل', b: 'يمكن إرسال أي استفسارات حول هذه السياسة عبر صفحة التواصل معنا.' },
];

export default function Privacy() {
  const { t, lang } = useTranslation();
  const { data: config } = useQuery({
    queryKey: ['client-config'],
    queryFn: async () => { const res = await fetch('/api/client/config'); if (!res.ok) throw new Error('API Error'); return res.json(); }
  });
  const sections = lang === 'ar' ? SECTIONS_AR : SECTIONS_EN;
  const siteName = config?.siteName || 'RapidSMM';

  return (
    <PublicPageShell title={t('legal.privacy')}>
      <p className="text-sm text-slate-500">{t('legal.lastUpdated', { date: new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) })}</p>
      <p>{lang === 'ar' ? `توضح هذه السياسة كيف يتعامل ${siteName} مع بياناتك.` : `This policy explains how ${siteName} handles your data.`}</p>
      {sections.map(s => (
        <section key={s.h}>
          <h2 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "'Manrope', sans-serif" }}>{s.h}</h2>
          <p>{s.b}</p>
        </section>
      ))}
    </PublicPageShell>
  );
}
