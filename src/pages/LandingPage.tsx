import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight, Check, ChevronDown, Clock, Globe2, Headphones, Heart, Menu, RefreshCw,
  ShieldCheck, Sparkles, TrendingUp, Wallet, X, Zap,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation, ThemeToggle } from '../lib/i18n';
import SEO, { SITE } from '../components/SEO';
import { useAuth } from '../contexts/AuthContext';
import { notify } from '../lib/notify';

/** Platforms we sell growth services for — shown as a plain strip, no claims attached. */
const PLATFORMS = [
  'Instagram', 'TikTok', 'YouTube', 'Facebook', 'Telegram', 'X / Twitter', 'Spotify', 'Threads',
];

const FAQ_EN: string[][] = [
  ['What is SMM Rapid?',
    'SMM Rapid is an online store for social media growth services — followers, likes, views, comments and engagement for Instagram, TikTok, YouTube, Facebook, Telegram and more.',
    'You order in a few clicks from your dashboard, pay from your USD wallet, and follow the delivery live.'],
  ['How do I place my first order?',
    'Create a free account, add funds to your wallet, pick the service you want, paste the public link you are growing and set the quantity. Your order is submitted right away.'],
  ['Do I need to share my social media password?',
    'Never. Every service only needs the public link (a profile, post, video or channel), and some services ask for a username you can see publicly.'],
  ['How fast do orders start?',
    'Most orders enter processing within minutes of payment confirmation. Large quantities are often delivered gradually over hours or days — the service page shows an estimate before you order.'],
  ['What if my order drops?',
    'If a service offers refills, open the order in your dashboard and press Refill to top it back up. If something is not delivered as described, support will review it and refund your wallet where the order qualifies.'],
  ['What currency is the wallet?',
    'The wallet is in USD. Local and international payments are converted at the site exchange rate before the amount is credited.'],
  ['Is my data secure?',
    'Your connection is encrypted, card and wallet details are processed securely at checkout and never stored by us, and every balance movement is written to an internal ledger you can review.'],
];

const FAQ_AR: string[][] = [
  ['ما هو SMM Rapid؟',
    'SMM Rapid متجر إلكتروني لخدمات نمو السوشيال ميديا — متابعين، لايكات، مشاهدات، تعليقات وتفاعل لإنستجرام وتيك توك ويوتيوب وفيسبوك وتليجرام وغيرها.',
    'تطلب خلال ثواني من لوحة التحكم، تدفع من محفظتك بالدولار، وتتابع التنفيذ لحظة بلحظة.'],
  ['كيف أقدّم أول طلب؟',
    'أنشئ حساباً مجانياً، أضف رصيداً لمحفظتك، اختر الخدمة، الصق الرابط العام الذي تريد تنميته وحدّد الكمية. الطلب يُرسل فوراً.'],
  ['هل أشارك كلمة مرور حسابي؟',
    'أبداً. كل الخدمات تحتاج الرابط العام فقط (حساب، منشور، فيديو أو قناة)، وبعض الخدمات تطلب اسم المستخدم الظاهر للعامة.'],
  ['متى يبدأ تنفيذ الطلب؟',
    'معظم الطلبات تبدأ خلال دقائق من تأكيد الدفع. الكميات الكبيرة غالباً تُنفَّذ تدريجياً على مدار ساعات أو أيام — وصفحة الخدمة تعرض التقدير قبل الطلب.'],
  ['وإذا نقص الطلب بعد التنفيذ؟',
    'لو الخدمة تدعم إعادة التعبئة، افتح الطلب من لوحة التحكم واضغط «إعادة تعبئة» لتعويض النقص. ولو الحاجة لم تُنفَّذ كما هو موضح، الدعم يراجعها ويُرجع المبلغ لمحفظتك لو الطلب يستحق.'],
  ['ما عملة المحفظة؟',
    'المحفظة بالدولار الأمريكي. المدفوعات المحلية والدولية تُحوَّل بسعر الصرف المعلَّن قبل إضافتها للرصيد.'],
  ['هل بياناتي آمنة؟',
    'الاتصال مشفَّر، وبيانات الدفع تُدار عبر جهات الدفع، وكل حركة على الرصيد مسجَّلة في سجل داخلي تقدر تراجعه.'],
];

async function fetchPublic(path: string, timeoutMs = 8000) {
  const controller = new AbortController();
  const setTimer: any = typeof window !== 'undefined' ? window.setTimeout : setTimeout;
  const clearTimer: any = typeof window !== 'undefined' ? window.clearTimeout : clearTimeout;
  const timer = setTimer(() => controller.abort(), timeoutMs);
  try { return await fetch(path, { signal: controller.signal, headers: { Accept: 'application/json' } }); }
  finally { clearTimer(timer); }
}

