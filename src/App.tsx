import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useTranslation } from './lib/i18n';
import LandingPage from './pages/LandingPage';
import AdminLayout from './pages/admin/AdminLayout';
import ClientLayout from './pages/client/ClientLayout';
import PublicServices from './pages/PublicServices';
import Contact from './pages/Contact';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import RefundPolicy from './pages/RefundPolicy';
import PlatformSEO from './pages/PlatformSEO';

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminRaffles = lazy(() => import('./pages/admin/AdminRaffles'));
const AdminTickets = lazy(() => import('./pages/admin/AdminTickets'));
const AdminTicketView = lazy(() => import('./pages/admin/AdminTicketView'));
const AdminShortlinks = lazy(() => import('./pages/admin/AdminShortlinks'));
const AdminMysteryBoxes = lazy(() => import('./pages/admin/AdminMysteryBoxes'));
const AdminProviders = lazy(() => import('./pages/admin/AdminProviders'));
const AdminSystemReports = lazy(() => import('./pages/admin/AdminSystemReports'));
const AdminAuditLogs = lazy(() => import('./pages/admin/AdminAuditLogs'));
const AdminAffiliates = lazy(() => import('./pages/admin/AdminAffiliates'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminServices = lazy(() => import('./pages/admin/AdminServices'));
const AdminContactMessages = lazy(() => import('./pages/admin/AdminContactMessages'));

const ClientDashboard = lazy(() => import('./pages/client/ClientDashboard'));
const ClientNewOrder = lazy(() => import('./pages/client/ClientNewOrder'));
const ClientOrders = lazy(() => import('./pages/client/ClientOrders'));
const ClientAddFunds = lazy(() => import('./pages/client/ClientAddFunds'));
const ClientTransactions = lazy(() => import('./pages/client/ClientTransactions'));
const ClientProfile = lazy(() => import('./pages/client/ClientProfile'));
const ClientLottery = lazy(() => import('./pages/client/ClientLottery'));
const ClientTickets = lazy(() => import('./pages/client/ClientTickets'));
const ClientTicketView = lazy(() => import('./pages/client/ClientTicketView'));
const ClientServices = lazy(() => import('./pages/client/ClientServices'));
const ClientMassOrder = lazy(() => import('./pages/client/ClientMassOrder'));
const ClientShortlinks = lazy(() => import('./pages/client/ClientShortlinks'));
const ClientApi = lazy(() => import('./pages/client/ClientApi'));
const ClientAffiliates = lazy(() => import('./pages/client/ClientAffiliates'));
const ClientMysteryBoxes = lazy(() => import('./pages/client/ClientMysteryBoxes'));
const ClientGame = lazy(() => import('./pages/client/ClientGame'));

const Fallback = () => <div className="flex h-screen w-full items-center justify-center bg-gray-50"><div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-indigo-500"></div></div>;

import { useEffect } from 'react';

export default function App() {
  const { setLang } = useTranslation();
  const pathLang = window.location.pathname.startsWith('/ar/') || window.location.pathname === '/ar' ? 'ar' : window.location.pathname.startsWith('/en/') || window.location.pathname === '/en' ? 'en' : null;
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      const code = ref.trim().toUpperCase();
      localStorage.setItem('ref', code);
      const clickKey = `ref_click:${code}`;
      if (!sessionStorage.getItem(clickKey)) {
        sessionStorage.setItem(clickKey, '1');
        fetch('/api/client/affiliates/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referralCode: code })
        }).catch(() => {});
      }
    }
  }, []);
  useEffect(() => {
    if (pathLang) { setLang(pathLang); document.documentElement.lang = pathLang; document.documentElement.dir = pathLang === 'ar' ? 'rtl' : 'ltr'; }
  }, [pathLang, setLang]);

  return (
    <BrowserRouter>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/ar" element={<LandingPage />} />
          <Route path="/en" element={<LandingPage />} />
          <Route path="/services" element={<PublicServices />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/:lang/:slug-services" element={<PlatformSEO />} />
          <Route path="/dashboard" element={<ClientLayout />}>
            <Route index element={<ClientDashboard />} />
            <Route path="new-order" element={<ClientNewOrder />} />
            <Route path="orders" element={<ClientOrders />} />
            <Route path="add-funds" element={<ClientAddFunds />} />
            <Route path="transactions" element={<ClientTransactions />} />
            <Route path="profile" element={<ClientProfile />} />
            <Route path="lottery" element={<ClientLottery />} />
            <Route path="tickets" element={<ClientTickets />} />
            <Route path="tickets/:id" element={<ClientTicketView />} />
            <Route path="services" element={<ClientServices />} />
            <Route path="mass-order" element={<ClientMassOrder />} />
            <Route path="earn" element={<ClientShortlinks />} />
            <Route path="api" element={<ClientApi />} />
            <Route path="affiliates" element={<ClientAffiliates />} />
            <Route path="mystery-boxes" element={<ClientMysteryBoxes />} />
            <Route path="game" element={<ClientGame />} />
          </Route>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="raffles" element={<AdminRaffles />} />
            <Route path="tickets" element={<AdminTickets />} />
            <Route path="tickets/:id" element={<AdminTicketView />} />
            <Route path="shortlinks" element={<AdminShortlinks />} />
            <Route path="mystery-boxes" element={<AdminMysteryBoxes />} />
            <Route path="providers" element={<AdminProviders />} />
            <Route path="reports" element={<AdminSystemReports />} />
            <Route path="audit" element={<AdminAuditLogs />} />
            <Route path="affiliates" element={<AdminAffiliates />} />
            <Route path="contact-messages" element={<AdminContactMessages />} />
          </Route>
          <Route path="*" element={<div className="p-10 text-center">404 - Not Found</div>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
