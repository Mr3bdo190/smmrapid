import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DiscountCoupon } from '../../types';
import {
  Tag,
  Plus,
  Percent,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Trash2,
  Edit2,
  DollarSign,
  AlertCircle,
  X,
  Sparkles
} from 'lucide-react';

export const AdminCouponsTab: React.FC = () => {
  const { language, coupons, adminAddCoupon, adminUpdateCoupon, adminDeleteCoupon } = useApp();
  const isAr = language === 'ar';

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<DiscountCoupon | null>(null);

  // Form States
  const [code, setCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(10);
  const [minOrderAmount, setMinOrderAmount] = useState<number>(5);
  const [maxDiscountUSD, setMaxDiscountUSD] = useState<number>(50);
  const [usageLimit, setUsageLimit] = useState<number>(100);
  const [expiresAt, setExpiresAt] = useState('');

  const handleOpenAdd = () => {
    setCode('');
    setDiscountPercent(15);
    setMinOrderAmount(5);
    setMaxDiscountUSD(50);
    setUsageLimit(100);
    // 30 days from now default
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setExpiresAt(d.toISOString().slice(0, 10));
    setEditingCoupon(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (c: DiscountCoupon) => {
    setEditingCoupon(c);
    setCode(c.code);
    setDiscountPercent(c.discountPercent);
    setMinOrderAmount(c.minOrderAmount);
    setMaxDiscountUSD(c.maxDiscountUSD || 50);
    setUsageLimit(c.usageLimit);
    setExpiresAt(c.expiresAt ? c.expiresAt.slice(0, 10) : '');
    setIsAddModalOpen(true);
  };

  const handleSaveCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    if (editingCoupon) {
      adminUpdateCoupon(editingCoupon.id, {
        code: code.trim().toUpperCase(),
        discountPercent: Number(discountPercent),
        minOrderAmount: Number(minOrderAmount),
        maxDiscountUSD: Number(maxDiscountUSD),
        usageLimit: Number(usageLimit),
        expiresAt: expiresAt ? `${expiresAt} 23:59` : undefined
      });
    } else {
      adminAddCoupon({
        code: code.trim().toUpperCase(),
        discountPercent: Number(discountPercent),
        minOrderAmount: Number(minOrderAmount),
        maxDiscountUSD: Number(maxDiscountUSD) || undefined,
        usageLimit: Number(usageLimit) || 100,
        expiresAt: expiresAt ? `${expiresAt} 23:59` : '2026-12-31 23:59',
        isActive: true,
        descriptionAr: `خصم ${discountPercent}% عند الطلب بقيمة ${minOrderAmount}$ فأكثر`,
        descriptionEn: `${discountPercent}% discount on orders above $${minOrderAmount}`
      });
    }

    setIsAddModalOpen(false);
  };

  const totalCouponsCount = coupons.length;
  const activeCouponsCount = coupons.filter((c) => c.isActive).length;
  const totalUsesCount = coupons.reduce((sum, c) => sum + c.usedCount, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="w-6 h-6 text-emerald-500" />
            <span>{isAr ? 'كوبونات الخصم والعروض الترويجية' : 'Coupons & Promo Codes'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {isAr
              ? 'إنشاء أكواد الخصم، تحديد نسب التخفيض، وضع الحدود القصوى للاستخدام والحد الأدنى للطلبات.'
              : 'Create discount codes, set percentage off, usage limits, and expiration criteria.'}
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-500/25 flex items-center gap-2 self-start cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? 'إنشاء كوبون جديد' : 'New Promo Coupon'}</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">
              {isAr ? 'الكوبونات المفعلة' : 'Active Coupons'}
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {activeCouponsCount} / {totalCouponsCount}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">
              {isAr ? 'مرات الاستخدام الناجحة' : 'Total Redemptions'}
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {totalUsesCount} {isAr ? 'استخدام' : 'uses'}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">
              {isAr ? 'أعلى نسبة تخفيض' : 'Max Discount %'}
            </div>
            <div className="text-2xl font-black text-purple-500 font-mono">
              {coupons.length > 0 ? Math.max(...coupons.map((c) => c.discountPercent)) : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-extrabold text-[10px]">
              <tr>
                <th className="p-4">{isAr ? 'كود الكوبون' : 'Code'}</th>
                <th className="p-4">{isAr ? 'نسبة الخصم' : 'Discount'}</th>
                <th className="p-4">{isAr ? 'شروط الطلب' : 'Limits'}</th>
                <th className="p-4">{isAr ? 'معدل الاستخدام' : 'Usage'}</th>
                <th className="p-4">{isAr ? 'تاريخ الانتهاء' : 'Expiry'}</th>
                <th className="p-4">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="p-4 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {coupons.map((coupon) => {
                const percentUsed = Math.min(100, Math.round((coupon.usedCount / coupon.usageLimit) * 100));

                return (
                  <tr key={coupon.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Code */}
                    <td className="p-4 font-mono font-black text-sm text-slate-900 dark:text-white select-all">
                      <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 tracking-wider">
                        {coupon.code}
                      </span>
                    </td>

                    {/* Discount */}
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-xs">
                        {coupon.discountPercent}% OFF
                      </span>
                    </td>

                    {/* Conditions */}
                    <td className="p-4 text-[11px] text-slate-600 dark:text-slate-300">
                      <div>
                        {isAr ? 'الحد الأدنى:' : 'Min:'} <span className="font-bold font-mono">${coupon.minOrderAmount}</span>
                      </div>
                      {coupon.maxDiscountUSD && (
                        <div>
                          {isAr ? 'أقصى خصم:' : 'Cap:'} <span className="font-bold font-mono">${coupon.maxDiscountUSD}</span>
                        </div>
                      )}
                    </td>

                    {/* Usage Progress */}
                    <td className="p-4 min-w-[130px]">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                        <span>{coupon.usedCount} / {coupon.usageLimit}</span>
                        <span>{percentUsed}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{ width: `${percentUsed}%` }}
                        />
                      </div>
                    </td>

                    {/* Expiry */}
                    <td className="p-4 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {coupon.expiresAt ? coupon.expiresAt : (isAr ? 'دائم (غير محدد)' : 'No Expiry')}
                    </td>

                    {/* Status Toggle */}
                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() => adminUpdateCoupon(coupon.id, { isActive: !coupon.isActive })}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black cursor-pointer transition-colors ${
                          coupon.isActive
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                        }`}
                      >
                        {coupon.isActive ? (isAr ? 'نشط' : 'Active') : (isAr ? 'متوقف' : 'Inactive')}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(coupon)}
                          className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg transition-colors cursor-pointer"
                          title={isAr ? 'تعديل الكوبون' : 'Edit'}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(isAr ? `حذف الكوبون ${coupon.code} نهائياً؟` : `Delete coupon ${coupon.code}?`)) {
                              adminDeleteCoupon(coupon.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                          title={isAr ? 'حذف الكوبون' : 'Delete'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Coupon Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base flex items-center gap-2 text-slate-900 dark:text-white">
                <Tag className="w-5 h-5 text-emerald-500" />
                <span>{editingCoupon ? (isAr ? 'تعديل الكوبون' : 'Edit Coupon') : (isAr ? 'إنشاء كود خصم جديد' : 'New Promo Coupon')}</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {isAr ? 'كود الكوبون (الحروف الإنجليزية الكبيرة):' : 'Promo Code (Uppercase):'}
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. VIP25, RAPID50"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 tracking-wider"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isAr ? 'نسبة الخصم (%):' : 'Discount Percent (%):'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    required
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isAr ? 'الحد الأدنى للطلب ($):' : 'Min Order Amount ($):'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isAr ? 'الحد الأقصى للخصم ($):' : 'Max Cap Discount ($):'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxDiscountUSD}
                    onChange={(e) => setMaxDiscountUSD(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isAr ? 'الحد الأقصى للاستخدام:' : 'Usage Limit:'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {isAr ? 'تاريخ انتهاء الصلاحية:' : 'Expiration Date:'}
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-md shadow-emerald-500/25 cursor-pointer"
                >
                  {editingCoupon ? (isAr ? 'حفظ التعديلات' : 'Save Changes') : (isAr ? 'إنشاء الكوبون' : 'Create Coupon')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
