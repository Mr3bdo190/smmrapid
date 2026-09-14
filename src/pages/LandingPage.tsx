import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, ChevronDown, Headphones, Layers3, Menu, ShieldCheck, Sparkles, Wallet, X, Zap, Clock, BarChart3, Globe, Users, TrendingUp, Award, ShoppingCart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation, ThemeToggle } from '../lib/i18n';
import SEO, { SITE } from '../components/SEO';
import { useAuth } from '../contexts/AuthContext';
import { notify } from '../lib/notify';

const PLATFORMS = [['Instagram','IG'],['TikTok','TK'],['YouTube','YT'],['Facebook','FB'],['Telegram','TG'],['X / Twitter','X'],['Spotify','SP'],['Threads','TH']];
const FAQ_EN = [
 ['What is RapidSMM?','RapidSMM is a professional social media marketing panel offering affordable services for Instagram, TikTok, YouTube, Facebook, Telegram and more. Fund your wallet and place orders with real-time tracking from a single dashboard.'],
 ['How do I place my first order?','Create an account, add funds, choose a category, select a service, enter the target link and quantity, then submit. Track progress live from your dashboard.'],
 ['Do I need to share my social password?','No. Never share your social account password. Services only require the target URL or information explicitly asked for by that service.'],
 ['Can I use RapidSMM as a reseller?','Yes. RapidSMM includes a full SMM API for resellers, automatic provider synchronization, service management, and white-label capabilities.'],
 ['What currency is the wallet?','USD is the primary wallet currency. External payment methods can settle in their own currency and are converted before wallet credit.'],
 ['Is my data safe?','Your data is encrypted and stored securely. Payments are processed via trusted gateways. We never store sensitive credentials.']
];
const FAQ_AR = [
 ['إيه هو RapidSMM؟','RapidSMM منصة احترافية لتسويق وسائل التواصل الاجتماعي بأسعار متوفرة للإنستغرام، التيك توك، اليوتيوب، الفيسبوك، التيليجرام والمزيد. أضف رصيدك واطلب من مكان واحد مع تتبع فوري.'],
 ['إزاي أعمل أول طلب؟','اعمل حساب، أضف رصيد، اختار القسم ثم الخدمة، اكتب الرابط المستهدف والكمية، وبعدها أرسل.تتبع التقدم لحظة بلحظة من لوحة التحكم.'],
 ['هل لازم أدي باسورد حساب السوشيال؟','لا. ممنوع تشارك باسورد حسابك. الخدمة بتحتاج فقط الرابط أو البيانات المطلوبة منها بشكل واضح.'],
 ['هل ينفع أستخدم RapidSMM كموزع؟','أيوه. RapidSMM فيها API كامل للموزعين، ومزامنة تلقائية للمزودين، وإدارة خدمات، وأدوات وايت-لابل.'],
 ['عملة المحفظة إيه؟','عملة المحفظة الأساسية هي USD. طرق الدفع الخارجية ممكن تستخدم عملة مختلفة ويتم تحويلها قبل إضافة الرصيد.'],
 ['بياناتي آمنة؟','بياناتك مشفرة ومخزنة بأمان. المدفوعات عبر بوابات موثوقة. ما نخزن أي بيانات حساسة.']
];

async function fetchPublic(path: string, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(path, { signal: controller.signal, headers: { Accept: 'application/json' } }); }
  finally { window.clearTimeout(timer); }
}

