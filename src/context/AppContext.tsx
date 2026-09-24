import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchWithAuth, setAuthToken, getAuthToken } from '../services/api';
import { APP_ROUTES, TAB_TO_PATH, getTabFromPathname } from '../utils/routes';
import {
  Language,
  Theme,
  ServiceItem,
  OrderItem,
  TransactionItem,
  NotificationItem,
  SupportTicket,
  LiveChatMessage,
  CustomerReview,
  UserStats,
  SocialPlatform,
  PlatformUser,
  DepositRequest,
  PlatformActivityLog,
  PlatformSettings,
  EWalletProvider,
  UserProfile,
  SecuritySettings,
  ActiveSession,
  VectorAvatarConfig,
  ServiceProvider,
  ProviderServiceItem,
  PaymentGatewayConfig,
  DiscountCoupon,
  AffiliateReferral,
  AffiliatePayoutRequest,
  UserActivityLog,
  BroadcastPushNotification,
  RegisterFormData
} from '../types';
import {
  INITIAL_SERVICES,
  INITIAL_ORDERS,
  INITIAL_REVIEWS,
  INITIAL_PLATFORM_USERS,
  INITIAL_DEPOSIT_REQUESTS,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_PLATFORM_SETTINGS,
  INITIAL_USER_PROFILE,
  INITIAL_SECURITY_SETTINGS,
  INITIAL_ACTIVE_SESSIONS
} from '../data/mockData';
import {
  INITIAL_SERVICE_PROVIDERS,
  MOCK_PROVIDER_CATALOG
} from '../data/mockProviders';
import {
  INITIAL_PAYMENT_GATEWAYS,
  INITIAL_COUPONS,
  INITIAL_AFFILIATE_REFERRALS,
  INITIAL_AFFILIATE_PAYOUTS
} from '../data/mockExtraFeatures';
import {
  INITIAL_USER_ACTIVITY_LOGS,
  INITIAL_BROADCAST_NOTIFICATIONS
} from '../data/mockActivityAndPush';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  theme: Theme;
  toggleTheme: () => void;

  userStats: UserStats;
  userProfile: UserProfile;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  securitySettings: SecuritySettings;
  updateSecuritySettings: (updates: Partial<SecuritySettings>) => void;
  activeSessions: ActiveSession[];
  terminateOtherSessions: () => void;
  regenerateApiKey: () => string;
  changePassword: (oldPass: string, newPass: string) => Promise<{ success: boolean; message: string }>;
  services: ServiceItem[];
  orders: OrderItem[];
  transactions: TransactionItem[];
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  reviews: CustomerReview[];
  tickets: SupportTicket[];
  chatMessages: LiveChatMessage[];
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;

  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Admin Mode & Portal Controls
  isAdminMode: boolean;
  setIsAdminMode: (mode: boolean) => void;
  adminActiveTab: string;
  setAdminActiveTab: (tab: string) => void;
  platformUsers: PlatformUser[];
  depositRequests: DepositRequest[];
  activityLogs: PlatformActivityLog[];
  platformSettings: PlatformSettings;

  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;

  // Actions
  placeOrder: (params: {
    serviceId: string;
    link: string;
    quantity: number;
    speedMode: 'instant' | 'gradual' | 'drip';
    dripRuns?: number;
    dripIntervalHours?: number;
    couponCode?: string;
  }) => { success: boolean; message: string; orderId?: string; chargedAmount?: number };

  placeBulkOrders: (orders: { serviceId: string; link: string; quantity: number }[]) => {
    success: boolean;
    createdCount: number;
    message: string;
    totalCharge?: number;
  };

  refillOrder: (orderId: string) => void;
  cancelOrder: (orderId: string) => void;
  rateOrder: (orderId: string, rating: number, review: string) => void;
  depositFunds: (amount: number, method: string) => void;

  markNotificationsAsRead: () => void;
  sendChatMessage: (text: string) => void;
  createSupportTicket: (subject: string, priority: 'low' | 'medium' | 'high' | 'urgent', orderId?: string, message?: string) => void;
  replyToTicket: (ticketId: string, message: string) => void;
  addNewReview: (review: Omit<CustomerReview, 'id' | 'date' | 'verified'>) => void;

  // Selected order for tracking modal
  trackingOrderId: string | null;
  setTrackingOrderId: (id: string | null) => void;
  isAddFundsModalOpen: boolean;
  setIsAddFundsModalOpen: (open: boolean) => void;

  // Deposit Request with Sender Phone number
  submitDepositRequest: (params: {
    method: 'vodafone_cash' | 'orange_cash' | 'etisalat_cash' | 'instapay' | 'crypto' | 'card' | 'paypal';
    walletProvider?: EWalletProvider;
    senderNumber?: string;
    transferReference?: string;
    amountUSD: number;
  }) => void;

  // Impersonation (Login as User)
  impersonatedUser: PlatformUser | null;
  adminImpersonateUser: (userId: string) => void;
  adminStopImpersonating: () => void;

  // Payment Gateways Manager
  paymentGateways: PaymentGatewayConfig[];
  adminUpdateGateway: (id: string, updates: Partial<PaymentGatewayConfig>) => void;
  adminToggleGateway: (id: string, enabled: boolean) => void;

  // Custom User Discounts
  adminSetUserDiscount: (userId: string, discountPercent: number) => void;

  // Discount Coupons & Marketing
  coupons: DiscountCoupon[];
  adminAddCoupon: (coupon: Omit<DiscountCoupon, 'id' | 'usedCount'>) => void;
  adminUpdateCoupon: (id: string, updates: Partial<DiscountCoupon>) => void;
  adminDeleteCoupon: (id: string) => void;
  validateAndApplyCoupon: (code: string, orderAmount: number) => {
    valid: boolean;
    discountAmount: number;
    message: string;
    coupon?: DiscountCoupon;
  };

  // Affiliate Program & Commissions
  affiliateReferrals: AffiliateReferral[];
  affiliatePayoutRequests: AffiliatePayoutRequest[];
  affiliateCommissionRate: number;
  adminUpdateAffiliateSettings: (rate: number) => void;
  adminApprovePayout: (id: string) => void;
  adminRejectPayout: (id: string) => void;
  userRequestPayout: (amount: number, method: string, details: string) => { success: boolean; message: string };

  // Favorite Services
  favoriteServiceIds: string[];
  toggleFavoriteService: (serviceId: string) => void;

  // Official Invoices & Receipts
  invoiceModalOrder: OrderItem | null;
  invoiceModalDeposit: DepositRequest | null;
  openInvoiceForOrder: (order: OrderItem) => void;
  openInvoiceForDeposit: (deposit: DepositRequest) => void;
  closeInvoiceModal: () => void;

  // Admin Actions for full platform control
  adminUpdateUserBalance: (userId: string, newBalance: number, note?: string) => void;
  adminUpdateUserStatus: (userId: string, status: 'active' | 'suspended' | 'banned') => void;
  adminUpdateUserRole: (userId: string, role: 'user' | 'vip' | 'reseller' | 'admin') => void;
  adminAddNewUser: (user: Omit<PlatformUser, 'id' | 'registeredAt' | 'lastLogin' | 'lastIp'>) => void;
  adminDeleteUser: (userId: string) => void;
  adminUpdateOrderStatus: (orderId: string, status: OrderItem['status']) => void;
  adminRefundOrder: (orderId: string) => void;
  adminUpdateOrderDetails: (orderId: string, updates: Partial<OrderItem>) => void;
  adminUpdateService: (serviceId: string, updates: Partial<ServiceItem>) => void;
  adminAddService: (service: Omit<ServiceItem, 'id'>) => void;
  adminDeleteService: (serviceId: string) => void;
  adminApproveDeposit: (requestId: string) => void;
  adminRejectDeposit: (requestId: string, reason: string) => void;
  adminUpdateSettings: (updates: Partial<PlatformSettings>) => void;
  adminBroadcastNotification: (title: string, message: string) => void;
  adminReplyChat: (text: string) => void;
  adminResolveTicket: (ticketId: string) => void;

  // Service Provider API integrations & Service Import
  serviceProviders: ServiceProvider[];
  providerCatalog: ProviderServiceItem[];
  adminAddProvider: (provider: Omit<ServiceProvider, 'id' | 'createdAt' | 'lastSync' | 'servicesCount' | 'balance'>) => void;
  adminUpdateProvider: (id: string, updates: Partial<ServiceProvider>) => void;
  adminDeleteProvider: (id: string) => void;
  adminCheckProviderBalance: (id: string) => Promise<{ success: boolean; balance: number }>;
  adminImportProviderServices: (
    providerId: string,
    servicesToImport: { providerService: ProviderServiceItem; customRate?: number }[],
    markupPercent: number
  ) => void;
  adminSyncProviderRates: (providerId: string) => void;
  
  // User Activity Audit Log
  userActivityLogs: UserActivityLog[];
  adminAddUserActivityLog: (log: Omit<UserActivityLog, 'id' | 'timestamp'>) => void;

  // Broadcast & Push Notification Center
  broadcastNotifications: BroadcastPushNotification[];
  adminSendPushNotification: (params: {
    titleAr: string;
    titleEn: string;
    messageAr: string;
    messageEn: string;
    targetAudience: 'all' | 'vip' | 'reseller' | 'user' | 'specific_user';
    targetUserId?: string;
    targetUserName?: string;
    type: 'announcement' | 'discount' | 'maintenance' | 'update' | 'urgent';
    priority: 'normal' | 'high' | 'urgent';
    actionUrl?: string;
    actionLabelAr?: string;
    actionLabelEn?: string;
  }) => void;
  adminDeleteBroadcastNotification: (id: string) => void;

  // Payment Gateways (Sha7nawy & Heleket)
  createSha7nawyPayment: (params: { number: string; amountUSD: number; method: 'vf_cash' | 'or_cash' | 'et_cash' }) => Promise<{ success: boolean; message?: string; data?: any; error?: string }>;
  confirmSha7nawyPayment: (refCode: string) => Promise<{ success: boolean; status?: string; message?: string; data?: any; error?: string }>;
  createHeleketPayment: (params: { amountUSD: number; currency?: string }) => Promise<{ success: boolean; message?: string; data?: any; error?: string }>;
  checkHeleketPayment: (invoiceId: string) => Promise<{ success: boolean; status?: string; message?: string; data?: any; error?: string }>;
  testGatewayConnection: (gateway: 'sha7nawy' | 'heleket') => Promise<{ success: boolean; configured?: boolean; pingMs?: number; message?: string; error?: string }>;

  // Authentication & Session
  currentUser: PlatformUser | null;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (data: RegisterFormData) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
}

