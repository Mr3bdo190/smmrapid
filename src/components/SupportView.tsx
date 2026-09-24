import React from 'react';
import { useApp } from '../context/AppContext';
import { Headphones, MessageSquare, Ticket, Clock, ShieldCheck, HelpCircle } from 'lucide-react';
import { ServicesCatalogView } from './ServicesCatalogView';

export const SupportView: React.FC = () => {
  const { language, setIsChatOpen, setActiveTab } = useApp();
  const isAr = language === 'ar';

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Support Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-cyan-900/60 via-slate-900 to-blue-900/60 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 text-white space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/30 shrink-0">
              <Headphones className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                  {isAr ? 'الدعم الفني متاح الآن 24/7' : 'Live Support Online 24/7'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black mt-1">
                {isAr ? 'مركز الدعم والمساعدة الفورية' : 'Live Customer Support & Help Desk'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                {isAr
                  ? 'فريق متخصص من خبراء التسويق الرقمي جاهز للرد على استفساراتك وحل أي مشكلة في طلبك فورياً.'
                  : 'Specialized digital marketing technicians ready to assist your orders and resolve queries.'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
            <Clock className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <div className="text-xs font-bold">{isAr ? 'متوسط سرعة الرد' : 'Avg. Response Time'}</div>
              <div className="text-[11px] text-cyan-300 font-semibold">{isAr ? 'أقل من 3 دقائق' : '< 3 minutes'}</div>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-bold">{isAr ? 'ضمان حل المشكلات' : 'Issue Resolution'}</div>
              <div className="text-[11px] text-emerald-300 font-semibold">{isAr ? '100% تعويض أو إعادة رصيد' : '100% Guaranteed'}</div>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
            <Ticket className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-xs font-bold">{isAr ? 'نظام تذاكر احترافي' : 'Ticket System'}</div>
              <div className="text-[11px] text-amber-300 font-semibold">{isAr ? 'متابعة مباشرة وموثقة' : 'Documented & Tracked'}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10">
          <button
            onClick={() => setIsChatOpen(true)}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm shadow-xl shadow-cyan-500/25 transition-all flex items-center gap-2.5 active:scale-95 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{isAr ? 'فتح المحادثة الحية المباشرة' : 'Start Live Chat Now'}</span>
          </button>
          <button
            onClick={() => setIsChatOpen(true)}
            className="px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm border border-white/15 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Ticket className="w-4 h-4" />
            <span>{isAr ? 'فتح تذكرة دعم فني جديدة' : 'Submit Support Ticket'}</span>
          </button>
          <button
            onClick={() => setActiveTab('help')}
            className="px-5 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-medium text-sm transition-colors flex items-center gap-2 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            <span>{isAr ? 'الأسئلة الشائعة والأدلة' : 'Browse FAQs'}</span>
          </button>
        </div>
      </div>

      {/* Catalog preview */}
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
          {isAr ? 'الخدمات الشائعة التي يدعمها الفريق' : 'Popular Services Supported'}
        </h2>
        <ServicesCatalogView />
      </div>
    </div>
  );
};
