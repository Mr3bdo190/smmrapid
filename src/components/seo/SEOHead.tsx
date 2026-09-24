import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export interface SEOHeadProps {
  customTitle?: string;
  customDescription?: string;
  customKeywords?: string;
  noIndex?: boolean;
}

interface TabSEOConfig {
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  keywordsAr: string;
  keywordsEn: string;
  isPrivate?: boolean;
}

const TAB_SEO_CONFIG: Record<string, TabSEOConfig> = {
  dashboard: {
    titleAr: 'SMM Rapid | لوحة التحكم - منصة خدمات السوشيال ميديا الرائدة',
    titleEn: 'SMM Rapid | Dashboard - Premier Social Media Growth Panel',
    descriptionAr: 'لوحة تحكم SMM Rapid المتكاملة لإدارة حملات السوشيال ميديا، زيادة المتابعين والتفاعل الفوري، ومتابعة رصيد المحفظة بأرخص الأسعار.',
    descriptionEn: 'SMM Rapid comprehensive dashboard to scale your social media presence with instant followers, likes, views, and automated order fulfillment.',
    keywordsAr: 'سيرفر رشق, شراء متابعين, زيادة متابعين انستقرام, متابعين تيك توك, زيادة لايكات, smm panel egypt, smm panel arab',
    keywordsEn: 'smm panel, buy followers, instagram followers, tiktok likes, youtube views, social media marketing wholesale'
  },
  new_order: {
    titleAr: 'SMM Rapid | إنشاء طلب جديد - رشق متابعين وتفاعل فوري وضمان الثبات',
    titleEn: 'SMM Rapid | New Order - Instant Followers, Likes & Non-Drop Engagement',
    descriptionAr: 'اختر من بين أكثر من 1,500 خدمة فورية لمنصات إنستغرام، تيك توك، يوتيوب، وتلغرام مع ضمان التعويض التلقائي وتنفيذ خلال ثوانٍ.',
    descriptionEn: 'Order from 1,500+ instant services for Instagram, TikTok, YouTube, and Telegram with automatic refill guarantee and high delivery speed.',
    keywordsAr: 'طلب متابعين, رشق لايكات, شراء مشاهدات ريلز, زيادة مشتركين يوتيوب, متابعين تويتر عرب, رشق تيليجرام',
    keywordsEn: 'order followers, buy likes, cheap views, youtube subscribers, twitter x engagement, telegram members'
  },
  orders: {
    titleAr: 'SMM Rapid | سجل الطلبات - تتبع حالة الطلبات والكميات المتبقية لحظياً',
    titleEn: 'SMM Rapid | Order Tracking & History - Live Status & Progress Updates',
    descriptionAr: 'تابع سير تنفيذ طلباتك لحظة بلحظة، حالة البداية، التقدم، وزر التعويض المجاني بضغطة زر لجميع المنصات.',
    descriptionEn: 'Track your SMM orders in real-time with live progress counters, initial start counts, and one-click automatic refill guarantees.',
    keywordsAr: 'تتبع الطلب, فحص حالة الطلب, تعويض المتابعين, smm order status, سجل عمليات الرشق',
    keywordsEn: 'order tracking, order progress, refill followers, smm order log, live status'
  },
  services: {
    titleAr: 'SMM Rapid | قائمة الخدمات والأسعار - أرخص سيرفر سوشيال ميديا 2026',
    titleEn: 'SMM Rapid | Services & Wholesale Pricing - Top SMM Provider 2026',
    descriptionAr: 'استعرض قائمة أسعار الجملة لخدمات إنستغرام، فيسبوك، تيك توك، يوتيوب، وسبوتيفاي تبدأ من $0.001 لكل 1000 مع سرعة فائقة وضمان.',
    descriptionEn: 'Browse wholesale price catalog for Instagram, TikTok, YouTube, Facebook, and Spotify starting at $0.001 per 1k with instant delivery.',
    keywordsAr: 'اسعار سيرفر المتابعين, ارخص سيرفر سوشيال ميديا, اسعار رشق تيك توك, تكلفة متابعين انستقرام, سيرفر موزعين smm',
    keywordsEn: 'smm service list, wholesale smm prices, cheapest smm reseller, bulk social media services'
  },
  affiliates: {
    titleAr: 'SMM Rapid | نظام التسويق بالعمولة - اربح حتى 15% عمولة متكررة مدى الحياة',
    titleEn: 'SMM Rapid | Affiliate Program - Earn up to 15% Lifetime Recurring Commissions',
    descriptionAr: 'انضم لبرنامج الإحالة واربح عمولة نقدية مباشرة على كل إيداع يقوم به عملاؤك مع سحب فوري عبر فودافون كاش وإنستاباي وUSDT.',
    descriptionEn: 'Join SMM Rapid affiliate referral program and earn up to 15% recurring commissions on every deposit with instant cashouts.',
    keywordsAr: 'افلييت سيرفر متابعين, ربح من الانترنت, تسويق بالعمولة, برنامج شركاء smm, سحب ارباح فودافون كاش',
    keywordsEn: 'smm affiliate program, earn money online, referral commissions, reseller partner, smm passive income'
  },
  analytics: {
    titleAr: 'SMM Rapid | تحليلات النمو والإنفاق - تقارير ذكية لأداء حملاتك',
    titleEn: 'SMM Rapid | Growth Analytics & Insights - Smart Campaign Reporting',
    descriptionAr: 'تقارير بيانية تفاعلية لحجم الإنفاق، معدلات نجاح الطلبات، وأكثر المنصات استخداماً لتحسين استراتيجية التسويق الرقمي.',
    descriptionEn: 'Interactive charts and analytics for your social media growth spend, order delivery rates, and platform distribution insights.',
    keywordsAr: 'تحليلات سوشيال ميديا, احصائيات الطلبات, تقرير الحملات, smm analytics',
    keywordsEn: 'social media analytics, order spending metrics, smm performance reports'
  },
  reviews: {
    titleAr: 'SMM Rapid | تقييمات وآراء العملاء - تقييم 4.9/5 لأكثر من 45,000 عميل',
    titleEn: 'SMM Rapid | Verified Reviews & Testimonials - 4.9/5 Rating by 45,000+ Clients',
    descriptionAr: 'اقرأ تجارب وتقييمات العملاء الحقيقيين ومسؤولي الوكالات الإعلانية لخدمات وسرعة ودعم منصة SMM Rapid.',
    descriptionEn: 'Read genuine verified reviews and testimonials from influencers, digital agencies, and resellers using SMM Rapid.',
    keywordsAr: 'تقييمات smm rapid, تجارب موقع smm, هل سيرفر المتابعين مضمون, مراجعات العملاء',
    keywordsEn: 'smm rapid reviews, customer feedback, trustpilot smm, verified testimonials'
  },
  settings: {
    titleAr: 'SMM Rapid | إعدادات الحساب والأمان ومولد الفيكتور ومفاتيح API',
    titleEn: 'SMM Rapid | Account Settings, Security, Avatar & API Credentials',
    descriptionAr: 'تحكم في ملفك الشخصي، مولد الفيكتور الرمزي، التحقق بخطوتين 2FA، وربط مفتاح API لمزامنة متجرك مع خوادمنا.',
    descriptionEn: 'Manage your profile details, vector avatar generator, two-factor authentication 2FA, and developer REST API keys.',
    keywordsAr: 'اعدادات الحساب, مفتاح api سيرفر, ربط api smm, حماية الحساب',
    keywordsEn: 'account settings, smm api key, two-factor authentication, security profile',
    isPrivate: true
  },
  help: {
    titleAr: 'SMM Rapid | مركز المساعدة والأسئلة الشائعة - دليل الاستخدام الشامل',
    titleEn: 'SMM Rapid | Help Center & FAQ - Comprehensive User Guides',
    descriptionAr: 'كل ما تحتاج لمعرفته حول كيفية الطلب، طرق الشحن بفودافون كاش وإنستاباي، نظام التعويض، وكيفية ربط واجهة API.',
    descriptionEn: 'Explore guides on how to order, deposit funds with local and international gateways, refill guarantees, and API setup.',
    keywordsAr: 'شرح موقع smm, كيف اطلب متابعين, اسئلة شائعة رشق, مساعدة شحن فودافون كاش',
    keywordsEn: 'smm help center, how to order smm, smm faq, deposit instructions'
  },
  support: {
    titleAr: 'SMM Rapid | الدعم الفني المباشر 24/7 - مساعدة فورية وتذاكر الدعم',
    titleEn: 'SMM Rapid | 24/7 Live Support & Helpdesk - Instant Order Assistance',
    descriptionAr: 'فريق دعم فني متخصص يعمل على مدار الساعة 24/7 عبر المحادثة المباشرة وتذاكر الدعم لمتابعة طلباتك والإجابة عن استفساراتك.',
    descriptionEn: 'Connect with our 24/7 dedicated support team through live chat and priority tickets for instant order assistance.',
    keywordsAr: 'دعم فني سيرفر متابعين, شات مباشر smm, رقم واتساب دعم smm, تذاكر الدعم',
    keywordsEn: 'smm live support, 24/7 customer service, helpdesk chat, order support ticket'
  },
  login: {
    titleAr: 'SMM Rapid | تسجيل الدخول - الوصول إلى حسابك ومحفظتك',
    titleEn: 'SMM Rapid | Sign In - Access Your Account & Balance',
    descriptionAr: 'سجل دخولك إلى منصة SMM Rapid للوصول إلى لوحة التحكم، شحن الرصيد، وطلب خدمات السوشيال ميديا بأسعار الجملة.',
    descriptionEn: 'Log in to your SMM Rapid account to manage social media campaigns, track orders, and top up your wholesale wallet.',
    keywordsAr: 'تسجيل دخول smm, لوحة العملاء, دخول سيرفر رشق',
    keywordsEn: 'smm login, client portal, sign in smm panel'
  },
  register: {
    titleAr: 'SMM Rapid | إنشاء حساب جديد مجاناً - احصل على بونص ترحيبي $5.00',
    titleEn: 'SMM Rapid | Create Free Account - Claim Instant $5.00 Welcome Bonus',
    descriptionAr: 'أنشئ حسابك مجاناً خلال 30 ثانية في أسرع سيرفر سوشيال ميديا في الوطن العربي، واحصل على بونص ترحيبي وتفعيل فوري.',
    descriptionEn: 'Join SMM Rapid in 30 seconds to enjoy direct wholesale pricing, automatic refills, and claim your instant $5.00 welcome bonus.',
    keywordsAr: 'تسجيل حساب جديد smm, حساب سيرفر متابعين, بونص مجاني, تفعيل فوري',
    keywordsEn: 'register smm panel, free sign up, bonus smm credit, instant account'
  },
  admin: {
    titleAr: 'SMM Rapid | لوحة الإدارة العليا والتحكم الشامل للمنصة (Admin)',
    titleEn: 'SMM Rapid | Super Admin Control Suite & Platform Management',
    descriptionAr: 'لوحة التحكم الإدارية المركزية لإدارة الطلبات والمزودين والمستخدمين، واعتماد طلبات الشحن وتوليد التقارير المالية.',
    descriptionEn: 'Central administrative suite for platform management, order routing, user permissions, and financial statements.',
    keywordsAr: 'admin smm panel, لوحة الادمن, ادارة السيرفر',
    keywordsEn: 'admin control panel, smm administration, root console',
    isPrivate: true
  }
};

