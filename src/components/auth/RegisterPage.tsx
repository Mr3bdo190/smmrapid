import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  User,
  AtSign,
  Mail,
  Phone,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Gift,
  CheckCircle2,
  AlertCircle,
  Zap,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  UserPlus,
  HelpCircle,
  Clock,
  Shield,
  BadgeCheck
} from 'lucide-react';

const ARAB_COUNTRIES = [
  { code: '+20', nameAr: 'مصر 🇪🇬', nameEn: 'Egypt 🇪🇬' },
  { code: '+966', nameAr: 'المملكة العربية السعودية 🇸🇦', nameEn: 'Saudi Arabia 🇸🇦' },
  { code: '+971', nameAr: 'الإمارات العربية المتحدة 🇦🇪', nameEn: 'United Arab Emirates 🇦🇪' },
  { code: '+965', nameAr: 'الكويت 🇰🇼', nameEn: 'Kuwait 🇰🇼' },
  { code: '+964', nameAr: 'العراق 🇮🇶', nameEn: 'Iraq 🇮🇶' },
  { code: '+962', nameAr: 'الأردن 🇯🇴', nameEn: 'Jordan 🇯🇴' },
  { code: '+212', nameAr: 'المغرب 🇲🇦', nameEn: 'Morocco 🇲🇦' },
  { code: '+216', nameAr: 'تونس 🇹🇳', nameEn: 'Tunisia 🇹🇳' },
  { code: '+213', nameAr: 'الجزائر 🇩🇿', nameEn: 'Algeria 🇩🇿' },
  { code: '+968', nameAr: 'سلطنة عمان 🇴🇲', nameEn: 'Oman 🇴🇲' },
  { code: '+974', nameAr: 'قطر 🇶🇦', nameEn: 'Qatar 🇶🇦' },
  { code: '+973', nameAr: 'البحرين 🇧🇭', nameEn: 'Bahrain 🇧🇭' },
  { code: '+1', nameAr: 'الولايات المتحدة / كندا 🇺🇸', nameEn: 'USA / Canada 🇺🇸' },
  { code: '+44', nameAr: 'المملكة المتحدة 🇬🇧', nameEn: 'United Kingdom 🇬🇧' },
  { code: '+90', nameAr: 'تركيا 🇹🇷', nameEn: 'Turkey 🇹🇷' }
];

