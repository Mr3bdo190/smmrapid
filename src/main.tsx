import { StrictMode, Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './lib/i18n';
import { Toaster } from 'react-hot-toast';
import App from './App.tsx';
import './index.css';

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error('[ui] Unhandled render error:', error); }
  render() {
    if (this.state.error) {
      return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:24,fontFamily:'system-ui',background:'#f7f9fc'}}><div style={{maxWidth:640,width:'100%',background:'#fff',padding:24,borderRadius:16,boxShadow:'0 10px 30px rgba(0,0,0,.08)'}}><h1 style={{fontSize:22,fontWeight:700,marginBottom:8}}>We hit a temporary problem</h1><p style={{color:'#555',marginBottom:16}}>The page could not finish this action. Your account and data are safe. Please try again.</p><button onClick={() => window.location.reload()} style={{marginTop:16,padding:'10px 16px',border:0,borderRadius:8,background:'#4f46e5',color:'#fff',fontWeight:600}}>Reload</button></div></div>;
    }
    return this.props.children;
  }
}


const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: (error: any) => { console.error('Query failed:', error); } }),
  mutationCache: new MutationCache({ onError: (error: any) => { console.error('Mutation failed:', error); } }),
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000, gcTime: 10 * 60_000 }, mutations: { retry: 0 } }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Toaster position="top-right" />
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </LanguageProvider>
    </AppErrorBoundary>
  </StrictMode>
);
