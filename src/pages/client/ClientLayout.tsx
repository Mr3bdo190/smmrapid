import { useState } from 'react';
import { useLocation, Link, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { useTranslation, LanguageSwitcher, ThemeToggle } from '../../lib/i18n';
import {
  Banknote, Bell, Code, Gamepad2, Gift, Layers, LayoutDashboard, LifeBuoy, Link2, ListOrdered,
  LogOut, Menu, Plus, Receipt, RefreshCw, Search, ShieldCheck, ShoppingCart, Tags, Ticket,
  User, Users, Wallet, X, Zap,
} from 'lucide-react';
import { BrandLogo } from '../../components/BrandLogo';
import { cn } from '../../lib/utils';
import { useLiveUpdates } from '../../lib/useLive';

type NavGroup = 'main' | 'growth' | 'account';

type NavItem = {
  key: string;
  href: string;
  icon: any;
  group: NavGroup;
  badge?: 'api' | 'orders' | 'tickets';
};

const navItems: NavItem[] = [
  { key: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'main' },
  { key: 'nav.newOrder', href: '/dashboard/new-order', icon: ShoppingCart, group: 'main' },
  { key: 'nav.services', href: '/dashboard/services', icon: Tags, group: 'main' },
  { key: 'nav.orderHistory', href: '/dashboard/orders', icon: ListOrdered, group: 'main', badge: 'orders' },
  { key: 'nav.massOrder', href: '/dashboard/mass-order', icon: Layers, group: 'main' },
  { key: 'nav.addFunds', href: '/dashboard/add-funds', icon: Wallet, group: 'main' },
  { key: 'nav.transactions', href: '/dashboard/transactions', icon: Receipt, group: 'main' },
  { key: 'nav.api', href: '/dashboard/api', icon: Code, group: 'growth', badge: 'api' },
  { key: 'nav.affiliates', href: '/dashboard/affiliates', icon: Users, group: 'growth' },
  { key: 'nav.earnMoney', href: '/dashboard/earn', icon: Link2, group: 'growth' },
  { key: 'nav.tickets', href: '/dashboard/tickets', icon: LifeBuoy, group: 'account', badge: 'tickets' },
  { key: 'nav.profile', href: '/dashboard/profile', icon: User, group: 'account' },
  { key: 'nav.lottery', href: '/dashboard/lottery', icon: Ticket, group: 'account' },
  { key: 'nav.mysteryBoxes', href: '/dashboard/mystery-boxes', icon: Gift, group: 'account' },
  { key: 'nav.game', href: '/dashboard/game', icon: Gamepad2, group: 'account' },
];

const GROUPS: { key: NavGroup; en: string; ar: string }[] = [
  { key: 'main', en: 'Ordering & wallet', ar: 'الطلب والرصيد' },
  { key: 'growth', en: 'Growth & earnings', ar: 'النمو والأرباح' },
  { key: 'account', en: 'Account & support', ar: 'الحساب والدعم' },
];

export default function ClientLayout() {
  const { user, dbUser, loading, authError, logOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, dir, lang } = useTranslation();
  const qc = useQueryClient();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ar = dir === 'rtl';

  // Live: balance, orders and badges update the moment the server changes.
  useLiveUpdates();

  const { data: config } = useQuery({
    queryKey: ['client-config'],
    queryFn: async () => {
      const res = await apiFetch('/api/client/config', user);
      return res.ok ? res.json() : {};
    },
  });

  const { data: health } = useQuery({
    queryKey: ['api-health'],
    queryFn: async () => {
      const res = await apiFetch('/api/health', user);
      return res.ok ? res.json() : { ok: false };
    },
    refetchInterval: 60_000,
  });

  const { data: notificationData, refetch: refetchNotifications } = useQuery({
    queryKey: ['client-notifications'],
    queryFn: async () => {
      const res = await apiFetch('/api/client/notifications', user);
      return res.ok ? res.json() : { notifications: [], unread: 0 };
    },
    enabled: !!user,
    refetchInterval: 60_000, // safety net; live pushes arrive immediately
  });

  const { data: freshUser } = useQuery({
    queryKey: ['client-me'],
    queryFn: async () => {
      const res = await apiFetch('/api/client/me', user);
      if (!res.ok) throw new Error('Unable to load account');
      return res.json();
    },
    enabled: !!user,
    staleTime: 10_000,
    refetchInterval: 60_000,
  });

  // Shared with the dashboard page, so no extra request when both are mounted.
  const { data: overview } = useQuery({
    queryKey: ['client-dashboard'],
    queryFn: async () => {
      const res = await apiFetch('/api/client/dashboard', user);
      return res.ok ? res.json() : {};
    },
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const account = freshUser || dbUser;
  const currency = config?.currencySymbol || '$';
  const balance = Number(account?.balance || 0).toFixed(2);
  const activeOrders = Number(overview?.activeOrders ?? ((overview?.ordersByStatus?.pending || 0) + (overview?.ordersByStatus?.processing || 0) + (overview?.ordersByStatus?.['in progress'] || 0))) || 0;
  const openTickets = Number(overview?.openTickets || 0);
  const unread = Number(notificationData?.unread || 0);

  if (loading) return <div className="rapid-auth-screen"><div className="rapid-auth-loader"><BrandLogo size={40} /><div className="rapid-spinner"/><strong>{t('common.loading')}</strong><small>{ar ? 'بنثبّت جلستك…' : 'Securing your session…'}</small></div></div>;
  if (!user) return <Navigate to="/" replace />;
  if (!dbUser) {
    return (
      <div className="rapid-auth-screen p-4">
        <div className="rapid-auth-loader rapid-auth-error">
          <div className="mb-5 flex justify-center"><BrandLogo size={40} /></div>
          <h1 className="font-display text-2xl font-bold text-on-surface">{ar ? 'بنجهّز جلستك' : 'Finishing your secure session'}</h1>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">{ar ? 'تسجيل الدخول سليم، وبنجهّز بيانات حسابك. مفيش أي تغيير حصل.' : 'Your login is valid. We’re reconnecting your account data. Nothing has been changed.'}</p>
          {user && authError?.code && <p className="mt-3 font-mono text-xs text-amber-600 dark:text-amber-400">{ar ? 'كود مؤقت:' : 'Temporary sync code:'} {authError.code}</p>}
          <div className="mt-6 flex justify-center gap-3">
            {user ? <button onClick={() => window.location.reload()} className="btn-primary"><RefreshCw className="h-4 w-4" /> {ar ? 'إعادة المحاولة' : 'Retry'}</button> : <Link to="/" className="btn-primary">{ar ? 'العودة للرئيسية' : 'Return home'}</Link>}
            {user && <button onClick={logOut} className="btn-ghost">{t('common.signOut')}</button>}
          </div>
        </div>
      </div>
    );
  }

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = search.trim();
    setIsMobileMenuOpen(false);
    navigate(term ? `/dashboard/services?q=${encodeURIComponent(term)}` : '/dashboard/services');
  };

  const openNotification = async (n: any) => {
    setNotificationsOpen(false);
    if (!n.readAt) {
      try { await apiFetch(`/api/client/notifications/${n.id}/read`, user, { method: 'PUT' }); } catch { /* already gone */ }
      refetchNotifications();
      qc.invalidateQueries({ queryKey: ['client-notifications'] });
    }
    if (n.link) navigate(n.link);
  };

  const badgeFor = (item: NavItem) => {
    if (item.badge === 'api') return 'API v2';
    if (item.badge === 'orders' && activeOrders > 0) return String(activeOrders);
    if (item.badge === 'tickets' && openTickets > 0) return String(openTickets);
    return '';
  };

  return (
    <div className="rapid-app-shell">
      {isMobileMenuOpen && <div className="fixed inset-0 z-20 bg-black/60 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}

      {/* ─── Rail ─────────────────────────────────────────────────────────── */}
      <aside className={cn(
        'client-rail fixed inset-y-0 z-40 flex flex-col transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0',
        dir === 'rtl' ? 'right-0 border-l' : 'left-0 border-r',
        isMobileMenuOpen ? 'translate-x-0' : (dir === 'rtl' ? 'translate-x-full' : '-translate-x-full'),
      )}>
        <div className="client-rail-head flex h-16 shrink-0 items-center gap-2.5 px-4">
          <BrandLogo size={30} />
          <span className="text-[15px] font-black tracking-tight text-white">SMM<span className="text-violet-400">Rapid</span></span>
          <button onClick={() => setIsMobileMenuOpen(false)} className="ms-auto text-white/50 hover:text-white md:hidden" aria-label={ar ? 'إغلاق' : 'Close'}><X className="h-5 w-5" /></button>
        </div>

        {/* wallet + the two actions people actually repeat */}
        <div className="shrink-0 px-3 py-3">
          <div className="client-wallet-card">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-[.12em] text-white/60">{t('common.currentBalance')}</span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-white/70">
                <span className={cn('h-1.5 w-1.5 rounded-full', health?.ok ? 'bg-emerald-400' : 'bg-red-400')} />
                {health?.ok ? (ar ? 'متصل' : 'Live') : (ar ? 'غير متصل' : 'Offline')}
              </span>
            </div>
            <p className="client-wallet-value">
              {currency}{balance}
              <span className="ms-1 text-[11px] font-bold text-white/45">{config?.currencyCode || 'USD'}</span>
            </p>
            <div className="mt-2.5 flex gap-2">
              <Link to="/dashboard/add-funds" onClick={() => setIsMobileMenuOpen(false)}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-violet-500 px-2 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-violet-400">
                <Plus className="h-3.5 w-3.5" />{t('nav.addFunds')}
              </Link>
              <Link to="/dashboard/new-order" onClick={() => setIsMobileMenuOpen(false)}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white/10 px-2 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-white/20">
                <Zap className="h-3.5 w-3.5" />{t('nav.newOrder')}
              </Link>
            </div>
          </div>
        </div>

        <nav className="client-rail-nav min-h-0 flex-1 overflow-y-auto pb-2">
          {GROUPS.map(group => (
            <div key={group.key} className="client-nav-group">
              <div className="client-nav-group-label">{ar ? group.ar : group.en}</div>
              {navItems.filter(i => i.group === group.key).map(item => {
                const isActive = location.pathname === item.href;
                const chip = badgeFor(item);
                return (
                  <Link key={item.key} to={item.href} onClick={() => setIsMobileMenuOpen(false)}
                    className={cn('client-nav-link', isActive && 'is-active')} aria-current={isActive ? 'page' : undefined}>
                    <span className="client-nav-icon"><item.icon className="h-[17px] w-[17px]" /></span>
                    <span className="truncate">{t(item.key)}</span>
                    {chip && <span className="client-nav-chip">{chip}</span>}
                  </Link>
                );
              })}
            </div>
          ))}

          {dbUser.isAdmin && (
            <div className="client-nav-group">
              <div className="client-nav-group-label">{ar ? 'الإدارة' : 'Administration'}</div>
              <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="client-nav-link">
                <span className="client-nav-icon"><ShieldCheck className="h-[17px] w-[17px]" /></span>
                <span className="truncate">{ar ? 'لوحة الأدمن' : 'Admin console'}</span>
              </Link>
            </div>
          )}
        </nav>

        <div className="client-rail-foot shrink-0 px-3 py-3">
          <div className="flex items-center gap-2.5 rounded-xl bg-white/[.04] px-3 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/25 text-sm font-bold text-violet-200">
              {(account?.email || 'R')[0].toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-bold text-white">{account?.name || account?.email?.split('@')[0]}</span>
              <span className="block truncate font-mono text-[10px] text-white/45">{account?.email}</span>
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <ThemeToggle className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.06] p-0 text-white/70 hover:bg-white/[.12] hover:text-white" />
            <LanguageSwitcher className="h-9 flex-1 justify-center rounded-xl border border-white/10 text-white/70 hover:bg-white/[.08] hover:text-white" />
            <button onClick={logOut} title={t('common.signOut')} aria-label={t('common.signOut')}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.06] text-white/70 transition-colors hover:bg-red-500/20 hover:text-red-300">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── Column ───────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col md:ps-64">
        <header className="rapid-topbar fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between gap-3 px-4 md:ps-64">
          <div className="flex flex-1 items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-on-surface-variant hover:text-on-surface md:hidden" aria-label={ar ? 'القائمة' : 'Menu'}><Menu className="h-5 w-5" /></button>
            <form onSubmit={submitSearch} className="relative w-full max-w-md">
              <Search className="absolute start-3 top-1/2 h-[18px] w-[18px] shrink-0 -translate-y-1/2 text-outline" />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-transparent bg-surface-container ps-10 pe-3 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder={t('client.globalSearchPlaceholder')}
              />
            </form>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-xl bg-surface-container px-3 py-1.5 sm:flex">
              <Banknote className="h-[18px] w-[18px] shrink-0 text-tertiary" />
              <span className="flex flex-col leading-none">
                <span className="text-[10px] text-on-surface-variant">{t('common.currentBalance')}</span>
                <span className="font-mono text-sm font-bold tabular-nums text-on-surface">{currency}{balance}</span>
              </span>
              <Link to="/dashboard/add-funds" className="ms-1 flex h-6 w-6 items-center justify-center rounded-lg bg-surface-container-high text-tertiary transition-colors hover:bg-surface-bright" aria-label={t('nav.addFunds')}>
                <Plus className="h-4 w-4" />
              </Link>
            </div>

            <Link to="/dashboard/new-order" className="inline-flex items-center gap-1 rounded-xl bg-primary-container px-3 py-2.5 text-sm font-bold text-on-primary-container transition-colors hover:bg-primary">
              <Zap className="h-[18px] w-[18px] shrink-0" />
              <span className="hidden sm:inline">{t('nav.newOrder')}</span>
            </Link>

            <div className="relative">
              <button
                aria-label={t('notifications.title')}
                onClick={() => setNotificationsOpen(v => !v)}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
              >
                <Bell className="h-[18px] w-[18px] shrink-0" />
                {unread > 0 && (
                  <span className="absolute -end-1 -top-1 min-w-[18px] rounded-full bg-error px-1 text-center font-mono text-[10px] font-bold leading-[18px] text-white">{unread > 99 ? '99+' : unread}</span>
                )}
              </button>
              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                  <div className="absolute end-0 z-50 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-xl border border-outline-variant bg-surface-container shadow-2xl">
                    <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
                      <b className="text-sm font-bold text-on-surface">{t('notifications.title')} {unread > 0 && <span className="text-error">({unread})</span>}</b>
                      <button className="text-xs font-bold text-primary hover:underline"
                        onClick={async () => { await apiFetch('/api/client/notifications/read-all', user, { method: 'PUT' }); refetchNotifications(); }}>
                        {t('notifications.markAll')}
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {(notificationData?.notifications || []).length === 0
                        ? <p className="p-4 text-sm text-on-surface-variant">{t('notifications.empty')}</p>
                        : (notificationData.notifications || []).map((n: any) => (
                          <button key={n.id} onClick={() => openNotification(n)}
                            className="flex w-full items-start gap-3 border-b border-outline-variant px-4 py-3 text-start transition-colors last:border-0 hover:bg-surface-container-high">
                            <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.readAt ? 'bg-outline' : 'bg-error')} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-bold text-on-surface">{n.title}</span>
                              <span className="mt-0.5 block text-xs leading-relaxed text-on-surface-variant">{n.message}</span>
                              <span className="mt-1 block font-mono text-[10px] text-on-surface-variant/80">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</span>
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <ThemeToggle className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container p-0 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface" />
          </div>
        </header>

        <div className="rapid-content mt-16 flex-1 overflow-y-auto">
          <div className="client-page-frame mx-auto w-full max-w-[1480px]"><Outlet /></div>
        </div>

        <nav className="rapid-mobile-nav md:hidden">
          {navItems.slice(0, 5).map(item => (
            <Link key={item.key} to={item.href} className={location.pathname === item.href ? 'active' : ''}>
              <item.icon /><span>{t(item.key)}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
