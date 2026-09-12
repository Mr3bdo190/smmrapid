import { useState } from 'react';
import { useLocation, Link, Outlet, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { useTranslation, LanguageSwitcher } from '../../lib/i18n';
import { LayoutDashboard, Users, ShoppingCart, Settings, Server, Tags, ListOrdered, Wallet, LogOut, Menu, X, Ticket, LifeBuoy, Link2, Gift, ShieldAlert, History, Handshake, Mail } from 'lucide-react';
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

  if (loading) return <div className="rapid-auth-screen"><div className="rapid-auth-loader"><span className="brand-mark">R</span><div className="rapid-spinner"/><strong>{t('common.loading')}</strong><small>{t('common.loading')}</small></div></div>;
  if (!user) return <Navigate to="/" replace />;
  if (!dbUser || dbUser.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return (
    <div className="rapid-app-shell rapid-admin-shell">
      {isMobileMenuOpen && <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
      <aside className={cn(
        "rapid-sidebar rapid-admin-sidebar fixed inset-y-0 z-30 w-[280px] flex flex-col transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
        dir === 'rtl' ? "right-0" : "left-0",
        isMobileMenuOpen ? "translate-x-0" : (dir === 'rtl' ? "translate-x-full" : "-translate-x-full")
      )}>
        <div className="rapid-sidebar-head h-[76px] flex items-center justify-between px-5">
          <Link to="/admin" className="flex items-center gap-3"><span className="brand-mark">R</span><span className="text-lg font-black tracking-tight text-white">Rapid<span className="text-violet-300">SMM</span></span><span className="rapid-admin-pill">ADMIN</span></Link>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
        </div>
        <nav className="rapid-sidebar-nav flex-1 overflow-y-auto py-5">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => (
              <li key={item.key}>
                <Link to={item.href} onClick={() => setIsMobileMenuOpen(false)} className={cn("rapid-nav-item flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-bold transition-colors", location.pathname === item.href ? "is-active" : "text-slate-300 hover:bg-white/5 hover:text-white")}>
                  <item.icon className="w-5 h-5" /> {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="rapid-sidebar-foot p-4 space-y-2">
          <LanguageSwitcher className="w-full justify-center border-gray-700 text-gray-300 hover:bg-gray-800" />
          <button onClick={logOut} className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"><LogOut className="w-5 h-5" /> {t('common.signOut')}</button>
        </div>
      </aside>
      <main className="rapid-main flex-1 flex flex-col min-w-0 overflow-hidden w-full h-full relative">
        <header className="rapid-topbar h-[76px] flex items-center justify-between px-4 md:px-8 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-gray-500 hover:text-gray-900"><Menu className="w-6 h-6" /></button>
            <h2 className="text-xl font-semibold text-gray-800 truncate">{navItems.find(i => i.href === location.pathname) ? t(navItems.find(i => i.href === location.pathname)!.key) : t('nav.admin.title')}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={logOut} className="hidden md:inline-flex btn-ghost items-center gap-1.5"><LogOut className="h-4 w-4"/> {t('common.signOut')}</button>
            <span className="hidden md:inline text-sm text-gray-500">{dbUser.email}</span>
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">{dbUser.email[0].toUpperCase()}</div>
          </div>
        </header>
        <div className="rapid-content flex-1 overflow-y-auto p-4 md:p-8">
          <div className="admin-page-frame"><Outlet /></div>
        </div>
      </main>
    </div>
  );
}
