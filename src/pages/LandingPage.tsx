import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowRight, Zap, ShieldCheck, Wallet, Cable, LifeBuoy, ChevronDown,
  CheckCircle2, Circle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation, LanguageSwitcher } from '../lib/i18n';
import SEO, { SITE } from '../components/SEO';

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
  { icon: Zap, titleKey: 'landing.feature1Title', bodyKey: 'landing.feature1Body' },
  { icon: Wallet, titleKey: 'landing.feature2Title', bodyKey: 'landing.feature2Body' },
  { icon: Cable, titleKey: 'landing.feature3Title', bodyKey: 'landing.feature3Body' },
  { icon: LifeBuoy, titleKey: 'landing.feature4Title', bodyKey: 'landing.feature4Body' },
];

const STEPS = [
  { n: '01', titleKey: 'landing.step1Title', bodyKey: 'landing.step1Body' },
  { n: '02', titleKey: 'landing.step2Title', bodyKey: 'landing.step2Body' },
  { n: '03', titleKey: 'landing.step3Title', bodyKey: 'landing.step3Body' },
];

const FAQS = [
  { qKey: 'landing.faq1Q', aKey: 'landing.faq1A' },
  { qKey: 'landing.faq2Q', aKey: 'landing.faq2A' },
  { qKey: 'landing.faq3Q', aKey: 'landing.faq3A' },
  { qKey: 'landing.faq4Q', aKey: 'landing.faq4A' },
  { qKey: 'landing.faq5Q', aKey: 'landing.faq5A' },
];

