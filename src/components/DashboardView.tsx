import React from 'react';
import { useApp } from '../context/AppContext';
import { PlatformBadge } from './PlatformBadge';
import {
  Wallet,
  Zap,
  Activity,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Star,
  PlusCircle,
  Clock,
  Sparkles,
  TrendingUp,
  Layers,
  ChevronRight
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    userStats,
    orders,
    services,
    language,
    setActiveTab,
    setIsAddFundsModalOpen,
    setTrackingOrderId,
    reviews
  } = useApp();

  const isAr = language === 'ar';

  const activeOrdersList = orders.filter((o) => o.status === 'in_progress' || o.status === 'pending');
  const recentCompleted = orders.filter((o) => o.status === 'completed').slice(0, 3);
  const featuredServices = services.filter((s) => s.badge === 'popular' || s.badge === 'trending').slice(0, 4);

  return (
    <div className="space-y-8">
      
      {/* Hero Welcome & Node Status Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-950 via-slate-900 to-blue-950 border border-cyan-500/30 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                {isAr ? 'سيرفرات فائقة السرعة تعمل بكفاءة 100%' : 'Ultra Nodes 100% Operational'}
              </span>
              <span className="text-xs font-bold text-slate-400">
                {isAr ? 'v2.8 Live SMM Engine' : 'v2.8 SMM Engine'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              {isAr
                ? 'نمِّ حساباتك وعلامتك التجارية بأعلى سرعة وأقل تكلفة'
                : 'Accelerate Your Social Reach with Ultra-Speed Fulfillment'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isAr
                ? 'لوحة تحكم ذكية لزيادة المتابعين، اللايكات، والمشاهدات على انستغرام، تيك توك، يوتيوب، وتويتر مع ضمان عدم النزول ودعم فني لحظي.'
                : 'Boost followers, likes, views across Instagram, TikTok, YouTube & X with auto-refill guarantees and real-time live tracking.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('new_order')}
              className="px-5 py-3 rounded-2xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/30 active:scale-95 transition-all flex items-center gap-2"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>{isAr ? 'إنشاء طلب فوري جديد' : 'New Instant Order'}</span>
            </button>

            <button
              onClick={() => setIsAddFundsModalOpen(true)}
              className="px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm bg-white/10 hover:bg-white/15 text-white border border-white/15 backdrop-blur-sm transition-colors flex items-center gap-2"
            >
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>{isAr ? 'شحن المحفظة' : 'Deposit Funds'}</span>
            </button>
          </div>
        </div>

        {/* Subtle decorative glow */}
        <div className="pointer-events-none absolute -bottom-10 -end-10 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Balance Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isAr ? 'الرصيد المتاح' : 'Available Balance'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
              ${userStats.balance.toFixed(2)}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-slate-400">{isAr ? 'جاهز للاستخدام' : 'Ready to order'}</span>
              <button
                onClick={() => setIsAddFundsModalOpen(true)}
                className="font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
              >
                <span>{isAr ? '+ شحن رصيد' : '+ Deposit'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Active Orders with Pulse */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isAr ? 'الطلبات النشطة' : 'Active Orders'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
              {activeOrdersList.length}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-slate-400">{isAr ? 'تحديث وتتبع لحظي' : 'Live progress'}</span>
              <button
                onClick={() => setActiveTab('orders')}
                className="font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                {isAr ? 'عرض السجل ←' : 'View Orders →'}
              </button>
            </div>
          </div>
        </div>

        {/* Total Spent */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isAr ? 'إجمالي المشتريات' : 'Total Spent'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
              ${userStats.totalSpent.toFixed(2)}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-slate-400">{isAr ? `${orders.length} طلب إجمالي` : `${orders.length} Total orders`}</span>
              <button
                onClick={() => setActiveTab('analytics')}
                className="font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                {isAr ? 'الإحصائيات' : 'Analytics'}
              </button>
            </div>
          </div>
        </div>

        {/* User VIP Gold Tier */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isAr ? 'مستوى الحساب' : 'Account Tier'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-amber-500">
              {userStats.tier}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-emerald-500 font-bold">{isAr ? 'خصم 15% مفعل' : '15% VIP discount'}</span>
              <span className="text-slate-400">{isAr ? 'أولوية قصوى' : 'High Priority'}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Real-time Active Orders Live Widget */}
      {activeOrdersList.length > 0 && (
        <div className="bg-white dark:bg-slate-900/90 border border-cyan-500/30 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-ping" />
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                {isAr ? 'طلباتك قيد الإرسال والتتبع المباشر الآن' : 'Orders Currently Delivering (Live)'}
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('orders')}
              className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>{isAr ? 'عرض الكل' : 'View all'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeOrdersList.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PlatformBadge platform={order.platform} size="sm" />
                    <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">
                      #{order.id}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 font-mono">
                    {order.progressPercentage}% {isAr ? 'مكتمل' : 'Delivered'}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {isAr ? order.serviceNameAr : order.serviceNameEn}
                </h4>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-700"
                    style={{ width: `${order.progressPercentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-400 font-mono text-[11px]">
                    {(order.currentCount ?? 0).toLocaleString()} / {(order.targetCount ?? order.quantity ?? 0).toLocaleString()}
                  </span>
                  <button
                    onClick={() => setTrackingOrderId(order.id)}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-bold hover:bg-cyan-500/20 transition-colors"
                  >
                    {isAr ? 'تتبع لحظي' : 'Live Track'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Featured Fast Services Carousel/Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-lg text-slate-900 dark:text-white">
              {isAr ? 'أكثر الخدمات طلباً وسرعة' : 'Most Popular & High-Speed Services'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr ? 'باقات موثوقة ومضمونة تحقق أسرع معدل انتشار وتفاعل' : 'Top performing packages with instant starts'}
            </p>
          </div>

          <button
            onClick={() => setActiveTab('services')}
            className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
          >
            <span>{isAr ? 'تصفح كل الخدمات (50+)' : 'Browse all (50+)'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featuredServices.map((service) => (
            <div
              key={service.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-cyan-500/30 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <PlatformBadge platform={service.platform} size="sm" />
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {service.speed === 'instant' ? (isAr ? 'بدء فوري' : 'Instant') : (isAr ? 'فائق السرعة' : 'Ultra')}
                  </span>
                </div>

                <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-snug line-clamp-2">
                  {isAr ? service.nameAr : service.nameEn}
                </h4>

                <div className="text-[11px] text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>{isAr ? 'السرعة:' : 'Speed:'}</span>
                    <span className="font-medium text-slate-300">{isAr ? service.avgTimeAr : service.avgTimeEn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isAr ? 'الضمان:' : 'Refill:'}</span>
                    <span className="font-medium text-blue-400">{service.refillDays > 0 ? `${service.refillDays}d` : '-'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">{isAr ? 'لكل 1,000' : 'Per 1k'}</span>
                  <span className="font-black text-base text-cyan-600 dark:text-cyan-400 font-mono">
                    ${service.ratePer1000.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={() => setActiveTab('new_order')}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-xs font-bold transition-colors"
                >
                  {isAr ? 'طلب' : 'Order'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Customer Trust & Latest Reviews Ticker */}
      <div className="bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              {isAr ? 'آخر تقييمات العملاء الموثقة' : 'Latest Verified Buyer Reviews'}
            </h3>
          </div>
          <button
            onClick={() => setActiveTab('reviews')}
            className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
          >
            {isAr ? 'عرض كافة الآراء' : 'View all reviews'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {reviews.slice(0, 2).map((rev) => (
            <div
              key={rev.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 text-xs space-y-2 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={rev.avatar}
                    alt={rev.customerName}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                  <span className="font-bold text-slate-900 dark:text-white">{rev.customerName}</span>
                </div>
                <div className="flex text-amber-400">
                  {Array.from({ length: rev.rating }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed italic">
                "{isAr ? rev.commentAr : rev.commentEn}"
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
