import React, { useState, useId } from 'react';
import { useApp } from '../context/AppContext';
import { FAQS } from '../data/mockData';
import {
  X,
  MessageSquare,
  Ticket,
  HelpCircle,
  Send,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Headphones
} from 'lucide-react';

interface LiveSupportModalProps {
  onClose: () => void;
}

export const LiveSupportModal: React.FC<LiveSupportModalProps> = ({ onClose }) => {
  const {
    language,
    chatMessages,
    sendChatMessage,
    tickets,
    createSupportTicket,
    replyToTicket,
    orders
  } = useApp();

  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<'chat' | 'tickets' | 'faqs'>('chat');
  const [chatInput, setChatInput] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(tickets[0]?.id || null);
  const [ticketReplyText, setTicketReplyText] = useState('');

  // New ticket state
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newOrderId, setNewOrderId] = useState('');
  const [newDetails, setNewDetails] = useState('');

  // Unique IDs for ticket creation form controls
  const subjectId = useId();
  const orderIdField = useId();
  const priorityId = useId();
  const detailsId = useId();

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput);
    setChatInput('');
  };

  const handleQuickQuestion = (q: string) => {
    sendChatMessage(q);
  };

  const handleCreateTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim()) return;
    createSupportTicket(newSubject, newPriority, newOrderId || undefined, newDetails);
    setIsCreatingTicket(false);
    setNewSubject('');
    setNewDetails('');
  };

  const handleSendTicketReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketReplyText.trim() || !selectedTicketId) return;
    replyToTicket(selectedTicketId, ticketReplyText);
    setTicketReplyText('');
  };

  const currentTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full h-[85vh] max-h-[700px] flex flex-col shadow-2xl overflow-hidden relative text-slate-900 dark:text-white">
        
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-950 p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/25">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base">
                  {isAr ? 'مركز الدعم الفني والمساعدة 24/7' : 'Priority Support Center 24/7'}
                </h3>
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {isAr ? 'متاح الآن' : 'Online'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {isAr ? 'متوسط سرعة الرد: أقل من دقيقة' : 'Average Response Time: < 1 min'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2 shrink-0">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'chat'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{isAr ? 'المحادثة المباشرة' : 'Live Chat'}</span>
          </button>

          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'tickets'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>{isAr ? 'تذاكر الدعم الفني' : 'Tickets'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {tickets.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('faqs')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'faqs'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>{isAr ? 'الأسئلة الشائعة (FAQ)' : 'FAQ'}</span>
          </button>
        </div>

        {/* Tab 1: Live Chat */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-950/40">
            {/* Quick Chips */}
            <div className="p-2.5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0">
              <span className="text-slate-400 font-bold shrink-0">{isAr ? 'سؤال سريع:' : 'Quick:'}</span>
              {[
                isAr ? 'أريد تتبع طلبي' : 'Track my order',
                isAr ? 'كيف يتم شحن الرصيد؟' : 'How to deposit?',
                isAr ? 'ما هو ضمان إعادة التعبئة؟' : 'What is refill guarantee?'
              ].map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickQuestion(q)}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-cyan-500 hover:text-white transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {chatMessages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                        isUser
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-be-none'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-sm rounded-bs-none'
                      }`}
                    >
                      <p>{msg.text}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
                  </div>
                );
              })}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendChat} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={isAr ? 'اكتب رسالتك للدعم الفني...' : 'Type your question...'}
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <button
                type="submit"
                className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Support Tickets */}
        {activeTab === 'tickets' && (
          <div className="flex-1 flex flex-col md:flex-row min-h-0">
            {/* Tickets Sidebar */}
            <div className="w-full md:w-60 border-b md:border-b-0 md:border-e border-slate-200 dark:border-slate-800 p-3 space-y-2 overflow-y-auto shrink-0 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">{isAr ? 'التذاكر' : 'Tickets'}</span>
                <button
                  onClick={() => setIsCreatingTicket(!isCreatingTicket)}
                  className="flex items-center gap-1 text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{isAr ? 'فتح تذكرة' : 'New'}</span>
                </button>
              </div>

              {tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTicketId(t.id);
                    setIsCreatingTicket(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all ${
                    selectedTicketId === t.id && !isCreatingTicket
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono">#{t.id}</span>
                    <span className={`font-bold ${t.status === 'answered' ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {t.status}
                    </span>
                  </div>
                  <h5 className="font-bold text-xs truncate mt-1 text-slate-800 dark:text-slate-200">
                    {t.subject}
                  </h5>
                </button>
              ))}
            </div>

            {/* Ticket Content or Create Ticket Form */}
            <div className="flex-1 flex flex-col min-h-0 p-4 overflow-y-auto">
              {isCreatingTicket ? (
                <form onSubmit={handleCreateTicketSubmit} className="space-y-4 max-w-md">
                  <h4 className="font-extrabold text-sm">{isAr ? 'فتح تذكرة دعم فني جديدة' : 'Open Support Ticket'}</h4>
                  
                  <div>
                    <label htmlFor={subjectId} className="block text-xs font-bold text-slate-500 mb-1">{isAr ? 'الموضوع' : 'Subject'}</label>
                    <input
                      id={subjectId}
                      type="text"
                      required
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      placeholder={isAr ? 'مثال: استفسار عن طلب انستغرام...' : 'e.g. Order query...'}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor={orderIdField} className="block text-xs font-bold text-slate-500 mb-1">{isAr ? 'رقم الطلب (اختياري)' : 'Order ID'}</label>
                      <select
                        id={orderIdField}
                        value={newOrderId}
                        onChange={(e) => setNewOrderId(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs"
                      >
                        <option value="">{isAr ? 'بدون طلب محدد' : 'General issue'}</option>
                        {orders.map((o) => (
                          <option key={o.id} value={o.id}>
                            #{o.id} ({o.serviceNameAr.slice(0, 15)}...)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor={priorityId} className="block text-xs font-bold text-slate-500 mb-1">{isAr ? 'درجة الأهمية' : 'Priority'}</label>
                      <select
                        id={priorityId}
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold"
                      >
                        <option value="low">{isAr ? 'منخفضة' : 'Low'}</option>
                        <option value="medium">{isAr ? 'متوسطة' : 'Medium'}</option>
                        <option value="high">{isAr ? 'عالية' : 'High'}</option>
                        <option value="urgent">{isAr ? 'عاجلة جداً' : 'Urgent'}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor={detailsId} className="block text-xs font-bold text-slate-500 mb-1">{isAr ? 'تفاصيل المشكلة أو الاستفسار' : 'Details'}</label>
                    <textarea
                      id={detailsId}
                      rows={4}
                      required
                      value={newDetails}
                      onChange={(e) => setNewDetails(e.target.value)}
                      placeholder={isAr ? 'اشرح بالتفصيل ما الذي ترغب به...' : 'Describe what you need help with...'}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors"
                    >
                      {isAr ? 'إرسال التذكرة الآن' : 'Submit Ticket'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingTicket(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      {isAr ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                </form>
              ) : currentTicket ? (
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <h4 className="font-extrabold text-sm">{currentTicket.subject}</h4>
                        <span className="text-[11px] text-slate-400">
                          {isAr ? `تاريخ الإنشاء: ${currentTicket.createdAt}` : `Created: ${currentTicket.createdAt}`}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-50 dark:bg-cyan-950 text-cyan-600">
                        {currentTicket.priority.toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-3 mt-4">
                      {currentTicket.messages.map((m) => (
                        <div
                          key={m.id}
                          className={`p-3 rounded-xl text-xs space-y-1 ${
                            m.sender === 'agent'
                              ? 'bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/50'
                              : 'bg-slate-100 dark:bg-slate-800'
                          }`}
                        >
                          <div className="flex justify-between font-bold text-[11px] text-slate-500">
                            <span>{m.senderName}</span>
                            <span>{m.timestamp}</span>
                          </div>
                          <p className="leading-relaxed">{m.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Reply Input */}
                  <form onSubmit={handleSendTicketReply} className="pt-2 flex gap-2">
                    <input
                      type="text"
                      value={ticketReplyText}
                      onChange={(e) => setTicketReplyText(e.target.value)}
                      placeholder={isAr ? 'اكتب ردك على التذكرة...' : 'Reply to ticket...'}
                      className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white"
                    >
                      {isAr ? 'إرسال الرد' : 'Reply'}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="text-center py-10 text-xs text-slate-400">
                  {isAr ? 'اختر تذكرة لعرضها' : 'Select a ticket'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: FAQs */}
        {activeTab === 'faqs' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-3">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
              {isAr ? 'الأسئلة الشائعة وإجابات الدعم الفني المباشرة' : 'Frequently Asked Questions'}
            </h4>
            <div className="space-y-3">
              {FAQS.map((faq, idx) => (
                <details
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 group"
                >
                  <summary className="font-bold text-xs cursor-pointer text-slate-900 dark:text-white list-none flex items-center justify-between">
                    <span>{isAr ? faq.qAr : faq.qEn}</span>
                    <span className="text-cyan-500 text-sm font-bold group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-200/50 dark:border-slate-800/50 pt-2">
                    {isAr ? faq.aAr : faq.aEn}
                  </p>
                </details>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
