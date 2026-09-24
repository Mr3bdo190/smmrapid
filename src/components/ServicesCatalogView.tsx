import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PlatformBadge } from './PlatformBadge';
import { SocialPlatform, ServiceItem } from '../types';
import {
  Search,
  Zap,
  RotateCcw,
  Clock,
  ArrowRight,
  Filter,
  ShieldCheck,
  Flame,
  CheckCircle2
} from 'lucide-react';

export const ServicesCatalogView: React.FC = () => {
  const { services, language, setActiveTab } = useApp();
  const isAr = language === 'ar';

  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = services.filter((s) => {
    if (selectedPlatform !== 'all' && s.platform !== selectedPlatform) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (s.nameAr + ' ' + s.nameEn).toLowerCase().includes(q);
      const matchCat = (s.categoryAr + ' ' + s.categoryEn).toLowerCase().includes(q);
      return matchName || matchCat;
    }
    return true;
  });

  const platforms: { id: SocialPlatform | 'all'; labelAr: string; labelEn: string }[] = [
    { id: 'all', labelAr: 'الكل (جميع الخدمات)', labelEn: 'All Services' },
    { id: 'instagram', labelAr: 'انستغرام', labelEn: 'Instagram' },
    { id: 'tiktok', labelAr: 'تيك توك', labelEn: 'TikTok' },
    { id: 'youtube', labelAr: 'يوتيوب', labelEn: 'YouTube' },
    { id: 'twitter', labelAr: 'تويتر / X', labelEn: 'X / Twitter' },
    { id: 'telegram', labelAr: 'تيليجرام', labelEn: 'Telegram' },
    { id: 'facebook', labelAr: 'فيسبوك', labelEn: 'Facebook' },
    { id: 'linkedin', labelAr: 'لينكد إن', labelEn: 'LinkedIn' },
    { id: 'spotify', labelAr: 'سبوتيفاي', labelEn: 'Spotify' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {isAr ? 'قائمة الخدمات والأسعار التنافسية' : 'Services & Competitive Pricing'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? 'تصفح أكثر من 50+ خدمة تواصل اجتماعي مع ضمان عدم النزول، وسرعة بدء فورية بأفضل سعر.'
              : 'Browse 50+ high-speed social media packages with non-drop refill guarantees.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {isAr ? 'أسعار الجملة المباشرة' : 'Direct Wholesale Rates'}
          </span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {platforms.map((p) => {
            const isSelected = selectedPlatform === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPlatform(p.id)}
                className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                {isAr ? p.labelAr : p.labelEn}
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'ابحث عن خدمة، متابعين، لايكات...' : 'Search services or packages...'}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl ps-9 pe-4 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
        </div>
      </div>

      {/* Services Table & Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((service) => {
          return (
            <div
              key={service.id}
              className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-cyan-500/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <PlatformBadge platform={service.platform} size="sm" />
                  
                  {service.badge && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <Flame className="w-3 h-3 fill-current" />
                      {service.badge}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-cyan-500 transition-colors leading-snug">
                    {isAr ? service.nameAr : service.nameEn}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {isAr ? service.descriptionAr : service.descriptionEn}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{isAr ? 'السرعة المقدرة:' : 'Start Speed:'}</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {isAr ? service.avgTimeAr : service.avgTimeEn}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{isAr ? 'الحد الأدنى والأقصى:' : 'Min / Max:'}</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {(service.min ?? 0).toLocaleString()} - {(service.max ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{isAr ? 'ضمان إعادة التعبئة:' : 'Refill Warranty:'}</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {service.refillDays > 0 ? (isAr ? `${service.refillDays} يوم مجاناً` : `${service.refillDays} Days Free`) : (isAr ? 'بدون ضمان' : 'None')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Price & CTA */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">{isAr ? 'السعر لكل 1,000' : 'Per 1k'}</span>
                  <span className="font-black text-lg text-cyan-600 dark:text-cyan-400 font-mono">
                    ${service.ratePer1000.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={() => setActiveTab('new_order')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 dark:bg-slate-800 hover:bg-cyan-600 dark:hover:bg-cyan-500 transition-colors shadow-sm"
                >
                  <span>{isAr ? 'طلب الآن' : 'Order Now'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
