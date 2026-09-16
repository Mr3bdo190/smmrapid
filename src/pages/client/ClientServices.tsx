import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { notify } from '../../lib/notify';
import { useTranslation } from '../../lib/i18n';
import { Aperture, ArrowUpDown, AudioWaveform, BadgeCheck, Briefcase, Camera, CircleX, Download, Globe, Info, MessageCircle, MessagesSquare, MonitorPlay, Network, PlayCircle, RefreshCcw, RotateCcw, Search, Send, ShieldCheck, SlidersHorizontal, Tag, Terminal, ThumbsUp, Tv, X, Zap } from 'lucide-react';

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

const iconTones = ['text-secondary', 'text-tertiary', 'text-primary', 'text-error', 'text-on-surface'];
const toneFor = (name: string) => {
  const sum = String(name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return iconTones[sum % iconTones.length];
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

  const { data: services = [], isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['client-services-list'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await apiFetch('/api/client/services', user, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load data');
      return res.json();
    },
    enabled: !!user,
  });

  /* ── real platform (category) tabs with real per-category counts ───────── */
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

  /* ── KPI values, all derived from the real services array ─────────────── */
  const total = (services as any[]).length;
  const refillCount = (services as any[]).filter(s => s.refillable).length;
  const cancelableCount = (services as any[]).filter(s => s.cancelable).length;
  const refillPct = total ? Math.round((refillCount / total) * 1000) / 10 : 0;
  const coveragePct = total ? Math.round((filtered.length / total) * 1000) / 10 : 0;
  const updatedAt = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : '—';

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

  const inputCls = 'h-[38px] w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-space-md font-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
  const selectCls = 'bg-transparent text-on-surface font-label-sm text-label-sm focus:outline-none cursor-pointer';
  const optionCls = 'bg-surface-container text-on-surface';

  return (
    <div className="flex flex-col gap-gutter-lg">
      {/* Breadcrumb & Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md mb-space-lg">
        <div className="flex flex-col gap-space-2xs">
          <div className="flex items-center gap-space-xs text-on-surface-variant font-code-xs text-code-xs tracking-wider uppercase">
            <span>{t('nav.dashboard')}</span>
            <span>/</span>
            <span>{L('العمليات', 'Operations')}</span>
            <span>/</span>
            <span className="text-primary font-semibold">{t('services.title')}</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-space-sm">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">{t('services.title')}</h1>
            <span className="font-headline-sm text-headline-sm text-on-surface-variant">{lang === 'ar' ? 'Services List' : 'قائمة الخدمات'}</span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-2xl">
            {L('نقاط نهاية API عالية السرعة مع مراقبة لحظية موثوقة للثبات وأسعار جملة متدرجة. منصة البث المباشر للخدمات المتزامنة ومراقبة الاستقرار اللحظي.', 'High-velocity API endpoints with verified real-time drop telemetry and wholesale tiered pricing. Live service broadcasting with real-time stability monitoring.')}
          </p>
        </div>

        {/* Live telemetry pill & main CTAs */}
        <div className="flex flex-wrap items-center gap-space-sm">
          <div className="flex items-center gap-space-xs px-space-md py-space-xs rounded-xl bg-surface-container shadow-sm">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-ping"></span>
            <span className="w-2 h-2 rounded-full bg-tertiary -ms-3"></span>
            <div className="flex flex-col">
              <span className="font-code-xs text-code-xs text-tertiary font-semibold uppercase tracking-wider">{isLoading ? 'API SYNCING' : 'API ACTIVE'}</span>
              <span className="font-code-xs text-code-xs text-on-surface-variant">{toNum(total)} {L('خدمة مباشرة', 'live services')} • {L('آخر تحديث', 'updated')} {updatedAt}</span>
            </div>
          </div>
          <div className="flex items-center gap-space-xs">
            <button onClick={exportCsv} className="inline-flex items-center gap-space-xs px-space-md py-space-sm rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-all shadow-sm" type="button">
              <Download className="text-primary h-[18px] w-[18px] shrink-0" />
              <span>{t('common.export')}</span>
            </button>
            <Link to="/dashboard/api" className="inline-flex items-center gap-space-xs px-space-md py-space-sm rounded-xl bg-primary-container text-on-primary-container hover:bg-primary font-label-md text-label-md shadow-md transition-all">
              <Terminal className="h-[18px] w-[18px] shrink-0" />
              <span>{t('api.viewClientApi')}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Analytical KPI metric cards — only the two the real data can back */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-xl">
        <div className="relative overflow-hidden rounded-xl bg-surface-container p-space-lg shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-xs">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{L('إجمالي الخدمات النشطة', 'Active Services Total')}</span>
            <Network className="text-primary h-[24px] w-[24px] shrink-0" />
          </div>
          <div className="flex items-baseline justify-between mt-space-xs">
            <div>
              <span className="font-headline-xl text-headline-xl text-on-surface font-bold">{toNum(total)}</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant ms-space-xs">{L('خدمة مفعلة', 'active services')}</span>
            </div>
            <span className="font-code-xs text-code-xs px-space-xs py-space-2xs rounded bg-surface-container-high text-tertiary font-medium">{toNum(categories.length)} {t('services.category')}</span>
          </div>
          <div className="w-full bg-surface-container-lowest h-1.5 rounded-full mt-space-sm overflow-hidden">
            <div className="bg-primary h-full rounded-full" style={{ width: `${coveragePct}%` }}></div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-surface-container p-space-lg shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-xs">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{L('معدل الثبات وضمان التعويض', 'Refill & Cancel Coverage')}</span>
            <ShieldCheck className="text-secondary h-[24px] w-[24px] shrink-0" />
          </div>
          <div className="flex items-baseline justify-between mt-space-xs">
            <div>
              <span className="font-headline-xl text-headline-xl text-on-surface font-bold">{refillPct}%</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant ms-space-xs">{toNum(refillCount)} {L('خدمة بتعويض تلقائي', 'refilled services')}</span>
            </div>
            <span className="font-code-xs text-code-xs px-space-xs py-space-2xs rounded bg-surface-container-high text-secondary font-semibold">{toNum(cancelableCount)} {L('قابلة للإلغاء', 'cancelable')}</span>
          </div>
          <div className="w-full bg-surface-container-lowest h-1.5 rounded-full mt-space-sm overflow-hidden">
            <div className="bg-secondary h-full rounded-full" style={{ width: `${refillPct}%` }}></div>
          </div>
        </div>
      </div>

      {/* Search & interactive filters bar */}
      <div className="flex flex-col gap-space-md p-space-md rounded-xl bg-surface-container shadow-md mb-space-lg">
        {/* Row 1: search and platform pills */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-space-md">
          <div className="relative w-full lg:w-96">
            <Search className="absolute start-space-md top-1/2 -translate-y-1/2 text-outline h-[20px] w-[20px] shrink-0" />
            <input
              className={`${inputCls} ps-10 pe-space-md`}
              placeholder={L('بحث برقم الخدمة (#ID)، المنصة، أو اسم الخدمة...', 'Search by service ID (#ID), platform or service name...')}
              type="search"
              value={search}
              onChange={e => applySearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-space-xs overflow-x-auto w-full pb-space-xs lg:pb-0 scrollbar-none">
            <button
              onClick={() => { setPlatform('all'); setPage(1); }}
              className={platform === 'all'
                ? 'px-space-md py-space-xs rounded-xl bg-primary-container text-on-primary-container font-label-sm text-label-sm whitespace-nowrap transition-all flex items-center gap-space-xs'
                : 'px-space-md py-space-xs rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm whitespace-nowrap transition-all flex items-center gap-space-xs'}
              type="button"
            >
              <span>{L('الكل (All)', 'All (الكل)')}</span>
              <span className="font-code-xs text-code-xs px-1.5 py-0.5 rounded bg-surface-container-lowest/30">{toNum(total)}</span>
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => { setPlatform(c.id); setPage(1); }}
                className={platform === c.id
                  ? 'px-space-md py-space-xs rounded-xl bg-primary-container text-on-primary-container font-label-sm text-label-sm whitespace-nowrap transition-all flex items-center gap-space-xs'
                  : 'px-space-md py-space-xs rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm whitespace-nowrap transition-all flex items-center gap-space-xs'}
                type="button"
              >
                <PlatformIcon name={c.name} className="h-4 w-4 shrink-0" />
                <span>{c.name}</span>
                <span className="font-code-xs text-code-xs px-1.5 py-0.5 rounded bg-surface-container-lowest">{toNum(c.count)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: secondary dropdown filters & sorters */}
        <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs">
          <div className="flex flex-wrap items-center gap-space-sm">
            {/* Order unit — derived from the real min/max quantity of each service */}
            <div className="flex items-center gap-space-2xs bg-surface-container-lowest px-space-sm py-space-xs rounded-xl text-on-surface font-label-sm text-label-sm">
              <span className="text-on-surface-variant">{t('common.type')}:</span>
              <select className={selectCls} value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
                <option className={optionCls} value="all">{L('جميع الأنواع (All Types)', 'All Types (جميع الأنواع)')}</option>
                <option className={optionCls} value="unit">{L('وحدة مفردة (لكل عنصر)', 'Single unit (per item)')}</option>
                <option className={optionCls} value="bulk">{L('لكل 1000 (جملة)', 'Per 1,000 (bulk)')}</option>
              </select>
            </div>
            {/* Refill policy — the real `refillable` / `cancelable` flags */}
            <div className="flex items-center gap-space-2xs bg-surface-container-lowest px-space-sm py-space-xs rounded-xl text-on-surface font-label-sm text-label-sm">
              <span className="text-on-surface-variant">{L('الضمان:', 'Guarantee:')}</span>
              <select className={selectCls} value={guarantee} onChange={e => { setGuarantee(e.target.value); setPage(1); }}>
                <option className={optionCls} value="all">{L('كل السياسات (All)', 'All policies (كل السياسات)')}</option>
                <option className={optionCls} value="refill">{L('تعويض متاح (Refill)', 'Refill available')}</option>
                <option className={optionCls} value="refill_cancel">{L('تعويض وإلغاء معاً', 'Refill + Cancel')}</option>
                <option className={optionCls} value="none">{L('بدون تعويض (No Refill)', 'No refill (بدون تعويض)')}</option>
              </select>
            </div>
          </div>
          {/* Sorter & reset */}
          <div className="flex items-center gap-space-sm">
            <div className="flex items-center gap-space-xs bg-surface-container-lowest px-space-sm py-space-xs rounded-xl text-on-surface font-label-sm text-label-sm">
              <ArrowUpDown className="text-outline h-[18px] w-[18px] shrink-0" />
              <select className={selectCls} value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }}>
                <option className={optionCls} value="id_asc">{L('ترتيب: معرف الخدمة (ID)', 'Sort: Service ID')}</option>
                <option className={optionCls} value="price_asc">{L('السعر: من الأقل للأعلى', 'Price: low to high')}</option>
                <option className={optionCls} value="price_desc">{L('السعر: من الأعلى للأقل', 'Price: high to low')}</option>
              </select>
            </div>
            <button onClick={resetFilters} className="w-8 h-8 rounded-xl bg-surface-container-lowest hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors" title={L('إعادة ضبط الفلاتر', 'Reset filters')} type="button">
              <RotateCcw className="h-[16px] w-[16px] shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* Services data table container */}
      <div className="w-full bg-surface-container rounded-xl overflow-hidden shadow-lg mb-space-2xl">
        <div className="px-space-lg py-space-md bg-surface-container-low flex flex-wrap items-center justify-between gap-space-sm">
          <div className="flex min-w-0 flex-wrap items-center gap-space-sm">
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">{t('services.title')}</span>
            <span className="font-code-xs text-code-xs px-space-xs py-space-2xs rounded bg-surface-container-high text-tertiary">
              {L('عرض', 'Showing')} {toNum(pageItems.length)} {L('من', 'of')} {toNum(filtered.length)} {L('نقطة نهاية', 'endpoints')}
            </span>
          </div>
          <div className="flex items-center gap-space-xs font-code-xs text-code-xs text-on-surface-variant">
            <span className="w-2 h-2 rounded-full bg-tertiary"></span>
            <span>{L('الأسعار محدثة بنظام الدفع الفوري (USD/1,000)', 'Prices updated live (USD / 1,000)')}</span>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-start">
            <thead>
              <tr className="bg-surface-container-lowest text-on-surface-variant font-code-xs text-code-xs uppercase tracking-wider">
                <th className="py-space-md px-space-lg text-start font-medium">{L('معرف الخدمة والاسم', 'Service ID & Name')}</th>
                <th className="py-space-md px-space-md text-start font-medium">{L('المنصة والنوع', 'Platform & Type')}</th>
                <th className="py-space-md px-space-md text-start font-medium">{t('services.rate')}</th>
                <th className="py-space-md px-space-md text-start font-medium">{t('services.minMax')}</th>
                <th className="py-space-md px-space-md text-start font-medium">{L('سياسة التعويض', 'Refill Policy')}</th>
                <th className="py-space-md px-space-lg text-center font-medium">{L('الإجراء السريع', 'Quick Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y-0">
              {isLoading && (
                <tr><td className="py-space-md px-space-lg font-body-md text-on-surface-variant" colSpan={6}>{t('common.loading')}</td></tr>
              )}
              {!isLoading && pageItems.length === 0 && (
                <tr><td className="py-space-md px-space-lg font-body-md text-on-surface-variant" colSpan={6}>{t('common.noResults')}</td></tr>
              )}
              {pageItems.map((s: any) => (
                <tr key={s.id} className="hover:bg-surface-container-high/60 transition-colors group">
                  <td className="py-space-md px-space-lg">
                    <div className="flex flex-col gap-space-2xs max-w-md">
                      <div className="flex min-w-0 items-center gap-space-xs">
                        <span className="shrink-0 font-code-xs text-code-xs px-space-xs py-space-2xs rounded bg-surface-container-lowest text-primary font-bold">#{s.id}</span>
                        <span className="truncate font-label-lg text-label-lg text-on-surface font-semibold transition-colors group-hover:text-primary">{s.name}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-space-xs">
                        {!!s.description && (
                          <span className="font-code-xs text-code-xs px-space-xs py-space-2xs rounded bg-surface-container text-tertiary max-w-[320px] truncate">{s.description}</span>
                        )}
                        {Number(s.cashbackPercentage) > 0 && (
                          <span className="font-code-xs text-code-xs px-space-xs py-space-2xs rounded bg-surface-container text-on-surface-variant">{L('كاش باك', 'Cashback')}: {Number(s.cashbackPercentage)}%</span>
                        )}
                        <span className="min-w-0 font-code-xs text-code-xs text-outline">API: <code className="break-all text-on-surface-variant">{`action=add&service=${s.id}`}</code></span>
                      </div>
                    </div>
                  </td>
                  <td className="py-space-md px-space-md">
                    <div className="flex items-center gap-space-xs">
                      <PlatformIcon name={s.category?.name || ''} className={`h-5 w-5 shrink-0 ${toneFor(s.category?.name || '')}`} />
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md text-on-surface">{s.category?.name || '—'}</span>
                        <span className="font-code-xs text-code-xs text-on-surface-variant">{isUnit(s) ? L('لكل عنصر', 'per item') : t('newOrder.perThousand')}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-space-md px-space-md whitespace-nowrap">
                    <div className="flex items-center gap-space-xs">
                      <span className="font-headline-sm text-headline-sm font-bold text-tertiary">${Number(s.pricePer1k).toFixed(4)}</span>
                      <span className="font-code-xs text-code-xs text-outline">{isUnit(s) ? ' / item' : ' / 1K'}</span>
                    </div>
                  </td>
                  <td className="py-space-md px-space-md whitespace-nowrap">
                    <div className="flex flex-col font-code-sm text-code-sm text-on-surface tabular-nums">
                      <span>{toNum(s.minQuantity)} <span className="text-on-surface-variant">/</span> {toNum(s.maxQuantity)}</span>
                      <span className="font-code-xs text-code-xs text-outline">{t('services.minMax')}</span>
                    </div>
                  </td>
                  <td className="py-space-md px-space-md whitespace-nowrap">
                    <div className="flex flex-wrap items-center gap-space-2xs">
                      {s.refillable ? (
                        <div className="inline-flex items-center gap-space-2xs px-space-xs py-space-2xs rounded bg-surface-container-lowest text-secondary font-label-sm text-label-sm">
                          <BadgeCheck className="h-[16px] w-[16px] shrink-0" />
                          <span>{L('تعويض متاح', 'Refill available')}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-space-2xs px-space-xs py-space-2xs rounded bg-surface-container-lowest text-on-surface-variant font-label-sm text-label-sm">
                          <RefreshCcw className="text-outline h-[16px] w-[16px] shrink-0" />
                          <span>{L('بدون تعويض', 'No refill')}</span>
                        </div>
                      )}
                      {s.cancelable && (
                        <div className="inline-flex items-center gap-space-2xs px-space-xs py-space-2xs rounded bg-surface-container-lowest text-tertiary font-label-sm text-label-sm">
                          <CircleX className="h-[16px] w-[16px] shrink-0" />
                          <span>{L('إلغاء متاح', 'Cancel available')}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-space-md px-space-lg text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-space-xs">
                      <Link to="/dashboard/new-order" className="px-space-md py-space-xs rounded-xl bg-primary-container text-on-primary-container hover:bg-primary font-label-md text-label-md shadow-sm transition-all flex items-center gap-space-2xs">
                        <Zap className="h-[16px] w-[16px] shrink-0" />
                        <span>{L('طلب فوري', 'Instant order')}</span>
                      </Link>
                      <button onClick={() => setDetail(s)} className="p-space-xs rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface-variant hover:text-on-surface transition-colors" title={L('مواصفات ونقاط الخدمة', 'Service specifications')} type="button">
                        <Info className="h-[18px] w-[18px] shrink-0" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table footer / pagination */}
        <div className="px-space-lg py-space-md bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-space-md text-on-surface-variant font-code-xs text-code-xs">
          <div>
            <span>{L('عرض النتائج', 'Showing results')} <strong className="text-on-surface">{toNum(firstRow)} - {toNum(lastRow)}</strong> {L('من أصل', 'of')} <strong className="text-on-surface">{toNum(filtered.length)}</strong> {L('خدمة متوفرة عبر API', 'services available via API')}</span>
          </div>
          <div className="flex items-center gap-space-xs">
            <button onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1} className="px-space-sm py-space-xs rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors disabled:opacity-40" type="button">{L('السابق', 'Previous')}</button>
            {pageButtons.map((p, i) => (
              typeof p === 'number' ? (
                <button key={p} onClick={() => setPage(p)} className={p === currentPage ? 'px-space-sm py-space-xs rounded-lg bg-primary text-on-primary font-bold' : 'px-space-sm py-space-xs rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors'} type="button">{toNum(p)}</button>
              ) : (
                <span key={`gap-${i}`}>...</span>
              )
            ))}
            <button onClick={() => setPage(currentPage + 1)} disabled={currentPage >= totalPages} className="px-space-sm py-space-xs rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors disabled:opacity-40" type="button">{L('التالي', 'Next')}</button>
          </div>
        </div>
      </div>

      {/* Service specifications — bound to the real service the user picked */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-surface-container-lowest/80 backdrop-blur-sm flex items-center justify-center p-space-md" onClick={e => { if (e.target === e.currentTarget) setDetail(null); }}>
          <div className="w-full max-w-xl bg-surface-container rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-space-lg py-space-md bg-surface-container-low flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <SlidersHorizontal className="text-primary h-[24px] w-[24px] shrink-0" />
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold">{L('مواصفات ونقاط الخدمة الفنية', 'Service specifications')}</span>
              </div>
              <button className="text-on-surface-variant hover:text-on-surface p-1" onClick={() => setDetail(null)} type="button">
                <X className="h-[18px] w-[18px] shrink-0" />
              </button>
            </div>
            <div className="p-space-lg flex flex-col gap-space-md max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container-lowest">
                <span className="font-code-xs text-code-xs text-on-surface-variant">{L('معرّف نقطة النهاية', 'Service endpoint identifier')}</span>
                <code className="break-all text-end font-code-sm text-code-sm text-tertiary">#{detail.id}</code>
              </div>
              <div>
                <h4 className="font-label-lg text-label-lg text-on-surface font-bold mb-space-xs">{detail.name}</h4>
                {!!detail.description && <p className="font-body-sm text-body-sm text-on-surface-variant">{detail.description}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                <div className="p-space-sm rounded-xl bg-surface-container-lowest">
                  <span className="font-code-xs text-code-xs text-on-surface-variant block">{t('services.rate')}:</span>
                  <span className="font-code-sm text-code-sm text-tertiary">${Number(detail.pricePer1k).toFixed(4)}</span>
                </div>
                <div className="p-space-sm rounded-xl bg-surface-container-lowest">
                  <span className="font-code-xs text-code-xs text-on-surface-variant block">{t('services.minMax')}:</span>
                  <span className="font-code-sm text-code-sm text-on-surface tabular-nums">{toNum(detail.minQuantity)} / {toNum(detail.maxQuantity)}</span>
                </div>
                <div className="p-space-sm rounded-xl bg-surface-container-lowest">
                  <span className="font-code-xs text-code-xs text-on-surface-variant block">{L('سياسة التعويض', 'Refill policy')}:</span>
                  <span className="font-code-sm text-code-sm text-secondary">{detail.refillable ? L('تعويض متاح', 'Refill available') : L('بدون تعويض', 'No refill')}</span>
                </div>
                <div className="p-space-sm rounded-xl bg-surface-container-lowest">
                  <span className="font-code-xs text-code-xs text-on-surface-variant block">{L('سياسة الإلغاء', 'Cancel policy')}:</span>
                  <span className="font-code-sm text-code-sm text-on-surface">{detail.cancelable ? L('إلغاء متاح', 'Cancel available') : L('غير قابل للإلغاء', 'Not cancelable')}</span>
                </div>
                {Number(detail.cashbackPercentage) > 0 && (
                  <div className="p-space-sm rounded-xl bg-surface-container-lowest">
                    <span className="font-code-xs text-code-xs text-on-surface-variant block">{L('الكاش باك', 'Cashback')}:</span>
                    <span className="font-code-sm text-code-sm text-tertiary">{Number(detail.cashbackPercentage)}%</span>
                  </div>
                )}
                <div className="p-space-sm rounded-xl bg-surface-container-lowest">
                  <span className="font-code-xs text-code-xs text-on-surface-variant block">{L('طلب API', 'API request')}:</span>
                  <span className="font-code-sm text-code-sm text-tertiary">{`action=add&service=${detail.id}`}</span>
                </div>
              </div>
            </div>
            <div className="px-space-lg py-space-md bg-surface-container-lowest flex items-center justify-between">
              <button onClick={() => setDetail(null)} className="px-space-md py-space-xs rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface font-label-md text-label-md transition-colors" type="button">
                {t('common.close')}
              </button>
              <Link to="/dashboard/new-order" onClick={() => setDetail(null)} className="px-space-md py-space-xs rounded-xl bg-primary-container hover:bg-primary text-on-primary-container font-label-md text-label-md transition-colors flex items-center gap-space-2xs">
                <Zap className="h-[16px] w-[16px] shrink-0" />
                <span>{L('الانتقال لإنشاء الطلب فوراً', 'Go to create the order now')}</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
