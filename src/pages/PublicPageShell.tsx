import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Zap, Circle } from 'lucide-react';
import { useTranslation, LanguageSwitcher } from '../lib/i18n';

export default function PublicPageShell({ children, title }: { children: React.ReactNode; title: string }) {
  const { t } = useTranslation();
  const { data: config } = useQuery({
    queryKey: ['client-config'],
    queryFn: async () => { const res = await fetch('/api/client/config'); if (!res.ok) throw new Error('API Error'); return res.json(); }
  });
  const siteName = config?.siteName || 'RapidSMM';

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/10 sticky top-0 z-50 bg-[#0B0F17]/80 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-amber-400 flex items-center justify-center">
            <Zap className="w-4 h-4 text-[#0B0F17]" fill="currentColor" />
          </div>
          <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>{siteName}</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-slate-400">
          <Link to="/services" className="hover:text-slate-100 transition-colors">{t('nav.services')}</Link>
          <Link to="/contact" className="hover:text-slate-100 transition-colors">{t('contact.title')}</Link>
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitcher className="border-white/10 text-slate-300 hover:bg-white/5" />
          <Link to="/" className="px-4 py-2 text-sm font-semibold text-[#0B0F17] bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors">{siteName}</Link>
        </div>
      </header>

      <main className="px-6 py-14 md:py-20 max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-10" style={{ fontFamily: "'Manrope', sans-serif" }}>{title}</h1>
        <div className="space-y-6 text-slate-300 leading-relaxed">
          {children}
        </div>
      </main>

      <footer className="border-t border-white/10 px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Circle className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{siteName}</span>
          </div>
          <div className="flex items-center gap-6 flex-wrap justify-center">
            <Link to="/services" className="hover:text-slate-300">{t('nav.services')}</Link>
            <Link to="/contact" className="hover:text-slate-300">{t('contact.title')}</Link>
            <Link to="/terms" className="hover:text-slate-300">{t('legal.terms')}</Link>
            <Link to="/privacy" className="hover:text-slate-300">{t('legal.privacy')}</Link>
            <Link to="/refund-policy" className="hover:text-slate-300">{t('legal.refund')}</Link>
          </div>
          <span>© {new Date().getFullYear()} {siteName}</span>
        </div>
      </footer>
    </div>
  );
}
