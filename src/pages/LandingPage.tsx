import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronDown, Globe2, Headphones, Layers3, Menu, ShieldCheck, Sparkles, Wallet, X, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const PLATFORMS = [
  ['Instagram', 'IG'], ['TikTok', 'TK'], ['YouTube', 'YT'], ['Facebook', 'FB'],
  ['Telegram', 'TG'], ['X / Twitter', 'X'], ['Spotify', 'SP'], ['Threads', 'TH']
];

const FAQS = [
  ['What is RapidSMM?', 'RapidSMM is a social media marketing panel where customers can discover services, fund a USD wallet, place orders and track delivery from one dashboard.'],
  ['How do I place an order?', 'Create an account, add funds, choose a category, section and service, then enter the target link and quantity.'],
  ['Do I need to share my social password?', 'No. Services should only request the target URL or other service-specific public information. Never share your social account password.'],
  ['Can resellers automate orders?', 'Yes. RapidSMM includes an API layer designed for resellers and software integrations.'],
  ['What currency is my wallet?', 'USD is the primary wallet currency. External payment methods can use their own settlement currency and are converted before the wallet is credited.'],
];

export default function LandingPage() {
  const { t, dir } = useTranslation();
  const navigate = useNavigate();
  const { user, dbUser, signIn, registerWithEmail, loginWithEmail } = useAuth();
  const [menu, setMenu] = useState(false);
  const [auth, setAuth] = useState<'login' | 'register' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [faq, setFaq] = useState(0);
  const referralFromUrl = new URLSearchParams(window.location.search).get('ref')?.trim().toUpperCase() || localStorage.getItem('ref') || '';
  const [referralCode, setReferralCode] = useState(referralFromUrl);
  const setIsRegister = (value: boolean) => setAuth(value ? 'register' : 'login');
  React.useEffect(() => { if (new URLSearchParams(window.location.search).get('ref')) setIsRegister(true); }, []);

  const { data: showcase } = useQuery({
    queryKey: ['public-showcase'],
    queryFn: async () => (await fetch('/api/public/showcase')).json(),
    retry: 1,
  });
  const { data: config } = useQuery({
    queryKey: ['client-config'],
    queryFn: async () => (await fetch('/api/client/config')).json(),
  });
  const services = showcase?.services || [];
  const serviceCount = Number(showcase?.serviceCount || 0);
  const categoryCount = Number(showcase?.categoryCount || 0);
  const siteName = config?.siteName || 'RapidSMM';

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (auth === 'register') {
        if (!referralFromUrl && referralCode) localStorage.setItem('ref', referralCode.trim().toUpperCase());
        if (!name.trim() || password.length < 8) throw new Error('Enter your name and an 8+ character password.');
        await registerWithEmail(email.trim(), password, name.trim());
      } else {
        await loginWithEmail(email.trim(), password);
      }
      // Close the auth modal immediately after Firebase accepts the credentials
      // and move the user into the protected client area. ClientLayout keeps a
      // proper loading state until the database sync is complete.
      setAuth(null);
      setEmail('');
      setPassword('');
      setName('');
      navigate('/dashboard', { replace: true });
    } catch (err: any) { toast.error(err?.message || 'Authentication failed'); }
  };

  const headline = useMemo(() => dir === 'rtl' ? 'نمو أسرع. طلبات أبسط. لوحة واحدة.' : 'Faster growth. Cleaner orders. One powerful panel.', [dir]);

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-900" dir={dir}>
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3" onClick={() => setMenu(false)}>
            <span className="brand-mark">R</span>
            <span className="text-xl font-black tracking-tight">Rapid<span className="text-violet-600">SMM</span></span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
            <Link to="/services" className="hover:text-violet-600">Services</Link>
            <a href="#how" className="hover:text-violet-600">How it works</a>
            <Link to="/blog/" className="hover:text-violet-600">Blog</Link>
            <Link to="/contact" className="hover:text-violet-600">Support</Link>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            {user ? <Link to="/dashboard" className="btn-primary">Dashboard <ArrowRight className="h-4 w-4" /></Link> : <><button onClick={() => setAuth('login')} className="btn-ghost">Sign in</button><button onClick={() => setAuth('register')} className="btn-primary">Get started <ArrowRight className="h-4 w-4" /></button></>}
          </div>
          <button className="rounded-xl p-2 md:hidden" onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button>
        </div>
        {menu && <div className="border-t border-slate-200 bg-white p-4 md:hidden"><div className="flex flex-col gap-2"><Link onClick={() => setMenu(false)} className="mobile-nav" to="/services">Services</Link><a onClick={() => setMenu(false)} className="mobile-nav" href="#how">How it works</a><Link onClick={() => setMenu(false)} className="mobile-nav" to="/blog/">Blog</Link><Link onClick={() => setMenu(false)} className="mobile-nav" to="/contact">Support</Link>{user ? <Link onClick={() => setMenu(false)} className="btn-primary justify-center" to="/dashboard">Dashboard</Link> : <><button onClick={() => {setMenu(false);setAuth('login')}} className="mobile-nav text-left">Sign in</button><button onClick={() => {setMenu(false);setAuth('register')}} className="btn-primary justify-center">Create account</button></>}</div></div>}
      </header>

      <main>
        <section className="relative overflow-hidden bg-slate-950 text-white">
          <div className="hero-grid absolute inset-0 opacity-70" />
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-violet-600/25 blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:py-28">
            <div className="max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.06] px-3 py-1.5 text-xs font-bold text-violet-200"><Sparkles className="h-3.5 w-3.5" /> RapidSMM • Social Growth Infrastructure</div>
              <h1 className="text-5xl font-black leading-[1.03] tracking-[-.04em] sm:text-6xl lg:text-7xl">{headline}</h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">{dir === 'rtl' ? 'خدمات تسويق السوشيال ميديا، أسعار مرنة للموزعين، محفظة بالدولار وواجهة API — كل ده في تجربة واحدة سريعة وواضحة.' : 'Social media services, reseller-friendly pricing, a USD wallet and a real API — wrapped in one fast, clear experience.'}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button onClick={() => setAuth('register')} className="btn-hero">Start for free <ArrowRight className="h-4 w-4" /></button>
                <Link to="/services" className="btn-hero-secondary">Browse services</Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-400"><span>✓ USD wallet</span><span>✓ Provider sync</span><span>✓ Reseller API</span><span>✓ Ticket support</span></div>
            </div>
            <div className="self-center">
              <div className="glass-card p-5 shadow-2xl shadow-violet-950/40">
                <div className="mb-5 flex items-center justify-between"><div><p className="text-xs text-slate-400">RapidSMM dashboard</p><p className="mt-1 text-2xl font-black">Order center</p></div><span className="status-dot">Live</span></div>
                <div className="space-y-3">
                  <div className="rounded-2xl bg-white/[.06] p-4"><div className="mb-3 flex items-center justify-between text-xs text-slate-400"><span>Category</span><span>1 / 3</span></div><div className="rounded-xl bg-white/[.08] px-4 py-3 font-semibold">Instagram</div></div>
                  <div className="rounded-2xl bg-white/[.06] p-4"><div className="mb-3 flex items-center justify-between text-xs text-slate-400"><span>Section</span><span>2 / 3</span></div><div className="rounded-xl bg-white/[.08] px-4 py-3 font-semibold">Followers</div></div>
                  <div className="rounded-2xl bg-white/[.06] p-4"><div className="mb-3 flex items-center justify-between text-xs text-slate-400"><span>Service</span><span>3 / 3</span></div><div className="rounded-xl bg-white/[.08] px-4 py-3 font-semibold">Instagram Followers — High Quality</div></div>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-violet-500/15 px-4 py-3"><span className="text-sm text-slate-300">Estimated charge</span><strong>$2.8400</strong></div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white"><div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-7 sm:grid-cols-4 sm:px-6 lg:px-8"><div className="stat"><b>{serviceCount || '—'}</b><span>Live services</span></div><div className="stat"><b>{categoryCount || '—'}</b><span>Categories</span></div><div className="stat"><b>USD</b><span>Wallet currency</span></div><div className="stat"><b>24/7</b><span>Panel access</span></div></div></section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"><div className="mb-8 flex items-end justify-between gap-4"><div><p className="eyebrow">PLATFORMS</p><h2 className="section-title">One panel. Every major network.</h2></div><Link className="hidden text-sm font-bold text-violet-600 sm:block" to="/services">View all services →</Link></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">{PLATFORMS.map(([name, initials]) => <Link to="/services" key={name} className="platform-card"><span>{initials}</span><b>{name}</b></Link>)}</div></section>

        <section id="how" className="bg-white"><div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"><div className="max-w-2xl"><p className="eyebrow">HOW IT WORKS</p><h2 className="section-title">Three steps. No clutter.</h2><p className="section-copy">The ordering experience is intentionally simple: choose the market, narrow the service type, select the exact service, then place the order.</p></div><div className="mt-12 grid gap-5 md:grid-cols-3">{[['01','Create account','Start with a free account and access the dashboard.'],['02','Fund your wallet','Add USD balance using an available payment method.'],['03','Place & track','Choose Category → Section → Service and track every order.']].map(([n,t,d]) => <div key={n} className="step-card"><span>{n}</span><h3>{t}</h3><p>{d}</p></div>)}</div></div></section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">{[[Zap,'Fast dispatch','Orders can be routed to connected provider APIs automatically.'],[Wallet,'USD wallet','Keep one clear base currency across orders and wallet history.'],[Layers3,'Provider-ready','Import service names, rates, limits and capabilities from providers.'],[Headphones,'Human support','Use tickets and contact channels when an order needs attention.']].map(([Icon,title,body]) => {const I=Icon as any; return <div className="feature-card" key={String(title)}><I className="h-6 w-6 text-violet-600"/><h3>{title as string}</h3><p>{body as string}</p></div>})}</div></section>

        <section className="bg-slate-950 text-white"><div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"><div className="grid gap-12 lg:grid-cols-2"><div><p className="eyebrow text-violet-300">LIVE CATALOG</p><h2 className="section-title text-white">Pricing that can compete.</h2><p className="mt-4 max-w-xl text-slate-400">Service pricing is controlled from the admin side and can be synced from providers. Your margin stays yours.</p><Link to="/services" className="btn-hero mt-7 inline-flex">Open catalog <ArrowRight className="h-4 w-4" /></Link></div><div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[.03]">{services.length ? services.slice(0,6).map((s:any,i:number)=><div key={s.id} className={`flex items-center justify-between gap-4 px-5 py-4 ${i ? 'border-t border-white/10':''}`}><div className="min-w-0"><p className="truncate font-semibold">{s.name}</p><p className="mt-1 text-xs text-slate-500">{s.category}</p></div><b className="shrink-0">${Number(s.rate).toFixed(4)}</b></div>) : <div className="p-8 text-center text-slate-500">Connect a provider to populate live pricing.</div>}</div></div></div></section>

        <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6"><div className="text-center"><p className="eyebrow">FAQ</p><h2 className="section-title">Questions, answered.</h2></div><div className="mt-10 rounded-3xl border border-slate-200 bg-white px-6 shadow-sm">{FAQS.map(([q,a],i)=><div key={q} className="border-b border-slate-100 last:border-0"><button className="flex w-full items-center justify-between gap-5 py-5 text-left font-bold" onClick={()=>setFaq(faq===i?-1:i)}><span>{q}</span><ChevronDown className={`h-5 w-5 text-slate-400 transition ${faq===i?'rotate-180':''}`} /></button>{faq===i&&<p className="pb-5 pr-8 text-sm leading-7 text-slate-500">{a}</p>}</div>)}</div></section>

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8"><div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-700 to-indigo-900 px-6 py-12 text-center text-white sm:px-12"><ShieldCheck className="mx-auto h-8 w-8 text-violet-200"/><h2 className="mt-4 text-3xl font-black">Ready to build your next order flow?</h2><p className="mx-auto mt-3 max-w-xl text-violet-100">Start free, connect your provider network and let RapidSMM handle the repetitive parts.</p><button onClick={()=>setAuth('register')} className="btn-hero mt-7">Create your RapidSMM account <ArrowRight className="h-4 w-4"/></button></div></section>
      </main>

      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 text-sm text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8"><div><span className="font-black text-slate-900">Rapid<span className="text-violet-600">SMM</span></span><span className="ml-3">Social media services & reseller infrastructure.</span></div><div className="flex flex-wrap gap-5"><Link to="/services">Services</Link><Link to="/contact">Support</Link><Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link><Link to="/refund-policy">Refunds</Link></div></div></footer>

      {auth && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"><div className="flex items-start justify-between"><div><div className="brand-mark mb-4">R</div><h2 className="text-2xl font-black">{auth==='register'?'Create your account':'Welcome back'}</h2><p className="mt-1 text-sm text-slate-500">{siteName}</p></div><button onClick={()=>setAuth(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X/></button></div><form onSubmit={handleAuth} className="mt-7 space-y-4">{auth==='register'&&<div><label className="label-primary">Name</label><input className="input-primary" value={name} onChange={e=>setName(e.target.value)} required/></div>}<div><label className="label-primary">Email</label><input className="input-primary" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div><div><label className="label-primary">Password</label><input className="input-primary" type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required/></div>{auth==='register'&&<div><label className="label-primary">Referral code <span className="text-slate-400">(optional)</span></label><input className="input-primary" value={referralCode} onChange={e=>{if(!referralFromUrl)setReferralCode(e.target.value.toUpperCase())}} disabled={!!referralFromUrl} placeholder="Optional referral code"/><p className="mt-1 text-xs text-slate-500">{referralFromUrl?'Referral code from your invitation link is locked and cannot be changed.':'You can enter a referral code if someone invited you.'}</p></div>}<button className="btn-primary w-full justify-center">{auth==='register'?'Create account':'Sign in'}</button></form><div className="mt-5 text-center text-sm text-slate-500">{auth==='register'?<>Already have an account? <button className="font-bold text-violet-600" onClick={()=>setAuth('login')}>Sign in</button></>:<>New here? <button className="font-bold text-violet-600" onClick={()=>setAuth('register')}>Create account</button></>}</div></div></div>}
    </div>
  );
}
