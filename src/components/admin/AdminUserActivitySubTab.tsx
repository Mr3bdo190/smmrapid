import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { UserActivityLog } from '../../types';
import {
  History,
  Search,
  Filter,
  Download,
  Clock,
  Shield,
  Coins,
  ShoppingCart,
  UserCheck,
  AlertTriangle,
  Terminal,
  Globe,
  Laptop,
  Sliders,
  LogIn,
  Key,
  CheckCircle2,
  XCircle,
  Info,
  Calendar,
  X,
  FileText
} from 'lucide-react';

interface Props {
  initialUserId?: string;
  onSelectUser?: (userId: string) => void;
}

export const AdminUserActivitySubTab: React.FC<Props> = ({ initialUserId }) => {
  const { language, userActivityLogs, platformUsers } = useApp();
  const isAr = language === 'ar';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>(initialUserId || 'all');
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return userActivityLogs.filter((log) => {
      const matchesSearch =
        log.actionTitleAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.actionTitleEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.detailsAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.detailsEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ip.includes(searchTerm) ||
        (log.device && log.device.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.location && log.location.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesUser = selectedUserFilter === 'all' || log.userId === selectedUserFilter;
      const matchesType = actionTypeFilter === 'all' || log.actionType === actionTypeFilter;
      const matchesStatus = statusFilter === 'all' || log.status === statusFilter;

      return matchesSearch && matchesUser && matchesType && matchesStatus;
    });
  }, [userActivityLogs, searchTerm, selectedUserFilter, actionTypeFilter, statusFilter]);

  // Active targeted user details
  const targetedUser = useMemo(() => {
    if (selectedUserFilter === 'all') return null;
    return platformUsers.find((u) => u.id === selectedUserFilter);
  }, [selectedUserFilter, platformUsers]);

  // Statistics
  const stats = useMemo(() => {
    const total = userActivityLogs.length;
    const logins = userActivityLogs.filter((l) => l.actionType === 'login').length;
    const orders = userActivityLogs.filter((l) => l.actionType === 'order').length;
    const settings = userActivityLogs.filter((l) => l.actionType === 'settings_change' || l.actionType === 'security').length;
    return { total, logins, orders, settings };
  }, [userActivityLogs]);

  // Export as CSV
  const handleExportCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += 'Log ID,Timestamp,User ID,User Name,User Email,Action Type,Action Title,Details,IP Address,Device,Location,Status\n';

    filteredLogs.forEach((l) => {
      const title = isAr ? l.actionTitleAr : l.actionTitleEn;
      const details = (isAr ? l.detailsAr : l.detailsEn).replace(/,/g, ' ');
      csv += `"${l.id}","${l.timestamp}","${l.userId}","${l.userName}","${l.userEmail}","${l.actionType}","${title}","${details}","${l.ip}","${l.device || ''}","${l.location || ''}","${l.status}"\n`;
    });

    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `user_activity_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for action badge icon & style
  const getActionBadge = (type: UserActivityLog['actionType']) => {
    switch (type) {
      case 'login':
        return {
          icon: LogIn,
          labelAr: 'تسجيل دخول',
          labelEn: 'Login',
          bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
        };
      case 'order':
        return {
          icon: ShoppingCart,
          labelAr: 'طلب خدمة',
          labelEn: 'Order',
          bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
        };
      case 'settings_change':
        return {
          icon: Sliders,
          labelAr: 'تغيير إعدادات',
          labelEn: 'Settings',
          bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
        };
      case 'security':
        return {
          icon: Key,
          labelAr: 'أمان وحماية',
          labelEn: 'Security',
          bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
        };
      case 'deposit':
        return {
          icon: Coins,
          labelAr: 'شحن رصيد',
          labelEn: 'Deposit',
          bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
        };
      case 'api':
        return {
          icon: Terminal,
          labelAr: 'مفاتيح API',
          labelEn: 'API Key',
          bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
        };
      case 'profile_update':
        return {
          icon: UserCheck,
          labelAr: 'تحديث الحساب',
          labelEn: 'Profile',
          bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
        };
      default:
        return {
          icon: Info,
          labelAr: 'إجراء',
          labelEn: 'Action',
          bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
        };
    }
  };

  // Helper for status badge
  const getStatusBadge = (status: UserActivityLog['status']) => {
    switch (status) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>{isAr ? 'ناجح' : 'Success'}</span>
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            <span>{isAr ? 'تنبيه' : 'Warning'}</span>
          </span>
        );
      case 'danger':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            <span>{isAr ? 'فشل / خطأ' : 'Failed'}</span>
          </span>
        );
      case 'info':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Info className="w-3 h-3" />
            <span>{isAr ? 'معلومات' : 'Info'}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Activity Overview Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>{isAr ? 'إجمالي الحركات المسجلة' : 'Total Logged Actions'}</span>
            <History className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
            {stats.total}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{isAr ? 'عملية موثقة بطابع زمني' : 'timestamped entries'}</div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>{isAr ? 'تسجيلات الدخول' : 'Logins'}</span>
            <LogIn className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {stats.logins}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{isAr ? 'جلسة دخول مؤكدة' : 'authenticated sessions'}</div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>{isAr ? 'طلبات الخدمات' : 'Service Orders'}</span>
            <ShoppingCart className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-2">
            {stats.orders}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{isAr ? 'طلب منفذ بالمحفظة' : 'wallet orders created'}</div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>{isAr ? 'تغييرات الإعدادات والأمان' : 'Settings & Security'}</span>
            <Sliders className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {stats.settings}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{isAr ? 'تعديل 2FA وتفضيلات' : '2FA & preferences changes'}</div>
        </div>

      </div>

      {/* Targeted User Banner (if specific user is selected) */}
      {targetedUser && (
        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
              {targetedUser.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-blue-900 dark:text-blue-200">
                  {isAr ? `تصفية نشاط المستخدم:` : `Filtered Activity for:`} {targetedUser.name}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold">
                  {targetedUser.id}
                </span>
              </div>
              <div className="text-[11px] text-blue-700 dark:text-blue-300">
                {targetedUser.email} • {isAr ? `الرتبة: ${targetedUser.role.toUpperCase()}` : `Role: ${targetedUser.role.toUpperCase()}`} • {isAr ? `رصيد: $${targetedUser.balance.toFixed(2)}` : `Balance: $${targetedUser.balance.toFixed(2)}`}
              </div>
            </div>
          </div>

          <button
            onClick={() => setSelectedUserFilter('all')}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <X className="w-3.5 h-3.5 text-slate-500" />
            <span>{isAr ? 'عرض نشاط جميع المستخدمين' : 'Show All Users'}</span>
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-3" />
          <input
            type="text"
            placeholder={isAr ? 'بحث بالإجراء، تفاصيل العملية، المستخدم، البريد، الـ IP، أو الجهاز...' : 'Search by action, details, user, IP, or device...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl ps-10 pe-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* User selector */}
          <select
            value={selectedUserFilter}
            onChange={(e) => setSelectedUserFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[180px]"
          >
            <option value="all">{isAr ? 'جميع المستخدمين' : 'All Users'}</option>
            {platformUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.id})
              </option>
            ))}
          </select>

          {/* Action Category Filter */}
          <select
            value={actionTypeFilter}
            onChange={(e) => setActionTypeFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{isAr ? 'جميع الإجراءات' : 'All Actions'}</option>
            <option value="login">{isAr ? 'تسجيل الدخول (Login)' : 'Logins'}</option>
            <option value="order">{isAr ? 'الطلبات (Orders)' : 'Orders'}</option>
            <option value="settings_change">{isAr ? 'تغيير الإعدادات (Settings)' : 'Settings Changes'}</option>
            <option value="security">{isAr ? 'الأمان وكلمات المرور (Security)' : 'Security & 2FA'}</option>
            <option value="deposit">{isAr ? 'شحن الرصيد (Deposits)' : 'Deposits'}</option>
            <option value="api">{isAr ? 'مفاتيح API (API Keys)' : 'API Keys'}</option>
            <option value="profile_update">{isAr ? 'تحديث الملف الشخصي' : 'Profile Updates'}</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{isAr ? 'جميع الحالات' : 'All Status'}</option>
            <option value="success">{isAr ? 'ناجح (Success)' : 'Success'}</option>
            <option value="warning">{isAr ? 'تحذير (Warning)' : 'Warning'}</option>
            <option value="danger">{isAr ? 'خطأ / فشل (Danger)' : 'Danger'}</option>
            <option value="info">{isAr ? 'معلومات (Info)' : 'Info'}</option>
          </select>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title={isAr ? 'تصدير كملف CSV' : 'Export as CSV'}
          >
            <Download className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">{isAr ? 'تصدير CSV' : 'Export CSV'}</span>
          </button>

        </div>

      </div>

      {/* Activity Logs Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-extrabold uppercase text-[11px]">
              <tr>
                <th className="py-3.5 px-4 text-start">{isAr ? 'الطابع الزمني' : 'Timestamp'}</th>
                <th className="py-3.5 px-4 text-start">{isAr ? 'المستخدم' : 'User'}</th>
                <th className="py-3.5 px-4 text-start">{isAr ? 'نوع الإجراء' : 'Action Type'}</th>
                <th className="py-3.5 px-4 text-start">{isAr ? 'تفاصيل النشاط' : 'Activity Details'}</th>
                <th className="py-3.5 px-4 text-start">{isAr ? 'الموقع و IP' : 'Location & IP'}</th>
                <th className="py-3.5 px-4 text-start">{isAr ? 'الجهاز والمتصفح' : 'Device & Browser'}</th>
                <th className="py-3.5 px-4 text-center">{isAr ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredLogs.map((log) => {
                const badge = getActionBadge(log.actionType);
                const BadgeIcon = badge.icon;

                return (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-900 dark:text-slate-200 font-mono font-bold">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.timestamp}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        ID: {log.id}
                      </span>
                    </td>

                    {/* User */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => setSelectedUserFilter(log.userId)}
                        className="text-start hover:underline cursor-pointer group"
                      >
                        <div className="font-extrabold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                          {log.userName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {log.userEmail}
                        </div>
                        <span className="text-[10px] text-blue-500 font-mono block">
                          ({log.userId})
                        </span>
                      </button>
                    </td>

                    {/* Action Type Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black border ${badge.bg}`}>
                        <BadgeIcon className="w-3.5 h-3.5" />
                        <span>{isAr ? badge.labelAr : badge.labelEn}</span>
                      </span>
                    </td>

                    {/* Details */}
                    <td className="py-3.5 px-4 max-w-sm sm:max-w-md">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {isAr ? log.actionTitleAr : log.actionTitleEn}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {isAr ? log.detailsAr : log.detailsEn}
                      </p>
                    </td>

                    {/* Location & IP */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-300 font-bold">
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.ip}</span>
                      </div>
                      {log.location && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {log.location}
                        </span>
                      )}
                    </td>

                    {/* Device & Browser */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                        <Laptop className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.device}</span>
                      </div>
                      {log.browser && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {log.browser}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(log.status)}
                    </td>

                  </tr>
                );
              })}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <History className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    <p className="font-bold text-sm text-slate-600 dark:text-slate-300">
                      {isAr ? 'لا توجد سجلات نشاط مطابقة لمعايير البحث' : 'No activity logs matching criteria'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {isAr ? 'جرب تغيير فلاتر البحث أو اختيار مستخدم آخر.' : 'Try adjusting the search query or user filter.'}
                    </p>
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
