import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, Circle, LifeBuoy, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation, LanguageSwitcher } from '../lib/i18n';

export default function PublicPageShell({ children, title }: { children: React.ReactNode; title: string }) {
  const { t, dir } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data: config } = useQuery({
    queryKey: ['client-config'],
    queryFn: async () => { const res = await fetch('/api/client/config'); return res.ok ? res.json() : {}; }
  });
  const siteName = config?.siteName || 'RapidSMM';
  return (
    <div className="rapid-public" dir={dir}>
      <header className="rapid-public-header">
        <div className="rapid-public-nav">
          <Link to="/" className="rapid-public-brand"><span className="brand-mark">R</span><span>Rapid<span>SMM</span></span></Link>
          <nav className="rapid-public-links">
            <Link to="/services">{t('nav.services')}</Link>
            <Link to="/blog/">Blog</Link>
            <Link to="/contact">{t('contact.title')}</Link>
            <Link to="/support">Support</Link>
          </nav>
          <div className="rapid-public-actions">
            <LanguageSwitcher className="rapid-public-lang" />
            <Link to="/" className="rapid-public-cta">{dir === 'rtl' ? 'ابدأ الآن' : 'Get started'} <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <button className="rapid-public-menu" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X/> : <Menu/>}</button>
        </div>
        {open && <div className="rapid-public-mobile">
          <Link onClick={() => setOpen(false)} to="/services">{t('nav.services')}</Link><Link onClick={() => setOpen(false)} to="/blog/">Blog</Link><Link onClick={() => setOpen(false)} to="/contact">{t('contact.title')}</Link><Link onClick={() => setOpen(false)} to="/support">Support</Link>
        </div>}
      </header>
      <main className="rapid-public-main">
        <div className="rapid-public-hero"><div className="rapid-public-kicker"><Circle className="w-2.5 h-2.5"/> RapidSMM platform</div><h1>{title}</h1><div className="rapid-public-accent"/></div>
        <div className="rapid-public-body">{children}</div>
      </main>
      <footer className="rapid-public-footer">
        <div className="rapid-public-footer-inner">
          <div><Link to="/" className="rapid-public-brand"><span className="brand-mark">R</span><span>Rapid<span>SMM</span></span></Link><p>{dir === 'rtl' ? 'منصة خدمات تسويق وإدارة طلبات السوشيال ميديا.' : 'A clear platform for social media marketing services and order management.'}</p></div>
          <div className="rapid-public-footer-links"><Link to="/services">{t('nav.services')}</Link><Link to="/blog/">Blog</Link><Link to="/support">Support</Link><Link to="/terms">{t('legal.terms')}</Link><Link to="/privacy">{t('legal.privacy')}</Link><Link to="/refund-policy">{t('legal.refund')}</Link></div>
          <div className="rapid-public-footer-note">© {new Date().getFullYear()} {siteName}</div>
        </div>
      </footer>
    </div>
  );
}
