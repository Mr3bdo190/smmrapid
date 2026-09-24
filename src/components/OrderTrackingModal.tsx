import React from 'react';
import { useApp } from '../context/AppContext';
import { PlatformBadge } from './PlatformBadge';
import {
  X,
  Zap,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  Star,
  Activity,
  Server
} from 'lucide-react';

interface OrderTrackingModalProps {
  orderId: string;
  onClose: () => void;
  onOpenRating?: () => void;
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  orderId,
  onClose,
  onOpenRating
}) => {
  const { orders, language, refillOrder } = useApp();
  const isAr = language === 'ar';

  const order = orders.find((o) => o.id === orderId);

  if (!order) return null;

  const isCompleted = order.status === 'completed';
  const isInProgress = order.status === 'in_progress';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
        
        {/* Header */}
        <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <PlatformBadge platform={order.platform} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {isAr ? 'تتبع الطلب لحظة بلحظة' : 'Live Order Tracking'}
                </h3>
                <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded-md">
                  #{order.id}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {isAr ? `تاريخ الإنشاء: ${order.createdAt}` : `Created: ${order.createdAt}`}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Service Title & Target Link */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isAr ? 'الخدمة المستهدفة' : 'Target Service'}
            </h4>
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
              {isAr ? order.serviceNameAr : order.serviceNameEn}
            </p>
            <div className="flex items-center gap-2 pt-1 text-xs">
              <span className="text-slate-400">{isAr ? 'الرابط:' : 'Link:'}</span>
              <a
                href={order.link}
                target="_blank"
                rel="noreferrer noopener"
                className="font-mono text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 truncate max-w-xs"
              >
                <span>{order.link}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          </div>

          {/* Live Progress Bar & Counter Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-500/30 text-white space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span className="font-bold text-sm text-cyan-200">
                  {isAr ? 'حالة الإرسال المباشرة' : 'Live Delivery Status'}
                </span>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                  isCompleted
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 animate-pulse'
                }`}
              >
                {isCompleted
                  ? isAr ? 'مكتمل بنجاح 100%' : '100% Completed'
                  : isAr ? `قيد الإرسال (${order.progressPercentage}%)` : `Delivering (${order.progressPercentage}%)`}
              </span>
            </div>

            {/* Progress Track */}
            <div className="space-y-1.5">
              <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-700"
                  style={{ width: `${order.progressPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>0%</span>
                <span>{order.progressPercentage}% {isAr ? 'منجز' : 'Done'}</span>
                <span>100%</span>
              </div>
            </div>

            {/* Metrics 3-box Grid */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="block text-[11px] text-slate-400">{isAr ? 'العدد الابتدائي' : 'Start Count'}</span>
                <span className="font-mono text-sm font-bold text-slate-300">
                  {(order.startCount ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40">
                <span className="block text-[11px] text-cyan-300 font-semibold">{isAr ? 'العدد الحالي' : 'Current'}</span>
                <span className="font-mono text-sm font-black text-cyan-400">
                  {(order.currentCount ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="block text-[11px] text-slate-400">{isAr ? 'الهدف المطلوب' : 'Target Goal'}</span>
                <span className="font-mono text-sm font-bold text-emerald-400">
                  {(order.targetCount ?? order.quantity ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Stepper Timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isAr ? 'مراحل التنفيذ ومسار الطلب' : 'Execution Pipeline'}
            </h4>

            <div className="space-y-3 relative before:absolute before:inset-0 before:start-3.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              
              {/* Step 1 */}
              <div className="flex items-start gap-3 relative">
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm z-10">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                    {isAr ? '1. تأكيد الطلب وحجز الرصيد' : '1. Order Confirmed & Charge Held'}
                  </h5>
                  <p className="text-[11px] text-slate-500">
                    {isAr ? 'تم التحقق من الرصيد والخصم بنجاح' : 'Balance validated and charge confirmed'}
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 relative">
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm z-10">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                    {isAr ? '2. تخصيص السيرفر الفائق وفحص الرابط' : '2. Ultra Node Allocated & URL Inspected'}
                  </h5>
                  <p className="text-[11px] text-slate-500">
                    {isAr ? 'الحساب عام وصالح لاستقبال التفاعل' : 'Profile verified public and healthy'}
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 relative">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm z-10 ${
                    order.progressPercentage > 10
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                    {isAr ? '3. بدء ضخ التفاعل بمعدل آمن' : '3. Delivery in Progress (Safe Speed)'}
                  </h5>
                  <p className="text-[11px] text-slate-500">
                    {isAr ? 'تغذية الحساب بأمان تام بدون أي مخاطر خوارزمية' : 'Injecting engagement with natural pace'}
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start gap-3 relative">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm z-10 ${
                    isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                    {isAr ? '4. اكتمال الإرسال 100% وبدء فترة الضمان' : '4. 100% Completed & Warranty Active'}
                  </h5>
                  <p className="text-[11px] text-slate-500">
                    {isAr ? 'ضمان إعادة التعبئة متاح عند أي نزول' : 'Refill guarantee active if needed'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Event Logs */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isAr ? 'سجل العمليات المباشر (Live Logs)' : 'Live Server Logs'}
            </h4>
            <div className="max-h-40 overflow-y-auto space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 font-mono text-xs border border-slate-200 dark:border-slate-800">
              {order.logs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                  <span className="text-cyan-600 dark:text-cyan-400 shrink-0">[{log.timestamp}]</span>
                  <span>{isAr ? log.messageAr : log.messageEn}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions: Refill, Rate, Close */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => refillOrder(order.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isAr ? 'طلب إعادة التعبئة مجاناً (Refill)' : 'Request Free Refill'}</span>
            </button>

            <div className="flex items-center gap-2">
              {isCompleted && !order.rated && onOpenRating && (
                <button
                  onClick={onOpenRating}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/20 transition-all"
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{isAr ? 'تقييم الخدمة ⭐' : 'Rate Order ⭐'}</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
