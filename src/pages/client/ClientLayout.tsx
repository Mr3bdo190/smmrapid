import { useState } from 'react';
import { useLocation, Link, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { useTranslation, LanguageSwitcher, ThemeToggle, translations } from '../../lib/i18n';
import {
  LayoutDashboard, ShoppingCart, ListOrdered, Wallet, LogOut, Menu, X, User, Ticket,
  LifeBuoy, Tags, Link2, Code, Users, Gift, Gamepad2, RefreshCw, Layers, Receipt, ShieldCheck,
} from 'lucide-react';
import { BrandLogo } from '../../components/BrandLogo';
import { cn } from '../../lib/utils';

type NavItem = {
  key: string;
  href: string;
  icon: any;
  group: 'operations' | 'integration' | 'system';
  badge?: 'api' | 'dot';
};

const navItems: NavItem[] = [
  { key: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'operations' },
  { key: 'nav.newOrder', href: '/dashboard/new-order', icon: ShoppingCart, group: 'operations' },
  { key: 'nav.orderHistory', href: '/dashboard/orders', icon: ListOrdered, group: 'operations' },
  { key: 'nav.massOrder', href: '/dashboard/mass-order', icon: Layers, group: 'operations' },
  { key: 'nav.services', href: '/dashboard/services', icon: Tags, group: 'operations' },
  { key: 'nav.addFunds', href: '/dashboard/add-funds', icon: Wallet, group: 'operations' },
  { key: 'nav.transactions', href: '/dashboard/transactions', icon: Receipt, group: 'operations' },
  { key: 'nav.api', href: '/dashboard/api', icon: Code, group: 'integration', badge: 'api' },
  { key: 'nav.earnMoney', href: '/dashboard/earn', icon: Link2, group: 'integration' },
  { key: 'nav.affiliates', href: '/dashboard/affiliates', icon: Users, group: 'integration' },
  { key: 'nav.tickets', href: '/dashboard/tickets', icon: LifeBuoy, group: 'system' },
  { key: 'nav.profile', href: '/dashboard/profile', icon: User, group: 'system' },
  { key: 'nav.lottery', href: '/dashboard/lottery', icon: Ticket, group: 'system' },
  { key: 'nav.mysteryBoxes', href: '/dashboard/mystery-boxes', icon: Gift, group: 'system' },
  { key: 'nav.game', href: '/dashboard/game', icon: Gamepad2, group: 'system' },
];

const GROUP_LABEL: Record<NavItem['group'], { en: string; ar: string }> = {
  operations: { en: 'Operations', ar: 'العمليات' },
  integration: { en: 'Integration', ar: 'الربط والتكامل' },
  system: { en: 'System Control', ar: 'التحكم بالنظام' },
};

export default function ClientLayout() {
  const { user, dbUser, loading, authError, logOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, dir, lang } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: config } = useQuery({
    queryKey: ['client-config'],
    queryFn: async () => {
      const res = await apiFetch('/api/client/config', user);
      return res.ok ? res.json() : {};
    }
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
    queryFn: async () => { const token = await user?.getIdToken(); const res = await apiFetch('/api/client/notifications', user, { headers: { Authorization: `Bearer ${token}` } }); return res.ok ? res.json() : { notifications: [], unread: 0 }; },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: freshUser } = useQuery({
    queryKey: ['client-me'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/client/me', user, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Unable to load account');
      return res.json();
    },
    enabled: !!user,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  /** Secondary-language subtitle, mirroring the bilingual rail in the design. */
  const alt = (key: string) => {
    const entry = (translations as any)[key];
    if (!entry) return '';
    return lang === 'ar' ? entry.en : entry.ar;
  };

  const account = freshUser || dbUser;

  if (loading) return <div className="rapid-auth-screen"><div className="rapid-auth-loader"><BrandLogo size={40} /><div className="rapid-spinner"/><strong>{t('common.loading')}</strong><small>Securing your session…</small></div></div>;
  if (!user) return <Navigate to="/" replace />;
  if (!dbUser) {
    return (
      <div className="rapid-auth-screen p-4">
        <div className="rapid-auth-loader rapid-auth-error">
          <div className="mb-5 flex justify-center"><BrandLogo size={40} /></div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-200">Finishing your secure session</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Your login is valid. We’re reconnecting your account data. Nothing has been changed.</p>
          {user && authError?.code && <p className="mt-3 font-mono text-xs text-amber-600 dark:text-amber-400">Temporary sync code: {authError.code}</p>}
          <div className="mt-6 flex gap-3 justify-center">
            {user ? <button onClick={() => window.location.reload()} className="btn-primary"><RefreshCw className="h-4 w-4"/> Retry</button> : <Link to="/" className="btn-primary">Return home</Link>}
            {user && <button onClick={logOut} className="btn-ghost">Sign out</button>}
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

  const activeItem = navItems.find(i => i.href === location.pathname);

  return (
    <div className="rapid-app-shell">
      {isMobileMenuOpen && <div className="fixed inset-0 z-20 bg-black/60 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}

      {/* ─── Rail ─────────────────────────────────────────────────────────── */}
      <aside className={cn(
        "rapid-sidebar fixed inset-y-0 z-40 flex w-64 flex-col justify-between transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
        dir === 'rtl' ? "right-0 border-l" : "left-0 border-r",
        isMobileMenuOpen ? "translate-x-0" : (dir === 'rtl' ? "translate-x-full" : "-translate-x-full")
      )}>
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Brand head */}
          <div className="rapid-sidebar-head flex h-16 shrink-0 items-center gap-2 px-gutter">
            <BrandLogo size={32} showTagline />
            <button onClick={() => setIsMobileMenuOpen(false)} className="ms-auto text-slate-400 hover:text-slate-100 md:hidden"><X className="h-5 w-5" /></button>
          </div>

          {/* API engine status */}
          <div className="px-gutter-sm py-space-sm">
            <div className="flex items-center justify-between rounded-xl bg-surface-container px-space-md py-space-sm dark:bg-surface-container">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px] text-tertiary">terminal</span>
                <span className="font-mono text-label-sm uppercase tracking-wider text-on-surface-variant dark:text-on-surface-variant">API Engine</span>
              </div>
              <span className="flex items-center gap-1 font-mono text-code-xs text-tertiary dark:text-tertiary">
                <span className={cn("pulse-dot", health?.ok ? "bg-tertiary" : "bg-critical", health?.ok && "animate-pulse")} />
                {health?.ok ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="rapid-sidebar-nav flex-1 space-y-0.5 overflow-y-auto px-gutter-sm">
            {(['operations', 'integration', 'system'] as const).map(group => (
              <div key={group}>
                <div className="rapid-nav-label px-space-md pb-0.5 pt-space-md">{GROUP_LABEL[group][lang === 'ar' ? 'ar' : 'en']}</div>
                {navItems.filter(i => i.group === group).map(item => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.key}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn("rapid-nav-item justify-between", isActive && "is-active")}
                    >
                      <span className="flex items-center gap-space-md">
                        <item.icon className="h-[18px] w-[18px]" />
                        <span>{t(item.key)}</span>
                      </span>
                      {item.badge === 'api' ? (
                        <span className="rapid-nav-hot">v2.4</span>
                      ) : (
                        <span className="hidden truncate font-mono text-code-xs opacity-70 lg:inline">{alt(item.key)}</span>
                      )}
                    </Link>
                  );
                })}
                {group === 'system' && dbUser.isAdmin && (
                  <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="rapid-nav-item justify-between">
                    <span className="flex items-center gap-space-md">
                      <ShieldCheck className="h-[18px] w-[18px]" />
                      <span>Admin Switcher</span>
                    </span>
                    <span className="h-2 w-2 rounded-full bg-secondary" />
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Foot */}
        <div className="rapid-sidebar-foot space-y-2 p-gutter-sm">
          <div className="flex items-center justify-between rounded-xl bg-surface-container p-space-md dark:bg-surface-container">
            <div className="flex flex-col">
              <span className="font-mono text-label-sm uppercase tracking-wider text-on-surface-variant dark:text-on-surface-variant">Tier Level</span>
              <span className="font-display text-headline-sm font-semibold text-primary dark:text-primary">{dbUser.isAdmin ? 'Administrator' : 'Standard Member'}</span>
            </div>
            <span className="material-symbols-outlined text-xl text-primary dark:text-primary">{dbUser.isAdmin ? 'verified' : 'workspace_premium'}</span>
          </div>
          <LanguageSwitcher className="w-full justify-center border-slate-700 text-slate-400 hover:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800" />
          <button onClick={logOut} className="rapid-nav-item w-full justify-start"><LogOut className="h-[18px] w-[18px]" /> {t('common.signOut')}</button>
        </div>
      </aside>

      {/* ─── Column ───────────────────────────────────────────────────────── */}
      <div className={cn("flex min-w-0 flex-1 flex-col", dir === 'rtl' ? "md:pr-64" : "md:pl-64")}>
        <header className="rapid-topbar fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between px-gutter-lg md:ps-64">
          <div className="flex flex-1 items-center gap-space-md">
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-400 hover:text-slate-100 md:hidden"><Menu className="h-5 w-5" /></button>
            <form onSubmit={submitSearch} className="relative w-full max-w-md">
              <span className="material-symbols-outlined absolute start-space-md top-1/2 -translate-y-1/2 text-[18px] text-slate-500 dark:text-outline">search</span>
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-transparent bg-surface-container ps-10 pe-space-md font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-surface-container"
                placeholder={t('client.globalSearchPlaceholder')}
              />
            </form>
          </div>

          <div className="flex items-center gap-space-md">
            {/* Balance */}
            <div className="hidden items-center gap-space-sm rounded-xl bg-surface-container px-space-md py-space-xs sm:flex dark:bg-surface-container">
              <span className="material-symbols-outlined text-[18px] text-tertiary">payments</span>
              <div className="flex flex-col">
                <span className="font-mono text-code-xs leading-none text-on-surface-variant dark:text-on-surface-variant">{t('common.currentBalance')}</span>
                <span className="font-mono text-code-sm font-medium tabular-nums text-on-surface dark:text-on-surface">
                  {config?.currencySymbol || '$'}{Number(account?.balance || 0).toFixed(2)} {config?.currencyCode || 'USD'}
                </span>
              </div>
              <Link to="/dashboard/add-funds" className="ms-1 flex h-6 w-6 items-center justify-center rounded-lg bg-surface-container-high text-tertiary transition-colors hover:bg-surface-bright">
                <span className="material-symbols-outlined text-[16px]">add</span>
              </Link>
            </div>

            {/* Instant order */}
            <Link to="/dashboard/new-order" className="inline-flex items-center gap-1 rounded-xl bg-primary-container px-space-md py-space-sm font-label-lg text-label-lg font-semibold text-on-primary-container shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition-all hover:bg-primary">
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              <span className="hidden sm:inline">{t('nav.newOrder')}</span>
            </Link>

            {/* Notifications */}
            <div className="relative">
              <button
                aria-label={t('notifications.title')}
                onClick={() => setNotificationsOpen(v => !v)}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface dark:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[18px]">notifications</span>
                {notificationData?.unread > 0 && <span className="absolute end-2 top-2 h-2 w-2 rounded-full bg-error ring-2 ring-surface-container" />}
              </button>
              {notificationsOpen && (
                <div className="absolute end-0 top-12 z-50 w-[min(360px,calc(100vw-2rem))] rounded-xl border border-slate-700 bg-slate-800 p-3 shadow-float dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-700 px-2 pb-2 dark:border-slate-700">
                    <b className="font-display text-sm font-semibold">{t('notifications.title')}</b>
                    <button className="text-xs text-primary dark:text-primary" onClick={async () => { const token = await user?.getIdToken(); await apiFetch('/api/client/notifications/read-all', user, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }); await refetchNotifications(); }}>{t('notifications.markAll')}</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {(notificationData?.notifications || []).length === 0
                      ? <p className="p-4 text-xs text-slate-400 dark:text-slate-400">{t('notifications.empty')}</p>
                      : (notificationData.notifications || []).map((n: any) => (
                        <button key={n.id} onClick={async () => { const token = await user?.getIdToken(); if (!n.readAt) await apiFetch(`/api/client/notifications/${n.id}/read`, user, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }); await refetchNotifications(); if (n.link) window.location.href = n.link; }} className={cn("mt-1 w-full rounded-lg p-3 text-start", n.readAt ? 'bg-slate-700/40' : 'bg-indigo-500/15')}>
                          <div className="text-xs font-semibold">{n.title}</div>
                          <div className="mt-1 text-xs text-slate-400 dark:text-slate-400">{n.message}</div>
                          <div className="mt-1 font-mono text-[10px] text-slate-500 dark:text-slate-500">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</div>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Theme + identity */}
            <ThemeButton />
            <div className="flex items-center gap-space-sm ps-space-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 font-semibold text-violet-700 ring-1 ring-outline/30 dark:bg-violet-900/40 dark:text-violet-300">{(account?.email || 'R')[0].toUpperCase()}</span>
              <div className="hidden flex-col xl:flex">
                <span className="font-label-lg text-label-lg leading-tight">{account?.name || account?.email?.split('@')[0]}</span>
                <span className="font-mono text-code-xs text-on-surface-variant dark:text-on-surface-variant">{account?.email}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="rapid-content mt-16 flex-1 overflow-y-auto"><div className="client-page-frame mx-auto w-full max-w-[1480px]">
          <Outlet />
        </div></div>

        <nav className="rapid-mobile-nav md:hidden">{navItems.slice(0, 5).map(item => <Link key={item.key} to={item.href} className={location.pathname === item.href ? 'active' : ''}><item.icon /><span>{t(item.key)}</span></Link>)}</nav>
      </div>
    </div>
  );
}

/** Theme toggle re-styled to the design's 40px control slot. */
function ThemeButton() {
  return <ThemeToggle className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container p-0 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface dark:bg-surface-container dark:text-on-surface-variant" />;
}
