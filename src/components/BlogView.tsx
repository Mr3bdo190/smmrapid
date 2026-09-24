import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  BookOpen,
  Calendar,
  Clock,
  User,
  ArrowRight,
  ArrowLeft,
  Search,
  Tag,
  Share2,
  CheckCircle2,
  Sparkles,
  ChevronRight
} from 'lucide-react';

interface BlogPost {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  excerptAr: string;
  excerptEn: string;
  contentAr: string[];
  contentEn: string[];
  categoryAr: string;
  categoryEn: string;
  readTime: string;
  date: string;
  author: string;
  tags: string[];
}

export const BlogView: React.FC = () => {
  const { language } = useApp();
  const isAr = language === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeArticle, setActiveArticle] = useState<BlogPost | null>(null);

  const posts: BlogPost[] = [
    {
      id: 'post-1',
      slug: 'tiktok-algorithm-secrets-2026',
      titleAr: 'أسرار خوارزمية تيك توك 2026: كيف تجعل مقاطعك تتصدر صفحة For You فور نشرها؟',
      titleEn: 'TikTok Algorithm Secrets 2026: How to Push Videos to For You Page Instantly',
      excerptAr: 'تعرف على المعادلة الرياضية لخوارزمية تيك توك، ولماذا يعتبر معدل المشاهدة في أول 3 ثوانٍ هو المفتاح الذهبي للانتشار الفيروسي.',
      excerptEn: 'Learn the exact ranking factors of TikTok and why 3-second completion rate drives viral reach.',
      categoryAr: 'استراتيجيات تيك توك',
      categoryEn: 'TikTok Growth',
      readTime: '4 دقائق',
      date: '24 سبتمبر 2026',
      author: 'فريق خبراء SMM Rapid',
      tags: ['تيك توك', 'For You', 'إكسبلور', 'خوارزميات'],
      contentAr: [
        'تعتمد خوارزمية تيك توك في عام 2026 على مبدأ "اختبار المجموعات الأولية" (Initial Batch Testing). عند نشر أي مقطع جديد، يتم عرضه على 200 إلى 500 مستخدم مهتمين بموضوع المقطع.',
        'إذا حقق الفيديو معدل إكمال يفوق 60% مع تفاعل مبكر (لايكات ومشاركات) خلال الدقائق الخمس الأولى، يرسله النظام فوراً إلى المجموعة التالية (50,000 مستخدم) وهكذا.',
        'هنا يأتي دور تعزيز التفاعل المبكر: ضخ المشاهدات واللايكات الفورية في الدقائق الأولى يعطي إشارة للخوارزمية بأن هذا المقطع ذو قيمة عالية، مما يحفز التوزيع المجاني على ملايين المستخدمين.',
        'نصيحة ذهبية: استخدم دوماً خطافاً بصرياً وصوتياً في أول 3 ثوانٍ، واحرص على اختيار الموسيقى الرائجة (Trending Audio) لزيادة احتمالية الظهور.'
      ],
      contentEn: [
        'In 2026, TikTok operates on an Initial Batch Testing model, exposing new videos to 200–500 targeted users first.',
        'Achieving over 60% watch-through rate and early engagements in the first minutes triggers exponential recommendation to the next tier of 50k+ viewers.',
        'Boosting early views and likes signals quality to the engine, accelerating viral organic reach.',
        'Pro Tip: Keep the first 3 seconds punchy and leverage trending audio tracks to optimize discoverability.'
      ]
    },
    {
      id: 'post-2',
      slug: 'instagram-reels-retention-guide',
      titleAr: 'دليل إنستغرام ريلز الشامل: كيف تحول المشاهدات إلى متابعين دائمين لحسابك؟',
      titleEn: 'Complete Instagram Reels Guide: Turning Views Into Loyal Long-Term Followers',
      excerptAr: 'استراتيجيات عملية لزيادة التفاعل على الريلز، واختيار الهاشتاجات الصحيحة، وبناء الثقة لدى العملاء والمتابعين الجدد.',
      excerptEn: 'Actionable strategies to boost Reels engagement, optimize hashtags, and turn casual viewers into loyal followers.',
      categoryAr: 'إنستغرام وسوشيال ميديا',
      categoryEn: 'Instagram Growth',
      readTime: '5 دقائق',
      date: '20 سبتمبر 2026',
      author: 'سيف الدين - مستشار نمو رقمي',
      tags: ['إنستغرام', 'ريلز', 'زيادة متابعين', 'تسويق'],
      contentAr: [
        'يعتبر إنستغرام ريلز حالياً هو الأداة الأكثر فعالية للوصول إلى جمهور خارج دائرة متابعيك الحاليين.',
        'لتحقيق أقصى استفادة، يجب ألا تعتمد فقط على المشاهدات العشوائية، بل اجعل كل مقطع يقدم فائدة سريعة أو متعة بصرية، متبوعة بدعوة صريحة لاتخاذ إجراء (Call to Action) مثل: "تابع الحساب للمزيد من النصائح اليومية".',
        'تأكد أيضاً من أن غلاف الفيديو (Cover) منسق ومكتوب عليه عنوان جذاب لكي يجذب الزائر عند دخوله إلى شبكة ملفك الشخصي.',
        'خدمات المشاهدات واللايكات المستقرة تمنح حسابك "الدليل الاجتماعي" (Social Proof) الذي يجعل أي زائر جديد يثق في محتواك ويقرر متابعتك فوراً.'
      ],
      contentEn: [
        'Instagram Reels remains the most powerful format to reach audiences outside your existing follower base.',
        'Deliver concise value followed by a clear Call To Action (e.g. "Follow for daily tips").',
        'Ensure custom thumbnail covers with legible text to optimize grid visit conversions.',
        'Solid engagement metrics provide crucial social proof that persuades new visitors to follow.'
      ]
    },
    {
      id: 'post-3',
      slug: 'youtube-monetization-milestones-safely',
      titleAr: 'كيف تحقق شروط الربح من يوتيوب (4000 ساعة و1000 مشترك) في أسرع وقت وبأمان؟',
      titleEn: 'How to Safely Achieve YouTube Partner Program (4000 Watch Hours & 1000 Subs)',
      excerptAr: 'خطوات موثوقة ومطابقة لسياسات شركاء يوتيوب لتخطي حاجز التفعيل والبدء في جني الأرباح من إعلانات أدسنس.',
      excerptEn: 'Compliant steps to achieve YouTube Partner Program thresholds and unlock AdSense monetization revenue.',
      categoryAr: 'يوتيوب وتحقيق الدخل',
      categoryEn: 'YouTube Monetization',
      readTime: '6 دقائق',
      date: '15 سبتمبر 2026',
      author: 'فريق خبراء SMM Rapid',
      tags: ['يوتيوب', 'تحقيق الدخل', 'ساعات المشاهدة', 'أدسنس'],
      contentAr: [
        'يمثل الوصول إلى 1000 مشترك و4000 ساعة مشاهدة العقبة الكبرى أمام معظم صناع المحتوى المبتدئين على يوتيوب.',
        'لتحقيق ساعات المشاهدة بذكاء، ينصح بنشر مقاطع طويلة (من 20 إلى 45 دقيقة) مثل البودكاست، الشروحات الشاملة، أو الموسيقى الهادئة للدراسة والتركيز.',
        'عند دعم قناتك بساعات مشاهدة، تأكد دوماً من استخدام خدمات عالية الجودة ذات مدة بقاء مرتفعة (High Retention) مثل باقات تحقيق الدخل المتوفرة لدينا، والتي تحاكي المشاهدة الحقيقية وتُحتسب بدقة داخل استوديو يوتيوب.',
        'بمجرد اكتمال الشروط وظهور مؤشر الأهلية الأخضر، يمكنك تقديم طلب المراجعة لتبدأ أرباحك بالتدفق مباشرة.'
      ],
      contentEn: [
        '1,000 subscribers and 4,000 watch hours are the pivotal milestones for YouTube creators to unlock monetization.',
        'Produce long-form content (20–45 mins) such as podcasts or in-depth tutorials to accumulate watch time efficiently.',
        'Use high-retention watch time packs that safely register in YouTube Studio analytics without algorithmic red flags.',
        'Once eligible, submit for review to start earning direct ad revenue.'
      ]
    },
    {
      id: 'post-4',
      slug: 'how-to-start-smm-reseller-agency',
      titleAr: 'دليل إطلاق وكالة تسويق وبيع خدمات سوشيال ميديا (SMM Reseller): كيف تربح $1,000 شهرياً؟',
      titleEn: 'Starting a Lucrative SMM Reseller Agency: How to Earn $1,000+ Monthly',
      excerptAr: 'كيف تشتري بأسعار الجملة من SMM Rapid وتعيد بيعها لأصحاب الأنشطة التجارية والشركات بهامش ربح يصل إلى 300%.',
      excerptEn: 'Learn how to buy wholesale services and resell to local businesses with up to 300% profit margins.',
      categoryAr: 'تجارة وتسويق رقمي',
      categoryEn: 'Reseller Business',
      readTime: '7 دقائق',
      date: '10 سبتمبر 2026',
      author: 'إدارة SMM Rapid',
      tags: ['موزعين', 'أرباح', 'تجارة إلكترونية', 'API'],
      contentAr: [
        'يعد مجال إعادة بيع خدمات التواصل الاجتماعي (SMM Reseller) أحد أسهل مجالات العمل الحر ربحية دون الحاجة لرأس مال كبير.',
        'الفكرة ببساطة: تشتري خدمة 1000 متابع أو لايك بسعر الجملة من المنصة (مثلاً $1 إلى $3)، ثم تقدم باقات إدارة ونمو حسابات للمطاعم، الأطباء، ومتاجر إنستغرام بأسعار تتراوح بين $10 إلى $25.',
        'يمكنك أيضاً ربط موقعك الخاص عبر واجهة برمجة التطبيقات (API) المتوفرة لدينا لتتم معالجة طلبات عملائك تلقائياً دون أي مجهود يدوي منك.',
        'نوفر في SMM Rapid خصومات خاصة وحسابات VIP للموزعين والمسوقين لتوسيع أرباحهم بشكل مستمر.'
      ],
      contentEn: [
        'SMM reselling is one of the most accessible online businesses requiring minimal starting capital.',
        'Acquire wholesale services ($1–$3/1k) and package them as management solutions for local businesses at $15–$30.',
        'Automate your workflows by connecting our REST API to your own storefront for hands-off order processing.',
        'Enjoy dedicated VIP reseller discounts and tiered rewards as your volume scales.'
      ]
    }
  ];

  const categories = [
    { id: 'all', labelAr: 'كافة المقالات', labelEn: 'All Articles' },
    { id: 'tiktok', labelAr: 'تيك توك', labelEn: 'TikTok' },
    { id: 'instagram', labelAr: 'إنستغرام', labelEn: 'Instagram' },
    { id: 'youtube', labelAr: 'يوتيوب', labelEn: 'YouTube' },
    { id: 'reseller', labelAr: 'أدلة الموزعين والربح', labelEn: 'Reseller Guides' }
  ];

  const filteredPosts = posts.filter((post) => {
    if (selectedCategory === 'tiktok' && !post.tags.includes('تيك توك')) return false;
    if (selectedCategory === 'instagram' && !post.tags.includes('إنستغرام')) return false;
    if (selectedCategory === 'youtube' && !post.tags.includes('يوتيوب')) return false;
    if (selectedCategory === 'reseller' && !post.tags.includes('موزعين')) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (post.titleAr + ' ' + post.titleEn).toLowerCase().includes(q);
      const matchExcerpt = (post.excerptAr + ' ' + post.excerptEn).toLowerCase().includes(q);
      return matchTitle || matchExcerpt;
    }
    return true;
  });

  return (
    <div className="space-y-8 py-4 sm:py-6">
      
      {/* Blog Header & Hero */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-bold border border-cyan-500/20">
          <BookOpen className="w-3.5 h-3.5" />
          <span>{isAr ? 'مدونة SMM Rapid التعليمية' : 'SMM Rapid Knowledge Hub'}</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          {isAr ? 'مقالات وأسرار خوارزميات السوشيال ميديا' : 'Insights, Strategies & Algorithm Guides'}
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
          {isAr
            ? 'دليلك المتخصص لفهم خوارزميات المنصات، وزيادة التفاعل، وتنمية مشروعك الرقمي بأحدث التقنيات لعام 2026.'
            : 'Your expert guide to mastering social media algorithms, growth strategies, and digital monetization.'}
        </p>
      </div>

      {/* Search and Category Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === c.id
                  ? 'bg-cyan-500 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              {isAr ? c.labelAr : c.labelEn}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'ابحث في المقالات...' : 'Search articles...'}
            className="w-full ps-9 pe-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Article Detail View Modal/State */}
      {activeArticle ? (
        <div className="p-6 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 animate-in fade-in duration-200">
          <button
            onClick={() => setActiveArticle(null)}
            className="inline-flex items-center gap-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
          >
            <span>{isAr ? '← العودة لكافة المقالات' : '← Back to all articles'}</span>
          </button>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold">
                {isAr ? activeArticle.categoryAr : activeArticle.categoryEn}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{activeArticle.date}</span>
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{activeArticle.readTime}</span>
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                <span>{activeArticle.author}</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white leading-snug">
              {isAr ? activeArticle.titleAr : activeArticle.titleEn}
            </h1>
          </div>

          <div className="prose dark:prose-invert max-w-none space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            {(isAr ? activeArticle.contentAr : activeArticle.contentEn).map((paragraph, idx) => (
              <p key={idx} className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Tags */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
            <Tag className="w-4 h-4 text-slate-400" />
            {activeArticle.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Call to action at article bottom */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                {isAr ? 'جاهز لتطبيق هذه الاستراتيجية على حسابك؟' : 'Ready to apply this strategy to your channel?'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr ? 'تصفح خدماتنا الفورية بأسعار تبدأ من $0.08 لكل 1000.' : 'Explore instant high-speed services starting at $0.08/1k.'}
              </p>
            </div>
            <Link
              to="/services"
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold whitespace-nowrap transition-colors"
            >
              {isAr ? 'تصفح باقات الخدمات' : 'Explore Packages'}
            </Link>
          </div>
        </div>
      ) : (
        /* Blog Post Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPosts.map((post) => (
            <article
              key={post.id}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-cyan-500/50 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold">
                    {isAr ? post.categoryAr : post.categoryEn}
                  </span>
                  <span className="flex items-center gap-1 text-[11px]">
                    <Clock className="w-3 h-3" />
                    <span>{post.readTime}</span>
                  </span>
                </div>

                <h2
                  onClick={() => setActiveArticle(post)}
                  className="font-bold text-base sm:text-lg text-slate-900 dark:text-white leading-snug hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
                >
                  {isAr ? post.titleAr : post.titleEn}
                </h2>

                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
                  {isAr ? post.excerptAr : post.excerptEn}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{post.date}</span>
                </div>

                <button
                  onClick={() => setActiveArticle(post)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                >
                  <span>{isAr ? 'اقرأ المقال بالكامل' : 'Read Article'}</span>
                  <ArrowIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

    </div>
  );
};
