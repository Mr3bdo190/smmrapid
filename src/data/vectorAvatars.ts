export interface VectorPreset {
  id: string;
  nameAr: string;
  nameEn: string;
  category: 'pro' | 'tech' | 'gaming' | 'vip' | 'cosmic' | 'shields';
  defaultBg: string;
  defaultAccent: string;
  descriptionAr: string;
  descriptionEn: string;
}

export const VECTOR_BACKGROUNDS = [
  { id: 'cyan_glow', nameAr: 'توهج سايان', nameEn: 'Cyan Glow', bgClass: 'from-cyan-500 via-blue-600 to-indigo-700', hex: '#06b6d4' },
  { id: 'royal_purple', nameAr: 'بنفسجي ملكي', nameEn: 'Royal Purple', bgClass: 'from-purple-600 via-indigo-600 to-violet-800', hex: '#9333ea' },
  { id: 'sunset_amber', nameAr: 'شروق الشمس الذهبي', nameEn: 'Sunset Amber', bgClass: 'from-amber-500 via-orange-600 to-rose-600', hex: '#f59e0b' },
  { id: 'emerald_pulse', nameAr: 'نبض الزمرد', nameEn: 'Emerald Pulse', bgClass: 'from-emerald-500 via-teal-600 to-cyan-700', hex: '#10b981' },
  { id: 'neon_pink', nameAr: 'نيون فوشيا', nameEn: 'Neon Pink', bgClass: 'from-pink-500 via-rose-600 to-purple-700', hex: '#ec4899' },
  { id: 'dark_carbon', nameAr: 'كاربون فحم', nameEn: 'Dark Carbon', bgClass: 'from-slate-800 via-slate-900 to-black', hex: '#1e293b' },
  { id: 'electric_blue', nameAr: 'أزرق كهربائي', nameEn: 'Electric Blue', bgClass: 'from-blue-600 via-sky-500 to-cyan-400', hex: '#2563eb' },
  { id: 'ruby_fire', nameAr: 'ياقوت ناري', nameEn: 'Ruby Fire', bgClass: 'from-red-600 via-rose-600 to-amber-600', hex: '#e11d48' },
  { id: 'golden_elite', nameAr: 'ذهب نقي VIP', nameEn: 'Golden VIP', bgClass: 'from-yellow-400 via-amber-500 to-amber-700', hex: '#d97706' }
];

export const VECTOR_ACCESSORIES = [
  { id: 'none', nameAr: 'بدون إضافات', nameEn: 'None' },
  { id: 'crown', nameAr: 'تاج الـ VIP الملكي', nameEn: 'VIP Crown' },
  { id: 'verified', nameAr: 'شارة التوثيق الرسمي', nameEn: 'Verified Badge' },
  { id: 'headphones', nameAr: 'سماعات احترافية', nameEn: 'Headphones' },
  { id: 'glasses', nameAr: 'نظارات سايبر نيون', nameEn: 'Cyber Shades' },
  { id: 'lightning', nameAr: 'صاعقة السرعة الفائقة', nameEn: 'Lightning Bolt' },
  { id: 'sparkles', nameAr: 'بريق النجوم والتميز', nameEn: 'Magic Sparkles' }
];

