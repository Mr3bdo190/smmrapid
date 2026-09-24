import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BroadcastPushNotification, PlatformUser } from '../../types';
import {
  Bell,
  BellRing,
  Send,
  Users,
  UserCheck,
  ShieldAlert,
  Sparkles,
  Tag,
  Wrench,
  Clock,
  CheckCircle2,
  Trash2,
  Smartphone,
  Globe,
  Search,
  Filter,
  Eye,
  RefreshCw,
  ExternalLink,
  Sliders,
  CheckCheck,
  Radio
} from 'lucide-react';

export const AdminNotificationsTab: React.FC = () => {
  const {
    language,
    platformUsers,
    broadcastNotifications,
    adminSendPushNotification,
    adminDeleteBroadcastNotification,
    showToast
  } = useApp();

  const isAr = language === 'ar';

  // Form State
  const [titleAr, setTitleAr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [messageAr, setMessageAr] = useState('');
  const [messageEn, setMessageEn] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'vip' | 'reseller' | 'user' | 'specific_user'>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [notifType, setNotifType] = useState<'announcement' | 'discount' | 'maintenance' | 'update' | 'urgent'>('announcement');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('high');
  const [actionUrl, setActionUrl] = useState<'services' | 'new_order' | 'add_funds' | 'support' | ''>('services');
  const [actionLabelAr, setActionLabelAr] = useState('عرض التفاصيل');
  const [actionLabelEn, setActionLabelEn] = useState('View Details');
  const [isSending, setIsSending] = useState(false);

  // Filter state for history table
  const [historySearch, setHistorySearch] = useState('');
  const [historyAudienceFilter, setHistoryAudienceFilter] = useState('all');

  // Fast preset templates
  const applyTemplate = (templateType: 'update' | 'discount' | 'maintenance' | 'vip') => {
    if (templateType === 'update') {
      setTitleAr('⚡ تحسينات كبرى على سيرفرات إنستغرام وتيك توك');
      setTitleEn('⚡ Major Performance Upgrade on Instagram & TikTok');
      setMessageAr('تمت مضاعفة سرعة تسليم المتابعين والمشاهدات لتصبح فورية خلال 5 دقائق وبضمان كامل لعدم النقص.');
      setMessageEn('Followers and views delivery speed has been upgraded to instant 5 mins with 100% refill guarantee.');
      setNotifType('update');
      setPriority('high');
      setActionUrl('services');
      setActionLabelAr('تصفح الخدمات');
      setActionLabelEn('Explore Services');
    } else if (templateType === 'discount') {
      setTitleAr('🎁 خصم خاص 15% على جميع طلبات اليوم');
      setTitleEn('🎁 Special 15% Discount on All Orders Today');
      setMessageAr('استخدم كوبون RAPID15 عند الدفع للحصول على خصم مباشر على جميع خدمات السوشيال ميديا.');
      setMessageEn('Use coupon code RAPID15 at checkout to get an instant 15% off across all platforms.');
      setNotifType('discount');
      setPriority('high');
      setActionUrl('new_order');
      setActionLabelAr('اطلب الآن بالخصم');
      setActionLabelEn('Order with Discount');
    } else if (templateType === 'maintenance') {
      setTitleAr('⚠️ صيانة دورية مجدولة لخوادم تويتر / X');
      setTitleEn('⚠️ Scheduled Maintenance on Twitter (X) Nodes');
      setMessageAr('نحيطكم علماً بوجود صيانة دورية لتحديث خوادم تويتر الليلة من 2:00 إلى 3:30 فجراً لرفع الجودة.');
      setMessageEn('Scheduled server upgrade tonight from 2:00 AM to 3:30 AM to boost quality.');
      setNotifType('maintenance');
      setPriority('normal');
      setActionUrl('');
    } else if (templateType === 'vip') {
      setTitleAr('👑 ترقية خاصة لعملاء VIP والموزعين الكبار');
      setTitleEn('👑 Exclusive Upgrade for VIP & Resellers');
      setMessageAr('تم فتح الوصول المباشر لخوادم الـ High-Priority مع أسعار حصرية خاصة بحسابك.');
      setMessageEn('High-Priority direct server access is now unlocked with custom wholesale rates.');
      setTargetAudience('vip');
      setNotifType('announcement');
      setPriority('urgent');
      setActionUrl('services');
      setActionLabelAr('لوحة الـ VIP');
      setActionLabelEn('VIP Dashboard');
    }
  };

  // Request browser notification permission
  const handleRequestPushPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          showToast({
            type: 'success',
            title: isAr ? 'تم تفعيل إشعارات المتصفح بنجاح! 🔔' : 'Browser Notifications Enabled! 🔔',
            message: isAr ? 'ستصلك إشعارات الدفع الفورية حتى عند تصغير المتصفح.' : 'Push notifications are now active.'
          });
          new Notification(isAr ? 'SMM Rapid - مركز الإشعارات' : 'SMM Rapid - Notification Hub', {
            body: isAr ? 'تم اختبار وتفعيل إشعارات الدفع بنجاح!' : 'Push notifications connected successfully!'
          });
        } else {
          showToast({
            type: 'warning',
            title: isAr ? 'تم رفض الإذن' : 'Permission Denied',
            message: isAr ? 'يرجى السماح بالإشعارات من إعدادات المتصفح.' : 'Please allow notifications in browser settings.'
          });
        }
      } catch (err) {
        /* ignore */
      }
    }
  };

  // Handle Dispatch
  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleAr.trim() || !messageAr.trim()) {
      showToast({
        type: 'error',
        title: isAr ? 'بيانات ناقصة' : 'Missing Fields',
        message: isAr ? 'يرجى إدخال عنوان الإشعار ونص الرسالة على الأقل.' : 'Title and message text are required.'
      });
      return;
    }

    if (targetAudience === 'specific_user' && !selectedUserId) {
      showToast({
        type: 'error',
        title: isAr ? 'اختر المستخدم' : 'Select User',
        message: isAr ? 'يرجى اختيار المستخدم المستهدف بالإشعار المخصص.' : 'Please select a specific recipient user.'
      });
      return;
    }

    setIsSending(true);

    const targetUser = platformUsers.find((u) => u.id === selectedUserId);

    adminSendPushNotification({
      titleAr: titleAr.trim(),
      titleEn: titleEn.trim() || titleAr.trim(),
      messageAr: messageAr.trim(),
      messageEn: messageEn.trim() || messageAr.trim(),
      targetAudience,
      targetUserId: targetAudience === 'specific_user' ? selectedUserId : undefined,
      targetUserName: targetAudience === 'specific_user' ? targetUser?.name : undefined,
      type: notifType,
      priority,
      actionUrl: actionUrl || undefined,
      actionLabelAr: actionLabelAr || undefined,
      actionLabelEn: actionLabelEn || undefined
    });

    // Reset Form
    setTitleAr('');
    setTitleEn('');
    setMessageAr('');
    setMessageEn('');
    setIsSending(false);
  };

  // Filtered broadcast history
  const filteredBroadcasts = broadcastNotifications.filter((b) => {
    const matchesSearch =
      b.titleAr.toLowerCase().includes(historySearch.toLowerCase()) ||
      b.titleEn.toLowerCase().includes(historySearch.toLowerCase()) ||
      b.messageAr.toLowerCase().includes(historySearch.toLowerCase()) ||
      (b.targetUserName && b.targetUserName.toLowerCase().includes(historySearch.toLowerCase()));

    const matchesAudience = historyAudienceFilter === 'all' || b.targetAudience === historyAudienceFilter;

    return matchesSearch && matchesAudience;
  });

  // Calculate reach stats
  const totalRecipientsReached = broadcastNotifications.reduce((acc, curr) => acc + (curr.recipientCount || 0), 0);
  const totalReads = broadcastNotifications.reduce((acc, curr) => acc + (curr.readCount || 0), 0);
  const avgReadRate = totalRecipientsReached > 0 ? Math.round((totalReads / totalRecipientsReached) * 100) : 78;

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isAr ? 'مركز تحكم الإشعارات وإشعارات الدفع (Push Notifications)' : 'Push Notifications Control Hub'}</span>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  {isAr ? 'بث فوري' : 'Live Dispatch'}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {isAr
                  ? 'إرسال إشعارات دفع وتنبيهات مباشرة لجميع المستخدمين، عملاء الـ VIP، الموزعين، أو مستخدم مخصص بالاسم.'
                  : 'Broadcast push notifications and announcements to all users, VIP cohorts, resellers, or targeted individuals.'}
              </p>
            </div>
          </div>
        </div>

        {/* Browser Test Permission Button */}
        <button
          onClick={handleRequestPushPermission}
          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto shadow-xs"
        >
          <BellRing className="w-4 h-4 text-blue-500" />
          <span>{isAr ? 'تفعيل وتجربة إشعار المتصفح' : 'Test Browser Push'}</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
              {isAr ? 'إجمالي الحملات المرسلة' : 'Total Broadcasts'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {broadcastNotifications.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {isAr ? 'إشعار دفع مرسل بنجاح' : 'dispatches completed'}
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
              {isAr ? 'إجمالي وصول الإشعارات' : 'Total Reach Delivered'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {(totalRecipientsReached || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {isAr ? 'مستلم عبر الويب والتطبيق' : 'devices & accounts'}
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
              {isAr ? 'معدل القراءة والتفاعل' : 'Open / Read Rate'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <CheckCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-purple-600 dark:text-purple-400">
            {avgReadRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {(totalReads || 0).toLocaleString()} {isAr ? 'نقرة قراءة مؤكدة' : 'confirmed opens'}
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
              {isAr ? 'حالة خدمة الإشعارات' : 'Push Engine Status'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-base font-black text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
            <span>{isAr ? 'نشط ولحظي (Active)' : 'Active & Connected'}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {isAr ? 'دعم Web Push API وتنبيهات الجرس' : 'Web Push & In-app alerts'}
          </div>
        </div>

      </div>

      {/* Main Section: Notification Creator & Live Phone Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Creator Form (8 cols) */}
        <div className="lg:col-span-8 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-500" />
                <span>{isAr ? 'إنشاء وبث إشعار دفع جديد' : 'Compose & Broadcast Push Notification'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? 'حدد الفئة المستهدفة، العنوان، ونص التنبيه مع إمكانية إضافة رابط إجراء فوري.' : 'Configure audience target, title, text body, and actionable direct links.'}
              </p>
            </div>

            {/* Quick Templates */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 me-1">{isAr ? 'نماذج جاهزة:' : 'Presets:'}</span>
              <button
                type="button"
                onClick={() => applyTemplate('update')}
                className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[11px] font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
              >
                {isAr ? '⚡ تحديث' : 'Update'}
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('discount')}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
              >
                {isAr ? '🎁 خصم' : 'Discount'}
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('maintenance')}
                className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[11px] font-bold hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
              >
                {isAr ? '⚠️ صيانة' : 'Maintenance'}
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('vip')}
                className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[11px] font-bold hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors cursor-pointer"
              >
                {isAr ? '👑 VIP' : 'VIP'}
              </button>
            </div>
          </div>

          <form onSubmit={handleSendNotification} className="space-y-4">
            
            {/* Target Audience & Target User Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'الفئة المستهدفة بالإشعار *' : 'Target Audience Cohort *'}
                </label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{isAr ? '📢 جميع المستخدمين المسجلين (عام لكافة الأعضاء)' : '📢 All Registered Users (Public Broadcast)'}</option>
                  <option value="vip">{isAr ? '👑 عملاء كبار الشخصيات (VIP Clients Only)' : '👑 VIP Clients Only'}</option>
                  <option value="reseller">{isAr ? '💼 الموزعون وأصحاب المتاجر (Resellers Only)' : '💼 Resellers & API Owners'}</option>
                  <option value="user">{isAr ? '👤 المستخدمون العاديون فقط (Standard Users)' : '👤 Standard Users Only'}</option>
                  <option value="specific_user">{isAr ? '🎯 مستخدم محدد بالاسم / المعرف (Specific User)' : '🎯 Specific Targeted User'}</option>
                </select>
              </div>

              {/* Specific user selector if chosen */}
              {targetAudience === 'specific_user' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isAr ? 'اختر المستخدم المستهدف *' : 'Choose Target User *'}
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">{isAr ? '-- اختر مستخدماً من القائمة --' : '-- Select a User --'}</option>
                    {platformUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email}) - {u.role.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {isAr ? 'نوع التنبيه' : 'Notification Type'}
                    </label>
                    <select
                      value={notifType}
                      onChange={(e) => setNotifType(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="announcement">{isAr ? 'إعلان عام' : 'Announcement'}</option>
                      <option value="discount">{isAr ? 'عرض / خصم' : 'Discount / Promo'}</option>
                      <option value="update">{isAr ? 'تحديث سيرفرات' : 'System Update'}</option>
                      <option value="maintenance">{isAr ? 'صيانة دورية' : 'Maintenance'}</option>
                      <option value="urgent">{isAr ? 'تنبيه أمان عاجل' : 'Urgent Alert'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {isAr ? 'درجة الأولوية' : 'Priority'}
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="normal">{isAr ? 'عادية (Normal)' : 'Normal'}</option>
                      <option value="high">{isAr ? 'مرتفعة (High)' : 'High'}</option>
                      <option value="urgent">{isAr ? 'عاجلة وفورية (Urgent)' : 'Urgent'}</option>
                    </select>
                  </div>
                </div>
              )}

            </div>

            {/* Arabic Title & English Title */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'عنوان الإشعار (بالعربية) *' : 'Notification Title (Arabic) *'}
                </label>
                <input
                  type="text"
                  placeholder={isAr ? 'مثال: خصم 20% لكبار الموزعين اليوم...' : 'e.g. 20% discount on followers...'}
                  value={titleAr}
                  onChange={(e) => setTitleAr(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'عنوان الإشعار (بالإنجليزية - اختياري)' : 'Notification Title (English - Optional)'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Exclusive 20% Discount for VIPs..."
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Message Body (Arabic & English) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'نص الرسالة (بالعربية) *' : 'Message Body (Arabic) *'}
                </label>
                <textarea
                  rows={3}
                  placeholder={isAr ? 'اكتب تفاصيل الإشعار الذي سيظهر للمستخدم في شريط التنبيهات...' : 'Notification text displayed on user devices...'}
                  value={messageAr}
                  onChange={(e) => setMessageAr(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'نص الرسالة (بالإنجليزية - اختياري)' : 'Message Body (English - Optional)'}
                </label>
                <textarea
                  rows={3}
                  placeholder="Detailed notification content for English language users..."
                  value={messageEn}
                  onChange={(e) => setMessageEn(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            {/* Call to Action Button Configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'رابط التوجيه السريع' : 'Action Destination'}
                </label>
                <select
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{isAr ? 'بدون زر إجراء (تنبيه فقط)' : 'No Action (Alert Only)'}</option>
                  <option value="services">{isAr ? 'صفحة قائمة الخدمات' : 'Services List'}</option>
                  <option value="new_order">{isAr ? 'صفحة طلب جديد' : 'New Order Page'}</option>
                  <option value="add_funds">{isAr ? 'شحن المحفظة' : 'Add Funds Page'}</option>
                  <option value="support">{isAr ? 'الدعم والمحادثة المباشرة' : 'Support / Live Chat'}</option>
                </select>
              </div>

              {actionUrl && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {isAr ? 'نص زر الإجراء (عربي)' : 'Action Button (Arabic)'}
                    </label>
                    <input
                      type="text"
                      value={actionLabelAr}
                      onChange={(e) => setActionLabelAr(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {isAr ? 'نص زر الإجراء (إنجليزي)' : 'Action Button (English)'}
                    </label>
                    <input
                      type="text"
                      value={actionLabelEn}
                      onChange={(e) => setActionLabelEn(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Dispatch Action Button */}
            <div className="pt-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>
                  {isAr
                    ? 'سيتم إرسال الإشعار فوراً عبر إشعارات المتصفح وسجل الإشعارات الداخلي للمستخدم.'
                    : 'Dispatches instantly via Web Push and in-app Notification Center.'}
                </span>
              </div>

              <button
                type="submit"
                disabled={isSending}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{isAr ? 'بث الإشعار الآن' : 'Dispatch Notification Now'}</span>
              </button>
            </div>

          </form>

        </div>

        {/* Live Device / Phone Push Preview (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-3xl bg-slate-950 text-white border border-slate-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2 text-xs font-black text-slate-200">
                <Smartphone className="w-4 h-4 text-blue-400" />
                <span>{isAr ? 'معاينة الإشعار على هاتف المستخدم' : 'Live Mobile Push Preview'}</span>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {isAr ? 'مباشر' : 'Live'}
              </span>
            </div>

            {/* Smartphone simulated banner */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-2xl space-y-2 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-[10px] font-black text-white">
                    R
                  </div>
                  <span className="text-xs font-black text-white">SMM Rapid</span>
                  <span className="text-[10px] text-slate-400">• {isAr ? 'الآن' : 'now'}</span>
                </div>
                <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                  {notifType}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white">
                  {titleAr || (isAr ? 'عنوان الإشعار يظهر هنا...' : 'Notification Title appears here...')}
                </h4>
                <p className="text-[11px] text-slate-300 mt-1 line-clamp-3 leading-relaxed">
                  {messageAr || (isAr ? 'نص الرسالة الترويجية أو التنبيه يظهر هنا في شاشة قفل هاتف العميل...' : 'Notification message preview appears on the device lock screen...')}
                </p>
              </div>

              {actionUrl && (
                <div className="pt-2 border-t border-slate-800 flex justify-end">
                  <span className="px-3 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-black shadow-xs">
                    {actionLabelAr || 'عرض التفاصيل'}
                  </span>
                </div>
              )}
            </div>

            {/* Target cohort summary preview */}
            <div className="mt-5 p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-2">
              <div className="text-[11px] font-extrabold text-slate-400">
                {isAr ? 'ملخص الاستهداف:' : 'Targeting Summary:'}
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>{isAr ? 'الفئة:' : 'Cohort:'}</span>
                <span className="font-bold text-white uppercase">{targetAudience}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>{isAr ? 'الأولوية:' : 'Priority:'}</span>
                <span className="font-bold text-amber-400 uppercase">{priority}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>{isAr ? 'الوصول المتوقع:' : 'Estimated Reach:'}</span>
                <span className="font-bold text-emerald-400">
                  {targetAudience === 'all'
                    ? '1,420 مستخدم'
                    : targetAudience === 'vip'
                    ? '185 مستخدم VIP'
                    : targetAudience === 'reseller'
                    ? '94 موزع'
                    : targetAudience === 'specific_user'
                    ? 'مستخدم 1'
                    : '1,141 مستخدم'}
                </span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 text-center pt-4">
            {isAr
              ? 'متوافق مع أنظمة Android، iOS (PWA)، ومتصفحات Chrome وSafari وEdge.'
              : 'Compatible with Android, iOS (PWA), Chrome, Edge, and Safari.'}
          </div>
        </div>

      </div>

      {/* Broadcast History & Management Table */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>{isAr ? 'سجل الإشعارات المرسلة مسبقاً' : 'Push Notification Dispatch History'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr ? 'متابعة عدد المستلمين، حالات القراءة، وإمكانية حذف أو تكرار الإشعار.' : 'Auditing of past notifications, recipient volume, and read confirmations.'}
            </p>
          </div>

          {/* Search & Audience Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 top-2.5" />
              <input
                type="text"
                placeholder={isAr ? 'بحث في السجل...' : 'Search logs...'}
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl ps-9 pe-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={historyAudienceFilter}
              onChange={(e) => setHistoryAudienceFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{isAr ? 'كافة الفئات' : 'All Audiences'}</option>
              <option value="all">{isAr ? 'عام (All)' : 'All'}</option>
              <option value="vip">VIP</option>
              <option value="reseller">Reseller</option>
              <option value="specific_user">{isAr ? 'مستخدم مخصص' : 'Specific User'}</option>
            </select>
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-extrabold">
                <th className="py-3 px-3 text-start">{isAr ? 'عنوان الإشعار والمحتوى' : 'Notification & Message'}</th>
                <th className="py-3 px-3 text-center">{isAr ? 'الفئة المستهدفة' : 'Target Audience'}</th>
                <th className="py-3 px-3 text-center">{isAr ? 'النوع والأولوية' : 'Type & Priority'}</th>
                <th className="py-3 px-3 text-center">{isAr ? 'المستلمون' : 'Recipients'}</th>
                <th className="py-3 px-3 text-center">{isAr ? 'تمت القراءة' : 'Read'}</th>
                <th className="py-3 px-3 text-center">{isAr ? 'تاريخ الإرسال' : 'Sent Date'}</th>
                <th className="py-3 px-3 text-end">{isAr ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredBroadcasts.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  
                  {/* Title & Body */}
                  <td className="py-3 px-3 max-w-xs sm:max-w-md">
                    <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{isAr ? b.titleAr : b.titleEn}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {isAr ? b.messageAr : b.messageEn}
                    </p>
                    {b.targetUserName && (
                      <span className="text-[10px] text-blue-500 font-bold block mt-0.5">
                        {isAr ? `موجه للمستخدم: ${b.targetUserName}` : `Target: ${b.targetUserName}`}
                      </span>
                    )}
                  </td>

                  {/* Target Audience */}
                  <td className="py-3 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      b.targetAudience === 'all'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : b.targetAudience === 'vip'
                        ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                        : b.targetAudience === 'reseller'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>
                      {b.targetAudience}
                    </span>
                  </td>

                  {/* Type & Priority */}
                  <td className="py-3 px-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {b.type}
                      </span>
                      {b.priority === 'urgent' && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-500">
                          URGENT
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Recipient Count */}
                  <td className="py-3 px-3 text-center font-black text-slate-900 dark:text-white">
                    {(b.recipientCount ?? 0).toLocaleString()}
                  </td>

                  {/* Read Count */}
                  <td className="py-3 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                    {(b.readCount ?? 0).toLocaleString()}
                  </td>

                  {/* Timestamp */}
                  <td className="py-3 px-3 text-center text-slate-400 text-[11px] whitespace-nowrap">
                    {b.sentAt}
                  </td>

                  {/* Delete action */}
                  <td className="py-3 px-3 text-end">
                    <button
                      onClick={() => adminDeleteBroadcastNotification(b.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title={isAr ? 'حذف السجل' : 'Delete Log'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>

                </tr>
              ))}

              {filteredBroadcasts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    {isAr ? 'لا توجد إشعارات سابقة تطابق البحث.' : 'No notification history matching filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