export const SEOHead: React.FC<SEOHeadProps> = ({
  customTitle,
  customDescription,
  customKeywords,
  noIndex
}) => {
  const { activeTab, language, isAdminMode } = useApp();
  const isAr = language === 'ar';

  const currentConfigKey = isAdminMode ? 'admin' : activeTab || 'dashboard';
  const config = TAB_SEO_CONFIG[currentConfigKey] || TAB_SEO_CONFIG.dashboard;

  const pageTitle = customTitle || (isAr ? config.titleAr : config.titleEn);
  const pageDescription = customDescription || (isAr ? config.descriptionAr : config.descriptionEn);
  const pageKeywords = customKeywords || (isAr ? config.keywordsAr : config.keywordsEn);

  const shouldNoIndex = noIndex || config.isPrivate || isAdminMode;

  const location = useLocation();

  // Canonical URL construction
  const currentUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${location.pathname}`;
    }
    return `https://smmrapid.com${location.pathname || '/'}`;
  }, [location.pathname]);

  // Schema.org JSON-LD Structured Data
  const schemaStructuredData = useMemo(() => {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebApplication',
          '@id': 'https://smmrapid.com/#webapp',
          name: 'SMM Rapid',
          url: 'https://smmrapid.com',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'All',
          description: isAr
            ? 'منصة خدمات التواصل الاجتماعي الرائدة لزيادة المتابعين والتفاعل بسرعة فائقة وأسعار تنافسية ولوحة تحكم متكاملة.'
            : 'Premier automated social media marketing panel offering wholesale followers, engagement, and automated API fulfillment.',
          offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'USD',
            lowPrice: '0.001',
            highPrice: '50.00',
            offerCount: '1500'
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.9',
            bestRating: '5',
            worstRating: '1',
            ratingCount: '45820'
          }
        },
        {
          '@type': 'Organization',
          '@id': 'https://smmrapid.com/#organization',
          name: 'SMM Rapid Inc.',
          url: 'https://smmrapid.com',
          logo: 'https://smmrapid.com/logo.png',
          contactPoint: {
            '@type': 'ContactPoint',
            telephone: '+20-100-000-0000',
            contactType: 'customer support',
            availableLanguage: ['Arabic', 'English']
          }
        },
        {
          '@type': 'BreadcrumbList',
          '@id': `${currentUrl}#breadcrumb`,
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: isAr ? 'الرئيسية' : 'Home',
              item: 'https://smmrapid.com'
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: isAr ? config.titleAr.split('|')[1]?.trim() || 'الصفحة' : config.titleEn.split('|')[1]?.trim() || 'Page',
              item: currentUrl
            }
          ]
        }
      ]
    };
  }, [isAr, config, currentUrl]);

  return (
    <Helmet>
      {/* HTML Language & Direction Attributes */}
      <html lang={isAr ? 'ar' : 'en'} dir={isAr ? 'rtl' : 'ltr'} />

      {/* Primary Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="title" content={pageTitle} />
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={pageKeywords} />
      <link rel="canonical" href={currentUrl} />

      {/* Search Engine Robots Indexing Directives */}
      {shouldNoIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      )}

      {/* OpenGraph (Facebook, LinkedIn, Discord, Telegram) */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:site_name" content="SMM Rapid" />
      <meta property="og:locale" content={isAr ? 'ar_AR' : 'en_US'} />

      {/* Twitter / X Social Share Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={currentUrl} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />

      {/* Schema.org Structured Data (JSON-LD) */}
      <script type="application/ld+json">
        {JSON.stringify(schemaStructuredData)}
      </script>
    </Helmet>
  );
};
