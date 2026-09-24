import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  Zap,
  ShieldCheck,
  RotateCcw,
  Lock,
  Headphones,
  CheckCircle2,
  Heart
} from 'lucide-react';

export const Footer: React.FC = () => {
  const { language, setActiveTab, setIsAddFundsModalOpen, setIsChatOpen } = useApp();
  const isAr = language === 'ar';

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 mt-16 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/25">
                <Zap className="w-4 h-4 fill-white" />
              </div>
              <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
                SMM <span className="text-cyan-500">Rapid</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isAr
                ? 'المنصة الأسرع والأكثر موثوقية لخدمات التسويق الرقمي وتنمية حسابات التواصل الاجتماعي بأسعار الجملة المباشرة.'
                : 'The fastest automated SMM panel for creator growth, engagement scaling, and high-retention services.'}
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-500 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>{isAr ? 'حالة السيرفرات: تعمل بكفاءة 99.98%' : 'System Status: 99.98% Operational'}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3 text-xs">
            <h4 className="font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
              {isAr ? 'روابط سريعة' : 'Quick Navigation'}
            </h4>
            <ul className="space-y-2 text-slate-500 dark:text-slate-400">
              <li>
                <Link
                  to="/new-order"
                  className="hover:text-cyan-500 transition-colors inline-block"
                >
                  {isAr ? 'إنشاء طلب فوري' : 'Create New Order'}
                </Link>
              </li>
              <li>
                <Link
                  to="/orders"
                  className="hover:text-cyan-500 transition-colors inline-block"
                >
                  {isAr ? 'سجل الطلبات والتتبع' : 'Orders & Live Tracking'}
                </Link>
              </li>
              <li>
                <Link
                  to="/services"
                  className="hover:text-cyan-500 transition-colors inline-block"
                >
                  {isAr ? 'قائمة الخدمات والأسعار' : 'Services & Rates'}
                </Link>
              </li>
              <li>
                <Link
                  to="/blog"
                  className="hover:text-cyan-500 transition-colors inline-block"
                >
                  {isAr ? 'المدونة والشروحات' : 'Blog & Growth Guides'}
                </Link>
              </li>
              <li>
                <Link
                  to="/reviews"
                  className="hover:text-cyan-500 transition-colors inline-block"
                >
                  {isAr ? 'آراء وتقييمات العملاء' : 'Customer Reviews'}
                </Link>
              </li>
              <li>
                <Link
                  to="/help"
                  className="hover:text-cyan-500 transition-colors inline-block"
                >
                  {isAr ? 'الأسئلة الشائعة والمساعدة' : 'FAQs & Help'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Billing */}
          <div className="space-y-3 text-xs">
            <h4 className="font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
              {isAr ? 'الدعم والمحفظة' : 'Support & Wallet'}
            </h4>
            <ul className="space-y-2 text-slate-500 dark:text-slate-400">
              <li>
                <button
                  onClick={() => setIsAddFundsModalOpen(true)}
                  className="hover:text-cyan-500 transition-colors cursor-pointer text-start"
                >
                  {isAr ? 'شحن الرصيد الآمن' : 'Add Secure Funds'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setIsChatOpen(true)}
                  className="hover:text-cyan-500 transition-colors cursor-pointer text-start"
                >
                  {isAr ? 'المحادثة الحية مع الدعم' : 'Live Chat Support'}
                </button>
              </li>
              <li>
                <Link
                  to="/help"
                  className="hover:text-cyan-500 transition-colors inline-block"
                >
                  {isAr ? 'مركز المساعدة ودليل المبتدئين' : 'Help Center & Beginner Guide'}
                </Link>
              </li>
              <li>
                <Link
                  to="/support"
                  className="hover:text-cyan-500 transition-colors inline-block"
                >
                  {isAr ? 'الأسئلة الشائعة وتذاكر الدعم' : 'Support Tickets & FAQs'}
                </Link>
              </li>
              <li>
                <Link
                  to="/reviews"
                  className="hover:text-cyan-500 transition-colors inline-block"
                >
                  {isAr ? 'تقييمات وآراء العملاء' : 'Customer Reviews'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Guarantees & Security */}
          <div className="space-y-3 text-xs">
            <h4 className="font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
              {isAr ? 'الضمان والأمان' : 'Security & Trust'}
            </h4>
            <div className="space-y-2 text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{isAr ? 'أمان تام 100% على حساباتك' : '100% Account Safe & Non-Drop'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-500 shrink-0" />
                <span>{isAr ? 'تشفير بنكي 256-bit SSL' : '256-Bit SSL Encrypted Checkout'}</span>
              </div>
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-purple-500 shrink-0" />
                <span>{isAr ? 'ضمان إعادة التعبئة مجاناً' : 'Free Automatic Refill Warranty'}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Payment Badges */}
        <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            © {new Date().getFullYear()} SMM Rapid. {isAr ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
          </div>

          {/* Supported Methods Badges */}
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">VISA</span>
            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">MasterCard</span>
            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">Apple Pay</span>
            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">USDT TRC20</span>
            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">STC Pay</span>
            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">Vodafone Cash</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
