import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, ChevronDown, ShieldCheck, Sparkles, Wallet, X, Zap, Clock, BarChart3, Globe, Users, TrendingUp, Award, Rocket, BarChart, Send, Globe2, Headphones, Menu } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation, ThemeToggle } from '../lib/i18n';
import SEO, { SITE } from '../components/SEO';
import { useAuth } from '../contexts/AuthContext';
import { notify } from '../lib/notify';

const PLATFORMS = [['Instagram','IG'],['TikTok','TK'],['YouTube','YT'],['Facebook','FB'],['Telegram','TG'],['X / Twitter','X'],['Spotify','SP'],['Threads','TH']];

const FAQ_EN = [
  ['What is SMM Rapid?', 'SMM Rapid is a direct SMM platform that develops and operates its own social media growth services. We own the infrastructure and deliver results directly — no resellers, no intermediaries.',
    'We own the entire delivery pipeline, from order intake through fulfillment, giving you transparent pricing and consistent quality.'],
  ['How do I place my first order?', 'Create a free account, add funds to your wallet, select a service, enter your target link and quantity, then submit. Track every order live from your dashboard.'],
  ['Do I need to share my social password?', 'No. We never ask for your social media password. Services only require the public target URL or information explicitly requested.'],
  ['What makes SMM Rapid different?', 'We are the direct provider. Our in-house engineering and quality teams manage the full delivery stack, ensuring faster turnaround and strict quality standards.'],
  ['What currency is the wallet?', 'USD is the primary wallet currency. Payments are converted at real-time rates before being credited to your USD wallet.'],
  ['Is my data secure?', 'Your data is encrypted in transit and at rest. We never store social credentials and all wallet transactions are recorded in an immutable ledger.']
];

