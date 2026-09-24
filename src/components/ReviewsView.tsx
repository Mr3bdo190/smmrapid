import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PlatformBadge } from './PlatformBadge';
import { SocialPlatform } from '../types';
import {
  Star,
  ShieldCheck,
  ThumbsUp,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Plus
} from 'lucide-react';

interface ReviewsViewProps {
  onOpenNewReview: () => void;
}

export const ReviewsView: React.FC<ReviewsViewProps> = ({ onOpenNewReview }) => {
  const { reviews, language, orders } = useApp();
  const isAr = language === 'ar';

  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | 'all'>('all');

  const filteredReviews = reviews.filter((r) => {
    if (platformFilter === 'all') return true;
    return r.platform === platformFilter;
  });

  const avgRating = (
    reviews.reduce((acc, r) => acc + r.rating, 0) / (reviews.length || 1)
  ).toFixed(1);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {isAr ? 'تقييمات وآراء العملاء الموثقة' : 'Verified Customer Reviews & Feedback'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? 'تجارب وآراء حقيقية من صناع المحتوى وأصحاب المتاجر بعد إتمام طلباتهم بنجاح.'
              : 'Authentic testimonials from creators and businesses after successful order fulfillment.'}
          </p>
        </div>

        <button
          onClick={onOpenNewReview}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-md shadow-amber-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? 'كتابة تقييم جديد' : 'Write a Review'}</span>
        </button>
      </div>

      {/* Aggregate Score & Trust Summary */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950 text-white rounded-3xl p-6 sm:p-8 border border-cyan-500/30 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        
        <div className="flex items-center gap-5 md:border-e md:border-slate-800 pe-6">
          <div className="text-5xl font-black text-amber-400 font-mono tracking-tighter">
            {avgRating}
          </div>
          <div>
            <div className="flex items-center gap-1 text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-5 h-5 fill-current" />
              ))}
            </div>
            <span className="text-xs text-slate-400 mt-1 block">
              {isAr
                ? (reviews.length > 0 ? `بناءً على ${reviews.length} تقييم موثق` : 'لا توجد تقييمات مسجلة بعد')
                : (reviews.length > 0 ? `Based on ${reviews.length} verified reviews` : 'No reviews recorded yet')}
            </span>
          </div>
        </div>

        <div className="space-y-2 md:border-e md:border-slate-800 pe-6 text-xs text-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">{isAr ? 'سرعة التنفيذ والفحص:' : 'Execution Speed:'}</span>
            <span className="font-bold text-emerald-400">99.6% ⭐⭐⭐⭐⭐</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">{isAr ? 'ثبات الأرقام وعدم النقص:' : 'Retention & Non-drop:'}</span>
            <span className="font-bold text-cyan-400">99.2% ⭐⭐⭐⭐⭐</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">{isAr ? 'استجابة الدعم الفني:' : 'Support Responsiveness:'}</span>
            <span className="font-bold text-amber-400">100% ⭐⭐⭐⭐⭐</span>
          </div>
        </div>

        <div className="space-y-2 text-center md:text-right">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <ShieldCheck className="w-4 h-4" />
            {isAr ? 'تقييمات موثوقة 100%' : '100% Verified Purchases'}
          </span>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {isAr
              ? 'يُسمح بالتقييم فقط للمستخدمين الذين أكملوا طلباتهم بنجاح عبر النظام لضمان المصداقية التامة.'
              : 'Only customers with verified completed orders can publish reviews to guarantee authenticity.'}
          </p>
        </div>

      </div>

      {/* Platform Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', labelAr: 'جميع الآراء', labelEn: 'All Reviews' },
          { id: 'instagram', labelAr: 'انستغرام', labelEn: 'Instagram' },
          { id: 'tiktok', labelAr: 'تيك توك', labelEn: 'TikTok' },
          { id: 'youtube', labelAr: 'يوتيوب', labelEn: 'YouTube' },
          { id: 'telegram', labelAr: 'تيليجرام', labelEn: 'Telegram' }
        ].map((tab) => {
          const isSelected = platformFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setPlatformFilter(tab.id as any)}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isSelected
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {isAr ? tab.labelAr : tab.labelEn}
            </button>
          );
        })}
      </div>

      {/* Reviews Grid / Empty State */}
      {filteredReviews.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <Star className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
              {isAr ? 'لا توجد تقييمات مسجلة بعد' : 'No reviews recorded yet'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {isAr
                ? 'كن أول من يشارك تجربته مع خدماتنا بعد إتمام طلبك بنجاح.'
                : 'Be the first to share your experience after completing an order.'}
            </p>
          </div>
          <button
            onClick={onOpenNewReview}
            className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'كتابة تقييم جديد' : 'Write a Review'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReviews.map((rev) => {
            return (
              <div
                key={rev.id}
                className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:border-cyan-500/30 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  
                  {/* Author Info & Country */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={rev.avatar}
                        alt={rev.customerName}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {rev.customerName}
                          </span>
                          {rev.verified && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500 fill-cyan-500/20" />
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {rev.country} • {rev.date}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 text-amber-400">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                  </div>

                  {/* Service Tag */}
                  <div className="flex items-center gap-2">
                    <PlatformBadge platform={rev.platform} size="sm" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                      {isAr ? rev.serviceNameAr : rev.serviceNameEn}
                    </span>
                  </div>

                  {/* Comment Text */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    "{isAr ? rev.commentAr : rev.commentEn}"
                  </p>
                </div>

                {/* Tags */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5">
                  {(isAr ? rev.tagsAr : rev.tagsEn).map((t, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 border border-cyan-200/60 dark:border-cyan-800/40"
                    >
                      #{t}
                    </span>
                  ))}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
