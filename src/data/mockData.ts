import { ServiceItem, OrderItem, CustomerReview, SocialPlatform, UserProfile, SecuritySettings, ActiveSession } from '../types';

export const INITIAL_SERVICES: ServiceItem[] = [
  // Instagram Services
  {
    id: 'ig-101',
    platform: 'instagram',
    categoryAr: 'متابعين انستغرام - Instagram Followers',
    categoryEn: 'Instagram Followers',
    nameAr: 'متابعين انستغرام حقيقيين عرب [ضمان 30 يوم - سرعة فائقة - لا ينقص]',
    nameEn: 'Instagram Real Arab Followers [30 Days Refill - Ultra Fast - Non-Drop]',
    ratePer1000: 2.80,
    min: 100,
    max: 50000,
    avgTimeAr: '15 دقيقة للبدء',
    avgTimeEn: '15 mins start',
    refillDays: 30,
    speed: 'super_fast',
    badge: 'popular',
    descriptionAr: 'حسابات حقيقية ونشطة مع صور شخصية ومنشورات، سرعة الإرسال 5,000 إلى 15,000 في اليوم.',
    descriptionEn: 'Real active accounts with avatars and posts. Delivery speed 5K - 15K per day.'
  },
  {
    id: 'ig-102',
    platform: 'instagram',
    categoryAr: 'متابعين انستغرام - Instagram Followers',
    categoryEn: 'Instagram Followers',
    nameAr: 'متابعين انستغرام عالميين بجودة عالية [بدء فوري - ضمان 365 يوم]',
    nameEn: 'Instagram High-Quality Global Followers [Instant Start - 365D Refill]',
    ratePer1000: 1.45,
    min: 50,
    max: 200000,
    avgTimeAr: 'فوري (خلال 2 دقيقة)',
    avgTimeEn: 'Instant (within 2 mins)',
    refillDays: 365,
    speed: 'instant',
    badge: 'best_value',
    descriptionAr: 'أفضل خيار لزيادة الأرقام بسرعة فائقة مع ضمان إعادة تعبئة تلقائي لمدة سنة كاملة.',
    descriptionEn: 'Top choice to boost follower count rapidly with auto-refill guarantee for a full year.'
  },
  {
    id: 'ig-103',
    platform: 'instagram',
    categoryAr: 'إعجابات انستغرام - Instagram Likes',
    categoryEn: 'Instagram Likes',
    nameAr: 'لايكات انستغرام فوريّة [جودة ممتازة + وصول للمستكشف Explore]',
    nameEn: 'Instagram Instant Likes [HQ + Explore Reach Booster]',
    ratePer1000: 0.60,
    min: 20,
    max: 100000,
    avgTimeAr: 'فوري 0-5 دقائق',
    avgTimeEn: 'Instant 0-5 mins',
    refillDays: 30,
    speed: 'instant',
    badge: 'trending',
    descriptionAr: 'تصل اللايكات فوراً وتساعد منشورك أو ريلز على الصعود في صفحة Explore وزيادة الوصول الطبيعي.',
    descriptionEn: 'Instant delivery helping your post or Reels appear in the Explore page and boost impressions.'
  },
  {
    id: 'ig-104',
    platform: 'instagram',
    categoryAr: 'مشاهدات ريلز - Instagram Reels',
    categoryEn: 'Instagram Reels Views',
    nameAr: 'مشاهدات انستغرام ريلز سريعة [سرعة مليون باليوم - فائقة الاستقرار]',
    nameEn: 'Instagram Reels Views [Speed 1M/Day - Ultra Stable]',
    ratePer1000: 0.15,
    min: 100,
    max: 5000000,
    avgTimeAr: 'دقيقة واحدة',
    avgTimeEn: '1 minute',
    refillDays: 0,
    speed: 'super_fast',
    badge: 'best_value',
    descriptionAr: 'أرخص وأسرع خدمة مشاهدات ريلز في الشرق الأوسط، تدعم الروابط المباشرة وتصل للتريند.',
    descriptionEn: 'Fastest & cheapest Reels views, supports direct links to get your clip on trending algorithms.'
  },

  // TikTok Services
  {
    id: 'tk-201',
    platform: 'tiktok',
    categoryAr: 'متابعين تيك توك - TikTok Followers',
    categoryEn: 'TikTok Followers',
    nameAr: 'متابعين تيك توك حقيقيين [حسابات نشطة - سرعة 10k/يوم - ضمان 60 يوم]',
    nameEn: 'TikTok Real Followers [Active Profiles - 10k/day - 60D Refill]',
    ratePer1000: 4.20,
    min: 100,
    max: 100000,
    avgTimeAr: '10 دقائق',
    avgTimeEn: '10 mins',
    refillDays: 60,
    speed: 'super_fast',
    badge: 'popular',
    descriptionAr: 'متابعون نشطون يفتحون لك ميزة البث المباشر (TikTok Live) وتفعيل متجر التيك توك.',
    descriptionEn: 'Active followers to help unlock TikTok Live stream access and TikTok Shop features.'
  },
  {
    id: 'tk-202',
    platform: 'tiktok',
    categoryAr: 'مشاهدات تيك توك - TikTok Views',
    categoryEn: 'TikTok Views',
    nameAr: 'مشاهدات تيك توك خوارزمية For You [بدء فوري - تعزز الانتشار الفيروسي]',
    nameEn: 'TikTok FYP Algorithmic Views [Instant - Boosts Viral Reach]',
    ratePer1000: 0.08,
    min: 500,
    max: 10000000,
    avgTimeAr: 'فوري في ثوانٍ',
    avgTimeEn: 'Instant in seconds',
    refillDays: 0,
    speed: 'instant',
    badge: 'trending',
    descriptionAr: 'مشاهدات تساعد خوارزميات التيك توك على وضع الفيديو في صفحة For You وزيادة التفاعل.',
    descriptionEn: 'High-speed views tailored to trigger the algorithm and push videos to the For You page.'
  },
  {
    id: 'tk-203',
    platform: 'tiktok',
    categoryAr: 'إعجابات تيك توك - TikTok Likes',
    categoryEn: 'TikTok Likes',
    nameAr: 'لايكات تيك توك حقيقية وسريعة [بدون نزول - جودة عالية]',
    nameEn: 'TikTok Genuine Likes [Non-Drop - High Quality Speed]',
    ratePer1000: 1.10,
    min: 50,
    max: 50000,
    avgTimeAr: '5 دقائق',
    avgTimeEn: '5 mins',
    refillDays: 30,
    speed: 'super_fast',
    descriptionAr: 'إعجابات آمنة تماماً على الحسابات الشخصية وحسابات الأعمال.',
    descriptionEn: '100% safe likes for personal creator accounts and brand business profiles.'
  },

  // YouTube Services
  {
    id: 'yt-301',
    platform: 'youtube',
    categoryAr: 'مشتركين يوتيوب - YouTube Subscribers',
    categoryEn: 'YouTube Subscribers',
    nameAr: 'مشتركين يوتيوب معتمدين لتحقيق شروط الدخل [ثابتين 100% - ضمان مدى الحياة]',
    nameEn: 'YouTube Monetization Eligible Subs [100% Non-Drop - Lifetime Refill]',
    ratePer1000: 14.50,
    min: 50,
    max: 20000,
    avgTimeAr: 'ساعة للبدء',
    avgTimeEn: '1 hour start',
    refillDays: 999,
    speed: 'safe',
    badge: 'popular',
    descriptionAr: 'مشتركون متوافقون تماماً مع متطلبات برنامج شركاء يوتيوب (YPP) لتحقيق الدخل دون مخاطر.',
    descriptionEn: 'Compliant with YouTube Partner Program criteria for channel monetization.'
  },
  {
    id: 'yt-302',
    platform: 'youtube',
    categoryAr: 'ساعات مشاهدة يوتيوب - Watch Time',
    categoryEn: 'YouTube Watch Hours',
    nameAr: 'ساعات مشاهدة يوتيوب 4000 ساعة [لتحقيق الدخل الرسمي - ثبات كامل]',
    nameEn: 'YouTube 4000 Watch Hours [Monetization Ready - High Retention]',
    ratePer1000: 18.00,
    min: 500,
    max: 4000,
    avgTimeAr: '3 ساعات',
    avgTimeEn: '3 hours',
    refillDays: 60,
    speed: 'safe',
    descriptionAr: 'فيديوهات مدتها 15 دقيقة أو أكثر. مدة احتفاظ عالية تحسب في لوحة استوديو يوتيوب.',
    descriptionEn: 'High retention watch hours registered directly in YouTube Studio Analytics.'
  },
  {
    id: 'yt-303',
    platform: 'youtube',
    categoryAr: 'مشاهدات يوتيوب - YouTube Views',
    categoryEn: 'YouTube Views',
    nameAr: 'مشاهدات يوتيوب عالية الاحتفاظ [ظهور بالنتائج الأولى والبحث]',
    nameEn: 'YouTube High-Retention Views [Search & Suggested Ranking]',
    ratePer1000: 1.85,
    min: 1000,
    max: 1000000,
    avgTimeAr: '30 دقيقة',
    avgTimeEn: '30 mins',
    refillDays: 30,
    speed: 'gradual',
    badge: 'best_value',
    descriptionAr: 'مشاهدات حقيقية من إعلانات موجهة تزيد من رانك الفيديو وتوصيات خوارزمية يوتيوب.',
    descriptionEn: 'Targeted views helping your video climb search ranking and suggested video spots.'
  },

  // Twitter / X Services
  {
    id: 'x-401',
    platform: 'twitter',
    categoryAr: 'متابعين تويتر / X - Followers',
    categoryEn: 'X / Twitter Followers',
    nameAr: 'متابعين تويتر X حسابات موثقة وعالية الجودة [عرب وأجانب - ضمان 60 يوم]',
    nameEn: 'X / Twitter HQ Followers [With Avatar & Bio - 60D Refill]',
    ratePer1000: 5.50,
    min: 50,
    max: 50000,
    avgTimeAr: '15 دقيقة',
    avgTimeEn: '15 mins',
    refillDays: 60,
    speed: 'super_fast',
    badge: 'popular',
    descriptionAr: 'حسابات حقيقية مع نبذة وصور وتغريدات تمنح حسابك مظهراً رسمياً وموثوقاً.',
    descriptionEn: 'Genuine looking profiles with bio, avatar and posts for maximum profile credibility.'
  },
  {
    id: 'x-402',
    platform: 'twitter',
    categoryAr: 'إعادة تغريد وتفضيل - Retweets & Likes',
    categoryEn: 'X Retweets & Likes',
    nameAr: 'إعادة تغريد ريتويت + لايكات X ميكس [زيادة التريند العربي]',
    nameEn: 'X Retweets + Likes Combo [Arab Trending Booster]',
    ratePer1000: 2.90,
    min: 50,
    max: 20000,
    avgTimeAr: 'فوري 5 دقائق',
    avgTimeEn: 'Instant 5 mins',
    refillDays: 30,
    speed: 'instant',
    descriptionAr: 'توزيع فوري للإعجابات والريتويت يرفع التغريدة للمقدمة في تريند تويتر.',
    descriptionEn: 'Rapid delivery of retweets and likes pushing your post to trending timelines.'
  },

  // Telegram Services
  {
    id: 'tg-501',
    platform: 'telegram',
    categoryAr: 'أعضاء قنوات تيليجرام - Telegram Members',
    categoryEn: 'Telegram Members',
    nameAr: 'أعضاء قنوات ومجموعات تيليجرام [بدون نزول - ثبات دائم - سرعة فائقة]',
    nameEn: 'Telegram Channel & Group Members [Zero Drop - Ultra Fast]',
    ratePer1000: 1.20,
    min: 50,
    max: 100000,
    avgTimeAr: 'فوري 2 دقيقة',
    avgTimeEn: 'Instant 2 mins',
    refillDays: 30,
    speed: 'instant',
    badge: 'popular',
    descriptionAr: 'أعضاء للقنوات العامة والخاصة، سرعة إرسال تصل إلى 50,000 عضو خلال ساعات قليلة.',
    descriptionEn: 'Members for public and private channels with speeds up to 50K per day.'
  },
  {
    id: 'tg-502',
    platform: 'telegram',
    categoryAr: 'مشاهدات وتفاعلات تيليجرام - Views & Reactions',
    categoryEn: 'Telegram Post Views & Reactions',
    nameAr: 'مشاهدات تيليجرام لآخر 10 منشورات + تفاعلات إيموجي مجانية',
    nameEn: 'Telegram Last 10 Posts Views + Free Emoji Reactions',
    ratePer1000: 0.25,
    min: 100,
    max: 200000,
    avgTimeAr: 'فوري',
    avgTimeEn: 'Instant',
    refillDays: 0,
    speed: 'instant',
    badge: 'best_value',
    descriptionAr: 'توزيع متوازن للمشاهدات على آخر منشورات قناتك لتبدو نشطة ومتفاعلة للغاية.',
    descriptionEn: 'Evenly distributes post views across your newest messages with realistic reactions.'
  },

  // Facebook Services
  {
    id: 'fb-601',
    platform: 'facebook',
    categoryAr: 'متابعين صفحات فيسبوك - Facebook Page Followers',
    categoryEn: 'Facebook Page Likes & Followers',
    nameAr: 'متابعين وإعجابات صفحات فيسبوك [حسابات حقيقية - ضمان 90 يوم]',
    nameEn: 'Facebook Page Likes & Followers [Active Profiles - 90D Refill]',
    ratePer1000: 4.80,
    min: 100,
    max: 50000,
    avgTimeAr: '30 دقيقة',
    avgTimeEn: '30 mins',
    refillDays: 90,
    speed: 'safe',
    badge: 'popular',
    descriptionAr: 'تساعد صفحتك التجارية على كسب ثقة الزوار وتفعيل ميزات الأعمال والتحقق.',
    descriptionEn: 'Helps business pages build social proof and unlock verification milestones.'
  },

  // LinkedIn Services
  {
    id: 'li-701',
    platform: 'linkedin',
    categoryAr: 'متابعين وتفاعل لينكد إن - LinkedIn',
    categoryEn: 'LinkedIn Followers & Connections',
    nameAr: 'متابعين صفحات وحسابات شخصية لينكد إن [بروفايلات احترافية]',
    nameEn: 'LinkedIn Company & Personal Followers [Professional Profiles]',
    ratePer1000: 12.00,
    min: 50,
    max: 10000,
    avgTimeAr: 'ساعتان',
    avgTimeEn: '2 hours',
    refillDays: 60,
    speed: 'safe',
    descriptionAr: 'حسابات موثقة بملفات احترافية لتعزيز ظهور علامتك التجارية أو ملفك الشخصي.',
    descriptionEn: 'Professional profiles to boost corporate authority and personal branding reach.'
  },

  // Spotify Services
  {
    id: 'sp-801',
    platform: 'spotify',
    categoryAr: 'مستمعين سبوتيفاي - Spotify Streams',
    categoryEn: 'Spotify Streams & Monthly Listeners',
    nameAr: 'استماعات سبوتيفاي مدفوعة للموسيقيين [مؤهلة لأرباح الملكية Royalties]',
    nameEn: 'Spotify Royalty Eligible Streams [Premium Algorithmic Plays]',
    ratePer1000: 1.95,
    min: 1000,
    max: 500000,
    avgTimeAr: '4 ساعات',
    avgTimeEn: '4 hours',
    refillDays: 30,
    speed: 'safe',
    descriptionAr: 'استماعات ممتازة تحسب في لوحة Spotify for Artists وتساعد على دخول قوائم Discover Weekly.',
    descriptionEn: 'High-quality streams showing in Spotify for Artists, triggering playlist algorithms.'
  }
];

