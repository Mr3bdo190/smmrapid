import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { Wallet, ShoppingCart, TrendingUp, RefreshCw, AlertCircle, ArrowRight, CreditCard, Headphones, Clock3, CheckCircle2, XCircle, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../lib/i18n';

const money = (v:any) => `$${Number(v || 0).toFixed(2)}`;
const statusClass:any = { 
  Pending: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  'Processing': 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  'In Progress': 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  Completed: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
  Partial: 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300',
  Canceled: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  Refunded: 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300' 
};

export default function ClientDashboard() {
  const { user, dbUser } = useAuth();
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['client-dashboard'],
    queryFn: async () => { const token = await user?.getIdToken(); const res = await apiFetch('/api/client/dashboard', user, { headers:{Authorization:`Bearer ${token}`} }); if(!res.ok) throw new Error('dashboard'); return res.json(); },
    enabled: !!user,
    refetchInterval: 30000,
  });
  if (isLoading) return <div className="p-6 text-gray-500 dark:text-gray-400 flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> {t('dashboard.loading')}</div>;
  if (isError) return <div className="p-6"><div className="rounded-2xl border border-rose-100 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-900/20 p-5 text-rose-700 dark:text-rose-300 flex items-center justify-between"><span className="flex items-center gap-2"><AlertCircle className="w-5 h-5"/>{t('dashboard.error')}</span><button onClick={()=>refetch()} className="btn-primary">{t('common.retry') || 'Retry'}</button></div></div>;
  const displayName = dbUser?.name || dbUser?.email?.split('@')[0] || t('common.user');
  const s=data?.ordersByStatus||{};
  return <div className="space-y-6">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100 tracking-tight">{t('dashboard.welcome',{name:displayName})}!</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('dashboard.overview')}</p></div><button onClick={()=>refetch()} className="btn-ghost inline-flex items-center gap-2 self-start dark:text-gray-300 dark:hover:bg-gray-700"><RefreshCw className={`w-4 h-4 ${isFetching?'animate-spin':''}`}/>Refresh</button></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-5 shadow-lg text-white"><p className="text-indigo-100 text-sm">{t('common.currentBalance')}</p><h3 className="text-3xl font-black mt-1">{money(dbUser?.balance)}</h3><Link to="/dashboard/add-funds" className="mt-4 inline-flex items-center text-sm bg-white/20 px-3 py-1.5 rounded-lg">{t('nav.addFunds')} <ArrowRight className="w-4 h-4 ml-1"/></Link></div>
      <Stat icon={ShoppingCart} label={t('dashboard.totalOrders')} value={data?.totalOrders||0}/><Stat icon={TrendingUp} label={t('dashboard.totalSpent')} value={money(data?.totalSpent)}/><Stat icon={CreditCard} label={t('dashboard.totalFunded') || 'Total funded'} value={money(data?.totalFunded)}/>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <Mini icon={Clock3} label={t('status.pending') || 'Pending'} value={s.pending}/><Mini icon={Activity} label={t('status.processing') || 'Processing'} value={s.processing}/><Mini icon={CheckCircle2} label={t('status.completed') || 'Completed'} value={s.completed}/><Mini icon={TrendingUp} label={t('status.partial') || 'Partial'} value={s.partial}/><Mini icon={XCircle} label={t('status.canceled') || 'Canceled'} value={s.canceled}/><Mini icon={Wallet} label={t('status.refunded') || 'Refunded'} value={s.refunded}/>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5"><div className="flex justify-between items-center mb-4"><div><h3 className="font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100">{t('dashboard.recentOrders') || 'Recent orders'}</h3><p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('dashboard.recentOrdersSubtitle') || 'Your latest service activity'}</p></div><Link className="text-sm font-bold text-violet-600" to="/dashboard/orders">{t('common.viewAll') || 'View all'}</Link></div><div className="space-y-2">{(data?.recentOrders||[]).length===0?<p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">No orders yet. <Link className="text-violet-600 dark:text-violet-400 font-bold" to="/dashboard/new-order">Create your first order</Link></p>:(data.recentOrders||[]).map((o:any)=><div key={o.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-slate-800 p-3"><div className="min-w-0"><p className="font-semibold text-sm text-slate-800 dark:text-gray-200 truncate">{o.serviceName}</p><p className="text-xs text-slate-500 dark:text-gray-400">#{String(o.id).slice(0,8)} · Qty {o.quantity} · Remains {o.remains||0}</p></div><div className="text-right"><span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-bold ${statusClass[o.status]||'bg-slate-100 text-slate-600'}`}>{o.status}</span><p className="text-xs font-bold mt-1 dark:text-gray-300">{money(o.charge)}</p></div></div>)}</div></div>
      <div className="space-y-5"><div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5"><h3 className="font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100 mb-4">{t('dashboard.quickActions') || 'Quick actions'}</h3><div className="grid grid-cols-2 gap-2"><Quick to="/dashboard/new-order" text={t('nav.newOrder')}/><Quick to="/dashboard/add-funds" text={t('nav.addFunds')}/><Quick to="/dashboard/services" text={t('nav.services')}/><Quick to="/dashboard/tickets" text={t('nav.tickets')}/></div></div><div className="grid grid-cols-2 gap-3"><Info icon={Headphones} label="Open tickets" value={data?.openTickets||0}/><Info icon={AlertCircle} label="Notifications" value={data?.unreadNotifications||0}/></div></div>
    </div>
  </div>;
}
function Stat({icon:Icon,label,value}:any){return <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700"><div className="p-2.5 bg-slate-50 dark:bg-slate-700 text-violet-600 dark:text-violet-400 rounded-xl w-11 h-11 flex items-center justify-center"><Icon className="w-5 h-5"/></div><p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-4">{label}</p><h3 className="text-2xl font-black text-gray-900 dark:text-gray-100 dark:text-gray-100 mt-1">{value}</h3></div>}
function Mini({icon:Icon,label,value}:any){return <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-3"><div className="flex items-center gap-2 text-slate-500 dark:text-slate-400"><Icon className="w-4 h-4"/><span className="text-xs font-semibold">{label}</span></div><div className="text-xl font-black text-gray-900 dark:text-gray-100 dark:text-gray-100 mt-2">{value||0}</div></div>}
function Info({icon:Icon,label,value}:any){return <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4"><Icon className="w-5 h-5 text-violet-600 dark:text-violet-400"/><p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{label}</p><b className="text-xl text-gray-900 dark:text-gray-100 dark:text-gray-100">{value}</b></div>}
function Quick({to,text}:any){return <Link to={to} className="rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-3 text-center text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-violet-300 dark:hover:border-violet-400 hover:text-violet-600">{text}</Link>}
