import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import PublicPageShell from './PublicPageShell';
import { useTranslation } from '../lib/i18n';

interface SvcRow { id: string; name: string; description: string | null; rate: string; min: number; max: number; }
interface CatRow { id: string; name: string; services: SvcRow[]; }

export default function PublicServices() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['public-services'],
    queryFn: async () => { const res = await fetch('/api/public/services'); if (!res.ok) throw new Error('failed'); return res.json() as Promise<{ categories: CatRow[] }>; },
  });

  const categories = (data?.categories || [])
    .map(c => ({ ...c, services: c.services.filter(s => !q || s.name.toLowerCase().includes(q.toLowerCase())) }))
    .filter(c => c.services.length > 0);

  return (
    <PublicPageShell title={t('publicServices.title')}>
      <p>{t('publicServices.subtitle')}</p>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={t('publicServices.searchPlaceholder')}
          className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg outline-none text-slate-100 focus:border-amber-400/50 text-sm"
        />
      </div>

      {isLoading && <div className="text-slate-500 text-sm">{t('common.loading')}</div>}

      {!isLoading && categories.length === 0 && (
        <div className="text-slate-500 text-sm">{t('publicServices.empty')}</div>
      )}

      <div className="space-y-10">
        {categories.map(cat => (
          <div key={cat.id}>
            <h2 className="text-lg font-bold text-white mb-3" style={{ fontFamily: "'Manrope', sans-serif" }}>{cat.name}</h2>
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <tbody>
                  {cat.services.map((s, i) => (
                    <tr key={s.id} className={i !== cat.services.length - 1 ? 'border-b border-white/[0.06]' : ''}>
                      <td className="px-5 py-3.5">
                        <div className="text-slate-100">{s.name}</div>
                        {s.description && <div className="text-slate-500 text-xs mt-0.5">{s.description}</div>}
                        <div className="text-slate-600 text-xs mt-1 tabular-nums">{t('publicServices.minMax', { min: s.min, max: s.max })}</div>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="text-slate-100 font-medium tabular-nums">{Number(s.rate).toFixed(2)}</div>
                        <div className="text-slate-500 text-xs">{t('publicServices.rateLabel')}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4">
        <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-[#0B0F17] bg-amber-400 rounded-xl hover:bg-amber-300 transition-colors">
          {t('publicServices.orderNow')}
        </Link>
      </div>
    </PublicPageShell>
  );
}
