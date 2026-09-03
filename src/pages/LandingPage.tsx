import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowRight, Zap, ShieldCheck, Wallet, Cable, LifeBuoy, ChevronDown,
  CheckCircle2, Circle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'X / Twitter', 'Telegram', 'Spotify', 'Threads'];

const FEED_SAMPLE = [
  { label: 'Instagram Followers', qty: '+1,000', status: 'Completed' },
  { label: 'TikTok Views', qty: '+10,000', status: 'Processing' },
  { label: 'YouTube Watch Time', qty: '+500 hrs', status: 'In progress' },
  { label: 'Facebook Page Likes', qty: '+250', status: 'Completed' },
  { label: 'Telegram Members', qty: '+2,000', status: 'Processing' },
  { label: 'Spotify Plays', qty: '+5,000', status: 'Completed' },
];

const FEATURES = [
  {
    icon: Zap,
    title: 'Orders dispatch automatically',
    body: 'Place an order and it goes straight to the provider network \u2014 no manual approval queue holding up your delivery.',
  },
  {
    icon: Wallet,
    title: 'A wallet built for Egypt',
    body: 'Top up with Vodafone Cash, a credit or debit card, or crypto. Your balance updates the moment a payment is confirmed.',
  },
  {
    icon: Cable,
    title: 'A real API for resellers',
    body: 'Every action in the dashboard \u2014 ordering, checking status, checking your balance \u2014 is also a documented API call you can automate.',
  },
  {
    icon: LifeBuoy,
    title: 'Support that answers',
    body: 'Open a ticket from your dashboard any time. A person on our team follows up \u2014 this isn\u2019t a chatbot loop.',
  },
];

const STEPS = [
  { n: '01', title: 'Create your account', body: 'Sign up with email or Google. No approval wait \u2014 you can add funds right away.' },
  { n: '02', title: 'Add funds to your wallet', body: 'Vodafone Cash, card, or crypto. Your balance reflects the payment as soon as it clears.' },
  { n: '03', title: 'Place an order and track it', body: 'Pick a service, paste your link, set the quantity. Watch the status update in your dashboard.' },
];

const FAQS = [
  {
    q: 'What can I actually order here?',
    a: 'Followers, likes, views, comments and more across Instagram, TikTok, YouTube, Facebook, Telegram, Spotify, X and Threads. The exact list depends on what\u2019s active in your dashboard \u2014 sign in to see live pricing and minimum/maximum quantities for every service.',
  },
  {
    q: 'How fast is delivery?',
    a: 'Most orders start within minutes of payment clearing \u2014 dispatch to the provider network is automatic, not manually queued. Larger orders run gradually and you can watch the remaining count drop from your dashboard.',
  },
  {
    q: 'What payment methods do you support?',
    a: 'Vodafone Cash for local transfers, credit/debit cards through Kashier, and crypto. Balances update automatically once a payment is confirmed \u2014 no manual top-up requests.',
  },
  {
    q: 'Can I automate orders instead of using the dashboard?',
    a: 'Yes \u2014 every account gets an API key. You can place orders, check status, and check your balance programmatically, which is useful if you\u2019re reselling or running your own tools on top.',
  },
  {
    q: 'Is my payment and account data safe?',
    a: 'Payments are processed through Kashier, not stored on our servers. Your dashboard is protected by Firebase authentication, and every wallet transaction is written to an append-only ledger so your balance history can always be reconciled.',
  },
];

