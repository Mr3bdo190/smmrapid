import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Globe } from 'lucide-react';

export type Lang = 'en' | 'ar';

type Dict = Record<string, { en: string; ar: string }>;

// Flat key -> { en, ar } dictionary. Add new keys here as new UI text needs translation.
export const translations: Dict = {
  // Common
  'common.signIn': { en: 'Sign In', ar: 'تسجيل الدخول' },
  'common.signOut': { en: 'Sign Out', ar: 'تسجيل الخروج' },
  'common.loading': { en: 'Loading...', ar: 'جاري التحميل...' },
  'common.currentBalance': { en: 'Current Balance', ar: 'الرصيد الحالي' },
  'common.close': { en: 'Close', ar: 'إغلاق' },
  'common.email': { en: 'Email', ar: 'البريد الإلكتروني' },
  'common.password': { en: 'Password', ar: 'كلمة المرور' },
  'common.or': { en: 'OR', ar: 'أو' },
  'common.continueWithGoogle': { en: 'Continue with Google', ar: 'المتابعة باستخدام جوجل' },
  'common.welcomeBack': { en: 'Welcome back', ar: 'أهلاً بعودتك' },
  'common.createAccount': { en: 'Create your account', ar: 'إنشاء حساب' },
  'common.createAccountBtn': { en: 'Create account', ar: 'إنشاء حساب' },
  'common.registerSecurely': { en: 'Register Securely', ar: 'تسجيل آمن' },
  'common.alreadyHaveAccount': { en: 'Already have an account?', ar: 'لديك حساب بالفعل؟' },
  'common.dontHaveAccount': { en: "Don't have an account?", ar: 'ليس لديك حساب؟' },
  'common.signInLink': { en: 'Sign in', ar: 'تسجيل الدخول' },
  'common.registerNow': { en: 'Register now', ar: 'سجل الآن' },
  'common.returnHome': { en: 'Return to Home', ar: 'العودة للرئيسية' },
  'common.accessDenied': { en: 'Access Denied', ar: 'الوصول مرفوض' },
  'common.save': { en: 'Save', ar: 'حفظ' },
  'common.cancel': { en: 'Cancel', ar: 'إلغاء' },
  'common.search': { en: 'Search', ar: 'بحث' },
  'common.export': { en: 'Export CSV', ar: 'تصدير CSV' },
  'common.refresh': { en: 'Refresh', ar: 'تحديث' },
  'common.status': { en: 'Status', ar: 'الحالة' },
  'common.allStatuses': { en: 'All statuses', ar: 'كل الحالات' },
  'common.date': { en: 'Date', ar: 'التاريخ' },
  'common.amount': { en: 'Amount', ar: 'المبلغ' },
  'common.type': { en: 'Type', ar: 'النوع' },
  'common.description': { en: 'Description', ar: 'الوصف' },
  'common.noResults': { en: 'No results found.', ar: 'لا توجد نتائج.' },
  'common.copy': { en: 'Copy', ar: 'نسخ' },
  'common.copied': { en: 'Copied!', ar: 'تم النسخ!' },
  'common.send': { en: 'Send', ar: 'إرسال' },
  'common.viewAll': { en: 'View all', ar: 'عرض الكل' },
  'common.balance': { en: 'Balance', ar: 'الرصيد' },
  'common.currency': { en: 'EGP', ar: 'ج.م' },

  // Nav (also used as section headers)
  'nav.dashboard': { en: 'Dashboard', ar: 'لوحة التحكم' },
  'nav.newOrder': { en: 'New Order', ar: 'طلب جديد' },
  'nav.services': { en: 'Services', ar: 'الخدمات' },
  'nav.massOrder': { en: 'Mass Order', ar: 'طلبات جماعية' },
  'nav.earnMoney': { en: 'Earn Money', ar: 'اربح أموال' },
  'nav.orderHistory': { en: 'Order History', ar: 'سجل الطلبات' },
  'nav.addFunds': { en: 'Add Funds', ar: 'إضافة رصيد' },
  'nav.transactions': { en: 'Transactions', ar: 'المعاملات' },
  'nav.profile': { en: 'Profile', ar: 'الملف الشخصي' },
  'nav.lottery': { en: 'Raffles & Lottery', ar: 'اليانصيب والسحوبات' },
  'nav.tickets': { en: 'Support Tickets', ar: 'تذاكر الدعم' },
  'nav.api': { en: 'API', ar: 'واجهة API' },
  'nav.affiliates': { en: 'Affiliates', ar: 'برنامج الإحالة' },
  'nav.mysteryBoxes': { en: 'Mystery Boxes', ar: 'الصناديق الغامضة' },
  'nav.game': { en: 'Rewards Hub', ar: 'مركز المكافآت' },
  'nav.clientArea': { en: 'Client Area', ar: 'منطقة العميل' },
  // Admin nav
  'nav.admin.dashboard': { en: 'Dashboard', ar: 'الرئيسية' },
  'nav.admin.users': { en: 'Users', ar: 'المستخدمون' },
  'nav.admin.orders': { en: 'Orders', ar: 'الطلبات' },
  'nav.admin.payments': { en: 'Payments', ar: 'المدفوعات' },
  'nav.admin.categories': { en: 'Categories', ar: 'الأقسام' },
  'nav.admin.services': { en: 'Services', ar: 'الخدمات' },
  'nav.admin.providers': { en: 'API Providers', ar: 'مزودو الخدمة' },
  'nav.admin.shortlinks': { en: 'Shortlinks', ar: 'الروابط المختصرة' },
  'nav.admin.mysteryBoxes': { en: 'Mystery Boxes', ar: 'الصناديق الغامضة' },
  'nav.admin.raffles': { en: 'Raffles', ar: 'السحوبات' },
  'nav.admin.tickets': { en: 'Support Tickets', ar: 'تذاكر الدعم' },
  'nav.admin.contactMessages': { en: 'Contact Messages', ar: 'رسائل التواصل' },
  'nav.admin.reports': { en: 'Reports', ar: 'التقارير' },
  'nav.admin.audit': { en: 'Audit Logs', ar: 'سجل النشاطات' },
  'nav.admin.affiliates': { en: 'Affiliates', ar: 'برنامج الإحالة' },
  'nav.admin.settings': { en: 'Settings', ar: 'الإعدادات' },
  'nav.admin.panel': { en: 'Admin Panel', ar: 'لوحة الإدارة' },
  'nav.admin.title': { en: 'Admin', ar: 'الإدارة' },

  // Landing page
  'landing.defaultTagline': { en: 'Automated social media growth, dispatched instantly', ar: 'نمو تلقائي لحساباتك على السوشيال ميديا، يبدأ فوراً' },
  'landing.navFeatures': { en: 'Features', ar: 'المميزات' },
  'landing.navPricing': { en: 'Pricing', ar: 'الأسعار' },
  'landing.navFaq': { en: 'FAQ', ar: 'الأسئلة الشائعة' },
  'landing.signIn': { en: 'Sign in', ar: 'تسجيل الدخول' },
  'landing.createAccount': { en: 'Create account', ar: 'إنشاء حساب' },
  'landing.dashboard': { en: 'Dashboard', ar: 'لوحة التحكم' },
  'landing.adminPanel': { en: 'Admin Panel', ar: 'لوحة الإدارة' },
  'landing.heroTitle': { en: 'Order social growth like you order anything else online.', ar: 'اطلب نمو حساباتك على السوشيال ميديا بنفس سهولة أي طلب أونلاين.' },
  'landing.heroSubtitle': { en: 'Pick a service, paste a link, and watch it move. {site} connects you to a live provider network with automated dispatch, real-time tracking, and payment methods built for Egypt.', ar: 'اختر الخدمة، الصق الرابط، وشاهد التنفيذ يبدأ. {site} يربطك بشبكة مزودين فعلية مع تنفيذ تلقائي، متابعة لحظية، ووسائل دفع مناسبة للسوق المصري.' },
  'landing.goToDashboard': { en: 'Go to dashboard', ar: 'الذهاب للوحة التحكم' },
  'landing.createFreeAccount': { en: 'Create your free account', ar: 'أنشئ حسابك المجاني' },
  'landing.seePricing': { en: 'See live pricing', ar: 'شاهد الأسعار الحية' },
  'landing.trustNoWait': { en: 'No approval wait', ar: 'بدون انتظار موافقة' },
  'landing.trustLocalPayment': { en: 'Local payment methods', ar: 'وسائل دفع محلية' },
  'landing.trustApi': { en: 'API included', ar: 'واجهة API متضمنة' },
  'landing.liveFeedLabel': { en: 'Live tracking preview', ar: 'معاينة حية للمتابعة' },
  'landing.liveFeedSyncing': { en: 'syncing', ar: 'جاري المزامنة' },
  'landing.walletBalance': { en: 'Wallet balance', ar: 'رصيد المحفظة' },
  'landing.platformsLabel': { en: 'Supported platforms', ar: 'المنصات المدعومة' },
  'landing.featuresTitle': { en: 'Built to run without you watching it', ar: 'مبني ليعمل تلقائياً دون الحاجة لمتابعته' },
  'landing.featuresSubtitle': { en: 'Every part of the order lifecycle — dispatch, status checks, wallet updates — runs on its own. You place the order; the system does the rest.', ar: 'كل خطوة في رحلة الطلب — التنفيذ، متابعة الحالة، تحديث الرصيد — تتم تلقائياً. أنت فقط تطلب، والنظام يتكفل بالباقي.' },
  'landing.feature1Title': { en: 'Orders dispatch automatically', ar: 'الطلبات تُنفذ تلقائياً' },
  'landing.feature1Body': { en: 'Place an order and it goes straight to the provider network — no manual approval queue holding up your delivery.', ar: 'اطلب وسيتم إرسال طلبك مباشرة لشبكة المزودين — بدون طابور موافقات يدوي يؤخر التنفيذ.' },
  'landing.feature2Title': { en: 'A wallet built for Egypt', ar: 'محفظة مناسبة للسوق المصري' },
  'landing.feature2Body': { en: 'Top up with Vodafone Cash, a credit or debit card, or crypto. Your balance updates the moment a payment is confirmed.', ar: 'اشحن رصيدك بفودافون كاش، أو بطاقة ائتمان/خصم، أو عملات رقمية. رصيدك يتحدث فور تأكيد الدفع.' },
  'landing.feature3Title': { en: 'A real API for resellers', ar: 'واجهة API حقيقية للموزعين' },
  'landing.feature3Body': { en: 'Every action in the dashboard — ordering, checking status, checking your balance — is also a documented API call you can automate.', ar: 'كل إجراء في لوحة التحكم — الطلب، متابعة الحالة، معرفة الرصيد — متاح أيضاً كطلب API موثق يمكنك أتمتته.' },
  'landing.feature4Title': { en: 'Support that answers', ar: 'دعم فني يرد فعلاً' },
  'landing.feature4Body': { en: "Open a ticket from your dashboard any time. A person on our team follows up — this isn't a chatbot loop.", ar: 'افتح تذكرة دعم من لوحة التحكم في أي وقت. فرد من فريقنا هيتابع معاك — مش رد آلي.' },
  'landing.stepsTitle': { en: "Three steps, then it's automatic", ar: 'ثلاث خطوات فقط، والباقي تلقائي' },
  'landing.step1Title': { en: 'Create your account', ar: 'أنشئ حسابك' },
  'landing.step1Body': { en: 'Sign up with email or Google. No approval wait — you can add funds right away.', ar: 'سجل بالبريد الإلكتروني أو جوجل. بدون انتظار موافقة — يمكنك شحن رصيدك فوراً.' },
  'landing.step2Title': { en: 'Add funds to your wallet', ar: 'اشحن محفظتك' },
  'landing.step2Body': { en: 'Vodafone Cash, card, or crypto. Your balance reflects the payment as soon as it clears.', ar: 'فودافون كاش، بطاقة، أو عملات رقمية. رصيدك يتحدث فور تأكيد الدفع.' },
  'landing.step3Title': { en: 'Place an order and track it', ar: 'اطلب وتابع طلبك' },
  'landing.step3Body': { en: 'Pick a service, paste your link, set the quantity. Watch the status update in your dashboard.', ar: 'اختر خدمة، الصق رابطك، حدد الكمية. تابع تحديث الحالة من لوحة التحكم.' },
  'landing.pricingTitle': { en: "A sample of what's live right now", ar: 'نموذج مما هو متاح الآن' },
  'landing.pricingSubtitleWithCounts': { en: '{count} services across {cats} categories are active today.', ar: '{count} خدمة موزعة على {cats} قسم متاحة اليوم.' },
  'landing.pricingSubtitleFallback': { en: 'Live pricing, pulled straight from the dashboard.', ar: 'أسعار حية، مسحوبة مباشرة من لوحة التحكم.' },
  'landing.pricingSubtitleSuffix': { en: 'Sign in to see the full list with minimum and maximum order sizes.', ar: 'سجل الدخول لمشاهدة القائمة الكاملة مع الحد الأدنى والأقصى لكل طلب.' },
  'landing.viewFullPricing': { en: 'View the full price list', ar: 'عرض قائمة الأسعار الكاملة' },
  'landing.createToSeeFullPricing': { en: 'Create an account to see full pricing', ar: 'أنشئ حساباً لمشاهدة كل الأسعار' },
  'landing.tableService': { en: 'Service', ar: 'الخدمة' },
  'landing.tableCategory': { en: 'Category', ar: 'القسم' },
  'landing.tableRate': { en: 'Rate / 1,000', ar: 'السعر / 1000' },
  'landing.securityTitle': { en: 'Your balance is never a guess', ar: 'رصيدك دايماً واضح ومؤكد' },
  'landing.security1Title': { en: 'Ledger-backed wallet', ar: 'محفظة موثقة بسجل معاملات' },
  'landing.security1Body': { en: 'Every credit and debit is written to a transaction log, so your balance history can always be reconciled.', ar: 'كل عملية إضافة أو خصم تُسجل في سجل معاملات، فتاريخ رصيدك دايماً قابل للمراجعة.' },
  'landing.security2Title': { en: 'Payments via Kashier', ar: 'الدفع عبر Kashier' },
  'landing.security2Body': { en: 'Card payments are processed by Kashier directly — we never see or store your card details.', ar: 'مدفوعات البطاقات تتم عبر Kashier مباشرة — لا نرى أو نحتفظ ببيانات بطاقتك أبداً.' },
  'landing.security3Title': { en: 'Firebase authentication', ar: 'تسجيل دخول عبر Firebase' },
  'landing.security3Body': { en: 'Sign in with Google or a password, backed by the same auth infrastructure used across millions of apps.', ar: 'سجل الدخول بجوجل أو كلمة مرور، بنفس بنية التوثيق المستخدمة في ملايين التطبيقات.' },
  'landing.faqTitle': { en: 'Questions people ask before signing up', ar: 'أسئلة يسألها الناس قبل التسجيل' },
  'landing.faq1Q': { en: 'What can I actually order here?', ar: 'إيه اللي أقدر أطلبه هنا فعلاً؟' },
  'landing.faq1A': { en: "Followers, likes, views, comments and more across Instagram, TikTok, YouTube, Facebook, Telegram, Spotify, X and Threads. The exact list depends on what's active in your dashboard — sign in to see live pricing and minimum/maximum quantities for every service.", ar: 'متابعين، لايكات، مشاهدات، تعليقات وأكتر على إنستجرام وتيك توك ويوتيوب وفيسبوك وتيليجرام وسبوتيفاي وإكس و Threads. القائمة الدقيقة تعتمد على المتاح في لوحة التحكم — سجل الدخول لمشاهدة الأسعار الحية والحد الأدنى/الأقصى لكل خدمة.' },
  'landing.faq2Q': { en: 'How fast is delivery?', ar: 'التنفيذ بياخد وقت قد إيه؟' },
  'landing.faq2A': { en: 'Most orders start within minutes of payment clearing — dispatch to the provider network is automatic, not manually queued. Larger orders run gradually and you can watch the remaining count drop from your dashboard.', ar: 'معظم الطلبات تبدأ خلال دقائق من تأكيد الدفع — الإرسال لشبكة المزودين تلقائي مش طابور يدوي. الطلبات الكبيرة تتنفذ تدريجياً وتقدر تتابع العدد المتبقي من لوحة التحكم.' },
  'landing.faq3Q': { en: 'What payment methods do you support?', ar: 'إيه وسائل الدفع المتاحة؟' },
  'landing.faq3A': { en: 'Vodafone Cash for local transfers, credit/debit cards through Kashier, and crypto. Balances update automatically once a payment is confirmed — no manual top-up requests.', ar: 'فودافون كاش للتحويلات المحلية، بطاقات ائتمان/خصم عبر Kashier، والعملات الرقمية. الرصيد يتحدث تلقائياً بعد تأكيد الدفع — بدون طلبات شحن يدوية.' },
  'landing.faq4Q': { en: 'Can I automate orders instead of using the dashboard?', ar: 'أقدر أؤتمت الطلبات بدل استخدام لوحة التحكم؟' },
  'landing.faq4A': { en: "Yes — every account gets an API key. You can place orders, check status, and check your balance programmatically, which is useful if you're reselling or running your own tools on top.", ar: 'أيوه — كل حساب بياخد مفتاح API. تقدر تطلب وتتابع الحالة وتشوف رصيدك برمجياً، وده مفيد لو بتعمل إعادة بيع أو بتشغل أدواتك الخاصة.' },
  'landing.faq5Q': { en: 'Is my payment and account data safe?', ar: 'بياناتي وحسابي آمنين؟' },
  'landing.faq5A': { en: 'Payments are processed through Kashier, not stored on our servers. Your dashboard is protected by Firebase authentication, and every wallet transaction is written to an append-only ledger so your balance history can always be reconciled.', ar: 'المدفوعات تتم عبر Kashier ولا تُحفظ على سيرفراتنا. لوحة التحكم محمية بتوثيق Firebase، وكل معاملة في محفظتك تُسجل في سجل دائم قابل للمراجعة.' },
  'landing.ctaTitle': { en: 'Your first order can be running in the next five minutes.', ar: 'أول طلب ليك ممكن يبدأ خلال خمس دقائق بس.' },
  'landing.ctaSubtitle': { en: 'Create an account, add funds with a method that works for you, and place your first order.', ar: 'أنشئ حساباً، اشحن رصيدك بالطريقة المناسبة ليك، وابدأ أول طلب.' },
  'landing.footerSupport': { en: 'Support', ar: 'الدعم الفني' },
  'landing.authRegisterSubtitle': { en: "Free to join. Add funds when you're ready.", ar: 'التسجيل مجاني. اشحن رصيدك متى ما كنت جاهز.' },
  'landing.authLoginSubtitle': { en: 'Sign in to {site}', ar: 'سجل الدخول إلى {site}' },
  'landing.passwordMinLength': { en: 'Password must be at least 8 characters.', ar: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.' },
  'landing.invalidCredentials': { en: 'Invalid credentials.', ar: 'بيانات الدخول غير صحيحة.' },
  'landing.googleSignInFailed': { en: 'Google sign-in failed', ar: 'فشل تسجيل الدخول بجوجل' },

  // New Order
  'newOrder.title': { en: 'New Order', ar: 'طلب جديد' },
  'newOrder.service': { en: 'Service', ar: 'الخدمة' },
  'newOrder.chooseService': { en: 'Choose a Service', ar: 'اختر الخدمة' },
  'newOrder.minOrder': { en: 'Min order:', ar: 'أقل كمية:' },
  'newOrder.maxOrder': { en: 'Max order:', ar: 'أعلى كمية:' },
  'newOrder.description': { en: 'Description:', ar: 'الوصف:' },
  'newOrder.link': { en: 'Link', ar: 'الرابط' },
  'newOrder.quantity': { en: 'Quantity', ar: 'الكمية' },
  'newOrder.totalCharge': { en: 'Total Charge:', ar: 'إجمالي التكلفة:' },
  'newOrder.placeOrder': { en: 'Place Order', ar: 'إرسال الطلب' },
  'newOrder.placingOrder': { en: 'Placing Order...', ar: 'جاري إرسال الطلب...' },
  'newOrder.selectService': { en: 'Please select a service', ar: 'من فضلك اختر خدمة' },
  'newOrder.insufficientBalance': { en: 'Insufficient balance.', ar: 'الرصيد غير كافٍ.' },
  'newOrder.orderPlaced': { en: 'Order placed successfully!', ar: 'تم إرسال الطلب بنجاح!' },
  'newOrder.perThousand': { en: 'per 1000', ar: 'لكل 1000' },

  // Mass Order
  'massOrder.title': { en: 'Mass Order', ar: 'طلبات جماعية' },

  // Orders
  'orders.title': { en: 'Order History', ar: 'سجل الطلبات' },
  'orders.searchPlaceholder': { en: 'Search order, service or link', ar: 'ابحث برقم الطلب أو الخدمة أو الرابط' },
  'orders.exported': { en: 'Orders exported', ar: 'تم تصدير الطلبات' },
  'orders.id': { en: 'ID', ar: 'المعرّف' },
  'orders.service': { en: 'Service', ar: 'الخدمة' },
  'orders.link': { en: 'Link', ar: 'الرابط' },
  'orders.quantity': { en: 'Quantity', ar: 'الكمية' },
  'orders.charge': { en: 'Charge', ar: 'التكلفة' },
  'orders.created': { en: 'Created', ar: 'تاريخ الإنشاء' },
  'orders.noMatching': { en: 'No matching orders.', ar: 'لا توجد طلبات مطابقة.' },
  'orders.failedToLoad': { en: 'Failed to load orders', ar: 'فشل تحميل الطلبات' },

  // Services list
  'services.title': { en: 'Services List', ar: 'قائمة الخدمات' },
  'services.category': { en: 'Category', ar: 'القسم' },
  'services.rate': { en: 'Rate per 1k', ar: 'السعر لكل 1000' },
  'services.minMax': { en: 'Min / Max', ar: 'الأقل / الأعلى' },
  'services.allCategories': { en: 'All Categories', ar: 'كل الأقسام' },

  // Add funds
  'addFunds.title': { en: 'Add Funds', ar: 'إضافة رصيد' },

  // Transactions
  'transactions.title': { en: 'Transactions', ar: 'المعاملات' },

  // Profile
  'profile.title': { en: 'Profile', ar: 'الملف الشخصي' },

  // Tickets
  'tickets.title': { en: 'Support Tickets', ar: 'تذاكر الدعم' },

  // API
  'api.title': { en: 'API Documentation', ar: 'توثيق واجهة API' },

  // Footer/misc
  'footer.rights': { en: 'All Rights Reserved.', ar: 'جميع الحقوق محفوظة.' },

  // Public services catalog
  'publicServices.title': { en: 'Services & Pricing', ar: 'الخدمات والأسعار' },
  'publicServices.subtitle': { en: 'Everything currently available, with live pricing. Create a free account to place an order.', ar: 'كل الخدمات المتاحة حالياً بأسعارها الحية. أنشئ حساباً مجانياً لإتمام الطلب.' },
  'publicServices.searchPlaceholder': { en: 'Search services...', ar: 'ابحث عن خدمة...' },
  'publicServices.rateLabel': { en: 'per 1,000', ar: 'لكل 1000' },
  'publicServices.minMax': { en: 'Min {min} — Max {max}', ar: 'الأقل {min} — الأعلى {max}' },
  'publicServices.orderNow': { en: 'Sign in to order', ar: 'سجل الدخول للطلب' },
  'publicServices.empty': { en: 'No services match your search.', ar: 'لا توجد خدمات مطابقة لبحثك.' },

  // Contact page
  'contact.title': { en: 'Contact & Support', ar: 'تواصل معنا والدعم الفني' },
  'contact.subtitle': { en: "Have a question before you sign up, or need help with an existing order? Reach us directly — we're a real team, not a bot.", ar: 'عندك سؤال قبل التسجيل، أو محتاج مساعدة في طلب موجود؟ تواصل معنا مباشرة — إحنا فريق حقيقي مش بوت.' },
  'contact.emailLabel': { en: 'Email us directly', ar: 'راسلنا مباشرة' },
  'contact.emailNotConfigured': { en: 'Support email not yet configured — please use the form below.', ar: 'بريد الدعم لم يتم إعداده بعد — من فضلك استخدم النموذج بالأسفل.' },
  'contact.existingCustomer': { en: 'Already have an account?', ar: 'عندك حساب بالفعل؟' },
  'contact.openTicket': { en: 'Sign in and open a support ticket for the fastest response.', ar: 'سجل الدخول وافتح تذكرة دعم للحصول على أسرع رد.' },
  'contact.signInLink': { en: 'Sign in to open a ticket', ar: 'سجل الدخول لفتح تذكرة' },
  'contact.formTitle': { en: 'Send us a message', ar: 'أرسل لنا رسالة' },
  'contact.name': { en: 'Name', ar: 'الاسم' },
  'contact.subject': { en: 'Subject', ar: 'الموضوع' },
  'contact.message': { en: 'Message', ar: 'الرسالة' },
  'contact.sendMessage': { en: 'Send message', ar: 'إرسال الرسالة' },
  'contact.sending': { en: 'Sending...', ar: 'جاري الإرسال...' },
  'contact.success': { en: "Thanks — we've received your message and will reply by email soon.", ar: 'شكراً — استلمنا رسالتك وهنرد عليك بالإيميل قريباً.' },
  'contact.error': { en: 'Could not send your message. Please try again.', ar: 'تعذر إرسال رسالتك. من فضلك حاول مرة أخرى.' },

  // Legal pages
  'legal.terms': { en: 'Terms of Service', ar: 'شروط الخدمة' },
  'legal.privacy': { en: 'Privacy Policy', ar: 'سياسة الخصوصية' },
  'legal.refund': { en: 'Refund & Delivery Policy', ar: 'سياسة الاسترجاع والتنفيذ' },
  'legal.lastUpdated': { en: 'Last updated: {date}', ar: 'آخر تحديث: {date}' },
};

function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const entry = translations[key];
  let str = entry ? (entry[lang] ?? entry.en) : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) str = str.replaceAll(`{${k}}`, String(v));
  }
  return str;
}

interface LanguageContextValue {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  dir: 'ltr',
  setLang: () => {},
  toggleLang: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('lang') : null;
    if (stored === 'ar' || stored === 'en') return stored;
    // Default to Arabic for visitors whose browser is set to Arabic; English otherwise.
    if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ar')) return 'ar';
    return 'en';
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    try { window.localStorage.setItem('lang', lang); } catch { /* ignore storage errors */ }
  }, [lang]);

  const value = useMemo<LanguageContextValue>(() => ({
    lang,
    dir: lang === 'ar' ? 'rtl' : 'ltr',
    setLang: setLangState,
    toggleLang: () => setLangState(l => (l === 'ar' ? 'en' : 'ar')),
    t: (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
  }), [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useTranslation = () => useContext(LanguageContext);

// Small reusable toggle button — shows the language you'd switch TO.
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { lang, toggleLang } = useTranslation();
  return (
    <button
      onClick={toggleLang}
      title={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${className}`}
    >
      <Globe className="w-3.5 h-3.5" />
      {lang === 'ar' ? 'EN' : 'AR'}
    </button>
  );
}