export const INITIAL_ORDERS: OrderItem[] = [];

export const INITIAL_REVIEWS: CustomerReview[] = [];

export const PAYMENT_METHODS = [
  {
    id: 'card',
    nameAr: 'بطاقات بنكية (Visa / MasterCard / Mada)',
    nameEn: 'Credit / Debit Card (Visa / MC / Mada)',
    icon: 'CreditCard',
    fee: '0%',
    badgeAr: 'فوري وآمن 100%',
    badgeEn: 'Instant & 100% Secure',
    min: 5,
    max: 2000
  },
  {
    id: 'apple_pay',
    nameAr: 'Apple Pay / Google Pay',
    nameEn: 'Apple Pay / Google Pay',
    icon: 'Smartphone',
    fee: '0%',
    badgeAr: 'بنقرة واحدة',
    badgeEn: 'One-Tap Checkout',
    min: 5,
    max: 3000
  },
  {
    id: 'crypto',
    nameAr: 'العملات الرقمية (USDT TRC20 / Binance Pay)',
    nameEn: 'Crypto (USDT TRC20 / Binance Pay)',
    icon: 'Coins',
    fee: '0%',
    badgeAr: '+5% بونص رصيد إضافي',
    badgeEn: '+5% Extra Deposit Bonus',
    min: 10,
    max: 10000
  },
  {
    id: 'paypal',
    nameAr: 'باي بال - PayPal',
    nameEn: 'PayPal Gateway',
    icon: 'ShieldCheck',
    fee: '2%',
    badgeAr: 'حماية المشتري',
    badgeEn: 'Buyer Protection',
    min: 10,
    max: 1500
  },
  {
    id: 'wallets',
    nameAr: 'محافظ إلكترونية (فودافون كاش / أورنج كاش / إتصالات كاش)',
    nameEn: 'E-Wallets (Vodafone Cash / Orange / Etisalat)',
    icon: 'Wallet',
    fee: '0%',
    badgeAr: 'كاش محلي فوري',
    badgeEn: 'Instant Local Cash',
    min: 5,
    max: 1000
  }
];

