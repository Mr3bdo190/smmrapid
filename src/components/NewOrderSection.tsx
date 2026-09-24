import React, { useState, useId } from 'react';
import { useApp } from '../context/AppContext';
import { SocialPlatform, ServiceItem } from '../types';
import { getPlatformMeta } from './PlatformBadge';
import {
  Zap,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Link2,
  Clock,
  HelpCircle,
  Sliders,
  DollarSign,
  Layers,
  ChevronDown,
  Star,
  Tag,
  ListOrdered,
  AlertCircle,
  CheckCircle2,
  X,
  FileSpreadsheet
} from 'lucide-react';

export const NewOrderSection: React.FC = () => {
  const {
    language,
    services,
    userStats,
    placeOrder,
    placeBulkOrders,
    setIsAddFundsModalOpen,
    setActiveTab,
    favoriteServiceIds,
    toggleFavoriteService,
    validateAndApplyCoupon,
    impersonatedUser,
    userProfile
  } = useApp();

  const isAr = language === 'ar';

  // Mode: Single Order vs Bulk / Mass Order
  const [orderMode, setOrderMode] = useState<'single' | 'bulk'>('single');

  // Single Order States
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | 'all'>('all');
  const [selectedServiceId, setSelectedServiceId] = useState<string>(services[0]?.id || '');
  const [targetLink, setTargetLink] = useState('');
  const [quantity, setQuantity] = useState<number>(1000);
  const [speedMode, setSpeedMode] = useState<'instant' | 'gradual'>('instant');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Coupon State
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountPercent: number;
    discountAmount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState('');

  // Bulk Order States
  const [bulkText, setBulkText] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);

  // Accessible unique IDs
  const platformId = useId();
  const serviceSelectId = useId();
  const targetLinkId = useId();
  const quantityInputId = useId();
  const couponInputId = useId();

  const filteredServices = services.filter((s) => {
    if (selectedPlatform === 'all') return true;
    return s.platform === selectedPlatform;
  });

  const currentService = services.find((s) => s.id === selectedServiceId) || filteredServices[0] || services[0];
  const isFavorite = currentService ? favoriteServiceIds.includes(currentService.id) : false;

  // Custom User Discount (if any)
  const userCustomDiscount = impersonatedUser?.customDiscountPercent || 0;

  // Price Calculations for Single Order
  const rawCharge = currentService
    ? Number(((currentService.ratePer1000 / 1000) * quantity).toFixed(3))
    : 0;

  // Apply custom user discount first if present
  let discountedCharge = rawCharge;
  let customDiscountSavings = 0;
  if (userCustomDiscount > 0) {
    customDiscountSavings = Number(((rawCharge * userCustomDiscount) / 100).toFixed(3));
    discountedCharge = Math.max(0, rawCharge - customDiscountSavings);
  }

  // Apply promo coupon if present
  let couponSavings = 0;
  if (appliedCoupon) {
    couponSavings = Number(((discountedCharge * appliedCoupon.discountPercent) / 100).toFixed(3));
    discountedCharge = Math.max(0, discountedCharge - couponSavings);
  }

  const finalCalculatedCharge = Number(discountedCharge.toFixed(3));

  const platforms: { id: SocialPlatform | 'all'; labelAr: string; labelEn: string }[] = [
    { id: 'all', labelAr: 'جميع المنصات', labelEn: 'All Platforms' },
    { id: 'instagram', labelAr: 'انستغرام', labelEn: 'Instagram' },
    { id: 'tiktok', labelAr: 'تيك توك', labelEn: 'TikTok' },
    { id: 'youtube', labelAr: 'يوتيوب', labelEn: 'YouTube' },
    { id: 'twitter', labelAr: 'تويتر / X', labelEn: 'Twitter / X' },
    { id: 'telegram', labelAr: 'تيليجرام', labelEn: 'Telegram' },
    { id: 'facebook', labelAr: 'فيسبوك', labelEn: 'Facebook' },
    { id: 'linkedin', labelAr: 'لينكد إن', labelEn: 'LinkedIn' },
    { id: 'spotify', labelAr: 'سبوتيفاي', labelEn: 'Spotify' }
  ];

  const handlePlatformChange = (p: SocialPlatform | 'all') => {
    setSelectedPlatform(p);
    const firstMatch = services.find((s) => p === 'all' || s.platform === p);
    if (firstMatch) {
      setSelectedServiceId(firstMatch.id);
      setQuantity(Math.max(firstMatch.min, 1000));
    }
  };

  const handleQuickQty = (amount: number) => {
    if (!currentService) return;
    const clamped = Math.min(Math.max(amount, currentService.min), currentService.max);
    setQuantity(clamped);
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    if (!couponInput.trim()) return;

    const res = validateAndApplyCoupon(couponInput.trim(), rawCharge);
    if (res.valid && res.coupon) {
      setAppliedCoupon({
        code: couponInput.trim().toUpperCase(),
        discountPercent: res.coupon.discountPercent,
        discountAmount: res.discountAmount || 0
      });
      setCouponInput('');
    } else {
      setCouponError(res.message || (isAr ? 'كود الكوبون غير صالح' : 'Invalid coupon code'));
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

  // Submit Single Order
  const handleSubmitSingleOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!targetLink.trim()) {
      setErrorMsg(isAr ? 'يرجى إدخال رابط الحساب أو المنشور المستهدف' : 'Please provide the target profile or post URL');
      return;
    }

    if (!currentService) return;

    if (quantity < (currentService.min ?? 1) || quantity > (currentService.max ?? 1000000)) {
      setErrorMsg(
        isAr
          ? `الكمية يجب أن تكون بين ${(currentService.min ?? 1).toLocaleString()} و ${(currentService.max ?? 1000000).toLocaleString()}`
          : `Quantity must be between ${(currentService.min ?? 1).toLocaleString()} and ${(currentService.max ?? 1000000).toLocaleString()}`
      );
      return;
    }

    if (userStats.balance < finalCalculatedCharge) {
      setIsAddFundsModalOpen(true);
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const res = placeOrder({
        serviceId: currentService.id,
        link: targetLink,
        quantity,
        speedMode,
        couponCode: appliedCoupon?.code
      });

      setIsSubmitting(false);
      if (res.success) {
        setTargetLink('');
        setAppliedCoupon(null);
        setActiveTab('orders');
      } else {
        setErrorMsg(res.message || (isAr ? 'فشل تنفيذ الطلب' : 'Failed to place order'));
      }
    }, 600);
  };

  // Parse Bulk Orders Lines: service_id | link | quantity
  const parseBulkLines = () => {
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsed: {
      lineNumber: number;
      serviceId: string;
      link: string;
      quantity: number;
      service?: ServiceItem;
      charge: number;
      valid: boolean;
      error?: string;
    }[] = [];

    lines.forEach((line, idx) => {
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length < 3) {
        parsed.push({
          lineNumber: idx + 1,
          serviceId: parts[0] || '',
          link: parts[1] || '',
          quantity: 0,
          charge: 0,
          valid: false,
          error: isAr ? 'تنسيق غير صحيح (service_id | link | quantity)' : 'Invalid format'
        });
        return;
      }

      const [sId, link, qtyStr] = parts;
      const qty = parseInt(qtyStr, 10);
      const srv = services.find((s) => s.id === sId);

      if (!srv) {
        parsed.push({
          lineNumber: idx + 1,
          serviceId: sId,
          link,
          quantity: qty || 0,
          charge: 0,
          valid: false,
          error: isAr ? 'رقم الخدمة غير موجود' : 'Service ID not found'
        });
        return;
      }

      if (isNaN(qty) || qty < srv.min || qty > srv.max) {
        parsed.push({
          lineNumber: idx + 1,
          serviceId: sId,
          link,
          quantity: qty || 0,
          service: srv,
          charge: 0,
          valid: false,
          error: isAr ? `الكمية يجب أن تكون بين ${srv.min} و ${srv.max}` : `Qty out of range`
        });
        return;
      }

      if (!link) {
        parsed.push({
          lineNumber: idx + 1,
          serviceId: sId,
          link,
          quantity: qty,
          service: srv,
          charge: 0,
          valid: false,
          error: isAr ? 'الرابط مفقود' : 'Link missing'
        });
        return;
      }

      const charge = Number(((srv.ratePer1000 / 1000) * qty).toFixed(3));
      parsed.push({
        lineNumber: idx + 1,
        serviceId: sId,
        link,
        quantity: qty,
        service: srv,
        charge,
        valid: true
      });
    });

    return parsed;
  };

  const parsedBulk = parseBulkLines();
  const validBulkOrders = parsedBulk.filter((p) => p.valid);
  const totalBulkCharge = Number(validBulkOrders.reduce((sum, p) => sum + p.charge, 0).toFixed(3));
  const hasInvalidBulk = parsedBulk.some((p) => !p.valid);

  // Submit Bulk Orders
  const handleSubmitBulkOrders = (e: React.FormEvent) => {
    e.preventDefault();
    setBulkError('');

    if (validBulkOrders.length === 0) {
      setBulkError(isAr ? 'يرجى إدخال طلبات صحيحة أولاً' : 'Please provide valid order lines first');
      return;
    }

    if (hasInvalidBulk) {
      setBulkError(isAr ? 'يرجى تصحيح الأسطر غير الصالحة الموضحة في المعاينة' : 'Please fix the invalid lines below');
      return;
    }

    if (userStats.balance < totalBulkCharge) {
      setIsAddFundsModalOpen(true);
      return;
    }

    setIsSubmittingBulk(true);
    setTimeout(() => {
      const res = placeBulkOrders(
        validBulkOrders.map((b) => ({
          serviceId: b.serviceId,
          link: b.link,
          quantity: b.quantity
        }))
      );

      setIsSubmittingBulk(false);
      if (res.success) {
        setBulkText('');
        setActiveTab('orders');
      } else {
        setBulkError(res.message);
      }
    }, 800);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-cyan-500 fill-cyan-500" />
            <span>{isAr ? 'إنشاء وتوجيه طلب جديد' : 'New Instant Order'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {isAr
              ? 'اختر الخدمة المستهدفة، حدد الرابط والكمية، وابدأ تنفيذ حملتك فوراً مع ضمان التعويض التلقائي.'
              : 'Deploy immediate social media growth with real-time server allocation and auto-refill guarantees.'}
          </p>
        </div>

        {/* Tab Switcher: Single vs Bulk */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-200/80 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 self-start sm:self-auto shadow-xs">
          <button
            type="button"
            onClick={() => setOrderMode('single')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              orderMode === 'single'
                ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isAr ? 'طلب فردي سريع' : 'Single Order'}</span>
          </button>
          <button
            type="button"
            onClick={() => setOrderMode('bulk')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              orderMode === 'bulk'
                ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>{isAr ? 'طلب متعدد / جماعي (Mass Order)' : 'Mass Orders'}</span>
          </button>
        </div>
      </div>

      {/* SINGLE ORDER VIEW */}
      {orderMode === 'single' && (
        <form onSubmit={handleSubmitSingleOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left 2 Columns: Order Form Controls */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Platform Selector Chips */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
              <label htmlFor={platformId} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Layers className="w-4 h-4 text-cyan-500" />
                <span>{isAr ? '1. اختر المنصة المستهدفة' : '1. Target Platform'}</span>
              </label>

              <div className="flex flex-wrap gap-2 pt-1">
                {platforms.map((p) => {
                  const isSelected = selectedPlatform === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePlatformChange(p.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25 ring-2 ring-cyan-500/30'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{isAr ? p.labelAr : p.labelEn}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Service Selection & Details */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor={serviceSelectId} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Sparkles className="w-4 h-4 text-cyan-500" />
                  <span>{isAr ? '2. اختيار الخدمة والسعر' : '2. Service Selection'}</span>
                </label>
                
                {/* Favorite Toggle Button */}
                {currentService && (
                  <button
                    type="button"
                    onClick={() => toggleFavoriteService(currentService.id)}
                    className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                      isFavorite
                        ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-amber-500'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-500 text-amber-500' : ''}`} />
                    <span>{isFavorite ? (isAr ? 'في المفضلة' : 'Favorited') : (isAr ? 'إضافة للمفضلة' : 'Favorite')}</span>
                  </button>
                )}
              </div>

              <select
                id={serviceSelectId}
                value={currentService?.id || ''}
                onChange={(e) => {
                  setSelectedServiceId(e.target.value);
                  const s = services.find((srv) => srv.id === e.target.value);
                  if (s) setQuantity(Math.max(s.min, 1000));
                }}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {filteredServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.id}] {isAr ? s.nameAr : s.nameEn} — ${s.ratePer1000.toFixed(2)}/1k
                  </option>
                ))}
              </select>

              {/* Selected Service Features Info */}
              {currentService && (
                <div className="p-4 rounded-2xl bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200/50 dark:border-cyan-800/40 text-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {isAr ? currentService.nameAr : currentService.nameEn}
                    </span>
                    <span className="font-mono font-black text-cyan-600 dark:text-cyan-400 text-sm">
                      ${currentService.ratePer1000.toFixed(2)} / 1,000
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isAr ? currentService.descriptionAr : currentService.descriptionEn}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    <span>{isAr ? 'الحد الأدنى:' : 'Min:'} {(currentService.min ?? 0).toLocaleString()}</span>
                    <span>•</span>
                    <span>{isAr ? 'الحد الأقصى:' : 'Max:'} {(currentService.max ?? 0).toLocaleString()}</span>
                    <span>•</span>
                    <span className="text-emerald-500 font-sans font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{isAr ? currentService.avgTimeAr : currentService.avgTimeEn}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Target Link Input */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-2">
              <label htmlFor={targetLinkId} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Link2 className="w-4 h-4 text-cyan-500" />
                <span>{isAr ? '3. رابط الحساب أو المنشور المستهدف' : '3. Target Profile / Post URL'}</span>
              </label>
              <input
                id={targetLinkId}
                type="url"
                required
                placeholder="https://instagram.com/p/..."
                value={targetLink}
                onChange={(e) => setTargetLink(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 font-mono text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <span className="text-[11px] text-slate-400 block">
                {isAr ? 'تأكد أن الحساب عام (Public) وليس خاصاً أثناء التنفيذ' : 'Ensure profile is set to Public during delivery'}
              </span>
            </div>

            {/* 4. Quantity Input & Quick Chips */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
              <label htmlFor={quantityInputId} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <DollarSign className="w-4 h-4 text-cyan-500" />
                <span>{isAr ? '4. الكمية المطلوبة' : '4. Required Quantity'}</span>
              </label>

              <div className="flex items-center gap-3">
                <input
                  id={quantityInputId}
                  type="number"
                  required
                  min={currentService?.min || 100}
                  max={currentService?.max || 500000}
                  step="100"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 font-mono text-lg font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Quick Qty Shortcuts */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[500, 1000, 2500, 5000, 10000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickQty(amt)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    +{(amt || 0).toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Delivery Mode (Instant vs Natural Gradual - Strictly NO Drip Feed) */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Sliders className="w-4 h-4 text-cyan-500" />
                <span>{isAr ? '5. نمط وسرعة التنفيذ' : '5. Delivery Speed'}</span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSpeedMode('instant')}
                  className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                    speedMode === 'instant'
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 ring-2 ring-cyan-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Zap className="w-5 h-5 mb-1.5 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-bold">{isAr ? 'فوري فائق السرعة' : 'Instant Turbo'}</span>
                  <span className="text-[10px] opacity-75">{isAr ? 'بدء فوري خلال ثوانٍ' : 'Immediate server burst'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSpeedMode('gradual')}
                  className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                    speedMode === 'gradual'
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 ring-2 ring-cyan-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Clock className="w-5 h-5 mb-1.5 text-emerald-500" />
                  <span className="text-xs font-bold">{isAr ? 'تدريجي طبيعي آمن' : 'Natural Organic'}</span>
                  <span className="text-[10px] opacity-75">{isAr ? 'محاكاة التفاعل الطبيعي' : 'Smooth safe delivery'}</span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Right Column: Order Summary, Coupon & Checkout */}
          <div className="space-y-5">
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm sticky top-24 space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span>{isAr ? 'ملخص الحساب والتكلفة' : 'Order Total & Checkout'}</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </h3>

              {/* Coupon Code Section */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-purple-500" />
                  <span>{isAr ? 'هل لديك كود خصم أو برومو كود؟' : 'Have a Promo / Coupon Code?'}</span>
                </span>

                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{appliedCoupon.code} (-{appliedCoupon.discountPercent}%)</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder={isAr ? 'مثال: VIP25' : 'e.g. VIP25'}
                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-white uppercase focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors cursor-pointer"
                      >
                        {isAr ? 'تطبيق' : 'Apply'}
                      </button>
                    </div>
                    {couponError && (
                      <span className="text-[10px] text-rose-500 font-bold block">{couponError}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2.5 text-xs border-y border-slate-100 dark:border-slate-800/80 py-3">
                <div className="flex justify-between text-slate-500">
                  <span>{isAr ? 'السعر الأساسي:' : 'Subtotal:'}</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">${rawCharge.toFixed(2)}</span>
                </div>

                {userCustomDiscount > 0 && (
                  <div className="flex justify-between text-purple-600 dark:text-purple-400 font-bold">
                    <span>{isAr ? `خصم رتبتك الخاص (${userCustomDiscount}%):` : `Custom Rank Discount (${userCustomDiscount}%):`}</span>
                    <span className="font-mono">-${customDiscountSavings.toFixed(2)}</span>
                  </div>
                )}

                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                    <span>{isAr ? `كوبون الخصم (${appliedCoupon.discountPercent}%):` : `Coupon (${appliedCoupon.discountPercent}%):`}</span>
                    <span className="font-mono">-${couponSavings.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>{isAr ? 'الإجمالي المطلوب:' : 'Final Charge:'}</span>
                  <span className="font-mono text-cyan-600 dark:text-cyan-400 text-lg">
                    ${finalCalculatedCharge.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Balance Assessment */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>{isAr ? 'رصيد محفظتك:' : 'Your Balance:'}</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">${userStats.balance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>{isAr ? 'المتبقي بعد الطلب:' : 'Remaining:'}</span>
                  <span className={`font-mono font-bold ${userStats.balance >= finalCalculatedCharge ? 'text-emerald-500' : 'text-rose-500'}`}>
                    ${(userStats.balance - finalCalculatedCharge).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>{isAr ? 'جاري التحقق وتعيين السيرفر...' : 'Processing...'}</span>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-white" />
                      <span>{isAr ? 'تأكيد وبدء الطلب فوراً' : 'Place Instant Order'}</span>
                    </>
                  )}
                </button>

                {userStats.balance < finalCalculatedCharge && (
                  <button
                    type="button"
                    onClick={() => setIsAddFundsModalOpen(true)}
                    className="w-full py-2.5 rounded-xl font-bold text-xs text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors cursor-pointer"
                  >
                    {isAr ? '💳 شحن المحفظة لتغطية التكلفة' : '💳 Deposit to cover order'}
                  </button>
                )}
              </div>

              {/* Guarantee points */}
              <div className="pt-2 space-y-1.5 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{isAr ? 'ضمان أمان 100% وحماية الحساب' : '100% Safe & Protected'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>{isAr ? 'تعويض تلقائي ضد أي نقص' : 'Auto-Refill Guarantee'}</span>
                </div>
              </div>

            </div>
          </div>

        </form>
      )}

      {/* BULK / MASS ORDER VIEW */}
      {orderMode === 'bulk' && (
        <form onSubmit={handleSubmitBulkOrders} className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <ListOrdered className="w-5 h-5 text-cyan-500" />
                  <span>{isAr ? 'إرسال طلبات متعددة دفعة واحدة (Mass Order)' : 'Mass Orders Multi-line Submission'}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isAr
                    ? 'أدخل سطراً واحداً لكل طلب بالصيغة: [رقم الخدمة | الرابط | الكمية]'
                    : 'Enter 1 order per line formatted as: service_id | target_link | quantity'}
                </p>
              </div>

              {/* Format pill helper */}
              <span className="font-mono text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 self-start">
                service_id | link | quantity
              </span>
            </div>

            {/* Mass Order Textarea */}
            <div>
              <textarea
                rows={7}
                required
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={
                  `SRV-101 | https://instagram.com/myprofile | 1000\nSRV-201 | https://tiktok.com/@myuser | 2500\nSRV-301 | https://youtube.com/watch?v=xyz | 1000`
                }
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 font-mono text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Live Parsing Table Preview */}
            {parsedBulk.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'معاينة الطلبات والتحقق من الأسعار:' : 'Parsed Orders Preview:'}
                  </span>
                  <span className="font-mono text-slate-400">
                    {validBulkOrders.length} / {parsedBulk.length} {isAr ? 'طلب صالح' : 'valid lines'}
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden text-xs">
                  <table className="w-full text-right">
                    <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 font-bold text-[10px] border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3 text-center">#</th>
                        <th className="p-3">{isAr ? 'الخدمة' : 'Service'}</th>
                        <th className="p-3">{isAr ? 'الرابط' : 'Link'}</th>
                        <th className="p-3 text-center">{isAr ? 'الكمية' : 'Qty'}</th>
                        <th className="p-3 text-center">{isAr ? 'التكلفة' : 'Cost'}</th>
                        <th className="p-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {parsedBulk.map((p) => (
                        <tr key={p.lineNumber} className={p.valid ? '' : 'bg-rose-500/5'}>
                          <td className="p-3 text-center font-mono font-bold text-slate-400">{p.lineNumber}</td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">
                            {p.service ? (isAr ? p.service.nameAr : p.service.nameEn) : p.serviceId}
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-500 truncate max-w-xs">{p.link}</td>
                          <td className="p-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">{(p.quantity ?? 0).toLocaleString()}</td>
                          <td className="p-3 text-center font-mono font-black text-emerald-500">
                            ${p.charge.toFixed(3)}
                          </td>
                          <td className="p-3 text-start">
                            {p.valid ? (
                              <span className="text-emerald-500 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{isAr ? 'صالح' : 'Valid'}</span>
                              </span>
                            ) : (
                              <span className="text-rose-500 font-bold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>{p.error}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bulk Summary & Submit Card */}
                <div className="p-4 rounded-2xl bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-200/50 dark:border-cyan-800/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-start">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {isAr ? 'إجمالي تكلفة الطلبات الصالحة:' : 'Total Bulk Charge:'}
                    </div>
                    <div className="text-2xl font-black font-mono text-cyan-600 dark:text-cyan-400">
                      ${totalBulkCharge.toFixed(2)} USD
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {userStats.balance < totalBulkCharge && (
                      <button
                        type="button"
                        onClick={() => setIsAddFundsModalOpen(true)}
                        className="px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-bold text-xs"
                      >
                        {isAr ? 'شحن المحفظة' : 'Deposit'}
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSubmittingBulk || validBulkOrders.length === 0 || hasInvalidBulk}
                      className="flex-1 sm:flex-initial px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-white font-black text-xs shadow-lg shadow-cyan-500/25 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4 fill-white" />
                      <span>
                        {isSubmittingBulk
                          ? (isAr ? 'جاري تنفيذ الطلبات...' : 'Processing...')
                          : (isAr ? `تأكيد وإرسال ${validBulkOrders.length} طلبات الآن` : `Submit ${validBulkOrders.length} Orders`)}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {bulkError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bulkError}</span>
              </div>
            )}
          </div>
        </form>
      )}

    </div>
  );
};
