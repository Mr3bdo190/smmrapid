import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { notify } from '../../lib/notify';
import { useTranslation } from '../../lib/i18n';
import {
  Aperture, AudioWaveform, BadgeCheck, Briefcase, Camera, CircleX, Download, Globe, Info, Loader2,
  MessageCircle, MessagesSquare, MonitorPlay, Network, PlayCircle, RefreshCcw, RefreshCw, RotateCcw,
  Search, Send, Tag, Terminal, ThumbsUp, Tv, X, Zap,
} from 'lucide-react';

const PAGE_SIZE = 20;

/** lucide-react icon per platform, derived from the real category name. */
const platformIcon = (name: string) => {
  const n = String(name || '').toLowerCase();
  if (n.includes('instagram') || n.includes('انست') || n.includes('إنست')) return Camera;
  if (n.includes('tiktok') || n.includes('tik tok') || n.includes('تيك')) return PlayCircle;
  if (n.includes('youtube') || n.includes('يوتيوب')) return MonitorPlay;
  if (n.includes('telegram') || n.includes('تيليجرام') || n.includes('تلجرام')) return Send;
  if (n.includes('twitter') || n.includes('تويتر') || n === 'x') return Tag;
  if (n.includes('spotify') || n.includes('سبوتيفاي')) return AudioWaveform;
  if (n.includes('facebook') || n.includes('فيسبوك') || n.includes('فيس بوك')) return ThumbsUp;
  if (n.includes('whatsapp') || n.includes('واتس')) return MessageCircle;
  if (n.includes('snap')) return Aperture;
  if (n.includes('discord') || n.includes('ديسكورد')) return MessagesSquare;
  if (n.includes('twitch')) return Tv;
  if (n.includes('linkedin')) return Briefcase;
  if (n.includes('traffic') || n.includes('web') || n.includes('موقع')) return Globe;
  return Network;
};

/** Renders the platform icon for a category name at a fixed size. */
const PlatformIcon = ({ name, className }: { name?: string; className?: string }) => {
  const Icon = platformIcon(String(name || ''));
  return <Icon className={className} />;
};