export const INITIAL_PLATFORM_USERS = [
  {
    id: 'USR-ADMIN',
    name: 'عبدالرحمن سيد',
    email: 'abdosayed0120@gmail.com',
    phone: '+20 102 345 6789',
    country: 'مصر 🇪🇬',
    balance: 0.00,
    totalSpent: 0.00,
    totalOrders: 0,
    status: 'active' as const,
    role: 'admin' as const,
    registeredAt: '2026-01-01',
    lastLogin: 'الآن',
    lastIp: '127.0.0.1'
  }
];

export const INITIAL_DEPOSIT_REQUESTS: any[] = [];

export const INITIAL_ACTIVITY_LOGS: any[] = [];

export const INITIAL_PLATFORM_SETTINGS = {
  maintenanceMode: false,
  allowRegistrations: true,
  autoRefillSystem: true,
  requireReviewApproval: false,
  eWalletsEnabled: true,
  cryptoEnabled: true,
  egpExchangeRate: 50.0,
  vodafoneCashNumber: '01012345678',
  orangeCashNumber: '01212345678',
  etisalatCashNumber: '01112345678',
  instaPayUsername: 'smmrapid@instapay',
  usdtTrc20Address: 'TQ8z7b9h4xLkm93kdP92zQw81mskd02jdx',
  broadcastAnnouncementAr: '🎉 أهلاً بكم في SMM Rapid: منصتكم الموثوقة لخدمات السوشيال ميديا والتسليم الفوري!',
  broadcastAnnouncementEn: '🎉 Welcome to SMM Rapid: Your trusted social media growth platform!',
  broadcastAnnouncementActive: true,
  // Sha7nawy Gate
  sha7nawyEnabled: true,
  sha7nawyBaseUrl: 'https://api.sha7nawy.com',
  sha7nawyPublicKey: '',
  sha7nawySecretKey: '',
  sha7nawyWebhookUrl: '',
  // Heleket Crypto Gateway
  heleketEnabled: true,
  heleketBaseUrl: 'https://api.heleket.com',
  heleketMerchantId: '',
  heleketApiKey: '',
  heleketSecretKey: '',
  heleketWebhookUrl: '',
  heleketSupportedCurrencies: 'USDT-TRC20,USDT-BEP20',
  autoVerifyPayments: true
};