const FAQ_AR = [
  ['ما هو SMM Rapid؟', 'SMM Rapid منصة مباشرة لتسويق وسائل التواصل. نحن نطور ونشغل خدماتنا الخاصة بنا. نحن نملك البنية التحتية ونسلّم النتائج مباشرة — بدون وسطاء ولا موزعين.',
    'نحن نملك كل خطوة في عملية التسليم، من استلام الطلب وحتى التنفيذ، مما يضمن لك أسعار شفافة وجودة متسقة.'],
  ['كيف أقدّم أول طلبي؟', 'سجّل حسابًا مجاني، أضف رصيد لمحفظتك، اختر خدمة، أدخل رابطك المستهدف والكمية، ثم أرسل. تتبع كل طلب لحظة بلحظة من لوحة التحكم.'],
  ['هل أشارك بكلمة مرور حسابي الاجتماعي؟', 'لا. نحن لا نطلب كلمة مرور حسابات التواصل الاجتماعي. الخدمات بحاجة فقط للرابط العلني أو المعلومات المطلوبة صراحة.'],
  ['ماذا يميّز SMM Rapid؟', 'نحن المورّد المباشر. فرقنا الهندسية والجودة تدير كل خطوة من التسليم، مما يضمن تسليم أسرع ومعايير جودة صارمة.'],
  ['عملة المحفظة؟', 'الدولار الأمريكي هي العملة الأساسية. المدفوعات تُحوّل بالأسعار الفعلية قبل الإضافة لمحفظتك.'],
  ['هل بياناتي آمنة؟', 'بياناتك مشفرة أثني الإرسال والتخزين. نحن لا نخزن أي بيانات اجتماعية، وكل معاملة مسجلة في سجل غير قابل للتعديل.']
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

  const services = showcase?.services || [];
  const serviceCount = Number(showcase?.serviceCount || 0);
  const categoryCount = Number(showcase?.categoryCount || 0);
  const faqs = ar ? FAQ_AR : FAQ_EN;

  const text = ar ? {
    navServices: 'الخدمات', navHow: 'كيف يعمل؟', navBlog: 'المدونة', navSupport: 'الدعم', navApi: 'API',
    dashboard: 'لوحة التحكم', login: 'تسجيل الدخول', start: 'ابدأ الآن',
    badge: 'منصة SMM مباشرة — نحن المورّد الأصلي',
    title: 'نمّر حضورك على وسائل التواصل. مباشرة منا.',
    copy: 'خدماتنا الخاصة، بنية تحتية مملوكة، وتسليم مباشر. اكتشف الخدمات، أضف رصيدك، واطلب بثقة — بدون أي وسطاء.',
    browse: 'تصفح الخدمات', how: 'كيف يعمل؟', howCopy: 'ثلاث خطوات واضحة من التسجيل لتتبع الطلب.',
    create: 'أنشئ حساب', fund: 'أضف رصيد', order: 'اختر الخدمة واطلب',
    featuresTitle: 'كل ما تحتاجه في لوحة واحدة',
    featuresCopy: 'بنية تحتية مملوكة، تسليم مباشر، وجودة مضمونة من فريقنا.',
    proof: ['بنية تحتية مملوكة', 'تسليم مباشر', 'دعم 24/7'],
    live: ar ? 'مباشر' : 'Live',
    openCatalog: 'فتح الكتالوج',
    faqTitle: 'أسئلة شائعة', faqCopy: 'إجابات سريعة على أهم الأسئلة قبل أن تبدأ.',
    ctaTitle: 'جاهز للبدء؟', ctaCopy: 'أنشئ حساباً مجاناً وابدأ الآن.', cta: 'إنشاء حساب',
    loginTitle: 'تسجيل الدخول', registerTitle: 'إنشاء حساب',
    name: 'الاسم', email: 'البريد الإلكتروني', password: 'كلمة المرور', ref: 'كود الإحالة',
    optional: 'اختياري', submitLogin: 'دخول', submitRegister: 'إنشاء الحساب',
    already: 'لديك حساب؟', newUser: 'جديد؟', close: 'إغلاق',
    forgot: 'نسيت كلمة المرور؟', resetSent: 'تم إرسال رابط إعادة تعيين كلمة المرور.',
    stats: [['خدمة متاحة', serviceCount], ['فئة', categoryCount], ['عملة', 'USD'], ['دعم', '24/7']],
    trust: 'ما يضمنه الموقع',
    guarantee: 'ضماننا',
    features: [
      ['تسليـم مباشر', 'بنية تحتية مملوكة تعني تحكم كامل في جودة وسرعة التسليم.', Rocket],
      ['دعم 24/7', 'فريقنا متاح دائماً عبر التذاكر والدردشة الحية لدعمك.', Headphones],
      ['دفع آمن', 'جميع المعاملات مشفرة ومسجلة في سجل غير قابل للتعديل.', ShieldCheck],
      ['ضمان الجودة', 'إعادة تعبئة أو استبدال أي طلب لم يُنفّذ بجودة.', Award],
      ['سرعة الصرف', 'التحويلات الفورية وتحديث المحفظة في ثوانٍ.', Zap],
      ['موثوق عالمياً', 'نحن نخدم آلاف العملاء في منصات متعددة عبر العالم.', Globe2]
    ],
    steps: [
      { step: '01', title: 'أنشئ حساب', desc: 'سجّل مجاناً واحصل على محفظة USD فورية.' },
      { step: '02', title: 'أضف رصيد', desc: 'أضف رصيد بوسائط دفع محلية أو عالمية.' },
      { step: '03', title: 'اطلب الآن', desc: 'اختر خدمتنا وتابع التسليم لحظة بلحظة.' }
    ],
    trustTitle: 'ثقة العملاء حول العالم',
    trustCopy: 'منصتنا المباشرة تخدم آلاف العملاء الذين يثقون بنا.',
    copyExample: 'مثال على ميزة',
    copyValue: 'نمو ملحوظ في 7 أيام'
  } : {
    navServices: 'Services', navHow: 'How it works', navBlog: 'Blog', navSupport: 'Support', navApi: 'API',
    dashboard: 'Dashboard', login: 'Sign in', start: 'Start now',
    badge: 'Direct SMM Platform — We are the provider',
    title: 'Grow your social presence. Direct from us.',
    copy: 'Our own services, owned infrastructure, and direct delivery. Explore services, fund your wallet, and order with confidence — no middlemen.',
    browse: 'Browse services', how: 'How it works', howCopy: 'Three clear steps from signup to order tracking.',
    create: 'Create an account', fund: 'Add funds', order: 'Choose a service & order',
    featuresTitle: 'Everything you need, built in-house',
    featuresCopy: 'Owned infrastructure, direct delivery, and guaranteed quality from our engineering teams.',
    proof: ar ? ['بنية تحتية مملوكة', 'تسليم مباشر', 'دعم 24/7'] : ['Owned infrastructure', 'Direct delivery', '24/7 support'],
    live: ar ? 'مباشر' : 'Live',
    openCatalog: 'Open catalog',
    faqTitle: 'Frequently asked questions', faqCopy: 'Quick answers to the most important questions before you start.',
    ctaTitle: 'Ready to get started?', ctaCopy: 'Create a free account and start growing today.', cta: 'Create account',
    loginTitle: 'Sign in', registerTitle: 'Create account',
    name: 'Name', email: 'Email', password: 'Password', ref: 'Referral code',
    optional: 'optional', submitLogin: 'Sign in', submitRegister: 'Create account',
    already: 'Already have an account?', newUser: 'New here?', close: 'Close',
    forgot: 'Forgot password?', resetSent: 'Password reset link sent to your email.',
    stats: [['Live services', serviceCount || '—'], ['Categories', categoryCount || '—'], ['Currency', 'USD'], ['Support', '24/7']],
    trust: 'What we guarantee',
    guarantee: 'Our Guarantee',
    features: [
      ['Direct delivery', 'Owned infrastructure means full control over speed and quality of every order.', Rocket],
      ['24/7 support', 'Our team is always here — live chat and tickets for your needs.', Headphones],
      ['Secure payments', 'All transactions are encrypted and recorded in an immutable ledger.', ShieldCheck],
      ['Quality guarantee', 'We back every order with a satisfaction and rework guarantee.', Award],
      ['Instant funding', 'Wallet is credited instantly after payment confirmation.', Zap],
      ['Trusted worldwide', 'We serve thousands of customers across multiple platforms globally.', Globe2]
    ],
    steps: [
      { step: '01', title: 'Create account', desc: 'Sign up free and get your instant USD wallet.' },
      { step: '02', title: 'Add funds', desc: 'Top up using local or international payment methods.' },
      { step: '03', title: 'Place order', desc: 'Choose our service and track delivery in real time.' }
    ],
    trustTitle: 'Trusted by customers worldwide',
    trustCopy: 'Our direct platform powers thousands of satisfied customers globally.',
    copyExample: 'Example feature',
    copyValue: 'Visible growth in 7 days'
  };

  const handleReset = async () => {
    try {
      if (!email.trim()) throw new Error(ar ? 'أدخل بريدك أولاً.' : 'Enter your email first.');
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
        if (!name.trim() || password.length < 8) throw new Error(ar ? 'أدخل اسم وكلمة مرور 8 أحرف على الأقل.' : 'Enter your name and an 8+ character password.');
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
    "name": "SMM Rapid",
    "url": SITE,
    "logo": "https://smmrapid.store/favicon.svg",
    "sameAs": ["https://twitter.com/smmrapid", "https://t.me/smmrapid", "https://www.facebook.com/smmrapid"],
    "contactPoint": [{ "@type": "ContactPoint", "email": "support@smmrapid.store", "contactType": "customer service", "availableLanguage": ["English", "Arabic"] }]
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "SMM Rapid",
    "url": SITE,
    "potentialAction": { "@type": "SearchAction", "target": "https://smmrapid.store/services?q={search_term_string}", "query-input": "required name=search_term_string" }
  };

  return (
    <div className="landing-shell min-h-screen bg-surface-container text-on-surface" dir={dir}>
      <SEO
        title="SMM Rapid — Direct SMM Platform"
        description="SMM Rapid is a direct SMM platform that builds and operates its own social media growth services. Owned infrastructure, direct delivery, guaranteed quality. Real followers, likes, views & engagement on Instagram, TikTok, YouTube, Facebook, Telegram & more."
        path="/"
        keywords={['SMM panel', 'social media marketing', 'buy followers', 'buy likes', 'buy views', 'Instagram followers', 'TikTok followers', 'YouTube subscribers', 'Facebook likes', 'Telegram members']}
        locale={ar ? 'ar' : 'en'}
        type="website"
        jsonLd={[organizationSchema, websiteSchema]}
        alternates={{ ar: '/ar', en: '/', xDefault: '/' }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-outline-variant bg-surface-container/95 bg-surface-container-low/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3" onClick={() => setMenu(false)}>
            <span className="brand-mark">R</span>
            <span className="text-xl font-black tracking-tight">SMM<span className="text-violet-600">Rapid</span></span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-bold text-on-surface-variant md:flex">
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
          <button className="rounded-xl bg-surface-container-high p-2 md:hidden" onClick={() => setMenu(!menu)} aria-label="menu">
            {menu ? <X /> : <Menu />}
          </button>
        </div>
        {menu && (
          <div className="border-t border-outline-variant bg-surface-container p-4 md:hidden">
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

      <main className="bg-surface-container">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-surface-container py-20">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[600px] h-[600px] rounded-full bg-violet-300/15 dark:bg-violet-600/5 blur-3xl" />
            <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-[600px] h-[600px] rounded-full bg-indigo-300/15 dark:bg-indigo-600/5 blur-3xl" />
          </div>
          <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
            <div className="mx-auto grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100/70 dark:bg-violet-900/30 rounded-full text-xs font-bold text-violet-700 dark:text-violet-300">
                  <Sparkles size={12} className="text-violet-600 dark:text-violet-400" />
                  {text.badge}
                </div>
                <h1 className="mt-6 text-4xl font-black tracking-tight text-on-surface sm:text-5xl leading-tight">
                  {text.title}
                </h1>
                <p className="mt-6 text-lg text-on-surface-variant leading-relaxed">
                  {text.copy}
                </p>
                <div className="mt-8 flex-col gap-3 sm:flex-row">
                  <button onClick={() => setAuth('register')} className="btn-primary !px-6 !py-3.5">
                    {text.start}<ArrowRight size={17} className={ar ? 'mr-1 rotate-180' : 'ml-1'} />
                  </button>
                  <Link to="/services" className="btn-ghost !px-6 !py-3.5 dark:!border-slate-600 dark:!bg-slate-800 dark:!text-gray-200">
                    {text.browse}
                  </Link>
                </div>
                <div className="mt-6 flex-wrap gap-4">
                  {text.proof.map((item: string) => (
                    <span key={item} className="flex items-center gap-1 text-sm font-medium text-on-surface-variant">
                      <Check size={14} className="text-violet-600 dark:text-violet-400" />{item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Service Catalog Preview Card */}
              <div className="relative">
                <div className="rounded-xl border border-outline-variant bg-surface-container p-6 shadow-2xl shadow-slate-200 dark:shadow-slate-900/50">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <small className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">SMM Rapid</small>
                      <h3 className="text-lg font-black text-on-surface">{text.how}</h3>
                    </div>
                    <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-600 dark:text-emerald-400">● {text.live}</span>
                  </div>

                  {/* Feature Highlight */}
                  <div className="mb-6 rounded-xl bg-surface-container-high/50 p-4 text-center">
                    <div className="text-3xl font-black text-violet-600 dark:text-violet-400 mb-1">+{serviceCount || 0}</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? 'خدمة متاحة مباشرة' : 'Services available direct'}</p>
                  </div>

                  <div className="mb-4 rounded-xl bg-surface-container-high/50 p-3">
                    <small className="text-xs font-bold text-slate-500 dark:text-slate-400">{ar ? '1 — الفئة' : '1 — Category'}</small>
                    <div className="mt-1 text-sm font-medium text-on-surface">Instagram</div>
                  </div>
                  <div className="rounded-xl bg-surface-container-high/50 p-3">
                    <small className="text-xs font-bold text-slate-500 dark:text-slate-400">{ar ? '2 — الخدمة' : '2 — Service'}</small>
                    <div className="mt-1 text-sm font-medium text-on-surface">{ar ? 'متابعين إنستجرام' : 'Instagram Followers'}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{ar ? 'جودة عالية • تسليم مباشر' : 'High quality • Direct delivery'}</div>
                  </div>
                  <div className="mt-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 p-3 text-xs text-violet-700 dark:text-violet-300">
                    {ar ? 'نحن المورّد المباشر. اختر الخدمة واستلم النتائج.' : 'We are the direct provider. Choose a service and get results.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Live Statistics Bar */}
        <section className="border-y border-outline-variant bg-surface-container/50 py-12">
          <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
            <div className="grid-cols-2 gap-8 md:grid-cols-4 md:gap-0 md:text-center">
              {[
                { value: '10M+', label: ar ? 'طلب مكتمل' : 'Orders Completed', icon: BarChart3 },
                { value: '500+', label: text.stats[0]?.[0] || (ar ? 'خدمة متاحة' : 'Live services'), icon: Zap },
                { value: '99.9%', label: ar ? 'وقت تشغيل' : 'Uptime', icon: Clock },
                { value: '24/7', label: ar ? 'دعم مباشر' : 'Direct Support', icon: Headphones }
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="flex-col items-center gap-2 md:items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                      <Icon size={20} />
                    </div>
                    <b className="text-2xl font-black text-on-surface md:text-3xl">{stat.value}</b>
                    <span className="text-sm font-medium text-on-surface-variant">{stat.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Premium Features */}
        <section className="py-20 bg-surface-container">
          <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
            <div className="text-center">
              <p className="mb-2 text-xs font-black tracking-[.16em] text-violet-600 dark:text-violet-400">{ar ? 'المميزات' : 'FEATURES'}</p>
              <h2 className="text-3xl font-black text-on-surface">{text.featuresTitle}</h2>
              <p className="mx-auto mt-3 max-w-2xl text-on-surface-variant">{text.featuresCopy}</p>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {text.features.map((f: any, i: number) => { const [title, desc, Icon] = f; return (
                <div key={i} className="flex-col rounded-xl border border-outline-variant bg-surface-container p-6 transition-all hover:shadow-xl">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                    <Icon size={24} />
                  </div>
                  <h3 className="mb-2 text-lg font-black text-on-surface">{title}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{desc}</p>
                </div>
              ); })}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how" className="py-20 bg-surface-container/30">
          <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
            <div className="text-center">
              <p className="mb-2 text-xs font-black tracking-[.16em] text-violet-600 dark:text-violet-400">{text.how}</p>
              <h2 className="text-3xl font-black text-on-surface">{text.howCopy}</h2>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {text.steps.map((step) => (
                <div key={step.step} className="relative rounded-xl border border-outline-variant bg-surface-container p-8 text-center transition-all hover:shadow-xl">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                    <span className="text-xl font-black">{step.step}</span>
                  </div>
                  <h3 className="mb-3 text-xl font-black text-on-surface">{step.title}</h3>
                  <p className="text-on-surface-variant">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Our Guarantee */}
        <section className="py-16 bg-surface-container">
          <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
            <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container">
              <div className="grid gap-8 p-8 md:grid-cols-2 md:p-12">
                <div>
                  <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 bg-violet-100 dark:bg-violet-900/30 rounded-full text-xs font-bold text-violet-700 dark:text-violet-300">
                    <ShieldCheck size={14} /> {text.guarantee}
                  </div>
                  <h2 className="mb-4 text-2xl font-black text-on-surface md:text-3xl">{text.trust}</h2>
                  <p className="mb-6 text-on-surface-variant">{text.trustCopy}</p>
                  <div className="space-y-3">
                    {[
                      ar ? 'إعادة تعبئة أو استبدال أي طلب غير راضٍ عن الجودة' : 'Re-fill or replace any order not meeting quality standards',
                      ar ? 'ضمان استرداد كامل للرصيد' : 'Full wallet refund guarantee on rejected orders',
                      ar ? 'دعم مباشر 24/7' : '24/7 direct customer support'
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check size={16} className="text-violet-600 dark:text-violet-400" />
                        <span className="text-sm text-on-surface-variant">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <div className="grid-cols-2 gap-4 w-full max-w-sm">
                    {[
                      { label: ar ? 'تسليم مباشر' : 'Direct delivery', value: '99%' },
                      { label: ar ? 'وقت استجابة سريع' : 'Fast response', value: '<30s' },
                      { label: ar ? 'جودة مضمونة' : 'Quality guaranteed', value: '100%' },
                      { label: ar ? 'دعم 24/7' : '24/7 support', value: 'مستمر' }
                    ].map((item, i) => (
                      <div key={i} className="rounded-xl bg-surface-container p-4 text-center border border-outline-variant">
                        <div className="text-2xl font-black text-violet-600 dark:text-violet-400">{item.value}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 bg-surface-container">
          <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <p className="mb-2 text-xs font-black tracking-[.16em] text-violet-600 dark:text-violet-400">FAQ</p>
              <h2 className="text-3xl font-black text-on-surface">{text.faqTitle}</h2>
              <p className="mx-auto mt-3 max-w-xl text-on-surface-variant">{text.faqCopy}</p>
            </div>
            <div className="mx-auto mt-8 max-w-3xl rounded-xl border border-outline-variant bg-surface-container shadow-sm">
              {faqs.map(([q, a], i) => (
                <div key={q} className="border-b border-outline-variant last:border-0">
                  <button onClick={() => setFaq(faq === i ? -1 : i)} className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left">
                    <span className="font-medium text-on-surface">{q}</span>
                    <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${faq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {faq === i && (
                    <div className="px-6 pb-4">
                      <p className="text-sm text-on-surface-variant mb-2">{a}</p>
                      {faqs[i][2] && <p className="text-sm text-outline">{faqs[i][2]}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-gradient-to-br from-violet-600 to-indigo-700 text-white">
          <div className="mx-auto max-w-[1240px] px-4 text-center sm:px-6">
            <div className="mx-auto max-w-2xl">
              <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-violet-200" />
              <h2 className="mt-4 text-3xl font-black">{text.ctaTitle}</h2>
              <p className="mx-auto mt-3 max-w-xl text-violet-100">{text.ctaCopy}</p>
              <button onClick={() => setAuth('register')} className="btn-ghost mt-7 !border-0 !border-white/20 !bg-surface-container/10 text-white hover:!bg-surface-container/20">
                {text.cta}<ArrowRight size={16} className={ar ? 'mr-1 rotate-180' : 'ml-1'} />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Auth Modal */}
      {auth && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={e => { if (e.currentTarget === e.target) setAuth(null); }}>
          <div className="w-full max-w-md rounded-xl bg-surface-container p-6 shadow-2xl sm:p-8" dir={dir}>
            <div className="mb-6 flex items-start justify-between">
              <div>
                <span className="brand-mark">R</span>
                <h2 className="mt-4 text-2xl font-black text-on-surface">{auth === 'register' ? text.registerTitle : text.loginTitle}</h2>
              </div>
              <button className="rounded-xl bg-surface-container-high text-on-surface p-2" onClick={() => setAuth(null)} aria-label={text.close}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
              {auth === 'register' && (
                <div>
                  <label className="label-primary text-on-surface-variant">{text.name}</label>
                  <input className="input-primary bg-surface-container-high border border-outline-variant text-on-surface placeholder:text-outline"
                    value={name} onChange={e => setName(e.target.value)} required />
                </div>
              )}
              <div>
                <label className="label-primary text-on-surface-variant">{text.email}</label>
                <input className="input-primary bg-surface-container-high border border-outline-variant text-on-surface placeholder:text-outline"
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="label-primary text-on-surface-variant">{text.password}</label>
                <input className="input-primary bg-surface-container-high border border-outline-variant text-on-surface placeholder:text-outline"
                  type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              {auth === 'login' && (
                <div className="text-right">
                  <button type="button" onClick={handleReset} className="text-xs font-bold text-violet-600 dark:text-violet-400">{text.forgot}</button>
                </div>
              )}
              {auth === 'register' && (
                <div>
                  <label className="label-primary text-on-surface-variant">{text.ref} <span className="font-normal text-slate-400 dark:text-slate-500">({text.optional})</span></label>
                  <input className="input-primary bg-surface-container-high border border-outline-variant text-on-surface placeholder:text-outline"
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
              <div className="mt-4 text-center text-sm text-on-surface-variant">
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
      <footer className="border-t border-outline-variant bg-surface-container py-8">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
          <div className="flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <span className="brand-mark">R</span>
              <span className="text-xl font-black">SMM<span className="text-violet-600">Rapid</span></span>
            </div>
            <div className="flex-wrap items-center justify-center gap-6 text-sm text-on-surface-variant">
              <Link to="/terms" className="hover:text-violet-600 dark:hover:text-violet-400">{ar ? 'الشروط' : 'Terms'}</Link>
              <Link to="/privacy" className="hover:text-violet-600 dark:hover:text-violet-400">{ar ? 'الخصوصية' : 'Privacy'}</Link>
              <Link to="/refund-policy" className="hover:text-violet-600 dark:hover:text-violet-400">{ar ? 'الاسترجاع' : 'Refunds'}</Link>
              <Link to="/support" className="hover:text-violet-600 dark:hover:text-violet-400">{text.navSupport}</Link>
              <Link to="/blog" className="hover:text-violet-600 dark:hover:text-violet-400">{text.navBlog}</Link>
              <Link to="/api" className="hover:text-violet-600 dark:hover:text-violet-400">{text.navApi}</Link>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              &copy; {new Date().getFullYear()} SMM Rapid. {ar ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