export default function ClientServices() {
  const { user } = useAuth();
  const { t, lang } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  /** Bilingual copy helper: the app's language toggle picks the primary string. */
  const L = (ar: string, en: string) => (lang === 'ar' ? ar : en);

  // The top bar links here as /dashboard/services?q=<term>.
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [platform, setPlatform] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [guarantee, setGuarantee] = useState('all');
  const [sortBy, setSortBy] = useState('id_asc');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => { setSearch(searchParams.get('q') ?? ''); }, [searchParams]);

  const { data: services = [], isLoading, isError, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['client-services'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/client/services', user, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load data');
      return res.json();
    },
    enabled: !!user,
  });

  /* ── real category chips with real per-category counts ─────────────────── */
  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number; sortOrder: number }>();
    for (const s of services as any[]) {
      if (!s.category) continue;
      const entry = map.get(s.category.id) || { id: s.category.id, name: s.category.name, count: 0, sortOrder: Number(s.category.sortOrder ?? 0) };
      entry.count += 1;
      map.set(s.category.id, entry);
    }
    return [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [services]);

  const isUnit = (s: any) => Number(s.minQuantity) === 1 && Number(s.maxQuantity) === 1;
  const toNum = (v: any) => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US').format(Number(v || 0));

  /* ── client-side filtering + sorting over the real services array ──────── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = (services as any[]).filter(s => {
      if (platform !== 'all' && s.category?.id !== platform) return false;
      if (typeFilter === 'unit' && !isUnit(s)) return false;
      if (typeFilter === 'bulk' && isUnit(s)) return false;
      if (guarantee === 'refill' && !s.refillable) return false;
      if (guarantee === 'refill_cancel' && !(s.refillable && s.cancelable)) return false;
      if (guarantee === 'none' && s.refillable) return false;
      if (!q) return true;
      const haystack = [s.id, s.name, s.category?.name, s.description].map(v => String(v || '').toLowerCase()).join(' ');
      return haystack.includes(q);
    });
    const sorted = [...rows];
    if (sortBy === 'price_asc') sorted.sort((a, b) => Number(a.pricePer1k) - Number(b.pricePer1k));
    else if (sortBy === 'price_desc') sorted.sort((a, b) => Number(b.pricePer1k) - Number(a.pricePer1k));
    else sorted.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    return sorted;
  }, [services, search, platform, typeFilter, guarantee, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const firstRow = filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const lastRow = Math.min(currentPage * PAGE_SIZE, filtered.length);

  const pageButtons = useMemo(() => {
    const out: Array<number | '…'> = [];
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i += 1) out.push(i); return out; }
    out.push(1);
    if (currentPage > 3) out.push('…');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i += 1) out.push(i);
    if (currentPage < totalPages - 2) out.push('…');
    out.push(totalPages);
    return out;
  }, [totalPages, currentPage]);

  /* ── counters, all derived from the real services array ───────────────── */
  const total = (services as any[]).length;
  const refillCount = (services as any[]).filter(s => s.refillable).length;
  const cancelableCount = (services as any[]).filter(s => s.cancelable).length;
  const updatedAt = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : '—';
  const filtersActive = !!search.trim() || platform !== 'all' || typeFilter !== 'all' || guarantee !== 'all' || sortBy !== 'id_asc';

  const applySearch = (value: string) => {
    setSearch(value);
    setPage(1);
    setSearchParams(value.trim() ? { q: value } : {}, { replace: true });
  };

  const resetFilters = () => {
    setSearch('');
    setPlatform('all');
    setTypeFilter('all');
    setGuarantee('all');
    setSortBy('id_asc');
    setPage(1);
    setSearchParams({}, { replace: true });
  };

  const exportCsv = () => {
    const header = ['Service ID', 'Name', 'Category', 'Rate per 1k', 'Min', 'Max', 'Refillable', 'Cancelable'];
    const csv = [header.join(','), ...filtered.map((s: any) => [s.id, s.name, s.category?.name || '', s.pricePer1k, s.minQuantity, s.maxQuantity, s.refillable, s.cancelable].map(v => `"${String(v ?? '').replaceAll('"', '""')}"`).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'services.csv';
    a.click();
    notify.success(t('common.exportSuccess'));
  };

  const field = 'h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
  const labelCls = 'text-sm font-semibold text-on-surface';
  const chipOn = 'inline-flex h-10 items-center gap-2 rounded-lg bg-primary-container px-3 text-sm font-semibold text-on-primary-container transition-colors hover:bg-primary';
  const chipOff = 'inline-flex h-10 items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface';
  const secondaryBtn = 'inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface-container px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high';
  const statPill = 'inline-flex h-9 items-center gap-2 rounded-lg bg-surface-container-low px-3 text-sm text-on-surface-variant';

  return (
    <div className="flex flex-col gap-gutter-lg">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-space-md">
        <div className="min-w-0">
          <h1 className="font-display text-headline-lg text-on-surface">{t('services.title')}</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            {L('كل الخدمات المتاحة مع سعر كل 1000 وأقل وأعلى كمية. اختر الخدمة ثم اضغط "اطلب".',
              'Every service we offer, with the price per 1,000, the minimum and the maximum. Pick one and press Order.')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={exportCsv} className={secondaryBtn}>
            <Download className="h-4 w-4" /> {t('common.export')}
          </button>
          <Link to="/dashboard/api" className={secondaryBtn}>
            <Terminal className="h-4 w-4" /> {t('api.viewClientApi')}
          </Link>
          <Link to="/dashboard/new-order" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary-container px-4 text-sm font-semibold text-on-primary-container transition-colors hover:bg-primary">
            <Zap className="h-4 w-4" /> {t('nav.newOrder')}
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-space-xl rounded-xl border border-outline-variant bg-surface-container p-5">
        {/* ── 1 · Find a service ───────────────────────────────────────────── */}
        <section className="flex flex-col gap-space-lg">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-headline-sm text-on-surface">{L('ابحث عن خدمة', 'Find a service')}</h2>
            <p className="text-sm text-on-surface-variant">
              {L('ابحث بالاسم أو برقم الخدمة، أو اختر القسم، ثم استخدم عوامل التصفية للتضييق.',
                'Search by name or service ID, or pick a category, then narrow the list with the filters.')}
            </p>
          </div>

          {/* Live counters, all real values from the services list */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={statPill}>
              <Network className="h-4 w-4" />
              <b className="font-mono tabular-nums text-on-surface">{toNum(total)}</b>
              {L('خدمة', 'services')}
            </span>
            <span className={statPill}>
              <b className="font-mono tabular-nums text-on-surface">{toNum(categories.length)}</b>
              {t('services.category')}
            </span>
            <span className={statPill}>
              <BadgeCheck className="h-4 w-4" />
              <b className="font-mono tabular-nums text-on-surface">{toNum(refillCount)}</b>
              {L('مع تعويض', 'with refill')}
            </span>
            <span className={statPill}>
              <CircleX className="h-4 w-4" />
              <b className="font-mono tabular-nums text-on-surface">{toNum(cancelableCount)}</b>
              {L('قابلة للإلغاء', 'cancelable')}
            </span>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-surface-container-low px-3 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
              <span className="font-mono tabular-nums">{updatedAt}</span>
            </button>
          </div>

          {/* Search — kept in sync with the ?q= URL parameter */}
          <div className="flex flex-col gap-2">
            <label htmlFor="service-search" className={labelCls}>{L('بحث', 'Search')}</label>
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <input
                id="service-search"
                type="search"
                value={search}
                onChange={e => applySearch(e.target.value)}
                placeholder={L('اسم الخدمة أو رقمها، مثال: 1234', 'Service name or ID, e.g. 1234')}
                className={`${field} ps-9`}
              />
            </div>
            <p className="text-xs text-on-surface-variant">
              {search.trim()
                ? L(`${toNum(filtered.length)} خدمة تطابق "${search.trim()}"`, `${toNum(filtered.length)} services match "${search.trim()}"`)
                : L('اكتب الاسم أو الرقم لعرض الخدمات المطابقة فقط.', 'Type a name or an ID to show only the matching services.')}
            </p>
          </div>

          {/* Category chips */}
          <div className="flex flex-col gap-2">
            <span className={labelCls}>{t('services.category')}</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { setPlatform('all'); setPage(1); }}
                className={platform === 'all' ? chipOn : chipOff}
                aria-pressed={platform === 'all'}
              >
                <Network className="h-4 w-4" />
                {t('services.allCategories')}
                <span className="font-mono tabular-nums">{toNum(total)}</span>
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setPlatform(c.id); setPage(1); }}
                  className={platform === c.id ? chipOn : chipOff}
                  aria-pressed={platform === c.id}
                >
                  <PlatformIcon name={c.name} className="h-4 w-4 shrink-0" />
                  {c.name}
                  <span className="font-mono tabular-nums">{toNum(c.count)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Filters — only the options the data really supports */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="type-filter" className={labelCls}>{t('common.type')}</label>
              <select id="type-filter" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className={`${field} cursor-pointer`}>
                <option value="all">{L('كل الأنواع', 'All types')}</option>
                <option value="unit">{L('عنصر مفرد', 'Single item')}</option>
                <option value="bulk">{L('لكل 1000', 'Per 1,000')}</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="guarantee-filter" className={labelCls}>{L('الضمان', 'Guarantee')}</label>
              <select id="guarantee-filter" value={guarantee} onChange={e => { setGuarantee(e.target.value); setPage(1); }} className={`${field} cursor-pointer`}>
                <option value="all">{L('كل الخدمات', 'All services')}</option>
                <option value="refill">{L('تعويض متاح', 'Refill available')}</option>
                <option value="refill_cancel">{L('تعويض وإلغاء', 'Refill and cancel')}</option>
                <option value="none">{L('بدون تعويض', 'No refill')}</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="sort-filter" className={labelCls}>{L('الترتيب', 'Sort by')}</label>
              <select id="sort-filter" value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }} className={`${field} cursor-pointer`}>
                <option value="id_asc">{L('رقم الخدمة', 'Service ID')}</option>
                <option value="price_asc">{L('السعر: من الأقل', 'Price: low to high')}</option>
                <option value="price_desc">{L('السعر: من الأعلى', 'Price: high to low')}</option>
              </select>
            </div>
            <div className="flex items-end">
              <button type="button" onClick={resetFilters} disabled={!filtersActive} className={`${secondaryBtn} w-full disabled:cursor-not-allowed disabled:opacity-50`}>
                <RotateCcw className="h-4 w-4" /> {L('إعادة الضبط', 'Reset filters')}
              </button>
            </div>
          </div>
        </section>

        {/* ── 2 · Services ─────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-space-lg border-t border-outline-variant pt-space-xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-headline-sm text-on-surface">{t('services.title')}</h2>
              <p className="text-sm text-on-surface-variant">
                {isLoading
                  ? t('common.loading')
                  : L(`عرض ${toNum(firstRow)}–${toNum(lastRow)} من ${toNum(filtered.length)} خدمة`,
                      `Showing ${toNum(firstRow)}–${toNum(lastRow)} of ${toNum(filtered.length)} services`)}
              </p>
            </div>
            <p className="max-w-md text-sm text-on-surface-variant">
              {L('الأسعار بالدولار لكل 1000 أمر، أو لكل عنصر في الخدمات المفردة.',
                'Prices are in USD per 1,000 orders, or per single item for unit services.')}
            </p>
          </div>

          {isError && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-error/40 bg-error-container p-3 text-sm text-on-error-container">
              <span>{L('تعذر تحميل قائمة الخدمات. جرّب التحديث.', 'We could not load the services list. Try refreshing.')}</span>
              <button type="button" onClick={() => refetch()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-surface-container px-3 font-semibold">
                <RefreshCw className="h-4 w-4" /> {t('common.retry')}
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-start">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="py-3 pe-4 text-start text-xs font-semibold text-on-surface-variant">{t('newOrder.service')}</th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-on-surface-variant">{t('services.rate')}</th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-on-surface-variant">{t('services.minMax')}</th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-on-surface-variant">{L('الضمان', 'Guarantee')}</th>
                  <th className="ps-4 py-3 text-end text-xs font-semibold text-on-surface-variant">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {isLoading && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm text-on-surface-variant">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {L('جاري تحميل قائمة الخدمات...', 'Loading the service list...')}
                      </span>
                    </td>
                  </tr>
                )}

                {!isLoading && !isError && total === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm text-on-surface-variant">
                      <p>{L('لا توجد خدمات متاحة حالياً.', 'No services are available right now.')}</p>
                      <button type="button" onClick={() => refetch()} className={`${secondaryBtn} mt-3 h-9`}>
                        <RefreshCw className="h-4 w-4" /> {t('common.refresh')}
                      </button>
                    </td>
                  </tr>
                )}

                {!isLoading && !isError && total > 0 && pageItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm text-on-surface-variant">
                      <p className="font-semibold text-on-surface">{t('common.noResults')}</p>
                      <p className="mt-1">{L('لا توجد خدمة تطابق البحث أو عوامل التصفية.', 'No service matches your search or filters.')}</p>
                      <button type="button" onClick={resetFilters} className={`${secondaryBtn} mt-3 h-9`}>
                        <RotateCcw className="h-4 w-4" /> {L('إعادة الضبط', 'Reset filters')}
                      </button>
                    </td>
                  </tr>
                )}

                {pageItems.map((s: any) => (
                  <tr key={s.id} className="align-top transition-colors hover:bg-surface-container-high/60">
                    <td className="py-4 pe-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-on-surface">{s.name}</span>
                        <span className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                          <span className="font-mono tabular-nums">#{s.id}</span>
                          {s.category?.name && (
                            <span className="inline-flex items-center gap-1">
                              <PlatformIcon name={s.category.name} className="h-3.5 w-3.5" />
                              {s.category.name}
                            </span>
                          )}
                          {Number(s.cashbackPercentage) > 0 && (
                            <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-on-surface-variant">
                              {t('newOrder.cashback')} {Number(s.cashbackPercentage)}%
                            </span>
                          )}
                        </span>
                        {!!s.description && (
                          <span className="max-w-md truncate text-xs text-on-surface-variant">{s.description}</span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex flex-col">
                        <span className="font-mono text-sm font-semibold tabular-nums text-tertiary">${Number(s.pricePer1k).toFixed(4)}</span>
                        <span className="text-xs text-on-surface-variant">{isUnit(s) ? L('لكل عنصر', 'per item') : t('newOrder.perThousand')}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex flex-col">
                        <span className="font-mono text-sm tabular-nums text-on-surface">{toNum(s.minQuantity)} – {toNum(s.maxQuantity)}</span>
                        <span className="text-xs text-on-surface-variant">{t('services.minMax')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {s.refillable ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">
                            <BadgeCheck className="h-3.5 w-3.5" /> {L('تعويض متاح', 'Refill available')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-surface-container-high px-2 py-1 text-xs text-on-surface-variant">
                            <RefreshCcw className="h-3.5 w-3.5" /> {L('بدون تعويض', 'No refill')}
                          </span>
                        )}
                        {s.cancelable && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-1 text-xs text-sky-400">
                            <CircleX className="h-3.5 w-3.5" /> {L('إلغاء متاح', 'Cancel available')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="ps-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setDetail(s)}
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
                        >
                          <Info className="h-4 w-4" /> {L('التفاصيل', 'Details')}
                        </button>
                        <Link
                          to="/dashboard/new-order"
                          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary-container px-3 text-sm font-semibold text-on-primary-container transition-colors hover:bg-primary"
                        >
                          <Zap className="h-4 w-4" /> {L('اطلب', 'Order')}
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-on-surface-variant">
                {L(`عرض ${toNum(firstRow)}–${toNum(lastRow)} من ${toNum(filtered.length)} خدمة`,
                  `Showing ${toNum(firstRow)}–${toNum(lastRow)} of ${toNum(filtered.length)} services`)}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="inline-flex h-9 items-center rounded-lg border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {L('السابق', 'Previous')}
                </button>
                {pageButtons.map((p, i) => (
                  typeof p === 'number' ? (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      aria-current={p === currentPage ? 'page' : undefined}
                      className={p === currentPage
                        ? 'inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-primary-container px-2 font-mono text-sm font-semibold tabular-nums text-on-primary-container'
                        : 'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-low px-2 font-mono text-sm tabular-nums text-on-surface transition-colors hover:bg-surface-container-high'}
                    >
                      {toNum(p)}
                    </button>
                  ) : (
                    <span key={`gap-${i}`} className="px-1 text-sm text-on-surface-variant">…</span>
                  )
                ))}
                <button
                  type="button"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="inline-flex h-9 items-center rounded-lg border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {L('التالي', 'Next')}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ── Service details — bound to the real service the user picked ────── */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/80 p-4 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setDetail(null); }}
        >
          <div className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-outline-variant p-4">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 shrink-0 text-primary" />
                <h3 className="font-display text-headline-sm text-on-surface">{t('newOrder.serviceDetails')}</h3>
              </div>
              <button type="button" onClick={() => setDetail(null)} aria-label={t('common.close')} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-space-lg overflow-y-auto p-4">
              <div className="flex flex-col gap-1">
                <h4 className="text-base font-semibold text-on-surface">{detail.name}</h4>
                <p className="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
                  <span className="font-mono tabular-nums">#{detail.id}</span>
                  {detail.category?.name && (
                    <span className="inline-flex items-center gap-1">
                      <PlatformIcon name={detail.category.name} className="h-3.5 w-3.5" />
                      {detail.category.name}
                    </span>
                  )}
                </p>
              </div>

              {!!detail.description && (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-on-surface-variant">{detail.description}</p>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1 rounded-lg bg-surface-container-low p-3">
                  <span className="text-xs text-on-surface-variant">{t('services.rate')}</span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-tertiary">
                    ${Number(detail.pricePer1k).toFixed(4)} <span className="text-xs font-normal text-on-surface-variant">{isUnit(detail) ? L('لكل عنصر', 'per item') : t('newOrder.perThousand')}</span>
                  </span>
                </div>
                <div className="flex flex-col gap-1 rounded-lg bg-surface-container-low p-3">
                  <span className="text-xs text-on-surface-variant">{t('services.minMax')}</span>
                  <span className="font-mono text-sm tabular-nums text-on-surface">{toNum(detail.minQuantity)} – {toNum(detail.maxQuantity)}</span>
                </div>
                <div className="flex flex-col gap-1 rounded-lg bg-surface-container-low p-3">
                  <span className="text-xs text-on-surface-variant">{L('الضمان', 'Guarantee')}</span>
                  <span className="text-sm text-on-surface">{detail.refillable ? L('تعويض متاح', 'Refill available') : L('بدون تعويض', 'No refill')}</span>
                </div>
                <div className="flex flex-col gap-1 rounded-lg bg-surface-container-low p-3">
                  <span className="text-xs text-on-surface-variant">{L('الإلغاء', 'Cancellation')}</span>
                  <span className="text-sm text-on-surface">{detail.cancelable ? L('إلغاء متاح', 'Cancel available') : L('غير قابل للإلغاء', 'Not cancelable')}</span>
                </div>
                {Number(detail.cashbackPercentage) > 0 && (
                  <div className="flex flex-col gap-1 rounded-lg bg-surface-container-low p-3">
                    <span className="text-xs text-on-surface-variant">{t('newOrder.cashback')}</span>
                    <span className="font-mono text-sm tabular-nums text-on-surface">{Number(detail.cashbackPercentage)}%</span>
                  </div>
                )}
                <div className="flex flex-col gap-1 rounded-lg bg-surface-container-low p-3">
                  <span className="text-xs text-on-surface-variant">{L('طلب API', 'API request')}</span>
                  <code className="break-all font-mono text-xs text-on-surface-variant">{`action=add&service=${detail.id}`}</code>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-outline-variant p-4">
              <button type="button" onClick={() => setDetail(null)} className="inline-flex h-11 items-center justify-center rounded-lg border border-outline-variant bg-surface-container px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high">
                {t('common.close')}
              </button>
              <Link to="/dashboard/new-order" onClick={() => setDetail(null)} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary-container px-4 text-sm font-semibold text-on-primary-container transition-colors hover:bg-primary">
                <Zap className="h-4 w-4" /> {L('اطلب هذه الخدمة', 'Order this service')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
