import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  Zap,
  Wallet,
  PlusCircle,
  Bell,
  Globe,
  Sun,
  Moon,
  LayoutDashboard,
  ShoppingCart,
  ListOrdered,
  Layers,
  BarChart3,
  Star,
  BookOpen,
  Headphones,
  CheckCheck,
  HelpCircle,
  Shield,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  UserCog,
  Share2,
  LogOut,
  LogIn,
  UserPlus
} from 'lucide-react';
import { VectorAvatar } from './common/VectorAvatar';

export const Header: React.FC = () => {
  const {
    language,
    toggleLanguage,
    theme,
    toggleTheme,
    userStats,
    userProfile,
    unreadNotificationCount,
    notifications,
    markNotificationsAsRead,
    activeTab,
    setActiveTab,
    setIsAddFundsModalOpen,
    setIsChatOpen,
    setTrackingOrderId,
    setIsAdminMode,
    depositRequests,
    impersonatedUser,
    adminStopImpersonating,
    isAuthenticated,
    currentUser,
    logout
  } = useApp();

  const pendingDepositsCount = depositRequests.filter((d) => d.status === 'pending').length;

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLAnchorElement>(null);

  const isAr = language === 'ar';

  const isRealAdmin = Boolean(
    isAuthenticated &&
    currentUser?.role === 'admin' &&
    currentUser?.email?.toLowerCase().trim() === 'abdosayed0120@gmail.com'
  );

  const navLinks = isAuthenticated
    ? [
        { id: 'dashboard', path: '/dashboard', label: isAr ? 'لوحة التحكم' : 'Dashboard', icon: LayoutDashboard },
        { id: 'new_order', path: '/new-order', label: isAr ? 'طلب جديد' : 'New Order', icon: ShoppingCart },
        { id: 'orders', path: '/orders', label: isAr ? 'سجل الطلبات' : 'Orders', icon: ListOrdered },
        { id: 'services', path: '/services', label: isAr ? 'الخدمات والأسعار' : 'Services & Rates', icon: Layers },
        { id: 'blog', path: '/blog', label: isAr ? 'المدونة والشروحات' : 'Blog & Guides', icon: BookOpen },
        { id: 'affiliates', path: '/affiliates', label: isAr ? 'التسويق بالعمولة' : 'Affiliates', icon: Share2 },
        { id: 'analytics', path: '/analytics', label: isAr ? 'الإحصائيات' : 'Analytics', icon: BarChart3 },
        { id: 'reviews', path: '/reviews', label: isAr ? 'آراء العملاء' : 'Reviews', icon: Star },
        { id: 'settings', path: '/settings', label: isAr ? 'إعدادات الحساب' : 'Account Settings', icon: UserCog },
        { id: 'help', path: '/help', label: isAr ? 'مركز المساعدة' : 'Help Center', icon: HelpCircle },
        { id: 'support', path: '/support', label: isAr ? 'الدعم الفني' : 'Support', icon: Headphones },
        ...(isRealAdmin
          ? [
              {
                id: 'admin_panel',
                path: '/admin',
                label: isAr ? 'لوحة الإدارة' : 'Admin Panel',
                icon: Shield,
                isAdmin: true,
                badge: pendingDepositsCount > 0 ? pendingDepositsCount : null
              }
            ]
          : [])
      ]
    : [
        { id: 'home', path: '/', label: isAr ? 'الرئيسية' : 'Home', icon: LayoutDashboard },
        { id: 'services', path: '/services', label: isAr ? 'قائمة الخدمات والأسعار' : 'Services & Pricing', icon: Layers },
        { id: 'blog', path: '/blog', label: isAr ? 'المدونة والشروحات' : 'Blog & Guides', icon: BookOpen },
        { id: 'reviews', path: '/reviews', label: isAr ? 'آراء وتقييمات العملاء' : 'Customer Reviews', icon: Star },
        { id: 'help', path: '/help', label: isAr ? 'الأسئلة الشائعة والمساعدة' : 'FAQs & Help', icon: HelpCircle },
        { id: 'login', path: '/login', label: isAr ? 'تسجيل الدخول' : 'Sign In', icon: LogIn },
        { id: 'register', path: '/register', label: isAr ? 'إنشاء حساب مجاناً' : 'Register Free', icon: UserPlus }
      ];

  // Auto-scroll the active tab into view smoothly
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [activeTab]);

  // Close notifications and mobile menu on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        setMobileMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNotificationsOpen(false);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md transition-colors shadow-xs">
      
      {/* Impersonation Banner (if Admin is browsing as a user) */}
      {impersonatedUser && (
        <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 text-white px-3 sm:px-6 py-2 text-xs font-bold shadow-inner flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span>
              {isAr ? 'أنت تتصفح الموقع حالياً كعميل محاكى:' : 'Active Impersonation Mode:'}{' '}
              <strong className="underline font-mono text-cyan-200">{impersonatedUser.name}</strong> ({impersonatedUser.email})
            </span>
            {impersonatedUser.customDiscountPercent && (
              <span className="px-2 py-0.5 rounded-full bg-purple-500/40 text-[10px] font-mono border border-purple-300/30">
                {isAr ? `خصم خاص: ${impersonatedUser.customDiscountPercent}%` : `Discount: ${impersonatedUser.customDiscountPercent}%`}
              </span>
            )}
          </div>
          <button
            onClick={adminStopImpersonating}
            className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-black text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isAr ? 'إنهاء المحاكاة والعودة للوحة الإدارة' : 'Exit Impersonation'}</span>
          </button>
        </div>
      )}

      {/* Top Bar: Brand, Balance, Actions, Language, Theme */}
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-13 sm:h-16 gap-1 sm:gap-2">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center min-w-0 shrink">
            <Link
              to={isAuthenticated ? "/dashboard" : "/"}
              onClick={() => setActiveTab(isAuthenticated ? 'dashboard' : 'home')}
              className="flex items-center gap-1.5 sm:gap-2.5 text-start group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-xl"
              aria-label="SMM Rapid Home"
            >
              <div className="w-7.5 h-7.5 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform shrink-0">
                <Zap className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1 sm:gap-1.5 leading-none">
                  <span className="font-black text-sm xs:text-base sm:text-lg lg:text-xl tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                    SMM <span className="text-cyan-500">Rapid</span>
                  </span>
                  <span className="hidden xs:inline-flex text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-1 sm:px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
                    PRO
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium hidden md:block mt-1 leading-none">
                  {isAr ? 'السرعة والضمان الأعلى' : 'High Speed & 100% Guaranteed'}
                </span>
              </div>
            </Link>
          </div>

          {/* Right Action Controls: Carefully arranged to prevent any overflow on mobile */}
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
            
            {/* Wallet Balance & Deposit Button (Shown ONLY when logged in) */}
            {isAuthenticated && (
              <div className="flex items-center h-8 sm:h-9 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-0.5 sm:p-1 shadow-xs shrink-0">
                <div
                  onClick={() => setIsAddFundsModalOpen(true)}
                  className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 cursor-pointer hover:opacity-80 transition-opacity"
                  title={isAr ? 'انقر لشحن المحفظة' : 'Click to Deposit'}
                >
                  <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                  <div className="flex flex-col text-start leading-none">
                    <span className="text-[8px] sm:text-[9px] text-slate-400 dark:text-slate-500 font-bold hidden md:inline">
                      {isAr ? 'الرصيد' : 'Balance'}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white whitespace-nowrap leading-tight">
                      ${userStats.balance.toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsAddFundsModalOpen(true)}
                  className="h-6.5 sm:h-7 px-1.5 sm:px-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1 shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer"
                  title={isAr ? 'شحن الرصيد' : 'Add Funds'}
                >
                  <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{isAr ? 'شحن' : 'Deposit'}</span>
                </button>
              </div>
            )}

            {/* Admin Dashboard Entry Button (Strictly restricted to verified Admin) */}
            {isRealAdmin && (
              <button
                onClick={() => setIsAdminMode(true)}
                className="h-8 sm:h-9 px-2 sm:px-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-black text-xs flex items-center justify-center gap-1 sm:gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all shrink-0 cursor-pointer"
                title={isAr ? 'لوحة تحكم الإدارة الكاملة' : 'Full Admin Control'}
              >
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden md:inline">{isAr ? 'لوحة الإدارة' : 'Admin'}</span>
                {pendingDepositsCount > 0 && (
                  <span className="flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-white text-slate-950 text-[9px] font-black animate-pulse">
                    {pendingDepositsCount}
                  </span>
                )}
              </button>
            )}

            {/* Notification Bell (Shown ONLY when logged in) */}
            {isAuthenticated && (
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-colors relative shrink-0 cursor-pointer"
                  aria-label="Notifications"
                  title={isAr ? 'الإشعارات والتنبيهات' : 'Notifications'}
                >
                  <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {unreadNotificationCount > 0 && (
                    <span className="absolute -top-1 -end-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow-xs ring-2 ring-white dark:ring-slate-950">
                      {unreadNotificationCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown (Optimized for Mobile Centering) */}
                {notificationsOpen && (
                  <div
                    className="fixed inset-x-3 sm:inset-x-auto sm:end-0 top-14 sm:top-full mt-2 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden text-start animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="flex items-center justify-between p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                          {isAr ? 'التنبيهات والإشعارات' : 'Notifications'}
                        </span>
                        {unreadNotificationCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400">
                            {unreadNotificationCount} {isAr ? 'جديد' : 'new'}
                          </span>
                        )}
                      </div>
                      {unreadNotificationCount > 0 && (
                        <button
                          onClick={markNotificationsAsRead}
                          className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>{isAr ? 'تحديد الكل كمقروء' : 'Mark all read'}</span>
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">
                          {isAr ? 'لا توجد إشعارات حالياً' : 'No notifications yet'}
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                              !n.read ? 'bg-cyan-50/40 dark:bg-cyan-950/20' : ''
                            }`}
                            onClick={() => {
                              if (n.relatedOrderId) {
                                setTrackingOrderId(n.relatedOrderId);
                              }
                              setNotificationsOpen(false);
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-semibold text-xs text-slate-900 dark:text-white">
                                {isAr ? n.titleAr : n.titleEn}
                              </span>
                              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                {n.timestamp}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                              {isAr ? n.messageAr : n.messageEn}
                            </p>
                            {n.relatedOrderId && (
                              <span className="inline-block mt-1 text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
                                {isAr ? 'اضغط لتتبع الطلب ←' : 'Click to track order →'}
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-center">
                      <button
                        onClick={() => {
                          setActiveTab('orders');
                          setNotificationsOpen(false);
                        }}
                        className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                      >
                        {isAr ? 'عرض كافة الطلبات والعمليات' : 'View all orders & updates'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Language Switcher Button */}
            <button
              onClick={toggleLanguage}
              className="h-8 sm:h-9 px-1.5 sm:px-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-900 text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
              title={isAr ? 'Switch to English' : 'التحويل للغة العربية'}
            >
              <Globe className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
              <span>{isAr ? 'EN' : 'عربي'}</span>
            </button>

            {/* Theme Switcher Button */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              aria-label="Toggle Theme"
              title={theme === 'dark' ? (isAr ? 'الوضع النهاري' : 'Light Mode') : (isAr ? 'الوضع الليلي' : 'Dark Mode')}
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700 dark:text-slate-300" />
              )}
            </button>

            {/* Account Settings / Vector Avatar / Login / Register Buttons */}
            {isAuthenticated ? (
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <button
                  id="btn-header-profile"
                  onClick={() => setActiveTab('settings')}
                  className={`h-8 sm:h-9 px-1.5 sm:px-2 rounded-xl flex items-center gap-1.5 border transition-all shrink-0 cursor-pointer ${
                    activeTab === 'settings'
                      ? 'bg-cyan-500/15 border-cyan-500 text-cyan-600 dark:text-cyan-400 ring-2 ring-cyan-500/30'
                      : 'border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                  }`}
                  title={isAr ? 'إعدادات الحساب والصورة الشخصية' : 'Account Settings & Avatar'}
                >
                  <VectorAvatar config={userProfile.avatarConfig} size="sm" showBadge={false} />
                  <span className="hidden xl:inline text-xs font-bold truncate max-w-[85px]">
                    {userProfile.name}
                  </span>
                </button>

                <button
                  id="btn-header-logout"
                  onClick={logout}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200/80 dark:border-slate-800/80 transition-colors shrink-0 cursor-pointer"
                  title={isAr ? 'تسجيل الخروج' : 'Log Out'}
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <button
                  id="btn-header-login"
                  onClick={() => setActiveTab('login')}
                  className={`h-8 sm:h-9 px-2 sm:px-3 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    activeTab === 'login'
                      ? 'bg-cyan-500 text-white border-cyan-500 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{isAr ? 'دخول' : 'Sign In'}</span>
                </button>

                <button
                  id="btn-header-register"
                  onClick={() => setActiveTab('register')}
                  className="h-8 sm:h-9 px-2 sm:px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-black flex items-center gap-1 shadow-sm shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">{isAr ? 'حساب جديد' : 'Register'}</span>
                </button>
              </div>
            )}

            {/* Live Chat Support Quick Button (Desktop / Tablet) */}
            <button
              onClick={() => setIsChatOpen(true)}
              className="hidden lg:flex h-8 sm:h-9 px-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/60 text-cyan-700 dark:text-cyan-400 font-bold text-xs items-center gap-1.5 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors shrink-0 cursor-pointer"
              title={isAr ? 'محادثة الدعم المباشر' : 'Live Chat Support'}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Headphones className="w-3.5 h-3.5" />
              <span>{isAr ? 'دعم فوري' : 'Live Chat'}</span>
            </button>

            {/* Mobile Quick Menu Toggle (Guarantees 100% access to all actions on small screens) */}
            <div className="relative sm:hidden" ref={mobileMenuRef}>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors shrink-0 cursor-pointer border ${
                  mobileMenuOpen
                    ? 'bg-cyan-500 text-white border-cyan-600'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 border-slate-200/80 dark:border-slate-800/80'
                }`}
                aria-label="Open Mobile Menu"
                title={isAr ? 'القائمة السريعة' : 'Quick Menu'}
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>

              {/* Mobile Quick Menu Sheet */}
              {mobileMenuOpen && (
                <div className="fixed inset-x-3 top-14 mt-2 p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white">
                        <Zap className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-black text-sm text-slate-900 dark:text-white">
                        {isAr ? 'إجراءات سريعة' : 'Quick Actions'}
                      </span>
                    </div>
                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Primary Admin Entry Button (Only for verified Admin) */}
                  {isRealAdmin && (
                    <button
                      onClick={() => {
                        setIsAdminMode(true);
                        setMobileMenuOpen(false);
                      }}
                      className="w-full p-3 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-black text-xs flex items-center justify-between shadow-md shadow-amber-500/20 active:scale-98 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Shield className="w-4 h-4" />
                        <span>{isAr ? 'دخول لوحة الإدارة الكاملة (Admin)' : 'Open Full Admin Panel'}</span>
                      </div>
                      {pendingDepositsCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-white text-slate-950 text-[10px] font-black">
                          {pendingDepositsCount} {isAr ? 'معلق' : 'pending'}
                        </span>
                      )}
                    </button>
                  )}

                  {/* Authentication controls in Mobile Menu */}
                  {isAuthenticated ? (
                    <>
                      {/* Account Settings & Avatar Button in Mobile Menu */}
                      <button
                        onClick={() => {
                          setActiveTab('settings');
                          setMobileMenuOpen(false);
                        }}
                        className="w-full p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs flex items-center justify-between active:scale-98 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <VectorAvatar config={userProfile.avatarConfig} size="sm" showBadge={false} />
                          <div className="text-start leading-tight">
                            <div className="font-black text-xs">{userProfile.name}</div>
                            <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium">
                              {currentUser?.email || (isAr ? 'إعدادات الحساب والأمان' : 'Account & Security')}
                            </div>
                          </div>
                        </div>
                        <UserCog className="w-4 h-4 text-cyan-500" />
                      </button>

                      {/* Logout button */}
                      <button
                        onClick={() => {
                          logout();
                          setMobileMenuOpen(false);
                        }}
                        className="w-full p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{isAr ? 'تسجيل الخروج من الحساب' : 'Sign Out of Account'}</span>
                      </button>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setActiveTab('login');
                          setMobileMenuOpen(false);
                        }}
                        className="p-3 rounded-2xl border border-cyan-500/40 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-black text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>{isAr ? 'تسجيل الدخول' : 'Sign In'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('register');
                          setMobileMenuOpen(false);
                        }}
                        className="p-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-98 transition-all cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>{isAr ? 'حساب جديد' : 'Register'}</span>
                      </button>
                    </div>
                  )}

                  {/* Live Chat Support */}
                  <button
                    onClick={() => {
                      setIsChatOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full p-3 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/50 text-cyan-800 dark:text-cyan-300 font-bold text-xs flex items-center justify-between active:scale-98 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Headphones className="w-4 h-4 text-cyan-500" />
                      <span>{isAr ? 'محادثة الدعم الفني المباشر' : 'Live Chat Support'}</span>
                    </div>
                    <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      {isAr ? 'متصل الآن' : 'Online'}
                    </span>
                  </button>

                  {/* Deposit & Wallet Info (Shown ONLY if authenticated) */}
                  {isAuthenticated && (
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold">{isAr ? 'الرصيد المتاح' : 'Available Balance'}</div>
                        <div className="text-base font-black text-slate-900 dark:text-white">${userStats.balance.toFixed(2)}</div>
                      </div>
                      <button
                        onClick={() => {
                          setIsAddFundsModalOpen(true);
                          setMobileMenuOpen(false);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>{isAr ? 'شحن الآن' : 'Deposit'}</span>
                      </button>
                    </div>
                  )}

                  {/* Language and Theme toggles in menu */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={toggleLanguage}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Globe className="w-3.5 h-3.5 text-cyan-500" />
                      <span>{isAr ? 'English (EN)' : 'العربية (AR)'}</span>
                    </button>

                    <button
                      onClick={toggleTheme}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {theme === 'dark' ? (
                        <>
                          <Sun className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isAr ? 'الوضع النهاري' : 'Light Mode'}</span>
                        </>
                      ) : (
                        <>
                          <Moon className="w-3.5 h-3.5 text-slate-700" />
                          <span>{isAr ? 'الوضع الليلي' : 'Dark Mode'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Row 2: Secondary Navigation Strip (Always visible, smoothly scrollable, includes Admin tab) */}
      <div className="w-full border-t border-slate-200/70 dark:border-slate-800/70 bg-slate-50/60 dark:bg-slate-900/40 backdrop-blur-md relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div
            ref={navContainerRef}
            className="no-scrollbar overflow-x-auto scroll-smooth flex items-center gap-1 sm:gap-1.5 py-1.5 md:justify-center"
          >
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = activeTab === link.id;
              const isAdminTab = link.isAdmin;

              return (
                <Link
                  key={link.id}
                  to={link.path}
                  ref={isActive ? activeTabRef : null}
                  onClick={() => {
                    if (isAdminTab) {
                      setIsAdminMode(true);
                    } else {
                      setActiveTab(link.id);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                    isAdminTab
                      ? 'bg-gradient-to-r from-amber-500/15 to-rose-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25'
                      : isActive
                      ? 'bg-cyan-500 text-white shadow-xs shadow-cyan-500/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isAdminTab ? 'text-amber-500' : isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="flex h-3.5 min-w-[14px] px-1 items-center justify-center rounded-full bg-rose-500 text-white text-[8.5px] font-black">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

    </header>
  );
};



