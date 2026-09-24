import { UserActivityLog, BroadcastPushNotification } from '../types';

export const INITIAL_USER_ACTIVITY_LOGS: UserActivityLog[] = [];

export const INITIAL_BROADCAST_NOTIFICATIONS: BroadcastPushNotification[] = [
  {
    id: 'BC-101',
    titleAr: 'مرحباً بكم في منصة SMM Rapid الرسمية',
    titleEn: 'Welcome to SMM Rapid Platform',
    messageAr: 'المنصة جاهزة لاستقبال طلباتكم وخدماتكم مع متابعة مستمرة ودعم فني على مدار الساعة.',
    messageEn: 'Platform is ready for your orders with 24/7 technical support and real-time fulfillment.',
    targetAudience: 'all',
    type: 'announcement',
    priority: 'high',
    actionUrl: 'services',
    actionLabelAr: 'تصفح الخدمات',
    actionLabelEn: 'Browse Services',
    sentAt: '2026-09-23',
    recipientCount: 1,
    readCount: 1,
    deliveredViaPush: false
  }
];

// Dynamic Financial data sets (initialized empty, dynamically populated from live orders)
export const FINANCIAL_DAILY_SERIES: Array<{
  date: string;
  sales: number;
  cost: number;
  profit: number;
  orders: number;
}> = [];

export const FINANCIAL_MONTHLY_SERIES: Array<{
  month: string;
  monthEn: string;
  sales: number;
  cost: number;
  profit: number;
  margin: number;
  orders: number;
}> = [];

export const TOP_REQUESTED_SERVICES: Array<{
  id: string;
  nameAr: string;
  nameEn: string;
  platform: 'instagram' | 'tiktok' | 'youtube' | 'telegram' | 'facebook' | 'twitter';
  ordersCount: number;
  totalQty: string;
  grossSales: number;
  providerCost: number;
  netProfit: number;
  marginPct: number;
}> = [];

export const PLATFORM_REVENUE_DISTRIBUTION = [
  { name: 'Instagram', nameAr: 'إنستغرام', value: 0, color: '#E1306C' },
  { name: 'TikTok', nameAr: 'تيك توك', value: 0, color: '#00F2FE' },
  { name: 'YouTube', nameAr: 'يوتيوب', value: 0, color: '#FF0000' },
  { name: 'Telegram', nameAr: 'تيليجرام', value: 0, color: '#2AABEE' },
  { name: 'Facebook', nameAr: 'فيسبوك', value: 0, color: '#1877F2' },
  { name: 'Twitter (X)', nameAr: 'تويتر (X)', value: 0, color: '#1DA1F2' }
];
