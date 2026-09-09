import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { useTranslation } from '../lib/i18n';

const DATA:any={
  smm:{
    en:{title:'SMM Panel | Social Media Marketing Services | RapidSMM',desc:'RapidSMM is an SMM panel for social media marketing services across Instagram, TikTok, YouTube, Facebook, Telegram and more.',h1:'SMM Panel for Social Media Marketing',intro:'RapidSMM brings social media marketing services into one dashboard. Browse public services and pricing, choose a platform, and manage orders from one account.',keywords:['smm panel','SMM panel','social media marketing services','social media marketing panel','SMM services','social media promotion','Instagram SMM','TikTok SMM','YouTube SMM'],bullets:['Public service catalog with current rates and limits','Platform-focused services for major social networks','Order tracking, wallet history and customer support','Affiliate tools and API access for eligible customers']},
    ar:{title:'لوحة SMM | خدمات التسويق عبر وسائل التواصل الاجتماعي | RapidSMM',desc:'RapidSMM لوحة SMM لخدمات التسويق عبر وسائل التواصل الاجتماعي مثل إنستجرام وتيك توك ويوتيوب وفيسبوك وتيليجرام.',h1:'لوحة SMM لخدمات التسويق عبر السوشيال ميديا',intro:'RapidSMM تجمع خدمات التسويق عبر وسائل التواصل الاجتماعي في لوحة واحدة. تصفح الخدمات والأسعار، اختر المنصة، وأدر طلباتك من حساب واحد.',keywords:['لوحة SMM','SMM panel عربي','خدمات SMM','خدمات التسويق عبر السوشيال ميديا','تسويق انستجرام','تسويق تيك توك','تسويق يوتيوب','ترويج السوشيال ميديا'],bullets:['كتالوج عام للخدمات والأسعار والحدود','خدمات مخصصة لأشهر منصات التواصل','متابعة الطلبات وسجل الرصيد والدعم','أدوات أفلييت وواجهة API للعملاء المؤهلين']}
  },
  marketing:{
    en:{title:'Social Media Marketing Services | RapidSMM',desc:'Explore social media marketing services for Instagram, TikTok, YouTube, Facebook, Telegram and other platforms through RapidSMM.',h1:'Social Media Marketing Services',intro:'Explore platform-specific social media marketing services and compare available pricing, descriptions and order limits before signing in.',keywords:['social media marketing','social media marketing services','social media promotion services','Instagram marketing','TikTok marketing','YouTube marketing','Facebook marketing','Telegram marketing'],bullets:['Instagram followers, likes and views where available','TikTok followers, likes and views where available','YouTube views, likes and channel services where available','Facebook, Telegram, Spotify, X and Threads services where available']},
    ar:{title:'خدمات التسويق عبر وسائل التواصل الاجتماعي | RapidSMM',desc:'استكشف خدمات التسويق عبر إنستجرام وتيك توك ويوتيوب وفيسبوك وتيليجرام وغيرها من خلال RapidSMM.',h1:'خدمات التسويق عبر وسائل التواصل الاجتماعي',intro:'استكشف خدمات التسويق حسب المنصة وقارن الأسعار والأوصاف وحدود الطلب المتاحة قبل إنشاء الحساب أو تنفيذ الطلب.',keywords:['التسويق عبر وسائل التواصل الاجتماعي','خدمات التسويق الرقمي','خدمات السوشيال ميديا','تسويق إنستجرام','تسويق تيك توك','تسويق يوتيوب','تسويق فيسبوك','تسويق تيليجرام'],bullets:['خدمات متابعين ولايكات ومشاهدات إنستجرام عند توفرها','خدمات متابعين ولايكات ومشاهدات تيك توك عند توفرها','خدمات يوتيوب للمشاهدات واللايكات والقنوات عند توفرها','خدمات فيسبوك وتيليجرام وسبوتيفاي وX وثريدز عند توفرها']}
  }
};

export default function SEOHub({type}:{type:'smm'|'marketing'}){
 const {lang}=useTranslation(); const d=DATA[type][lang==='ar'?'ar':'en'];
 const path=type==='smm'?'/smm-panel':'/social-media-marketing-services';
 const other=type==='smm'?'/social-media-marketing-services':'/smm-panel';
 return <>
  <SEO title={d.title} description={d.desc} path={path} lang={lang} keywords={d.keywords} alternates={{ar:`${path}?lang=ar`,en:`${path}?lang=en`,xDefault:path}} jsonLd={{'@context':'https://schema.org','@type':'Service',name:d.title,description:d.desc,provider:{'@type':'Organization',name:'RapidSMM',url:'https://smmrapid.store/'},areaServed:'Worldwide',serviceType:'Social Media Marketing'}} />
  <main className="min-h-screen bg-[#0B0F17] text-slate-100 px-6 py-12"><div className="max-w-5xl mx-auto">
   <nav className="text-sm text-slate-400 mb-8"><Link to="/" className="hover:text-white">RapidSMM</Link> / {d.h1}</nav>
   <article><h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{d.h1}</h1><p className="mt-5 text-lg text-slate-300 max-w-3xl leading-8">{d.intro}</p>
    <section className="mt-10"><h2 className="text-2xl font-bold">{lang==='ar'?'ماذا ستجد في RapidSMM؟':'What you can find on RapidSMM'}</h2><ul className="mt-5 grid md:grid-cols-2 gap-4">{d.bullets.map((x:string)=><li key={x} className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-slate-300">{x}</li>)}</ul></section>
    <section className="mt-10"><h2 className="text-2xl font-bold">{lang==='ar'?'الخدمات والمنصات':'Platforms & services'}</h2><div className="mt-5 flex flex-wrap gap-3">{['instagram','tiktok','youtube','facebook','telegram','spotify','twitter','threads'].map(x=><Link key={x} to={`/${lang==='ar'?'ar':'en'}/${x}-services`} className="rounded-lg border border-white/10 px-4 py-2 hover:border-amber-400/50">{x==='twitter'?'X / Twitter':x[0].toUpperCase()+x.slice(1)}</Link>)}</div></section>
    <section className="mt-10 flex flex-wrap gap-3"><Link to="/services" className="rounded-lg bg-amber-400 px-5 py-3 font-bold text-[#0B0F17]">{lang==='ar'?'عرض الخدمات والأسعار':'View services & pricing'}</Link><Link to={other} className="rounded-lg border border-white/10 px-5 py-3">{lang==='ar'?'موضوع مرتبط':'Related guide'}</Link></section>
   </article>
  </div></main>
 </>;
}