/** localStorage throws in private mode / when storage is blocked — never let that break the page. */
function readStoredRef() {
  try { return (localStorage.getItem('ref') || '').toUpperCase(); } catch { return ''; }
}
function writeStoredRef(code: string) {
  try { localStorage.setItem('ref', code); } catch { /* storage unavailable — referral still applies at signup */ }
}

export default function LandingPage() {
  const { dir } = useTranslation();
  const ar = dir === 'rtl';
  const navigate = useNavigate();
  const { user, registerWithEmail, loginWithEmail, resetPassword } = useAuth();
  const [menu, setMenu] = useState(false);
  const [auth, setAuth] = useState<'login' | 'register' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [faq, setFaq] = useState(0);

  const referralFromUrl = useMemo(() => {
    let fromUrl = '';
    try { fromUrl = new URLSearchParams(window.location.search).get('ref')?.trim().toUpperCase() || ''; } catch { /* no window/URL */ }
    return fromUrl || readStoredRef();
  }, []);

  // an invitation link opens the register form directly
  React.useEffect(() => { if (referralFromUrl) { setReferralCode(referralFromUrl); setAuth('register'); } }, [referralFromUrl]);

  // close the sign-in card with Escape
  React.useEffect(() => {
    if (!auth) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAuth(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [auth]);

  const { data: showcase } = useQuery({
    queryKey: ['public-showcase'],
    queryFn: async () => { const r = await fetchPublic('/api/public/showcase'); if (!r.ok) throw new Error('Failed to load'); return r.json(); },
    staleTime: 60_000, gcTime: 10 * 60_000, retry: 1,
  });

  const services: any[] = showcase?.services || [];
  const serviceCount = Number(showcase?.serviceCount || 0);
  const categoryCount = Number(showcase?.categoryCount || 0);
  const currency = showcase?.config?.currencySymbol || '$';
  const faqs = ar ? FAQ_AR : FAQ_EN;

  const text = ar ? {
    navServices: 'الخدمات', navHow: 'كيف يعمل؟', navBlog: 'المدونة', navSupport: 'الدعم', navApi: 'API',
    dashboard: 'لوحة التحكم', login: 'تسجيل الدخول', start: 'ابدأ الآن', close: 'إغلاق',
    badge: 'خدمات نمو السوشيال ميديا',
    title: 'كبّر صفحتك على إنستجرام وتيك توك ويوتيوب',
    titleAccent: 'بنمو حقيقي تلاحظه بالأرقام',
    copy: 'متابعين، لايكات، مشاهدات وتفاعل بأسعار واضحة ومعلنة. تختار الخدمة، تدفع من محفظتك، وتتابع التنفيذ لحظة بلحظة من لوحة التحكم.',
    browse: 'تصفح الخدمات', startFree: 'أنشئ حساب مجاني',
    proof: ['بدون كلمة مرور', 'إعادة تعبئة مضمونة', 'محفظة بالدولار', 'دعم 24/7'],
    band1: 'وصول أوسع، تفاعل أكثر، ونمو تلاحظه بالفعل',
    band1sub: 'تسع منصات، محفظة واحدة، وتنفيذ يبدأ خلال دقائق.',
    platformsTitle: 'منصات نخدمها',
    live: 'مباشر', catalogTitle: 'من الكتالوج مباشرة', openCatalog: 'فتح الكتالوج كامل',
    loadingCatalog: 'بنحمّل أحدث الخدمات…', noCatalog: 'الكتالوج بيتحدّث حالياً — افتح الصفحة بعد لحظة.',
    per1k: 'لكل 1000', from: 'الحد الأدنى', to: 'الأقصى',
    stats: [
      { value: serviceCount ? `${serviceCount}+` : '—', label: 'خدمة متاحة' },
      { value: categoryCount ? `${categoryCount}+` : '—', label: 'فئة خدمات' },
      { value: 'USD', label: 'عملة المحفظة' },
      { value: '24/7', label: 'دعم فني' },
    ],
    featuresTitle: 'كل إلي يهمك في مكان واحد',
    featuresCopy: 'خيارات جودة تناسب ميزانيتك، أسعار معلنة لكل 1000، وتتبع واضح لكل طلب.',
    features: [
      ['متابعين ولايكات ومشاهدات', 'خدمات تغطّي كل منصة: متابعين، لايكات، مشاهدات، تعليقات وساعات مشاهدة.', TrendingUp],
      ['خيارات جودة متعددة', 'من الأوفر للممتاز — تختار إلي يناسب هدفك وميزانيتك قبل ما تطلب.', Sparkles],
      ['بدأ سريع للتنفيذ', 'معظم الطلبات تبدأ خلال دقائق من تأكيد الدفع، بدون طوابير انتظار.', Zap],
      ['إعادة تعبئة عند النقص', 'الخدمات إلي بتدعم إعادة التعبئة تتيح لك تعويض أي نقص بضغطة واحدة.', RefreshCw],
      ['محفظة بالدولار وأسعار معلنة', 'تعرف تكلفة الطلب بالظبط قبل ما ترسله، والرصيد يتحرك في سجل واضح.', Wallet],
      ['دعم بشري 24/7', 'فريق دعم بالعربي والإنجليزي عبر التذاكر والدردشة في أي وقت.', Headphones],
    ],
    howTitle: 'كيف يعمل الموقع؟',
    howCopy: 'ثلاث خطوات من التسجيل لأول طلب — بدون تعقيد.',
    steps: [
      { step: '01', title: 'أنشئ حساب', desc: 'تسجيل مجاني في نصف دقيقة، وتفتح لك محفظة بالدولار فوراً.' },
      { step: '02', title: 'أضف رصيد', desc: 'اشحن بوسيلة دفع محلية أو عالمية، والرصيد يظهر في ثواني.' },
      { step: '03', title: 'اطلب وتابع', desc: 'اختر الخدمة، الصق الرابط والكمية، وتابع التسليم من لوحة التحكم.' },
    ],
    guaranteeTitle: 'ضمان واضح بدون شروط مخفية',
    guaranteeCopy: 'نبني ثقة العملاء على قواعد معلنة نلتزم بها:',
    guarantee: 'ضمان الخدمة',
    guarantees: [
      'إعادة تعبئة أو تعويض أي طلب لم يُنفَّذ كما هو موضح',
      'إرجاع المبلغ للمحفظة للطلبات التي لم تبدأ',
      'أسعار معلنة لكل 1000 — بدون رسوم مفاجئة',
      'دعم بشري بالعربي والإنجليزي 24/7',
    ],
    band2: 'جاهز تبدأ أول طلب؟',
    band2sub: 'أنشئ حسابك، اشحن محفظتك، واختر الخدمة — التنفيذ يبدأ خلال دقائق.',
    cta: 'أنشئ حساب مجاني',
    faqTitle: 'أسئلة شائعة',
    faqCopy: 'إجابات سريعة على أكثر ما يسأل عنه العملاء قبل البدء.',
    ctaTitle: 'ابدأ النمو من الآن',
    ctaCopy: 'حساب مجاني، محفظة بالدولار، وخدمات جاهزة لكل منصة.',
    loginTitle: 'تسجيل الدخول', registerTitle: 'إنشاء حساب',
    name: 'الاسم', email: 'البريد الإلكتروني', password: 'كلمة المرور', ref: 'كود الإحالة',
    optional: 'اختياري', submitLogin: 'دخول', submitRegister: 'إنشاء الحساب',
    already: 'لديك حساب؟', newUser: 'جديد؟',
    forgot: 'نسيت كلمة المرور؟', resetSent: 'تم إرسال رابط إعادة تعيين كلمة المرور.',
    refLocked: 'الكود جاي من رابط الدعوة ومثبت.',
    footerRights: 'جميع الحقوق محفوظة.',
  } : {
    navServices: 'Services', navHow: 'How it works', navBlog: 'Blog', navSupport: 'Support', navApi: 'API',
    dashboard: 'Dashboard', login: 'Sign in', start: 'Start now', close: 'Close',
    badge: 'Social media growth services',
    title: 'Grow your page on Instagram, TikTok and YouTube',
    titleAccent: 'real growth you can measure',
    copy: 'Followers, likes, views and engagement at clear, published prices. Pick a service, pay from your wallet, and follow the delivery live from your dashboard.',
    browse: 'Browse services', startFree: 'Create free account',
    proof: ['No password needed', 'Refill guarantee', 'USD wallet', '24/7 support'],
    band1: 'More reach. More engagement. Growth you can actually see.',
    band1sub: 'Eight platforms, one wallet, and delivery that starts within minutes.',
    platformsTitle: 'Platforms we cover',
    live: 'Live', catalogTitle: 'Straight from the catalog', openCatalog: 'Open the full catalog',
    loadingCatalog: 'Loading the latest services…', noCatalog: 'The catalog is updating — check back in a moment.',
    per1k: 'per 1,000', from: 'min', to: 'max',
    stats: [
      { value: serviceCount ? `${serviceCount}+` : '—', label: 'Services available' },
      { value: categoryCount ? `${categoryCount}+` : '—', label: 'Service categories' },
      { value: 'USD', label: 'Wallet currency' },
      { value: '24/7', label: 'Customer support' },
    ],
    featuresTitle: 'Everything that matters, in one place',
    featuresCopy: 'Quality tiers for every budget, published price per 1,000, and clear tracking on every order.',
    features: [
      ['Followers, likes & views', 'Services that cover every platform: followers, likes, views, comments and watch time.', TrendingUp],
      ['Choose your quality', 'From budget-friendly to premium — pick what fits your goal and your budget before ordering.', Sparkles],
      ['Fast start', 'Most orders enter processing within minutes of payment confirmation — no waiting queues.', Zap],
      ['Refill when counts drop', 'Services with refills let you top the numbers back up with one button from the order page.', RefreshCw],
      ['USD wallet & published prices', 'You see the exact charge before submitting, and every balance movement is recorded.', Wallet],
      ['Human support 24/7', 'An Arabic and English support team on tickets and chat, any time of day.', Headphones],
    ],
    howTitle: 'How it works',
    howCopy: 'Three steps from signup to your first order — nothing complicated.',
    steps: [
      { step: '01', title: 'Create your account', desc: 'Free signup in under a minute, with a USD wallet ready straight away.' },
      { step: '02', title: 'Add funds', desc: 'Top up with a local or international payment method — the balance appears in seconds.' },
      { step: '03', title: 'Order & track', desc: 'Pick a service, paste your link and quantity, then follow delivery from your dashboard.' },
    ],
    guaranteeTitle: 'A clear guarantee, no hidden conditions',
    guaranteeCopy: 'We keep customer trust with rules we publish and follow:',
    guarantee: 'Service guarantee',
    guarantees: [
      'Refill or compensation for any order not delivered as described',
      'Wallet refunds for orders that never started',
      'Published price per 1,000 — no surprise fees',
      'Human support in Arabic and English, 24/7',
    ],
    band2: 'Ready for your first order?',
    band2sub: 'Create your account, fund your wallet and pick a service — delivery starts within minutes.',
    cta: 'Create free account',
    faqTitle: 'Frequently asked questions',
    faqCopy: 'Quick answers to what customers ask most before they start.',
    ctaTitle: 'Start growing today',
    ctaCopy: 'Free account, USD wallet, and services ready for every platform.',
    loginTitle: 'Sign in', registerTitle: 'Create account',
    name: 'Name', email: 'Email', password: 'Password', ref: 'Referral code',
    optional: 'optional', submitLogin: 'Sign in', submitRegister: 'Create account',
    already: 'Already have an account?', newUser: 'New here?',
    forgot: 'Forgot password?', resetSent: 'Password reset link sent to your email.',
    refLocked: 'This code came from your invitation link and is locked.',
    footerRights: 'All rights reserved.',
  };

  const handleReset = async () => {
    try {
      if (!email.trim()) throw new Error(ar ? 'أدخل بريدك الإلكتروني أولاً.' : 'Enter your email first.');
      await resetPassword(email.trim());
      notify.success(text.resetSent);
    } catch (err: any) {
      notify.error(err, ar ? 'تعذر إرسال رابط الاستعادة' : 'Unable to send reset link');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (auth === 'register') {
        if (!name.trim() || password.length < 8) {
          throw new Error(ar ? 'أدخل الاسم وكلمة مرور من 8 أحرف على الأقل.' : 'Enter your name and a password of at least 8 characters.');
        }
        if (!referralFromUrl && referralCode) writeStoredRef(referralCode.trim().toUpperCase());
        await registerWithEmail(email.trim(), password, name.trim());
        notify.success(ar ? 'تم إنشاء الحساب. راجع بريدك لتأكيد الحساب.' : 'Account created. Check your email to verify your account.');
      } else {
        await loginWithEmail(email.trim(), password);
      }
      setAuth(null);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      notify.error(err, ar ? 'تعذر تسجيل الدخول' : 'Authentication failed');
    }
  };

  const scrollHow = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenu(false);
    document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' });
  };

  const arrow = (size: number) => <ArrowRight size={size} className={ar ? 'rotate-180' : ''} />;

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SMM Rapid',
    url: SITE,
    logo: 'https://smmrapid.store/favicon.svg',
    sameAs: ['https://twitter.com/smmrapid', 'https://t.me/smmrapid', 'https://www.facebook.com/smmrapid'],
    contactPoint: [{ '@type': 'ContactPoint', email: 'support@smmrapid.store', contactType: 'customer service', availableLanguage: ['English', 'Arabic'] }],
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'SMM Rapid',
    url: SITE,
    potentialAction: { '@type': 'SearchAction', target: 'https://smmrapid.store/services?q={search_term_string}', 'query-input': 'required name=search_term_string' },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (ar ? FAQ_AR : FAQ_EN).slice(0, 6).map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  const section = 'mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8';

  return (
    <div className="landing-shell min-h-screen bg-surface-container text-on-surface" dir={dir}>
      <SEO
        title={ar
          ? 'SMM Rapid — متابعين ولايكات ومشاهدات لإنستجرام وتيك توك ويوتيوب'
          : 'SMM Rapid — Buy Followers, Likes & Views for Instagram, TikTok & YouTube'}
        description={ar
          ? 'اشترِ متابعين إنستجرام، مشاهدات تيك توك، مشتركين يوتيوب، لايكات فيسبوك وأعضاء تليجرام. أسعار معلنة لكل 1000، بدء سريع، إعادة تعبئة مضمونة، ومحفظة بالدولار مع تتبع مباشر لكل طلب.'
          : 'Buy Instagram followers, TikTok views, YouTube subscribers, Facebook likes and Telegram members. Published price per 1,000, fast start, refill guarantee and a USD wallet with live order tracking.'}
        path="/"
        keywords={['buy followers', 'buy Instagram followers', 'TikTok views', 'YouTube subscribers', 'social media growth', 'engagement services', 'SMM panel']}
        locale={ar ? 'ar' : 'en'}
        type="website"
        jsonLd={[organizationSchema, websiteSchema, faqSchema]}
        alternates={{ ar: '/ar', en: '/', xDefault: '/' }}
      />

      {/* ------------------------------- header ------------------------------- */}
      <header className="sticky top-0 z-50 border-b border-outline-variant bg-surface-container/95 backdrop-blur-xl">
        <div className={`${section} flex h-[72px] items-center justify-between gap-4`}>
          <Link to="/" className="flex shrink-0 items-center gap-3" onClick={() => setMenu(false)}>
            <span className="brand-mark">R</span>
            <span className="text-xl font-black tracking-tight">SMM<span className="text-violet-600 dark:text-violet-400">Rapid</span></span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-on-surface-variant lg:flex">
            <Link className="landing-nav-link" to="/services">{text.navServices}</Link>
            <a className="landing-nav-link" href="#how" onClick={scrollHow}>{text.navHow}</a>
            <Link className="landing-nav-link" to="/blog">{text.navBlog}</Link>
            <Link className="landing-nav-link" to="/support">{text.navSupport}</Link>
            <Link className="landing-nav-link" to="/api">{text.navApi}</Link>
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            {user ? (
              <Link to="/dashboard" className="btn-primary flex items-center gap-1.5">{text.dashboard}{arrow(15)}</Link>
            ) : (
              <>
                <button className="btn-ghost" onClick={() => setAuth('login')}>{text.login}</button>
                <button className="btn-primary flex items-center gap-1.5" onClick={() => setAuth('register')}>{text.start}{arrow(15)}</button>
              </>
            )}
            <ThemeToggle />
          </div>

          <button className="rounded-xl bg-surface-container-high p-2.5 lg:hidden" onClick={() => setMenu(!menu)} aria-label={ar ? 'القائمة' : 'Menu'} aria-expanded={menu}>
            {menu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {menu && (
          <div className="border-t border-outline-variant bg-surface-container px-4 pb-5 pt-4 lg:hidden">
            <div className="mx-auto flex max-w-md flex-col gap-1.5">
              {[
                { to: '/services', label: text.navServices },
                { to: '/blog', label: text.navBlog },
                { to: '/support', label: text.navSupport },
                { to: '/api', label: text.navApi },
              ].map(l => (
                <Link key={l.to} to={l.to} onClick={() => setMenu(false)}
                  className="rounded-xl px-3 py-3 text-sm font-bold text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface">
                  {l.label}
                </Link>
              ))}
              <a href="#how" onClick={scrollHow} className="rounded-xl px-3 py-3 text-sm font-bold text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface">
                {text.navHow}
              </a>
              <div className="mt-3 flex flex-col gap-2 border-t border-outline-variant pt-4">
                {user ? (
                  <Link onClick={() => setMenu(false)} className="btn-primary justify-center" to="/dashboard">{text.dashboard}</Link>
                ) : (
                  <>
                    <button onClick={() => { setMenu(false); setAuth('login'); }} className="btn-ghost justify-center">{text.login}</button>
                    <button onClick={() => { setMenu(false); setAuth('register'); }} className="btn-primary justify-center">{text.start}</button>
                  </>
                )}
                <ThemeToggle className="mt-1 w-full justify-center" />
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* -------------------------------- hero -------------------------------- */}
        <section className="relative overflow-hidden py-16 sm:py-20">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute end-0 top-0 h-[520px] w-[520px] -translate-y-1/3 translate-x-1/4 rounded-full bg-violet-400/15 blur-3xl dark:bg-violet-600/10" />
            <div className="absolute bottom-0 start-0 h-[520px] w-[520px] -translate-y-0 -translate-x-1/4 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-600/10" />
          </div>

          <div className={section}>
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-high px-4 py-2 text-xs font-bold text-violet-700 dark:text-violet-300">
                <Sparkles size={13} />
                {text.badge}
              </span>
              <h1 className="mt-6 text-4xl font-black leading-[1.15] tracking-tight sm:text-5xl">
                {text.title}
                <span className="mt-2 block text-violet-600 dark:text-violet-400">{text.titleAccent}</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-on-surface-variant sm:text-lg">{text.copy}</p>
              <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                <button onClick={() => setAuth('register')} className="btn-primary flex items-center justify-center gap-2 !px-6 !py-3.5">
                  {text.startFree}{arrow(17)}
                </button>
                <Link to="/services" className="btn-secondary flex items-center justify-center !px-6 !py-3.5">
                  {text.browse}
                </Link>
              </div>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                {text.proof.map((item: string) => (
                  <span key={item} className="flex items-center gap-1.5 text-sm font-medium text-on-surface-variant">
                    <Check size={15} className="text-emerald-500" />{item}
                  </span>
                ))}
              </div>
            </div>

            {/* live catalog preview — real rows from /api/public/showcase */}
            <div className="mx-auto mt-14 max-w-4xl rounded-2xl border border-outline-variant bg-surface-container shadow-xl shadow-slate-900/5 dark:shadow-slate-950/40">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant px-5 py-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">SMM Rapid</p>
                  <h2 className="text-base font-black">{text.catalogTitle}</h2>
                </div>
                <div className="flex items-center gap-2">
                  {serviceCount > 0 && (
                    <span className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-bold text-on-surface-variant">
                      {serviceCount} {ar ? 'خدمة' : 'services'}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-black text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{text.live}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-outline-variant">
                {services.slice(0, 4).map((s: any) => (
                  <div key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-on-surface">{s.name}</p>
                      <p className="mt-0.5 truncate text-xs text-on-surface-variant">
                        {s.category}{s.min ? ` · ${text.from} ${s.min}` : ''}{s.max ? ` · ${text.to} ${s.max}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-end">
                      <p className="text-sm font-black tabular-nums text-violet-600 dark:text-violet-400">{currency}{Number(s.rate || 0).toFixed(4)}</p>
                      <p className="text-[11px] text-on-surface-variant">{text.per1k}</p>
                    </div>
                  </div>
                ))}
                {!services.length && (
                  <p className="px-5 py-6 text-center text-sm text-on-surface-variant">
                    {showcase === undefined ? text.loadingCatalog : text.noCatalog}
                  </p>
                )}
              </div>

              <div className="border-t border-outline-variant px-5 py-3.5 text-center">
                <Link to="/services" className="inline-flex items-center gap-1.5 text-sm font-bold text-violet-600 hover:underline dark:text-violet-400">
                  {text.openCatalog}{arrow(15)}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------ platforms ------------------------------ */}
        <section className="border-y border-outline-variant bg-surface-container-low py-8">
          <div className={section}>
            <p className="text-center text-xs font-black uppercase tracking-[.18em] text-on-surface-variant">{text.platformsTitle}</p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              {PLATFORMS.map(p => (
                <span key={p} className="rounded-full border border-outline-variant bg-surface-container px-4 py-2 text-sm font-bold text-on-surface-variant">{p}</span>
              ))}
            </div>
          </div>
        </section>

        {/* --------------------- marketing band (headline mid-page) --------------------- */}
        <section className="bg-gradient-to-br from-violet-600 to-indigo-700 py-14 text-white">
          <div className={`${section} text-center`}>
            <h2 className="mx-auto max-w-4xl text-2xl font-black leading-snug sm:text-3xl">{text.band1}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-violet-100">{text.band1sub}</p>
          </div>
        </section>

        {/* -------------------------------- stats -------------------------------- */}
        <section className="py-12">
          <div className={section}>
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              {text.stats.map((s: any) => (
                <div key={s.label} className="rounded-2xl border border-outline-variant bg-surface-container p-5 text-center">
                  <b className="block text-2xl font-black tabular-nums text-on-surface sm:text-3xl">{s.value}</b>
                  <span className="mt-1 block text-sm font-medium text-on-surface-variant">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------- features ------------------------------- */}
        <section className="py-16">
          <div className={section}>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-black uppercase tracking-[.16em] text-violet-600 dark:text-violet-400">{ar ? 'المميزات' : 'Features'}</p>
              <h2 className="mt-2 text-3xl font-black leading-tight">{text.featuresTitle}</h2>
              <p className="mt-3 text-on-surface-variant">{text.featuresCopy}</p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {text.features.map((f: any) => {
                const [title, desc, Icon] = f;
                return (
                  <div key={title} className="rounded-2xl border border-outline-variant bg-surface-container p-6 transition-shadow hover:shadow-lg">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                      <Icon size={22} />
                    </div>
                    <h3 className="mb-2 text-lg font-black leading-snug">{title}</h3>
                    <p className="text-sm leading-relaxed text-on-surface-variant">{desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ------------------------------ how it works ------------------------------ */}
        <section id="how" className="scroll-mt-24 border-y border-outline-variant bg-surface-container-low py-16">
          <div className={section}>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-black uppercase tracking-[.16em] text-violet-600 dark:text-violet-400">{text.navHow}</p>
              <h2 className="mt-2 text-3xl font-black leading-tight">{text.howTitle}</h2>
              <p className="mt-3 text-on-surface-variant">{text.howCopy}</p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {text.steps.map((step: any) => (
                <div key={step.step} className="rounded-2xl border border-outline-variant bg-surface-container p-7 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 text-lg font-black text-white">
                    {step.step}
                  </div>
                  <h3 className="mb-2 text-lg font-black">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-on-surface-variant">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------- guarantee ------------------------------- */}
        <section className="py-16">
          <div className={section}>
            <div className="grid gap-8 rounded-2xl border border-outline-variant bg-surface-container p-7 md:grid-cols-2 md:p-10">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                  <ShieldCheck size={14} />{text.guarantee}
                </span>
                <h2 className="mt-4 text-2xl font-black leading-tight md:text-3xl">{text.guaranteeTitle}</h2>
                <p className="mt-3 text-on-surface-variant">{text.guaranteeCopy}</p>
              </div>
              <div className="flex flex-col justify-center gap-3">
                {text.guarantees.map((item: string) => (
                  <div key={item} className="flex items-start gap-2.5 rounded-xl bg-surface-container-high p-3.5">
                    <Check size={17} className="mt-0.5 shrink-0 text-emerald-500" />
                    <span className="text-sm leading-relaxed text-on-surface">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------- FAQ ---------------------------------- */}
        <section className="border-t border-outline-variant py-16">
          <div className={section}>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-black uppercase tracking-[.16em] text-violet-600 dark:text-violet-400">FAQ</p>
              <h2 className="mt-2 text-3xl font-black leading-tight">{text.faqTitle}</h2>
              <p className="mt-3 text-on-surface-variant">{text.faqCopy}</p>
            </div>
            <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl border border-outline-variant bg-surface-container">
              {faqs.map(([q, a, extra], i) => (
                <div key={q} className="border-b border-outline-variant last:border-0">
                  <button onClick={() => setFaq(faq === i ? -1 : i)} aria-expanded={faq === i}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start sm:px-6">
                    <span className="text-sm font-bold text-on-surface sm:text-base">{q}</span>
                    <ChevronDown size={18} className={`shrink-0 text-on-surface-variant transition-transform ${faq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {faq === i && (
                    <div className="px-5 pb-5 sm:px-6">
                      <p className="text-sm leading-relaxed text-on-surface-variant">{a}</p>
                      {extra && <p className="mt-2 text-sm leading-relaxed text-on-surface-variant/80">{extra}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------- marketing band + final CTA ------------------------- */}
        <section className="border-t border-outline-variant bg-gradient-to-br from-violet-600 to-indigo-700 py-16 text-white">
          <div className={`${section} text-center`}>
            <div className="mx-auto max-w-2xl">
              <Heart className="mx-auto mb-2 h-8 w-8 text-violet-200" />
              <p className="text-xl font-black leading-snug sm:text-2xl">{text.band2}</p>
              <p className="mt-2 text-violet-100">{text.band2sub}</p>
              <h2 className="mt-8 text-3xl font-black leading-tight sm:text-4xl">{text.ctaTitle}</h2>
              <p className="mx-auto mt-3 max-w-xl text-violet-100">{text.ctaCopy}</p>
              <button onClick={() => setAuth('register')}
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-base font-black text-violet-700 transition-colors hover:bg-violet-50">
                {text.cta}{arrow(17)}
              </button>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-violet-100">
                <span className="inline-flex items-center gap-1.5"><Wallet size={15} />{text.stats[2].value} {ar ? 'محفظة' : 'wallet'}</span>
                <span className="inline-flex items-center gap-1.5"><Clock size={15} />{ar ? 'بدأ سريع' : 'Fast start'}</span>
                <span className="inline-flex items-center gap-1.5"><Globe2 size={15} />{ar ? 'عملاء من كل مكان' : 'Customers worldwide'}</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ------------------------------ auth modal ------------------------------ */}
      {auth && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={e => { if (e.currentTarget === e.target) setAuth(null); }}>
          <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container p-6 shadow-2xl sm:p-8" dir={dir} role="dialog" aria-modal="true">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <span className="brand-mark">R</span>
                <h2 className="mt-3 text-2xl font-black">{auth === 'register' ? text.registerTitle : text.loginTitle}</h2>
              </div>
              <button className="rounded-xl bg-surface-container-high p-2 text-on-surface-variant hover:text-on-surface" onClick={() => setAuth(null)} aria-label={text.close}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {auth === 'register' && (
                <div>
                  <label className="label-primary text-on-surface-variant" htmlFor="landing-name">{text.name}</label>
                  <input id="landing-name" className="input-primary bg-surface-container-high" value={name} onChange={e => setName(e.target.value)} required />
                </div>
              )}
              <div>
                <label className="label-primary text-on-surface-variant" htmlFor="landing-email">{text.email}</label>
                <input id="landing-email" className="input-primary bg-surface-container-high" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="label-primary text-on-surface-variant" htmlFor="landing-password">{text.password}</label>
                <input id="landing-password" className="input-primary bg-surface-container-high" type="password" minLength={8}
                  value={password} onChange={e => setPassword(e.target.value)} required />
              </div>

              {auth === 'login' && (
                <div className="text-end">
                  <button type="button" onClick={handleReset} className="text-xs font-bold text-violet-600 hover:underline dark:text-violet-400">{text.forgot}</button>
                </div>
              )}

              {auth === 'register' && (
                <div>
                  <label className="label-primary text-on-surface-variant" htmlFor="landing-ref">
                    {text.ref} <span className="font-normal text-on-surface-variant/70">({text.optional})</span>
                  </label>
                  <input id="landing-ref" className="input-primary bg-surface-container-high" value={referralCode}
                    disabled={!!referralFromUrl} placeholder="REF123"
                    onChange={e => setReferralCode(e.target.value.toUpperCase())} />
                  {referralFromUrl && <p className="mt-1.5 text-xs text-on-surface-variant">{text.refLocked}</p>}
                </div>
              )}

              <button className="btn-primary w-full justify-center">{auth === 'register' ? text.submitRegister : text.submitLogin}</button>

              <div className="pt-1 text-center text-sm text-on-surface-variant">
                {auth === 'register' ? (
                  <>
                    {text.already}{' '}
                    <button type="button" className="font-bold text-violet-600 hover:underline dark:text-violet-400" onClick={() => setAuth('login')}>{text.login}</button>
                  </>
                ) : (
                  <>
                    {text.newUser}{' '}
                    <button type="button" className="font-bold text-violet-600 hover:underline dark:text-violet-400" onClick={() => setAuth('register')}>{text.start}</button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------- footer -------------------------------- */}
      <footer className="border-t border-outline-variant bg-surface-container-low py-9">
        <div className={`${section} flex flex-col items-center justify-between gap-6 lg:flex-row`}>
          <Link to="/" className="flex items-center gap-3">
            <span className="brand-mark">R</span>
            <span className="text-xl font-black tracking-tight">SMM<span className="text-violet-600 dark:text-violet-400">Rapid</span></span>
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-on-surface-variant">
            <Link to="/services" className="hover:text-violet-600 dark:hover:text-violet-400">{text.navServices}</Link>
            <Link to="/blog" className="hover:text-violet-600 dark:hover:text-violet-400">{text.navBlog}</Link>
            <Link to="/support" className="hover:text-violet-600 dark:hover:text-violet-400">{text.navSupport}</Link>
            <Link to="/api" className="hover:text-violet-600 dark:hover:text-violet-400">{text.navApi}</Link>
            <Link to="/terms" className="hover:text-violet-600 dark:hover:text-violet-400">{ar ? 'الشروط' : 'Terms'}</Link>
            <Link to="/privacy" className="hover:text-violet-600 dark:hover:text-violet-400">{ar ? 'الخصوصية' : 'Privacy'}</Link>
            <Link to="/refund-policy" className="hover:text-violet-600 dark:hover:text-violet-400">{ar ? 'سياسة الاسترجاع' : 'Refunds'}</Link>
          </nav>
          <p className="text-xs text-on-surface-variant">&copy; {new Date().getFullYear()} SMM Rapid. {text.footerRights}</p>
        </div>
      </footer>
    </div>
  );
}
