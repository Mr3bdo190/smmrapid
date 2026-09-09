import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './lib/i18n';
import { Toaster, toast } from 'react-hot-toast';
import App from './App.tsx';
import './index.css';

class AppErrorBoundary extends React.Component<React.PropsWithChildren, { hasError: boolean; message: string }> {
  state = { hasError: false, message: '' };
  static getDerivedStateFromError(error: any) {
    return { hasError: true, message: error?.message || 'Unexpected application error' };
  }
  componentDidCatch(error: any) {
    console.error('Application runtime error:', error);
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#f7f9fc', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ maxWidth: 520, width: '100%', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 28, textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,.08)' }}>
          <h1 style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 800, color: '#111827' }}>Something went wrong</h1>
          <p style={{ margin: '0 0 18px', color: '#6b7280' }}>The page could not be loaded. Refresh the page and try again.</p>
          <button onClick={() => window.location.reload()} style={{ border: 0, borderRadius: 10, padding: '10px 18px', background: '#4f46e5', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Reload</button>
          <div style={{ marginTop: 14, fontSize: 11, color: '#9ca3af', wordBreak: 'break-word' }}>{this.state.message}</div>
        </div>
      </div>
    );
  }
}


const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: (error: any) => { console.error('Query failed:', error); toast.error(error?.message || 'Failed to load data'); } }),
  mutationCache: new MutationCache({ onError: (error: any) => { console.error('Mutation failed:', error); } }),
  defaultOptions: { queries: { retry: 2, refetchOnWindowFocus: true, staleTime: 5_000 }, mutations: { retry: 0 } }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <AppErrorBoundary>
            <AuthProvider>
          <Toaster position="top-right" />
          <App />
            </AuthProvider>
          </AppErrorBoundary>
      </QueryClientProvider>
    </LanguageProvider>
  </StrictMode>
);