export const INITIAL_USER_PROFILE: UserProfile = {
  name: 'عبدالرحمن سيد',
  email: 'abdosayed0120@gmail.com',
  phone: '+20 102 345 6789',
  country: 'مصر 🇪🇬',
  bio: 'مسوّق رقمي ومدير حملات سوشيال ميديا محترف',
  avatarConfig: {
    presetId: 'tech_ninja',
    backgroundColor: 'from-cyan-500 via-blue-600 to-indigo-700',
    accessory: 'verified',
    accentColor: '#38bdf8'
  },
  joinedDate: '2026'
};

export const INITIAL_SECURITY_SETTINGS: SecuritySettings = {
  twoFactorAuth: false,
  twoFactorSecret: '',
  loginAlertsEmail: true,
  requirePinForOrders: false,
  pinCode: '',
  apiKey: 'smm_live_89f02c4a91bde457e9124a',
  allowApiOrders: true,
  whitelistedIps: '',
  sessionTimeout: 60,
  notificationPrefs: {
    orderCompleted: true,
    orderIssues: true,
    promotionalOffers: true,
    balanceAlerts: true,
    newsletter: false
  }
};

export const INITIAL_ACTIVE_SESSIONS: ActiveSession[] = [
  {
    id: 'SES-01',
    device: typeof window !== 'undefined' && /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'الهاتف المحمول' : 'جهاز الحاسوب الشخصي',
    browser: typeof window !== 'undefined' ? (navigator.userAgent.includes('Chrome') ? 'Google Chrome' : navigator.userAgent.includes('Safari') ? 'Safari' : 'المتصفح الحالي') : 'المتصفح الحالي',
    ip: '127.0.0.1 (جلسة آمنة وموثقة)',
    location: 'جمهورية مصر العربية',
    lastActive: 'الآن (الجلسة الحالية النشطة)',
    isCurrent: true
  }
];

