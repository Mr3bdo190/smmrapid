import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  DollarSign,
  ShoppingCart,
  Users,
  CheckCircle2,
  Clock,
  Coins,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Server,
  Zap,
  Activity,
  Layers,
  MessageSquare
} from 'lucide-react';

export const AdminOverviewTab: React.FC = () => {
  const {
    language,
    platformUsers,
    orders,
    depositRequests,
    activityLogs,
    services,
    setAdminActiveTab,
    platformSettings,
    adminUpdateSettings
  } = useApp();

  const isAr = language === 'ar';

  // Metrics
  const totalUserBalance = platformUsers.reduce((sum, u) => sum + (u.balance || 0), 0);
  const totalSpentByUsers = platformUsers.reduce((sum, u) => sum + (u.totalSpent || 0), 0);
  const totalOrdersCount = orders.length;
  const completedOrders = orders.filter((o) => o.status === 'completed').length;
  const inProgressOrders = orders.filter((o) => o.status === 'in_progress' || o.status === 'pending').length;
  const completionRate = totalOrdersCount > 0 ? Math.round((completedOrders / totalOrdersCount) * 100) : 100;
  const pendingDeposits = depositRequests.filter((d) => d.status === 'pending');
  const pendingDepositsTotalUSD = pendingDeposits.reduce((sum, d) => sum + (d.amountUSD || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Top Banner / System health */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/80 text-white shadow-xl relative overflow-hidden">
        <div className="absolute end-0 top-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                {isAr ? 'نظام الإدارة المركزي متصل ويعمل بكفاءة 100%' : 'Central Admin Connected • 100% Operational'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black">
              {isAr ? 'مركز قيادة منصة SMM Rapid' : 'SMM Rapid Platform Control Center'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
              {isAr
                ? 'تحكم كامل في جميع العمليات، المستخدمين، الأرصدة، طلبات السوشيال ميديا، محافظ الدفع الإلكترونية، وتوجيه الخوادم بشكل لحظي.'
                : 'Full oversight and real-time control over users, balances, social orders, e-wallet deposits, and platform features.'}
            </p>
          </div>

          {/* Quick status badges */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setAdminActiveTab('deposits')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
                pendingDeposits.length > 0
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/30'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              <Coins className="w-4 h-4" />
              <span>
                {isAr
                  ? `${pendingDeposits.length} طلبات شحن تحتاج مراجعة ($${pendingDepositsTotalUSD.toFixed(2)})`
                  : `${pendingDeposits.length} Pending Deposits ($${pendingDepositsTotalUSD.toFixed(2)})`}
              </span>
            </button>

            <button
              onClick={() => setAdminActiveTab('orders')}
              className="px-4 py-2.5 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-2 transition-all"
            >
              <Activity className="w-4 h-4" />
              <span>
                {isAr ? `${inProgressOrders} طلب قيد التنفيذ` : `${inProgressOrders} Active Orders`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Platform Volume / Spent */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">
              {isAr ? 'إجمالي المبيعات المنفذة' : 'Total Revenue Spent'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              ${(totalSpentByUsers || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{isAr ? '+18.4% نمو أسبوعي' : '+18.4% weekly growth'}</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between">
            <span>{isAr ? 'أرصدة محافظ المستخدمين:' : 'User Balances Held:'}</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">${totalUserBalance.toFixed(2)}</span>
          </div>
        </div>

        {/* Card 2: Orders Count & Rate */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">
              {isAr ? 'إجمالي الطلبات المنفذة' : 'Orders Handled'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              {totalOrdersCount}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-cyan-500 font-semibold mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isAr ? `نسبة النجاح الإجمالية: ${completionRate}%` : `${completionRate}% Success Rate`}</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between">
            <span>{isAr ? 'الطلبات المكتملة:' : 'Completed:'}</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{completedOrders}</span>
          </div>
        </div>

        {/* Card 3: Registered Users */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">
              {isAr ? 'قاعدة المستخدمين' : 'Total Client Accounts'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              {platformUsers.length}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-blue-500 font-semibold mt-1">
              <span>{isAr ? 'نشطين وVIP وموزعين' : 'Active, VIP & Resellers'}</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between">
            <span>{isAr ? 'عملاء VIP وموزعين:' : 'VIP / Resellers:'}</span>
            <span className="font-mono font-bold text-amber-500">
              {platformUsers.filter((u) => u.role === 'vip' || u.role === 'reseller').length}
            </span>
          </div>
        </div>

        {/* Card 4: Services in Catalog */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">
              {isAr ? 'الخدمات المتاحة' : 'Active Catalog Services'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              {services.length}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-indigo-500 font-semibold mt-1">
              <span>{isAr ? 'عبر 9 منصات تواصل اجتماعي' : 'Across 9 Social Platforms'}</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between">
            <span>{isAr ? 'سعر صرف الجنيه:' : 'EGP Exchange Rate:'}</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              1$ = {platformSettings.egpExchangeRate} ج.م
            </span>
          </div>
        </div>

      </div>

      {/* Main Two Column Area: Pending Deposits Queue + Real-time Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Pending Deposit Requests Quick Box */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Coins className="w-4 h-4" />
              </div>
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                {isAr ? 'طلبات الشحن والمحافظ المعلقة' : 'Pending Wallet Deposits'}
              </h3>
            </div>
            <button
              onClick={() => setAdminActiveTab('deposits')}
              className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>{isAr ? 'عرض الكل' : 'View All'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {pendingDeposits.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-bold text-slate-600 dark:text-slate-300">
                {isAr ? 'جميع طلبات الشحن تمت مراجعتها بالكامل!' : 'All deposit requests processed!'}
              </p>
              <p className="text-[11px] mt-0.5">
                {isAr ? 'لا توجد أي تحويلات كاش أو إيداعات معلقة حالياً.' : 'No pending transfers at this moment.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingDeposits.slice(0, 3).map((dep) => (
                <div
                  key={dep.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{dep.userName}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        {dep.walletProvider === 'vodafone' ? 'فودافون كاش'
                          : dep.walletProvider === 'orange' ? 'أورنج كاش'
                          : dep.walletProvider === 'etisalat' ? 'إتصالات كاش'
                          : dep.walletProvider === 'instapay' ? 'إنستاباي'
                          : 'محفظة'}
                      </span>
                    </div>
                    {dep.senderNumber && (
                      <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {isAr ? 'رقم المحفظة المحول منها:' : 'Sender:'}{' '}
                        <strong className="text-cyan-600 dark:text-cyan-400">{dep.senderNumber}</strong>
                      </div>
                    )}
                    <span className="text-[10px] text-slate-400">{dep.timestamp}</span>
                  </div>

                  <div className="flex items-center sm:flex-col items-end gap-1">
                    <span className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                      ${(dep.amountUSD ?? 0).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {(dep.amountEGP ?? Math.round((dep.amountUSD || 0) * (platformSettings?.egpExchangeRate || 50))).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                    </span>
                  </div>
                </div>
              ))}

              <button
                onClick={() => setAdminActiveTab('deposits')}
                className="w-full py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-xs font-extrabold transition-colors"
              >
                {isAr ? `الانتقال لمراجعة وتأكيد ${pendingDeposits.length} طلبات شحن` : `Review ${pendingDeposits.length} Deposits`}
              </button>
            </div>
          )}
        </div>

        {/* Right: Live Activity Logs */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                {isAr ? 'سجل العمليات والتحركات اللحظية' : 'Live Platform Activity Log'}
              </h3>
            </div>
            <button
              onClick={() => setAdminActiveTab('logs')}
              className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>{isAr ? 'السجل الكامل' : 'Full Log'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pe-1">
            {activityLogs.slice(0, 6).map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 text-xs flex items-start gap-2.5"
              >
                <div className="w-2 h-2 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                    {isAr ? log.messageAr : log.messageEn}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span>{log.user || 'النظام'}</span>
                    <span>{log.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { tab: 'users', labelAr: 'إدارة المستخدمين', labelEn: 'User Accounts', icon: Users, color: 'text-blue-500' },
          { tab: 'orders', labelAr: 'إدارة الطلبات والتعويض', labelEn: 'Orders & Refills', icon: ShoppingCart, color: 'text-cyan-500' },
          { tab: 'services', labelAr: 'الخدمات وتعديل الأسعار', labelEn: 'Pricing & Catalog', icon: Layers, color: 'text-indigo-500' },
          { tab: 'settings', labelAr: 'إعدادات الموقع والميزات', labelEn: 'Site Features & Controls', icon: Zap, color: 'text-amber-500' }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.tab}
              onClick={() => setAdminActiveTab(item.tab)}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-50/20 dark:hover:bg-cyan-950/20 transition-all text-left group cursor-pointer shadow-xs"
            >
              <Icon className={`w-5 h-5 ${item.color} mb-2 group-hover:scale-110 transition-transform`} />
              <span className="block font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                {isAr ? item.labelAr : item.labelEn}
              </span>
              <span className="text-[11px] text-slate-400 group-hover:text-cyan-500 transition-colors flex items-center gap-1 mt-1 font-semibold">
                {isAr ? 'فتح اللوحة' : 'Open'}
                <ArrowUpRight className="w-3 h-3" />
              </span>
            </button>
          );
        })}
      </div>

    </div>
  );
};
