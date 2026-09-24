import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { VectorAvatar } from './common/VectorAvatar';
import {
  VECTOR_PRESETS,
  VECTOR_BACKGROUNDS,
  VECTOR_ACCESSORIES,
  VectorPreset
} from '../data/vectorAvatars';
import {
  User,
  Shield,
  Key,
  Smartphone,
  Mail,
  Phone,
  Globe,
  Sparkles,
  Shuffle,
  Check,
  Copy,
  RefreshCw,
  Lock,
  Eye,
  EyeOff,
  Bell,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Fingerprint,
  Zap,
  Save,
  Crown
} from 'lucide-react';

export const AccountSettingsView: React.FC = () => {
  const {
    language,
    userProfile,
    updateUserProfile,
    securitySettings,
    updateSecuritySettings,
    activeSessions,
    terminateOtherSessions,
    regenerateApiKey,
    changePassword,
    userStats,
    showToast
  } = useApp();

  const isAr = language === 'ar';

  // Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'security' | 'sessions'>('profile');

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: userProfile.name,
    email: userProfile.email,
    phone: userProfile.phone,
    country: userProfile.country,
    bio: userProfile.bio
  });

  // Vector Avatar Builder State
  const [avatarConfig, setAvatarConfig] = useState(userProfile.avatarConfig);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Password Form State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Security Toggles State
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [ipWhitelist, setIpWhitelist] = useState(securitySettings.whitelistedIps);
  const [pinCode, setPinCode] = useState(securitySettings.pinCode || '7412');
  const [isEditingPin, setIsEditingPin] = useState(false);

  // Handle Save Profile
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      name: profileForm.name,
      email: profileForm.email,
      phone: profileForm.phone,
      country: profileForm.country,
      bio: profileForm.bio,
      avatarConfig: avatarConfig
    });
  };

  // Handle Randomize Avatar
  const handleRandomizeAvatar = () => {
    const randomPreset = VECTOR_PRESETS[Math.floor(Math.random() * VECTOR_PRESETS.length)];
    const randomBg = VECTOR_BACKGROUNDS[Math.floor(Math.random() * VECTOR_BACKGROUNDS.length)];
    const accessories = ['none', 'crown', 'verified', 'headphones', 'glasses', 'lightning', 'sparkles'] as const;
    const randomAccessory = accessories[Math.floor(Math.random() * accessories.length)];

    const newConfig = {
      presetId: randomPreset.id,
      backgroundColor: randomBg.bgClass,
      accessory: randomAccessory,
      accentColor: randomPreset.defaultAccent
    };

    setAvatarConfig(newConfig);
    showToast({
      type: 'info',
      title: isAr ? 'توليد شخصية فيكتور عشوائية' : 'Random Avatar Generated',
      message: isAr
        ? `تم توليد: ${randomPreset.nameAr} بتأثير خلفية ${randomBg.nameAr}`
        : `Generated: ${randomPreset.nameEn} with ${randomBg.nameEn}`
    });
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast({
        type: 'error',
        title: isAr ? 'خطأ في التأكيد' : 'Mismatch Error',
        message: isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match'
      });
      return;
    }
    const res = await changePassword(oldPassword, newPassword);
    if (res.success) {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      showToast({
        type: 'error',
        title: isAr ? 'خطأ' : 'Error',
        message: res.message
      });
    }
  };

  // Copy API Key
  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(securitySettings.apiKey);
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2500);
    showToast({
      type: 'success',
      title: isAr ? 'تم النسخ' : 'Copied',
      message: isAr ? 'تم نسخ مفتاح API إلى الحافظة' : 'API key copied to clipboard'
    });
  };

  // Regenerate API Key
  const handleRegenerateKey = () => {
    if (window.confirm(isAr ? 'هل أنت متأكد من إعادة توليد مفتاح API؟ سيتوقف المفتاح القديم فوراً.' : 'Are you sure you want to regenerate your API key?')) {
      const newKey = regenerateApiKey();
      showToast({
        type: 'info',
        title: isAr ? 'تم التوليد' : 'Key Generated',
        message: isAr ? 'تم توليد مفتاح API جديد وتحديثه' : `New API Key: ${newKey.substring(0, 14)}...`
      });
    }
  };

  // Filter Presets
  const filteredPresets = selectedCategory === 'all'
    ? VECTOR_PRESETS
    : VECTOR_PRESETS.filter((p) => p.category === selectedCategory);

  // Security Score Calculation
  const securityScore =
    (securitySettings.twoFactorAuth ? 35 : 10) +
    (securitySettings.requirePinForOrders ? 20 : 0) +
    (securitySettings.loginAlertsEmail ? 20 : 0) +
    (securitySettings.whitelistedIps ? 15 : 0) +
    10; // base

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      
      {/* Top Header & Overview */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950 border border-slate-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* User Vector Avatar Preview */}
            <VectorAvatar config={userProfile.avatarConfig} size="xl" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{userProfile.name}</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isAr ? 'عضو موثق' : 'Verified Member'}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Crown className="w-3.5 h-3.5" />
                  {userStats.tier}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">{userProfile.email}</p>
              <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                <span>{isAr ? `تاريخ الانضمام: ${userProfile.joinedDate}` : `Joined: ${userProfile.joinedDate}`}</span>
                <span>•</span>
                <span>{isAr ? `الرصيد: $${userStats.balance.toFixed(2)}` : `Balance: $${userStats.balance.toFixed(2)}`}</span>
              </div>
            </div>
          </div>

          {/* Quick Security Health Badge */}
          <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60 min-w-[200px] flex items-center justify-between md:justify-end gap-4">
            <div>
              <div className="text-xs text-slate-400 font-bold mb-1">
                {isAr ? 'مستوى أمان الحساب' : 'Security Health'}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-cyan-400">{securityScore}%</span>
                <span className="text-xs font-semibold text-emerald-400">
                  {securityScore >= 75 ? (isAr ? 'قوي جداً' : 'Very Strong') : (isAr ? 'متوسط' : 'Moderate')}
                </span>
              </div>
              <div className="w-32 h-1.5 bg-slate-700 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${securityScore}%` }}
                />
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Shield className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex items-center gap-2 mt-8 pt-6 border-t border-slate-800/80 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveSubTab('profile')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition-all ${
              activeSubTab === 'profile'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            {isAr ? 'الملف الشخصي ومولد الفيكتور' : 'Profile & Vector Avatar'}
          </button>

          <button
            onClick={() => setActiveSubTab('security')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition-all ${
              activeSubTab === 'security'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            {isAr ? 'إعدادات الأمان التفضيلية' : 'Security Preferences'}
          </button>

          <button
            onClick={() => setActiveSubTab('sessions')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition-all ${
              activeSubTab === 'sessions'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Laptop className="w-4 h-4" />
            {isAr ? 'الأجهزة والجلسات النشطة' : 'Active Sessions'}
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-cyan-300">
              {activeSessions.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PROFILE & VECTOR AVATAR BUILDER */}
      {/* ========================================================================= */}
      {activeSubTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Vector Avatar Studio (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-cyan-500" />
                    {isAr ? 'مستودع وتوليد صور الفيكتور' : 'Vector Avatar Studio'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isAr
                      ? 'اختر من فيكتورات جاهزة فائقة الدقة أو ولّد شخصية عشوائية فوراً'
                      : 'Customize ready-to-use vector avatars with accessories & gradients'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRandomizeAvatar}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30 transition-colors"
                  title={isAr ? 'توليد عشوائي' : 'Randomize'}
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  {isAr ? 'توليد عشوائي' : 'Randomize'}
                </button>
              </div>

              {/* Large Interactive Preview */}
              <div className="relative flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 mb-6">
                <div className="relative group">
                  <VectorAvatar config={avatarConfig} size="3xl" />
                  <div className="absolute -bottom-2 inset-x-0 flex justify-center">
                    <span className="px-3 py-0.5 rounded-full text-[10px] font-black bg-slate-900/90 text-cyan-300 border border-cyan-500/30 backdrop-blur-sm shadow-md">
                      {isAr ? 'معاينة حية' : 'Live Preview'}
                    </span>
                  </div>
                </div>

                {/* Selected Preset Details */}
                <div className="mt-4 text-center">
                  <div className="text-sm font-black text-slate-800 dark:text-slate-200">
                    {VECTOR_PRESETS.find((p) => p.id === avatarConfig.presetId)?.[isAr ? 'nameAr' : 'nameEn']}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-0.5">
                    {VECTOR_PRESETS.find((p) => p.id === avatarConfig.presetId)?.[isAr ? 'descriptionAr' : 'descriptionEn']}
                  </div>
                </div>
              </div>

              {/* 1. Background Gradient Palette */}
              <div className="space-y-3 mb-6">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isAr ? '1. لوحة تدرجات الخلفية:' : '1. Background Gradient:'}
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {VECTOR_BACKGROUNDS.map((bg) => {
                    const isSelected = avatarConfig.backgroundColor === bg.bgClass;
                    return (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => setAvatarConfig((prev) => ({ ...prev, backgroundColor: bg.bgClass }))}
                        className={`h-9 rounded-xl bg-gradient-to-tr ${bg.bgClass} relative flex items-center justify-center transition-all ${
                          isSelected
                            ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-105 shadow-md'
                            : 'opacity-85 hover:opacity-100 hover:scale-102'
                        }`}
                        title={isAr ? bg.nameAr : bg.nameEn}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white drop-shadow-md stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Accessories & Badges */}
              <div className="space-y-3 mb-6">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isAr ? '2. شارات وإكسسوارات الشخصية:' : '2. Accessories & Badges:'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {VECTOR_ACCESSORIES.map((acc) => {
                    const isSelected = avatarConfig.accessory === acc.id;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() =>
                          setAvatarConfig((prev) => ({
                            ...prev,
                            accessory: acc.id as any
                          }))
                        }
                        className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all text-start flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/40 shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-transparent hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                        <span className="truncate">{isAr ? acc.nameAr : acc.nameEn}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Preset Vectors Category Tabs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? '3. اختر شخصية الفيكتور:' : '3. Choose Vector Persona:'}
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {filteredPresets.length} {isAr ? 'تصاميم جاهزة' : 'presets'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  {[
                    { id: 'all', labelAr: 'الكل', labelEn: 'All' },
                    { id: 'pro', labelAr: 'محترفون', labelEn: 'Pro' },
                    { id: 'tech', labelAr: 'تقنيون', labelEn: 'Tech' },
                    { id: 'vip', labelAr: 'VIP وملكي', labelEn: 'VIP' },
                    { id: 'gaming', labelAr: 'ألعاب', labelEn: 'Gaming' },
                    { id: 'shields', labelAr: 'دروع', labelEn: 'Shields' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap ${
                        selectedCategory === cat.id
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {isAr ? cat.labelAr : cat.labelEn}
                    </button>
                  ))}
                </div>

                {/* Presets Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-64 overflow-y-auto p-1">
                  {filteredPresets.map((preset) => {
                    const isSelected = avatarConfig.presetId === preset.id;
                    const previewConfig = {
                      presetId: preset.id,
                      backgroundColor: avatarConfig.backgroundColor,
                      accessory: 'none' as const,
                      accentColor: preset.defaultAccent
                    };

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          setAvatarConfig((prev) => ({
                            ...prev,
                            presetId: preset.id,
                            accentColor: preset.defaultAccent
                          }))
                        }
                        className={`p-2 rounded-2xl flex flex-col items-center text-center transition-all ${
                          isSelected
                            ? 'bg-cyan-500/15 border-2 border-cyan-500 shadow-sm scale-102'
                            : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <VectorAvatar config={previewConfig} size="md" showBadge={false} />
                        <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 mt-2 truncate w-full">
                          {isAr ? preset.nameAr : preset.nameEn}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: User Profile Form (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleSaveProfile} className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-cyan-500" />
                  {isAr ? 'البيانات الشخصية للحساب' : 'Account Details'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {isAr
                    ? 'قم بتعديل اسمك ومعلومات الاتصال ونبذتك التعريفية في المنصة'
                    : 'Update your display name, contact information, and public profile bio'}
                </p>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-cyan-500" />
                  {isAr ? 'الاسم الكامل أو اسم الشهرة *' : 'Full Name or Brand Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  placeholder={isAr ? 'مثال: عبدالرحمن سيد' : 'e.g. John Doe'}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                />
              </div>

              {/* Email & Phone Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-cyan-500" />
                    {isAr ? 'البريد الإلكتروني الأساسي' : 'Primary Email'}
                  </label>
                  <input
                    type="email"
                    required
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-cyan-500" />
                    {isAr ? 'رقم الهاتف / الواتساب' : 'Phone / WhatsApp'}
                  </label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder="+20 100 000 0000"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                  />
                </div>
              </div>

              {/* Country & Member Tier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-cyan-500" />
                    {isAr ? 'الدولة / المنطقة' : 'Country / Region'}
                  </label>
                  <input
                    type="text"
                    value={profileForm.country}
                    onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
                    placeholder={isAr ? 'مصر 🇪🇬' : 'Egypt 🇪🇬'}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                    {isAr ? 'مستوى الحساب والخصم' : 'Tier & VIP Discount'}
                  </label>
                  <div className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm flex items-center justify-between">
                    <span className="text-amber-500">{userStats.tier}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      {isAr ? `خصم دائم ${userStats.savedDiscount}%` : `${userStats.savedDiscount}% Discount`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'النبذة التعريفية (Bio)' : 'Bio / Short Description'}
                </label>
                <textarea
                  rows={3}
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  placeholder={isAr ? 'اكتب نبذة مختصرة عنك أو عن نشاطك التسويقي...' : 'Brief summary about yourself...'}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                />
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {isAr ? 'حفظ بيانات الملف الشخصي والصورة' : 'Save Profile & Avatar'}
                </button>
              </div>

            </form>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SECURITY PREFERENCES */}
      {/* ========================================================================= */}
      {activeSubTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Security Toggles & 2FA (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Two-Factor Authentication (2FA) Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 shrink-0">
                    <Fingerprint className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {isAr ? 'المصادقة الثنائية (2FA)' : 'Two-Factor Authentication'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                      {isAr
                        ? 'تأمين الحساب بواسطة رمز مؤقت من تطبيقات Google Authenticator أو Authy لمنع الدخول غير المصرح به حتى مع معرفة كلمة المرور.'
                        : 'Secure your account using dynamic 6-digit codes generated by Google Authenticator or Authy.'}
                    </p>
                  </div>
                </div>

                {/* 2FA Toggle */}
                <button
                  type="button"
                  onClick={() =>
                    updateSecuritySettings({
                      twoFactorAuth: !securitySettings.twoFactorAuth
                    })
                  }
                  className={`w-14 h-8 rounded-full transition-colors relative shrink-0 p-1 ${
                    securitySettings.twoFactorAuth ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full bg-white transition-transform ${
                      securitySettings.twoFactorAuth
                        ? isAr
                          ? '-translate-x-6'
                          : 'translate-x-6'
                        : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {securitySettings.twoFactorAuth && (
                <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-xs space-y-2 text-cyan-900 dark:text-cyan-200">
                  <div className="flex items-center gap-2 font-black">
                    <CheckCircle2 className="w-4 h-4 text-cyan-500" />
                    {isAr ? 'المصادقة الثنائية مفعلة ونشطة حالياً على حسابك' : '2FA is active and safeguarding your account'}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">
                    {isAr
                      ? `رمز الاسترداد الاحتياطي السري: `
                      : `Backup Secret Key: `}
                    <code className="font-mono font-bold bg-white/40 dark:bg-black/40 px-2 py-0.5 rounded text-cyan-600 dark:text-cyan-300">
                      {securitySettings.twoFactorSecret}
                    </code>
                  </div>
                </div>
              )}
            </div>

            {/* Preferential Security Settings (PIN, Login Alerts, Timeout) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-500" />
                {isAr ? 'تفضيلات الأمان والحماية المتقدمة' : 'Security Preferences & Policies'}
              </h3>

              <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800/80">
                
                {/* 1. Require PIN for Orders */}
                <div className="pt-3 first:pt-0 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Key className="w-4 h-4 text-amber-500" />
                      {isAr ? 'طلب رمز PIN أمني عند تأكيد الطلبات' : 'Require PIN Code for New Orders'}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {isAr
                        ? 'يمنع خصم رصيد المحفظة بالخطأ ويطلب رمزاً مكوناً من 4 أرقام قبل إرسال الطلب'
                        : 'Requires entering your 4-digit security PIN before executing wallet charges'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      updateSecuritySettings({
                        requirePinForOrders: !securitySettings.requirePinForOrders
                      })
                    }
                    className={`w-12 h-7 rounded-full transition-colors relative shrink-0 p-0.5 ${
                      securitySettings.requirePinForOrders ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full bg-white transition-transform ${
                        securitySettings.requirePinForOrders
                          ? isAr
                            ? '-translate-x-5'
                            : 'translate-x-5'
                          : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 2. Login Alert Emails */}
                <div className="pt-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-cyan-500" />
                      {isAr ? 'تنبيهات فورية بالبريد عند تسجيل الدخول' : 'Email Alerts on New Login'}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {isAr
                        ? 'إرسال إشعار فوري لبريدك يتضمن عنوان الـ IP ونوع الجهاز عند أي محاولة دخول جديدة'
                        : 'Receive email alerts with IP & device telemetry on every new session'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      updateSecuritySettings({
                        loginAlertsEmail: !securitySettings.loginAlertsEmail
                      })
                    }
                    className={`w-12 h-7 rounded-full transition-colors relative shrink-0 p-0.5 ${
                      securitySettings.loginAlertsEmail ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full bg-white transition-transform ${
                        securitySettings.loginAlertsEmail
                          ? isAr
                            ? '-translate-x-5'
                            : 'translate-x-5'
                          : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 3. Session Timeout Duration */}
                <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-black text-slate-800 dark:text-slate-200">
                      {isAr ? 'مهلة الخمول التلقائية للجلسة' : 'Session Inactivity Auto-Timeout'}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {isAr
                        ? 'تسجيل الخروج تلقائياً في حال عدم النشاط لحماية حسابك في الأماكن العامة'
                        : 'Automatically log out inactive sessions to prevent unauthorized physical access'}
                    </div>
                  </div>

                  <select
                    value={securitySettings.sessionTimeout}
                    onChange={(e) =>
                      updateSecuritySettings({
                        sessionTimeout: Number(e.target.value)
                      })
                    }
                    className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value={15}>{isAr ? '15 دقيقة خمول' : '15 minutes'}</option>
                    <option value={30}>{isAr ? '30 دقيقة خمول' : '30 minutes'}</option>
                    <option value={60}>{isAr ? 'ساعة واحدة (موصى به)' : '1 hour (Recommended)'}</option>
                    <option value={360}>{isAr ? '6 ساعات' : '6 hours'}</option>
                    <option value={1440}>{isAr ? '24 ساعة كاملة' : '24 hours'}</option>
                  </select>
                </div>

              </div>
            </div>

            {/* API Access & Developer Key */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Key className="w-5 h-5 text-cyan-500" />
                    {isAr ? 'مفتاح الربط البرمجي (SMM API Key)' : 'Developer API Key'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isAr
                      ? 'لربط متجرك أو موقعك بنظامنا عبر API وتنفيذ الطلبات آلياً برصيدك'
                      : 'Connect your store or bot to automate orders directly via REST API'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">
                    {securitySettings.allowApiOrders ? (isAr ? 'مفعّل' : 'Active') : (isAr ? 'معطّل' : 'Disabled')}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateSecuritySettings({
                        allowApiOrders: !securitySettings.allowApiOrders
                      })
                    }
                    className={`w-10 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${
                      securitySettings.allowApiOrders ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        securitySettings.allowApiOrders
                          ? isAr
                            ? '-translate-x-4'
                            : 'translate-x-4'
                          : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* API Key Box */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      readOnly
                      value={securitySettings.apiKey}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-slate-800 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyApiKey}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs transition-colors shrink-0"
                  >
                    {apiKeyCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    {apiKeyCopied ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}
                  </button>

                  <button
                    type="button"
                    onClick={handleRegenerateKey}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 font-bold text-xs transition-colors shrink-0 border border-rose-500/20"
                    title={isAr ? 'إعادة توليد مفتاح جديد' : 'Regenerate'}
                  >
                    <RefreshCw className="w-4 h-4" />
                    {isAr ? 'توليد جديد' : 'Regenerate'}
                  </button>
                </div>

                {/* Whitelisted IPs */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'عناوين IP المسموح لها بالطلب عبر API (IP Whitelist):' : 'Whitelisted IP Addresses for API:'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={ipWhitelist}
                      onChange={(e) => setIpWhitelist(e.target.value)}
                      placeholder="197.165.24.12, 102.45.18.99"
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => updateSecuritySettings({ whitelistedIps: ipWhitelist })}
                      className="px-4 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-black text-xs hover:bg-cyan-400 transition-colors"
                    >
                      {isAr ? 'حفظ الـ IP' : 'Save IPs'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isAr ? 'اترك الحقل فارغاً للسماح بالطلبات من أي خادم.' : 'Leave blank to allow API calls from any host.'}
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Password Change & Notifications (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Change Password Form */}
            <form onSubmit={handleChangePassword} className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-cyan-500" />
                  {isAr ? 'تغيير كلمة المرور' : 'Change Password'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isAr ? 'اختر كلمة مرور قوية مكونة من أحرف وأرقام ورموز' : 'Choose a secure password of at least 8 characters'}
                </p>
              </div>

              {/* Current Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'كلمة المرور الحالية *' : 'Current Password *'}
                </label>
                <div className="relative">
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs pr-10 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'كلمة المرور الجديدة *' : 'New Password *'}
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs pr-10 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'تأكيد كلمة المرور الجديدة *' : 'Confirm New Password *'}
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-black text-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm"
              >
                {isAr ? 'تحديث كلمة المرور' : 'Update Password'}
              </button>
            </form>

            {/* Notification Preferences */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-cyan-500" />
                {isAr ? 'تفضيلات الإشعارات والتنبيهات' : 'Notification Preferences'}
              </h3>

              <div className="space-y-3">
                {[
                  { key: 'orderCompleted', labelAr: 'اكتمال الطلبات بنجاح', labelEn: 'Order Completed' },
                  { key: 'orderIssues', labelAr: 'تنبيهات تأخر أو مشاكل الطلبات', labelEn: 'Order Issues / Refill Alerts' },
                  { key: 'balanceAlerts', labelAr: 'تنبيه انخفاض رصيد المحفظة', labelEn: 'Low Balance Warning' },
                  { key: 'promotionalOffers', labelAr: 'عروض الخصم والبونص الأسبوعي', labelEn: 'Promo Offers & Discounts' }
                ].map((item) => {
                  const isChecked = (securitySettings.notificationPrefs as any)[item.key];
                  return (
                    <label
                      key={item.key}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isAr ? item.labelAr : item.labelEn}
                      </span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          updateSecuritySettings({
                            notificationPrefs: {
                              ...securitySettings.notificationPrefs,
                              [item.key]: e.target.checked
                            }
                          })
                        }
                        className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ACTIVE SESSIONS */}
      {/* ========================================================================= */}
      {activeSubTab === 'sessions' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Laptop className="w-5 h-5 text-cyan-500" />
                {isAr ? 'الأجهزة والجلسات المسجلة حالياً' : 'Active Login Sessions & Devices'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isAr
                  ? 'قائمة بجميع المتصفحات والأجهزة التي سجلت الدخول بحسابك ومواقعها التقريبية'
                  : 'Manage active devices authorized to access your SMM Rapid dashboard'}
              </p>
            </div>

            <button
              type="button"
              onClick={terminateOtherSessions}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 font-bold text-xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              {isAr ? 'تسجيل الخروج من كافة الأجهزة الأخرى' : 'Log out from all other devices'}
            </button>
          </div>

          <div className="space-y-4">
            {activeSessions.map((session) => (
              <div
                key={session.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  session.isCurrent
                    ? 'bg-cyan-500/5 border-cyan-500/30'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      session.isCurrent
                        ? 'bg-cyan-500/20 text-cyan-500'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {session.device.includes('هاتف') || session.device.includes('Galaxy') ? (
                      <Smartphone className="w-6 h-6" />
                    ) : (
                      <Laptop className="w-6 h-6" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        {session.device}
                      </h4>
                      {session.isCurrent && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-cyan-500 text-slate-950">
                          {isAr ? 'الجلسة الحالية' : 'Current Session'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                      <span>{session.browser}</span>
                      <span>•</span>
                      <span>IP: <code className="font-mono">{session.ip}</code></span>
                      <span>•</span>
                      <span>{session.location}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">
                    {session.lastActive}
                  </span>
                  {!session.isCurrent && (
                    <button
                      type="button"
                      onClick={() => {
                        terminateOtherSessions();
                      }}
                      className="text-xs text-rose-500 hover:text-rose-600 font-bold px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
                    >
                      {isAr ? 'إنهاء' : 'Revoke'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
