import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ToastContainer } from './components/ToastContainer';
import { DashboardView } from './components/DashboardView';
import { NewOrderSection } from './components/NewOrderSection';
import { OrdersView } from './components/OrdersView';
import { ServicesCatalogView } from './components/ServicesCatalogView';
import { AnalyticsView } from './components/AnalyticsView';
import { ReviewsView } from './components/ReviewsView';
import { HelpCenterView } from './components/HelpCenterView';
import { AccountSettingsView } from './components/AccountSettingsView';
import { SupportView } from './components/SupportView';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { RatingModal } from './components/RatingModal';
import { AddFundsModal } from './components/AddFundsModal';
import { LiveSupportModal } from './components/LiveSupportModal';
import { InvoiceModal } from './components/InvoiceModal';
import { AffiliateProgramView } from './components/AffiliateProgramView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { LandingPageView } from './components/LandingPageView';
import { BlogView } from './components/BlogView';
import { SEOHead } from './components/seo/SEOHead';
import {
  MessageSquare,
  Zap,
  Headphones,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

const MainAppContent: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    trackingOrderId,
    setTrackingOrderId,
    isAddFundsModalOpen,
    setIsAddFundsModalOpen,
    isChatOpen,
    setIsChatOpen,
    language,
    isAdminMode,
    setIsAdminMode,
    isAuthenticated,
    currentUser
  } = useApp();

  const isAr = language === 'ar';
  const [ratingOrderId, setRatingOrderId] = useState<string | null>(null);

  const isRealAdmin = Boolean(
    isAuthenticated &&
    currentUser?.role === 'admin' &&
    currentUser?.email?.toLowerCase().trim() === 'abdosayed0120@gmail.com'
  );

  const handleOpenRating = (orderId: string) => {
    setRatingOrderId(orderId);
  };

  // If in Admin Mode, render the comprehensive Admin Dashboard Suite ONLY if verified Admin
  if (isAdminMode && isRealAdmin) {
    return (
      <>
        <SEOHead />
        <AdminDashboard />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <SEOHead />
      
      {/* Primary Sticky Header */}
      <Header />

      {/* Main Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={isAuthenticated ? <DashboardView /> : <LandingPageView />} />
          <Route path="/services" element={<ServicesCatalogView />} />
          <Route path="/blog" element={<BlogView />} />
          <Route
            path="/reviews"
            element={
              <ReviewsView
                onOpenNewReview={() => {
                  setRatingOrderId('ORD-89421');
                }}
              />
            }
          />
          <Route path="/help" element={<HelpCenterView />} />
          <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
          <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />

          {/* Protected User Routes (Require Authentication) */}
          <Route path="/dashboard" element={isAuthenticated ? <DashboardView /> : <Navigate to="/login" replace />} />
          <Route path="/new-order" element={isAuthenticated ? <NewOrderSection /> : <Navigate to="/login" replace />} />
          <Route path="/orders" element={isAuthenticated ? <OrdersView onOpenRating={handleOpenRating} /> : <Navigate to="/login" replace />} />
          <Route path="/affiliates" element={isAuthenticated ? <AffiliateProgramView /> : <Navigate to="/login" replace />} />
          <Route path="/analytics" element={isAuthenticated ? <AnalyticsView /> : <Navigate to="/login" replace />} />
          <Route path="/settings" element={isAuthenticated ? <AccountSettingsView /> : <Navigate to="/login" replace />} />
          <Route path="/support" element={isAuthenticated ? <SupportView /> : <Navigate to="/login" replace />} />

          {/* Protected Admin Route (Require Authorized Admin) */}
          <Route
            path="/admin"
            element={
              isRealAdmin ? (
                <AdminDashboard />
              ) : isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      <Footer />

      {/* Floating Live Support Widget Trigger Button */}
      <div className="fixed bottom-6 start-6 z-40">
        <button
          onClick={() => setIsChatOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-xl shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all border border-cyan-400/40 focus:outline-none"
          aria-label="Open Live Chat"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5 fill-white" />
            <span className="absolute -top-1 -end-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
          </div>
          <span className="font-bold text-xs hidden sm:inline">
            {isAr ? 'الدعم المباشر 24/7' : 'Live Support 24/7'}
          </span>
        </button>
      </div>

      {/* Modals */}
      {/* 1. Order Tracking Modal */}
      {trackingOrderId && (
        <OrderTrackingModal
          orderId={trackingOrderId}
          onClose={() => setTrackingOrderId(null)}
          onOpenRating={() => {
            setRatingOrderId(trackingOrderId);
            setTrackingOrderId(null);
          }}
        />
      )}

      {/* 2. Rating & Review Modal */}
      {ratingOrderId && (
        <RatingModal
          orderId={ratingOrderId}
          onClose={() => setRatingOrderId(null)}
        />
      )}

      {/* 3. Add Funds & Payment Modal */}
      {isAddFundsModalOpen && (
        <AddFundsModal onClose={() => setIsAddFundsModalOpen(false)} />
      )}

      {/* 4. Live Support & Tickets Modal */}
      {isChatOpen && (
        <LiveSupportModal onClose={() => setIsChatOpen(false)} />
      )}

      {/* 5. Printable Invoice & Receipt Modal */}
      <InvoiceModal />

      {/* Real-time Toast Notifications */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
