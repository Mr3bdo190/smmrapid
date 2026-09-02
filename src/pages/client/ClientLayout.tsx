import { useState } from 'react';
import { useLocation, Link, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, ShoppingCart, ListOrdered, Wallet, LogOut, Menu, X, User, Ticket, LifeBuoy, Tags, Link2, Code, Users, Gift, Gamepad2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'New Order', href: '/dashboard/new-order', icon: ShoppingCart },

  { name: 'Services', href: '/dashboard/services', icon: Tags },
  { name: 'Mass Order', href: '/dashboard/mass-order', icon: ListOrdered },
  { name: 'Earn Money', href: '/dashboard/earn', icon: Link2 },

  { name: 'Order History', href: '/dashboard/orders', icon: ListOrdered },
  { name: 'Add Funds', href: '/dashboard/add-funds', icon: Wallet },
  { name: 'Transactions', href: '/dashboard/transactions', icon: Wallet },
  { name: 'Profile', href: '/dashboard/profile', icon: User },
  { name: 'Raffles & Lottery', href: '/dashboard/lottery', icon: Ticket },
  { name: 'Support Tickets', href: '/dashboard/tickets', icon: LifeBuoy },

  { name: 'API', href: '/dashboard/api', icon: Code },
  { name: 'Affiliates', href: '/dashboard/affiliates', icon: Users },
  { name: 'Mystery Boxes', href: '/dashboard/mystery-boxes', icon: Gift },
  { name: 'Rewards Hub', href: '/dashboard/game', icon: Gamepad2 },

];

export default function ClientLayout() {
  const { user, dbUser, loading, logOut } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: config } = useQuery({
    queryKey: ['client-config'],
    queryFn: async () => {
      const res = await fetch('/api/client/config');
      return res.ok ? res.json() : {};
    }
  });

  const { data: freshUser } = useQuery({
    queryKey: ['client-me'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await fetch('/api/client/me', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Unable to load account');
      return res.json();
    },
    enabled: !!user,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading...</div>;
  if (!dbUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h1 className="text-3xl font-bold mb-4 text-red-600">Access Denied</h1>
        <p className="text-gray-600 mb-8">Please log in to access the client area.</p>
        <Link to="/" className="text-indigo-600 hover:underline">Return to Home</Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {isMobileMenuOpen && <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
      <aside className={cn("fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0", isMobileMenuOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
          <span className="text-lg font-bold tracking-tight text-gray-900">{config?.siteName || 'smmrapid.store'}</span>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-gray-400 hover:text-gray-900"><X className="w-6 h-6" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => (
              <li key={item.name}>
                <Link to={item.href} onClick={() => setIsMobileMenuOpen(false)} className={cn("flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors", location.pathname === item.href ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")}>
                  <item.icon className="w-5 h-5" /> {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button onClick={logOut} className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"><LogOut className="w-5 h-5" /> Sign Out</button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden w-full h-full relative">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-gray-500 hover:text-gray-900"><Menu className="w-6 h-6" /></button>
            <h2 className="text-xl font-semibold text-gray-800 truncate">{navItems.find(i => i.href === location.pathname)?.name || 'Client Area'}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col text-right">
              <span className="text-sm font-medium text-gray-900">{config?.currencySymbol || '$'}{Number((freshUser || dbUser).balance).toFixed(4)}</span>
              <span className="text-xs text-gray-500 hidden sm:block">Current Balance</span>
            </div>
            <Link to="/dashboard/profile" className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 transition-colors">{(freshUser || dbUser).email[0].toUpperCase()}</Link>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
