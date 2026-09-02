import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ArrowRight, Zap, Globe, Shield, Code, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  const { data: config } = useQuery({
    queryKey: ['client-config'],
    queryFn: async () => {
      const res = await fetch('/api/client/config');
      if (!res.ok) throw new Error('API Error');
      return res.json();
    }
  });

  const { user, dbUser, signIn, registerWithEmail, loginWithEmail } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister) {
      if (password.length < 8) return toast.error('Password must be at least 8 characters.');
      try {
        await registerWithEmail(email, password);
        setShowAuthModal(false);
      } catch (err: any) { toast.error(err.message); }
    } else {
      try {
        await loginWithEmail(email, password);
        setShowAuthModal(false);
      } catch (err: any) { toast.error('Invalid credentials.'); }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">×</button>
            <h2 className="text-2xl font-bold mb-6 text-center">{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none" required />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white font-medium py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                {isRegister ? 'Register Securely' : 'Sign In'}
              </button>
            </form>
            <div className="mt-4 flex items-center justify-between">
              <span className="border-b border-gray-200 flex-1"></span>
              <span className="text-xs text-gray-400 px-4">OR</span>
              <span className="border-b border-gray-200 flex-1"></span>
            </div>
            <button onClick={async () => { await signIn(); setShowAuthModal(false); }} className="mt-4 w-full border border-gray-300 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
              Continue with Google
            </button>
            <p className="mt-6 text-center text-sm text-gray-600">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}
              <button onClick={() => setIsRegister(!isRegister)} className="ml-1 text-indigo-600 font-medium hover:underline">
                {isRegister ? 'Sign in' : 'Register now'}
              </button>
            </p>
          </div>
        </div>
      )}

      <header className="px-6 py-4 flex items-center justify-between bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-indigo-600 fill-indigo-600" />
          <span className="text-xl font-bold tracking-tight">{config?.siteName || 'RapidSMM'}</span>
        </div>
        <div className="flex gap-3">
          {user ? (
            <div className="flex gap-3">
              {dbUser?.role === 'admin' && <Link to="/admin" className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 shadow-sm">Admin Panel</Link>}
              <Link to="/dashboard" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm">Dashboard</Link>
            </div>
          ) : (
            <button onClick={() => setShowAuthModal(true)} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm">Sign In</button>
          )}
        </div>
      </header>

      <main className="flex-1">
        <section className="px-6 py-24 md:py-32 max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-full border border-indigo-100">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span></span>
            {config?.siteDescription || 'The #1 Provider Network'}
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 !leading-tight">
            Scale your social growth <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">at lightning speed.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
            Access thousands of high-quality social media services from top global providers. Integrated API, secure local payments, and real-time order tracking.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {user ? (
              <Link to="/dashboard" className="px-8 py-4 text-base font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center gap-2">
                Go to Dashboard <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="px-8 py-4 text-base font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center gap-2">
                Get Started Now <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
