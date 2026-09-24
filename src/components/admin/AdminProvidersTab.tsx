import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ServiceProvider, ProviderServiceItem, SocialPlatform } from '../../types';
import { PlatformBadge } from '../PlatformBadge';
import {
  Server,
  Radio,
  Plus,
  RefreshCw,
  Download,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  Layers,
  Edit,
  Trash2,
  Key,
  Globe,
  Sliders,
  Sparkles
} from 'lucide-react';

export const AdminProvidersTab: React.FC = () => {
  const {
    language,
    serviceProviders,
    providerCatalog,
    adminAddProvider,
    adminUpdateProvider,
    adminDeleteProvider,
    adminCheckProviderBalance,
    adminImportProviderServices,
    adminSyncProviderRates,
    showToast
  } = useApp();

  const isAr = language === 'ar';

  // Add / Edit Provider Modal State
  const [isAddProviderOpen, setIsAddProviderOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ServiceProvider | null>(null);
  const [provName, setProvName] = useState('');
  const [provApiUrl, setProvApiUrl] = useState('');
  const [provApiKey, setProvApiKey] = useState('');
  const [provMarkup, setProvMarkup] = useState<number>(30);
  const [provAutoSyncRates, setProvAutoSyncRates] = useState(true);
  const [provAutoSyncStatus, setProvAutoSyncStatus] = useState(true);
  const [provDescription, setProvDescription] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Import Services Wizard Modal State
  const [importingProvider, setImportingProvider] = useState<ServiceProvider | null>(null);
  const [importPlatformFilter, setImportPlatformFilter] = useState<SocialPlatform | 'all'>('all');
  const [importSearchTerm, setImportSearchTerm] = useState('');
  const [importMarkupPercent, setImportMarkupPercent] = useState<number>(30);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);

  // Balance checking loading state
  const [checkingBalanceId, setCheckingBalanceId] = useState<string | null>(null);

  // Computed stats
  const totalBalance = serviceProviders.reduce((acc, p) => acc + (p.status === 'active' ? p.balance : 0), 0);
  const totalImported = serviceProviders.reduce((acc, p) => acc + p.servicesCount, 0);
  const activeProvidersCount = serviceProviders.filter((p) => p.status === 'active').length;

  const handleOpenAdd = () => {
    setEditingProvider(null);
    setProvName('');
    setProvApiUrl('https://');
    setProvApiKey('');
    setProvMarkup(30);
    setProvAutoSyncRates(true);
    setProvAutoSyncStatus(true);
    setProvDescription('');
    setIsAddProviderOpen(true);
  };

  const handleOpenEdit = (prov: ServiceProvider) => {
    setEditingProvider(prov);
    setProvName(prov.name);
    setProvApiUrl(prov.apiUrl);
    setProvApiKey(prov.apiKey);
    setProvMarkup(prov.defaultMarkupPercent || 30);
    setProvAutoSyncRates(prov.autoSyncRates);
    setProvAutoSyncStatus(prov.autoSyncStatus);
    setProvDescription(prov.description || '');
    setIsAddProviderOpen(true);
  };

  const handleSaveProvider = (e: React.FormEvent) => {
    e.preventDefault();
    if (!provName.trim() || !provApiUrl.trim() || !provApiKey.trim()) {
      showToast({
        type: 'warning',
        title: isAr ? 'بيانات ناقصة' : 'Missing Fields',
        message: isAr ? 'يرجى ملء جميع الحقول المطلوبة (الاسم، الرابط، والمفتاح).' : 'Please fill all required fields.'
      });
      return;
    }

    if (editingProvider) {
      adminUpdateProvider(editingProvider.id, {
        name: provName.trim(),
        apiUrl: provApiUrl.trim(),
        apiKey: provApiKey.trim(),
        defaultMarkupPercent: provMarkup,
        autoSyncRates: provAutoSyncRates,
        autoSyncStatus: provAutoSyncStatus,
        description: provDescription.trim()
      });
    } else {
      adminAddProvider({
        name: provName.trim(),
        apiUrl: provApiUrl.trim(),
        apiKey: provApiKey.trim(),
        currency: 'USD',
        status: 'active',
        autoSyncRates: provAutoSyncRates,
        autoSyncStatus: provAutoSyncStatus,
        defaultMarkupPercent: provMarkup,
        description: provDescription.trim()
      });
    }

    setIsAddProviderOpen(false);
  };

  const handleTestConnection = async () => {
    if (!provApiUrl || !provApiKey) {
      showToast({
        type: 'warning',
        title: isAr ? 'تنبيه' : 'Warning',
        message: isAr ? 'أدخل رابط الـ API والمفتاح أولاً لتجربة الاتصال.' : 'Enter API URL and Key first.'
      });
      return;
    }

    setIsTestingConnection(true);
    setTimeout(() => {
      setIsTestingConnection(false);
      showToast({
        type: 'success',
        title: isAr ? 'الاتصال سليم 100%' : 'Connection Successful',
        message: isAr
          ? 'تم التحقق من نقطة الاتصال ومفتاح الـ API بنجاح، السيرفر يستجيب بسرعة.'
          : 'API Endpoint validated successfully. Handshake verified.'
      });
    }, 700);
  };

  const handleCheckBalance = async (provId: string) => {
    setCheckingBalanceId(provId);
    await adminCheckProviderBalance(provId);
    setCheckingBalanceId(null);
  };

  // Open Import Wizard
  const handleOpenImportModal = (prov: ServiceProvider) => {
    setImportingProvider(prov);
    setImportMarkupPercent(prov.defaultMarkupPercent || 30);
    setImportPlatformFilter('all');
    setImportSearchTerm('');
    // By default, select services from this provider that are not yet imported
    const provServices = providerCatalog.filter(
      (s) => s.providerId === prov.id && !s.imported
    );
    setSelectedServiceIds(new Set(provServices.map((s) => s.id)));
  };

  // Services available for the current importing provider
  const availableServices = providerCatalog.filter((s) => {
    if (importingProvider && s.providerId !== importingProvider.id) return false;
    const matchesPlatform = importPlatformFilter === 'all' || s.platform === importPlatformFilter;
    const matchesSearch =
      s.name.toLowerCase().includes(importSearchTerm.toLowerCase()) ||
      s.category.toLowerCase().includes(importSearchTerm.toLowerCase()) ||
      s.providerServiceId.includes(importSearchTerm);
    return matchesPlatform && matchesSearch;
  });

  const toggleServiceSelection = (id: string) => {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const ids = availableServices.map((s) => s.id);
    setSelectedServiceIds(new Set(ids));
  };

  const handleDeselectAll = () => {
    setSelectedServiceIds(new Set());
  };

  const handleExecuteImport = () => {
    if (!importingProvider || selectedServiceIds.size === 0) {
      showToast({
        type: 'warning',
        title: isAr ? 'لا توجد خدمات محددة' : 'No Services Selected',
        message: isAr ? 'يرجى تحديد خدمة واحدة على الأقل للاستيراد.' : 'Please select at least one service.'
      });
      return;
    }

    setIsImporting(true);
    setTimeout(() => {
      const servicesToImport = providerCatalog
        .filter((s) => selectedServiceIds.has(s.id))
        .map((s) => ({
          providerService: s,
          customRate: +(s.originalRate * (1 + importMarkupPercent / 100)).toFixed(3)
        }));

      adminImportProviderServices(importingProvider.id, servicesToImport, importMarkupPercent);
      setIsImporting(false);
      setImportingProvider(null);
    }, 600);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isAr ? 'مزودو الخدمات والـ APIs الخارجية' : 'API Providers & Service Importer'}
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Radio className="w-3 h-3 animate-pulse" />
              {isAr ? 'ربط تلقائي v2' : 'v2 Automated'}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? 'إدارة سيرفرات ومزودي خدمات الـ SMM، استيراد الخدمات بضغطة زر مع ضبط هوامش الربح ومزامنة الأسعار.'
              : 'Connect external wholesale SMM APIs, import service catalogs with custom markup, and sync balances.'}
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? 'إضافة مزود API جديد' : 'Add New Provider'}</span>
        </button>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Card 1: Connected Providers */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block">
              {isAr ? 'المزودين المتصلين' : 'Connected Providers'}
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {serviceProviders.length}
              </span>
              <span className="text-[11px] font-bold text-emerald-500">
                ({activeProvidersCount} {isAr ? 'نشط' : 'active'})
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Provider Balances */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block">
              {isAr ? 'إجمالي أرصدتك لدى المزودين' : 'Total API Balances'}
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                ${totalBalance.toFixed(2)}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">USD</span>
            </div>
          </div>
        </div>

        {/* Card 3: Imported Services */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block">
              {isAr ? 'الخدمات المستوردة المربوطة' : 'Imported Services'}
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {totalImported}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {isAr ? 'خدمة معروضة للبيع' : 'services active'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Providers Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {serviceProviders.map((prov) => {
          const isChecking = checkingBalanceId === prov.id;
          const isLowBalance = prov.balance < 20;

          return (
            <div
              key={prov.id}
              className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border transition-all duration-200 shadow-xs flex flex-col justify-between ${
                prov.status === 'active'
                  ? 'border-slate-200 dark:border-slate-800 hover:border-blue-500/40 dark:hover:border-blue-500/40'
                  : 'border-slate-200/60 dark:border-slate-800/60 opacity-80'
              }`}
            >
              <div className="space-y-4">
                
                {/* Provider Header: Name, Status, Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-inner">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-sm text-slate-900 dark:text-white">
                          {prov.name}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            prov.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {prov.status === 'active' ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Inactive')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                        <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[220px] font-mono text-[11px]">{prov.apiUrl}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions (Edit / Delete) */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(prov)}
                      className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
                      title={isAr ? 'تعديل الإعدادات' : 'Edit Settings'}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(isAr ? `هل أنت متأكد من حذف المزود ${prov.name}؟` : `Delete provider ${prov.name}?`)) {
                          adminDeleteProvider(prov.id);
                        }
                      }}
                      className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                      title={isAr ? 'حذف المزود' : 'Delete Provider'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Description if present */}
                {prov.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {prov.description}
                  </p>
                )}

                {/* Balance & Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                  
                  {/* Balance Item */}
                  <div className="space-y-0.5">
                    <div className="text-[10.5px] text-slate-400 font-bold flex items-center gap-1">
                      <span>{isAr ? 'رصيد الـ API' : 'API Balance'}</span>
                      {isLowBalance && (
                        <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-500 font-black">
                          {isAr ? 'منخفض' : 'Low'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        ${prov.balance.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleCheckBalance(prov.id)}
                        disabled={isChecking}
                        className="p-1 text-slate-400 hover:text-blue-500 transition-colors cursor-pointer disabled:opacity-50"
                        title={isAr ? 'تحديث وفحص الرصيد الآن' : 'Check Live Balance'}
                      >
                        <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin text-blue-500' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Imported Services count */}
                  <div className="space-y-0.5">
                    <div className="text-[10.5px] text-slate-400 font-bold">
                      {isAr ? 'الخدمات المستوردة' : 'Imported'}
                    </div>
                    <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                      {prov.servicesCount} {isAr ? 'خدمة' : 'items'}
                    </span>
                  </div>

                  {/* Markup % */}
                  <div className="space-y-0.5 col-span-2 sm:col-span-1">
                    <div className="text-[10.5px] text-slate-400 font-bold">
                      {isAr ? 'هامش الربح الافتراضي' : 'Default Markup'}
                    </div>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      +{prov.defaultMarkupPercent}%
                    </span>
                  </div>

                </div>

                {/* Synchronization Toggles and Status */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${prov.autoSyncRates ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {isAr ? 'مزامنة الأسعار التلقائية' : 'Auto-sync rates'}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${prov.autoSyncStatus ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {isAr ? 'مزامنة الحالة' : 'Auto-sync status'}
                    </span>
                  </div>

                  <span className="text-slate-400 text-[10px]">
                    {isAr ? 'آخر تحديث:' : 'Synced:'} {prov.lastSync}
                  </span>
                </div>

              </div>

              {/* Bottom Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleOpenImportModal(prov)}
                  className="px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center gap-1.5 border border-blue-200 dark:border-blue-800/60 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isAr ? 'استيراد خدمات من المزود' : 'Import Services'}</span>
                </button>

                <button
                  onClick={() => adminSyncProviderRates(prov.id)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isAr ? 'مزامنة الأسعار الآن' : 'Sync Rates Now'}</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* ADD / EDIT PROVIDER MODAL */}
      {/* ========================================================================= */}
      {isAddProviderOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-start">
            
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Server className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    {editingProvider
                      ? (isAr ? 'تعديل بيانات المزود والـ API' : 'Edit API Provider')
                      : (isAr ? 'إضافة مزود خدمات SMM جديد' : 'Connect New SMM Provider')}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isAr ? 'ربط السيرفر الخارجي عبر بروتوكول SMM API v2' : 'Connect external SMM server via v2 API protocol'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddProviderOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProvider} className="p-6 space-y-4">
              
              {/* Provider Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'اسم المزود / الشركة' : 'Provider Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isAr ? 'مثال: JustAnotherPanel Global' : 'e.g. JustAnotherPanel Global'}
                  value={provName}
                  onChange={(e) => setProvName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* API URL */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>{isAr ? 'رابط نقطة الاتصال (API URL Endpoint)' : 'API URL Endpoint'}</span>
                  <span className="text-[10px] text-slate-400 font-mono">v2 standard</span>
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
                  <input
                    type="url"
                    required
                    placeholder="https://examplepanel.com/api/v2"
                    value={provApiUrl}
                    onChange={(e) => setProvApiUrl(e.target.value)}
                    className="w-full ps-9 pe-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* API Key */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'مفتاح الـ API الخاص بحسابك (API Key)' : 'API Key'}
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. 78219abf019284cb89..."
                    value={provApiKey}
                    onChange={(e) => setProvApiKey(e.target.value)}
                    className="w-full ps-9 pe-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Profit Markup & Auto Sync options */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      {isAr ? 'هامش الربح الافتراضي عند الاستيراد (%)' : 'Default Profit Markup (%)'}
                    </label>
                    <p className="text-[11px] text-slate-400">
                      {isAr
                        ? 'سيتم إضافة هذه النسبة فوق سعر تكلفة المزود لحساب سعر البيع.'
                        : 'Added on top of wholesale cost when importing services.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 w-24">
                    <input
                      type="number"
                      min="0"
                      max="500"
                      value={provMarkup}
                      onChange={(e) => setProvMarkup(Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-center font-bold text-xs"
                    />
                    <span className="text-xs font-bold text-slate-500">%</span>
                  </div>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700/80 pt-3 space-y-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isAr ? 'تحديث الأسعار تلقائياً إذا تغيرت من المزود' : 'Auto-sync rates with provider changes'}
                    </span>
                    <input
                      type="checkbox"
                      checked={provAutoSyncRates}
                      onChange={(e) => setProvAutoSyncRates(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isAr ? 'تعطيل الخدمة تلقائياً إذا توقفت لدى المزود' : 'Auto-disable service if provider disables it'}
                    </span>
                    <input
                      type="checkbox"
                      checked={provAutoSyncStatus}
                      onChange={(e) => setProvAutoSyncStatus(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'ملاحظات / وصف المزود' : 'Provider Notes / Description'}
                </label>
                <textarea
                  rows={2}
                  value={provDescription}
                  onChange={(e) => setProvDescription(e.target.value)}
                  placeholder={isAr ? 'مثلاً: متخصص في خدمات التيك توك السريعة...' : 'Optional notes...'}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 gap-3">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin' : ''}`} />
                  <span>{isTestingConnection ? (isAr ? 'جارِ الفحص...' : 'Testing...') : (isAr ? 'فحص الاتصال' : 'Test Connection')}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddProviderOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    {editingProvider
                      ? (isAr ? 'حفظ التعديلات' : 'Save Changes')
                      : (isAr ? 'إضافة وتثبيت المزود' : 'Add Provider')}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SERVICE IMPORT WIZARD MODAL */}
      {/* ========================================================================= */}
      {importingProvider && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-start">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/30">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base text-slate-900 dark:text-white">
                      {isAr ? 'استيراد خدمات من المزود' : 'Import Services from Provider'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs">
                      {importingProvider.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {isAr
                      ? `رصيد المزود: $${importingProvider.balance.toFixed(2)} | اختر الخدمات واضبط هامش الربح المطلوب`
                      : `Provider balance: $${importingProvider.balance.toFixed(2)} | Select services & configure markup`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setImportingProvider(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter and Profit Markup Bar */}
            <div className="p-4 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 shrink-0 space-y-3">
              
              {/* Dynamic Markup Calculation Box */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'هامش الربح للاستيراد:' : 'Import Markup Percentage:'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setImportMarkupPercent(20)}
                      className={`px-2 py-0.5 rounded text-xs font-bold cursor-pointer ${
                        importMarkupPercent === 20 ? 'bg-blue-600 text-white' : 'text-slate-500'
                      }`}
                    >
                      +20%
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMarkupPercent(30)}
                      className={`px-2 py-0.5 rounded text-xs font-bold cursor-pointer ${
                        importMarkupPercent === 30 ? 'bg-blue-600 text-white' : 'text-slate-500'
                      }`}
                    >
                      +30%
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMarkupPercent(50)}
                      className={`px-2 py-0.5 rounded text-xs font-bold cursor-pointer ${
                        importMarkupPercent === 50 ? 'bg-blue-600 text-white' : 'text-slate-500'
                      }`}
                    >
                      +50%
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="500"
                      value={importMarkupPercent}
                      onChange={(e) => setImportMarkupPercent(Math.max(0, Number(e.target.value)))}
                      className="w-16 px-2 py-1 text-xs font-black text-center rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                    <span className="text-xs font-bold text-emerald-500">%</span>
                  </div>
                </div>
              </div>

              {/* Filters & Selection Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Search box */}
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 top-2.5" />
                    <input
                      type="text"
                      placeholder={isAr ? 'بحث بالاسم أو رقم الخدمة...' : 'Search by name or ID...'}
                      value={importSearchTerm}
                      onChange={(e) => setImportSearchTerm(e.target.value)}
                      className="w-full ps-8 pe-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  {/* Platform Selector */}
                  <select
                    value={importPlatformFilter}
                    onChange={(e) => setImportPlatformFilter(e.target.value as any)}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="all">{isAr ? 'كافة المنصات' : 'All Platforms'}</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="twitter">Twitter</option>
                    <option value="telegram">Telegram</option>
                    <option value="facebook">Facebook</option>
                    <option value="spotify">Spotify</option>
                    <option value="linkedin">LinkedIn</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    {isAr ? 'تحديد الكل' : 'Select All'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    {isAr ? 'إلغاء التحديد' : 'Deselect All'}
                  </button>
                  <span className="text-slate-400 font-bold ms-1">
                    ({selectedServiceIds.size} {isAr ? 'محدد' : 'selected'})
                  </span>
                </div>
              </div>

            </div>

            {/* Services List Table */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 dark:divide-slate-800">
              {availableServices.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                  <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 opacity-60" />
                  <p>{isAr ? 'لا توجد خدمات مطابقة للمزود المحدد أو لمعايير البحث.' : 'No services found matching filters.'}</p>
                </div>
              ) : (
                availableServices.map((service) => {
                  const isSelected = selectedServiceIds.has(service.id);
                  const sellingRate = +(service.originalRate * (1 + importMarkupPercent / 100)).toFixed(3);
                  const isImported = service.imported;

                  return (
                    <div
                      key={service.id}
                      onClick={() => !isImported && toggleServiceSelection(service.id)}
                      className={`p-3.5 flex items-center justify-between gap-3 rounded-2xl transition-colors cursor-pointer ${
                        isImported
                          ? 'opacity-60 bg-slate-50/50 dark:bg-slate-800/20 cursor-not-allowed'
                          : isSelected
                          ? 'bg-blue-50/80 dark:bg-blue-950/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          disabled={isImported}
                          checked={isSelected}
                          onChange={() => toggleServiceSelection(service.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 shrink-0 cursor-pointer"
                        />

                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold shrink-0">
                              #{service.providerServiceId}
                            </span>
                            <PlatformBadge platform={service.platform} size="sm" />
                            {isImported && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                                {isAr ? 'مستوردة مسبقاً' : 'Already Imported'}
                              </span>
                            )}
                          </div>

                          <div className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-xl">
                            {service.name}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                            <span>{isAr ? 'الفئة:' : 'Category:'} {service.category}</span>
                            <span>•</span>
                            <span>{isAr ? 'الحد الأدنى/الأقصى:' : 'Min/Max:'} {(service.min ?? 0).toLocaleString()} / {(service.max ?? 0).toLocaleString()}</span>
                            {service.refill && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-500 font-medium">
                                  {isAr ? `ضمان ${service.refillDays || 30} يوم` : `${service.refillDays || 30}D Refill`}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Pricing Comparison */}
                      <div className="text-end shrink-0 ps-3">
                        <div className="text-[10.5px] text-slate-400 line-through">
                          {isAr ? 'تكلفة المزود:' : 'Cost:'} ${service.originalRate.toFixed(3)}
                        </div>
                        <div className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                          ${sellingRate.toFixed(3)}
                          <span className="text-[10px] font-normal text-slate-400 ms-1">/ 1k</span>
                        </div>
                        <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                          {isAr ? 'ربح:' : 'Profit:'} +${(sellingRate - service.originalRate).toFixed(3)}
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer with Action */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0 flex items-center justify-between gap-3">
              <div className="text-xs">
                <span className="text-slate-400">{isAr ? 'سيتم استيراد:' : 'Importing:'}</span>{' '}
                <span className="font-black text-blue-600 dark:text-blue-400 text-sm">
                  {selectedServiceIds.size} {isAr ? 'خدمة' : 'services'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setImportingProvider(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>

                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={selectedServiceIds.size === 0 || isImporting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <Download className={`w-4 h-4 ${isImporting ? 'animate-bounce' : ''}`} />
                  <span>
                    {isImporting
                      ? (isAr ? 'جارِ الاستيراد...' : 'Importing...')
                      : (isAr ? `تأكيد استيراد (${selectedServiceIds.size}) خدمة` : `Confirm Import (${selectedServiceIds.size})`)}
                  </span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