// Auto-purge any legacy mock or insecure cached session once to guarantee pure real security across all client browsers
if (typeof window !== 'undefined' && !localStorage.getItem('smm_real_clean_v3_secure')) {
  localStorage.removeItem('smm_orders');
  localStorage.removeItem('smm_reviews');
  localStorage.removeItem('smm_deposit_requests');
  localStorage.removeItem('smm_activity_logs');
  localStorage.removeItem('smm_user_activity_logs');
  localStorage.removeItem('smm_service_providers');
  localStorage.removeItem('smm_provider_catalog');
  localStorage.removeItem('smm_affiliate_referrals');
  localStorage.removeItem('smm_affiliate_payouts');
  localStorage.removeItem('smm_user_stats');
  localStorage.removeItem('smm_platform_users');
  localStorage.removeItem('smm_current_user');
  localStorage.removeItem('smm_is_admin');
  localStorage.removeItem('smm_is_authenticated');
  localStorage.setItem('smm_real_clean_v3_secure', 'true');
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Localization & Theme
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('smm_lang') as Language) || 'ar';
  });

  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('smm_theme') as Theme) || 'dark';
  });

  // User Stats & Balances (Real-time account balances)
  const [userStats, setUserStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('smm_user_stats');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {
      balance: 0.00,
      totalSpent: 0.00,
      totalOrders: 0,
      activeOrders: 0,
      tier: 'Standard',
      savedDiscount: 0
    };
  });

  // Services Catalog
  const [services, setServices] = useState<ServiceItem[]>(() => {
    const saved = localStorage.getItem('smm_services');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_SERVICES;
  });

  useEffect(() => {
    localStorage.setItem('smm_services', JSON.stringify(services));
  }, [services]);

  // Admin Mode & Portal State (Strictly secured, default false)
  const [isAdminMode, setIsAdminModeState] = useState<boolean>(false);
  const [adminActiveTab, setAdminActiveTab] = useState<string>('overview');

  // Platform Users (Full platform control)
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);

  useEffect(() => {
    if (platformUsers.length > 0) {
      localStorage.setItem('smm_platform_users', JSON.stringify(platformUsers));
    }
  }, [platformUsers]);

  // Current Authenticated User & Session State (Default strictly null & unauthenticated unless valid token exists)
  const [currentUser, setCurrentUser] = useState<PlatformUser | null>(() => {
    const token = getAuthToken();
    if (!token) return null;
    const saved = localStorage.getItem('smm_current_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(getAuthToken());
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('smm_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('smm_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('smm_is_authenticated', isAuthenticated ? 'true' : 'false');
  }, [isAuthenticated]);

  // Deposit Requests (Wallets: Vodafone, Orange, Etisalat, InstaPay, Crypto)
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>(() => {
    const saved = localStorage.getItem('smm_deposit_requests');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_DEPOSIT_REQUESTS;
  });

  useEffect(() => {
    localStorage.setItem('smm_deposit_requests', JSON.stringify(depositRequests));
  }, [depositRequests]);

  // Activity Logs (Real-time platform action tracking)
  const [activityLogs, setActivityLogs] = useState<PlatformActivityLog[]>(() => {
    const saved = localStorage.getItem('smm_activity_logs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_ACTIVITY_LOGS;
  });

  useEffect(() => {
    localStorage.setItem('smm_activity_logs', JSON.stringify(activityLogs));
  }, [activityLogs]);

  // Platform Settings & Feature Toggles
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(() => {
    const saved = localStorage.getItem('smm_platform_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_PLATFORM_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('smm_platform_settings', JSON.stringify(platformSettings));
  }, [platformSettings]);

  // Service Providers (API Integrations)
  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>(() => {
    const saved = localStorage.getItem('smm_service_providers');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_SERVICE_PROVIDERS;
  });

  useEffect(() => {
    localStorage.setItem('smm_service_providers', JSON.stringify(serviceProviders));
  }, [serviceProviders]);

  // Provider Catalog for Import
  const [providerCatalog, setProviderCatalog] = useState<ProviderServiceItem[]>(() => {
    const saved = localStorage.getItem('smm_provider_catalog');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return MOCK_PROVIDER_CATALOG;
  });

  useEffect(() => {
    localStorage.setItem('smm_provider_catalog', JSON.stringify(providerCatalog));
  }, [providerCatalog]);

  // Impersonated User (Admin Login as User)
  const [impersonatedUser, setImpersonatedUser] = useState<PlatformUser | null>(() => {
    const saved = sessionStorage.getItem('smm_impersonated_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return null;
  });

  useEffect(() => {
    if (impersonatedUser) {
      sessionStorage.setItem('smm_impersonated_user', JSON.stringify(impersonatedUser));
    } else {
      sessionStorage.removeItem('smm_impersonated_user');
    }
  }, [impersonatedUser]);

  // Payment Gateways
  const [paymentGateways, setPaymentGateways] = useState<PaymentGatewayConfig[]>(() => {
    const saved = localStorage.getItem('smm_payment_gateways');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_PAYMENT_GATEWAYS;
  });

  useEffect(() => {
    localStorage.setItem('smm_payment_gateways', JSON.stringify(paymentGateways));
  }, [paymentGateways]);

  // Coupons
  const [coupons, setCoupons] = useState<DiscountCoupon[]>(() => {
    const saved = localStorage.getItem('smm_coupons');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_COUPONS;
  });

  useEffect(() => {
    localStorage.setItem('smm_coupons', JSON.stringify(coupons));
  }, [coupons]);

  // Affiliates & Referrals
  const [affiliateReferrals, setAffiliateReferrals] = useState<AffiliateReferral[]>(() => {
    const saved = localStorage.getItem('smm_affiliate_referrals');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_AFFILIATE_REFERRALS;
  });

  useEffect(() => {
    localStorage.setItem('smm_affiliate_referrals', JSON.stringify(affiliateReferrals));
  }, [affiliateReferrals]);

  const [affiliatePayoutRequests, setAffiliatePayoutRequests] = useState<AffiliatePayoutRequest[]>(() => {
    const saved = localStorage.getItem('smm_affiliate_payouts');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_AFFILIATE_PAYOUTS;
  });

  useEffect(() => {
    localStorage.setItem('smm_affiliate_payouts', JSON.stringify(affiliatePayoutRequests));
  }, [affiliatePayoutRequests]);

  const [affiliateCommissionRate, setAffiliateCommissionRate] = useState<number>(() => {
    const saved = localStorage.getItem('smm_affiliate_rate');
    return saved ? Number(saved) : 10;
  });

  useEffect(() => {
    localStorage.setItem('smm_affiliate_rate', affiliateCommissionRate.toString());
  }, [affiliateCommissionRate]);

  // Favorite Services
  const [favoriteServiceIds, setFavoriteServiceIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('smm_favorite_services');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return ['ig-101', 'ig-103', 'tt-201', 'yt-301'];
  });

  useEffect(() => {
    localStorage.setItem('smm_favorite_services', JSON.stringify(favoriteServiceIds));
  }, [favoriteServiceIds]);

  // User Activity Audit Logs
  const [userActivityLogs, setUserActivityLogs] = useState<UserActivityLog[]>(() => {
    const saved = localStorage.getItem('smm_user_activity_logs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_USER_ACTIVITY_LOGS;
  });

  useEffect(() => {
    localStorage.setItem('smm_user_activity_logs', JSON.stringify(userActivityLogs));
  }, [userActivityLogs]);

  // Broadcast & Push Notifications Center
  const [broadcastNotifications, setBroadcastNotifications] = useState<BroadcastPushNotification[]>(() => {
    const saved = localStorage.getItem('smm_broadcast_notifications');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_BROADCAST_NOTIFICATIONS;
  });

  useEffect(() => {
    localStorage.setItem('smm_broadcast_notifications', JSON.stringify(broadcastNotifications));
  }, [broadcastNotifications]);

  // Invoices Modal States
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<OrderItem | null>(null);
  const [invoiceModalDeposit, setInvoiceModalDeposit] = useState<DepositRequest | null>(null);

  // Orders
  const [orders, setOrders] = useState<OrderItem[]>(() => {
    const saved = localStorage.getItem('smm_orders');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_ORDERS;
  });

  // Transactions (Real-time from Database)
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);

  // Notifications (Real-time from Database)
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Reviews
  const [reviews, setReviews] = useState<CustomerReview[]>(() => {
    const saved = localStorage.getItem('smm_reviews');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_REVIEWS;
  });

  // Support Tickets (Real-time from Database)
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  // Live Chat
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([
    {
      id: 'c-1',
      sender: 'agent',
      text: language === 'ar' 
        ? 'مرحباً بك في SMM Rapid! 👋 كيف يمكنني مساعدتك اليوم في تنمية حساباتك أو استفسارات الطلبات؟' 
        : 'Welcome to SMM Rapid! 👋 How can I help boost your social accounts today?',
      timestamp: 'الآن'
    }
  ]);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTabState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const { tab } = getTabFromPathname(window.location.pathname);
      return tab;
    }
    return 'dashboard';
  });

  // Sync route state on browser Back/Forward or direct navigation
  useEffect(() => {
    const { tab, isAdmin } = getTabFromPathname(location.pathname);
    const isRealAdmin = Boolean(
      isAuthenticated &&
      currentUser?.role === 'admin' &&
      currentUser?.email?.toLowerCase().trim() === 'abdosayed0120@gmail.com'
    );
    if (isAdmin && !isRealAdmin) {
      setIsAdminModeState(false);
      setActiveTabState(isAuthenticated ? 'dashboard' : 'home');
      if (location.pathname.startsWith('/admin')) {
        navigate(isAuthenticated ? APP_ROUTES.DASHBOARD : APP_ROUTES.LOGIN);
      }
      return;
    }
    setActiveTabState((prev) => (prev !== tab ? tab : prev));
    setIsAdminModeState((prev) => (prev !== (isAdmin && isRealAdmin) ? (isAdmin && isRealAdmin) : prev));
  }, [location.pathname, isAuthenticated, currentUser]);

  const setActiveTab = (tab: string) => {
    const isRealAdmin = Boolean(
      isAuthenticated &&
      currentUser?.role === 'admin' &&
      currentUser?.email?.toLowerCase().trim() === 'abdosayed0120@gmail.com'
    );
    if (tab === 'admin' || tab === 'admin_panel') {
      if (!isRealAdmin) {
        showToast({
          type: 'error',
          title: language === 'ar' ? 'وصول محظور تماماً' : 'Access Restricted',
          message: language === 'ar' ? 'لوحة الإدارة مخصصة حصرياً للمدير المعتمد فقط' : 'Admin panel is restricted to authorized admin'
        });
        setIsAdminModeState(false);
        return;
      }
      setIsAdminModeState(true);
      setActiveTabState('admin');
      if (location.pathname !== APP_ROUTES.ADMIN) {
        navigate(APP_ROUTES.ADMIN);
      }
    } else {
      setActiveTabState(tab);
      setIsAdminModeState(false);
      const targetPath = TAB_TO_PATH[tab] || '/';
      if (location.pathname !== targetPath) {
        navigate(targetPath);
      }
    }
  };

  const setIsAdminMode = (mode: boolean) => {
    if (mode) {
      const isRealAdmin = Boolean(
        isAuthenticated &&
        currentUser?.role === 'admin' &&
        currentUser?.email?.toLowerCase().trim() === 'abdosayed0120@gmail.com'
      );
      if (!isRealAdmin) {
        showToast({
          type: 'error',
          title: language === 'ar' ? 'وصول محظور تماماً' : 'Access Restricted',
          message: language === 'ar' ? 'لوحة الإدارة مخصصة حصرياً للمدير المعتمد فقط' : 'Admin panel is restricted to authorized admin'
        });
        setIsAdminModeState(false);
        return;
      }
      setIsAdminModeState(true);
      setActiveTabState('admin');
      if (location.pathname !== APP_ROUTES.ADMIN) {
        navigate(APP_ROUTES.ADMIN);
      }
    } else {
      setIsAdminModeState(false);
      if (location.pathname.startsWith('/admin')) {
        setActiveTabState('dashboard');
        navigate(APP_ROUTES.HOME);
      }
    }
  };

  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [isAddFundsModalOpen, setIsAddFundsModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toast Helper
  const showToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = 'toast-' + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // User Profile State
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('smm_user_profile');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_USER_PROFILE;
  });

  useEffect(() => {
    localStorage.setItem('smm_user_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    setUserProfile((prev) => {
      const next = { ...prev, ...updates };
      if (updates.avatarConfig) {
        next.avatarConfig = { ...prev.avatarConfig, ...updates.avatarConfig };
      }
      return next;
    });
    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم الحفظ بنجاح' : 'Profile Updated',
      message: language === 'ar' ? 'تم تحديث بيانات الملف الشخصي والصورة بنجاح' : 'Profile details and vector avatar updated successfully'
    });
  };

  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(() => {
    const saved = localStorage.getItem('smm_security_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_SECURITY_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('smm_security_settings', JSON.stringify(securitySettings));
  }, [securitySettings]);

  const updateSecuritySettings = (updates: Partial<SecuritySettings>) => {
    setSecuritySettings((prev) => {
      const next = { ...prev, ...updates };
      if (updates.notificationPrefs) {
        next.notificationPrefs = { ...prev.notificationPrefs, ...updates.notificationPrefs };
      }
      return next;
    });
    showToast({
      type: 'success',
      title: language === 'ar' ? 'إعدادات الأمان' : 'Security Preferences',
      message: language === 'ar' ? 'تم حفظ وتطبيق تفضيلات الأمان بنجاح' : 'Security preferences applied successfully'
    });
  };

  // Active Sessions
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>(() => {
    const saved = localStorage.getItem('smm_active_sessions');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_ACTIVE_SESSIONS;
  });

  useEffect(() => {
    localStorage.setItem('smm_active_sessions', JSON.stringify(activeSessions));
  }, [activeSessions]);

  const terminateOtherSessions = () => {
    setActiveSessions((prev) => prev.filter((s) => s.isCurrent));
    showToast({
      type: 'success',
      title: language === 'ar' ? 'إنهاء الجلسات' : 'Sessions Terminated',
      message: language === 'ar' ? 'تم تسجيل الخروج بنجاح من كافة الأجهزة والمتصفحات الأخرى' : 'Logged out from all other devices successfully'
    });
  };

  const regenerateApiKey = () => {
    const randomHex = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const newKey = `smm_live_${randomHex}`;
    updateSecuritySettings({ apiKey: newKey });
    return newKey;
  };

  const changePassword = async (oldPass: string, newPass: string): Promise<{ success: boolean; message: string }> => {
    if (!oldPass || !newPass) {
      return {
        success: false,
        message: language === 'ar' ? 'يرجى إدخال كلمة المرور الحالية والجديدة' : 'Please provide current and new passwords'
      };
    }
    if (newPass.length < 8) {
      return {
        success: false,
        message: language === 'ar' ? 'يجب ألا تقل كلمة المرور الجديدة عن 8 خانات' : 'Password must be at least 8 characters'
      };
    }
    try {
      const res = await fetchWithAuth('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          message: data.error || (language === 'ar' ? 'فشل تغيير كلمة المرور' : 'Failed to change password')
        };
      }
      showToast({
        type: 'success',
        title: language === 'ar' ? 'كلمة المرور' : 'Password Changed',
        message: language === 'ar' ? 'تم تحديث كلمة المرور وتأمين حسابك بنجاح' : 'Password updated securely'
      });
      return {
        success: true,
        message: language === 'ar' ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully'
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || (language === 'ar' ? 'حدث خطأ في الاتصال بالخادم' : 'Server connection error')
      };
    }
  };

  // Sync Language and Direction
  useEffect(() => {
    localStorage.setItem('smm_lang', language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'ar' ? 'en' : 'ar'));
  };

  // Sync Theme
  useEffect(() => {
    localStorage.setItem('smm_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.className = 'bg-slate-950 text-slate-100 antialiased selection:bg-cyan-500 selection:text-white';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.className = 'bg-slate-50 text-slate-900 antialiased selection:bg-cyan-500 selection:text-white';
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('smm_user_stats', JSON.stringify(userStats));
  }, [userStats]);

  useEffect(() => {
    localStorage.setItem('smm_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('smm_reviews', JSON.stringify(reviews));
  }, [reviews]);

  // Real-time Order Simulation Engine
  // Periodically advances 'in_progress' orders to give live real-time tracking!
  useEffect(() => {
    const interval = setInterval(() => {
      setOrders((prevOrders) => {
        let changed = false;
        const updated = prevOrders.map((order) => {
          if (order.status === 'in_progress' && order.progressPercentage < 100) {
            changed = true;
            const incrementPct = Math.floor(Math.random() * 8) + 4; // 4-11%
            const newPct = Math.min(100, order.progressPercentage + incrementPct);
            const remainingQty = order.targetCount - order.startCount;
            const currentCount = Math.floor(order.startCount + (remainingQty * (newPct / 100)));
            const isFinished = newPct >= 100;

            const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const newLogs = [...order.logs];
            if (isFinished) {
              newLogs.push({
                timestamp: nowTime,
                messageAr: 'اكتمل إرسال الكمية بالكامل بنجاح 100%!',
                messageEn: 'Quantity fully delivered successfully 100%!'
              });
            } else if (newPct >= 50 && order.progressPercentage < 50) {
              newLogs.push({
                timestamp: nowTime,
                messageAr: 'تم اجتياز نصف الكمية بنجاح واستقرار عالي',
                messageEn: 'Halfway milestone reached with high stability'
              });
            }

            return {
              ...order,
              progressPercentage: newPct,
              currentCount,
              status: isFinished ? ('completed' as const) : order.status,
              logs: newLogs
            };
          }
          return order;
        });

        return changed ? updated : prevOrders;
      });
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  // Update active orders count in stats
  useEffect(() => {
    const active = orders.filter((o) => o.status === 'in_progress' || o.status === 'pending' || o.status === 'processing').length;
    setUserStats((prev) => ({
      ...prev,
      activeOrders: active,
      totalOrders: orders.length
    }));
  }, [orders]);

  // Synchronize state directly from live Supabase database with JWT security
  const syncWithDatabase = async () => {
    try {
      const res = await fetchWithAuth('/api/data');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.currentUser) {
            setCurrentUser(data.currentUser);
            setIsAuthenticated(true);
            setUserProfile((prev) => ({
              ...prev,
              id: data.currentUser.id,
              name: data.currentUser.name,
              email: data.currentUser.email,
              phone: data.currentUser.phone,
              country: data.currentUser.country,
              bio: data.currentUser.bio,
              avatarConfig: data.currentUser.avatarConfig || prev.avatarConfig
            }));
            setUserStats({
              balance: data.currentUser.balance,
              totalSpent: data.currentUser.totalSpent,
              totalOrders: data.currentUser.totalOrders,
              activeOrders: data.orders?.filter((o: any) => o.status === 'in_progress' || o.status === 'pending').length || 0,
              tier: data.currentUser.role === 'vip' || data.currentUser.role === 'admin' ? 'VIP Gold' : data.currentUser.role === 'reseller' ? 'Silver Member' : 'Bronze Member',
              savedDiscount: 0
            });
          } else {
            // Unauthenticated guest or expired token
            const token = getAuthToken();
            if (token) {
              setAuthToken(null);
            }
            setCurrentUser(null);
            setIsAuthenticated(false);
            setIsAdminModeState(false);
            setUserStats({
              balance: 0.00,
              totalSpent: 0.00,
              totalOrders: 0,
              activeOrders: 0,
              tier: 'Bronze Member',
              savedDiscount: 0
            });
          }
          if (Array.isArray(data.users)) setPlatformUsers(data.users);
          if (Array.isArray(data.services) && data.services.length > 0) setServices(data.services);
          if (Array.isArray(data.orders)) setOrders(data.orders);
          if (Array.isArray(data.depositRequests)) setDepositRequests(data.depositRequests);
          if (Array.isArray(data.reviews)) setReviews(data.reviews);
          if (Array.isArray(data.activityLogs)) setActivityLogs(data.activityLogs);
          if (Array.isArray(data.notifications)) setNotifications(data.notifications);
          if (data.platformSettings) setPlatformSettings(data.platformSettings);
          if (Array.isArray(data.coupons)) setCoupons(data.coupons);
        }
      }
    } catch (e) {
      console.warn('DB sync:', e);
    }
  };

  useEffect(() => {
    syncWithDatabase();
  }, []);

  // Actions
  const placeOrder = (params: {
    serviceId: string;
    link: string;
    quantity: number;
    speedMode: 'instant' | 'gradual' | 'drip';
    dripRuns?: number;
    dripIntervalHours?: number;
    couponCode?: string;
  }) => {
    if (!isAuthenticated || !currentUser) {
      showToast({
        type: 'warning',
        title: language === 'ar' ? 'تسجيل الدخول مطلوب' : 'Login Required',
        message: language === 'ar' ? 'يرجى تسجيل الدخول أو إنشاء حساب لطلب الخدمات' : 'Please sign in to place an order'
      });
      navigate('/login');
      return { success: false, message: language === 'ar' ? 'تسجيل الدخول مطلوب' : 'Login required' };
    }

    const service = services.find((s) => s.id === params.serviceId);
    if (!service) {
      return { success: false, message: language === 'ar' ? 'الخدمة غير موجودة' : 'Service not found' };
    }

    if (params.quantity < service.min || params.quantity > service.max) {
      return {
        success: false,
        message: language === 'ar'
          ? `الكمية يجب أن تكون بين ${service.min} و ${service.max}`
          : `Quantity must be between ${service.min} and ${service.max}`
      };
    }

    // Apply user custom discount if any
    const userCustomDiscount = impersonatedUser?.customDiscountPercent || 0;
    let baseRate = service.ratePer1000;
    if (userCustomDiscount > 0) {
      baseRate = baseRate * (1 - userCustomDiscount / 100);
    }

    const totalRuns = params.speedMode === 'drip' && params.dripRuns ? params.dripRuns : 1;
    const totalQty = params.quantity * totalRuns;
    let rawCharge = Number(((baseRate / 1000) * totalQty).toFixed(3));

    // Optional Coupon Discount
    let couponDiscount = 0;
    let appliedCoupon: DiscountCoupon | undefined;
    if (params.couponCode) {
      const coupResult = validateAndApplyCoupon(params.couponCode, rawCharge);
      if (coupResult.valid && coupResult.coupon) {
        couponDiscount = coupResult.discountAmount;
        appliedCoupon = coupResult.coupon;
      }
    }

    const charge = Math.max(0.01, Number((rawCharge - couponDiscount).toFixed(2)));

    if (userStats.balance < charge) {
      showToast({
        type: 'warning',
        title: language === 'ar' ? 'الرصيد غير كافٍ' : 'Insufficient Balance',
        message: language === 'ar'
          ? `تكلفة الطلب $${charge.toFixed(2)} ورصيدك الحالي $${userStats.balance.toFixed(2)}. يرجى شحن الرصيد للمتابعة.`
          : `Order cost is $${charge.toFixed(2)} and your balance is $${userStats.balance.toFixed(2)}. Please add funds.`
      });
      setIsAddFundsModalOpen(true);
      return { success: false, message: language === 'ar' ? 'الرصيد غير كافٍ' : 'Insufficient balance' };
    }

    // Deduct balance locally
    setUserStats((prev) => ({
      ...prev,
      balance: Number((prev.balance - charge).toFixed(2)),
      totalSpent: Number((prev.totalSpent + charge).toFixed(2))
    }));

    // Send real order to Supabase database
    fetchWithAuth('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        userId: currentUser?.id,
        serviceId: service.id,
        link: params.link,
        quantity: totalQty,
        charge,
        speedMode: params.speedMode
      })
    }).then(res => res.json()).then(data => {
      if (data.success) syncWithDatabase();
    }).catch(err => console.error('Order API error:', err));

    // Update coupon usage if used
    if (appliedCoupon) {
      setCoupons((prev) =>
        prev.map((c) => (c.id === appliedCoupon!.id ? { ...c, usedCount: c.usedCount + 1 } : c))
      );
    }

    const orderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
    const nowTime = new Date().toISOString().slice(0, 16).replace('T', ' ');

    const newOrder: OrderItem = {
      id: orderId,
      serviceId: service.id,
      serviceNameAr: service.nameAr,
      serviceNameEn: service.nameEn,
      platform: service.platform,
      link: params.link,
      quantity: totalQty,
      charge,
      startCount: Math.floor(Math.random() * 500) + 120,
      currentCount: Math.floor(Math.random() * 500) + 120,
      targetCount: (Math.floor(Math.random() * 500) + 120) + totalQty,
      status: 'in_progress',
      progressPercentage: 5,
      createdAt: nowTime,
      speedMode: params.speedMode,
      dripRuns: params.dripRuns,
      dripIntervalHours: params.dripIntervalHours,
      rated: false,
      logs: [
        {
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          messageAr: 'تم استلام الطلب وخصم المبلغ وتعيين السيرفر الفوري',
          messageEn: 'Order received, charge deducted, instant node allocated'
        },
        {
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          messageAr: 'فحص الرابط والتحقق من صلاحية الحساب بنجاح',
          messageEn: 'Link validated and target profile verified active'
        }
      ]
    };

    setOrders((prev) => [newOrder, ...prev]);

    // Record Transaction
    setTransactions((prev) => [
      {
        id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
        type: 'order_charge',
        amount: charge,
        method: 'Wallet Balance',
        status: 'completed',
        date: nowTime,
        noteAr: `طلب ${service.nameAr.slice(0, 30)}... #${orderId}`,
        noteEn: `Order ${service.nameEn.slice(0, 30)}... #${orderId}`
      },
      ...prev
    ]);

    // Push notification
    setNotifications((prev) => [
      {
        id: 'notif-' + Date.now(),
        titleAr: 'تم إنشاء الطلب بنجاح',
        titleEn: 'Order Placed Successfully',
        messageAr: `تم بدء تنفيذ طلبك #${orderId} بقيمة $${charge.toFixed(2)}. يمكنك تتبعه مباشرة!`,
        messageEn: `Order #${orderId} of $${charge.toFixed(2)} is now executing. Live tracking is active!`,
        type: 'order',
        timestamp: 'الآن',
        read: false,
        relatedOrderId: orderId
      },
      ...prev
    ]);

    // Log to User Activity
    setUserActivityLogs((prev) => [
      {
        id: 'UAL-' + Date.now(),
        userId: currentUser?.id || userProfile.id || 'usr-admin-real',
        userName: currentUser?.name || userProfile.name || 'عبدالرحمن سيد',
        userEmail: currentUser?.email || userProfile.email || 'abdosayed0120@gmail.com',
        actionType: 'order',
        actionTitleAr: 'إنشاء طلب جديد',
        actionTitleEn: 'New Order Placed',
        detailsAr: `إنشاء طلب #${orderId} لخدمة ${service.nameAr.slice(0, 30)} (الكمية: ${(params.quantity || 0).toLocaleString()} بقيمة $${charge.toFixed(2)})`,
        detailsEn: `Placed order #${orderId} for ${service.nameEn.slice(0, 30)} (Qty: ${(params.quantity || 0).toLocaleString()} for $${charge.toFixed(2)})`,
        ip: '156.204.18.92',
        device: 'Web App',
        browser: 'Chrome 124',
        location: 'Cairo, Egypt',
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
        status: 'success'
      },
      ...prev
    ]);

    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم إنشاء الطلب بنجاح! 🚀' : 'Order Placed Successfully! 🚀',
      message: language === 'ar'
        ? `طلبك #${orderId} قيد التنفيذ الآن. يمكنك مراقبة التقدم لحظة بلحظة.`
        : `Your order #${orderId} is in progress. Live tracking has started.`
    });

    return { success: true, message: 'Order created', orderId, chargedAmount: charge };
  };

  const placeBulkOrders = (items: { serviceId: string; link: string; quantity: number }[]) => {
    if (!items || items.length === 0) {
      return { success: false, createdCount: 0, message: language === 'ar' ? 'لا توجد طلبات مدخلة' : 'No orders provided' };
    }

    let calculatedTotal = 0;
    const userCustomDiscount = impersonatedUser?.customDiscountPercent || 0;
    const validOrders: { service: ServiceItem; link: string; quantity: number; charge: number }[] = [];

    for (const item of items) {
      const s = services.find((srv) => srv.id === item.serviceId);
      if (!s) {
        return {
          success: false,
          createdCount: 0,
          message: language === 'ar' ? `الخدمة برقم ${item.serviceId} غير موجودة في المتجر` : `Service ID ${item.serviceId} not found`
        };
      }
      if (item.quantity < s.min || item.quantity > s.max) {
        return {
          success: false,
          createdCount: 0,
          message: language === 'ar'
            ? `الكمية للخدمة (${s.id}) يجب أن تكون بين ${s.min} و ${s.max}`
            : `Quantity for (${s.id}) must be between ${s.min} and ${s.max}`
        };
      }
      let baseRate = s.ratePer1000;
      if (userCustomDiscount > 0) {
        baseRate = baseRate * (1 - userCustomDiscount / 100);
      }
      const lineCost = Number(((baseRate / 1000) * item.quantity).toFixed(3));
      calculatedTotal += lineCost;
      validOrders.push({ service: s, link: item.link, quantity: item.quantity, charge: lineCost });
    }

    calculatedTotal = Number(calculatedTotal.toFixed(2));
    if (userStats.balance < calculatedTotal) {
      setIsAddFundsModalOpen(true);
      return {
        success: false,
        createdCount: 0,
        message: language === 'ar'
          ? `رصيدك ($${userStats.balance.toFixed(2)}) غير كافٍ. إجمالي تكلفة ${validOrders.length} طلب هو $${calculatedTotal.toFixed(2)}.`
          : `Insufficient balance. Total for ${validOrders.length} orders is $${calculatedTotal.toFixed(2)}.`
      };
    }

    // Deduct balance
    setUserStats((prev) => ({
      ...prev,
      balance: Number((prev.balance - calculatedTotal).toFixed(2)),
      totalSpent: Number((prev.totalSpent + calculatedTotal).toFixed(2)),
      totalOrders: prev.totalOrders + validOrders.length
    }));

    const nowTime = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const newOrderObjects: OrderItem[] = [];
    const newTxns: TransactionItem[] = [];

    validOrders.forEach((vo) => {
      const orderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
      newOrderObjects.push({
        id: orderId,
        serviceId: vo.service.id,
        serviceNameAr: vo.service.nameAr,
        serviceNameEn: vo.service.nameEn,
        platform: vo.service.platform,
        link: vo.link,
        quantity: vo.quantity,
        charge: vo.charge,
        startCount: Math.floor(Math.random() * 500) + 100,
        currentCount: Math.floor(Math.random() * 500) + 100,
        targetCount: (Math.floor(Math.random() * 500) + 100) + vo.quantity,
        status: 'in_progress',
        progressPercentage: 5,
        createdAt: nowTime,
        speedMode: 'instant',
        rated: false,
        logs: [
          {
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            messageAr: 'تم استلام الطلب الجماعي وتعيين السيرفر الفوري للبدء',
            messageEn: 'Bulk order item received, instant node allocated'
          }
        ]
      });

      newTxns.push({
        id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
        type: 'order_charge',
        amount: vo.charge,
        method: 'Wallet Balance',
        status: 'completed',
        date: nowTime,
        noteAr: `طلب متعدد #${orderId} - ${vo.service.nameAr.slice(0, 25)}`,
        noteEn: `Bulk order #${orderId} - ${vo.service.nameEn.slice(0, 25)}`
      });
    });

    setOrders((prev) => [...newOrderObjects, ...prev]);
    setTransactions((prev) => [...newTxns, ...prev]);

    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم تنفيذ الطلبات المتعددة بنجاح! ⚡' : 'Bulk Orders Placed Successfully! ⚡',
      message: language === 'ar'
        ? `تم إنشاء ${validOrders.length} طلب بقيمة إجمالية $${calculatedTotal.toFixed(2)} بنجاح.`
        : `Successfully queued ${validOrders.length} orders totaling $${calculatedTotal.toFixed(2)}.`
    });

    return {
      success: true,
      createdCount: validOrders.length,
      message: 'Orders placed successfully',
      totalCharge: calculatedTotal
    };
  };

  const refillOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return {
            ...o,
            logs: [
              ...o.logs,
              {
                timestamp: nowTime,
                messageAr: 'تم طلب إعادة التعبئة (Refill Request) بنجاح وجاري فحص النقص مجاناً',
                messageEn: 'Refill requested successfully. Free automatic compensation in progress'
              }
            ]
          };
        }
        return o;
      })
    );

    showToast({
      type: 'info',
      title: language === 'ar' ? 'تم إرسال طلب إعادة التعبئة' : 'Refill Requested',
      message: language === 'ar'
        ? 'تم فحص الطلب وسيتم تعويض أي نقص تلقائياً بدون أي تكلفة إضافية.'
        : 'Order verified. Any drop will be refilled automatically at zero cost.'
    });
  };

  const cancelOrder = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    if (order.status === 'completed') {
      showToast({
        type: 'error',
        title: language === 'ar' ? 'تعذر الإلغاء' : 'Cannot Cancel',
        message: language === 'ar' ? 'الطلب مكتمل بالفعل ولا يمكن إلغاؤه.' : 'Order is already completed.'
      });
      return;
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'canceled' as const } : o))
    );

    // Refund balance
    setUserStats((prev) => ({
      ...prev,
      balance: Number((prev.balance + order.charge).toFixed(2))
    }));

    showToast({
      type: 'info',
      title: language === 'ar' ? 'تم إلغاء الطلب واسترجاع الرصيد' : 'Order Canceled & Refunded',
      message: language === 'ar'
        ? `تم استرجاع $${order.charge.toFixed(2)} إلى رصيدك فوراً.`
        : `$${order.charge.toFixed(2)} has been refunded to your wallet balance.`
    });
  };

  const rateOrder = (orderId: string, rating: number, reviewText: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, rated: true, ratingScore: rating, ratingReview: reviewText }
          : o
      )
    );

    // Add to public reviews feed!
    const newRev: CustomerReview = {
      id: 'rev-' + Date.now(),
      customerName: 'أنت (عميل موثق)',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      country: language === 'ar' ? 'الشرق الأوسط 🌍' : 'Verified Buyer 🌍',
      rating,
      serviceNameAr: order.serviceNameAr,
      serviceNameEn: order.serviceNameEn,
      platform: order.platform,
      tagsAr: ['تجربة حقيقية', 'تنفيذ رائع'],
      tagsEn: ['Verified Purchase', 'Great Speed'],
      commentAr: reviewText || 'خدمة سريعة وممتازة، شكراً لفريق SMM Rapid!',
      commentEn: reviewText || 'Fast and dependable service, thanks SMM Rapid team!',
      date: language === 'ar' ? 'الآن' : 'Just now',
      verified: true
    };

    setReviews((prev) => [newRev, ...prev]);

    showToast({
      type: 'success',
      title: language === 'ar' ? 'شكراً لتقييمك! ⭐' : 'Thank You for Reviewing! ⭐',
      message: language === 'ar'
        ? 'تم نشر تقييمك بنجاح ومساعدتنا على تحسين جودة الخدمات.'
        : 'Your review was submitted and helps us maintain prime quality.'
    });
  };

  const depositFunds = (amount: number, method: string) => {
    // Add bonus if > $50
    const bonusPct = amount >= 250 ? 0.15 : amount >= 100 ? 0.10 : amount >= 50 ? 0.05 : 0;
    const bonusAmount = Number((amount * bonusPct).toFixed(2));
    const totalCredited = Number((amount + bonusAmount).toFixed(2));

    setUserStats((prev) => ({
      ...prev,
      balance: Number((prev.balance + totalCredited).toFixed(2))
    }));

    const nowTime = new Date().toISOString().slice(0, 16).replace('T', ' ');

    setTransactions((prev) => [
      {
        id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
        type: 'deposit',
        amount: totalCredited,
        method,
        status: 'completed',
        date: nowTime,
        noteAr: bonusAmount > 0 ? `إيداع آمن $${amount} + بونص إضافي $${bonusAmount}` : `إيداع آمن فوري $${amount}`,
        noteEn: bonusAmount > 0 ? `Deposit $${amount} + bonus $${bonusAmount}` : `Instant deposit $${amount}`
      },
      ...prev
    ]);

    setNotifications((prev) => [
      {
        id: 'notif-' + Date.now(),
        titleAr: 'تم شحن الرصيد بنجاح! 💳',
        titleEn: 'Funds Deposited Successfully! 💳',
        messageAr: `تم إضافة $${totalCredited.toFixed(2)} إلى محفظتك عبر ${method}.`,
        messageEn: `$${totalCredited.toFixed(2)} has been credited via ${method}.`,
        type: 'balance',
        timestamp: 'الآن',
        read: false
      },
      ...prev
    ]);

    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم شحن الرصيد بنجاح! 💰' : 'Deposit Successful! 💰',
      message: language === 'ar'
        ? `تم إضافة $${totalCredited.toFixed(2)} إلى حسابك فوراً.`
        : `$${totalCredited.toFixed(2)} was credited to your account instantly.`
    });

    setIsAddFundsModalOpen(false);
  };

  const markNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const sendChatMessage = (text: string) => {
    if (!text.trim()) return;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: LiveChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text,
      timestamp: nowTime
    };

    setChatMessages((prev) => [...prev, userMsg]);

    // Simulated Smart Support Agent
    setTimeout(() => {
      let reply = '';
      const lower = text.toLowerCase();

      if (lower.includes('طلب') || lower.includes('order') || lower.includes('track') || lower.includes('تتبع')) {
        reply = language === 'ar'
          ? 'بخصوص طلبك، يمكنك تتبع التقدم لحظة بلحظة عبر قسم "سجل الطلبات" أو فتح تفاصيل الطلب بالضغط على رقم المعرف (ID). هل تحتاج لمساعدة في رقم طلب محدد؟'
          : 'Regarding your order, you can view live real-time progress under the "Orders History" tab or click its ID. Do you have a specific Order ID?';
      } else if (lower.includes('رصيد') || lower.includes('balance') || lower.includes('شحن') || lower.includes('دفع') || lower.includes('deposit')) {
        reply = language === 'ar'
          ? 'نوفر بوابات دفع آمنة 100% تشمل البطاقات البنكية، Apple Pay، العملات الرقمية USDT، والمحافظ الإلكترونية مع بونص يصل إلى 15% على الإيداعات الكبيرة!'
          : 'We support 100% secure gateways including Credit Cards, Apple Pay, USDT TRC20, and local e-wallets with up to 15% extra bonus on deposits!';
      } else if (lower.includes('نقص') || lower.includes('drop') || lower.includes('تعويض') || lower.includes('refill')) {
        reply = language === 'ar'
          ? 'جميع خدماتنا المميزة مشمولة بضمان إعادة تعبئة تلقائي مجاني (Refill Button) من 30 إلى 365 يوماً. يمكنك النقر على زر "إعادة التعبئة" بجانب الطلب.'
          : 'All our prime services come with free 30 to 365-day Refill guarantees. Simply hit the "Refill" button next to your order in the orders list.';
      } else {
        reply = language === 'ar'
          ? 'أهلاً بك! تم استلام رسالتك وسيرفراتنا تعمل بكفاءة 100%. كيف يمكنني مساعدتك بشكل محدد في تنمية تواجدك على وسائل التواصل؟'
          : 'Hello! Your message was received and our high-speed nodes are 100% operational. How else can we assist your social growth today?';
      }

      const agentMsg: LiveChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'agent',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatMessages((prev) => [...prev, agentMsg]);
    }, 1100);
  };

  const createSupportTicket = (
    subject: string,
    priority: 'low' | 'medium' | 'high' | 'urgent',
    orderId?: string,
    initialMessage?: string
  ) => {
    const ticketId = `TCK-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowTime = new Date().toISOString().slice(0, 16).replace('T', ' ');

    const newTicket: SupportTicket = {
      id: ticketId,
      subject,
      orderId,
      priority,
      status: 'open',
      createdAt: nowTime,
      lastUpdate: nowTime,
      messages: [
        {
          id: 'tm-1',
          sender: 'user',
          senderName: 'أنت',
          text: initialMessage || subject,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };

    setTickets((prev) => [newTicket, ...prev]);

    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم فتح التذكرة بنجاح' : 'Ticket Created',
      message: language === 'ar' ? `رقم التذكرة ${ticketId}. سيقوم فريق الدعم بالرد خلال دقائق.` : `Ticket #${ticketId} created. Our team will reply shortly.`
    });
  };

  const replyToTicket = (ticketId: string, message: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          return {
            ...t,
            lastUpdate: new Date().toISOString().slice(0, 16).replace('T', ' '),
            messages: [
              ...t.messages,
              {
                id: 'tm-' + Date.now(),
                sender: 'user',
                senderName: 'أنت',
                text: message,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]
          };
        }
        return t;
      })
    );

    // Simulate Agent Reply after 2 seconds
    setTimeout(() => {
      setTickets((prev) =>
        prev.map((t) => {
          if (t.id === ticketId) {
            return {
              ...t,
              status: 'answered',
              lastUpdate: new Date().toISOString().slice(0, 16).replace('T', ' '),
              messages: [
                ...t.messages,
                {
                  id: 'tm-agent-' + Date.now(),
                  sender: 'agent',
                  senderName: 'فريق دعم SMM Rapid',
                  text: language === 'ar'
                    ? 'شكراً لتواصلك. قمنا بفحص السيرفرات المتعلقة بطلبك وكل شيء يسير بالسرعة المعتمدة وبأمان تام. نتمنى لك دوام التوفيق!'
                    : 'Thank you for following up. We checked the nodes and everything is executing at full safe speed. Best wishes!',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              ]
            };
          }
          return t;
        })
      );
    }, 2000);
  };

  const addNewReview = (newRevData: Omit<CustomerReview, 'id' | 'date' | 'verified'>) => {
    const rev: CustomerReview = {
      ...newRevData,
      id: 'rev-' + Date.now(),
      date: language === 'ar' ? 'الآن' : 'Just now',
      verified: true
    };
    setReviews((prev) => [rev, ...prev]);
    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم إضافة رأيك بنجاح' : 'Review Added',
      message: language === 'ar' ? 'شكراً لمشاركتنا تجربتك مع SMM Rapid.' : 'Thank you for sharing your feedback with SMM Rapid.'
    });
  };

  // Submit Deposit Request (With Sender's phone number for E-Wallets)
  const submitDepositRequest = (params: {
    method: 'vodafone_cash' | 'orange_cash' | 'etisalat_cash' | 'instapay' | 'crypto' | 'card' | 'paypal';
    walletProvider?: EWalletProvider;
    senderNumber?: string;
    transferReference?: string;
    amountUSD: number;
  }) => {
    if (!isAuthenticated || !currentUser) {
      showToast({
        type: 'warning',
        title: language === 'ar' ? 'تسجيل الدخول مطلوب' : 'Login Required',
        message: language === 'ar' ? 'يرجى تسجيل الدخول أو إنشاء حساب لشحن الرصيد' : 'Please sign in to deposit funds'
      });
      navigate('/login');
      return;
    }

    const bonusPct = params.amountUSD >= 250 ? 0.15 : params.amountUSD >= 100 ? 0.10 : params.amountUSD >= 50 ? 0.05 : 0;
    const bonusAmount = Number((params.amountUSD * bonusPct).toFixed(2));
    const amountEGP = Math.round(params.amountUSD * platformSettings.egpExchangeRate);

    const newReq: DepositRequest = {
      id: 'DEP-' + Math.floor(1000 + Math.random() * 9000),
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      method: params.method,
      walletProvider: params.walletProvider,
      senderNumber: params.senderNumber || '',
      transferReference: params.transferReference || ('REF-' + Date.now().toString().slice(-6)),
      amountUSD: params.amountUSD,
      amountEGP: amountEGP,
      bonusAmount: bonusAmount,
      status: 'pending',
      timestamp: language === 'ar' ? 'الآن' : 'Just now',
      notes: params.senderNumber ? `تحويل من رقم المحفظة: ${params.senderNumber}` : 'إيداع إلكتروني'
    };

    setDepositRequests((prev) => [newReq, ...prev]);

    // Send real deposit request to Supabase database
    fetchWithAuth('/api/deposits', {
      method: 'POST',
      body: JSON.stringify({
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        method: params.method,
        walletProvider: params.walletProvider,
        senderNumber: params.senderNumber,
        transferReference: params.transferReference,
        amountUSD: params.amountUSD,
        amountEGP: amountEGP,
        bonusAmount: bonusAmount,
        notes: params.senderNumber ? `تحويل من رقم المحفظة: ${params.senderNumber}` : 'إيداع إلكتروني'
      })
    }).then(res => res.json()).then(data => {
      if (data.success) syncWithDatabase();
    }).catch(err => console.error('Deposit API error:', err));

    // Record activity log
    const walletLabel = params.walletProvider === 'vodafone' ? 'فودافون كاش'
      : params.walletProvider === 'orange' ? 'أورنج كاش'
      : params.walletProvider === 'etisalat' ? 'إتصالات كاش'
      : params.walletProvider === 'instapay' ? 'إنستاباي'
      : 'محفظة إلكترونية';

    const newLog: PlatformActivityLog = {
      id: 'ACT-' + Date.now(),
      timestamp: language === 'ar' ? 'الآن' : 'Just now',
      type: 'deposit',
      messageAr: `طلب إيداع جديد بقيمة $${params.amountUSD} (${amountEGP} ج.م) عبر ${walletLabel} من رقم ${params.senderNumber || 'غير محدد'}`,
      messageEn: `New deposit request $${params.amountUSD} (${amountEGP} EGP) via ${walletLabel} from ${params.senderNumber || 'N/A'}`,
      user: currentUser?.name || userProfile.name || 'عبدالرحمن سيد',
      amount: params.amountUSD
    };
    setActivityLogs((prev) => [newLog, ...prev]);

    // Add user notification
    const newNotif: NotificationItem = {
      id: 'notif-' + Date.now(),
      titleAr: 'تم استلام طلب الشحن للمراجعة',
      titleEn: 'Deposit Request Received',
      messageAr: `تم استلام طلب الإيداع بقيمة $${params.amountUSD} (${amountEGP} ج.م) من رقمك ${params.senderNumber || ''}. سيتم إضافة الرصيد فور مطابقة التحويل.`,
      messageEn: `Deposit request of $${params.amountUSD} from phone ${params.senderNumber || ''} received and is under instant review.`,
      type: 'balance',
      timestamp: language === 'ar' ? 'الآن' : 'Just now',
      read: false
    };
    setNotifications((prev) => [newNotif, ...prev]);

    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم تسجيل طلب الإيداع بنجاح' : 'Deposit Request Submitted',
      message: language === 'ar'
        ? `تم استلام التحويل من رقمك (${params.senderNumber || ''}). جاري التدقيق من لوحة الإدارة لإضافة $${(params.amountUSD + bonusAmount).toFixed(2)} فوراً.`
        : `Received from ${params.senderNumber || ''}. Crediting $${(params.amountUSD + bonusAmount).toFixed(2)} shortly.`
    });
  };

  // Admin Actions
  const adminUpdateUserBalance = (userId: string, newBalance: number, note?: string) => {
    setPlatformUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          return { ...u, balance: Number(newBalance.toFixed(2)) };
        }
        return u;
      })
    );

    // If updating current logged in user
    if (userId === currentUser?.id || userId === userProfile.id || userId === 'usr-admin-real') {
      setUserStats((prev) => ({
        ...prev,
        balance: Number(newBalance.toFixed(2))
      }));
    }

    // Call Supabase DB API
    fetchWithAuth(`/api/users/${userId}/balance`, {
      method: 'POST',
      body: JSON.stringify({ newBalance, note })
    }).then(() => syncWithDatabase()).catch(console.error);

    setActivityLogs((prev) => [
      {
        id: 'ACT-' + Date.now(),
        timestamp: language === 'ar' ? 'الآن' : 'Just now',
        type: 'user',
        messageAr: `قام المشرف بتعديل رصيد المستخدم (${userId}) ليصبح $${newBalance.toFixed(2)}${note ? ` - ملاحظة: ${note}` : ''}`,
        messageEn: `Admin updated balance for user (${userId}) to $${newBalance.toFixed(2)}`,
        amount: newBalance
      },
      ...prev
    ]);

    showToast({
      type: 'info',
      title: language === 'ar' ? 'تم تحديث رصيد المستخدم' : 'User Balance Updated',
      message: language === 'ar' ? `الرصيد الجديد: $${newBalance.toFixed(2)}` : `New balance: $${newBalance.toFixed(2)}`
    });
  };

  const adminUpdateUserStatus = (userId: string, status: 'active' | 'suspended' | 'banned') => {
    setPlatformUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status } : u))
    );
    setActivityLogs((prev) => [
      {
        id: 'ACT-' + Date.now(),
        timestamp: language === 'ar' ? 'الآن' : 'Just now',
        type: 'user',
        messageAr: `قام المشرف بتغيير حالة حساب (${userId}) إلى: ${status === 'active' ? 'نشط' : status === 'suspended' ? 'معلق' : 'محظور'}`,
        messageEn: `Admin changed status of (${userId}) to ${status}`
      },
      ...prev
    ]);
  };

  const adminUpdateUserRole = (userId: string, role: 'user' | 'vip' | 'reseller' | 'admin') => {
    setPlatformUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role } : u))
    );
  };

  const adminAddNewUser = (user: Omit<PlatformUser, 'id' | 'registeredAt' | 'lastLogin' | 'lastIp'>) => {
    const newUser: PlatformUser = {
      ...user,
      id: 'USR-' + Math.floor(100 + Math.random() * 900),
      registeredAt: new Date().toISOString().slice(0, 10),
      lastLogin: language === 'ar' ? 'الآن' : 'Just now',
      lastIp: '156.204.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255)
    };
    setPlatformUsers((prev) => [newUser, ...prev]);
    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم إضافة المستخدم بنجاح' : 'User Created',
      message: language === 'ar' ? `تم إضافة ${newUser.name} إلى قاعدة البيانات` : `User ${newUser.name} added`
    });
  };

  const adminDeleteUser = (userId: string) => {
    setPlatformUsers((prev) => prev.filter((u) => u.id !== userId));
    showToast({
      type: 'warning',
      title: language === 'ar' ? 'تم حذف المستخدم' : 'User Deleted',
      message: language === 'ar' ? `تمت إزالة المستخدم ${userId}` : `User ${userId} removed`
    });
  };

  const adminUpdateOrderStatus = (orderId: string, status: OrderItem['status']) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const statusText = status === 'completed' ? 'تم إكمال الطلب' : status === 'in_progress' ? 'قيد التنفيذ' : status === 'canceled' ? 'ملغي' : status;
          return {
            ...o,
            status,
            logs: [
              ...o.logs,
              {
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                messageAr: `قام المشرف بتحديث حالة الطلب إلى: ${statusText}`,
                messageEn: `Admin updated order status to: ${status}`
              }
            ]
          };
        }
        return o;
      })
    );
    showToast({
      type: 'info',
      title: language === 'ar' ? 'تم تحديث حالة الطلب' : 'Order Status Updated',
      message: language === 'ar' ? `الطلب ${orderId} أصبح: ${status}` : `Order #${orderId} is now ${status}`
    });
  };

  const adminRefundOrder = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'canceled' } : o))
    );

    // Refund user balance
    setUserStats((prev) => ({
      ...prev,
      balance: Number((prev.balance + order.charge).toFixed(2))
    }));

    setTransactions((prev) => [
      {
        id: 'TXN-REF-' + Date.now().toString().slice(-4),
        type: 'refund',
        amount: order.charge,
        method: 'استرجاع من المشرف',
        status: 'completed',
        date: new Date().toISOString().slice(0, 16).replace('T', ' '),
        noteAr: `استرجاع قيمة الطلب الملغي #${orderId}`,
        noteEn: `Refund for canceled order #${orderId}`
      },
      ...prev
    ]);

    setActivityLogs((prev) => [
      {
        id: 'ACT-' + Date.now(),
        timestamp: language === 'ar' ? 'الآن' : 'Just now',
        type: 'order',
        messageAr: `قام المشرف بإلغاء الطلب #${orderId} وإرجاع المبلغ $${order.charge.toFixed(2)} إلى محفظة العميل`,
        messageEn: `Admin refunded order #${orderId} ($${order.charge.toFixed(2)}) to client wallet`,
        amount: order.charge
      },
      ...prev
    ]);

    showToast({
      type: 'warning',
      title: language === 'ar' ? 'تم إلغاء الطلب واسترجاع الرصيد' : 'Order Refunded',
      message: language === 'ar' ? `تم إعادة $${order.charge.toFixed(2)} للمحفظة فوراً.` : `Refunded $${order.charge.toFixed(2)} to wallet.`
    });
  };

  const adminUpdateOrderDetails = (orderId: string, updates: Partial<OrderItem>) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...updates } : o))
    );
    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم حفظ التعديلات' : 'Order Updated',
      message: language === 'ar' ? `تم تعديل بيانات الطلب #${orderId}` : `Order #${orderId} details saved`
    });
  };

  const adminUpdateService = (serviceId: string, updates: Partial<ServiceItem>) => {
    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, ...updates } : s))
    );
    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم تحديث الخدمة' : 'Service Updated',
      message: language === 'ar' ? 'تم حفظ الأسعار والإعدادات الجديدة بنجاح.' : 'Service rate and settings saved.'
    });
  };

  const adminAddService = (newServ: Omit<ServiceItem, 'id'>) => {
    const serv: ServiceItem = {
      ...newServ,
      id: 'srv-' + Math.floor(100 + Math.random() * 900)
    };
    setServices((prev) => [serv, ...prev]);
    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم إضافة الخدمة الجديدة' : 'Service Added',
      message: language === 'ar' ? `تم إضافة "${serv.nameAr}" إلى الكتالوج` : `Service added to catalog`
    });
  };

  const adminDeleteService = (serviceId: string) => {
    setServices((prev) => prev.filter((s) => s.id !== serviceId));
    showToast({
      type: 'warning',
      title: language === 'ar' ? 'تم حذف الخدمة' : 'Service Deleted',
      message: language === 'ar' ? `تم حذف الخدمة ${serviceId} من النظام.` : `Service ${serviceId} removed.`
    });
  };

  const adminApproveDeposit = (requestId: string) => {
    const req = depositRequests.find((r) => r.id === requestId);
    if (!req) return;

    setDepositRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'approved' } : r))
    );

    const totalToCredit = Number((req.amountUSD + req.bonusAmount).toFixed(2));

    // Credit user's wallet
    setUserStats((prev) => ({
      ...prev,
      balance: Number((prev.balance + totalToCredit).toFixed(2))
    }));

    // Add transaction record
    setTransactions((prev) => [
      {
        id: 'TXN-' + Math.floor(1000 + Math.random() * 9000),
        type: 'deposit',
        amount: totalToCredit,
        method: req.walletProvider === 'vodafone' ? 'فودافون كاش'
          : req.walletProvider === 'orange' ? 'أورنج كاش'
          : req.walletProvider === 'etisalat' ? 'إتصالات كاش'
          : req.walletProvider === 'instapay' ? 'إنستاباي'
          : 'محفظة إلكترونية',
        status: 'completed',
        date: new Date().toISOString().slice(0, 16).replace('T', ' '),
        noteAr: `موافقة المشرف على إيداع المحفظة (رقم المحول: ${req.senderNumber || 'غير مسجل'})`,
        noteEn: `Admin approved deposit from sender: ${req.senderNumber || 'N/A'}`
      },
      ...prev
    ]);

    // Send approval to Supabase database
    fetchWithAuth(`/api/deposits/${requestId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status: 'approved' })
    }).then(() => syncWithDatabase()).catch(console.error);

    setNotifications((prev) => [
      {
        id: 'notif-' + Date.now(),
        titleAr: 'تم قبول إيداعك وإضافة الرصيد!',
        titleEn: 'Deposit Approved & Added!',
        messageAr: `وافق المشرف على طلب إيداعك بقيمة $${totalToCredit} (${req.amountEGP} ج.م) من رقمك ${req.senderNumber || ''}. الرصيد متاح الآن في محفظتك.`,
        messageEn: `Admin approved your deposit of $${totalToCredit}. Available in your balance now.`,
        type: 'balance',
        timestamp: language === 'ar' ? 'الآن' : 'Just now',
        read: false
      },
      ...prev
    ]);

    setActivityLogs((prev) => [
      {
        id: 'ACT-' + Date.now(),
        timestamp: language === 'ar' ? 'الآن' : 'Just now',
        type: 'deposit',
        messageAr: `وافق المشرف على إيداع ${req.userName} بقيمة $${totalToCredit} عبر ${req.walletProvider || 'كاش'} من رقم ${req.senderNumber || ''}`,
        messageEn: `Admin approved deposit of $${totalToCredit} for ${req.userName}`,
        amount: totalToCredit
      },
      ...prev
    ]);

    showToast({
      type: 'success',
      title: language === 'ar' ? 'تمت الموافقة وإضافة الرصيد' : 'Deposit Approved',
      message: language === 'ar' ? `تم إضافة $${totalToCredit} لحساب ${req.userName} بنجاح.` : `Added $${totalToCredit} to user balance.`
    });
  };

  const adminRejectDeposit = (requestId: string, reason: string) => {
    setDepositRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'rejected', notes: reason } : r))
    );

    // Send rejection to Supabase database
    fetchWithAuth(`/api/deposits/${requestId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status: 'rejected' })
    }).then(() => syncWithDatabase()).catch(console.error);

    setNotifications((prev) => [
      {
        id: 'notif-' + Date.now(),
        titleAr: 'تم رفض طلب الشحن',
        titleEn: 'Deposit Rejected',
        messageAr: `تم رفض طلب الشحن رقم ${requestId}. السبب: ${reason || 'بيانات التحويل غير مطابقة أو لم يتم استلام المبلغ.'}`,
        messageEn: `Deposit #${requestId} was rejected. Reason: ${reason || 'Details do not match.'}`,
        type: 'balance',
        timestamp: language === 'ar' ? 'الآن' : 'Just now',
        read: false
      },
      ...prev
    ]);

    showToast({
      type: 'warning',
      title: language === 'ar' ? 'تم رفض طلب الإيداع' : 'Deposit Rejected',
      message: language === 'ar' ? `تم رفض الطلب ${requestId} مع إشعار العميل بالسبب.` : `Deposit rejected with notification.`
    });
  };

  const adminUpdateSettings = async (updates: Partial<PlatformSettings>) => {
    setPlatformSettings((prev) => ({ ...prev, ...updates }));
    try {
      await fetchWithAuth('/api/settings', {
        method: 'POST',
        body: JSON.stringify(updates)
      });
      syncWithDatabase();
    } catch (err) {
      console.error('Failed to sync settings with server:', err);
    }
    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم حفظ إعدادات المنصة وبوابات الدفع' : 'Settings Saved',
      message: language === 'ar' ? 'تم تحديث ميزات المنصة وخيارات بوابات الدفع بنجاح.' : 'Platform features and payment gateway settings updated.'
    });
  };

  // Payment Gateway Implementations (Sha7nawy & Heleket)
  const createSha7nawyPayment = async (params: { number: string; amountUSD: number; method: 'vf_cash' | 'or_cash' | 'et_cash' }) => {
    try {
      const res = await fetchWithAuth('/api/payment/sha7nawy/create', {
        method: 'POST',
        body: JSON.stringify(params)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await syncWithDatabase();
        return { success: true, message: data.message, data: data.data };
      }
      return { success: false, error: data.error || (language === 'ar' ? 'فشل إنشاء طلب الدفع' : 'Failed to create payment') };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const confirmSha7nawyPayment = async (refCode: string) => {
    try {
      const res = await fetchWithAuth('/api/payment/sha7nawy/confirm', {
        method: 'POST',
        body: JSON.stringify({ ref_code: refCode })
      });
      const data = await res.json();
      if (res.ok && data.success && data.status === 'completed') {
        await syncWithDatabase();
        showToast({
          type: 'success',
          title: language === 'ar' ? 'تم تأكيد السحب وشحن الرصيد! 🎉' : 'Payment Confirmed!',
          message: language === 'ar' ? 'تمت إضافة الرصيد بنجاح إلى حسابك.' : 'Funds have been added to your balance.'
        });
        return { success: true, status: 'completed', message: data.message, data: data.data };
      }
      return {
        success: false,
        status: data.status || 'pending',
        message: data.message || (language === 'ar' ? 'العملية معلقة لموافقة العميل' : 'Payment pending customer authorization'),
        error: data.error
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const createHeleketPayment = async (params: { amountUSD: number; currency?: string }) => {
    try {
      const res = await fetchWithAuth('/api/payment/heleket/create', {
        method: 'POST',
        body: JSON.stringify(params)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await syncWithDatabase();
        return { success: true, message: data.message, data: data.data };
      }
      return { success: false, error: data.error || (language === 'ar' ? 'فشل إنشاء فاتورة التشفير' : 'Failed to create crypto invoice') };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const checkHeleketPayment = async (invoiceId: string) => {
    try {
      const res = await fetchWithAuth(`/api/payment/heleket/check/${invoiceId}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await syncWithDatabase();
        showToast({
          type: 'success',
          title: language === 'ar' ? 'تم تأكيد الإيداع المشفر! 💎' : 'Crypto Deposit Confirmed!',
          message: language === 'ar' ? 'تمت إضافة الرصيد إلى محفظتك بنجاح.' : 'Funds have been added to your wallet.'
        });
        return { success: true, status: 'completed', message: data.message, data: data.data };
      }
      return { success: false, error: data.error || (language === 'ar' ? 'التحويل قيد انتظار تأكيدات البلوكتشين' : 'Awaiting blockchain confirmations') };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const testGatewayConnection = async (gateway: 'sha7nawy' | 'heleket') => {
    try {
      const res = await fetchWithAuth('/api/gateways/test', {
        method: 'POST',
        body: JSON.stringify({ gateway })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const adminBroadcastNotification = (title: string, message: string) => {
    const notif: NotificationItem = {
      id: 'notif-bc-' + Date.now(),
      titleAr: title,
      titleEn: title,
      messageAr: message,
      messageEn: message,
      type: 'system',
      timestamp: language === 'ar' ? 'الآن' : 'Just now',
      read: false
    };
    setNotifications((prev) => [notif, ...prev]);
    showToast({
      type: 'info',
      title: language === 'ar' ? 'تم إرسال الإشعار العام' : 'Broadcast Sent',
      message: language === 'ar' ? 'وصل الإشعار لجميع مستخدمي المنصة الآن.' : 'Notification sent to all users.'
    });
  };

  const adminReplyChat = (text: string) => {
    const msg: LiveChatMessage = {
      id: 'chat-admin-' + Date.now(),
      sender: 'agent',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages((prev) => [...prev, msg]);
  };

  const adminResolveTicket = (ticketId: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: 'closed' } : t))
    );
    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم إغلاق وحل التذكرة' : 'Ticket Resolved',
      message: language === 'ar' ? `تم حل التذكرة #${ticketId} بنجاح.` : `Ticket #${ticketId} closed.`
    });
  };

  // Provider Admin Actions
  const adminAddProvider = (providerData: Omit<ServiceProvider, 'id' | 'createdAt' | 'lastSync' | 'servicesCount' | 'balance'>) => {
    const newId = 'prov-' + Date.now().toString().slice(-6);
    const newProv: ServiceProvider = {
      ...providerData,
      id: newId,
      balance: 150.00,
      currency: 'USD',
      servicesCount: 0,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      lastSync: language === 'ar' ? 'الآن' : 'Just now'
    };

    setServiceProviders((prev) => [newProv, ...prev]);

    const log: PlatformActivityLog = {
      id: 'log-' + Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'admin',
      messageAr: `تمت إضافة مزود خدمات API جديد: ${newProv.name}`,
      messageEn: `Added new API service provider: ${newProv.name}`,
      badge: 'API Provider'
    };
    setActivityLogs((prev) => [log, ...prev]);

    showToast({
      type: 'success',
      title: language === 'ar' ? 'تمت إضافة المزود بنجاح' : 'Provider Added',
      message: language === 'ar' ? `تم ربط المزود ${newProv.name} وتجهيز نقطة الاتصال.` : `Provider ${newProv.name} linked.`
    });
  };

  const adminUpdateProvider = (id: string, updates: Partial<ServiceProvider>) => {
    setServiceProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم تحديث المزود' : 'Provider Updated',
      message: language === 'ar' ? 'تم حفظ التعديلات وإعدادات المزود بنجاح.' : 'Provider settings updated.'
    });
  };

  const adminDeleteProvider = (id: string) => {
    const prov = serviceProviders.find((p) => p.id === id);
    setServiceProviders((prev) => prev.filter((p) => p.id !== id));
    showToast({
      type: 'info',
      title: language === 'ar' ? 'تم حذف المزود' : 'Provider Removed',
      message: language === 'ar' ? `تمت إزالة المزود ${prov?.name || id} بنجاح.` : `Provider removed.`
    });
  };

  const adminCheckProviderBalance = async (id: string): Promise<{ success: boolean; balance: number }> => {
    const prov = serviceProviders.find((p) => p.id === id);
    if (!prov) return { success: false, balance: 0 };

    const simulatedBalance = +(prov.balance + (Math.random() * 2 - 1)).toFixed(2);
    setServiceProviders((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              balance: simulatedBalance,
              status: 'active',
              lastSync: language === 'ar' ? 'منذ ثوانٍ' : 'Seconds ago'
            }
          : p
      )
    );

    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم فحص الرصيد بنجاح' : 'Balance Checked',
      message: language === 'ar'
        ? `رصيد المزود ${prov.name} الحالي: $${simulatedBalance}`
        : `${prov.name} balance: $${simulatedBalance}`
    });

    return { success: true, balance: simulatedBalance };
  };

  const adminImportProviderServices = (
    providerId: string,
    servicesToImport: { providerService: ProviderServiceItem; customRate?: number }[],
    markupPercent: number
  ) => {
    const prov = serviceProviders.find((p) => p.id === providerId);
    if (!prov) return;

    const newServices: ServiceItem[] = [];
    const importedIds = new Set<string>();

    servicesToImport.forEach(({ providerService, customRate }) => {
      importedIds.add(providerService.id);
      const sellingRate = customRate ?? +(providerService.originalRate * (1 + markupPercent / 100)).toFixed(3);
      
      const newService: ServiceItem = {
        id: `srv-${prov.id.replace('prov-', '')}-${providerService.providerServiceId}-${Date.now().toString().slice(-4)}`,
        platform: providerService.platform,
        categoryAr: providerService.category + ' (مستورد)',
        categoryEn: providerService.category + ' (Imported)',
        nameAr: `[${prov.name.split(' ')[0]}] ${providerService.name}`,
        nameEn: `[${prov.name.split(' ')[0]}] ${providerService.name}`,
        ratePer1000: sellingRate,
        providerCost: providerService.originalRate,
        providerId: providerId,
        providerServiceId: providerService.providerServiceId,
        min: providerService.min,
        max: providerService.max,
        avgTimeAr: 'فوري 5-15 دقيقة',
        avgTimeEn: 'Instant 5-15 mins',
        refillDays: providerService.refillDays || (providerService.refill ? 30 : 0),
        speed: providerService.speed,
        badge: 'instant',
        descriptionAr: `خدمة مستوردة تلقائياً من ${prov.name}، مربوطة بنظام الـ API لتنفيذ الطلبات لحظياً وبأعلى دقة.`,
        descriptionEn: `Service imported from ${prov.name} connected with automated instant API fulfillment.`
      };
      newServices.push(newService);
    });

    setServices((prev) => [...newServices, ...prev]);

    setServiceProviders((prev) =>
      prev.map((p) =>
        p.id === providerId
          ? {
              ...p,
              servicesCount: p.servicesCount + newServices.length,
              lastSync: language === 'ar' ? 'الآن' : 'Just now'
            }
          : p
      )
    );

    setProviderCatalog((prev) =>
      prev.map((item) => (importedIds.has(item.id) ? { ...item, imported: true } : item))
    );

    const log: PlatformActivityLog = {
      id: 'log-' + Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'service',
      messageAr: `تم استيراد ${newServices.length} خدمة بنجاح من المزود: ${prov.name} بهامش ربح +${markupPercent}%`,
      messageEn: `Imported ${newServices.length} services from provider: ${prov.name} with markup +${markupPercent}%`,
      badge: 'Import'
    };
    setActivityLogs((prev) => [log, ...prev]);

    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم استيراد الخدمات بنجاح' : 'Services Imported',
      message: language === 'ar'
        ? `تمت إضافة ${newServices.length} خدمة بنجاح إلى قائمة الخدمات المعروضة للمستخدمين.`
        : `Successfully imported ${newServices.length} services.`
    });
  };

  const adminSyncProviderRates = (providerId: string) => {
    const prov = serviceProviders.find((p) => p.id === providerId);
    if (!prov) return;

    setServiceProviders((prev) =>
      prev.map((p) =>
        p.id === providerId
          ? { ...p, lastSync: language === 'ar' ? 'منذ لحظات' : 'Just now' }
          : p
      )
    );

    showToast({
      type: 'info',
      title: language === 'ar' ? 'تمت مزامنة الأسعار' : 'Rates Synced',
      message: language === 'ar'
        ? `تم فحص وتحديث أسعار وحالات خدمات ${prov.name}.`
        : `Checked and synced rates for ${prov.name}.`
    });
  };

  // Impersonation (Admin Login as User)
  const adminImpersonateUser = (userId: string) => {
    const user = platformUsers.find((u) => u.id === userId);
    if (!user) return;
    setImpersonatedUser(user);
    setUserStats({
      balance: user.balance,
      totalSpent: user.totalSpent,
      totalOrders: user.totalOrders,
      activeOrders: Math.min(user.totalOrders, 2),
      tier: user.role === 'vip' || user.role === 'reseller' ? 'VIP Gold' : 'Silver Member',
      savedDiscount: user.customDiscountPercent || (user.role === 'vip' ? 15 : 5)
    });
    setUserProfile((prev) => ({
      ...prev,
      name: user.name,
      email: user.email,
      phone: user.phone,
      country: user.country
    }));
    setIsAdminMode(false);
    setActiveTab('dashboard');
    showToast({
      type: 'info',
      title: language === 'ar' ? 'وضع تسجيل الدخول كالمستخدم 👤' : 'User Impersonation Active 👤',
      message: language === 'ar'
        ? `أنت تتصفح المنصة الآن بحساب: ${user.name} (${user.email}). يمكنك العودة للأدمن في أي وقت.`
        : `Now browsing as ${user.name} (${user.email}).`
    });
  };

  const adminStopImpersonating = () => {
    setImpersonatedUser(null);
    setUserStats({
      balance: 248.50,
      totalSpent: 874.20,
      totalOrders: 28,
      activeOrders: 2,
      tier: 'VIP Gold',
      savedDiscount: 15
    });
    setUserProfile(INITIAL_USER_PROFILE);
    setIsAdminMode(true);
    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم إنهاء وضع المحاكاة' : 'Impersonation Ended',
      message: language === 'ar' ? 'تمت العودة بنجاح إلى لوحة تحكم الإدارة.' : 'Returned to admin suite.'
    });
  };

  // Payment Gateways Manager
  const adminUpdateGateway = (id: string, updates: Partial<PaymentGatewayConfig>) => {
    setPaymentGateways((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
    );
    showToast({
      type: 'success',
      title: language === 'ar' ? 'بوابة الدفع' : 'Payment Gateway',
      message: language === 'ar' ? 'تم حفظ التعديلات على بوابة الدفع بنجاح.' : 'Gateway configuration saved.'
    });
  };

  const adminToggleGateway = (id: string, enabled: boolean) => {
    setPaymentGateways((prev) =>
      prev.map((g) => (g.id === id ? { ...g, enabled } : g))
    );
    showToast({
      type: enabled ? 'success' : 'warning',
      title: language === 'ar' ? 'حالة البوابة' : 'Gateway Status',
      message: language === 'ar'
        ? `تم ${enabled ? 'تفعيل' : 'تعطيل'} البوابة بنجاح.`
        : `Payment gateway ${enabled ? 'enabled' : 'disabled'}.`
    });
  };

  // Custom User Discounts
  const adminSetUserDiscount = (userId: string, discountPercent: number) => {
    setPlatformUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, customDiscountPercent: discountPercent } : u))
    );
    if (impersonatedUser && impersonatedUser.id === userId) {
      setImpersonatedUser((prev) => (prev ? { ...prev, customDiscountPercent: discountPercent } : null));
    }
    showToast({
      type: 'success',
      title: language === 'ar' ? 'تعديل نسبة الخصم للعميل' : 'User Discount Updated',
      message: language === 'ar'
        ? `تم تحديد نسبة خصم ${discountPercent}% للعميل بنجاح.`
        : `Assigned ${discountPercent}% custom discount to user.`
    });
  };

  // Coupons & Marketing
  const adminAddCoupon = (couponData: Omit<DiscountCoupon, 'id' | 'usedCount'>) => {
    const newCoupon: DiscountCoupon = {
      ...couponData,
      id: 'coup-' + Date.now(),
      usedCount: 0
    };
    setCoupons((prev) => [newCoupon, ...prev]);
    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم إنشاء الكوبون بنجاح' : 'Coupon Created',
      message: language === 'ar' ? `كوبون الخصم (${newCoupon.code}) أصبح متاحاً الآن للاستخدام.` : `Coupon ${newCoupon.code} is now live.`
    });
  };

  const adminUpdateCoupon = (id: string, updates: Partial<DiscountCoupon>) => {
    setCoupons((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم تحديث الكوبون' : 'Coupon Updated',
      message: language === 'ar' ? 'تم حفظ التعديلات بنجاح.' : 'Coupon updated successfully.'
    });
  };

  const adminDeleteCoupon = (id: string) => {
    setCoupons((prev) => prev.filter((c) => c.id !== id));
    showToast({
      type: 'info',
      title: language === 'ar' ? 'حذف الكوبون' : 'Coupon Deleted',
      message: language === 'ar' ? 'تم حذف الكوبون من النظام.' : 'Coupon removed.'
    });
  };

  const validateAndApplyCoupon = (code: string, orderAmount: number) => {
    const cleanCode = code.trim().toUpperCase();
    const found = coupons.find((c) => c.code.toUpperCase() === cleanCode && c.isActive);
    if (!found) {
      return {
        valid: false,
        discountAmount: 0,
        message: language === 'ar' ? 'كود الكوبون غير صحيح أو غير مفعل' : 'Invalid or inactive coupon code'
      };
    }
    if (found.expiresAt && new Date(found.expiresAt) < new Date()) {
      return {
        valid: false,
        discountAmount: 0,
        message: language === 'ar' ? 'عفواً، انتهت صلاحية هذا الكوبون' : 'This coupon has expired'
      };
    }
    if (found.usedCount >= found.usageLimit) {
      return {
        valid: false,
        discountAmount: 0,
        message: language === 'ar' ? 'تم استنفاد الحد الأقصى لاستخدام هذا الكوبون' : 'Coupon usage limit reached'
      };
    }
    if (orderAmount < found.minOrderAmount) {
      return {
        valid: false,
        discountAmount: 0,
        message: language === 'ar'
          ? `الحد الأدنى لتطبيق هذا الكوبون هو طلب بقيمة $${found.minOrderAmount}`
          : `Minimum order amount for this coupon is $${found.minOrderAmount}`
      };
    }

    let discount = Number(((orderAmount * found.discountPercent) / 100).toFixed(2));
    if (found.maxDiscountUSD && discount > found.maxDiscountUSD) {
      discount = found.maxDiscountUSD;
    }

    return {
      valid: true,
      discountAmount: discount,
      message: language === 'ar'
        ? `تم تفعيل خصم ${found.discountPercent}% بنجاح (-$${discount.toFixed(2)})`
        : `Coupon active: ${found.discountPercent}% off (-$${discount.toFixed(2)})`,
      coupon: found
    };
  };

  // Affiliates Program
  const adminUpdateAffiliateSettings = (rate: number) => {
    setAffiliateCommissionRate(rate);
    showToast({
      type: 'success',
      title: language === 'ar' ? 'عمولة نظام الشركاء' : 'Affiliate Commission Rate',
      message: language === 'ar' ? `تم تحديد عمولة الإحالة الرسمية بنسبة ${rate}%` : `Affiliate commission rate updated to ${rate}%`
    });
  };

  const adminApprovePayout = (id: string) => {
    setAffiliatePayoutRequests((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'approved' } : p))
    );
    showToast({
      type: 'success',
      title: language === 'ar' ? 'تمت الموافقة على السحب' : 'Payout Approved',
      message: language === 'ar' ? 'تم تحويل وسداد أرباح الشريك بنجاح.' : 'Affiliate payout processed successfully.'
    });
  };

  const adminRejectPayout = (id: string) => {
    setAffiliatePayoutRequests((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'rejected' } : p))
    );
    showToast({
      type: 'warning',
      title: language === 'ar' ? 'تم رفض طلب السحب' : 'Payout Rejected',
      message: language === 'ar' ? 'تم رفض طلب السحب وإخطار المستخدم.' : 'Payout request rejected.'
    });
  };

  const userRequestPayout = (amount: number, method: string, details: string) => {
    if (amount < 20) {
      return {
        success: false,
        message: language === 'ar' ? 'الحد الأدنى لطلب سحب الأرباح هو $20' : 'Minimum payout threshold is $20'
      };
    }
    const newReq: AffiliatePayoutRequest = {
      id: 'pay-' + Date.now(),
      userId: impersonatedUser?.id || currentUser?.id || userProfile.id || 'usr-admin-real',
      userName: impersonatedUser?.name || currentUser?.name || userProfile.name,
      amount,
      method,
      payoutDetails: details,
      status: 'pending',
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
    };
    setAffiliatePayoutRequests((prev) => [newReq, ...prev]);
    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم تسجيل طلب السحب' : 'Payout Requested',
      message: language === 'ar'
        ? `تم إرسال طلب سحب $${amount.toFixed(2)} بنجاح للإدارة للتحويل.`
        : `Payout request of $${amount.toFixed(2)} submitted successfully.`
    });
    return { success: true, message: 'Payout requested' };
  };

  // Favorites
  const toggleFavoriteService = (serviceId: string) => {
    setFavoriteServiceIds((prev) => {
      const exists = prev.includes(serviceId);
      const next = exists ? prev.filter((id) => id !== serviceId) : [...prev, serviceId];
      showToast({
        type: exists ? 'info' : 'success',
        title: language === 'ar' ? 'الخدمات المفضلة ⭐' : 'Favorite Services ⭐',
        message: exists
          ? (language === 'ar' ? 'تمت إزالة الخدمة من المفضلة' : 'Removed from favorite services')
          : (language === 'ar' ? 'تمت إضافة الخدمة إلى المفضلة للوصول السريع' : 'Added to favorites for quick access')
      });
      return next;
    });
  };

  // Invoices & Receipts
  const openInvoiceForOrder = (order: OrderItem) => {
    setInvoiceModalOrder(order);
    setInvoiceModalDeposit(null);
  };

  const openInvoiceForDeposit = (deposit: DepositRequest) => {
    setInvoiceModalDeposit(deposit);
    setInvoiceModalOrder(null);
  };

  const closeInvoiceModal = () => {
    setInvoiceModalOrder(null);
    setInvoiceModalDeposit(null);
  };

  // User Activity Audit Log Helper
  const adminAddUserActivityLog = (log: Omit<UserActivityLog, 'id' | 'timestamp'>) => {
    const newLog: UserActivityLog = {
      ...log,
      id: 'UAL-' + Date.now(),
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' ')
    };
    setUserActivityLogs((prev) => [newLog, ...prev]);
  };

  // Push Notifications Control Center Dispatcher
  const adminSendPushNotification = (params: {
    titleAr: string;
    titleEn: string;
    messageAr: string;
    messageEn: string;
    targetAudience: 'all' | 'vip' | 'reseller' | 'user' | 'specific_user';
    targetUserId?: string;
    targetUserName?: string;
    type: 'announcement' | 'discount' | 'maintenance' | 'update' | 'urgent';
    priority: 'normal' | 'high' | 'urgent';
    actionUrl?: string;
    actionLabelAr?: string;
    actionLabelEn?: string;
  }) => {
    let count = 0;
    if (params.targetAudience === 'all') {
      count = 1420;
    } else if (params.targetAudience === 'vip') {
      count = 185;
    } else if (params.targetAudience === 'reseller') {
      count = 94;
    } else if (params.targetAudience === 'user') {
      count = 1141;
    } else if (params.targetAudience === 'specific_user') {
      count = 1;
    }

    const newPush: BroadcastPushNotification = {
      id: 'BC-' + Date.now(),
      titleAr: params.titleAr,
      titleEn: params.titleEn,
      messageAr: params.messageAr,
      messageEn: params.messageEn,
      targetAudience: params.targetAudience,
      targetUserId: params.targetUserId,
      targetUserName: params.targetUserName,
      type: params.type,
      priority: params.priority,
      actionUrl: params.actionUrl,
      actionLabelAr: params.actionLabelAr,
      actionLabelEn: params.actionLabelEn,
      sentAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      recipientCount: count,
      readCount: 0,
      deliveredViaPush: true
    };

    setBroadcastNotifications((prev) => [newPush, ...prev]);

    // Check if the current logged-in user is targeted
    const currentUserId = currentUser?.id || userProfile.id || 'usr-admin-real';
    const isTargeted =
      params.targetAudience === 'all' ||
      (params.targetAudience === 'specific_user' && params.targetUserId === currentUserId) ||
      (params.targetAudience === 'vip' && userStats.tier === 'VIP Gold') ||
      (params.targetAudience === 'user');

    if (isTargeted) {
      setNotifications((prev) => [
        {
          id: 'notif-push-' + Date.now(),
          titleAr: params.titleAr,
          titleEn: params.titleEn,
          messageAr: params.messageAr,
          messageEn: params.messageEn,
          type: params.type === 'discount' ? 'offer' : 'system',
          timestamp: language === 'ar' ? 'الآن' : 'Just now',
          read: false
        },
        ...prev
      ]);
    }

    // Native browser Notification API if permitted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(language === 'ar' ? params.titleAr : params.titleEn, {
          body: language === 'ar' ? params.messageAr : params.messageEn
        });
      } catch (e) {
        /* ignore */
      }
    }

    showToast({
      type: params.priority === 'urgent' ? 'error' : params.type === 'discount' ? 'success' : 'info',
      title: language === 'ar' ? '🚀 تم بث الإشعار بنجاح!' : '🚀 Push Broadcast Dispatched!',
      message: language === 'ar'
        ? `تم إرسال إشعار الدفع إلى ${(count || 0).toLocaleString()} مستخدم بنجاح.`
        : `Notification delivered to ${(count || 0).toLocaleString()} recipients.`
    });

    // Record in user activity logs
    adminAddUserActivityLog({
      userId: currentUser?.id || 'usr-admin-real',
      userName: currentUser?.name || 'عبدالرحمن سيد',
      userEmail: currentUser?.email || 'abdosayed0120@gmail.com',
      actionType: 'settings_change',
      actionTitleAr: 'بث إشعار دفع للمستخدمين',
      actionTitleEn: 'Dispatched Push Notification',
      detailsAr: `إرسال إشعار [${params.titleAr}] إلى فئة: ${params.targetAudience} (${count} مستلم)`,
      detailsEn: `Sent push broadcast "${params.titleEn}" to audience: ${params.targetAudience} (${count} recipients)`,
      ip: '127.0.0.1',
      device: 'Admin Dashboard',
      browser: 'Chrome / Admin Console',
      status: 'success'
    });
  };

  const adminDeleteBroadcastNotification = (id: string) => {
    setBroadcastNotifications((prev) => prev.filter((b) => b.id !== id));
    showToast({
      type: 'info',
      title: language === 'ar' ? 'حذف الإشعار' : 'Notification Deleted',
      message: language === 'ar' ? 'تمت إزالة الإشعار من مركز التحكم.' : 'Notification removed from push center.'
    });
  };

  // Auth Operations: Login, Register, Logout (Powered by secure JWT & PBKDF2)
  const login = async (identifier: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          message: data.error || (language === 'ar' ? 'فشل تسجيل الدخول، يرجى التأكد من البيانات' : 'Login failed, please check credentials')
        };
      }

      // Store Auth Token securely
      setAuthToken(data.token);
      setCurrentUser(data.user);
      setIsAuthenticated(true);

      setUserProfile((prev) => ({
        ...prev,
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        phone: data.user.phone,
        country: data.user.country,
        bio: data.user.bio,
        avatarConfig: data.user.avatarConfig || prev.avatarConfig
      }));

      setUserStats((prev) => ({
        ...prev,
        balance: data.user.balance,
        totalSpent: data.user.totalSpent,
        totalOrders: data.user.totalOrders,
        tier: data.user.role === 'vip' || data.user.role === 'admin' ? 'VIP Gold' : data.user.role === 'reseller' ? 'Silver Member' : 'Bronze Member'
      }));

      const isRealAdmin = Boolean(
        data.user.role === 'admin' &&
        data.user.email?.toLowerCase().trim() === 'abdosayed0120@gmail.com'
      );

      if (!isRealAdmin) {
        setIsAdminModeState(false);
      }

      // Synchronize full real data for this user
      await syncWithDatabase();

      showToast({
        type: 'success',
        title: language === 'ar' ? 'مرحباً بك مجدداً!' : 'Welcome Back!',
        message: language === 'ar' ? `أهلاً بك يا ${data.user.name}` : `Welcome back, ${data.user.name}!`
      });

      navigate('/dashboard');

      return {
        success: true,
        message: language === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Login successful'
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || (language === 'ar' ? 'حدث خطأ في الاتصال بالخادم' : 'Server connection error')
      };
    }
  };

  const register = async (data: RegisterFormData): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.fullName.trim() || data.username.trim(),
          username: data.username.trim(),
          email: data.email.trim(),
          phone: data.phone.trim(),
          country: data.country || (language === 'ar' ? 'مصر 🇪🇬' : 'Global'),
          password: data.password
        })
      });
      const resData = await res.json();
      if (!res.ok || !resData.success) {
        return {
          success: false,
          message: resData.error || (language === 'ar' ? 'فشل إنشاء الحساب' : 'Registration failed')
        };
      }

      setAuthToken(resData.token);
      setCurrentUser(resData.user);
      setIsAuthenticated(true);
      setIsAdminModeState(false); // Newly registered user can never be admin

      setUserProfile((prev) => ({
        ...prev,
        id: resData.user.id,
        name: resData.user.name,
        email: resData.user.email,
        phone: resData.user.phone,
        country: resData.user.country,
        joinedDate: 'اليوم'
      }));

      setUserStats({
        balance: 0.00,
        totalSpent: 0.00,
        totalOrders: 0,
        activeOrders: 0,
        tier: 'Bronze Member',
        savedDiscount: 0
      });

      await syncWithDatabase();

      showToast({
        type: 'success',
        title: language === 'ar' ? '🎉 تم إنشاء الحساب بنجاح!' : '🎉 Account Created!',
        message: language === 'ar'
          ? `أهلاً بك يا ${resData.user.name} في منصة SMM Rapid. تم تأمين حسابك بنجاح!`
          : `Welcome to SMM Rapid, ${resData.user.name}! Your account is securely created.`
      });

      navigate('/dashboard');

      return {
        success: true,
        message: language === 'ar' ? 'تم إنشاء الحساب بنجاح' : 'Registration successful'
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || (language === 'ar' ? 'حدث خطأ أثناء إنشاء الحساب' : 'Error creating account')
      };
    }
  };

  const logout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
    setIsAdminModeState(false);
    localStorage.removeItem('smm_auth_token');
    localStorage.removeItem('smm_current_user');
    localStorage.removeItem('smm_is_authenticated');
    localStorage.removeItem('smm_is_admin');
    sessionStorage.clear();
    setOrders([]);
    setDepositRequests([]);
    setNotifications([]);

    showToast({
      type: 'info',
      title: language === 'ar' ? 'تسجيل الخروج' : 'Logged Out',
      message: language === 'ar' ? 'تم تسجيل الخروج بنجاح وتأمين الجلسة.' : 'You have been safely logged out.'
    });

    navigate('/login');
  };

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        theme,
        toggleTheme,
        userStats,
        userProfile,
        updateUserProfile,
        securitySettings,
        updateSecuritySettings,
        activeSessions,
        terminateOtherSessions,
        regenerateApiKey,
        changePassword,
        services,
        orders,
        transactions,
        notifications,
        unreadNotificationCount,
        reviews,
        tickets,
        chatMessages,
        isChatOpen,
        setIsChatOpen,
        activeTab,
        setActiveTab,
        isAdminMode,
        setIsAdminMode,
        adminActiveTab,
        setAdminActiveTab,
        platformUsers,
        depositRequests,
        activityLogs,
        platformSettings,
        toasts,
        showToast,
        dismissToast,
        placeOrder,
        refillOrder,
        cancelOrder,
        rateOrder,
        depositFunds,
        markNotificationsAsRead,
        sendChatMessage,
        createSupportTicket,
        replyToTicket,
        addNewReview,
        trackingOrderId,
        setTrackingOrderId,
        isAddFundsModalOpen,
        setIsAddFundsModalOpen,
        submitDepositRequest,
        adminUpdateUserBalance,
        adminUpdateUserStatus,
        adminUpdateUserRole,
        adminAddNewUser,
        adminDeleteUser,
        adminUpdateOrderStatus,
        adminRefundOrder,
        adminUpdateOrderDetails,
        adminUpdateService,
        adminAddService,
        adminDeleteService,
        adminApproveDeposit,
        adminRejectDeposit,
        adminUpdateSettings,
        adminBroadcastNotification,
        adminReplyChat,
        adminResolveTicket,
        serviceProviders,
        providerCatalog,
        adminAddProvider,
        adminUpdateProvider,
        adminDeleteProvider,
        adminCheckProviderBalance,
        adminImportProviderServices,
        adminSyncProviderRates,
        placeBulkOrders,
        impersonatedUser,
        adminImpersonateUser,
        adminStopImpersonating,
        paymentGateways,
        adminUpdateGateway,
        adminToggleGateway,
        adminSetUserDiscount,
        coupons,
        adminAddCoupon,
        adminUpdateCoupon,
        adminDeleteCoupon,
        validateAndApplyCoupon,
        affiliateReferrals,
        affiliatePayoutRequests,
        affiliateCommissionRate,
        adminUpdateAffiliateSettings,
        adminApprovePayout,
        adminRejectPayout,
        userRequestPayout,
        favoriteServiceIds,
        toggleFavoriteService,
        invoiceModalOrder,
        invoiceModalDeposit,
        openInvoiceForOrder,
        openInvoiceForDeposit,
        closeInvoiceModal,
        userActivityLogs,
        adminAddUserActivityLog,
        broadcastNotifications,
        adminSendPushNotification,
        adminDeleteBroadcastNotification,
        createSha7nawyPayment,
        confirmSha7nawyPayment,
        createHeleketPayment,
        checkHeleketPayment,
        testGatewayConnection,
        currentUser,
        isAuthenticated,
        login,
        register,
        logout
      }}
    >
      {children}
    </AppContext.Provider>
  );
};


export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
