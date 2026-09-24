export type Language = 'ar' | 'en';
export type Theme = 'dark' | 'light';

export type SocialPlatform =
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'twitter'
  | 'telegram'
  | 'facebook'
  | 'linkedin'
  | 'spotify';

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'in_progress'
  | 'completed'
  | 'canceled';

export interface ServiceItem {
  id: string;
  platform: SocialPlatform;
  categoryAr: string;
  categoryEn: string;
  nameAr: string;
  nameEn: string;
  ratePer1000: number; // in USD
  min: number;
  max: number;
  avgTimeAr: string;
  avgTimeEn: string;
  avgSpeedAr?: string;
  avgSpeedEn?: string;
  refillDays: number; // 0 for no refill, 30 for 30 days refill
  speed: 'super_fast' | 'instant' | 'gradual' | 'safe';
  badge?: 'trending' | 'popular' | 'instant' | 'best_value';
  descriptionAr: string;
  descriptionEn: string;
  providerId?: string;
  providerServiceId?: string;
  providerCost?: number;
}

export interface OrderItem {
  id: string;
  serviceId: string;
  serviceNameAr: string;
  serviceNameEn: string;
  serviceName?: string;
  platform: SocialPlatform;
  link: string;
  targetLink?: string;
  quantity: number;
  charge: number;
  startCount: number;
  currentCount: number;
  targetCount: number;
  remains?: number;
  providerCost?: number;
  status: OrderStatus;
  progressPercentage: number;
  createdAt: string;
  speedMode: 'instant' | 'gradual' | 'drip';
  dripRuns?: number;
  dripIntervalHours?: number;
  rated?: boolean;
  ratingScore?: number;
  ratingReview?: string;
  logs: { timestamp: string; messageAr: string; messageEn: string }[];
}

export interface TransactionItem {
  id: string;
  type: 'deposit' | 'order_charge' | 'refund' | 'bonus';
  amount: number;
  method: string;
  status: 'completed' | 'pending' | 'failed';
  date: string;
  noteAr: string;
  noteEn: string;
}

export interface NotificationItem {
  id: string;
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  type: 'order' | 'balance' | 'system' | 'offer';
  timestamp: string;
  read: boolean;
  relatedOrderId?: string;
}

export interface TicketMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  senderName: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  orderId?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'answered' | 'closed';
  createdAt: string;
  lastUpdate: string;
  messages: TicketMessage[];
}

export interface LiveChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
}

export interface CustomerReview {
  id: string;
  customerName: string;
  avatar: string;
  country: string;
  rating: number; // 1 to 5
  serviceNameAr: string;
  serviceNameEn: string;
  platform: SocialPlatform;
  tagsAr: string[];
  tagsEn: string[];
  commentAr: string;
  commentEn: string;
  date: string;
  verified: boolean;
}

export interface UserStats {
  balance: number;
  totalSpent: number;
  totalOrders: number;
  activeOrders: number;
  tier: 'VIP Gold' | 'Silver Member' | 'Bronze Member';
  savedDiscount: number;
}

export type EWalletProvider = 'vodafone' | 'orange' | 'etisalat' | 'instapay';

export interface DepositRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  method: 'vodafone_cash' | 'orange_cash' | 'etisalat_cash' | 'instapay' | 'crypto' | 'card' | 'paypal';
  walletProvider?: EWalletProvider;
  senderNumber?: string; // الرقم الخاص بالعميل المحول منه
  transferReference?: string; // كود العملية أو رقم الإشعار
  amountUSD: number;
  amountEGP: number;
  bonusAmount: number;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
  createdAt?: string;
  gatewayName?: string;
  gatewayTxId?: string;
  gatewayRefCode?: string;
  accountNumber?: string;
  transactionHash?: string;
  notes?: string;
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  balance: number;
  totalSpent: number;
  totalOrders: number;
  status: 'active' | 'suspended' | 'banned';
  role: 'user' | 'vip' | 'reseller' | 'admin';
  customDiscountPercent?: number; // Custom discount percentage e.g. 10 for 10%
  registeredAt: string;
  lastLogin: string;
  lastIp: string;
}

export interface PlatformActivityLog {
  id: string;
  timestamp: string;
  type: 'order' | 'deposit' | 'user' | 'system' | 'ticket' | 'service' | 'admin';
  messageAr: string;
  messageEn: string;
  user?: string;
  amount?: number;
  badge?: string;
  ip?: string;
}

export interface PlatformSettings {
  maintenanceMode: boolean;
  allowRegistrations: boolean;
  registrationAllowed?: boolean;
  autoRefillSystem: boolean;
  autoRefillEnabled?: boolean;
  liveSupportEnabled?: boolean;
  dripFeedEnabled?: boolean;
  requireReviewApproval: boolean;
  eWalletsEnabled: boolean;
  cryptoEnabled: boolean;
  egpExchangeRate: number; // مثلاً 50 جنيه لكل دولار
  vodafoneCashNumber: string;
  orangeCashNumber: string;
  etisalatCashNumber: string;
  instaPayUsername: string;
  instapayAddress?: string;
  usdtTrc20Address: string;
  cryptoUsdtAddress?: string;
  broadcastAnnouncementAr: string;
  broadcastAnnouncementEn: string;
  broadcastAnnouncementActive: boolean;

