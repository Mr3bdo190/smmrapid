import { useState } from 'react';
import { useLocation, Link, Outlet, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { useTranslation, LanguageSwitcher } from '../../lib/i18n';
import { LayoutDashboard, ShoppingCart, ListOrdered, Wallet, LogOut, Menu, X, User, Ticket, LifeBuoy, Tags, Link2, Code, Users, Gift, Gamepad2, RefreshCw, Bell, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { key: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'nav.newOrder', href: '/dashboard/new-order', icon: ShoppingCart },

  { key: 'nav.services', href: '/dashboard/services', icon: Tags },
  { key: 'nav.massOrder', href: '/dashboard/mass-order', icon: ListOrdered },
  { key: 'nav.earnMoney', href: '/dashboard/earn', icon: Link2 },

  { key: 'nav.orderHistory', href: '/dashboard/orders', icon: ListOrdered },
  { key: 'nav.addFunds', href: '/dashboard/add-funds', icon: Wallet },
  { key: 'nav.transactions', href: '/dashboard/transactions', icon: Wallet },
  { key: 'nav.profile', href: '/dashboard/profile', icon: User },
  { key: 'nav.lottery', href: '/dashboard/lottery', icon: Ticket },
  { key: 'nav.tickets', href: '/dashboard/tickets', icon: LifeBuoy },

  { key: 'nav.api', href: '/dashboard/api', icon: Code },
  { key: 'nav.affiliates', href: '/dashboard/affiliates', icon: Users },
  { key: 'nav.mysteryBoxes', href: '/dashboard/mystery-boxes', icon: Gift },
  { key: 'nav.game', href: '/dashboard/game', icon: Gamepad2 },

];

export default function ClientLayout() {
  const { user, dbUser, loading, authError, logOut } = useAuth();
  const location = useLocation();
  const { t, dir } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: config } = useQuery({
    queryKey: ['client-config'],
    queryFn: async () => {
      const res = await apiFetch('/api/client/config', user);
      return res.ok ? res.json() : {};
    }
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

  if (loading) return <div className="rapid-auth-screen"><div className="rapid-auth-loader"><span className="brand-mark">R</span><div className="rapid-spinner"/><strong>{t('common.loading')}</strong><small>Securing your session…</small></div></div>;
  if (!user) return <Navigate to="/" replace />;
  if (!dbUser) {
    return (
      <div className="rapid-auth-screen p-4">
        <div className="rapid-auth-loader rapid-auth-error">
          <div className="brand-mark mx-auto mb-5">R</div>
          <h1 className="text-2xl font-black text-slate-900">Finishing your secure session</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Your login is valid. We’re reconnecting your account data. Nothing has been changed.</p>
          {user && authError?.code && <p className="mt-3 text-xs text-amber-600">Temporary sync code: {authError.code}</p>}
          <div className="mt-6 flex gap-3 justify-center">
            {user ? <button onClick={() => window.location.reload()} className="btn-primary"><RefreshCw className="h-4 w-4"/> Retry</button> : <Link to="/" className="btn-primary">Return home</Link>}
            {user && <button onClick={logOut} className="btn-ghost">Sign out</button>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rapid-app-shell">
      {isMobileMenuOpen && <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
      <aside className={cn(
        "rapid-sidebar fixed inset-y-0 z-30 w-[280px] flex flex-col transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
        dir === 'rtl' ? "right-0 border-l" : "left-0 border-r",
        isMobileMenuOpen ? "translate-x-0" : (dir === 'rtl' ? "translate-x-full" : "-translate-x-full")
      )}>
        <div className="rapid-sidebar-head h-[76px] flex items-center justify-between px-5">
          <Link to="/dashboard" className="flex items-center gap-3"><span className="brand-mark h-9 w-9 text-sm">R</span><span className="text-lg font-black tracking-tight text-slate-900">Rapid<span className="text-violet-600">SMM</span></span></Link>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-gray-400 hover:text-gray-900"><X className="w-6 h-6" /></button>
        </div>
        <nav className="rapid-sidebar-nav flex-1 overflow-y-auto py-5">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => (
              <li key={item.key}>
                <Link to={item.href} onClick={() => setIsMobileMenuOpen(false)} className={cn("rapid-nav-item flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-bold transition-colors", location.pathname === item.href ? "is-active" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}>
                  <item.icon className="w-5 h-5" /> {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="rapid-sidebar-foot p-4 space-y-2">
          <LanguageSwitcher className="w-full justify-center border-gray-300 text-gray-600 hover:bg-gray-50" />
          <button onClick={logOut} className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"><LogOut className="w-5 h-5" /> {t('common.signOut')}</button>
        </div>
      </aside>
      <main className="rapid-main flex-1 flex flex-col min-w-0 overflow-hidden w-full h-full relative">
        <header className="rapid-topbar h-[76px] flex items-center justify-between px-4 md:px-8 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-gray-500 hover:text-gray-900"><Menu className="w-6 h-6" /></button>
            <h2 className="text-xl font-semibold text-gray-800 truncate">{navItems.find(i => i.href === location.pathname) ? t(navItems.find(i => i.href === location.pathname)!.key) : t('nav.clientArea')}</h2>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard/add-funds" className="hidden sm:flex btn-primary py-2"><Plus className="h-4 w-4"/> Add funds</Link>
            <button className="rounded-xl border border-slate-200 p-2 text-slate-500"><Bell className="h-4 w-4"/></button>
            <div className={dir === 'rtl' ? "flex flex-col text-left" : "flex flex-col text-right"}>
              <span className="text-sm font-black text-slate-900">{config?.currencySymbol || '$'}{Number((freshUser || dbUser).balance).toFixed(4)}</span>
              <span className="text-xs text-slate-500 hidden sm:block">{t('common.currentBalance')}</span>
            </div>
            <Link to="/dashboard/profile" className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold border border-violet-200 transition-colors">{(freshUser || dbUser).email[0].toUpperCase()}</Link>
          </div>
        </header>
        <div className="rapid-content flex-1 overflow-y-auto p-4 md:p-8"><div className="mx-auto max-w-[1480px]">
          <Outlet />
        </div></div>
      </main>
    </div>
  );
}
