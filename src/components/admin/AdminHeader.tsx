import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Shield,
  LogOut,
  Bell,
  Activity,
  Users,
  Coins,
  Search,
  ExternalLink,
  Layers,
  Settings,
  AlertTriangle,
  Sun,
  Moon,
  Globe
} from 'lucide-react';

export const AdminHeader: React.FC = () => {
  const {
    language,
    theme,
    toggleTheme,
    toggleLanguage,
    setIsAdminMode,
    depositRequests,
    orders,
    platformUsers,
    platformSettings,
    adminActiveTab,
    setAdminActiveTab
  } = useApp();

  const isAr = language === 'ar';
  const pendingDepositsCount = depositRequests.filter((d) => d.status === 'pending').length;
  const activeOrdersCount = orders.filter((o) => o.status === 'in_progress' || o.status === 'pending').length;

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Left / Start: Logo & Admin badge */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 leading-none">
              <span className="font-black text-sm sm:text-lg tracking-tight bg-gradient-to-r from-amber-400 via-orange-300 to-rose-400 bg-clip-text text-transparent truncate">
                SMM Rapid Admin
              </span>
              <span className="hidden xs:inline-block text-[9px] sm:text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                {isAr ? 'لوحة التحكم' : 'Master Control'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-400 mt-1">
              <span className="hidden sm:flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {isAr ? 'السيرفرات متصلة' : 'Core Systems Live'}
              </span>
              {platformSettings.maintenanceMode && (
                <span className="text-amber-400 flex items-center gap-1 font-bold">
                  <AlertTriangle className="w-3 h-3" />
                  {isAr ? 'وضع الصيانة نشط' : 'Maintenance Active'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center / Stats pills for quick awareness (Desktop) */}
        <div className="hidden lg:flex items-center gap-2">
          {pendingDepositsCount > 0 && (
            <button
              onClick={() => setAdminActiveTab('deposits')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/25 transition-colors cursor-pointer"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>
                {isAr ? `${pendingDepositsCount} طلبات شحن معلقة` : `${pendingDepositsCount} Pending Deposits`}
              </span>
            </button>
          )}

          <button
            onClick={() => setAdminActiveTab('orders')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold hover:bg-cyan-500/20 transition-colors cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>
              {isAr ? `${activeOrdersCount} طلب نشط` : `${activeOrdersCount} Active Orders`}
            </span>
          </button>

          <button
            onClick={() => setAdminActiveTab('users')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-700/60 transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>
              {isAr ? `${platformUsers.length} مستخدم` : `${platformUsers.length} Users`}
            </span>
          </button>
        </div>

        {/* Right / End: Switch back to User Mode, Lang, Theme */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
            title={isAr ? 'Switch to English' : 'التحويل للغة العربية'}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{isAr ? 'EN' : 'عربي'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Toggle Theme"
            title={theme === 'dark' ? (isAr ? 'الوضع النهاري' : 'Light Mode') : (isAr ? 'الوضع الليلي' : 'Dark Mode')}
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-slate-300" />
            )}
          </button>

          {/* Return to Client View */}
          <button
            onClick={() => setIsAdminMode(false)}
            className="h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            title={isAr ? 'العودة لواجهة العميل الرئيسية' : 'Return to Client App'}
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">
              {isAr ? 'واجهة العميل' : 'Client View'}
            </span>
          </button>
        </div>

      </div>
    </header>
  );
};
