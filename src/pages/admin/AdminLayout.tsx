import { useState } from 'react';
import { useLocation, Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, Users, ShoppingCart, Settings, Server, Tags, ListOrdered, Wallet, LogOut, Menu, X, Ticket, LifeBuoy, Link2, Gift, ShieldAlert, History } from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { name: 'Payments', href: '/admin/payments', icon: Wallet },
  { name: 'Categories', href: '/admin/categories', icon: Tags },
  { name: 'Services', href: '/admin/services', icon: ListOrdered },
  { name: 'API Providers', href: '/admin/providers', icon: Server },
  { name: 'Shortlinks', href: '/admin/shortlinks', icon: Link2 },
  { name: 'Mystery Boxes', href: '/admin/mystery-boxes', icon: Gift },
  { name: 'Raffles', href: '/admin/raffles', icon: Ticket },
  { name: 'Support Tickets', href: '/admin/tickets', icon: LifeBuoy },
  


  { name: 'Reports', href: '/admin/reports', icon: ShieldAlert },
  { name: 'Audit Logs', href: '/admin/audit', icon: History },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout() {
  const { dbUser, loading, logOut } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>;
  if (!dbUser || dbUser.role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-gray-500 mb-6">You do not have permission to view this page.</p>
        <Link to="/" className="text-blue-600 hover:underline">Return to Home</Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {isMobileMenuOpen && <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
      <aside className={cn("fixed inset-y-0 left-0 z-30 w-64 bg-gray-900 text-white flex flex-col transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0", isMobileMenuOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-800">
          <span className="text-lg font-bold tracking-tight">smmrapid.store Admin</span>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => (
              <li key={item.name}>
                <Link to={item.href} onClick={() => setIsMobileMenuOpen(false)} className={cn("flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors", location.pathname === item.href ? "bg-indigo-600 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white")}>
                  <item.icon className="w-5 h-5" /> {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-800">
          <button onClick={logOut} className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"><LogOut className="w-5 h-5" /> Sign Out</button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden w-full h-full relative">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-gray-500 hover:text-gray-900"><Menu className="w-6 h-6" /></button>
            <h2 className="text-xl font-semibold text-gray-800 truncate">{navItems.find(i => i.href === location.pathname)?.name || 'Admin'}</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-sm text-gray-500">{dbUser.email}</span>
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">{dbUser.email[0].toUpperCase()}</div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
