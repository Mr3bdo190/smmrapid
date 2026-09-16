import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { useTranslation } from '../../lib/i18n';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell, LabelList } from 'recharts';
import { Users, ShoppingCart, Wallet, RefreshCw, AlertCircle, Server, ListOrdered, Headphones, CreditCard, Activity, Calendar, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

const money = (v: any) => '$' + Number(v || 0).toFixed(2);

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  processing: '#3B82F6',
  completed: '#10B981',
  cancelled: '#EF4444',
  refunded: '#8B5CF6',
};

const STATUS_TITLES: Record<string, { en: string; ar: string }> = {
  pending: { en: 'Pending', ar: 'معلق' },
  processing: { en: 'Processing', ar: 'قيد المعالجة' },
  completed: { en: 'Completed', ar: 'مكتمل' },
  cancelled: { en: 'Cancelled', ar: 'ملغي' },
  refunded: { en: 'Refunded', ar: 'مسترد' },
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { t, dir } = useTranslation();
  const [period, setPeriod] = useState<'7' | '30'>('30');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const r = await apiFetch('/api/admin/stats', user, { headers: { Authorization: 'Bearer ' + token } });
      if (!r.ok) throw new Error('stats');
      return r.json();
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: ordersOverTime, refetch: refetchOrders } = useQuery({
    queryKey: ['orders-over-time', period],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const r = await apiFetch('/api/admin/analytics/orders-over-time?days=' + period, user, { headers: { Authorization: 'Bearer ' + token } });
      if (!r.ok) throw new Error('analytics');
      return r.json();
    },
    enabled: !!user,
  });

  const { data: ordersByStatus } = useQuery({
    queryKey: ['orders-by-status'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const r = await apiFetch('/api/admin/analytics/orders-by-status', user, { headers: { Authorization: 'Bearer ' + token } });
      if (!r.ok) throw new Error('status');
      return r.json();
    },
    enabled: !!user,
  });

  const { data: topServices } = useQuery({
    queryKey: ['top-services'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const r = await apiFetch('/api/admin/analytics/top-services', user, { headers: { Authorization: 'Bearer ' + token } });
      if (!r.ok) throw new Error('services');
      return r.json();
    },
    enabled: !!user,
  });

  const handleExport = async () => {
    try {
      const token = await user?.getIdToken();
      const r = await apiFetch('/api/admin/analytics/export?days=' + period, user, {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (!r.ok) throw new Error('export failed');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'analytics-export-' + new Date().toISOString().split('T')[0] + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRefresh = () => {
    refetch();
    refetchOrders();
  };

  if (isLoading) return <div className="p-6 text-gray-500 dark:text-gray-400 flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" />{t('admin.dashboard.loading')}</div>;
  if (isError) return <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 flex items-center justify-between"><span className="flex gap-2"><AlertCircle />{t('admin.dashboard.error')}</span><button onClick={() => refetch()} className="btn-primary">{t('admin.dashboard.retry')}</button></div>;

  const trend = (current: number, previous: number) => {
    if (previous === 0) return 'noChange';
    const pct = ((current - previous) / previous) * 100;
    if (pct > 0) return 'up';
    if (pct < 0) return 'down';
    return 'noChange';
  };

  const ordersData = (ordersOverTime || []).map((d: any) => ({
    name: d.day,
    orders: d.count,
    revenue: d.revenue,
  }));

  const statusData = (ordersByStatus || []).map((d: any) => ({
    name: STATUS_TITLES[d.status]?.[dir as 'en' | 'ar'] || d.status,
    value: d.count,
    color: STATUS_COLORS[d.status] || '#9CA3AF',
  }));

  const servicesData = (topServices || []).slice(0, 5).map((d: any) => ({
    name: d.name?.length > 20 ? d.name.substring(0, 20) + '...' : d.name,
    orders: d.order_count,
    revenue: d.revenue,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{t('admin.dashboard.analytics')}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('admin.dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
            <Calendar className="w-3 h-3 text-gray-500 dark:text-gray-400 ml-1" />
            <button
              onClick={() => setPeriod('7')}
              className={'px-2 py-1 text-xs font-medium rounded ' + (period === '7' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200')}
            >
              {t('admin.dashboard.days7')}
            </button>
            <button
              onClick={() => setPeriod('30')}
              className={'px-2 py-1 text-xs font-medium rounded ' + (period === '30' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200')}
            >
              {t('admin.dashboard.days30')}
            </button>
          </div>
          <button onClick={handleExport} className="btn-ghost flex items-center gap-2 dark:text-gray-300 dark:hover:bg-gray-700">
            <Download className="w-4 h-4" />
            {t('admin.dashboard.export')}
          </button>
          <button onClick={handleRefresh} className="btn-ghost flex items-center gap-2 dark:text-gray-300 dark:hover:bg-gray-700">
            <RefreshCw className={'w-4 h-4' + (isFetching ? ' animate-spin' : '')} />
          {t('admin.dashboard.refresh')}
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Users} title={t('admin.dashboard.totalUsers')} value={data.totalUsers} subtitle={data.activeUsers + ' ' + t('admin.dashboard.active')} />
        <StatCard icon={Activity} title={t('admin.dashboard.activeUsers')} value={data.activeUsers} subtitle={t('admin.dashboard.active')} />
        <StatCard icon={ShoppingCart} title={t('admin.dashboard.totalOrders')} value={data.totalOrders} subtitle={data.pendingOrders + ' ' + t('admin.dashboard.pending')} />
        <StatCard icon={Wallet} title={t('admin.dashboard.totalRevenue')} value={money(data.totalRevenue)} subtitle={trend(data.todayRevenue, data.yesterdayRevenue) === 'up' ? t('admin.dashboard.increase') : t('admin.dashboard.decrease')} />
      </div>

      {/* Small Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SmallStat title={t('admin.dashboard.pendingOrders')} value={data.pendingOrders} href="/admin/orders" />
        <SmallStat title={t('admin.dashboard.pendingPayments')} value={data.pendingPayments} href="/admin/payments" />
        <SmallStat title={t('admin.dashboard.openTickets')} value={data.openTickets} href="/admin/tickets" />
        <SmallStat title={t('admin.dashboard.activeServices')} value={data.activeServices} href="/admin/services" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Orders & Revenue Line Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">{t('admin.dashboard.ordersChart')}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={ordersData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-color, #e2e8f0)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--axis-color, #94a3b8)' }} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--axis-color, #94a3b8)' }} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--axis-color, #94a3b8)' }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px' }}
                labelStyle={{ fontSize: '11px' }}
                formatter={(value: any, name: string) => name === t('admin.dashboard.revenue') ? [money(value), name] : [value, name]}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Line yAxisId="left" type="monotone" dataKey="orders" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} name={t('admin.dashboard.orders')} activeDot={{ r: 5 }} />
              <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} name={t('admin.dashboard.revenue')} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Pie Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">{t('admin.dashboard.ordersByStatus')}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                nameKey="name"
                label={({ name, value }: any) => `${name}: ${value}`}
                labelLine={false}
              >
                {statusData.map((_, i) => (
                  <Cell key={'cell-' + i} fill={statusData[i]?.color || '#CBD5E1'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Services Bar Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">{t('admin.dashboard.topServices')}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={servicesData} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-color, #e2e8f0)" horizontal={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--axis-color, #94a3b8)' }} />
              <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--axis-color, #94a3b8)' }} width={80} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px' }}
                labelStyle={{ fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="orders" fill="#3B82F6" name={t('admin.dashboard.orders')} radius={[0, 4, 4, 0]} />
              <Bar dataKey="revenue" fill="#10B981" name={t('admin.dashboard.revenue')} radius={[0, 4, 4, 0]} />
              <LabelList dataKey="orders" position="right" style={{ fontSize: '10px', fill: 'var(--axis-color, #94a3b8)' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Today + Platform Status */}
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">{t('admin.dashboard.today')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <Metric label={t('admin.dashboard.ordersToday')} value={data.todayOrders} icon={ShoppingCart} />
              <Metric label={t('admin.dashboard.revenueToday')} value={money(data.todayRevenue)} icon={Wallet} />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">{t('admin.dashboard.platformStatus')}</h3>
            <div className="space-y-3">
              <StatusLine icon={Server} label={t('admin.dashboard.activeProviders')} value={data.activeProviders} />
              <StatusLine icon={ListOrdered} label={t('admin.dashboard.activeServices')} value={data.activeServices} />
              <StatusLine icon={CreditCard} label={t('admin.dashboard.successfulPayments')} value={data.totalPayments} />
              <StatusLine icon={Headphones} label={t('admin.dashboard.openTickets')} value={data.openTickets} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Management */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">{t('admin.dashboard.quickManagement')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link className="btn-ghost justify-between dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-gray-600" to="/admin/orders">{t('admin.dashboard.orders')} <ArrowRightIcon /></Link>
          <Link className="btn-ghost justify-between dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-gray-600" to="/admin/users">{t('admin.dashboard.users')} <ArrowRightIcon /></Link>
          <Link className="btn-ghost justify-between dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-gray-600" to="/admin/providers">{t('admin.dashboard.providers')} <ArrowRightIcon /></Link>
          <Link className="btn-ghost justify-between dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-gray-600" to="/admin/reports">{t('admin.dashboard.reports')} <ArrowRightIcon /></Link>
        </div>
      </div>
    </div>
  );
}

function ArrowRightIcon() {
  return <Activity className="w-4 h-4 text-gray-400 dark:text-gray-500" />;
}

function StatCard({ icon: Icon, title, value, subtitle }: { icon: any; title: string; value: any; subtitle?: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-slate-700 flex items-center gap-4">
      <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100 mt-1">{value}</h3>
        {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

function SmallStat({ title, value, href }: { title: string; value: any; href: string }) {
  return (
    <Link to={href} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 hover:border-indigo-200 dark:hover:border-indigo-500 transition-colors">
      <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
      <b className="text-2xl mt-1 block text-gray-900 dark:text-gray-100">{value || 0}</b>
    </Link>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: any; icon: any }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4">
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
        <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
      <b className="text-2xl text-gray-900 dark:text-gray-100">{value}</b>
    </div>
  );
}

function StatusLine({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
      <span className="flex items-center gap-2 text-sm">
        <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        {label}
      </span>
      <b className="text-gray-900 dark:text-gray-100">{value || 0}</b>
    </div>
  );
}