function LiveFeedPreview() {
  const [rows, setRows] = useState(FEED_SAMPLE.slice(0, 3));
  const idx = useRef(3);
  useEffect(() => {
    const id = setInterval(() => {
      setRows(prev => {
        const next = FEED_SAMPLE[idx.current % FEED_SAMPLE.length];
        idx.current += 1;
        return [next, ...prev].slice(0, 4);
      });
    }, 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-slate-400">Live tracking preview</span>
        <span className="flex items-center gap-1.5 text-xs text-emerald-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
          </span>
          syncing
        </span>
      </div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={`${r.label}-${i}-${r.qty}`} className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3.5 py-3 text-sm">
            <div className="min-w-0">
              <div className="text-slate-100 truncate">{r.label}</div>
              <div className="text-slate-500 text-xs mt-0.5 tabular-nums">{r.qty}</div>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
              r.status === 'Completed' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-amber-400/10 text-amber-400'
            }`}>{r.status}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
        <span className="text-slate-400">Wallet balance</span>
        <span className="text-slate-100 font-medium tabular-nums">128.40 EGP</span>
      </div>
    </div>
  );
}

function PricingPreview() {
  const { data } = useQuery({
    queryKey: ['public-showcase'],
    queryFn: async () => {
      const res = await fetch('/api/public/showcase');
      if (!res.ok) throw new Error('Failed to load');
      return res.json();
    },
    retry: 1,
  });

  const rows: any[] = data?.services || [];
  if (!rows.length) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-slate-400">
            <th className="px-5 py-3 font-normal">Service</th>
            <th className="px-5 py-3 font-normal hidden sm:table-cell">Category</th>
            <th className="px-5 py-3 font-normal text-right">Rate / 1,000</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr key={s.id} className={i !== rows.length - 1 ? 'border-b border-white/[0.06]' : ''}>
              <td className="px-5 py-3.5 text-slate-100">{s.name}</td>
              <td className="px-5 py-3.5 text-slate-400 hidden sm:table-cell">{s.category}</td>
              <td className="px-5 py-3.5 text-right text-slate-100 tabular-nums">{Number(s.rate).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10 py-5">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between text-left gap-4">
        <span className="text-slate-100 font-medium">{q}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="mt-3 text-sm leading-relaxed text-slate-400 max-w-2xl">{a}</p>}
    </div>
  );
}

export default function LandingPage() {
  const { data: config } = useQuery({
    queryKey: ['client-config'],
    queryFn: async () => {
      const res = await fetch('/api/client/config');
      if (!res.ok) throw new Error('API Error');
      return res.json();
    }
  });
  const { data: showcase } = useQuery({
    queryKey: ['public-showcase'],
    queryFn: async () => { const res = await fetch('/api/public/showcase'); if (!res.ok) throw new Error('failed'); return res.json(); },
    retry: 1,
  });

  const { user, dbUser, signIn, registerWithEmail, loginWithEmail } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRegister, setIsRegister] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  useEffect(() => { if (new URLSearchParams(window.location.search).get('ref')) { setIsRegister(true); setShowAuthModal(true); } }, []);

  const siteName = config?.siteName || 'RapidSMM';

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister) {
      if (password.length < 8) return toast.error('Password must be at least 8 characters.');
      try { await registerWithEmail(email, password); setShowAuthModal(false); }
      catch (err: any) { toast.error(err.message); }
    } else {
      try { await loginWithEmail(email, password); setShowAuthModal(false); }
      catch (err: any) { toast.error('Invalid credentials.'); }
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
          <div className="bg-[#121826] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300">×</button>
            <h2 className="text-2xl font-bold mb-1 text-center text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
              {isRegister ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-center text-sm text-slate-400 mb-6">{isRegister ? 'Free to join. Add funds when you\u2019re ready.' : `Sign in to ${siteName}`}</p>
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg outline-none text-slate-100 focus:border-amber-400/50" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg outline-none text-slate-100 focus:border-amber-400/50" required />
              </div>
              <button type="submit" className="w-full bg-amber-400 text-[#0B0F17] font-semibold py-2.5 rounded-lg hover:bg-amber-300 transition-colors">
                {isRegister ? 'Create account' : 'Sign in'}
              </button>
            </form>
            <div className="mt-4 flex items-center justify-between">
              <span className="border-b border-white/10 flex-1"></span>
              <span className="text-xs text-slate-500 px-4">OR</span>
              <span className="border-b border-white/10 flex-1"></span>
            </div>
            <button onClick={async () => { try { await signIn(); setShowAuthModal(false); } catch (err: any) { toast.error(err.message || 'Google sign-in failed'); } }} className="mt-4 w-full border border-white/10 text-slate-200 font-medium py-2.5 rounded-lg hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
              Continue with Google
            </button>
            <p className="mt-6 text-center text-sm text-slate-400">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}
              <button onClick={() => setIsRegister(!isRegister)} className="ml-1 text-amber-400 font-medium hover:underline">
                {isRegister ? 'Sign in' : 'Register now'}
              </button>
            </p>
          </div>
        </div>
      )}

      <header className="px-6 py-4 flex items-center justify-between border-b border-white/10 sticky top-0 z-50 bg-[#0B0F17]/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-amber-400 flex items-center justify-center">
            <Zap className="w-4 h-4 text-[#0B0F17]" fill="currentColor" />
          </div>
          <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>{siteName}</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-slate-400">
          <a href="#features" className="hover:text-slate-100 transition-colors">Features</a>
          <a href="#pricing" className="hover:text-slate-100 transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-slate-100 transition-colors">FAQ</a>
        </nav>
        <div className="flex gap-3">
          {user ? (
            <div className="flex gap-3">
              {dbUser?.role === 'admin' && <Link to="/admin" className="px-4 py-2 text-sm font-medium text-slate-100 border border-white/10 rounded-lg hover:bg-white/5">Admin Panel</Link>}
              <Link to="/dashboard" className="px-4 py-2 text-sm font-semibold text-[#0B0F17] bg-amber-400 rounded-lg hover:bg-amber-300">Dashboard</Link>
            </div>
          ) : (
            <div className="flex gap-3">
              <button onClick={() => { setIsRegister(false); setShowAuthModal(true); }} className="hidden sm:inline px-4 py-2 text-sm font-medium text-slate-300 hover:text-white">Sign in</button>
              <button onClick={() => { setIsRegister(true); setShowAuthModal(true); }} className="px-4 py-2 text-sm font-semibold text-[#0B0F17] bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors">Create account</button>
            </div>
          )}
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="px-6 pt-16 pb-20 md:pt-24 md:pb-28 max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium text-amber-400 bg-amber-400/10 rounded-full border border-amber-400/20 mb-6">
                {config?.siteDescription || 'Automated social media growth, dispatched instantly'}
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight !leading-[1.08] text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Order social growth like you order anything else online.
              </h1>
              <p className="text-lg text-slate-400 mt-6 max-w-lg">
                Pick a service, paste a link, and watch it move. {siteName} connects you to a live provider network with automated dispatch, real-time tracking, and payment methods built for Egypt.
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-8">
                {user ? (
                  <Link to="/dashboard" className="px-6 py-3.5 text-sm font-semibold text-[#0B0F17] bg-amber-400 rounded-xl hover:bg-amber-300 transition-colors flex items-center gap-2">
                    Go to dashboard <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <button onClick={() => { setIsRegister(true); setShowAuthModal(true); }} className="px-6 py-3.5 text-sm font-semibold text-[#0B0F17] bg-amber-400 rounded-xl hover:bg-amber-300 transition-colors flex items-center gap-2">
                    Create your free account <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                <a href="#pricing" className="px-6 py-3.5 text-sm font-medium text-slate-200 border border-white/10 rounded-xl hover:bg-white/5 transition-colors">
                  See live pricing
                </a>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 pt-8 text-sm text-slate-500">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> No approval wait</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Local payment methods</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> API included</span>
              </div>
            </div>
            <LiveFeedPreview />
          </div>
        </section>

        {/* Platform strip */}
        <section className="border-y border-white/10 bg-white/[0.02]">
          <div className="max-w-6xl mx-auto px-6 py-5 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-slate-500">
            <span className="text-slate-600">Supported platforms</span>
            {PLATFORMS.map(p => <span key={p}>{p}</span>)}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="px-6 py-20 md:py-28 max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-[minmax(0,320px)_1fr] gap-12">
            <div>
              <h2 className="text-3xl font-bold text-white !leading-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Built to run without you watching it
              </h2>
              <p className="text-slate-400 mt-4">
                Every part of the order lifecycle \u2014 dispatch, status checks, wallet updates \u2014 runs on its own. You place the order; the system does the rest.
              </p>
            </div>
            <div className="divide-y divide-white/10">
              {FEATURES.map(f => (
                <div key={f.title} className="flex gap-5 py-6 first:pt-0">
                  <f.icon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-slate-100 font-semibold mb-1">{f.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="px-6 py-20 md:py-24 border-t border-white/10 bg-white/[0.02]">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-12" style={{ fontFamily: "'Manrope', sans-serif" }}>Three steps, then it's automatic</h2>
            <div className="grid md:grid-cols-3 gap-10">
              {STEPS.map(s => (
                <div key={s.n}>
                  <span className="text-sm text-amber-400 tabular-nums">{s.n}</span>
                  <h3 className="text-lg font-semibold text-white mt-3 mb-2">{s.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing preview */}
        <section id="pricing" className="px-6 py-20 md:py-28 max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-3xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>A sample of what's live right now</h2>
              <p className="text-slate-400 mt-3 max-w-xl">
                {showcase?.serviceCount ? `${showcase.serviceCount} services across ${showcase.categoryCount} categories are active today.` : 'Live pricing, pulled straight from the dashboard.'} Sign in to see the full list with minimum and maximum order sizes.
              </p>
            </div>
          </div>
          <PricingPreview />
          <div className="mt-8">
            {user ? (
              <Link to="/dashboard/services" className="inline-flex items-center gap-2 text-sm font-medium text-amber-400 hover:underline">View the full price list <ArrowRight className="w-4 h-4" /></Link>
            ) : (
              <button onClick={() => { setIsRegister(true); setShowAuthModal(true); }} className="inline-flex items-center gap-2 text-sm font-medium text-amber-400 hover:underline">Create an account to see full pricing <ArrowRight className="w-4 h-4" /></button>
            )}
          </div>
        </section>

        {/* Security */}
        <section className="px-6 py-20 md:py-24 border-t border-white/10 bg-white/[0.02]">
          <div className="max-w-6xl mx-auto grid md:grid-cols-[minmax(0,320px)_1fr] gap-12 items-start">
            <div className="flex items-start gap-4">
              <ShieldCheck className="w-8 h-8 text-amber-400 shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>Your balance is never a guess</h2>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-8 text-sm">
              <div>
                <h3 className="text-slate-100 font-semibold mb-1.5">Ledger-backed wallet</h3>
                <p className="text-slate-400 leading-relaxed">Every credit and debit is written to a transaction log, so your balance history can always be reconciled.</p>
              </div>
              <div>
                <h3 className="text-slate-100 font-semibold mb-1.5">Payments via Kashier</h3>
                <p className="text-slate-400 leading-relaxed">Card payments are processed by Kashier directly \u2014 we never see or store your card details.</p>
              </div>
              <div>
                <h3 className="text-slate-100 font-semibold mb-1.5">Firebase authentication</h3>
                <p className="text-slate-400 leading-relaxed">Sign in with Google or a password, backed by the same auth infrastructure used across millions of apps.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="px-6 py-20 md:py-28 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-10" style={{ fontFamily: "'Manrope', sans-serif" }}>Questions people ask before signing up</h2>
          <div>
            {FAQS.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 py-20 md:py-24 bg-amber-400">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#0B0F17]" style={{ fontFamily: "'Manrope', sans-serif" }}>
              Your first order can be running in the next five minutes.
            </h2>
            <p className="text-[#0B0F17]/70 mt-4 max-w-lg mx-auto">
              Create an account, add funds with a method that works for you, and place your first order.
            </p>
            {user ? (
              <Link to="/dashboard" className="inline-flex items-center gap-2 mt-8 px-7 py-3.5 text-sm font-semibold text-white bg-[#0B0F17] rounded-xl hover:bg-slate-900 transition-colors">
                Go to dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <button onClick={() => { setIsRegister(true); setShowAuthModal(true); }} className="inline-flex items-center gap-2 mt-8 px-7 py-3.5 text-sm font-semibold text-white bg-[#0B0F17] rounded-xl hover:bg-slate-900 transition-colors">
                Create your free account <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Circle className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{siteName}</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-slate-300">Features</a>
            <a href="#pricing" className="hover:text-slate-300">Pricing</a>
            <a href="#faq" className="hover:text-slate-300">FAQ</a>
            {config?.supportEmail && <a href={`mailto:${config.supportEmail}`} className="hover:text-slate-300">Support</a>}
          </div>
          <span>© {new Date().getFullYear()} {siteName}</span>
        </div>
      </footer>
    </div>
  );
}
