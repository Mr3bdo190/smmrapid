import { useState } from 'react';
import { useLocation, Link, Outlet, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { useTranslation, LanguageSwitcher, ThemeToggle } from '../../lib/i18n';
import { LayoutDashboard, Users, ShoppingCart, Settings, Server, Tags, ListOrdered, Wallet, LogOut, Menu, X, Ticket, LifeBuoy, Link2, Gift, ShieldAlert, History, Handshake, Mail, ArrowLeft } from 'lucide-react';
import { BrandLogo } from '../../components/BrandLogo';
import { cn } from '../../lib/utils';

const navItems = [
  { key: 'nav.admin.dashboard', href: '/admin', icon: LayoutDashboard },
  { key: 'nav.admin.users', href: '/admin/users', icon: Users },
  { key: 'nav.admin.orders', href: '/admin/orders', icon: ShoppingCart },
  { key: 'nav.admin.payments', href: '/admin/payments', icon: Wallet },
  { key: 'nav.admin.categories', href: '/admin/categories', icon: Tags },
  { key: 'nav.admin.services', href: '/admin/services', icon: ListOrdered },
  { key: 'nav.admin.providers', href: '/admin/providers', icon: Server },
  { key: 'nav.admin.shortlinks', href: '/admin/shortlinks', icon: Link2 },
  { key: 'nav.admin.mysteryBoxes', href: '/admin/mystery-boxes', icon: Gift },
  { key: 'nav.admin.raffles', href: '/admin/raffles', icon: Ticket },
  { key: 'nav.admin.tickets', href: '/admin/tickets', icon: LifeBuoy },
  { key: 'nav.admin.contactMessages', href: '/admin/contact-messages', icon: Mail },
  { key: 'nav.admin.reports', href: '/admin/reports', icon: ShieldAlert },
  { key: 'nav.admin.audit', href: '/admin/audit', icon: History },
  { key: 'nav.admin.affiliates', href: '/admin/affiliates', icon: Handshake },
  { key: 'nav.admin.withdrawals', href: '/admin/withdrawals', icon: Wallet },
  { key: 'nav.admin.settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout() {
  const { dbUser, loading, logOut, user } = useAuth();
  const location = useLocation();
  const { t, dir } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: config } = useQuery({
    queryKey: ['client-config'],
    queryFn: async () => { const res = await apiFetch('/api/client/config', user); return res.ok ? res.json() : {}; },
  });

  const { data: health } = useQuery({
    queryKey: ['api-health'],
    queryFn: async () => { const res = await apiFetch('/api/health', user); return res.ok ? res.json() : { ok: false }; },
    refetchInterval: 60_000,
  });

  if (loading) return <div className="rapid-auth-screen"><div className="rapid-auth-loader"><BrandLogo size={40} /><div className="rapid-spinner"/><strong>{t('common.loading')}</strong><small>{t('common.loading')}</small></div></div>;
  if (!user) return <Navigate to="/" replace />;
  if (!dbUser || dbUser.role !== 'admin') return <Navigate to="/dashboard" replace />;

  const activeItem = navItems.find(i => i.href === location.pathname);

  return (
    <div className="rapid-app-shell rapid-admin-shell">
      {isMobileMenuOpen && <div className="fixed inset-0 z-20 bg-black/60 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}

      {/* ─── Rail ─────────────────────────────────────────────────────────── */}
      <aside className={cn(
        "rapid-admin-sidebar fixed inset-y-0 z-40 flex w-64 flex-col justify-between transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
        dir === 'rtl' ? "right-0 border-l" : "left-0 border-r",
        isMobileMenuOpen ? "translate-x-0" : (dir === 'rtl' ? "translate-x-full" : "-translate-x-full")
      )}>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="rapid-sidebar-head flex h-16 shrink-0 items-center gap-2 px-gutter">
            <BrandLogo size={32} showTagline />
            <span className="rapid-admin-pill">Admin</span>
            <button onClick={() => setIsMobileMenuOpen(false)} className="ms-auto text-slate-400 hover:text-slate-100 md:hidden"><X className="h-5 w-5" /></button>
          </div>

          <div className="px-gutter-sm py-space-sm">
            <div className="flex items-center justify-between rounded-xl bg-surface-container px-space-md py-space-sm">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px] text-tertiary">dns</span>
                <span className="font-mono text-label-sm uppercase tracking-wider text-on-surface-variant">Control Plane</span>
              </div>
              <span className="flex items-center gap-1 font-mono text-code-xs text-tertiary">
                <span className={cn("pulse-dot", health?.ok ? "bg-tertiary" : "bg-critical", health?.ok && "animate-pulse")} />
                {health?.ok ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>

          <nav className="rapid-sidebar-nav flex-1 space-y-0.5 overflow-y-auto px-gutter-sm">
            <div className="rapid-nav-label px-space-md pb-0.5 pt-space-md">{t('nav.admin.title')}</div>
            {navItems.map(item => {
              const isActive = location.pathname === item.href;
              return (
                <Link key={item.key} to={item.href} onClick={() => setIsMobileMenuOpen(false)} className={cn("rapid-nav-item", isActive && "is-active")}>
                  <item.icon className="h-[18px] w-[18px]" />
                  <span>{t(item.key)}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="rapid-sidebar-foot space-y-2 p-gutter-sm">
          <Link to="/dashboard" className="flex items-center justify-between rounded-xl bg-surface-container p-space-md transition-colors hover:bg-surface-container-high">
            <div className="flex flex-col">
              <span className="font-mono text-label-sm uppercase tracking-wider text-on-surface-variant">Control Plane</span>
              <span className="font-display text-headline-sm font-semibold text-primary">Admin Console</span>
            </div>
            <ArrowLeft className="h-4 w-4 text-primary rtl:rotate-180" />
          </Link>
          <LanguageSwitcher className="w-full justify-center border-slate-700 text-slate-400 hover:bg-slate-800" />
          <div className="flex items-center justify-center"><ThemeToggle className="flex h-10 w-full items-center justify-center rounded-xl bg-surface-container text-on-surface-variant hover:bg-surface-container-high" /></div>
          <button onClick={logOut} className="rapid-nav-item w-full justify-start"><LogOut className="h-[18px] w-[18px]" /> {t('common.signOut')}</button>
        </div>
      </aside>

      {/* ─── Column ───────────────────────────────────────────────────────── */}
      <div className={cn("flex min-w-0 flex-1 flex-col", dir === 'rtl' ? "md:pr-64" : "md:pl-64")}>
        <header className="rapid-topbar fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between px-gutter-lg md:ps-64">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-400 hover:text-slate-100 md:hidden"><Menu className="h-5 w-5" /></button>
            <h2 className="truncate font-display text-headline-sm font-semibold text-on-surface">{activeItem ? t(activeItem.key) : t('nav.admin.title')}</h2>
          </div>
          <div className="flex items-center gap-space-md">
            <button onClick={logOut} className="btn-ghost hidden md:inline-flex"><LogOut className="h-4 w-4" /> {t('common.signOut')}</button>
            <span className="hidden font-mono text-code-xs text-on-surface-variant lg:inline">{dbUser.email}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-900/40 font-semibold text-violet-300 ring-1 ring-outline/30">{dbUser.email[0].toUpperCase()}</span>
            <ThemeToggle className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container p-0 text-on-surface-variant hover:bg-surface-container-high" />
          </div>
        </header>

        <div className="rapid-content mt-16 flex-1 overflow-y-auto">
          <div className="admin-page-frame mx-auto w-full max-w-[1480px]"><Outlet /></div>
        </div>
      </div>
    </div>
  );
}
