import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search,
  HelpCircle,
  BookOpen,
  Zap,
  ShieldCheck,
  CreditCard,
  Link as LinkIcon,
  AlertCircle,
  ChevronDown,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Layers,
  Clock,
  RefreshCw,
  Info,
  Check,
  X
} from 'lucide-react';

interface FAQItem {
  id: string;
  category: 'getting_started' | 'orders' | 'payments' | 'guarantee' | 'links' | 'troubleshooting';
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
  tipsAr?: string;
  tipsEn?: string;
  tagsAr: string[];
  tagsEn: string[];
}

export const HelpCenterView: React.FC = () => {
  const { language, setIsChatOpen, setActiveTab, setIsAddFundsModalOpen } = useApp();
  const isAr = language === 'ar';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({
    'faq-1': true,
    'faq-2': true
  });

  // Sample link checker state for interactive beginner tool
  const [testPlatform, setTestPlatform] = useState<'instagram' | 'tiktok' | 'youtube' | 'twitter'>('instagram');
  const [testInput, setTestInput] = useState('');

  const categories = [
    { id: 'all', labelAr: 'جميع الأسئلة', labelEn: 'All Questions', icon: HelpCircle },
    { id: 'getting_started', labelAr: 'البدء والاستخدام', labelEn: 'Getting Started', icon: BookOpen },
    { id: 'orders', labelAr: 'الطلبات وسرعة التنفيذ', labelEn: 'Orders & Speed', icon: Zap },
    { id: 'payments', labelAr: 'الرصيد وطرق الدفع', labelEn: 'Payments & Balance', icon: CreditCard },
    { id: 'guarantee', labelAr: 'الجودة وضمان التعويض', labelEn: 'Guarantee & Refill', icon: ShieldCheck },
    { id: 'links', labelAr: 'صيغ الروابط وأمان الحساب', labelEn: 'Link Formats & Safety', icon: LinkIcon },
    { id: 'troubleshooting', labelAr: 'حل المشكلات الفنية', labelEn: 'Troubleshooting', icon: AlertCircle }
  ];

  const faqs: FAQItem[] = [
    {
      id: 'faq-1',
      category: 'getting_started',
      questionAr: 'كيف أبدأ أول طلب لي على منصة SMM Rapid؟',
      questionEn: 'How do I place my first order on SMM Rapid?',
      answerAr: 'الأمر بسيط جداً ويستغرق دقيقة واحدة: 1) اشحن رصيد محفظتك من خلال زر "شحن الرصيد". 2) توجه إلى صفحة "طلب جديد" واختر المنصة والخدمة المطلوبة. 3) ضع رابط الحساب أو المنشور وتأكد أن الحساب عام (Public). 4) حدد الكمية وسرعة التنفيذ ثم اضغط على "تأكيد وبدء التنفيذ". سيبدأ النظام تلقائياً!',
      answerEn: 'It is very simple and takes just 1 minute: 1) Deposit funds into your wallet using the "Deposit" button. 2) Go to "New Order", select your platform and service. 3) Paste your public profile or post link. 4) Enter quantity and execution speed, then click "Confirm Order". The automated system begins immediately!',
      tipsAr: 'نصيحة: تأكد دائماً أن الحساب ليس مغلقاً أو خاصاً (Private) قبل الطلب.',
      tipsEn: 'Tip: Always make sure the account is Public before placing any order.',
      tagsAr: ['أول طلب', 'طريقة الطلب', 'مبتدئ'],
      tagsEn: ['first order', 'how to order', 'beginner']
    },
    {
      id: 'faq-2',
      category: 'getting_started',
      questionAr: 'هل أحتاج لإعطاء كلمة مرور حسابي لأي خدمة؟',
      questionEn: 'Do you ever require my account password?',
      answerAr: 'نهائياً ومستحيل! في SMM Rapid لا نطلب أبداً كلمات المرور أو أي وصول مباشر لحسابك. كل ما نحتاجه هو رابط الحساب العام أو رابط المنشور فقط. حسابك يظل بأمان بنسبة 100%.',
      answerEn: 'Never! SMM Rapid will never ask for your account password or direct access. All that is required is the public link or username. Your accounts remain 100% safe.',
      tipsAr: 'لا تشارك كلمة مرورك مع أي شخص يدعي أنه من فريق الدعم.',
      tipsEn: 'Never share your password with anyone claiming to be support.',
      tagsAr: ['الأمان', 'كلمة المرور', 'خصوصية'],
      tagsEn: ['security', 'password', 'privacy']
    },
    {
      id: 'faq-3',
      category: 'orders',
      questionAr: 'ما الفرق بين أوضاع السرعة: الفوري (Instant)، التدريجي (Gradual)، والدفعات (Drip-Feed)؟',
      questionEn: 'What is the difference between Instant, Gradual, and Drip-Feed speeds?',
      answerAr: 'يوفر SMM Rapid ثلاثة أوضاع مرنة: 1) الفوري (Instant): يبدأ فورياً خلال 1 إلى 5 دقائق، مثالي للمسابقات وحملات الإطلاق العاجلة. 2) التدريجي (Gradual): يوزع الزيادة بمعدل طبيعي يحاكي النمو العضوي. 3) الدفعات (Drip-Feed): يقسم الكمية الإجمالية على فترات متباعدة مجدولة (مثلاً 5000 متابع مقسمة 1000 كل 24 ساعة) لأعلى درجات الأمان.',
      answerEn: 'SMM Rapid provides 3 execution modes: 1) Instant: Starts in 1-5 minutes, ideal for urgent promotions. 2) Gradual: Delivers at a smooth natural pace mimicking organic growth. 3) Drip-Feed: Splits the total amount into scheduled intervals (e.g., 5,000 split into 1,000 every 24 hours) for maximum account longevity.',
      tipsAr: 'نوصي بوضع "التدريجي" للحسابات الجديدة لضمان استقرار الخوارزميات.',
      tipsEn: 'We recommend Gradual speed for newer accounts to keep algorithms balanced.',
      tagsAr: ['السرعة', 'دريب فيد', 'فوري'],
      tagsEn: ['speed', 'drip-feed', 'instant']
    },
    {
      id: 'faq-4',
      category: 'orders',
      questionAr: 'كيف يمكنني تتبع تقدم طلبي لحظة بلحظة؟',
      questionEn: 'How can I track my order progress in real-time?',
      answerAr: 'من خلال قسم "سجل الطلبات" يمكنك مشاهدة نسبة الإنجاز والعداد الحي المباشر (Start Count vs Current Count). كما يمكنك الضغط على أي طلب لعرض سجل اللوغات الفنية ومحطات الإرسال خطوة بخطوة.',
      answerEn: 'Under the "Orders" page, you can monitor live progress bars and real-time counter changes (Start Count vs Current Count). You can also click any order ID to open technical delivery logs and timestamps.',
      tagsAr: ['تتبع', 'نسبة الإنجاز', 'السجل'],
      tagsEn: ['tracking', 'progress', 'logs']
    },
    {
      id: 'faq-5',
      category: 'payments',
      questionAr: 'ما هي وسائل الدفع المدعومة وهل تضاف الأموال فورياً؟',
      questionEn: 'What payment methods are supported and is deposit instant?',
      answerAr: 'نعم، الشحن فوري وتلقائي 100%. ندعم: بطاقات الفيزا والماستركارد، Apple Pay، العملات المشفرة (USDT TRC20/BEP20، Bitcoin)، والمحافظ الإلكترونية المحلية كـ STC Pay وفودافون كاش وباي بال. كما ستحصل على بونص إضافي يصل إلى 15% على المبالغ الكبيرة.',
      answerEn: 'Yes, wallet funding is 100% instant and automated. We support Visa, Mastercard, Apple Pay, Cryptocurrencies (USDT TRC20/BEP20, Bitcoin), and e-wallets like STC Pay and PayPal. You also receive up to 15% deposit bonus on larger amounts.',
      tipsAr: 'تحصل على بونص 10% تلقائياً عند شحن $100 فأكثر!',
      tipsEn: 'Get automatic 10% bonus when depositing $100 or more!',
      tagsAr: ['شحن الرصيد', 'دفع', 'فيزا', 'أبل باي'],
      tagsEn: ['deposit', 'payment', 'apple pay', 'usdt']
    },
    {
      id: 'faq-6',
      category: 'guarantee',
      questionAr: 'ما هو زر إعادة التعبئة (Refill) وكيف يعمل ضمان التعويض؟',
      questionEn: 'What is the Refill button and how does drop guarantee work?',
      answerAr: 'جميع خدماتنا المميزة مشمولة بضمان عدم النقص من 30 يوماً إلى 365 يوماً. إذا لاحظت أي نزول في العدد، ما عليك سوى التوجه إلى سجل الطلبات والضغط على زر "إعادة التعبئة (Refill)" بجانب الطلب، وسيقوم النظام بفحص النقص وتعويضه مجاناً وبدون أي رسوم.',
      answerEn: 'All prime services come with a 30 to 365 days non-drop guarantee. If you notice any drop in numbers, simply visit the Orders page and click the "Refill" button next to your order. Our system automatically verifies the count and restores it for free.',
      tipsAr: 'يمكن طلب إعادة التعبئة مرة كل 24 ساعة لكل طلب مشمول بالضمان.',
      tipsEn: 'Refills can be triggered once every 24 hours per guaranteed order.',
      tagsAr: ['ضمان', 'إعادة تعبئة', 'تعويض'],
      tagsEn: ['guarantee', 'refill', 'drop']
    },
    {
      id: 'faq-7',
      category: 'links',
      questionAr: 'ما هي صيغة الرابط الصحيحة لكل منصة لتجنب تأخر الطلب؟',
      questionEn: 'What is the correct link format for each platform to prevent delays?',
      answerAr: 'لكل منصة صيغة رابط معتمدة: \n• انستغرام للمتابعين: https://www.instagram.com/username\n• انستغرام للمنشورات: https://www.instagram.com/p/CODE/\n• تيك توك: https://www.tiktok.com/@username أو رابط الفيديو الكامل.\n• يوتيوب للقنوات: https://www.youtube.com/@channelName أو رابط الفيديو.\n• تويتر (X): https://x.com/username\nيرجى تجنب الروابط المختصرة (bit.ly وغيرها).',
      answerEn: 'Each platform has standard URL formats:\n• Instagram Followers: https://www.instagram.com/username\n• Instagram Posts: https://www.instagram.com/p/CODE/\n• TikTok: https://www.tiktok.com/@username or direct video link.\n• YouTube: https://www.youtube.com/@channelName or watch video link.\n• Twitter (X): https://x.com/username\nPlease avoid shortened links like bit.ly.',
      tipsAr: 'تأكد أن رابط المنشور ليس في وضع الـ Story أو ريلز خاص.',
      tipsEn: 'Ensure post links are not ephemeral stories or private reels.',
      tagsAr: ['رابط صحيح', 'صيغة', 'انستغرام', 'تيك توك'],
      tagsEn: ['link format', 'instagram', 'tiktok', 'youtube']
    },
    {
      id: 'faq-8',
      category: 'troubleshooting',
      questionAr: 'طلبي معلق (Pending) ولم يبدأ فوراً، ماذا أفعل؟',
      questionEn: 'My order shows Pending and has not started, what should I do?',
      answerAr: 'معظم الخدمات تبدأ بين 1 إلى 15 دقيقة بعد الفحص الأمني للرابط وسيرفرات المنصة. إذا كان الحساب عاماً والرابط صحيحاً، سيبدأ التنفيذ تلقائياً. إذا مر أكثر من 30 دقيقة، يمكنك مراسلة الدعم الفني عبر المحادثة الحية وسيقوم المهندس المناوب بتسريع الطلب فوراً.',
      answerEn: 'Most services start within 1-15 minutes after automated safety checks. As long as the account is public and link is valid, delivery commences automatically. If 30 minutes pass, open the Live Chat and our on-duty engineer will expedite it immediately.',
      tagsAr: ['معلق', 'تأخير', 'دعم فني'],
      tagsEn: ['pending', 'delay', 'support']
    },
    {
      id: 'faq-9',
      category: 'troubleshooting',
      questionAr: 'ماذا يحدث إذا قمت بوضع رابط خاطئ أو كان الحساب مغلقاً (Private)؟',
      questionEn: 'What happens if I enter an incorrect link or the account was Private?',
      answerAr: 'إذا اكتشف النظام أن الحساب مغلق أو الرابط غير صالح، سيتم إلغاء الطلب تلقائياً وإرجاع كامل المبلغ إلى رصيد محفظتك، مع إرسال إشعار فوري لك لتتمكن من إعادة الطلب بالرابط الصحيح دون أي خسارة لرصيدك.',
      answerEn: 'If our nodes detect a private profile or invalid link, the order is safely canceled and the full charge is refunded immediately to your wallet, accompanied by an instant notification so you can retry with the correct URL.',
      tagsAr: ['استرجاع', 'حساب خاص', 'رابط خاطئ'],
      tagsEn: ['refund', 'private account', 'wrong link']
    }
  ];

  // Smart Search & Category Filter
  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const matchAr =
        faq.questionAr.toLowerCase().includes(q) ||
        faq.answerAr.toLowerCase().includes(q) ||
        faq.tagsAr.some((t) => t.toLowerCase().includes(q));
      const matchEn =
        faq.questionEn.toLowerCase().includes(q) ||
        faq.answerEn.toLowerCase().includes(q) ||
        faq.tagsEn.some((t) => t.toLowerCase().includes(q));

      return matchAr || matchEn;
    });
  }, [faqs, selectedCategory, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    filteredFaqs.forEach((f) => {
      allExpanded[f.id] = true;
    });
    setExpandedIds(allExpanded);
  };

  const collapseAll = () => {
    setExpandedIds({});
  };

  // Link format validator simulation
  const getLinkValidationResult = () => {
    const clean = testInput.trim().toLowerCase();
    if (!clean) return null;

    if (testPlatform === 'instagram') {
      const isValid = clean.includes('instagram.com/') && !clean.includes('stories');
      return {
        valid: isValid,
        messageAr: isValid
          ? 'صيغة الرابط ممتازة! تأكد فقط أن الحساب عام (Public).'
          : 'صيغة غير مكتملة. يجب أن يبدأ بـ https://www.instagram.com/اسم_المستخدم',
        messageEn: isValid
          ? 'Great link structure! Just ensure profile is Public.'
          : 'Incomplete format. Should start with https://www.instagram.com/username'
      };
    }

    if (testPlatform === 'tiktok') {
      const isValid = clean.includes('tiktok.com/@') || clean.includes('tiktok.com/t/');
      return {
        valid: isValid,
        messageAr: isValid
          ? 'صيغة رابط تيك توك صحيحة وجاهزة للإرسال.'
          : 'صيغة غير دقيقة. يجب أن تتضمن https://www.tiktok.com/@اسم_الحساب',
        messageEn: isValid
          ? 'Valid TikTok format ready for submission.'
          : 'Format should contain https://www.tiktok.com/@username'
      };
    }

    if (testPlatform === 'youtube') {
      const isValid = clean.includes('youtube.com/') || clean.includes('youtu.be/');
      return {
        valid: isValid,
        messageAr: isValid
          ? 'صيغة رابط يوتيوب سليمة ومعتمدة لدى الخوادم.'
          : 'يرجى وضع رابط القناة أو رابط الفيديو من يوتيوب.',
        messageEn: isValid
          ? 'YouTube link format confirmed valid.'
          : 'Please provide full channel or video URL.'
      };
    }

    const isValid = clean.includes('x.com/') || clean.includes('twitter.com/');
    return {
      valid: isValid,
      messageAr: isValid ? 'صيغة رابط منصة إكس (تويتر) صحيحة.' : 'يجب أن يبدأ بـ https://x.com/اسم_المستخدم',
      messageEn: isValid ? 'Valid X (Twitter) profile URL.' : 'Should start with https://x.com/username'
    };
  };

  const linkResult = getLinkValidationResult();

  return (
    <div className="space-y-8 pb-12 transition-colors">
      
      {/* Hero Banner with Search */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-600 via-blue-700 to-indigo-900 text-white p-6 sm:p-10 shadow-2xl border border-cyan-400/20">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-bold text-cyan-200">
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>{isAr ? 'مركز المساعدة ودليل الاستخدام الشامل' : 'Knowledge Base & Beginner Guide'}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
            {isAr ? 'كيف يمكننا مساعدتك اليوم؟' : 'How Can We Help You Today?'}
          </h1>

          <p className="text-sm sm:text-base text-cyan-100 max-w-2xl leading-relaxed">
            {isAr
              ? 'دليل تفصيلي وإجابات لجميع الأسئلة الشائعة حول كيفية طلب الخدمات، طرق الدفع، صيغ الروابط، وضمان التعويض.'
              : 'Detailed step-by-step guides and answers covering orders, payments, URL formats, and guarantee policies.'}
          </p>

          {/* Smart Search Bar */}
          <div className="relative pt-2">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 absolute start-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isAr
                    ? 'ابحث بالكلمات المفتاحية (مثال: طريقة الشحن، سرعة الطلب، ضمان النقص، الروابط)...'
                    : 'Search questions (e.g. deposit, instant speed, refill, link format)...'
                }
                className="w-full ps-12 pe-12 py-3.5 sm:py-4 rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm sm:text-base font-medium shadow-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute end-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {searchQuery && (
              <div className="flex items-center justify-between text-xs text-cyan-200 mt-2 px-1">
                <span>
                  {isAr
                    ? `تم العثور على ${filteredFaqs.length} نتيجة بحث`
                    : `Found ${filteredFaqs.length} search results`}
                </span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="underline hover:text-white text-xs font-semibold"
                >
                  {isAr ? 'مسح البحث' : 'Clear search'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Decorative backdrop shapes */}
        <div className="absolute -end-20 -bottom-20 w-80 h-80 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
        <div className="absolute end-1/4 -top-16 w-60 h-60 rounded-full bg-blue-400/15 blur-2xl pointer-events-none" />
      </div>

      {/* 4-Step Visual Beginner Quick-Start Guide */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-500" />
              <span>{isAr ? 'دليل البدء السريع في 4 خطوات للمستخدمين الجدد' : 'Quick Start Guide in 4 Easy Steps'}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {isAr
                ? 'اتبع هذه الخطوات البسيطة لبدء أول حملة ترويجية لحسابك بنجاح وبأمان تام.'
                : 'Follow these straightforward steps to successfully launch your first campaign safely.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Step 1 */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 font-black text-sm flex items-center justify-center border border-cyan-300 dark:border-cyan-800">
                  1
                </span>
                <CreditCard className="w-5 h-5 text-cyan-500" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {isAr ? 'شحن رصيد المحفظة' : 'Deposit Wallet Balance'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {isAr
                  ? 'اشحن محفظتك بأي وسيلة (بطاقات، Apple Pay، USDT) مع إضافة فورية وبونص حتى 15%.'
                  : 'Fund your wallet using Cards, Apple Pay, or Crypto with instant crediting and up to 15% bonus.'}
              </p>
            </div>
            <button
              onClick={() => setIsAddFundsModalOpen(true)}
              className="w-full py-2 px-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>{isAr ? 'شحن الرصيد الآن' : 'Deposit Funds'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Step 2 */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-black text-sm flex items-center justify-center border border-blue-300 dark:border-blue-800">
                  2
                </span>
                <Layers className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {isAr ? 'اختيار الخدمة والمنصة' : 'Select Service & Platform'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {isAr
                  ? 'تصفح باقات انستغرام، تيك توك، يوتيوب، تويتر وغيرها، وقارن الأسعار وسرعة التنفيذ.'
                  : 'Explore packages for Instagram, TikTok, YouTube, X, and compare rates and execution speed.'}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('services')}
              className="w-full py-2 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>{isAr ? 'استعراض الباقات' : 'Browse Services'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Step 3 */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center border border-indigo-300 dark:border-indigo-800">
                  3
                </span>
                <LinkIcon className="w-5 h-5 text-indigo-500" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {isAr ? 'وضع الرابط وتحديد الكمية' : 'Paste Public Link & Qty'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {isAr
                  ? 'ضع رابط الحساب العام، واختر كمية الطلب ونمط السرعة (فوري أو تدريجي).'
                  : 'Enter your public URL, choose your target amount, and select instant or gradual speed.'}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('new_order')}
              className="w-full py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>{isAr ? 'إنشاء طلب جديد' : 'New Order'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Step 4 */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-black text-sm flex items-center justify-center border border-emerald-300 dark:border-emerald-800">
                  4
                </span>
                <RefreshCw className="w-5 h-5 text-emerald-500" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {isAr ? 'المتابعة وضمان التعويض' : 'Live Tracking & Refill'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {isAr
                  ? 'تابع التقدم مباشرة عبر لوحة التحكم مع ضمان إعادة التعبئة مجاناً عند أي نقص.'
                  : 'Monitor order progress in real-time, backed by automatic zero-cost refills if drops occur.'}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('orders')}
              className="w-full py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>{isAr ? 'تتبع الطلبات' : 'Track Orders'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>

      {/* Interactive Link Formatter & Checker Tool */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <LinkIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {isAr ? 'مساعد فحص وتنسيق الروابط التفاعلي' : 'Interactive Link Format Assistant'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr
                  ? 'تأكد من كتابة الرابط بالشكل المطلوب لتفادي إلغاء أو تأخير الطلبات.'
                  : 'Verify your link structure to prevent order delays or automatic cancellations.'}
              </p>
            </div>
          </div>

          {/* Platform selector */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
            {(['instagram', 'tiktok', 'youtube', 'twitter'] as const).map((plat) => (
              <button
                key={plat}
                onClick={() => setTestPlatform(plat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  testPlatform === plat
                    ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {plat === 'twitter' ? 'X / Twitter' : plat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {isAr ? 'جرب فحص رابطك هنا قبل الطلب:' : 'Test your link here before placing an order:'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder={
                  testPlatform === 'instagram'
                    ? 'https://www.instagram.com/your_username'
                    : testPlatform === 'tiktok'
                    ? 'https://www.tiktok.com/@your_username'
                    : testPlatform === 'youtube'
                    ? 'https://www.youtube.com/@channel_name'
                    : 'https://x.com/your_username'
                }
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {linkResult && (
              <div
                className={`flex items-start gap-2.5 p-3 rounded-xl text-xs font-semibold ${
                  linkResult.valid
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {linkResult.valid ? (
                  <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                )}
                <span>{isAr ? linkResult.messageAr : linkResult.messageEn}</span>
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 space-y-2">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              <span>{isAr ? 'شروط هامة لنجاح الطلب' : 'Crucial Order Checklist'}</span>
            </div>
            <ul className="space-y-1 text-[11px] list-disc ps-4 leading-relaxed">
              <li>{isAr ? 'الحساب يجب أن يكون عاماً (Public) وليس خاصاً.' : 'Account MUST be Public, never Private.'}</li>
              <li>{isAr ? 'لا تغير اسم المستخدم أثناء سريان الطلب.' : 'Do not change username during order execution.'}</li>
              <li>{isAr ? 'لا تكرر نفس الطلب لنفس الرابط قبل اكتمال الأول.' : 'Do not place concurrent duplicates for same link.'}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-cyan-500" />
            <span className="font-extrabold text-lg text-slate-900 dark:text-white">
              {isAr ? 'تصنيفات الأسئلة الشائعة' : 'FAQ Categories'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              {isAr ? 'فتح جميع الأسئلة' : 'Expand All'}
            </button>
            <button
              onClick={collapseAll}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              {isAr ? 'طي الكل' : 'Collapse All'}
            </button>
          </div>
        </div>

        {/* Categories scrollable container */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-cyan-500 text-white border-cyan-400 shadow-md shadow-cyan-500/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-cyan-300 dark:hover:border-cyan-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                <span>{isAr ? cat.labelAr : cat.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* FAQs List Accordion */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
              <Search className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-base text-slate-900 dark:text-white">
                {isAr ? 'لم نعثر على نتائج مطابقة لبحثك' : 'No matching questions found'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr
                  ? 'جرب البحث بكلمات أخرى أو تحدث مباشرة مع فريق الدعم الفني للإجابة عن سؤالك فوراً.'
                  : 'Try adjusting your search terms or connect directly with our 24/7 support team.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                {isAr ? 'إعادة ضبط البحث' : 'Reset Search'}
              </button>
              <button
                onClick={() => setIsChatOpen(true)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{isAr ? 'تحدث مع الدعم الفني' : 'Ask Live Support'}</span>
              </button>
            </div>
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isExpanded = !!expandedIds[faq.id];
            return (
              <div
                key={faq.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? 'bg-white dark:bg-slate-900 border-cyan-300 dark:border-cyan-800/80 shadow-md'
                    : 'bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <button
                  onClick={() => toggleExpand(faq.id)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-start focus:outline-none"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 shrink-0 rounded-xl bg-cyan-500/10 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-xs">
                      Q
                    </span>
                    <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                      {isAr ? faq.questionAr : faq.questionEn}
                    </span>
                  </div>

                  <div
                    className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center transition-transform duration-200 ${
                      isExpanded
                        ? 'bg-cyan-500 text-white rotate-180 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-slate-100 dark:border-slate-800/60 space-y-3">
                    <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {isAr ? faq.answerAr : faq.answerEn}
                    </div>

                    {(faq.tipsAr || faq.tipsEn) && (
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-900/50 text-xs text-cyan-800 dark:text-cyan-300 font-medium">
                        <Info className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                        <span>{isAr ? faq.tipsAr : faq.tipsEn}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {(isAr ? faq.tagsAr : faq.tagsEn).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Speed Modes Explainer Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {isAr ? 'مقارنة أنماط السرعة وخيارات تخصيص التنفيذ' : 'Speed Modes Comparison & Options'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr
                ? 'اختر السرعة المناسبة لهدف حسابك لضمان تحقيق أعلى تفاعل بأمان كامل.'
                : 'Choose the optimal delivery speed suited for your account growth objectives.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-cyan-600 dark:text-cyan-400">
                {isAr ? '1. فوري فائق (Instant)' : '1. Super Instant'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300">
                1 - 5 {isAr ? 'دقائق' : 'mins'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isAr
                ? 'يبدأ الإرسال بأقصى سرعة فور تأكيد الطلب. مناسب للمسابقات والبث المباشر والإعلانات التي تحتاج تفاعلاً سريعاً.'
                : 'Commences at maximum speed immediately. Recommended for live streams, contests, and quick marketing pushes.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                {isAr ? '2. تدريجي طبيعي (Gradual)' : '2. Natural Gradual'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                {isAr ? 'موصى به' : 'Recommended'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isAr
                ? 'يوزع المتابعين أو التفاعل تدريجياً عبر ساعات منتظمة ليحاكي تدفق التفاعل الحقيقي ويثبت الخوارزميات.'
                : 'Delivers interaction smoothly over regular hours to perfectly simulate organic growth and engagement.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-blue-600 dark:text-blue-400">
                {isAr ? '3. دفعات مجدولة (Drip-Feed)' : '3. Scheduled Drip-Feed'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                {isAr ? 'حملات طويلة' : 'Long-Term'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isAr
                ? 'تقسيم كمية 10,000 مثلاً إلى 1,000 يومياً لمدة 10 أيام متتالية تلقائياً بدون الحاجة لإعادة الطلب يدوياً.'
                : 'Splits orders into auto-repeating daily batches (e.g. 1,000 every 24 hours for 10 days) hands-free.'}
            </p>
          </div>

        </div>
      </div>

      {/* Still need help CTA Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 to-cyan-950 text-white border border-cyan-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-start">
          <h3 className="text-xl sm:text-2xl font-black">
            {isAr ? 'هل ما زال لديك أي استفسار آخر؟' : 'Still Have Questions?'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            {isAr
              ? 'فريق الدعم الفني المباشر لـ SMM Rapid متواجد على مدار 24 ساعة للإجابة عن أسئلتك ومتابعة أي طلب خطوة بخطوة.'
              : 'Our live customer support team is available 24/7 to assist with inquiries, special requests, and order tracking.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
          <button
            onClick={() => setIsChatOpen(true)}
            className="px-6 py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-cyan-500/25 transition-all flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{isAr ? 'فتح المحادثة الفورية 24/7' : 'Start Live Chat 24/7'}</span>
          </button>
          <button
            onClick={() => setActiveTab('new_order')}
            className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm border border-white/20 transition-all flex items-center gap-2"
          >
            <span>{isAr ? 'ابدأ طلبك الآن' : 'Start Order Now'}</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