export const FAQS = [
  {
    qAr: 'هل أحتاج لإعطاء كلمة مرور حسابي عند الطلب؟',
    qEn: 'Do you require my account password to fulfill orders?',
    aAr: 'على الإطلاق! نحن لا نطلب أي كلمات مرور أبداً. كل ما نحتاجه هو رابط حسابك العام أو رابط المنشور المراد تزويده فقط. حسابك في أمان تام 100%.',
    aEn: 'Never! We never ask for your account password. All we need is your public profile link or post URL. Your account remains 100% safe.'
  },
  {
    qAr: 'ما هي سرعة بدء تنفيذ الطلبات في SMM Rapid؟',
    qEn: 'How fast does order execution start on SMM Rapid?',
    aAr: 'أغلب الخدمات تبدأ بشكل آلي وفوري خلال 30 ثانية إلى 5 دقائق بفضل نظامنا المرتبط بسيرفرات فائقة السرعة، ويمكنك متابعة تقدم طلبك مباشرة في لوحة التحكم.',
    aEn: 'Most services start automatically within 30 seconds to 5 minutes thanks to our high-speed automated nodes. You can track live progress in your dashboard.'
  },
  {
    qAr: 'ماذا يعني خيار إعادة التعبئة (Refill Guarantee)؟',
    qEn: 'What does the Refill Guarantee mean?',
    aAr: 'في حال حدث أي نزول طبيعي للأعداد خلال فترة الضمان المحددة للخدمة (مثل 30 أو 60 أو 365 يوماً)، يمكنك الضغط على زر "إعادة التعبئة" بضغطة زر مجاناً لتعويض النقص آلياً.',
    aEn: 'If any natural drop occurs during the service warranty period (e.g., 30, 60, or 365 days), you can click "Refill" for free automatic replenishment.'
  },
  {
    qAr: 'ما هو نظام التنقيط (Drip-Feed)؟',
    qEn: 'What is the Drip-Feed feature?',
    aAr: 'ميزة التنقيط تتيح لك تجزئة طلبك الكبير إلى دفعات صغيرة على فترات زمنية محددة تلقائياً (مثلاً 500 متابع كل ساعتين)، مما يمنح حسابك نمواً يبدو طبيعياً تماماً لخوارزميات المنصة.',
    aEn: 'Drip-feed allows you to break large orders into smaller batches delivered at chosen intervals (e.g., 500 followers every 2 hours), giving natural organic growth.'
  }
];
