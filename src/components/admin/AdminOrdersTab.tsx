import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { OrderItem } from '../../types';
import {
  ShoppingCart,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  RotateCcw,
  ExternalLink,
  Edit2,
  AlertTriangle,
  X,
  FileText,
  DollarSign,
  Copy,
  Check,
  Zap,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { PlatformBadge } from '../PlatformBadge';

export const AdminOrdersTab: React.FC = () => {
  const {
    language,
    orders,
    adminUpdateOrderStatus,
    adminRefundOrder,
    adminUpdateOrderDetails
  } = useApp();

  const isAr = language === 'ar';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Edit Order Modal State
  const [editingOrder, setEditingOrder] = useState<OrderItem | null>(null);
  const [editLink, setEditLink] = useState('');
  const [editStartCount, setEditStartCount] = useState<number>(0);
  const [editCurrentCount, setEditCurrentCount] = useState<number>(0);
  const [editRemains, setEditRemains] = useState<number>(0);

  // View Logs Modal State
  const [viewingLogsOrder, setViewingLogsOrder] = useState<OrderItem | null>(null);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.serviceNameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.serviceNameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.link.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesPlatform = platformFilter === 'all' || order.platform === platformFilter;

    return matchesSearch && matchesStatus && matchesPlatform;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenEdit = (order: OrderItem) => {
    setEditingOrder(order);
    setEditLink(order.link);
    setEditStartCount(order.startCount);
    setEditCurrentCount(order.currentCount);
    setEditRemains(order.remains ?? Math.max(0, order.quantity - (order.currentCount - order.startCount)));
  };

  const handleSaveOrderEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    adminUpdateOrderDetails(editingOrder.id, {
      link: editLink.trim(),
      startCount: Number(editStartCount),
      currentCount: Number(editCurrentCount),
      remains: Number(editRemains)
    });

    setEditingOrder(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-cyan-500" />
            <span>{isAr ? 'إدارة وتحكم الطلبات وسير العمل' : 'Order Lifecycle & Execution Control'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {isAr
              ? 'متابعة كافة طلبات المنصة، تعديل الروابط والعدادات، تغيير الحالات، واسترجاع الرصيد للمحفظة في حال الخطأ.'
              : 'Oversight of client orders, modify target URLs, override counters, change statuses, and process refunds.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {isAr ? `إجمالي الطلبات: ${orders.length}` : `Total Orders: ${orders.length}`}
          </span>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-3" />
          <input
            type="text"
            placeholder={isAr ? 'بحث برقم الطلب، اسم الخدمة، أو رابط الحساب...' : 'Search by order ID, service, or URL...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl ps-10 pe-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">{isAr ? 'جميع الحالات' : 'All Status'}</option>
            <option value="in_progress">{isAr ? 'قيد التنفيذ' : 'In Progress'}</option>
            <option value="pending">{isAr ? 'معلق / قيد الانتظار' : 'Pending'}</option>
            <option value="processing">{isAr ? 'جاري المعالجة' : 'Processing'}</option>
            <option value="completed">{isAr ? 'مكتمل' : 'Completed'}</option>
            <option value="canceled">{isAr ? 'ملغي' : 'Canceled'}</option>
          </select>

          {/* Platform */}
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">{isAr ? 'جميع المنصات' : 'All Platforms'}</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube</option>
            <option value="telegram">Telegram</option>
            <option value="facebook">Facebook</option>
            <option value="twitter">X / Twitter</option>
          </select>
        </div>

      </div>

      {/* Orders Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-extrabold">
              <tr>
                <th className="p-4">{isAr ? 'كود الطلب والمنصة' : 'Order ID & Platform'}</th>
                <th className="p-4">{isAr ? 'الخدمة والرابط المستهدف' : 'Service & Target'}</th>
                <th className="p-4">{isAr ? 'الكمية والعداد' : 'Progress'}</th>
                <th className="p-4">{isAr ? 'التكلفة' : 'Charge'}</th>
                <th className="p-4">{isAr ? 'الحالة الحالية' : 'Status'}</th>
                <th className="p-4 text-center">{isAr ? 'التحكم والإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    {isAr ? 'لا توجد طلبات تطابق الفلترة المحددة' : 'No orders found'}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const progressPct = order.quantity > 0 ? Math.min(100, Math.round((order.currentCount / order.quantity) * 100)) : 100;
                  
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* ID & Platform */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 dark:text-white">
                            <span>#{order.id}</span>
                            <button
                              onClick={() => handleCopy(order.id, order.id)}
                              className="text-slate-400 hover:text-cyan-500"
                              title="Copy ID"
                            >
                              {copiedId === order.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                          <PlatformBadge platform={order.platform} />
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {order.createdAt}
                          </span>
                        </div>
                      </td>

                      {/* Service & Link */}
                      <td className="p-4 max-w-xs">
                        <div className="space-y-1">
                          <span className="font-bold text-slate-900 dark:text-white block line-clamp-1">
                            {isAr ? order.serviceNameAr : order.serviceNameEn}
                          </span>
                          <div className="flex items-center gap-1 text-[11px] font-mono text-cyan-600 dark:text-cyan-400 truncate">
                            <span className="truncate">{order.link}</span>
                            <button
                              onClick={() => handleCopy(order.link, order.id + '-link')}
                              className="text-slate-400 hover:text-cyan-500 shrink-0"
                              title="Copy Link"
                            >
                              {copiedId === order.id + '-link' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                          {order.speedMode && (
                            <span className="text-[10px] text-slate-400">
                              {isAr ? 'النمط: ' : 'Mode: '}{order.speedMode}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Progress */}
                      <td className="p-4">
                        <div className="space-y-1 min-w-[120px]">
                          <div className="flex justify-between font-mono text-[11px]">
                            <span>{(order.currentCount ?? 0).toLocaleString()} / {(order.quantity ?? 0).toLocaleString()}</span>
                            <span className="font-bold text-cyan-600 dark:text-cyan-400">{progressPct}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-cyan-500 rounded-full transition-all"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>{isAr ? 'البدء: ' : 'Start: '}{order.startCount}</span>
                            <span>{isAr ? 'المتبقي: ' : 'Remains: '}{order.remains ?? Math.max(0, order.quantity - (order.currentCount - order.startCount))}</span>
                          </div>
                        </div>
                      </td>

                      {/* Charge */}
                      <td className="p-4 font-mono font-black text-slate-900 dark:text-white text-sm">
                        ${order.charge.toFixed(2)}
                      </td>

                      {/* Status Override */}
                      <td className="p-4">
                        <select
                          value={order.status}
                          onChange={(e) => adminUpdateOrderStatus(order.id, e.target.value as any)}
                          className={`text-[10px] font-black rounded-lg px-2.5 py-1.5 border cursor-pointer ${
                            order.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                              : order.status === 'in_progress'
                              ? 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30'
                              : order.status === 'canceled'
                              ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                          }`}
                        >
                          <option value="pending">{isAr ? 'معلق (Pending)' : 'Pending'}</option>
                          <option value="in_progress">{isAr ? 'قيد التنفيذ (In Progress)' : 'In Progress'}</option>
                          <option value="completed">{isAr ? 'مكتمل (Completed)' : 'Completed'}</option>
                          <option value="canceled">{isAr ? 'ملغي (Canceled)' : 'Canceled'}</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Edit Details */}
                          <button
                            onClick={() => handleOpenEdit(order)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:text-cyan-500 text-slate-500 dark:text-slate-400 transition-colors"
                            title={isAr ? 'تعديل الرابط والعدادات' : 'Edit Order Details'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* View Logs */}
                          <button
                            onClick={() => setViewingLogsOrder(order)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:text-blue-500 text-slate-500 dark:text-slate-400 transition-colors"
                            title={isAr ? 'سجل أحداث الخادم' : 'Server Logs'}
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* Refund to client wallet */}
                          {order.status !== 'canceled' && (
                            <button
                              onClick={() => {
                                if (window.confirm(isAr ? `إلغاء الطلب #${order.id} وإرجاع $${order.charge.toFixed(2)} لمحفظة العميل؟` : `Refund $${order.charge.toFixed(2)} for #${order.id}?`)) {
                                  adminRefundOrder(order.id);
                                }
                              }}
                              className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold text-[11px] transition-colors"
                              title={isAr ? 'إلغاء واسترجاع الرصيد' : 'Refund'}
                            >
                              {isAr ? 'إلغاء واسترجاع' : 'Refund'}
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-cyan-500" />
                <span>{isAr ? `تعديل بيانات الطلب #${editingOrder.id}` : `Edit Order #${editingOrder.id}`}</span>
              </h3>
              <button
                onClick={() => setEditingOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOrderEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {isAr ? 'الرابط المستهدف:' : 'Target Link / URL:'}
                </label>
                <input
                  type="text"
                  required
                  value={editLink}
                  onChange={(e) => setEditLink(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isAr ? 'عداد البدء:' : 'Start Count:'}
                  </label>
                  <input
                    type="number"
                    value={editStartCount}
                    onChange={(e) => setEditStartCount(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isAr ? 'المنجز حالياً:' : 'Current:'}
                  </label>
                  <input
                    type="number"
                    value={editCurrentCount}
                    onChange={(e) => setEditCurrentCount(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isAr ? 'المتبقي:' : 'Remains:'}
                  </label>
                  <input
                    type="number"
                    value={editRemains}
                    onChange={(e) => setEditRemains(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black shadow-md shadow-cyan-500/25"
                >
                  {isAr ? 'حفظ التعديلات' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Viewing Logs Modal */}
      {viewingLogsOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <span>{isAr ? `سجل خوادم التنفيذ للطلب #${viewingLogsOrder.id}` : `Server Logs for #${viewingLogsOrder.id}`}</span>
              </h3>
              <button
                onClick={() => setViewingLogsOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {viewingLogsOrder.logs.map((log, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs flex items-start gap-2">
                  <span className="font-mono text-cyan-500 font-bold shrink-0">{log.timestamp}</span>
                  <span className="text-slate-700 dark:text-slate-300">{isAr ? log.messageAr : log.messageEn}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setViewingLogsOrder(null)}
              className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