export const VECTOR_PRESETS: VectorPreset[] = [
  {
    id: 'pro_executive',
    nameAr: 'رائد الأعمال المحترف',
    nameEn: 'Executive Pro',
    category: 'pro',
    defaultBg: 'from-blue-600 via-cyan-600 to-slate-900',
    defaultAccent: '#38bdf8',
    descriptionAr: 'شخصية رسمية عصرية للمسوقين ورواد الأعمال',
    descriptionEn: 'Formal modern persona for digital marketers & executives'
  },
  {
    id: 'tech_ninja',
    nameAr: 'مطور وسايبر نينجا',
    nameEn: 'Tech Ninja',
    category: 'tech',
    defaultBg: 'from-cyan-500 via-blue-600 to-indigo-700',
    defaultAccent: '#06b6d4',
    descriptionAr: 'هوديي وقناع تقني للخبراء والمبرمجين',
    descriptionEn: 'Tech hoodie and visor for developers and power users'
  },
  {
    id: 'crypto_whale',
    nameAr: 'حوت الكريبتو والتداول',
    nameEn: 'Crypto Trader',
    category: 'pro',
    defaultBg: 'from-amber-500 via-orange-600 to-rose-600',
    defaultAccent: '#f59e0b',
    descriptionAr: 'شخصية مستثمر مالي أنيق مع رموز العملات الرقمية',
    descriptionEn: 'Sharp financial investor avatar with blockchain emblems'
  },
  {
    id: 'cyber_bot',
    nameAr: 'روبوت الذكاء الاصطناعي',
    nameEn: 'Cyber AI Bot',
    category: 'tech',
    defaultBg: 'from-purple-600 via-indigo-600 to-violet-800',
    defaultAccent: '#a855f7',
    descriptionAr: 'روبوت مستقبلي لطيف يعبر عن الأتمتة والسرعة',
    descriptionEn: 'Futuristic friendly bot representing automation & speed'
  },
  {
    id: 'cosmic_astronaut',
    nameAr: 'رائد فضاء المستقبل',
    nameEn: 'Cosmic Explorer',
    category: 'cosmic',
    defaultBg: 'from-indigo-600 via-purple-700 to-slate-950',
    defaultAccent: '#c084fc',
    descriptionAr: 'خوذة فضاء عاكسة للنجوم والكواكب الساطعة',
    descriptionEn: 'Astronaut helmet reflecting galaxy stars and nebula'
  },
  {
    id: 'gamer_streamer',
    nameAr: 'صانع محتوى وجيمر',
    nameEn: 'Pro Gamer',
    category: 'gaming',
    defaultBg: 'from-pink-500 via-rose-600 to-purple-700',
    defaultAccent: '#f43f5e',
    descriptionAr: 'سماعات إضاءة RGB لصناع المحتوى واليوتيوبرز',
    descriptionEn: 'RGB glowing headset for content creators and streamers'
  },
  {
    id: 'vip_royalty',
    nameAr: 'الملك الذهبي VIP',
    nameEn: 'Royal Elite VIP',
    category: 'vip',
    defaultBg: 'from-yellow-400 via-amber-500 to-amber-700',
    defaultAccent: '#fbbf24',
    descriptionAr: 'رمز الفخامة والتاج الملكي للأعضاء الأكثر إنفاقاً',
    descriptionEn: 'Golden crown and royal crest for high-tier members'
  },
  {
    id: 'lightning_crest',
    nameAr: 'درع الصاعقة الخارقة',
    nameEn: 'Lightning Crest',
    category: 'shields',
    defaultBg: 'from-cyan-600 via-blue-600 to-slate-900',
    defaultAccent: '#38bdf8',
    descriptionAr: 'درع تكنولوجي هولوغرافي يعبر عن سرعة تسليم الطلبات',
    descriptionEn: 'Holographic cyber shield symbolizing instant delivery'
  },
  {
    id: 'creative_artist',
    nameAr: 'المصمم والمبدع الرقمي',
    nameEn: 'Creative Designer',
    category: 'pro',
    defaultBg: 'from-emerald-500 via-teal-600 to-cyan-700',
    defaultAccent: '#10b981',
    descriptionAr: 'نظارات أنيقة وتأثيرات ألوان إبداعية',
    descriptionEn: 'Creative spectacles and palette highlights for creatives'
  },
  {
    id: 'phoenix_fire',
    nameAr: 'طائر الفينيق الأسطوري',
    nameEn: 'Phoenix Flame',
    category: 'shields',
    defaultBg: 'from-red-600 via-rose-600 to-amber-600',
    defaultAccent: '#f43f5e',
    descriptionAr: 'شعار العنقاء المجنح ذو اللهب المتوهج',
    descriptionEn: 'Mythical fiery phoenix emblem for unstoppable growth'
  },
  {
    id: 'cyberpunk_hacker',
    nameAr: 'القرصان الأخلاقي النيون',
    nameEn: 'Neon Specialist',
    category: 'tech',
    defaultBg: 'from-slate-800 via-slate-900 to-black',
    defaultAccent: '#22d3ee',
    descriptionAr: 'قناع رقمي مضيء بنمط ماتريكس المستقبلي',
    descriptionEn: 'Illuminated digital mask in futuristic cyberpunk style'
  },
  {
    id: 'star_influencer',
    nameAr: 'نجم السوشيال ميديا',
    nameEn: 'Social Influencer',
    category: 'vip',
    defaultBg: 'from-violet-600 via-pink-600 to-amber-500',
    defaultAccent: '#e879f9',
    descriptionAr: 'أيقونة التفاعل والمتابعات المليونية',
    descriptionEn: 'Viral sensation icon with mega reach and sparkling stars'
  }
];