export default function LandingPage() {
  const { dir } = useTranslation(); const ar = dir === 'rtl'; const navigate = useNavigate();
  const { user, registerWithEmail, loginWithEmail, resetPassword } = useAuth();
  const [menu, setMenu] = useState(false);
  const [auth, setAuth] = useState<'login' | 'register' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [faq, setFaq] = useState(0);

  const referralFromUrl = useMemo(() => new URLSearchParams(window.location.search).get('ref')?.trim().toUpperCase() || localStorage.getItem('ref') || '', []);
  React.useEffect(() => { if (referralFromUrl) { setReferralCode(referralFromUrl); setAuth('register'); } }, [referralFromUrl]);

  const { data: showcase } = useQuery({
    queryKey: ['public-showcase'],
    queryFn: async () => { const r = await fetchPublic('/api/public/showcase'); if (!r.ok) throw new Error('Failed to load'); return r.json(); },
    staleTime: 60_000, gcTime: 10 * 60_000, retry: 1
  });

  const config = showcase?.config;
  const services = showcase?.services || [];
  const serviceCount = Number(showcase?.serviceCount || 0);
  const categoryCount = Number(showcase?.categoryCount || 0);
  const faqs = ar ? FAQ_AR : FAQ_EN;

  const text = ar ? {
    navServices: 'الخدمات', navHow: 'إزاي بيشتغل؟', navBlog: 'المدونة', navSupport: 'الدعم', navApi: 'API',
    dashboard: 'لوحة التحكم', login: 'تسجيل الدخول', start: 'ابدأ مجانًا',
    badge: 'منصة SMM احترافية للمبتدئين والموزعين',
    title: 'كبّر حضورك على السوشيال. من مكان واحد.',
    copy: 'استكشف الخدمات، أضف رصيدك، اعمل طلبك وتابع حالته بسهولة — بدون تعقيد.',
    browse: 'تصفح الخدمات', how: 'إزاي تبدأ؟',
    howCopy: '3 خطوات واضحة من أول تسجيل الحساب لحد تتبع الطلب.',
    create: 'اعمل حساب', fund: 'أضف رصيد', order: 'اختار الخدمة واعمل الطلب',
    proof: ['محفظة USD واضحة', 'مزامنة تلقائية للمزودين', 'API للموزعين', 'دعم 24/7 وتذاكر'],
    live: 'خدمات متاحة', cats: 'أقسام', wallet: 'عملة المحفظة', access: 'وصول 24/7',
    platformTitle: 'خدمات للمنصات اللي بتستخدمها',
    platformCopy: 'من الإنستغرام للتيك توك، اليوتيوب، التيليجرام — تصفح الكتالوج حسب هدفك.',
    featuresTitle: 'كل اللي تحتاجه في لوحة واحدة',
    featuresCopy: 'واجهة واضحة للمستخدم الجديد، وأدوات عملية للموزعين وإدارة الطلبات.',
    pricing: 'كتالوج الخدمات',
    pricingCopy: 'الأسعار والحدود يتحكم فيها الإدارة ويمكن تتزامن من المزودين.',
    openCatalog: 'فتح الكتالوج',
    faqTitle: 'أسئلة شائعة', faqCopy: 'إجابات مختصرة على أهم الأسئلة قبل ما تبدأ.',
    ctaTitle: 'جاهز تبدأ؟', ctaCopy: 'اعمل حساب مجاني وابدأ الآن.', cta: 'إنشاء حساب',
    loginTitle: 'تسجيل الدخول', registerTitle: 'إنشاء حساب',
    name: 'الاسم', email: 'البريد الإلكتروني', password: 'كلمة المرور', ref: 'كود الإحالة',
    optional: 'اختياري', submitLogin: 'دخول', submitRegister: 'إنشاء الحساب',
    already: 'عندك حساب؟', newUser: 'لسه جديد؟', close: 'إغلاق',
    forgot: 'نسيت كلمة المرور؟', resetSent: 'تم إرسال رابط إعادة تعيين كلمة المرور.',
    features: [['تنفيذ منظم', 'الطلبات بتتوجه للمزودين تلقائياً.', Zap],
      ['محفظة واضحة', 'رصيدك وعملياتك في مكان واحد.', Wallet],
      ['كتالوج متزامن', 'الخدمات والأسعار يتزامن من المزودين.', Layers3],
      ['دعم 24/7', 'عندك قنوات دعم وتذاكر داخل المنصة.', Headphones]],
    stats: [['خدمة متاحة', serviceCount], ['فئة', categoryCount], ['عملة', 'USD'], ['دعم', '24/7']]
  } : {
    navServices: 'Services', navHow: 'How it works', navBlog: 'Blog', navSupport: 'Support', navApi: 'API',
    dashboard: 'Dashboard', login: 'Sign in', start: 'Start free',
    badge: 'Professional SMM platform for beginners & resellers',
    title: 'Grow your social presence. One place.',
    copy: 'Explore services, fund your wallet, place orders and track progress — without unnecessary steps.',
    browse: 'Browse services', how: 'How it works',
    howCopy: 'Three clear steps from account creation to order tracking.',
    create: 'Create an account', fund: 'Add funds', order: 'Choose a service & order',
    proof: ['Transparent USD wallet', 'Automatic provider sync', 'Reseller API', '24/7 support & tickets'],
    live: 'Live services', cats: 'Categories', wallet: 'Wallet currency', access: '24/7 access',
    platformTitle: 'Services for the platforms you use',
    platformCopy: 'From Instagram and TikTok to YouTube and Telegram — browse the catalog by your goal.',
    featuresTitle: 'Everything in one panel',
    featuresCopy: 'A clear experience for new customers, with practical tools for resellers and order management.',
    pricing: 'Service catalog',
    pricingCopy: 'Prices and limits are managed from admin and can be synchronized from connected providers.',
    openCatalog: 'Open catalog',
    faqTitle: 'Frequently asked questions', faqCopy: 'Quick answers to the most important questions before you start.',
    ctaTitle: 'Ready to get started?', ctaCopy: 'Create a free account and explore available services.', cta: 'Create account',
    loginTitle: 'Sign in', registerTitle: 'Create account',
    name: 'Name', email: 'Email', password: 'Password', ref: 'Referral code',
    optional: 'optional', submitLogin: 'Sign in', submitRegister: 'Create account',
    already: 'Already have an account?', newUser: 'New here?', close: 'Close',
    forgot: 'Forgot password?', resetSent: 'Password reset link sent to your email.',
    features: [['Fast dispatch', 'Orders can be routed to connected providers automatically.', Zap],
      ['USD wallet', 'Keep wallet balance and transactions in one clear base currency.', Wallet],
      ['Provider-ready', 'Service names, prices, and limits can sync from providers.', Layers3],
      ['Support', 'Use support channels and tickets when you need help.', Headphones]],
    stats: [['Live services', serviceCount || '—'], ['Categories', categoryCount || '—'], ['Currency', 'USD'], ['Access', '24/7']]
  };

  const handleReset = async () => {
    try {
      if (!email.trim()) throw new Error(ar ? 'اكتب بريدك الإلكتروني أولاً.' : 'Enter your email first.');
      await resetPassword(email.trim());
      notify.success(text.resetSent);
    } catch (err: any) {
      notify.error(err?.message || 'Unable to send reset link');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (auth === 'register') {
        if (!name.trim() || password.length < 8) throw new Error(ar ? 'اكتب اسمك وكلمة مرور 8 أحرف على الأقل.' : 'Enter your name and an 8+ character password.');
        if (!referralFromUrl && referralCode) localStorage.setItem('ref', referralCode.trim().toUpperCase());
        await registerWithEmail(email.trim(), password, name.trim());
        notify.success(ar ? 'تم إنشاء الحساب. تحقق من بريدك لتأكيد الحساب.' : 'Account created. Check your email to verify your account.');
      } else {
        await loginWithEmail(email.trim(), password);
      }
      setAuth(null);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      notify.error(err?.message || 'Authentication failed');
    }
  };

  const scrollHow = (e: React.MouseEvent) => { e.preventDefault(); setMenu(false); document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' }); };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "RapidSMM",
    "url": SITE,
    "logo": "https://smmrapid.store/favicon.svg",
    "sameAs": ["https://twitter.com/smmrapid", "https://t.me/smmrapid", "https://www.facebook.com/smmrapid"],
    "contactPoint": [{ "@type": "ContactPoint", "email": "support@smmrapid.store", "contactType": "customer service", "availableLanguage": ["English", "Arabic"] }]
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "RapidSMM",
    "url": SITE,
    "potentialAction": { "@type": "SearchAction", "target": "https://smmrapid.store/services?q={search_term_string}", "query-input": "required name=search_term_string" }
  };

  return (
    <div className="landing-shell min-h-screen bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100" dir={dir}>
      <SEO
        title="RapidSMM — Professional SMM Panel"
        description="RapidSMM is a professional SMM panel offering affordable social media marketing services. Get real followers, likes, views & engagement on Instagram, TikTok, YouTube, Facebook, Telegram & more. Fast delivery, API access for resellers, 24/7 support."
        path="/"
        keywords={['SMM panel', 'social media marketing', 'buy followers', 'buy likes', 'buy views', 'Instagram followers', 'TikTok followers', 'YouTube subscribers', 'Facebook likes', 'Telegram members']}
        locale={ar ? 'ar' : 'en'}
        type="website"
        jsonLd={[organizationSchema, websiteSchema]}
        alternates={{ ar: '/ar', en: '/', xDefault: '/' }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3" onClick={() => setMenu(false)}>
            <span className="brand-mark flex items-center justify-center w-9 h-9 bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-xl font-black text-lg">R</span>
            <span className="text-xl font-black tracking-tight">Rapid<span className="text-violet-600">SMM</span></span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-bold text-slate-600 dark:text-gray-300 md:flex">
            <Link className="landing-nav-link" to="/services">{text.navServices}</Link>
            <a className="landing-nav-link" href="#how" onClick={scrollHow}>{text.navHow}</a>
            <Link className="landing-nav-link" to="/blog">{text.navBlog}</Link>
            <Link className="landing-nav-link" to="/support">{text.navSupport}</Link>
            <Link className="landing-nav-link" to="/api">{text.navApi}</Link>
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {user ? <Link to="/dashboard" className="btn-primary">{text.dashboard}<ArrowRight size={15} className={ar ? 'mr-1 rotate-180' : 'ml-1'} /></Link> :
              <><button className="btn-ghost" onClick={() => setAuth('login')}>{text.login}</button>
                <button className="btn-primary" onClick={() => setAuth('register')}>{text.start}<ArrowRight size={15} className={ar ? 'mr-1 rotate-180' : 'ml-1'} /></button></>}
            <ThemeToggle className="ml-2" />
          </div>
          <button className="rounded-xl bg-slate-100 dark:bg-slate-700 p-2 md:hidden" onClick={() => setMenu(!menu)} aria-label="menu">
            {menu ? <X /> : <Menu />}
          </button>
        </div>
        {menu && (
          <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 md:hidden">
            <div className="mx-auto flex max-w-md flex-col gap-2">
              <Link onClick={() => setMenu(false)} className="mobile-nav" to="/services">{text.navServices}</Link>
              <a onClick={scrollHow} className="mobile-nav" href="#how">{text.navHow}</a>
              <Link onClick={() => setMenu(false)} className="mobile-nav" to="/blog">{text.navBlog}</Link>
              <Link onClick={() => setMenu(false)} className="mobile-nav" to="/support">{text.navSupport}</Link>
              <Link onClick={() => setMenu(false)} className="mobile-nav" to="/api">{text.navApi}</Link>
              {user ? <Link onClick={() => setMenu(false)} className="btn-primary justify-center" to="/dashboard">{text.dashboard}</Link> :
                <><button onClick={() => { setMenu(false); setAuth('login'); }} className="btn-ghost">{text.login}</button>
                  <button onClick={() => { setMenu(false); setAuth('register'); }} className="btn-primary">{text.start}</button></>}
              <div className="mt-2"><ThemeToggle className="w-full justify-center" /></div>
            </div>
          </div>
        )}
      </header>

      <main className="bg-white dark:bg-slate-900">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-violet-50 dark:from-slate-900 dark:via-slate-900 dark:to-violet-950/20">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[500px] h-[500px] rounded-full bg-violet-300/20 dark:bg-violet-600/5 blur-3xl" />
            <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-[500px] h-[500px] rounded-full bg-indigo-300/20 dark:bg-indigo-600/5 blur-3xl" />
          </div>
          <div className="mx-auto grid max-w-[1240px] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1fr] lg:items-center lg:py-28">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100/70 dark:bg-violet-900/30 rounded-full text-xs font-bold text-violet-700 dark:text-violet-300">
                <Sparkles size={12} className="text-violet-600 dark:text-violet-400" />
                {text.badge}
              </div>
              <h1 className="mt-6 text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                {text.title}
              </h1>
              <p className="landing-hero-copy mt-6 text-lg text-slate-600 dark:text-gray-300 leading-relaxed">
                {text.copy}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button onClick={() => setAuth('register')} className="btn-primary !px-6 !py-3.5">
                  {text.start}<ArrowRight size={17} className={ar ? 'mr-1 rotate-180' : 'ml-1'} />
                </button>
                <Link to="/services" className="btn-ghost !px-6 !py-3.5 dark:!border-slate-600 dark:!bg-slate-800 dark:!text-gray-200">
                  {text.browse}
                </Link>
              </div>
              <div className="landing-proof mt-6 flex flex-wrap gap-4">
                {text.proof.map(x => <span key={x} className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-gray-400">
                  <Check size={14} className="text-violet-600 dark:text-violet-400" />{x}
                </span>)}
              </div>
            </div>

            {/* Demo Card */}
            <div className="relative">
              <div className="relative mx-auto max-w-md rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-2xl shadow-slate-200 dark:shadow-slate-900/50">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <small className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">RapidSMM</small>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">{ar ? 'تجربة الطلب' : 'Order Flow'}</h3>
                  </div>
                  <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-600 dark:text-emerald-400">● {text.live}</span>
                </div>
                <div className="space-y-3">
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3">
                    <small className="text-xs font-bold text-slate-500 dark:text-slate-400">{ar ? '1 — القسم' : '1 — Category'}</small>
                    <div className="mt-1 text-sm font-medium text-slate-900 dark:text-white">Instagram</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3">
                    <small className="text-xs font-bold text-slate-500 dark:text-slate-400">{ar ? '2 — الخدمة' : '2 — Service'}</small>
                    <div className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{ar ? 'متابعين إنستجرام' : 'Instagram Followers'}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{ar ? 'جودة عالية • سعر منافس' : 'High quality • Competitive price'}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3">
                      <small className="text-xs font-bold text-slate-500 dark:text-slate-400">{ar ? 'الكمية' : 'Quantity'}</small>
                      <div className="mt-1 text-sm font-medium text-slate-900 dark:text-white">1,000</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3">
                      <small className="text-xs font-bold text-slate-500 dark:text-slate-400">{ar ? 'التكلفة' : 'Charge'}</small>
                      <div className="mt-1 text-sm font-bold text-violet-600 dark:text-violet-400">$2.84</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 p-3 text-xs text-violet-700 dark:text-violet-300">
                  {ar ? 'اختار القسم ثم الخدمة — وكل التفاصيل المهمة هتظهر قدامك قبل إرسال الطلب.' : 'Choose a category, then a service. Important details are shown before you submit.'}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-y border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="mx-auto grid max-w-[1240px] grid-cols-2 gap-4 px-4 py-7 sm:grid-cols-4 sm:px-6">
            {text.stats.map(([label, value]) => (
              <div key={label} className="text-center">
                <b className="text-2xl font-black text-slate-900 dark:text-white">{value}</b>
                <span className="mt-1 block text-xs font-bold text-slate-500 dark:text-slate-400">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Platforms Section */}
        <section className="landing-section py-16">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-black tracking-[.16em] text-violet-600 dark:text-violet-400">{ar ? 'المنصات' : 'PLATFORMS'}</p>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">{text.platformTitle}</h2>
            <p className="landing-muted mt-4 text-slate-600 dark:text-gray-400">{text.platformCopy}</p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {PLATFORMS.map(([n, i]) => (
              <Link key={n} to="/services" className="landing-platform group flex flex-col items-center justify-center gap-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 p-4 text-center transition-all hover:bg-slate-100 dark:hover:bg-slate-700">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-black text-slate-800 dark:text-white group-hover:scale-105 transition-transform">
                  <span className="text-xs">{i}</span>
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-gray-300">{n}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section id="how" className="bg-white dark:bg-slate-900 py-20">
          <div className="landing-section">
            <div className="max-w-2xl">
              <p className="mb-2 text-xs font-black tracking-[.16em] text-violet-600 dark:text-violet-400">{text.how}</p>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white">{text.howCopy}</h2>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[{
                step: '01', title: text.create, desc: ar ? 'حسابك مجاني، وتدخل على لوحة التحكم فوراً.' : 'Create a free account and access your dashboard.', icon: Users
              }, {
                step: '02', title: text.fund, desc: ar ? 'أضف الرصيد بطريقة دفع متاحة، مباشرة للمحفظة.' : 'Add funds using an available payment method, credited instantly to your wallet.', icon: Wallet
              }, {
                step: '03', title: text.order, desc: ar ? 'اختر الخدمة وشوف التفاصيل قبل تأكيد الطلب.' : 'Choose a service and review details before ordering.', icon: ShoppingCart
              }].map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={i} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-6 text-center transition-all hover:shadow-lg">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                      <span className="text-xl font-black">{step.step}</span>
                    </div>
                    <h3 className="mb-2 text-lg font-black text-slate-900 dark:text-white">{step.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-gray-400">{step.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="landing-section py-16 bg-slate-50 dark:bg-slate-800/30">
          <div className="text-center mb-12">
            <p className="mb-2 text-xs font-black tracking-[.16em] text-violet-600 dark:text-violet-400">{ar ? 'المميزات' : 'FEATURES'}</p>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">{text.featuresTitle}</h2>
            <p className="landing-muted mt-3 max-w-2xl mx-auto text-slate-600 dark:text-gray-400">{text.featuresCopy}</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {text.features.map((f: any, i: number) => { const [title, desc, Icon] = f; return (
              <div key={i} className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 transition-all hover:shadow-lg">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                  <Icon size={24} />
                </div>
                <h3 className="mb-2 text-lg font-black text-slate-900 dark:text-white">{title}</h3>
                <p className="text-sm text-slate-600 dark:text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Service Catalog Preview */}
        <section className="bg-slate-900 text-white py-20">
          <div className="landing-section grid gap-12 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="text-xs font-black tracking-[.16em] text-violet-300">{text.pricing}</p>
              <h2 className="mt-3 text-3xl font-black text-white">{text.pricingCopy}</h2>
              <Link to="/services" className="btn-primary mt-7 inline-flex items-center">
                {text.openCatalog}<ArrowRight size={16} className={ar ? 'mr-1 rotate-180' : 'ml-1'} />
              </Link>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/50">
              {services.length ? (
                <div className="divide-y divide-slate-700">
                  {services.slice(0, 6).map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-white">{s.name}</div>
                        <div className="mt-1 text-xs text-slate-400">{s.category}</div>
                      </div>
                      <b className="shrink-0 text-sm text-violet-300">${Number(s.rate || 0).toFixed(4)}</b>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-slate-400">
                  {ar ? 'سيظهر الكتالوج هنا بعد توفر الخدمات.' : 'The live catalog will appear here when services are available.'}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="landing-section py-16 bg-white dark:bg-slate-900">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <p className="mb-2 text-xs font-black tracking-[.16em] text-violet-600 dark:text-violet-400">FAQ</p>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white">{text.faqTitle}</h2>
              <p className="landing-muted mt-3 text-slate-600 dark:text-gray-400">{text.faqCopy}</p>
            </div>
            <div className="landing-faq mt-8 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 shadow-sm">
              {faqs.map(([q, a], i) => (
                <div key={q} className="border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <button onClick={() => setFaq(faq === i ? -1 : i)} className="flex w-full items-center justify-between text-left py-4">
                    <span className="font-medium text-slate-900 dark:text-white">{q}</span>
                    <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${faq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {faq === i && <p className="pb-4 text-sm text-slate-600 dark:text-gray-400">{a}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="landing-section py-20 bg-gradient-to-br from-violet-600 to-indigo-700 text-white">
          <div className="landing-cta text-center">
            <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-violet-200" />
            <h2 className="mt-4 text-3xl font-black">{text.ctaTitle}</h2>
            <p className="mx-auto mt-3 max-w-xl text-violet-100">{text.ctaCopy}</p>
            <button onClick={() => setAuth('register')} className="btn-ghost mt-7 !border-0 !border-white/20 !bg-white/10 text-white hover:!bg-white/20">
              {text.cta}<ArrowRight size={16} className={ar ? 'mr-1 rotate-180' : 'ml-1'} />
            </button>
          </div>
        </section>
      </main>

      {/* Auth Modal */}
      {auth && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={e => { if (e.currentTarget === e.target) setAuth(null); }}>
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-800 p-6 shadow-2xl sm:p-8" dir={dir}>
            <div className="mb-6 flex items-start justify-between">
              <div>
                <span className="brand-mark flex h-9 w-9 items-center justify-center">R</span>
                <h2 className="mt-4 text-2xl font-black text-slate-900 dark:text-white">{auth === 'register' ? text.registerTitle : text.loginTitle}</h2>
              </div>
              <button className="rounded-xl bg-slate-100 dark:bg-slate-700 dark:text-gray-200 p-2" onClick={() => setAuth(null)} aria-label={text.close}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
              {auth === 'register' && (
                <div>
                  <label className="label-primary dark:text-gray-300">{text.name}</label>
                  <input className="input-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-gray-500"
                    value={name} onChange={e => setName(e.target.value)} required />
                </div>
              )}
              <div>
                <label className="label-primary dark:text-gray-300">{text.email}</label>
                <input className="input-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-gray-500"
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="label-primary dark:text-gray-300">{text.password}</label>
                <input className="input-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-gray-500"
                  type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              {auth === 'login' && (
                <div className="text-right">
                  <button type="button" onClick={handleReset} className="text-xs font-bold text-violet-600 dark:text-violet-400">{text.forgot}</button>
                </div>
              )}
              {auth === 'register' && (
                <div>
                  <label className="label-primary dark:text-gray-300">{text.ref} <span className="font-normal text-slate-400 dark:text-slate-500">({text.optional})</span></label>
                  <input className="input-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-gray-500"
                    value={referralCode} disabled={!!referralFromUrl}
                    onChange={e => setReferralCode(e.target.value.toUpperCase())} placeholder="REF123" />
                  {referralFromUrl && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {ar ? 'الكود جاي من رابط الدعوة ومثبت.' : 'This code came from your invitation link and is locked.'}
                    </p>
                  )}
                </div>
              )}
              <button className="btn-primary w-full">{auth === 'register' ? text.submitRegister : text.submitLogin}</button>
              <div className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
                {auth === 'register' ? (
                  <>
                    {text.already}
                    <button className="font-bold text-violet-600 dark:text-violet-400" onClick={() => setAuth('login')}>{text.login}</button>
                  </>
                ) : (
                  <>
                    {text.newUser}
                    <button className="font-bold text-violet-600 dark:text-violet-400" onClick={() => setAuth('register')}>{text.start}</button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-8">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-3">
              <span className="brand-mark flex h-9 w-9 items-center justify-center">R</span>
              <span className="text-xl font-black">Rapid<span className="text-violet-600">SMM</span></span>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600 dark:text-gray-400">
              <Link to="/terms" className="hover:text-violet-600 dark:hover:text-violet-400">{ar ? 'الشروط' : 'Terms'}</Link>
              <Link to="/privacy" className="hover:text-violet-600 dark:hover:text-violet-400">{ar ? 'الخصوصية' : 'Privacy'}</Link>
              <Link to="/refund-policy" className="hover:text-violet-600 dark:hover:text-violet-400">{ar ? 'الاسترجاع' : 'Refunds'}</Link>
              <Link to="/support" className="hover:text-violet-600 dark:hover:text-violet-400">{text.navSupport}</Link>
              <Link to="/blog" className="hover:text-violet-600 dark:hover:text-violet-400">{text.navBlog}</Link>
              <Link to="/api" className="hover:text-violet-600 dark:hover:text-violet-400">{text.navApi}</Link>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              &copy; {new Date().getFullYear()} RapidSMM. {ar ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