  // بوابة شحناوي (Sha7nawy Gate) للمحافظ الإلكترونية (فودافون، أورانج، اتصالات)
  sha7nawyEnabled: boolean;
  sha7nawyBaseUrl: string;
  sha7nawyPublicKey: string;
  sha7nawySecretKey: string;
  sha7nawyWebhookUrl: string;

  // بوابة هيليكت (Heleket Crypto Gateway) للعملات الرقمية (USDT, BTC, etc.)
  heleketEnabled: boolean;
  heleketBaseUrl: string;
  heleketMerchantId: string;
  heleketApiKey: string;
  heleketSecretKey: string;
  heleketWebhookUrl: string;
  heleketSupportedCurrencies: string;

  // التحقق التلقائي الإلزامي لعمليات الدفع
  autoVerifyPayments: boolean;
}

export interface VectorAvatarConfig {
  presetId: string;
  backgroundColor: string;
  accessory: 'none' | 'crown' | 'verified' | 'headphones' | 'glasses' | 'sparkles' | 'lightning';
  accentColor: string;
}

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  bio: string;
  avatarConfig: VectorAvatarConfig;
  joinedDate: string;
}

export interface SecuritySettings {
  twoFactorAuth: boolean;
  twoFactorSecret: string;
  loginAlertsEmail: boolean;
  requirePinForOrders: boolean;
  pinCode?: string;
  apiKey: string;
  allowApiOrders: boolean;
  whitelistedIps: string;
  sessionTimeout: number; // in minutes
  notificationPrefs: {
    orderCompleted: boolean;
    orderIssues: boolean;
    promotionalOffers: boolean;
    balanceAlerts: boolean;
    newsletter: boolean;
  };
}

export interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface ServiceProvider {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
  balance: number;
  currency: string;
  status: 'active' | 'inactive' | 'error';
  servicesCount: number;
  autoSyncRates: boolean;
  autoSyncStatus: boolean;
  defaultMarkupPercent: number; // percentage, e.g. 30 for +30%
  createdAt: string;
  lastSync: string;
  description?: string;
}

export interface ProviderServiceItem {
  id: string;
  providerId: string;
  providerServiceId: string;
  name: string;
  platform: SocialPlatform;
  category: string;
  originalRate: number; // in USD per 1000 from provider
  min: number;
  max: number;
  refill: boolean;
  refillDays?: number;
  dripfeed: boolean;
  speed: 'super_fast' | 'instant' | 'gradual' | 'safe';
  imported?: boolean;
}

export interface PaymentGatewayConfig {
  id: string;
  nameAr: string;
  nameEn: string;
  type: 'card' | 'crypto' | 'ewallet' | 'wallet' | 'bank' | 'other';
  enabled: boolean;
  minDeposit: number;
  maxDeposit: number;
  minDepositUSD?: number;
  maxDepositUSD?: number;
  feePercent: number;
  fixedFee: number;
  bonusPercent: number;
  depositBonusPercent?: number;
  exchangeRate?: number;
  accountNumber?: string;
  accountName?: string;
  providerKey?: string;
  credentials: Record<string, string>;
  instructionsAr: string;
  instructionsEn: string;
}

export interface DiscountCoupon {
  id: string;
  code: string;
  discountPercent: number;
  discountFixedUSD?: number;
  minOrderAmount: number;
  maxDiscountUSD?: number;
  usageLimit: number;
  usedCount: number;
  expiresAt: string;
  isActive: boolean;
  descriptionAr: string;
  descriptionEn: string;
}

export interface AffiliateReferral {
  id: string;
  referrerUserId?: string;
  referrerId?: string;
  referrerName?: string;
  referredUserId: string;
  referredUserName: string;
  referredUserEmail?: string;
  registeredDate?: string;
  dateJoined?: string;
  totalDeposits?: number;
  totalPurchasesUSD?: number;
  commissionEarned: number;
  commissionEarnedUSD?: number;
}

export interface AffiliatePayoutRequest {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  method: string;
  payoutDetails: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface UserActivityLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  actionType: 'login' | 'order' | 'deposit' | 'settings_change' | 'security' | 'api' | 'profile_update';
  actionTitleAr: string;
  actionTitleEn: string;
  detailsAr: string;
  detailsEn: string;
  ip: string;
  device: string;
  browser?: string;
  location?: string;
  timestamp: string;
  status: 'success' | 'warning' | 'info' | 'danger';
}

export interface BroadcastPushNotification {
  id: string;
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
  sentAt: string;
  recipientCount: number;
  readCount: number;
  deliveredViaPush: boolean;
}

export interface RegisterFormData {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  country: string;
  password: string;
  confirmPassword?: string;
  referralCode?: string;
  agreedToTerms: boolean;
}

export interface LoginFormData {
  identifier: string; // email or username
  password: string;
  rememberMe: boolean;
}
