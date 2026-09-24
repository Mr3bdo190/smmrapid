import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Activity,
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
  RefreshCw
} from 'lucide-react';

export const AdminLogsTab: React.FC = () => {
  const {
    language,
    activityLogs
  } = useApp();

  const isAr = language === 'ar';

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredLogs = activityLogs.filter((log) => {
    const matchesSearch =
      log.messageAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.messageEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.user && log.user.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.ip && log.ip.includes(searchTerm)) ||
      log.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || log.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const exportLogsAsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activityLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `smm-rapid-logs-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-500" />
            <span>{isAr ? 'سجل العمليات والتحركات اللحظية للموقع' : 'Live Platform Audit & Activity Logs'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {isAr
              ? 'مراقبة شاملة ولحظية لجميع التحركات: شحن المحافظ، طلبات الخدمات، تعديلات الإدارة، وتسجيلات الدخول.'
              : 'Real-time telemetry and auditing of wallet deposits, order creations, admin actions, and logins.'}
          </p>
        </div>

        <button
          onClick={exportLogsAsJson}
          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto shadow-xs"
        >
          <Download className="w-3.5 h-3.5 text-blue-500" />
          <span>{isAr ? 'تصدير السجل JSON' : 'Export Logs JSON'}</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-3" />
          <input
            type="text"
            placeholder={isAr ? 'بحث بالحدث، المستخدم، عنوان IP، أو المبلغ...' : 'Search logs by action, user, IP, or amount...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl ps-10 pe-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">{isAr ? 'جميع العمليات (All Events)' : 'All Events'}</option>
          <option value="deposit">{isAr ? 'شحن المحافظ (Deposits)' : 'Deposits'}</option>
          <option value="order">{isAr ? 'طلبات الخدمات (Orders)' : 'Orders'}</option>
          <option value="admin">{isAr ? 'إجراءات المشرف (Admin Actions)' : 'Admin Actions'}</option>
          <option value="user">{isAr ? 'حسابات المستخدمين (Users)' : 'Users'}</option>
        </select>

      </div>

      {/* Logs Stream List */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            {isAr ? 'لا توجد عمليات مسجلة تطابق البحث' : 'No logs found'}
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isDeposit = log.type === 'deposit';
            const isOrder = log.type === 'order';
            const isAdmin = log.type === 'admin';

            return (
              <div
                key={log.id}
                className="p-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isDeposit
                        ? 'bg-amber-500/10 text-amber-500'
                        : isOrder
                        ? 'bg-cyan-500/10 text-cyan-500'
                        : isAdmin
                        ? 'bg-rose-500/10 text-rose-500'
                        : 'bg-blue-500/10 text-blue-500'
                    }`}
                  >
                    {isDeposit ? (
                      <Coins className="w-4 h-4" />
                    ) : isOrder ? (
                      <ShoppingCart className="w-4 h-4" />
                    ) : isAdmin ? (
                      <Shield className="w-4 h-4" />
                    ) : (
                      <Activity className="w-4 h-4" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 dark:text-white leading-relaxed">
                      {isAr ? log.messageAr : log.messageEn}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      {log.user && (
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                          {isAr ? 'المستخدم: ' : 'User: '}<strong>{log.user}</strong>
                        </span>
                      )}
                      {log.ip && (
                        <span className="font-mono text-[10px]">
                          IP: {log.ip}
                        </span>
                      )}
                      <span className="font-mono text-[10px]">
                        ID: {log.id}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  {log.amount && (
                    <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                      +${log.amount.toFixed(2)}
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    <span>{log.timestamp}</span>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