export const RegisterPage: React.FC = () => {
  const {
    language,
    register,
    setActiveTab
  } = useApp();

  const isAr = language === 'ar';
  const BackArrow = isAr ? ArrowRight : ArrowLeft;

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [dialCode, setDialCode] = useState('+20');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [country, setCountry] = useState('مصر 🇪🇬');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!password) return { score: 0, textAr: 'فارغة', textEn: 'Empty', color: 'bg-slate-200 dark:bg-slate-700' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score: 25, textAr: 'ضعيفة', textEn: 'Weak', color: 'bg-rose-500' };
    if (score === 2) return { score: 50, textAr: 'متوسطة', textEn: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 75, textAr: 'جيدة', textEn: 'Good', color: 'bg-cyan-500' };
    return { score: 100, textAr: 'قوية وممتازة', textEn: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!fullName.trim()) {
      setErrorMessage(isAr ? 'يرجى إدخال اسمك الكامل' : 'Please enter your full name');
      return;
    }

    if (!username.trim()) {
      setErrorMessage(isAr ? 'يرجى إدخال اسم المستخدم' : 'Please choose a username');
      return;
    }

    if (username.trim().length < 3) {
      setErrorMessage(isAr ? 'يجب أن يتكون اسم المستخدم من 3 أحرف على الأقل' : 'Username must be at least 3 characters');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage(isAr ? 'يرجى إدخال بريد إلكتروني صحيح' : 'Please enter a valid email address');
      return;
    }

    if (!phoneNumber.trim()) {
      setErrorMessage(isAr ? 'يرجى إدخال رقم الهاتف أو الواتساب' : 'Please enter your phone/WhatsApp number');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage(isAr ? 'يجب ألا تقل كلمة المرور عن 6 خانات' : 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }

    if (!agreedToTerms) {
      setErrorMessage(isAr ? 'يرجى الموافقة على شروط الاستخدام وسياسة الخصوصية للمتابعة' : 'Please agree to terms of service to proceed');
      return;
    }

    setIsLoading(true);

    const fullPhone = `${dialCode} ${phoneNumber.trim()}`;

    try {
      const result = await register({
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        phone: fullPhone,
        country: country,
        password: password,
        referralCode: referralCode.trim() || undefined,
        agreedToTerms: agreedToTerms
      });

      if (!result.success) {
        setErrorMessage(result.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || (isAr ? 'حدث خطأ أثناء إنشاء الحساب' : 'An error occurred during registration'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="register-page-container" className="w-full max-w-5xl mx-auto py-6 sm:py-10 px-3 sm:px-4">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between mb-6">
        <button
          id="btn-register-back-to-home"
          onClick={() => setActiveTab('dashboard')}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400 transition-colors cursor-pointer"
        >
          <BackArrow className="w-4 h-4" />
          <span>{isAr ? 'الرجوع إلى الصفحة الرئيسية' : 'Back to Home'}</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>{isAr ? 'لديك حساب بالفعل؟' : 'Already have an account?'}</span>
          <button
            id="btn-register-goto-login-top"
            onClick={() => setActiveTab('login')}
            className="text-cyan-600 dark:text-cyan-400 hover:underline font-bold cursor-pointer"
          >
            {isAr ? 'تسجيل الدخول' : 'Sign In'}
          </button>
        </div>
      </div>

      {/* Main Grid Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
        
        {/* Value Prop Banner on the side */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 text-white p-6 sm:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-e border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 end-0 -mt-10 -me-10 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 start-0 -mb-10 -ms-10 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

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
                    JOIN
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  {isAr ? 'عضوية الموزعين والمستخدمين المعتمدين' : 'Wholesale SMM Panel Membership'}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold">
                <Gift className="w-4 h-4 text-amber-400" />
                <span>{isAr ? 'بونص ترحيبي فوري $5.00 عند التسجيل' : 'Instant $5.00 Welcome Bonus Credit'}</span>
              </div>
              
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                {isAr
                  ? 'أنشئ حسابك وابدأ بتنمية حساباتك بأعلى سرعة'
                  : 'Start Scaling Your Social Presence in Seconds'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {isAr
                  ? 'انضم إلى أكثر من 45,000 عميل ومسوّق رقمي في الشرق الأوسط واكتشف أسعار الجملة المباشرة مع تحديث فوري للحالة.'
                  : 'Join 45,000+ creators and agencies in the MENA region with direct API wholesale pricing.'}
              </p>
            </div>

            {/* Benefits Checklist */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-2.5 text-xs text-slate-200">
                <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span>{isAr ? 'شحن فوري عبر فودافون كاش وإنستاباي والدفع الإلكتروني' : 'Instant deposits via Vodafone Cash, InstaPay & Cards'}</span>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-slate-200">
                <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span>{isAr ? 'ضمان تعويض مجاني تلقائي لخدمات انستغرام وتيك توك ويوتيوب' : 'Automatic free refill guarantee on high-retention services'}</span>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-slate-200">
                <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span>{isAr ? 'ربط API احترافي ومجاني لأصحاب المواقع والمتاجر' : 'Free REST API integration for resellers and stores'}</span>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-slate-200">
                <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span>{isAr ? 'دعم فني مباشر 24/7 عبر الواتساب والشات المباشر' : '24/7 Priority live WhatsApp and chat support'}</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>{isAr ? 'حماية وأمان البيانات 100%' : '100% Data Privacy'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BadgeCheck className="w-4 h-4 text-emerald-400" />
              <span>{isAr ? 'تفعيل فوري للمحفظة' : 'Instant Activation'}</span>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
          <div className="max-w-xl w-full mx-auto space-y-6">
            
            {/* Header info */}
            <div className="text-start space-y-1">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                {isAr ? 'إنشاء حساب جديد' : 'Create Your Account'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr
                  ? 'املأ البيانات التالية لإنشاء وتفعيل حسابك ومحفظتك مجاناً'
                  : 'Complete the information below to activate your account & wallet'}
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div
                id="register-error-alert"
                className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="font-semibold">{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" id="register-form">
              {/* Row 1: Full Name & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Full Name */}
                <div className="space-y-1.5 text-start">
                  <label
                    htmlFor="input-register-fullname"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    {isAr ? 'الاسم الكامل' : 'Full Name'} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="input-register-fullname"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={isAr ? 'مثال: أحمد محمود' : 'e.g. John Doe'}
                      className="w-full ps-10 pe-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Username */}
                <div className="space-y-1.5 text-start">
                  <label
                    htmlFor="input-register-username"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    {isAr ? 'اسم المستخدم' : 'Username'} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                      <AtSign className="w-4 h-4" />
                    </div>
                    <input
                      id="input-register-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
                      placeholder={isAr ? 'اسم مستخدم فريد' : 'unique_username'}
                      className="w-full ps-10 pe-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Email & Country */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Email Address */}
                <div className="space-y-1.5 text-start">
                  <label
                    htmlFor="input-register-email"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    {isAr ? 'البريد الإلكتروني' : 'Email Address'} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="input-register-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full ps-10 pe-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Country */}
                <div className="space-y-1.5 text-start">
                  <label
                    htmlFor="select-register-country"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    {isAr ? 'الدولة' : 'Country'} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                      <Globe className="w-4 h-4" />
                    </div>
                    <select
                      id="select-register-country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full ps-10 pe-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all cursor-pointer"
                    >
                      {ARAB_COUNTRIES.map((c) => (
                        <option key={c.nameEn} value={c.nameAr}>
                          {isAr ? c.nameAr : c.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 3: Phone / WhatsApp with International Dial Code */}
              <div className="space-y-1.5 text-start">
                <label
                  htmlFor="input-register-phone"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  {isAr ? 'رقم الهاتف / الواتساب للتواصل' : 'Phone / WhatsApp Number'} <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    id="select-register-dial-code"
                    value={dialCode}
                    onChange={(e) => setDialCode(e.target.value)}
                    className="w-32 py-2.5 px-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all cursor-pointer shrink-0"
                    dir="ltr"
                  >
                    {ARAB_COUNTRIES.map((c) => (
                      <option key={c.code + c.nameEn} value={c.code}>
                        {c.code} ({c.nameAr.split(' ')[0]})
                      </option>
                    ))}
                  </select>
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      id="input-register-phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder={dialCode === '+20' ? '010XXXXXXXX' : '5XXXXXXXX'}
                      className="w-full ps-10 pe-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                      required
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  {isAr ? 'مهم لتأكيد إشعارات الشحن والطلبات عبر الواتساب' : 'Used for deposit confirmations and status alerts via WhatsApp'}
                </p>
              </div>

              {/* Row 4: Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Password */}
                <div className="space-y-1.5 text-start">
                  <label
                    htmlFor="input-register-password"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    {isAr ? 'كلمة المرور' : 'Password'} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="input-register-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full ps-10 pe-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                      required
                    />
                    <button
                      id="btn-register-toggle-show-password"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 end-0 pe-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5 text-start">
                  <label
                    htmlFor="input-register-confirm-password"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    {isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="input-register-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full ps-10 pe-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                      required
                    />
                    <button
                      id="btn-register-toggle-show-confirm-password"
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 end-0 pe-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password strength visual meter */}
              {password.length > 0 && (
                <div className="space-y-1 text-start animate-in fade-in">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">
                      {isAr ? 'قوة كلمة المرور:' : 'Password Strength:'}
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {isAr ? strength.textAr : strength.textEn}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strength.color}`}
                      style={{ width: `${strength.score}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Referral / Affiliate Code (Optional) */}
              <div className="space-y-1.5 text-start">
                <label
                  htmlFor="input-register-referral"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  {isAr ? 'كود الإحالة / الدعوة (اختياري)' : 'Referral / Promo Code (Optional)'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                    <Gift className="w-4 h-4" />
                  </div>
                  <input
                    id="input-register-referral"
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder={isAr ? 'مثال: RAPID2026 أو كود صديقك' : 'e.g. RAPID2026'}
                    className="w-full ps-10 pe-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Terms and conditions agreement checkbox */}
              <div className="pt-1 text-start">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 dark:text-slate-400 select-none">
                  <input
                    id="checkbox-register-terms"
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 text-cyan-600 focus:ring-cyan-500 w-4 h-4 mt-0.5 shrink-0"
                    required
                  />
                  <span>
                    {isAr
                      ? 'أوافق على شروط الاستخدام، سياسة الخصوصية، وضمان عدم النقص في منصة SMM Rapid.'
                      : 'I agree to the Terms of Service, Privacy Policy, and refill guarantee conditions.'}
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                id="btn-register-submit"
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-98 transition-all cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{isAr ? 'جاري إنشاء وتفعيل الحساب...' : 'Creating Account & Activating Wallet...'}</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>{isAr ? 'إنشاء الحساب وتفعيل المحفظة مجاناً' : 'Create Account & Claim $5 Bonus'}</span>
                  </>
                )}
              </button>
            </form>

            {/* Bottom Login Prompt */}
            <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
              <span>{isAr ? 'لديك حساب بالفعل؟' : 'Already have an active account?'} </span>
              <button
                id="btn-register-bottom-login-cta"
                type="button"
                onClick={() => setActiveTab('login')}
                className="text-cyan-600 dark:text-cyan-400 hover:underline font-black cursor-pointer inline-flex items-center gap-1"
              >
                <span>{isAr ? 'سجل دخولك الآن' : 'Sign In Now'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
