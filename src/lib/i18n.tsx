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
  'common.name': { en: 'Name', ar: 'الاسم' },
  'common.namePlaceholder': { en: 'Enter your name', ar: 'أدخل اسمك' },
  'common.nameRequired': { en: 'Name is required', ar: 'الاسم مطلوب' },
  'common.saving': { en: 'Saving...', ar: 'جاري الحفظ...' },
  'common.saved': { en: 'Saved', ar: 'تم الحفظ' },
  'common.saveFailed': { en: 'Failed to save', ar: 'فشل الحفظ' },
  'common.currency': { en: 'USD', ar: 'دولار' },

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
  'landing.security2Title': { en: 'Electronic wallet payments', ar: 'الدفع عبر المحفظة الإلكترونية' },
  'landing.security2Body': { en: 'Electronic wallet payments are verified by the payment gateway — we never ask for your wallet PIN.', ar: 'مدفوعات المحافظ الإلكترونية يتم التحقق منها عبر بوابة الدفع — ولا نطلب الرقم السري للمحفظة أبداً.' },
  'landing.security3Title': { en: 'Firebase authentication', ar: 'تسجيل دخول عبر Firebase' },
  'landing.security3Body': { en: 'Sign in with Google or a password, backed by the same auth infrastructure used across millions of apps.', ar: 'سجل الدخول بجوجل أو كلمة مرور، بنفس بنية التوثيق المستخدمة في ملايين التطبيقات.' },
  'landing.faqTitle': { en: 'Questions people ask before signing up', ar: 'أسئلة يسألها الناس قبل التسجيل' },
  'landing.faq1Q': { en: 'What can I actually order here?', ar: 'إيه اللي أقدر أطلبه هنا فعلاً؟' },
  'landing.faq1A': { en: "Followers, likes, views, comments and more across Instagram, TikTok, YouTube, Facebook, Telegram, Spotify, X and Threads. The exact list depends on what's active in your dashboard — sign in to see live pricing and minimum/maximum quantities for every service.", ar: 'متابعين، لايكات، مشاهدات، تعليقات وأكتر على إنستجرام وتيك توك ويوتيوب وفيسبوك وتيليجرام وسبوتيفاي وإكس و Threads. القائمة الدقيقة تعتمد على المتاح في لوحة التحكم — سجل الدخول لمشاهدة الأسعار الحية والحد الأدنى/الأقصى لكل خدمة.' },
  'landing.faq2Q': { en: 'How fast is delivery?', ar: 'التنفيذ بياخد وقت قد إيه؟' },
  'landing.faq2A': { en: 'Most orders start within minutes of payment clearing — dispatch to the provider network is automatic, not manually queued. Larger orders run gradually and you can watch the remaining count drop from your dashboard.', ar: 'معظم الطلبات تبدأ خلال دقائق من تأكيد الدفع — الإرسال لشبكة المزودين تلقائي مش طابور يدوي. الطلبات الكبيرة تتنفذ تدريجياً وتقدر تتابع العدد المتبقي من لوحة التحكم.' },
  'landing.faq3Q': { en: 'What payment methods do you support?', ar: 'إيه وسائل الدفع المتاحة؟' },
  'landing.faq3A': { en: 'Electronic wallets (Vodafone Cash, Orange Cash and Etisalat Cash), and crypto. Balances update automatically once a payment is confirmed — no manual top-up requests.', ar: 'المحافظ الإلكترونية (فودافون كاش وأورنج كاش وإي آند كاش)، والعملات الرقمية. الرصيد يتحدث تلقائياً بعد تأكيد الدفع — بدون طلبات شحن يدوية.' },
  'landing.faq4Q': { en: 'Can I automate orders instead of using the dashboard?', ar: 'أقدر أؤتمت الطلبات بدل استخدام لوحة التحكم؟' },
  'landing.faq4A': { en: "Yes — every account gets an API key. You can place orders, check status, and check your balance programmatically, which is useful if you're reselling or running your own tools on top.", ar: 'أيوه — كل حساب بياخد مفتاح API. تقدر تطلب وتتابع الحالة وتشوف رصيدك برمجياً، وده مفيد لو بتعمل إعادة بيع أو بتشغل أدواتك الخاصة.' },
  'landing.faq5Q': { en: 'Is my payment and account data safe?', ar: 'بياناتي وحسابي آمنين؟' },
  'landing.faq5A': { en: 'Electronic-wallet payments are verified by the gateway, not stored as wallet credentials on our servers. Your dashboard is protected by Firebase authentication, and every wallet transaction is written to an append-only ledger so your balance history can always be reconciled.', ar: 'مدفوعات المحافظ الإلكترونية يتم التحقق منها عبر بوابة الدفع ولا يتم تخزين الرقم السري للمحفظة. لوحة التحكم محمية بتوثيق Firebase، وكل معاملة في محفظتك تُسجل في سجل دائم قابل للمراجعة.' },
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
  'newOrder.subtitle': { en: 'Choose a category first, then select a service to see all details.', ar: 'اختر القسم أولاً، ثم اختر الخدمة لمشاهدة كل التفاصيل.' },
  'newOrder.step1Category': { en: '1. Category', ar: '١. القسم' },
  'newOrder.step2Service': { en: '2. Service', ar: '٢. الخدمة' },
  'newOrder.chooseCategory': { en: 'Choose a category', ar: 'اختر القسم' },
  'newOrder.searchInCategory': { en: 'Search services in this category...', ar: 'ابحث عن خدمة في هذا القسم...' },
  'newOrder.noServicesInCategory': { en: 'No active services found in this category.', ar: 'لا توجد خدمات نشطة في هذا القسم.' },
  'newOrder.recent': { en: 'Recent:', ar: 'حديثاً:' },
  'newOrder.selectPrompt': { en: 'Select a service to view its full details.', ar: 'اختر خدمة لمشاهدة كل تفاصيلها.' },
  'newOrder.selectedService': { en: 'Selected service', ar: 'الخدمة المختارة' },
  'newOrder.rate1k': { en: 'Rate / 1K', ar: 'السعر / 1000' },
  'newOrder.minimum': { en: 'Minimum', ar: 'الأقل' },
  'newOrder.maximum': { en: 'Maximum', ar: 'الأعلى' },
  'newOrder.cashback': { en: 'Cashback', ar: 'استرداد نقدي' },
  'newOrder.serviceDetails': { en: 'Service details', ar: 'تفاصيل الخدمة' },
  'newOrder.copyServiceId': { en: 'Copy Service ID', ar: 'نسخ معرّف الخدمة' },
  'newOrder.targetLink': { en: 'Target Link', ar: 'الرابط المستهدف' },
  'newOrder.estimatedCharge': { en: 'Estimated charge', ar: 'التكلفة التقديرية' },
  'newOrder.quantityValid': { en: 'Quantity valid', ar: 'الكمية صحيحة' },
  'newOrder.enterValidQuantity': { en: 'Enter a valid quantity', ar: 'أدخل كمية صحيحة' },
  'newOrder.quantityRange': { en: 'Quantity must be between {min} and {max}', ar: 'يجب أن تكون الكمية بين {min} و {max}' },
  'newOrder.copied': { en: 'Copied', ar: 'تم النسخ' },

  'affiliates.commissionHistory': { en: 'Commission History', ar: 'سجل العمولات' },
  'affiliates.title': { en: 'Affiliate Center', ar: 'مركز الإحالة' },
  'affiliates.referralLink': { en: 'Referral Link', ar: 'رابط الإحالة' },
  'affiliates.referredUsers': { en: 'Referred Users', ar: 'المستخدمون المُحالون' },

  // Mass Order
  'massOrder.title': { en: 'Mass Order', ar: 'طلبات جماعية' },
  'massOrder.ordersLabel': { en: 'Orders', ar: 'الطلبات' },
  'massOrder.format': { en: 'Format: service_id | link | quantity', ar: 'الصيغة: معرّف_الخدمة | الرابط | الكمية' },
  'massOrder.submit': { en: 'Submit Orders', ar: 'إرسال الطلبات' },
  'massOrder.pleaseEnter': { en: 'Please enter orders', ar: 'من فضلك أدخل الطلبات' },

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
  'profile.subtitle': { en: 'Manage your account details and security.', ar: 'إدارة بيانات حسابك والأمان.' },
  'profile.email': { en: 'Email', ar: 'البريد الإلكتروني' },
  'profile.name': { en: 'Name', ar: 'الاسم' },
  'profile.accountId': { en: 'Account ID', ar: 'معرّف الحساب' },
  'profile.memberSince': { en: 'Member since', ar: 'عضو منذ' },
  'profile.apiKey': { en: 'API Key', ar: 'مفتاح API' },
  'profile.regenerateApiKey': { en: 'Regenerate API Key', ar: 'تجديد مفتاح API' },
  'profile.save': { en: 'Save Changes', ar: 'حفظ التغييرات' },
  'profile.saved': { en: 'Profile updated', ar: 'تم تحديث الملف الشخصي' },
  'profile.saveFailed': { en: 'Failed to save profile', ar: 'فشل تحديث الملف الشخصي' },
  'profile.confirmRegenerate': { en: 'Regenerating will invalidate your current API key immediately. Continue?', ar: 'تجديد المفتاح سيلغي مفتاحك الحالي فوراً. هل تريد المتابعة؟' },
  'profile.currentName': { en: 'Current name: {name}', ar: 'الاسم الحالي: {name}' },

  // Transactions
  'transactions.subtitle': { en: 'A full history of wallet credits and debits.', ar: 'سجل كامل لكل عمليات الإضافة والخصم من محفظتك.' },
  'transactions.date': { en: 'Date', ar: 'التاريخ' },
  'transactions.type': { en: 'Type', ar: 'النوع' },
  'transactions.amount': { en: 'Amount', ar: 'المبلغ' },
  'transactions.balanceAfter': { en: 'Balance After', ar: 'الرصيد بعدها' },
  'transactions.description': { en: 'Description', ar: 'الوصف' },
  'transactions.none': { en: 'No transactions yet.', ar: 'لا توجد معاملات حتى الآن.' },

  // Dashboard
  'dashboard.welcome': { en: 'Welcome back, {name}!', ar: 'أهلاً بعودتك، {name}!' },
  'dashboard.overview': { en: 'Here is an overview of your account activity.', ar: 'نظرة عامة على نشاط حسابك.' },
  'dashboard.loading': { en: 'Loading dashboard...', ar: 'جاري تحميل لوحة التحكم...' },
  'dashboard.error': { en: 'Error loading dashboard.', ar: 'حدث خطأ أثناء تحميل لوحة التحكم.' },
  'dashboard.subtitle': { en: "Here's a quick look at your account.", ar: 'نظرة سريعة على حسابك.' },
  'dashboard.balance': { en: 'Wallet Balance', ar: 'رصيد المحفظة' },
  'dashboard.totalOrders': { en: 'Total Orders', ar: 'إجمالي الطلبات' },
  'dashboard.completedOrders': { en: 'Completed Orders', ar: 'الطلبات المكتملة' },
  'dashboard.totalSpent': { en: 'Total Spent', ar: 'إجمالي الإنفاق' },
  'dashboard.quickActions': { en: 'Quick Actions', ar: 'إجراءات سريعة' },
  'dashboard.newOrder': { en: 'Place New Order', ar: 'إرسال طلب جديد' },
  'dashboard.addFunds': { en: 'Add Funds', ar: 'إضافة رصيد' },
  'dashboard.recentOrders': { en: 'Recent Orders', ar: 'أحدث الطلبات' },
  'dashboard.viewAllOrders': { en: 'View all orders', ar: 'عرض كل الطلبات' },
  'dashboard.noOrders': { en: "You haven't placed any orders yet.", ar: 'لم تقم بأي طلب بعد.' },

  // Mystery Boxes
  'mysteryBoxes.title': { en: 'Mystery Boxes', ar: 'الصناديق الغامضة' },
  'mysteryBoxes.subtitle': { en: 'Use your keys to open mystery boxes and win random balance rewards! You currently have {keys} keys.', ar: 'استخدم مفاتيحك لفتح الصناديق الغامضة واربح مكافآت رصيد عشوائية! لديك حالياً {keys} مفتاح.' },
  'mysteryBoxes.opening': { en: 'Opening...', ar: 'جاري الفتح...' },
  'mysteryBoxes.openBox': { en: 'Open Box (1 Key)', ar: 'افتح الصندوق (مفتاح واحد)' },
  'mysteryBoxes.needKey': { en: 'You need at least 1 key to open a box. Buy orders to earn keys!', ar: 'تحتاج مفتاح واحد على الأقل لفتح صندوق. اطلب خدمات لتربح مفاتيح!' },
  'mysteryBoxes.wonReward': { en: 'You won ${amount} from a {tier} box!', ar: 'ربحت ${amount} من صندوق {tier}!' },

  // Shortlinks / Earn
  'shortlinks.title': { en: 'Earn via Shortlinks', ar: 'اربح عبر الروابط المختصرة' },
  'shortlinks.reward': { en: 'Reward: ${amount}', ar: 'المكافأة: ${amount}' },
  'shortlinks.claimed': { en: 'Claimed', ar: 'تم الاستلام' },
  'shortlinks.visit': { en: 'Visit', ar: 'زيارة' },
  'shortlinks.claim': { en: 'Claim', ar: 'استلام' },
  'shortlinks.noneAvailable': { en: 'No active shortlinks currently available.', ar: 'لا توجد روابط مختصرة نشطة متاحة حالياً.' },
  'shortlinks.rewardClaimed': { en: 'Reward claimed successfully!', ar: 'تم استلام المكافأة بنجاح!' },

  // Ticket view
  'ticketView.title': { en: 'Ticket', ar: 'التذكرة' },
  'ticketView.back': { en: 'Back to tickets', ar: 'العودة للتذاكر' },
  'ticketView.reply': { en: 'Reply', ar: 'الرد' },
  'ticketView.sendReply': { en: 'Send Reply', ar: 'إرسال الرد' },
  'ticketView.status': { en: 'Status', ar: 'الحالة' },
  'ticketView.closeTicket': { en: 'Close Ticket', ar: 'إغلاق التذكرة' },
  'ticketView.writeReply': { en: 'Write your reply...', ar: 'اكتب ردك...' },
  'ticketView.notFound': { en: 'Ticket not found', ar: 'التذكرة غير موجودة' },
  'ticketView.noMessages': { en: 'No messages yet. Send one below.', ar: 'لا توجد رسائل بعد. أرسل واحدة بالأسفل.' },
  'ticketView.typeReply': { en: 'Type your reply...', ar: 'اكتب ردك...' },

  // Tickets list
  'tickets.title': { en: 'Support Tickets', ar: 'تذاكر الدعم' },
  'tickets.subtitle': { en: 'Get help from our support team.', ar: 'احصل على مساعدة من فريق الدعم.' },
  'tickets.newTicket': { en: 'New Ticket', ar: 'تذكرة جديدة' },
  'tickets.subject': { en: 'Subject', ar: 'الموضوع' },
  'tickets.category': { en: 'Category', ar: 'التصنيف' },
  'tickets.priority': { en: 'Priority', ar: 'الأولوية' },
  'tickets.message': { en: 'Message', ar: 'الرسالة' },
  'tickets.submit': { en: 'Submit Ticket', ar: 'إرسال التذكرة' },
  'tickets.noTickets': { en: "You haven't opened any tickets yet.", ar: 'لم تفتح أي تذاكر حتى الآن.' },
  'tickets.createNew': { en: 'Create New Ticket', ar: 'إنشاء تذكرة جديدة' },
  'tickets.none': { en: 'No support tickets found.', ar: 'لا توجد تذاكر دعم.' },
  'tickets.created': { en: 'Ticket created successfully', ar: 'تم إنشاء التذكرة بنجاح' },

  // API page
  'api.title': { en: 'API Documentation', ar: 'توثيق واجهة API' },
  'api.subtitle': { en: 'Automate orders, status checks and balance lookups.', ar: 'أتمتة الطلبات ومتابعة الحالة والرصيد.' },
  'api.yourKey': { en: 'Your API Key', ar: 'مفتاح API الخاص بك' },
  'api.baseUrl': { en: 'Base URL', ar: 'الرابط الأساسي' },
  'api.method': { en: 'Method', ar: 'الطريقة' },
  'api.example': { en: 'Example', ar: 'مثال' },
  'api.copyKey': { en: 'Copy Key', ar: 'نسخ المفتاح' },
  'api.keyCopied': { en: 'API key copied', ar: 'تم نسخ مفتاح API' },
  'api.generated': { en: 'API Key generated. Save it now; it will not be shown again.', ar: 'تم إنشاء مفتاح API. احفظه الآن؛ لن يظهر مرة أخرى.' },
  'api.copy': { en: 'Copy', ar: 'نسخ' },
  'api.regenerate': { en: 'Regenerate', ar: 'تجديد' },
  'api.configuredHidden': { en: 'Your API key is configured and hidden for security. Generate a new key to replace it.', ar: 'مفتاح API الخاص بك مُهيّأ ومخفي لأسباب أمنية. أنشئ مفتاحاً جديداً لاستبداله.' },
  'api.noKeyYet': { en: 'You do not have an API key yet.', ar: 'ليس لديك مفتاح API حتى الآن.' },
  'api.generateKey': { en: 'Generate API Key', ar: 'إنشاء مفتاح API' },
  'api.usage': { en: 'API Usage', ar: 'استخدام API' },
  'api.usageDesc': { en: 'Our API allows you to place orders and check status programmatically.', ar: 'تتيح لك واجهة API إرسال الطلبات ومتابعة الحالة برمجياً.' },
  'api.httpMethod': { en: 'HTTP Method', ar: 'طريقة HTTP' },
  'api.apiUrl': { en: 'API URL', ar: 'رابط API' },
  'api.placeOrderExample': { en: 'Place Order Example', ar: 'مثال على إرسال طلب' },
  'api.failedToGenerate': { en: 'Failed to generate key', ar: 'فشل إنشاء المفتاح' },

  // Game / Rewards hub
  'game.title': { en: 'Rewards Hub', ar: 'مركز المكافآت' },
  'game.subtitle': { en: 'Spin, scratch, and check your streak for daily rewards.', ar: 'أدر العجلة، اخدش، وتابع سلسلتك اليومية لتربح مكافآت.' },
  'game.dailyStreak': { en: 'Daily Streak', ar: 'السلسلة اليومية' },
  'game.claimDaily': { en: 'Claim Daily Reward', ar: 'استلم المكافأة اليومية' },
  'game.alreadyClaimed': { en: 'Already claimed today', ar: 'تم الاستلام اليوم بالفعل' },
  'game.points': { en: 'Points', ar: 'النقاط' },
  'game.keys': { en: 'Keys', ar: 'مفاتيح' },
  'game.dailyClaim': { en: 'Daily Claim', ar: 'المكافأة اليومية' },
  'game.dailyClaimDesc': { en: 'Claim free points every 24 hours. Keep your streak alive for bonus points!', ar: 'استلم نقاط مجانية كل 24 ساعة. حافظ على سلسلتك لتربح نقاط إضافية!' },
  'game.currentStreak': { en: 'Current Streak: {days} days', ar: 'السلسلة الحالية: {days} يوم' },
  'game.claiming': { en: 'Claiming...', ar: 'جاري الاستلام...' },
  'game.claimDailyPoints': { en: 'Claim Daily Points', ar: 'استلم النقاط اليومية' },
  'game.alreadyClaimedToday': { en: 'Already Claimed Today', ar: 'تم الاستلام اليوم بالفعل' },
  'game.exchangeShop': { en: 'Exchange Shop', ar: 'متجر الاستبدال' },
  'game.exchangeShopDesc': { en: 'Trade 100 points for 1 Mystery Box Key. Use keys in the Mystery Boxes page to win balance!', ar: 'استبدل 100 نقطة بمفتاح صندوق غامض واحد. استخدم المفاتيح في صفحة الصناديق الغامضة لتربح رصيداً!' },
  'game.exchangeButton': { en: 'Exchange 100 Points -> 1 Key', ar: 'استبدل 100 نقطة -> مفتاح واحد' },
  'game.claimedPoints': { en: 'Claimed {points} points!', ar: 'تم استلام {points} نقطة!' },
  'game.exchangedKey': { en: 'Exchanged 100 points for 1 Key!', ar: 'تم استبدال 100 نقطة بمفتاح واحد!' },

  // Lottery / Raffles
  'lottery.title': { en: 'Raffles & Lottery', ar: 'اليانصيب والسحوبات' },
  'lottery.subtitle': { en: 'Buy tickets for a chance to win wallet credit.', ar: 'اشترِ تذاكر لتربح رصيد محفظة.' },
  'lottery.activeDraws': { en: 'Active Draws', ar: 'السحوبات النشطة' },
  'lottery.pastDraws': { en: 'Past Draws', ar: 'السحوبات السابقة' },
  'lottery.ticketPrice': { en: 'Ticket Price', ar: 'سعر التذكرة' },
  'lottery.prizePool': { en: 'Prize Pool', ar: 'مجموع الجوائز' },
  'lottery.endsIn': { en: 'Ends in', ar: 'ينتهي خلال' },
  'lottery.buyTicket': { en: 'Buy Ticket', ar: 'شراء تذكرة' },
  'lottery.yourTickets': { en: 'Your Tickets', ar: 'تذاكرك' },
  'lottery.winner': { en: 'Winner', ar: 'الفائز' },
  'lottery.drawn': { en: 'Drawn', ar: 'تم السحب' },
  'lottery.noActiveDraws': { en: 'No active draws right now.', ar: 'لا توجد سحوبات نشطة حالياً.' },
  'lottery.loading': { en: 'Loading raffles...', ar: 'جاري تحميل السحوبات...' },
  'lottery.endedWaitingDraw': { en: 'Ended (Waiting Draw)', ar: 'انتهى (بانتظار السحب)' },
  'lottery.youHaveTickets': { en: 'You have {count} ticket(s)', ar: 'لديك {count} تذكرة' },
  'lottery.weeklyRaffle': { en: 'Weekly Raffle', ar: 'السحب الأسبوعي' },
  'lottery.perTicket': { en: 'per ticket', ar: 'لكل تذكرة' },
  'lottery.sold': { en: 'sold', ar: 'تم بيعها' },
  'lottery.maxPerUser': { en: 'Max {count} per user', ar: 'الحد الأقصى {count} لكل مستخدم' },
  'lottery.winnerAnnounced': { en: 'Winner Announced!', ar: 'تم الإعلان عن الفائز!' },
  'lottery.tix': { en: 'Tix', ar: 'تذكرة' },
  'lottery.raffleEnded': { en: 'Raffle Ended', ar: 'انتهى السحب' },
  'lottery.soldOut': { en: 'Sold Out', ar: 'نفدت الكمية' },
  'lottery.notAvailable': { en: 'Not Available', ar: 'غير متاح' },
  'lottery.purchasing': { en: 'Purchasing...', ar: 'جاري الشراء...' },
  'lottery.buyFor': { en: 'Buy (${amount})', ar: 'اشترِ (${amount})' },
  'lottery.noActiveRaffles': { en: 'No active raffles', ar: 'لا توجد سحوبات نشطة' },
  'lottery.checkBackLater': { en: 'Check back later for a chance to win!', ar: 'تحقق لاحقاً للحصول على فرصة الفوز!' },
  'lottery.ticketsPurchased': { en: 'Ticket(s) purchased successfully!', ar: 'تم شراء التذاكر بنجاح!' },

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
