import { AuthProvider, useAuth } from './auth/AuthProvider';
import { LocaleProvider, useT } from './i18n';
import { Link, RouterProvider, matchPath, useRouter } from './lib/router';
import { useAsync } from './lib/useAsync';
import { fetchNotifications } from './data/api';
import { NavBar } from './components/NavBar';
import { SignInPanel } from './components/SignInPanel';
import { Home } from './pages/Home';
import { Services } from './pages/Services';
import { ServiceDetail } from './pages/ServiceDetail';
import { Orders } from './pages/Orders';
import { OrderDetail } from './pages/OrderDetail';
import { Wallet } from './pages/Wallet';
import { Deposit } from './pages/Deposit';
import { Support, TicketView } from './pages/Support';
import { Notifications } from './pages/Notifications';
import { Account } from './pages/Account';
import { NotFound } from './pages/NotFound';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminServices } from './pages/admin/Services';
import { AdminUsers } from './pages/admin/Users';

/**
 * The application shell: who is signed in, which page is on screen, and the header that ties them
 * together.
 *
 * Provider order matters and is deliberate — the locale is outermost (so every string and the
 * document direction are decided first), then the router (so any page can navigate), then auth (the
 * only provider that talks to the network on mount). A component that calls `useT()`, `useRouter()`
 * or `useAuth()` outside its provider throws at runtime, which is a white page in the browser and
 * not a type error — the SSR smoke test renders this component for exactly that reason.
 */

/** The route table, in match order. First match wins; nothing matched means a real 404 page. */
function Screens({ pathname }: { pathname: string }) {
  const exact = [
    { path: '/', element: <Home /> },
    { path: '/services', element: <Services /> },
    { path: '/orders', element: <Orders /> },
    { path: '/wallet', element: <Wallet /> },
    { path: '/wallet/deposit', element: <Deposit /> },
    { path: '/support', element: <Support /> },
    { path: '/notifications', element: <Notifications /> },
    { path: '/account', element: <Account /> },
    { path: '/signin', element: <SignInPanel /> },
    { path: '/admin', element: <AdminDashboard /> },
    { path: '/admin/services', element: <AdminServices /> },
    { path: '/admin/users', element: <AdminUsers /> },
  ];
  const patterns = [
    { path: '/services/:slug', render: (params: Record<string, string>) => <ServiceDetail slug={params.slug!} /> },
    { path: '/orders/:publicId', render: (params: Record<string, string>) => <OrderDetail publicId={params.publicId!} /> },
    { path: '/support/:publicId', render: (params: Record<string, string>) => <TicketView publicId={params.publicId!} /> },
  ];

  for (const route of exact) {
    if (pathname === route.path) return route.element;
  }
  for (const route of patterns) {
    const params = matchPath(route.path, pathname);
    if (params) return route.render(params);
  }
  return <NotFound />;
}

function Shell() {
  const { t } = useT();
  const { path } = useRouter();
  const { ready, user } = useAuth();
  const pathname = path.split('?')[0] || '/';

  // the header badge is the server's unread count, refreshed whenever the page changes
  const notifications = useAsync(() => fetchNotifications(user, { limit: 1 }), [Boolean(user), pathname], {
    skip: !user,
  });

  return (
    <div className="app-shell">
      <NavBar unread={notifications.data?.unread ?? 0} />

      <main className="mx-auto w-full max-w-[1100px] flex-1 px-5 py-8">
        {/*
          The router renders while the session is still resolving: the catalogue and a service page
          need no account, and gating them behind the auth check made a first visit show a spinner
          for something that was already loaded. The pages that do need an account handle the wait
          themselves (RequireAuth), so nothing is shown as signed-in before it is.
        */}
        <Screens pathname={pathname} />
        {!ready ? <span className="sr-only">{t('shell.loadingSession')}</span> : null}
      </main>

      <footer className="border-t border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="mx-auto flex w-full max-w-[1100px] flex-wrap items-center justify-between gap-3 px-5 py-5">
          <div className="flex flex-wrap items-center gap-4 text-[13px] text-[var(--color-ink-muted)]">
            <Link to="/services" className="hover:text-[var(--color-ink)]">
              {t('nav.services')}
            </Link>
            <Link to="/orders" className="hover:text-[var(--color-ink)]">
              {t('nav.orders')}
            </Link>
            <Link to="/wallet" className="hover:text-[var(--color-ink)]">
              {t('nav.wallet')}
            </Link>
            <Link to="/support" className="hover:text-[var(--color-ink)]">
              {t('nav.support')}
            </Link>
          </div>
          <span className="micro">
            {t('common.appName')} · {new Date().getFullYear()}
          </span>
        </div>
      </footer>
    </div>
  );
}

export default function App({ initialPath }: { initialPath?: string } = {}) {
  return (
    <LocaleProvider>
      <RouterProvider initialPath={initialPath}>
        <AuthProvider>
          <Shell />
        </AuthProvider>
      </RouterProvider>
    </LocaleProvider>
  );
}
