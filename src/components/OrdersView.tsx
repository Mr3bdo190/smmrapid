import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PlatformBadge } from './PlatformBadge';
import { OrderItem, OrderStatus } from '../types';
import {
  Search,
  RotateCcw,
  Star,
  ExternalLink,
  Activity,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  PlusCircle,
  FileText
} from 'lucide-react';

interface OrdersViewProps {
  onOpenRating: (orderId: string) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ onOpenRating }) => {
  const {
    orders,
    language,
    refillOrder,
    cancelOrder,
    setTrackingOrderId,
    setActiveTab,
    openInvoiceForOrder
  } = useApp();

  const isAr = language === 'ar';

  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchId = order.id.toLowerCase().includes(term);
      const matchService = (order.serviceNameAr + ' ' + order.serviceNameEn).toLowerCase().includes(term);
      const matchLink = order.link.toLowerCase().includes(term);
      return matchId || matchService || matchLink;
    }
    return true;
  });

  const getStatusBadge = (order: OrderItem) => {
    switch (order.status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isAr ? 'مكتمل 100%' : 'Completed'}
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 animate-pulse">
            <Activity className="w-3.5 h-3.5" />
            {isAr ? `قيد الإرسال (${order.progressPercentage}%)` : `Delivering (${order.progressPercentage}%)`}
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            {isAr ? 'قيد الانتظار' : 'Pending'}
          </span>
        );
      case 'canceled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" />
            {isAr ? 'ملغي ومسترد' : 'Canceled'}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-400">
            {order.status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {isAr ? 'سجل الطلبات والتتبع اللحظي' : 'Orders History & Live Tracking'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? 'تتبع حالة طلباتك بدقة ثانية بثانية، واطلب إعادة التعبئة أو تقييم الخدمة المنجزة.'
              : 'Monitor real-time delivery progress, request auto-refill, or rate completed services.'}
          </p>
        </div>

        <button
          onClick={() => setActiveTab('new_order')}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-500/25 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{isAr ? 'طلب جديد الآن' : 'New Order'}</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', labelAr: 'الكل', labelEn: 'All' },
            { id: 'in_progress', labelAr: 'قيد التنفيذ', labelEn: 'In Progress' },
            { id: 'completed', labelAr: 'المكتملة', labelEn: 'Completed' },
            { id: 'pending', labelAr: 'قيد الانتظار', labelEn: 'Pending' },
            { id: 'canceled', labelAr: 'الملغية', labelEn: 'Canceled' }
          ].map((st) => {
            const isSelected = statusFilter === st.id;
            return (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id as any)}
                className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                {isAr ? st.labelAr : st.labelEn}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isAr ? 'بحث برقم الطلب أو الرابط...' : 'Search by ID or link...'}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl ps-9 pe-4 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
        </div>
      </div>

      {/* Orders List / Cards */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
            {isAr ? 'لا توجد طلبات تطابق هذا البحث' : 'No orders found'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {isAr
              ? 'يمكنك إنشاء طلبك الأول لزيادة المتابعين والتفاعل بأسعار منافسة وسرعة فائقة.'
              : 'You can create your first order now and experience high speed growth.'}
          </p>
          <button
            onClick={() => setActiveTab('new_order')}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors"
          >
            {isAr ? 'إنشاء طلب جديد' : 'Place an Order'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isCompleted = order.status === 'completed';
            const isInProgress = order.status === 'in_progress';
            const isPending = order.status === 'pending';

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-cyan-500/30 transition-all space-y-4"
              >
                
                {/* Row 1: Platform, ID, Service Name, Status Badge, Charge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <PlatformBadge platform={order.platform} size="sm" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded">
                          #{order.id}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {order.createdAt}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5 leading-snug">
                        {isAr ? order.serviceNameAr : order.serviceNameEn}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center">
                    {getStatusBadge(order)}
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white font-mono">
                      ${order.charge.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Row 2: Target Link & Progress Bar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  
                  {/* Target Link */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 font-semibold shrink-0">
                      {isAr ? 'الرابط المستهدف:' : 'Target URL:'}
                    </span>
                    <a
                      href={order.link}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-mono text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 truncate"
                    >
                      <span className="truncate">{order.link}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>

                  {/* Quantity & Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-500 dark:text-slate-400">
                        {isAr ? 'التقدم:' : 'Progress:'}{' '}
                        <strong className="text-slate-900 dark:text-white">
                          {(order.currentCount ?? 0).toLocaleString()}
                        </strong>{' '}
                        / {(order.targetCount ?? order.quantity ?? 0).toLocaleString()}
                      </span>
                      <span className="font-bold text-cyan-600 dark:text-cyan-400">
                        {order.progressPercentage}%
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
                        style={{ width: `${order.progressPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Row 3: Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTrackingOrderId(order.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-100 font-bold border border-cyan-200 dark:border-cyan-800/60 transition-colors"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>{isAr ? 'تتبع لحظي مباشر' : 'Live Track'}</span>
                    </button>

                    <button
                      onClick={() => refillOrder(order.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 font-semibold transition-colors"
                      title={isAr ? 'طلب إعادة التعبئة مجاناً' : 'Request Free Refill'}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{isAr ? 'إعادة تعبئة' : 'Refill'}</span>
                    </button>

                    <button
                      onClick={() => openInvoiceForOrder(order)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-semibold transition-colors cursor-pointer"
                      title={isAr ? 'عرض وطباعة الفاتورة الضريبية الرسمية' : 'View Tax Invoice'}
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      <span>{isAr ? 'الفاتورة' : 'Invoice'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Rate Button if Completed */}
                    {isCompleted && (
                      order.rated ? (
                        <span className="flex items-center gap-1 text-amber-500 font-bold px-2.5 py-1 bg-amber-500/10 rounded-lg">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{order.ratingScore}/5 ({isAr ? 'تم تقييمك' : 'Rated'})</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => onOpenRating(order.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-sm shadow-amber-500/20 transition-all"
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{isAr ? 'تقييم الطلب ⭐' : 'Rate Order ⭐'}</span>
                        </button>
                      )
                    )}

                    {/* Cancel Button if Pending */}
                    {isPending && (
                      <button
                        onClick={() => cancelOrder(order.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{isAr ? 'إلغاء واسترجاع' : 'Cancel & Refund'}</span>
                      </button>
                    )}
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
