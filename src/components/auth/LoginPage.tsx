import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Zap,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  Sparkles,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  LogIn,
  Crown,
  User,
  Shield
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const {
    language,
    login,
    setActiveTab,
    platformUsers,
    setIsAdminMode
  } = useApp();

  const isAr = language === 'ar';
  const BackArrow = isAr ? ArrowRight : ArrowLeft;

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot Password modal / view
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!identifier.trim()) {
      setErrorMessage(isAr ? 'يرجى إدخال البريد الإلكتروني أو اسم المستخدم' : 'Please enter your email or username');
      return;
    }

    if (!password) {
      setErrorMessage(isAr ? 'يرجى إدخال كلمة المرور' : 'Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(identifier, password);
      if (!result.success) {
        setErrorMessage(result.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || (isAr ? 'حدث خطأ أثناء تسجيل الدخول' : 'An error occurred during login'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim() || !resetEmail.includes('@')) {
      return;
    }
    setResetSent(true);
  };

  return (
    <div id="login-page-container" className="w-full max-w-5xl mx-auto py-6 sm:py-10 px-3 sm:px-4">
      {/* Top Breadcrumb / Back button */}
      <div className="flex items-center justify-between mb-6">
        <button
          id="btn-login-back-to-home"
          onClick={() => setActiveTab('dashboard')}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400 transition-colors cursor-pointer"
        >
          <BackArrow className="w-4 h-4" />
          <span>{isAr ? 'الرجوع إلى الصفحة الرئيسية' : 'Back to Home'}</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>{isAr ? 'ليس لديك حساب؟' : "Don't have an account?"}</span>
          <button
            id="btn-login-goto-register-top"
            onClick={() => setActiveTab('register')}
            className="text-cyan-600 dark:text-cyan-400 hover:underline font-bold cursor-pointer"
          >
            {isAr ? 'إنشاء حساب جديد' : 'Register Now'}
          </button>
        </div>
      </div>

      {/* Main Container Card Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
        
        {/* Left Side (or Right in RTL): Visual Brand & Value Proposition */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 text-white p-6 sm:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-e border-slate-800 relative overflow-hidden">
          {/* Subtle Ambient Background glow */}
          <div className="absolute top-0 end-0 -mt-10 -me-10 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 start-0 -mb-10 -ms-10 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Brand Header */}
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-600 via-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25">
                <Zap className="w-6 h-6 fill-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-xl tracking-tight text-white">
                    SMM <span className="text-cyan-400">Rapid</span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    PRO
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  {isAr ? 'المنصة الأسرع لخدمات التواصل الاجتماعي' : 'Fastest Social Media Growth Panel'}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                {isAr
                  ? 'مرحباً بك مجدداً في لوحة تحكمك'
                  : 'Welcome Back to Your Dashboard'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {isAr
                  ? 'سجل دخولك لمتابعة طلباتك، شحن رصيد المحفظة، والاستفادة من أفضل الأسعار التنافسية مع ضمان الثبات 100%.'
                  : 'Log in to track your orders, deposit wallet balance, and unlock premium wholesale rates with 100% refill guarantee.'}
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <div className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-start">
                  <div className="text-xs font-bold text-white">
                    {isAr ? 'تنفيذ فوري وتلقائي' : 'Instant & Automated API'}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    {isAr ? 'تبدأ الطلبات خلال ثوانٍ معدودة عبر خوادم فائقة السرعة.' : 'Orders start within seconds through high-speed server nodes.'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-start">
                  <div className="text-xs font-bold text-white">
                    {isAr ? 'طرق دفع محلية وعالمية' : 'Local & Global Payment Gateways'}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    {isAr ? 'فودافون كاش، إنستاباي، فيزا، ماستركارد، وUSDT بدون عمولات إضافية.' : 'Vodafone Cash, InstaPay, Cards, and USDT TRC20 with zero hidden fees.'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security & Support Guarantee */}
          <div className="relative z-10 pt-8 mt-6 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>{isAr ? 'تشفير آمن 256-Bit SSL' : '256-Bit SSL Encryption'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>{isAr ? 'دعم فني 24/7' : '24/7 Support'}</span>
            </div>
          </div>
        </div>

        {/* Right Side (or Left in RTL): Login Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-6">
            
            {/* Header info */}
            <div className="text-start space-y-1">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                {isAr ? 'تسجيل الدخول' : 'Sign In to Your Account'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr
                  ? 'أدخل بيانات حسابك للمتابعة والوصول للمنصة'
                  : 'Enter your credentials to access your account'}
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div
                id="login-error-alert"
                className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="font-semibold">{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" id="login-form">
              {/* Identifier Input */}
              <div className="space-y-1.5 text-start">
                <label
                  htmlFor="input-login-identifier"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  {isAr ? 'البريد الإلكتروني أو اسم المستخدم' : 'Email or Username'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="input-login-identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={isAr ? 'مثال: ahmed@example.com أو ahmed10' : 'e.g. user@example.com or username'}
                    className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5 text-start">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="input-login-password"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    {isAr ? 'كلمة المرور' : 'Password'}
                  </label>
                  <button
                    id="btn-login-forgot-password-toggle"
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(true);
                      setResetEmail(identifier.includes('@') ? identifier : '');
                    }}
                    className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                  >
                    {isAr ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="input-login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full ps-10 pe-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                    required
                  />
                  <button
                    id="btn-login-toggle-show-password"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 end-0 pe-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-400 select-none">
                  <input
                    id="checkbox-login-remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 text-cyan-600 focus:ring-cyan-500 w-4 h-4"
                  />
                  <span>{isAr ? 'تذكر بيانات الدخول على هذا الجهاز' : 'Remember me on this device'}</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                id="btn-login-submit"
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-98 transition-all cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{isAr ? 'جاري التحقق...' : 'Authenticating...'}</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>{isAr ? 'تسجيل الدخول' : 'Sign In'}</span>
                  </>
                )}
              </button>
            </form>

            {/* Bottom Register Prompt */}
            <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
              <span>{isAr ? 'ليس لديك حساب بعد؟' : "Don't have an account yet?"} </span>
              <button
                id="btn-login-bottom-register-cta"
                type="button"
                onClick={() => setActiveTab('register')}
                className="text-cyan-600 dark:text-cyan-400 hover:underline font-black cursor-pointer inline-flex items-center gap-1"
              >
                <span>{isAr ? 'إنشاء حساب جديد الآن' : 'Create an Account Now'}</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div
          id="modal-forgot-password"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-4 text-start">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {isAr ? 'استعادة كلمة المرور' : 'Reset Your Password'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {isAr
                  ? 'أدخل بريدك الإلكتروني المسجل وسنرسل لك رابط إعادة تعيين كلمة المرور فوراً.'
                  : 'Enter your registered email and we will send a password reset link immediately.'}
              </p>
            </div>

            {resetSent ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>{isAr ? 'تم إرسال التعليمات بنجاح!' : 'Reset link sent successfully!'}</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {isAr
                    ? `أرسلنا رسالة إلى ${resetEmail} تحتوي على رمز إعادة التعيين ورابط آمن صالح لمدة 15 دقيقة.`
                    : `We sent instructions to ${resetEmail} with a secure link valid for 15 minutes.`}
                </p>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetSent(false);
                  }}
                  className="w-full mt-2 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-colors"
                >
                  {isAr ? 'العودة لتسجيل الدخول' : 'Return to Login'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'البريد الإلكتروني' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    {isAr ? 'إرسال رابط الاستعادة' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
