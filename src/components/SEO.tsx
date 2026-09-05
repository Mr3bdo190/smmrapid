import { useEffect } from 'react';

type SEOProps = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  lang?: 'ar' | 'en';
  type?: 'website' | 'article';
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  alternates?: { ar: string; en: string; xDefault?: string };
};

const SITE = 'https://smmrapid.store';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.content = content;
}
function upsertLink(rel: string, href: string, hreflang?: string) {
  const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`;
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (!el) { el = document.createElement('link'); el.rel = rel; if (hreflang) el.hreflang = hreflang; document.head.appendChild(el); }
  el.href = href;
}

export default function SEO({ title, description, path, keywords = [], lang = 'en', type = 'website', jsonLd, alternates }: SEOProps) {
  useEffect(() => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const canonical = `${SITE}${cleanPath === '/' ? '/' : cleanPath.replace(/\/$/, '')}`;
    document.title = title;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    if (keywords.length) upsertMeta('name', 'keywords', keywords.join(', '));
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:site_name', 'RapidSMM');
    upsertMeta('property', 'og:locale', lang === 'ar' ? 'ar_EG' : 'en_US');
    upsertMeta('name', 'twitter:card', 'summary');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertLink('canonical', canonical);
    const alt = alternates || { ar: cleanPath, en: cleanPath, xDefault: cleanPath };
    upsertLink('alternate', `${SITE}${alt.ar}`, 'ar');
    upsertLink('alternate', `${SITE}${alt.en}`, 'en');
    upsertLink('alternate', `${SITE}${alt.xDefault || alt.en}`, 'x-default');

    const id = 'rapid-seo-jsonld';
    document.getElementById(id)?.remove();
    const payload = Array.isArray(jsonLd) ? jsonLd : (jsonLd ? [jsonLd] : []);
    if (payload.length) {
      const script = document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(payload.length === 1 ? payload[0] : payload);
      document.head.appendChild(script);
    }
  }, [title, description, path, keywords.join('|'), lang, type, JSON.stringify(jsonLd), JSON.stringify(alternates)]);
  return null;
}

export { SITE };