function LiveFeedPreview() {
  const { t } = useTranslation();
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
        <span className="text-xs text-slate-400">{t('landing.liveFeedLabel')}</span>
        <span className="flex items-center gap-1.5 text-xs text-emerald-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
          </span>
          {t('landing.liveFeedSyncing')}
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
        <span className="text-slate-400">{t('landing.walletBalance')}</span>
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
  const { t } = useTranslation();

  const rows: any[] = data?.services || [];
  if (!rows.length) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-slate-400">
            <th className="px-5 py-3 font-normal">{t('landing.tableService')}</th>
            <th className="px-5 py-3 font-normal hidden sm:table-cell">{t('landing.tableCategory')}</th>
            <th className="px-5 py-3 font-normal text-right">{t('landing.tableRate')}</th>
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

function langFromDocument(): 'ar' | 'en' { return document.documentElement.lang === 'ar' ? 'ar' : 'en'; }

export default function LandingPage() {
  const { t } = useTranslation();
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
  const homeTitle = t('landing.seoTitle');
  const homeDescription = t('landing.seoDescription');
  const homeKeywords = t('landing.seoKeywords').split('|');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister) {
      if (password.length < 8) return toast.error(t('landing.passwordMinLength'));
      try { await registerWithEmail(email, password); setShowAuthModal(false); }
      catch (err: any) { toast.error(err.message); }
    } else {
      try { await loginWithEmail(email, password); setShowAuthModal(false); }
      catch (err: any) { toast.error(t('landing.invalidCredentials')); }
    }
  };

  return (
    <>
      <SEO title={homeTitle} description={homeDescription} path="/" keywords={homeKeywords} lang={langFromDocument()} alternates={{ ar:'/ar', en:'/en', xDefault:'/en' }} jsonLd={[
        { '@context':'https://schema.org', '@type':'WebSite', name:siteName, url:SITE, description:homeDescription },
        { '@context':'https://schema.org', '@type':'Organization', name:siteName, url:SITE },
        { '@context':'https://schema.org', '@type':'FAQPage', mainEntity: FAQS.map(f => ({ '@type':'Question', name:t(f.qKey), acceptedAnswer:{ '@type':'Answer', text:t(f.aKey) } })) }
      ]} />
    <div className="min-h-screen bg-[#0B0F17] text-slate-100" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
          <div className="bg-[#121826] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300">×</button>
            <h2 className="text-2xl font-bold mb-1 text-center text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
              {isRegister ? t('common.createAccount') : t('common.welcomeBack')}
            </h2>
            <p className="text-center text-sm text-slate-400 mb-6">{isRegister ? t('landing.authRegisterSubtitle') : t('landing.authLoginSubtitle', { site: siteName })}</p>
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{t('common.email')}</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg outline-none text-slate-100 focus:border-amber-400/50" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{t('common.password')}</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg outline-none text-slate-100 focus:border-amber-400/50" required />
              </div>
              <button type="submit" className="w-full bg-amber-400 text-[#0B0F17] font-semibold py-2.5 rounded-lg hover:bg-amber-300 transition-colors">
                {isRegister ? t('common.createAccountBtn') : t('common.signIn')}
              </button>
            </form>
            <div className="mt-4 flex items-center justify-between">
              <span className="border-b border-white/10 flex-1"></span>
              <span className="text-xs text-slate-500 px-4">{t('common.or')}</span>
              <span className="border-b border-white/10 flex-1"></span>
            </div>
            <button onClick={async () => { try { await signIn(); setShowAuthModal(false); } catch (err: any) { toast.error(err.message || t('landing.googleSignInFailed')); } }} className="mt-4 w-full border border-white/10 text-slate-200 font-medium py-2.5 rounded-lg hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
              {t('common.continueWithGoogle')}
            </button>
            <p className="mt-6 text-center text-sm text-slate-400">
              {isRegister ? t('common.alreadyHaveAccount') : t('common.dontHaveAccount')}
              <button onClick={() => setIsRegister(!isRegister)} className="ml-1 text-amber-400 font-medium hover:underline">
                {isRegister ? t('common.signInLink') : t('common.registerNow')}
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
          <a href="#features" className="hover:text-slate-100 transition-colors">{t('landing.navFeatures')}</a>
          <Link to="/services" className="hover:text-slate-100 transition-colors">{t('nav.services')}</Link>
          <a href="#faq" className="hover:text-slate-100 transition-colors">{t('landing.navFaq')}</a>
          <Link to="/contact" className="hover:text-slate-100 transition-colors">{t('contact.title')}</Link>
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitcher className="border-white/10 text-slate-300 hover:bg-white/5" />
          {user ? (
            <div className="flex gap-3">
              {dbUser?.role === 'admin' && <Link to="/admin" className="px-4 py-2 text-sm font-medium text-slate-100 border border-white/10 rounded-lg hover:bg-white/5">{t('landing.adminPanel')}</Link>}
              <Link to="/dashboard" className="px-4 py-2 text-sm font-semibold text-[#0B0F17] bg-amber-400 rounded-lg hover:bg-amber-300">{t('landing.dashboard')}</Link>
            </div>
          ) : (
            <div className="flex gap-3">
              <button onClick={() => { setIsRegister(false); setShowAuthModal(true); }} className="hidden sm:inline px-4 py-2 text-sm font-medium text-slate-300 hover:text-white">{t('landing.signIn')}</button>
              <button onClick={() => { setIsRegister(true); setShowAuthModal(true); }} className="px-4 py-2 text-sm font-semibold text-[#0B0F17] bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors">{t('landing.createAccount')}</button>
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
                {config?.siteDescription || t('landing.defaultTagline')}
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight !leading-[1.08] text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
                {t('landing.heroTitle')}
              </h1>
              <p className="text-lg text-slate-400 mt-6 max-w-lg">
                {t('landing.heroSubtitle', { site: siteName })}
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-8">
                {user ? (
                  <Link to="/dashboard" className="px-6 py-3.5 text-sm font-semibold text-[#0B0F17] bg-amber-400 rounded-xl hover:bg-amber-300 transition-colors flex items-center gap-2">
                    {t('landing.goToDashboard')} <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <button onClick={() => { setIsRegister(true); setShowAuthModal(true); }} className="px-6 py-3.5 text-sm font-semibold text-[#0B0F17] bg-amber-400 rounded-xl hover:bg-amber-300 transition-colors flex items-center gap-2">
                    {t('landing.createFreeAccount')} <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                <a href="#pricing" className="px-6 py-3.5 text-sm font-medium text-slate-200 border border-white/10 rounded-xl hover:bg-white/5 transition-colors">
                  {t('landing.seePricing')}
                </a>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 pt-8 text-sm text-slate-500">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> {t('landing.trustNoWait')}</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> {t('landing.trustLocalPayment')}</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> {t('landing.trustApi')}</span>
              </div>
            </div>
            <LiveFeedPreview />
          </div>
        </section>

        {/* Platform strip */}
        <section className="border-y border-white/10 bg-white/[0.02]">
          <div className="max-w-6xl mx-auto px-6 py-5 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-slate-500">
            <span className="text-slate-600">{t('landing.platformsLabel')}</span>
            {PLATFORMS.map((p, i) => { const slug = ['instagram','tiktok','youtube','facebook','twitter','telegram','spotify','threads'][i]; return <Link key={p} to={`/en/${slug}-services`} className="hover:text-slate-200 hover:underline">{p}</Link>; })}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="px-6 py-20 md:py-28 max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-[minmax(0,320px)_1fr] gap-12">
            <div>
              <h2 className="text-3xl font-bold text-white !leading-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
                {t('landing.featuresTitle')}
              </h2>
              <p className="text-slate-400 mt-4">
                {t('landing.featuresSubtitle')}
              </p>
            </div>
            <div className="divide-y divide-white/10">
              {FEATURES.map(f => (
                <div key={f.titleKey} className="flex gap-5 py-6 first:pt-0">
                  <f.icon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-slate-100 font-semibold mb-1">{t(f.titleKey)}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{t(f.bodyKey)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="px-6 py-20 md:py-24 border-t border-white/10 bg-white/[0.02]">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-12" style={{ fontFamily: "'Manrope', sans-serif" }}>{t('landing.stepsTitle')}</h2>
            <div className="grid md:grid-cols-3 gap-10">
              {STEPS.map(s => (
                <div key={s.n}>
                  <span className="text-sm text-amber-400 tabular-nums">{s.n}</span>
                  <h3 className="text-lg font-semibold text-white mt-3 mb-2">{t(s.titleKey)}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{t(s.bodyKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing preview */}
        <section id="pricing" className="px-6 py-20 md:py-28 max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-3xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>{t('landing.pricingTitle')}</h2>
              <p className="text-slate-400 mt-3 max-w-xl">
                {showcase?.serviceCount ? t('landing.pricingSubtitleWithCounts', { count: showcase.serviceCount, cats: showcase.categoryCount }) : t('landing.pricingSubtitleFallback')} {t('landing.pricingSubtitleSuffix')}
              </p>
            </div>
          </div>
          <PricingPreview />
          <div className="mt-8">
            <Link to="/services" className="inline-flex items-center gap-2 text-sm font-medium text-amber-400 hover:underline">{t('landing.viewFullPricing')} <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </section>

        {/* Security */}
        <section className="px-6 py-20 md:py-24 border-t border-white/10 bg-white/[0.02]">
          <div className="max-w-6xl mx-auto grid md:grid-cols-[minmax(0,320px)_1fr] gap-12 items-start">
            <div className="flex items-start gap-4">
              <ShieldCheck className="w-8 h-8 text-amber-400 shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>{t('landing.securityTitle')}</h2>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-8 text-sm">
              <div>
                <h3 className="text-slate-100 font-semibold mb-1.5">{t('landing.security1Title')}</h3>
                <p className="text-slate-400 leading-relaxed">{t('landing.security1Body')}</p>
              </div>
              <div>
                <h3 className="text-slate-100 font-semibold mb-1.5">{t('landing.security2Title')}</h3>
                <p className="text-slate-400 leading-relaxed">{t('landing.security2Body')}</p>
              </div>
              <div>
                <h3 className="text-slate-100 font-semibold mb-1.5">{t('landing.security3Title')}</h3>
                <p className="text-slate-400 leading-relaxed">{t('landing.security3Body')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="px-6 py-20 md:py-28 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-10" style={{ fontFamily: "'Manrope', sans-serif" }}>{t('landing.faqTitle')}</h2>
          <div>
            {FAQS.map(f => <FaqItem key={f.qKey} q={t(f.qKey)} a={t(f.aKey)} />)}
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 py-20 md:py-24 bg-amber-400">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#0B0F17]" style={{ fontFamily: "'Manrope', sans-serif" }}>
              {t('landing.ctaTitle')}
            </h2>
            <p className="text-[#0B0F17]/70 mt-4 max-w-lg mx-auto">
              {t('landing.ctaSubtitle')}
            </p>
            {user ? (
              <Link to="/dashboard" className="inline-flex items-center gap-2 mt-8 px-7 py-3.5 text-sm font-semibold text-white bg-[#0B0F17] rounded-xl hover:bg-slate-900 transition-colors">
                {t('landing.goToDashboard')} <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <button onClick={() => { setIsRegister(true); setShowAuthModal(true); }} className="inline-flex items-center gap-2 mt-8 px-7 py-3.5 text-sm font-semibold text-white bg-[#0B0F17] rounded-xl hover:bg-slate-900 transition-colors">
                {t('landing.createFreeAccount')} <ArrowRight className="w-4 h-4" />
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
          <div className="flex items-center gap-6 flex-wrap justify-center">
            <a href="#features" className="hover:text-slate-300">{t('landing.navFeatures')}</a>
            <Link to="/services" className="hover:text-slate-300">{t('nav.services')}</Link>
            <a href="#faq" className="hover:text-slate-300">{t('landing.navFaq')}</a>
            <Link to="/contact" className="hover:text-slate-300">{t('landing.footerSupport')}</Link>
            <Link to="/terms" className="hover:text-slate-300">{t('legal.terms')}</Link>
            <Link to="/privacy" className="hover:text-slate-300">{t('legal.privacy')}</Link>
            <Link to="/refund-policy" className="hover:text-slate-300">{t('legal.refund')}</Link>
          </div>
          <span>© {new Date().getFullYear()} {siteName}</span>
        </div>
      </footer>
    </div>
    </>
  );
}
