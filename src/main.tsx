import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster, toast } from 'react-hot-toast';
import App from './App.tsx';
import './index.css';

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: (error: any) => { console.error('Query failed:', error); toast.error(error?.message || 'Failed to load data'); } }),
  mutationCache: new MutationCache({ onError: (error: any) => { console.error('Mutation failed:', error); } }),
  defaultOptions: { queries: { retry: 2, refetchOnWindowFocus: true, staleTime: 5_000 }, mutations: { retry: 0 } }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster position="top-right" />
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
