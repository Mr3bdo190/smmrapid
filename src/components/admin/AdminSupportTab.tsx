import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  MessageSquare,
  LifeBuoy,
  Send,
  User,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  CornerDownLeft,
  Sparkles
} from 'lucide-react';

export const AdminSupportTab: React.FC = () => {
  const {
    language,
    chatMessages,
    adminReplyChat,
    tickets,
    replyToTicket,
    adminResolveTicket
  } = useApp();

  const isAr = language === 'ar';

  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'tickets'>('chat');
  const [chatInput, setChatInput] = useState('');

  // Ticket reply state
  const [selectedTicketId, setSelectedTicketId] = useState<string>(tickets[0]?.id || '');
  const [ticketReplyText, setTicketReplyText] = useState('');

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    adminReplyChat(chatInput.trim());
    setChatInput('');
  };

  const handleReplyTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !ticketReplyText.trim()) return;

    replyToTicket(selectedTicket.id, ticketReplyText.trim());
    setTicketReplyText('');
  };

  const quickCannedReplies = [
    isAr ? 'تم مراجعة طلبك وتنشيط الخادم فوراً، ستلاحظ زيادة العداد خلال دقائق.' : 'Your order has been reviewed and server dispatched. Counts will reflect shortly.',
    isAr ? 'يرجى التأكد من أن حساب السوشيال ميديا عام (Public) وليس خاص (Private).' : 'Please make sure your account privacy is set to Public.',
    isAr ? 'تم استلام تحويل الكاش وإضافة الرصيد إلى محفظتك بنجاح مع البونص.' : 'Funds verified and successfully added to your wallet with bonus.'
  ];

  return (
    <div className="space-y-6">
      
      {/* Header & Sub-tab switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-500" />
            <span>{isAr ? 'إدارة المحادثات الحية وتذاكر الدعم' : 'Live Chat & Support Operations'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {isAr
              ? 'الرد على استفسارات العملاء في الشات المباشر، ومتابعة تذاكر الدعم وحل المشكلات.'
              : 'Interact directly with clients in real-time chat and resolve priority support tickets.'}
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center p-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <button
            onClick={() => setActiveSubTab('chat')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'chat'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{isAr ? 'الشات المباشر' : 'Live Chat'}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          <button
            onClick={() => setActiveSubTab('tickets')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'tickets'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LifeBuoy className="w-4 h-4" />
            <span>{isAr ? 'تذاكر الدعم' : 'Tickets'}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px]">
              {tickets.length}
            </span>
          </button>
        </div>
      </div>

      {/* Sub-tab 1: Live Chat Responder */}
      {activeSubTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Chat Box */}
          <div className="lg:col-span-2 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col h-[520px] overflow-hidden">
            
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">
                    {isAr ? 'قناة الدعم والمحادثة المباشرة مع العملاء' : 'Client Live Chat Broadcast Channel'}
                  </div>
                  <span className="text-[11px] text-emerald-500 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    {isAr ? 'أنت تتحدث الآن بصفتك مشرف الإدارة (Admin Agent)' : 'Speaking as Verified Platform Admin'}
                  </span>
                </div>
              </div>
            </div>

            {/* Chat Messages Stream */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {chatMessages.map((msg) => {
                const isAdminMsg = msg.sender === 'agent';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAdminMsg ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                      <span className="font-bold">
                        {isAdminMsg
                          ? (isAr ? 'مشرف الدعم (أنت)' : 'Admin (You)')
                          : (isAr ? 'العميل' : 'Client')}
                      </span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <div
                      className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isAdminMsg
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-te-none shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-ts-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chat Input Form */}
            <form onSubmit={handleSendChat} className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={isAr ? 'اكتب رد الإدارة الرسمي هنا...' : 'Type official admin reply...'}
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs shadow-md shadow-emerald-500/25 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{isAr ? 'إرسال' : 'Send'}</span>
              </button>
            </form>

          </div>

          {/* Right: Quick Canned Replies */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{isAr ? 'ردود سريعة جاهزة (Canned Replies)' : 'Canned Admin Replies'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr ? 'انقر على أي رد لنسخه وإدراجه في حقل الرد فوراً:' : 'Click any response to quickly populate the chat input:'}
            </p>

            <div className="space-y-2">
              {quickCannedReplies.map((reply, idx) => (
                <button
                  key={idx}
                  onClick={() => setChatInput(reply)}
                  className="w-full text-left p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 text-xs text-slate-700 dark:text-slate-300 leading-relaxed transition-all cursor-pointer"
                >
                  "{reply}"
                </button>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Sub-tab 2: Support Tickets Management */}
      {activeSubTab === 'tickets' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Tickets List Column */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-4 space-y-3">
            <h3 className="font-black text-sm text-slate-900 dark:text-white px-2">
              {isAr ? `تذاكر الدعم الواردة (${tickets.length})` : `Incoming Tickets (${tickets.length})`}
            </h3>

            <div className="space-y-2 max-h-[460px] overflow-y-auto">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicketId(t.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    selectedTicket?.id === t.id
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-500'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-mono font-bold text-slate-400">#{t.id}</span>
                    <span
                      className={`font-black px-2 py-0.5 rounded-full text-[10px] ${
                        t.status === 'answered'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : t.status === 'closed'
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                          : 'bg-amber-500/10 text-amber-500'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>

                  <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {t.subject}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                    <span>{isAr ? 'الأولوية: ' : 'Priority: '}{t.priority}</span>
                    <span>{t.createdAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ticket Detail & Answer Box */}
          <div className="lg:col-span-2 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-6 flex flex-col justify-between space-y-4">
            {selectedTicket ? (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs text-slate-400">#{selectedTicket.id}</span>
                        <h3 className="font-black text-base text-slate-900 dark:text-white">
                          {selectedTicket.subject}
                        </h3>
                      </div>
                      {selectedTicket.orderId && (
                        <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 mt-1 block">
                          {isAr ? 'الطلب المرتبط: ' : 'Related Order: '}#{selectedTicket.orderId}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => adminResolveTicket(selectedTicket.id)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        {isAr ? 'إغلاق التذكرة' : 'Close Ticket'}
                      </button>
                    </div>
                  </div>

                  {/* Ticket Messages History */}
                  <div className="space-y-3 max-h-72 overflow-y-auto">
                    {selectedTicket.messages.map((m, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl text-xs space-y-1 ${
                          m.sender === 'agent'
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 text-slate-900 dark:text-white'
                            : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                          <span>{m.sender === 'agent' ? (isAr ? 'فريق الدعم الفني' : 'Support Team') : (isAr ? 'العميل' : 'Client')}</span>
                          <span>{m.timestamp}</span>
                        </div>
                        <p className="leading-relaxed">{m.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reply Form */}
                <form onSubmit={handleReplyTicket} className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <textarea
                    required
                    rows={3}
                    value={ticketReplyText}
                    onChange={(e) => setTicketReplyText(e.target.value)}
                    placeholder={isAr ? 'اكتب رد الدعم الفني لحل تذكرة العميل...' : 'Type response to client ticket...'}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => adminResolveTicket(selectedTicket.id)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500/20 text-slate-700 dark:text-slate-300 hover:text-emerald-500 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{isAr ? 'إغلاق التذكرة كمحلولة' : 'Mark as Resolved'}</span>
                    </button>

                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-md shadow-indigo-600/25 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isAr ? 'إرسال الرد وحفظ التذكرة' : 'Send Ticket Reply'}</span>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs">
                {isAr ? 'اختر تذكرة لعرض التفاصيل والرد عليها' : 'Select a ticket to view and reply'}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
