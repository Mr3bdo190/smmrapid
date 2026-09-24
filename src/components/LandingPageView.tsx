import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PlatformBadge } from './PlatformBadge';
import {
  Zap,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Users,
  ShoppingCart,
  Headphones,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  ArrowLeft,
  Star,
  Layers,
  CreditCard,
  Lock,
  Globe2,
  HelpCircle,
  Play
} from 'lucide-react';

export const LandingPageView: React.FC = () => {
  const { language, services } = useApp();
  const isAr = language === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  // Selected top popular services for preview
  const featuredServices = services.slice(0, 6);

  const stats = [
    { value: '150,000+', labelAr: 'طلب مكتمل بنجاح', labelEn: 'Completed Orders' },
    { value: '10,000+', labelAr: 'صانع محتوى ووكالة', labelEn: 'Active Creators & Agencies' },
    { value: '0 - 5s', labelAr: 'متوسط سرعة بدء التنفيذ', labelEn: 'Average Start Time' },
    { value: '99.9%', labelAr: 'معدل رضا العملاء والأمان', labelEn: 'Client Satisfaction Rate' },
  ];

  const features = [
    {
      icon: Zap,
      titleAr: 'سيرفرات تنفيذ فورية وآلية 100%',
      titleEn: 'Instant Automated Execution',
      descAr: 'ترتبط طلباتك فوراً بأقوى السيرفرات المباشرة دون أي تدخل يدوي، لتبدأ الزيادة خلال ثوانٍ معدودة.',
      descEn: 'Orders are directly routed to high-speed dedicated nodes with zero manual intervention.'
    },
    {
      icon: RotateCcw,
      titleAr: 'ضمان تعويض مجاني (Non-Drop Refill)',
      titleEn: 'Lifetime & 365D Refill Guarantee',
      descAr: 'خدمات مستقرة وحسابات عالية الجودة مع زر إعادة تعبئة تلقائي مجاني بضمان يصل إلى سنة كاملة.',
      descEn: 'Stable accounts with non-drop retention and automated refill buttons valid up to 365 days.'
    },
    {
      icon: CreditCard,
      titleAr: 'وسائل دفع محلية وعالمية فائقة السهولة',
      titleEn: 'Local & Global Seamless Payments',
      descAr: 'ادفع بكل أمان عبر فودافون كاش، إنستاباي، أورنج، إتصالات، والبطاقات البنكية، بالإضافة إلى USDT والعملات الرقمية.',
      descEn: 'Pay instantly via Vodafone Cash, InstaPay, Orange, Etisalat, Credit Cards, and USDT TRC-20.'
    },
    {
      icon: ShieldCheck,
      titleAr: 'أمان كامل 100% ولا نطلب كلمات مرور',
      titleEn: '100% Account Safety - No Passwords',
      descAr: 'نحتاج فقط إلى الرابط العام لحسابك أو منشورك. لن نطلب أبداً كلمة المرور لحسابك لحمايتك التامة.',
      descEn: 'Only your public profile or post link is needed. We never ask for account credentials.'
    },
    {
      icon: TrendingUp,
      titleAr: 'أسعار الجملة المباشرة للمسوقين والوكالات',
      titleEn: 'Direct Wholesale Reseller Rates',
      descAr: 'أرخص الأسعار في الشرق الأوسط مع خصومات تصاعدية وبونص إيداع إضافي على كل شحنة.',
      descEn: 'Lowest wholesale rates in MENA with tier discounts and deposit bonuses on every charge.'
    },
    {
      icon: Headphones,
      titleAr: 'دعم فني حقيقي 24/7 طوال الأسبوع',
      titleEn: '24/7 Dedicated Live Support',
      descAr: 'فريق دعم متخصص جاهز لمساعدتك عبر الشات المباشر ونظام التذاكر لحل أي استفسار في دقائق.',
      descEn: 'Professional support team ready 24/7 via live interactive chat and prioritized tickets.'
    }
  ];

  const steps = [
    {
      step: '01',
      titleAr: 'أنشئ حسابك في ثوانٍ',
      titleEn: 'Create Your Free Account',
      descAr: 'سجل مجاناً بدون أي رسوم اشتراك، واحصل على لوحة تحكم كاملة لإدارة تواجدك الرقمي.',
      descEn: 'Sign up in under 30 seconds with no recurring membership fees.'
    },
    {
      step: '02',
      titleAr: 'اختر الخدمة وضع الرابط',
      titleEn: 'Select Service & Enter Link',
      descAr: 'تصفح قائمة الخدمات لإنستغرام، تيك توك، يوتيوب، أو تيليجرام وضع رابط حسابك والكمية المطلوبة.',
      descEn: 'Pick your preferred platform, target quantity, and simply paste your public URL.'
    },
    {
      step: '03',
      titleAr: 'شاهد التفاعل يرتفع فوراً',
      titleEn: 'Watch Instant Organic Growth',
      descAr: 'يبدأ السيرفر في ضخ التفاعل الفوري لتتصدر خوارزميات إكسبلور وتزيد مبيعاتك وشهرتك.',
      descEn: 'High-speed nodes allocate the delivery immediately to trigger trending algorithms.'
    }
  ];

  const faqs = [
    {
      qAr: 'هل استخدام خدمات SMM Rapid آمن على حساباتي الرسمية؟',
      qEn: 'Are SMM Rapid services safe for my official accounts?',
      aAr: 'نعم بنسبة 100%. خدماتنا متوافقة مع إرشادات المنصات، وتعتمد على تدفق طبيعي وتدريجي دون الحاجة لكلمة مرور حسابك نهائياً.',
      aEn: '100% safe. We deliver using compliant algorithms and never require your account passwords.'
    },
    {
      qAr: 'ما هي طرق الدفع المتوفرة لشحن الرصيد؟',
      qEn: 'What payment methods are supported?',
      aAr: 'نوفر وسائل الدفع الأكثر استخداماً: المحافظ الإلكترونية المصرية (فودافون كاش، أورنج كاش، إتصالات كاش)، وتطبيق إنستاباي InstaPay، والبطاقات الائتمانية والبنكية، والعملات الرقمية USDT TRC-20.',
      aEn: 'We support Egyptian E-Wallets (Vodafone, Orange, Etisalat Cash), InstaPay, Debit/Credit Cards, and USDT TRC-20.'
    },
    {
      qAr: 'كم من الوقت يستغرق بدء تنفيذ الطلب بعد إرساله؟',
      qEn: 'How fast do orders start executing?',
      aAr: 'معظم الخدمات تبدأ بشكل آلي وفوري خلال 0 إلى 3 دقائق من لحظة تأكيد الطلب، مع إمكانية التتبع المباشر لنسبة الإنجاز.',
      aEn: 'Most packages start automatically within 0 to 3 minutes, with live real-time progress tracking.'
    },
    {
      qAr: 'ما هو نظام التعويض المجاني (Refill)؟',
      qEn: 'What is the free Refill guarantee?',
      aAr: 'إذا حدث أي انخفاض في التفاعل المضاف خلال فترة الضمان المحددة للخدمة (30 إلى 365 يوماً)، يمكنك الضغط على زر "إعادة التعبئة" بضغطة واحدة ليقوم النظام بتعويض النقص مجاناً.',
      aEn: 'If any drop occurs within the warranty period (30 to 365 days), simply click Refill to automatically top up at no extra cost.'
    }
  ];

  return (
    <div className="space-y-16 sm:space-y-24 py-4 sm:py-8">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white p-6 sm:p-12 lg:p-16 border border-slate-800 shadow-2xl">
        <div className="absolute top-0 end-0 -mt-12 -me-12 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 start-0 -mb-12 -ms-12 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs sm:text-sm font-bold tracking-wide">
            <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
            <span>{isAr ? 'السيرفر الأقوى والأسرع في الشرق الأوسط ⚡' : 'The #1 Fastest SMM Platform in MENA ⚡'}</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight sm:leading-tight">
            {isAr ? (
              <>
                انطلق بحسابك إلى القمة مع{' '}
                <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
                  أقوى خدمات السوشيال ميديا
                </span>
              </>
            ) : (
              <>
                Skyrocket Your Social Growth With{' '}
                <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
                  High-Speed SMM Services
                </span>
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg lg:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            {isAr
              ? 'متابعون، مشاهدات، ولايكات حقيقية لجميع منصات التواصل (إنستغرام، تيك توك، يوتيوب، تيليجرام). تنفيذ فوري، ضمان عدم النقصان، وبأفضل أسعار الجملة.'
              : 'Real followers, views, and likes across Instagram, TikTok, YouTube, and Telegram. Instant execution, non-drop warranty, and wholesale pricing.'}
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-base shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>{isAr ? 'ابدأ الآن مجاناً' : 'Get Started Free'}</span>
              <ArrowIcon className="w-5 h-5" />
            </Link>

            <Link
              to="/services"
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 text-white font-bold text-base border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Layers className="w-5 h-5 text-cyan-400" />
              <span>{isAr ? 'تصفح قائمة الخدمات والأسعار' : 'Browse Services & Rates'}</span>
            </Link>

            <Link
              to="/login"
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-transparent hover:bg-slate-800/50 text-slate-300 hover:text-white font-bold text-sm transition-all flex items-center justify-center cursor-pointer"
            >
              <span>{isAr ? 'تسجيل الدخول ←' : 'Sign In →'}</span>
            </Link>
          </div>

          {/* Live Trust Badges */}
          <div className="pt-6 sm:pt-8 grid grid-cols-2 md:grid-cols-4 gap-3 text-start">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/50 border border-slate-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-200">
                {isAr ? 'تنفيذ آلي وفوري 24/7' : 'Instant 24/7 Automation'}
              </span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/50 border border-slate-800">
              <RotateCcw className="w-5 h-5 text-cyan-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-200">
                {isAr ? 'ضمان تعويض مجاني Refill' : 'Guaranteed Free Refill'}
              </span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/50 border border-slate-800">
              <CreditCard className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-200">
                {isAr ? 'فودافون كاش وإنستاباي' : 'Vodafone Cash & InstaPay'}
              </span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/50 border border-slate-800">
              <Lock className="w-5 h-5 text-purple-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-200">
                {isAr ? 'أمان 100% بدون باسورد' : '100% Safe - No Passwords'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Numerical Stats Banner */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((s, idx) => (
          <div
            key={idx}
            className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-center space-y-1"
          >
            <div className="text-2xl sm:text-4xl font-black bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
              {s.value}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
              {isAr ? s.labelAr : s.labelEn}
            </div>
          </div>
        ))}
      </section>

      {/* Featured Services Preview Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
              {isAr ? 'أسعار لا تقبل المنافسة' : 'Unbeatable Wholesale Pricing'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
              {isAr ? 'أشهر الخدمات الأكثر طلباً واستقراراً' : 'Popular & Ultra-Fast Services'}
            </h2>
          </div>
          <Link
            to="/services"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
          >
            <span>{isAr ? 'عرض جميع الخدمات والأسعار (50+ خدمة)' : 'View all 50+ services & prices'}</span>
            <ArrowIcon className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredServices.map((service) => (
            <div
              key={service.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <PlatformBadge platform={service.platform} />
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    ID #{service.id}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug line-clamp-2">
                  {isAr ? service.nameAr : service.nameEn}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {isAr ? service.descriptionAr : service.descriptionEn}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {isAr ? 'السعر لكل 1000' : 'Rate per 1,000'}
                  </div>
                  <div className="text-base sm:text-lg font-black text-cyan-600 dark:text-cyan-400">
                    ${service.ratePer1000.toFixed(2)}
                  </div>
                </div>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500 text-cyan-600 dark:text-cyan-400 hover:text-white text-xs font-bold transition-colors"
                >
                  {isAr ? 'اطلب الآن' : 'Order Now'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why Choose SMM Rapid Features Grid */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
            {isAr ? 'لماذا نحن الأفضل؟' : 'Why Choose Us?'}
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white">
            {isAr ? 'بنية تحتية مصممة للنمو والسرعة القصوى' : 'Engineered for Scale & Speed'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isAr
              ? 'نضمن لك استقراراً لا مثيل له ونتائج حقيقية تبني مصداقية حسابك وتجلب لك المزيد من التفاعل الطبيعي.'
              : 'Reliable infrastructure delivering genuine engagement to boost your digital presence.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, idx) => {
            const Icon = f.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 hover:translate-y-[-2px] transition-transform"
              >
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 dark:bg-cyan-950/40 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isAr ? f.titleAr : f.titleEn}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {isAr ? f.descAr : f.descEn}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works - 3 Easy Steps */}
      <section className="p-8 sm:p-12 rounded-3xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
            {isAr ? 'سهولة تامة' : 'Simple 3-Step Process'}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {isAr ? 'كيف تبدأ خلال دقيقة واحدة؟' : 'How It Works in 1 Minute'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((st, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 relative"
            >
              <div className="text-3xl font-black text-cyan-500/30 dark:text-cyan-400/20">
                {st.step}
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isAr ? st.titleAr : st.titleEn}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {isAr ? st.descAr : st.descEn}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Supported Payment Channels */}
      <section className="text-center space-y-6">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
          {isAr ? 'طرق الدفع والشحن المعتمدة والفورية' : 'Supported Payment Methods'}
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-w-3xl mx-auto">
          {['Vodafone Cash', 'InstaPay', 'Orange Cash', 'Etisalat Cash', 'Visa / Mastercard', 'USDT TRC-20', 'PayPal'].map((method, idx) => (
            <div
              key={idx}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 shadow-xs"
            >
              {method}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="space-y-6 max-w-4xl mx-auto">
        <div className="text-center space-y-2">
          <div className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
            {isAr ? 'إجابات مباشرة' : 'Got Questions?'}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {isAr ? 'الأسئلة الشائعة والأكثر تكراراً' : 'Frequently Asked Questions'}
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 text-start"
            >
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-cyan-500 shrink-0" />
                <span>{isAr ? faq.qAr : faq.qEn}</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed ps-6">
                {isAr ? faq.aAr : faq.aEn}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom Conversion Banner */}
      <section className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 text-white text-center space-y-6 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl mx-auto space-y-4">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            {isAr ? 'جاهز لمضاعفة تفاعل حسابك اليوم؟' : 'Ready to Multiply Your Reach Today?'}
          </h2>
          <p className="text-sm sm:text-base text-cyan-100 leading-relaxed">
            {isAr
              ? 'انضم إلى آلاف صناع المحتوى ورواد الأعمال والوكالات الذين يعتمدون على SMM Rapid يومياً.'
              : 'Join thousands of creators, influencers, and agencies growing with SMM Rapid daily.'}
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white text-slate-950 hover:bg-slate-100 font-black text-sm shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              {isAr ? 'أنشئ حسابك مجاناً الآن' : 'Create Free Account Now'}
            </Link>
            <Link
              to="/services"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-cyan-700/50 hover:bg-cyan-700/70 text-white font-bold text-sm border border-cyan-400/30 transition-all cursor-pointer"
            >
              {isAr ? 'استكشف قائمة الأسعار' : 'Explore Price List'}
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};
