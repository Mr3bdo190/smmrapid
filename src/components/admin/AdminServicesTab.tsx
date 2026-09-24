import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ServiceItem, SocialPlatform } from '../../types';
import {
  Layers,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  TrendingUp,
  Percent,
  X,
  CheckCircle,
  Zap,
  ArrowUpDown
} from 'lucide-react';
import { PlatformBadge } from '../PlatformBadge';

export const AdminServicesTab: React.FC = () => {
  const {
    language,
    services,
    adminUpdateService,
    adminAddService,
    adminDeleteService,
    showToast
  } = useApp();

  const isAr = language === 'ar';

  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  // Edit Service Modal State
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [editRate, setEditRate] = useState<string>('');
  const [editMin, setEditMin] = useState<number>(100);
  const [editMax, setEditMax] = useState<number>(100000);
  const [editRefillDays, setEditRefillDays] = useState<number>(30);

  // Add Service Modal State
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [addNameAr, setAddNameAr] = useState('');
  const [addNameEn, setAddNameEn] = useState('');
  const [addPlatform, setAddPlatform] = useState<SocialPlatform>('instagram');
  const [addCategoryAr, setAddCategoryAr] = useState('متابعين حقيقيين');
  const [addCategoryEn, setAddCategoryEn] = useState('Real Followers');
  const [addRate, setAddRate] = useState('2.50');
  const [addMin, setAddMin] = useState('100');
  const [addMax, setAddMax] = useState('50000');

  // Bulk Adjustment State
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkPercent, setBulkPercent] = useState<number>(10);

  const filteredServices = services.filter((s) => {
    const matchesSearch =
      s.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPlatform = platformFilter === 'all' || s.platform === platformFilter;

    return matchesSearch && matchesPlatform;
  });

  const handleOpenEdit = (s: ServiceItem) => {
    setEditingService(s);
    setEditRate(s.ratePer1000.toString());
    setEditMin(s.min);
    setEditMax(s.max);
    setEditRefillDays(s.refillDays || 30);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    adminUpdateService(editingService.id, {
      ratePer1000: Number(editRate),
      min: Number(editMin),
      max: Number(editMax),
      refillDays: Number(editRefillDays)
    });

    setEditingService(null);
  };

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addNameAr.trim() || !addNameEn.trim()) return;

    adminAddService({
      platform: addPlatform,
      categoryAr: addCategoryAr.trim(),
      categoryEn: addCategoryEn.trim(),
      nameAr: addNameAr.trim(),
      nameEn: addNameEn.trim(),
      ratePer1000: Number(addRate) || 1.0,
      min: Number(addMin) || 100,
      max: Number(addMax) || 100000,
      avgTimeAr: 'فوري وسريع',
      avgTimeEn: 'Instant & Fast',
      refillDays: 30,
      speed: 'instant',
      descriptionAr: 'خدمة فائقة الجودة وسريعة التنفيذ بحماية كاملة.',
      descriptionEn: 'High quality and fast execution service.'
    });

    setIsAddServiceOpen(false);
    setAddNameAr('');
    setAddNameEn('');
  };

  const handleApplyBulkPriceAdjustment = () => {
    const multiplier = 1 + bulkPercent / 100;
    services.forEach((s) => {
      const newRate = Number((s.ratePer1000 * multiplier).toFixed(3));
      adminUpdateService(s.id, { ratePer1000: Math.max(0.1, newRate) });
    });

    setIsBulkOpen(false);
    showToast({
      type: 'success',
      title: isAr ? 'تم تعديل جميع الأسعار' : 'Bulk Pricing Applied',
      message: isAr
        ? `تم تحديث أسعار ${services.length} خدمة بنسبة ${bulkPercent > 0 ? `+${bulkPercent}%` : `${bulkPercent}%`}`
        : `Adjusted all services by ${bulkPercent}%`
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-500" />
            <span>{isAr ? 'التحكم في الخدمات والأسعار والعروض' : 'Service Catalog & Dynamic Pricing'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {isAr
              ? 'تعديل أسعار الخدمات للألف، ضبط الحدود الدنيا والقصوى، إضافة وحذف الخدمات، والتعديل الجماعي للأسعار.'
              : 'Edit rates per 1,000, min/max limits, add/remove services, and execute bulk price markups or discounts.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBulkOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Percent className="w-3.5 h-3.5 text-amber-500" />
            <span>{isAr ? 'تعديل جماعي للأسعار %' : 'Bulk Price %'}</span>
          </button>

          <button
            onClick={() => setIsAddServiceOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-indigo-500/25 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'إضافة خدمة جديدة' : 'Add Service'}</span>
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-3" />
          <input
            type="text"
            placeholder={isAr ? 'بحث باسم الخدمة، المنصة، أو كود الخدمة...' : 'Search service name, category, or ID...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl ps-10 pe-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Platform filter */}
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">{isAr ? 'جميع المنصات (All Platforms)' : 'All Platforms'}</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="youtube">YouTube</option>
          <option value="telegram">Telegram</option>
          <option value="facebook">Facebook</option>
          <option value="twitter">X / Twitter</option>
          <option value="threads">Threads</option>
          <option value="snapchat">Snapchat</option>
        </select>

      </div>

      {/* Services Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-extrabold">
              <tr>
                <th className="p-4">{isAr ? 'كود الخدمة والمنصة' : 'ID & Platform'}</th>
                <th className="p-4">{isAr ? 'اسم الخدمة والتصنيف' : 'Service Name & Category'}</th>
                <th className="p-4">{isAr ? 'السعر لكل 1,000' : 'Rate / 1k ($)'}</th>
                <th className="p-4">{isAr ? 'الحد الأدنى والأقصى' : 'Min - Max'}</th>
                <th className="p-4">{isAr ? 'السرعة والضمان' : 'Speed & Refill'}</th>
                <th className="p-4 text-center">{isAr ? 'التحكم والتعديل' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    {isAr ? 'لا توجد خدمات تطابق البحث' : 'No services found'}
                  </td>
                </tr>
              ) : (
                filteredServices.map((service) => (
                  <tr
                    key={service.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* ID & Platform */}
                    <td className="p-4">
                      <div className="space-y-1">
                        <span className="font-mono font-bold text-slate-900 dark:text-white block">
                          {service.id}
                        </span>
                        <div className="flex flex-wrap items-center gap-1">
                          <PlatformBadge platform={service.platform} />
                          {service.providerId && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              API
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Name */}
                    <td className="p-4 max-w-sm">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {isAr ? service.nameAr : service.nameEn}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {isAr ? service.categoryAr : service.categoryEn}
                        </span>
                      </div>
                    </td>

                    {/* Price Rate */}
                    <td className="p-4 font-mono font-black text-slate-900 dark:text-white text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          ${service.ratePer1000.toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleOpenEdit(service)}
                          className="p-1 text-slate-400 hover:text-indigo-500 rounded transition-colors"
                          title={isAr ? 'تعديل السعر' : 'Edit Rate'}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Min - Max */}
                    <td className="p-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {(service.min ?? 0).toLocaleString()} - {(service.max ?? 0).toLocaleString()}
                    </td>

                    {/* Speed & Refill */}
                    <td className="p-4">
                      <div className="space-y-0.5 text-[10px]">
                        <span className="text-slate-500 dark:text-slate-400 block">
                          {isAr ? (service.avgTimeAr || service.avgSpeedAr) : (service.avgTimeEn || service.avgSpeedEn)}
                        </span>
                        {service.refillDays && service.refillDays > 0 ? (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">
                            {isAr ? `ضمان ${service.refillDays} يوم` : `${service.refillDays}d Refill`}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(service)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 font-bold text-[11px] transition-colors"
                        >
                          {isAr ? 'تعديل' : 'Edit'}
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm(isAr ? `هل أنت متأكد من حذف الخدمة "${service.nameAr}"؟` : `Delete service ${service.id}?`)) {
                              adminDeleteService(service.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                          title={isAr ? 'حذف الخدمة' : 'Delete Service'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Service Modal */}
      {editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-500" />
                <span>{isAr ? 'تعديل أسعار وضوابط الخدمة' : 'Edit Service Pricing & Limits'}</span>
              </h3>
              <button
                onClick={() => setEditingService(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="font-bold text-slate-900 dark:text-white">
                  {isAr ? editingService.nameAr : editingService.nameEn}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {editingService.id}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {isAr ? 'السعر لكل 1,000 ($ USD):' : 'Rate Per 1,000 ($ USD):'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editRate}
                  onChange={(e) => setEditRate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 font-mono text-base font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isAr ? 'الحد الأدنى (Min):' : 'Minimum:'}
                  </label>
                  <input
                    type="number"
                    value={editMin}
                    onChange={(e) => setEditMin(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isAr ? 'الحد الأقصى (Max):' : 'Maximum:'}
                  </label>
                  <input
                    type="number"
                    value={editMax}
                    onChange={(e) => setEditMax(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {isAr ? 'أيام ضمان التعويض (Refill Days):' : 'Refill Guarantee Days:'}
                </label>
                <input
                  type="number"
                  value={editRefillDays}
                  onChange={(e) => setEditRefillDays(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md shadow-indigo-500/25"
                >
                  {isAr ? 'حفظ السعر الجديد' : 'Save Pricing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Price Adjustment Modal */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base flex items-center gap-2">
                <Percent className="w-5 h-5 text-amber-500" />
                <span>{isAr ? 'التعديل الجماعي لأسعار جميع الخدمات' : 'Bulk Pricing Adjustment (%)'}</span>
              </h3>
              <button
                onClick={() => setIsBulkOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isAr
                ? 'يمكنك زيادة أو تخفيض أسعار جميع الخدمات دفعة واحدة بنسبة مئوية (مثال: +10% زيادة ربح، أو -5% تخفيض عام).'
                : 'Increase or discount all catalog rates simultaneously by a percentage.'}
            </p>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                {isAr ? 'نسبة التعديل المئوية (%):' : 'Percentage Change (%):'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={bulkPercent}
                  onChange={(e) => setBulkPercent(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 font-mono text-lg font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="font-black text-lg text-slate-500">%</span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-xs font-bold">
                {[5, 10, 15, -10].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setBulkPercent(val)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {val > 0 ? `+${val}%` : `${val}%`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleApplyBulkPriceAdjustment}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md shadow-amber-500/25"
              >
                {isAr ? 'تطبيق التعديل الجماعي' : 'Apply to All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Service Modal */}
      {isAddServiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500" />
                <span>{isAr ? 'إضافة خدمة جديدة إلى المنصة' : 'Add New Service to Platform'}</span>
              </h3>
              <button
                onClick={() => setIsAddServiceOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateService} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {isAr ? 'اسم الخدمة بالعربية:' : 'Service Name (Arabic):'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isAr ? 'مثال: متابعين انستغرام عرب حقيقيين نشطين' : 'Instagram followers'}
                  value={addNameAr}
                  onChange={(e) => setAddNameAr(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {isAr ? 'اسم الخدمة بالإنجليزية:' : 'Service Name (English):'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Instagram Real Active Arabic Followers"
                  value={addNameEn}
                  onChange={(e) => setAddNameEn(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isAr ? 'المنصة:' : 'Platform:'}
                  </label>
                  <select
                    value={addPlatform}
                    onChange={(e) => setAddPlatform(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="telegram">Telegram</option>
                    <option value="facebook">Facebook</option>
                    <option value="twitter">X / Twitter</option>
                    <option value="threads">Threads</option>
                    <option value="snapchat">Snapchat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isAr ? 'السعر لكل 1,000 ($):' : 'Rate / 1k ($):'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={addRate}
                    onChange={(e) => setAddRate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isAr ? 'الحد الأدنى:' : 'Min Quantity:'}
                  </label>
                  <input
                    type="number"
                    value={addMin}
                    onChange={(e) => setAddMin(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isAr ? 'الحد الأقصى:' : 'Max Quantity:'}
                  </label>
                  <input
                    type="number"
                    value={addMax}
                    onChange={(e) => setAddMax(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddServiceOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md shadow-indigo-500/25"
                >
                  {isAr ? 'إضافة الخدمة الآن' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
