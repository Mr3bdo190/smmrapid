import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PlatformBadge, getPlatformMeta } from './PlatformBadge';
import { SocialPlatform } from '../types';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Zap,
  Clock,
  CheckCircle2,
  DollarSign,
  Activity,
  ArrowUpRight
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { orders, userStats, language, setActiveTab } = useApp();
  const isAr = language === 'ar';

  // Calculate platform distribution
  const platformCounts: Record<string, number> = {};
  orders.forEach((o) => {
    platformCounts[o.platform] = (platformCounts[o.platform] || 0) + 1;
  });

  const totalOrders = orders.length;
  const platformEntries = Object.entries(platformCounts).map(([platform, count]) => ({
    platform: platform as SocialPlatform,
    count,
    percentage: totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0
  }));

  // Status metrics
  const completedCount = orders.filter((o) => o.status === 'completed').length;
  const inProgressCount = orders.filter((o) => o.status === 'in_progress').length;
  const completionRate = totalOrders > 0 ? Math.round((completedCount / totalOrders) * 100) : 100;

  // Monthly spending computed from real orders
  const monthlyData = useMemo(() => {
    const monthsAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const now = new Date();
    const result = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      const monthPrefix = `${yr}-${String(mIdx + 1).padStart(2, '0')}`;

      const mOrders = orders.filter((o) => o.createdAt && o.createdAt.startsWith(monthPrefix));
      const spent = mOrders.reduce((sum, o) => sum + (o.status !== 'canceled' ? o.charge : 0), 0);

      result.push({
        monthAr: monthsAr[mIdx] + (i === 0 ? ' (الحالي)' : ''),
        monthEn: monthsEn[mIdx] + (i === 0 ? ' (Current)' : ''),
        spent: Number(spent.toFixed(2)),
        orders: mOrders.length
      });
    }
    return result;
  }, [orders]);

  const maxSpent = Math.max(...monthlyData.map((d) => d.spent), 10);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {isAr ? 'الإحصائيات البيانية المفصلة' : 'Analytics & Performance Metrics'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? 'تحليل شامل لنشاط حسابك، توزيع الطلبات على المنصات، وسرعة إنجاز الخدمات.'
              : 'Comprehensive breakdown of account activity, platform distributions, and delivery metrics.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800">
            <TrendingUp className="w-3.5 h-3.5" />
            {isAr ? 'معدل النجاح: 99.4%' : '99.4% Success Rate'}
          </span>
        </div>
      </div>

      {/* Top 4 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase">
            <span>{isAr ? 'إجمالي الإنفاق' : 'Total Spent'}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            ${userStats.totalSpent.toFixed(2)}
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            {userStats.savedDiscount > 0
              ? (isAr ? `توفير ${userStats.savedDiscount}% بفضل فئة ${userStats.tier}` : `${userStats.savedDiscount}% saved via ${userStats.tier}`)
              : (isAr ? `الفئة الحالية: ${userStats.tier}` : `Current Tier: ${userStats.tier}`)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase">
            <span>{isAr ? 'الطلبات المكتملة' : 'Completed Orders'}</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {completedCount} <span className="text-xs text-slate-400 font-normal">/ {totalOrders}</span>
          </div>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
            {completionRate}% {isAr ? 'نسبة الإنجاز الكامل' : 'fulfillment rate'}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase">
            <span>{isAr ? 'الطلبات النشطة الآن' : 'Active Orders'}</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
            {inProgressCount}
          </div>
          <span className="text-[11px] text-cyan-500 font-semibold">
            {isAr ? 'تحديث وتتبع مباشر' : 'Live real-time updating'}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase">
            <span>{isAr ? 'متوسط سرعة البدء' : 'Avg Start Speed'}</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-500 font-mono">
            1.8 {isAr ? 'دقيقة' : 'min'}
          </div>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
            {isAr ? 'سيرفرات فائقة السرعة' : 'Ultra-high speed nodes'}
          </span>
        </div>

      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Monthly Growth & Spend Volume */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {isAr ? 'حجم الطلبات والنمو الشهري' : 'Monthly Order Volume & Spend'}
              </h3>
              <p className="text-xs text-slate-400">
                {isAr ? 'تطور النشاط وعدد الحملات المنجزة' : 'Growth trajectory and campaign spend'}
              </p>
            </div>
            <BarChart3 className="w-5 h-5 text-cyan-500" />
          </div>

          {/* Bar Chart Visualization */}
          <div className="pt-6 space-y-4">
            <div className="flex items-end justify-between gap-3 h-48 px-2 border-b border-slate-100 dark:border-slate-800">
              {monthlyData.map((d, idx) => {
                const heightPct = Math.round((d.spent / maxSpent) * 100);
                const isCurrent = idx === monthlyData.length - 1;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <span className="text-[10px] font-mono font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      ${d.spent}
                    </span>
                    <div
                      className={`w-full max-w-[42px] rounded-t-xl transition-all duration-500 ${
                        isCurrent
                          ? 'bg-gradient-to-t from-cyan-600 to-blue-500 shadow-lg shadow-cyan-500/30'
                          : 'bg-slate-200 dark:bg-slate-800 group-hover:bg-cyan-500/50'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[60px] text-center">
                      {isAr ? d.monthAr : d.monthEn}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>{isAr ? 'البيانات محدثة تلقائياً' : 'Auto-updated metrics'}</span>
              <span className="font-bold text-cyan-600 dark:text-cyan-400">
                {isAr ? '+34% زيادة في التفاعل هذا الشهر' : '+34% engagement jump this month'}
              </span>
            </div>
          </div>
        </div>

        {/* Chart 2: Social Platform Distribution */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {isAr ? 'توزيع الطلبات حسب منصة التواصل' : 'Orders by Social Platform'}
              </h3>
              <p className="text-xs text-slate-400">
                {isAr ? 'النسبة المئوية لكل منصة في حسابك' : 'Percentage breakdown across platforms'}
              </p>
            </div>
            <PieChart className="w-5 h-5 text-purple-500" />
          </div>

          {/* Platform Segment Bars */}
          <div className="space-y-3.5 pt-2">
            {platformEntries.map(({ platform, count, percentage }) => {
              const meta = getPlatformMeta(platform);
              return (
                <div key={platform} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <PlatformBadge platform={platform} size="sm" />
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                        ({count} {isAr ? 'طلب' : 'orders'})
                      </span>
                    </div>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {percentage}%
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${meta.color} transition-all duration-500`}
                      style={{ width: `${Math.max(percentage, 8)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
            <button
              onClick={() => setActiveTab('new_order')}
              className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              {isAr ? '+ تجربة طلب على منصة جديدة الآن' : '+ Try ordering on a new platform'}
            </button>
          </div>
        </div>

      </div>

      {/* Speed & Execution Accuracy Breakdown */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
          {isAr ? 'كفاءة وسرعة سيرفرات SMM Rapid' : 'Node Execution & Speed Efficiency'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-500">
              <Zap className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">{isAr ? 'بدء فوري خلال 5 دقائق' : 'Instant (< 5 Mins)'}</span>
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
              92.4%
            </div>
            <p className="text-[11px] text-slate-500">
              {isAr ? 'أغلب طلبات المتابعين واللايكات تبدأ فورياً' : 'Majority of followers & likes start instantly'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
            <div className="flex items-center gap-2 text-blue-500">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">{isAr ? 'تنفيذ تدريجي آمن' : 'Safe Gradual'}</span>
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
              6.8%
            </div>
            <p className="text-[11px] text-slate-500">
              {isAr ? 'خاصة بقنوات يوتيوب وساعات المشاهدة لتحقيق الدخل' : 'For monetization watch hours & YouTube'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
            <div className="flex items-center gap-2 text-purple-500">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">{isAr ? 'ضمان ثبات الأرقام' : 'Non-Drop Stability'}</span>
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
              99.8%
            </div>
            <p className="text-[11px] text-slate-500">
              {isAr ? 'حسابات مستقرة مع ميزة إعادة التعبئة المجانية' : 'High retention accounts with free auto-refill'}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
