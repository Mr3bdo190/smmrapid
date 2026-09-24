import React from 'react';
import { useApp } from '../../context/AppContext';
import { AdminHeader } from './AdminHeader';
import { AdminOverviewTab } from './AdminOverviewTab';
import { AdminUsersTab } from './AdminUsersTab';
import { AdminDepositsTab } from './AdminDepositsTab';
import { AdminOrdersTab } from './AdminOrdersTab';
import { AdminServicesTab } from './AdminServicesTab';
import { AdminSupportTab } from './AdminSupportTab';
import { AdminLogsTab } from './AdminLogsTab';
import { AdminSettingsTab } from './AdminSettingsTab';
import { AdminProvidersTab } from './AdminProvidersTab';
import { AdminGatewaysTab } from './AdminGatewaysTab';
import { AdminCouponsTab } from './AdminCouponsTab';
import { AdminAffiliatesTab } from './AdminAffiliatesTab';
import { AdminFinancialReportsTab } from './AdminFinancialReportsTab';
import { AdminNotificationsTab } from './AdminNotificationsTab';
import {
  LayoutDashboard,
  Users,
  Coins,
  ShoppingCart,
  Layers,
  MessageSquare,
  Activity,
  Settings,
  ExternalLink,
  Shield,
  LifeBuoy,
  Server,
  CreditCard,
  Tag,
  Share2,
  BarChart3,
  Radio,
  ShieldAlert
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const {
    language,
    adminActiveTab,
    setAdminActiveTab,
    depositRequests,
    orders,
    setIsAdminMode,
    isAuthenticated,
    currentUser
  } = useApp();

  const isAr = language === 'ar';

  const isRealAdmin = Boolean(
    isAuthenticated &&
    currentUser?.role === 'admin' &&
    currentUser?.email?.toLowerCase().trim() === 'abdosayed0120@gmail.com'
  );

  if (!isRealAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 p-8 rounded-3xl text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-rose-400">
            {isAr ? 'وصول محظور تماماً' : 'Access Denied'}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isAr
              ? 'لوحة الإدارة مشفرة ومخصصة حصرياً للمدير المعتمد (abdosayed0120@gmail.com). لا يمكن لأي حساب آخر الوصول إليها.'
              : 'The Admin Panel is strictly encrypted and restricted to the authorized administrator (abdosayed0120@gmail.com).'}
          </p>
          <button
            onClick={() => setIsAdminMode(false)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs transition-all shadow-lg shadow-rose-500/20 cursor-pointer"
          >
            {isAr ? 'العودة للمنصة الرئيسية' : 'Return to Main App'}
          </button>
        </div>
      </div>
    );
  }
  const pendingDepositsCount = depositRequests.filter((d) => d.status === 'pending').length;
  const activeOrdersCount = orders.filter((o) => o.status === 'in_progress' || o.status === 'pending').length;

  const navItems = [
    {
      id: 'overview',
      labelAr: 'لوحة المؤشرات',
      labelEn: 'Overview',
      icon: LayoutDashboard
    },
    {
      id: 'users',
      labelAr: 'إدارة المستخدمين',
      labelEn: 'Users & Balances',
      icon: Users
    },
    {
      id: 'deposits',
      labelAr: 'شحن المحافظ والكاش',
      labelEn: 'Wallet Deposits',
      icon: Coins,
      badge: pendingDepositsCount > 0 ? pendingDepositsCount : null,
      badgeColor: 'bg-amber-500 text-slate-950 font-black'
    },
    {
      id: 'orders',
      labelAr: 'إدارة الطلبات والتعويض',
      labelEn: 'Order Lifecycle',
      icon: ShoppingCart,
      badge: activeOrdersCount > 0 ? activeOrdersCount : null,
      badgeColor: 'bg-cyan-500/20 text-cyan-400 font-bold'
    },
    {
      id: 'services',
      labelAr: 'الخدمات والأسعار',
      labelEn: 'Services & Pricing',
      icon: Layers
    },
    {
      id: 'providers',
      labelAr: 'مزودو الخدمات (API)',
      labelEn: 'API Providers',
      icon: Server,
      badge: isAr ? 'جديد' : 'NEW',
      badgeColor: 'bg-emerald-500 text-white font-bold'
    },
    {
      id: 'gateways',
      labelAr: 'بوابات ومحافظ الدفع',
      labelEn: 'Payment Gateways',
      icon: CreditCard
    },
    {
      id: 'coupons',
      labelAr: 'الكوبونات والخصومات',
      labelEn: 'Coupons & Promos',
      icon: Tag
    },
    {
      id: 'affiliates',
      labelAr: 'التسويق بالعمولة (الأفلييت)',
      labelEn: 'Affiliate Program',
      icon: Share2
    },
    {
      id: 'reports',
      labelAr: 'التقارير المالية والأرباح',
      labelEn: 'Financial Reports & Profit',
      icon: BarChart3,
      badge: isAr ? 'أرباح' : 'Profits',
      badgeColor: 'bg-emerald-500 text-white font-bold'
    },
    {
      id: 'notifications',
      labelAr: 'مركز تحكم الإشعارات',
      labelEn: 'Push Notifications Hub',
      icon: Radio,
      badge: isAr ? 'دفع' : 'Push',
      badgeColor: 'bg-blue-500 text-white font-bold'
    },
    {
      id: 'chat_support',
      labelAr: 'المحادثات والدعم',
      labelEn: 'Live Chat & Support',
      icon: MessageSquare
    },
    {
      id: 'logs',
      labelAr: 'سجل العمليات والتحركات',
      labelEn: 'Activity Audit Log',
      icon: Activity
    },
    {
      id: 'settings',
      labelAr: 'التحكم في ميزات الموقع',
      labelEn: 'Platform & Features',
      icon: Settings
    }
  ];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      
      {/* Admin Sticky Header */}
      <AdminHeader />

      {/* Main Admin Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col md:flex-row gap-6">
        
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 shrink-0 space-y-4">
          
          {/* Admin Role Identity Card */}
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-white font-black shadow-md shadow-amber-500/20">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  {isAr ? 'مشرف رئيسي (Super Admin)' : 'Super Admin'}
                </span>
                <div className="font-bold text-xs truncate mt-0.5">Admin Central</div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-2 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = adminActiveTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setAdminActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{isAr ? item.labelAr : item.labelEn}</span>
                  </div>

                  {item.badge && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ms-2 ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick exit to client view */}
          <div className="hidden md:block">
            <button
              onClick={() => setIsAdminMode(false)}
              className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <ExternalLink className="w-4 h-4 text-blue-500" />
              <span>{isAr ? 'العودة لواجهة العميل' : 'Client Mode'}</span>
            </button>
          </div>

        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          {adminActiveTab === 'overview' && <AdminOverviewTab />}
          {adminActiveTab === 'users' && <AdminUsersTab />}
          {adminActiveTab === 'deposits' && <AdminDepositsTab />}
          {adminActiveTab === 'orders' && <AdminOrdersTab />}
          {adminActiveTab === 'services' && <AdminServicesTab />}
          {adminActiveTab === 'providers' && <AdminProvidersTab />}
          {adminActiveTab === 'gateways' && <AdminGatewaysTab />}
          {adminActiveTab === 'coupons' && <AdminCouponsTab />}
          {adminActiveTab === 'affiliates' && <AdminAffiliatesTab />}
          {adminActiveTab === 'reports' && <AdminFinancialReportsTab />}
          {adminActiveTab === 'notifications' && <AdminNotificationsTab />}
          {adminActiveTab === 'chat_support' && <AdminSupportTab />}
          {adminActiveTab === 'logs' && <AdminLogsTab />}
          {adminActiveTab === 'settings' && <AdminSettingsTab />}
        </main>

      </div>
    </div>
  );
};
