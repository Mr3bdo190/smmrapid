import React from 'react';
import { VectorAvatarConfig } from '../../types';
import { VECTOR_BACKGROUNDS } from '../../data/vectorAvatars';
import { Crown, CheckCircle2, Headphones, Glasses, Sparkles, Zap, Shield } from 'lucide-react';

interface VectorAvatarProps {
  config?: VectorAvatarConfig;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
  showBadge?: boolean;
}

const SIZE_MAP = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-14 h-14 text-xl',
  xl: 'w-20 h-20 text-2xl',
  '2xl': 'w-28 h-28 text-3xl',
  '3xl': 'w-36 h-36 text-4xl'
};

const ACCESSORY_SIZE = {
  xs: 'w-2.5 h-2.5 p-0.5',
  sm: 'w-3.5 h-3.5 p-0.5',
  md: 'w-4.5 h-4.5 p-1',
  lg: 'w-6 h-6 p-1',
  xl: 'w-8 h-8 p-1.5',
  '2xl': 'w-10 h-10 p-2',
  '3xl': 'w-12 h-12 p-2.5'
};

export const VectorAvatar: React.FC<VectorAvatarProps> = ({
  config,
  size = 'md',
  className = '',
  showBadge = true
}) => {
  const currentConfig: VectorAvatarConfig = config || {
    presetId: 'pro_executive',
    backgroundColor: 'from-cyan-500 via-blue-600 to-indigo-700',
    accessory: 'verified',
    accentColor: '#38bdf8'
  };

  const bgGradient =
    VECTOR_BACKGROUNDS.find((b) => b.id === currentConfig.backgroundColor)?.bgClass ||
    currentConfig.backgroundColor ||
    'from-cyan-500 via-blue-600 to-indigo-700';

  const renderVectorGraphic = (presetId: string) => {
    switch (presetId) {
      case 'tech_ninja':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full fill-none drop-shadow-md">
            {/* Hood */}
            <path
              d="M20 90 C20 45, 30 20, 50 15 C70 20, 80 45, 80 90 Z"
              fill="#0f172a"
              stroke="#38bdf8"
              strokeWidth="2.5"
            />
            {/* Face opening */}
            <path
              d="M32 40 C32 30, 68 30, 68 40 C68 62, 32 62, 32 40 Z"
              fill="#1e293b"
            />
            {/* Cyber Visor / Eyes */}
            <path
              d="M35 44 L65 44"
              stroke="#06b6d4"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M38 44 L62 44"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Mask fold */}
            <path
              d="M40 55 L50 60 L60 55"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Shoulder armor */}
            <path
              d="M15 95 Q50 82 85 95"
              stroke="#06b6d4"
              strokeWidth="3"
            />
          </svg>
        );

      case 'crypto_whale':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full fill-none drop-shadow-md">
            {/* Head */}
            <circle cx="50" cy="45" r="28" fill="#fed7aa" />
            {/* Hair */}
            <path
              d="M22 45 C22 25, 40 18, 50 18 C65 18, 78 25, 78 40 C75 30, 65 24, 50 24 C35 24, 25 32, 22 45 Z"
              fill="#451a03"
            />
            {/* Suit & Collar */}
            <path d="M20 95 L35 70 L65 70 L80 95 Z" fill="#1e293b" />
            <polygon points="50,70 42,88 50,96 58,88" fill="#f59e0b" />
            {/* Gold Crypto Glasses */}
            <rect x="30" y="38" width="16" height="12" rx="3" fill="#f59e0b" stroke="#78350f" strokeWidth="1.5" />
            <rect x="54" y="38" width="16" height="12" rx="3" fill="#f59e0b" stroke="#78350f" strokeWidth="1.5" />
            <line x1="46" y1="44" x2="54" y2="44" stroke="#78350f" strokeWidth="2" />
            {/* Dollar / Bitcoin sign inside lens */}
            <text x="35" y="48" fontSize="9" fontWeight="900" fill="#78350f" fontFamily="sans-serif">₿</text>
            <text x="59" y="48" fontSize="9" fontWeight="900" fill="#78350f" fontFamily="sans-serif">₿</text>
            {/* Confident Smile */}
            <path d="M42 58 Q50 64 58 58" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );

      case 'cyber_bot':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full fill-none drop-shadow-md">
            {/* Antenna */}
            <line x1="50" y1="24" x2="50" y2="12" stroke="#a855f7" strokeWidth="3" />
            <circle cx="50" cy="10" r="5" fill="#c084fc" />
            {/* Bot Head */}
            <rect x="24" y="24" width="52" height="46" rx="14" fill="#0f172a" stroke="#a855f7" strokeWidth="2.5" />
            {/* Glowing Screen */}
            <rect x="30" y="30" width="40" height="34" rx="8" fill="#1e1b4b" />
            {/* LED Eyes */}
            <circle cx="42" cy="45" r="5" fill="#38bdf8" />
            <circle cx="42" cy="45" r="2" fill="#ffffff" />
            <circle cx="58" cy="45" r="5" fill="#38bdf8" />
            <circle cx="58" cy="45" r="2" fill="#ffffff" />
            {/* Bot Smile */}
            <path d="M42 56 Q50 60 58 56" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
            {/* Ears / Side nodes */}
            <rect x="18" y="40" width="6" height="14" rx="3" fill="#a855f7" />
            <rect x="76" y="40" width="6" height="14" rx="3" fill="#a855f7" />
            {/* Chassis Neck */}
            <path d="M38 70 L38 80 L62 80 L62 70 Z" fill="#334155" />
            <path d="M25 80 Q50 75 75 80 L85 100 L15 100 Z" fill="#1e293b" />
          </svg>
        );

      case 'cosmic_astronaut':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full fill-none drop-shadow-md">
            {/* Helmet Outer */}
            <circle cx="50" cy="48" r="32" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
            {/* Space Visor */}
            <ellipse cx="50" cy="48" rx="24" ry="18" fill="url(#visorGrad)" stroke="#38bdf8" strokeWidth="2" />
            {/* Visor Glare / Reflection */}
            <path
              d="M34 42 Q45 35 58 36"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.8"
            />
            {/* Stars inside visor */}
            <circle cx="40" cy="52" r="1.5" fill="#ffffff" />
            <circle cx="60" cy="45" r="1" fill="#ffffff" />
            <circle cx="54" cy="54" r="1.2" fill="#38bdf8" />
            {/* Neck Ring */}
            <rect x="32" y="76" width="36" height="8" rx="4" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
            {/* Shoulders */}
            <path d="M15 95 C15 82, 35 84, 50 84 C65 84, 85 82, 85 95 Z" fill="#ffffff" />
            <defs>
              <linearGradient id="visorGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="50%" stopColor="#1e1b4b" />
                <stop offset="100%" stopColor="#312e81" />
              </linearGradient>
            </defs>
          </svg>
        );

      case 'gamer_streamer':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full fill-none drop-shadow-md">
            {/* Head */}
            <circle cx="50" cy="48" r="24" fill="#fde047" />
            {/* Cool Haircut */}
            <path
              d="M26 42 C26 22, 45 16, 68 22 C64 28, 54 26, 42 32 C35 36, 30 38, 26 42 Z"
              fill="#ec4899"
            />
            {/* RGB Headset Arch */}
            <path
              d="M22 50 C22 24, 78 24, 78 50"
              stroke="#f43f5e"
              strokeWidth="5"
              strokeLinecap="round"
            />
            {/* Ear cups */}
            <rect x="18" y="44" width="8" height="18" rx="4" fill="#0f172a" stroke="#f43f5e" strokeWidth="2" />
            <rect x="74" y="44" width="8" height="18" rx="4" fill="#0f172a" stroke="#f43f5e" strokeWidth="2" />
            {/* Microphone */}
            <path d="M22 58 Q22 68 38 68" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="40" cy="68" r="2.5" fill="#38bdf8" />
            {/* Eyes */}
            <circle cx="43" cy="48" r="3" fill="#1e293b" />
            <circle cx="57" cy="48" r="3" fill="#1e293b" />
            {/* Smile */}
            <path d="M45 56 Q50 60 55 56" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
            {/* Hoodie */}
            <path d="M20 95 C25 76, 40 74, 50 74 C60 74, 75 76, 80 95 Z" fill="#0f172a" stroke="#ec4899" strokeWidth="2" />
          </svg>
        );

      case 'vip_royalty':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full fill-none drop-shadow-md">
            {/* Royal Cloak */}
            <path d="M15 95 C20 70, 35 68, 50 68 C65 68, 80 70, 85 95 Z" fill="#7e22ce" stroke="#fbbf24" strokeWidth="2" />
            {/* Golden Chain / Medallion */}
            <path d="M38 74 Q50 86 62 74" stroke="#fbbf24" strokeWidth="3" />
            <circle cx="50" cy="85" r="4" fill="#fbbf24" />
            {/* Head */}
            <circle cx="50" cy="48" r="22" fill="#fed7aa" />
            {/* Beard */}
            <path d="M38 52 C38 64, 62 64, 62 52 Z" fill="#78350f" />
            {/* Majestic Crown */}
            <path
              d="M30 32 L35 18 L50 25 L65 18 L70 32 Z"
              fill="#fbbf24"
              stroke="#b45309"
              strokeWidth="1.5"
            />
            {/* Gems on Crown */}
            <circle cx="35" cy="20" r="2" fill="#ef4444" />
            <circle cx="50" cy="26" r="2" fill="#3b82f6" />
            <circle cx="65" cy="20" r="2" fill="#ef4444" />
            <circle cx="50" cy="30" r="1.5" fill="#ffffff" />
            {/* Eyes */}
            <circle cx="43" cy="46" r="2.5" fill="#451a03" />
            <circle cx="57" cy="46" r="2.5" fill="#451a03" />
          </svg>
        );

      case 'lightning_crest':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full fill-none drop-shadow-md">
            {/* Shield Outline */}
            <path
              d="M50 15 C68 15, 82 20, 82 45 C82 70, 50 90, 50 90 C50 90, 18 70, 18 45 C18 20, 32 15, 50 15 Z"
              fill="#0f172a"
              stroke="#38bdf8"
              strokeWidth="3.5"
            />
            {/* Inner Ring */}
            <path
              d="M50 22 C64 22, 74 26, 74 46 C74 65, 50 82, 50 82 C50 82, 26 65, 26 46 C26 26, 36 22, 50 22 Z"
              fill="#1e293b"
              stroke="#0ea5e9"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
            {/* Powerful Lightning Bolt */}
            <polygon
              points="54,28 36,52 48,52 44,74 66,46 52,46"
              fill="#38bdf8"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          </svg>
        );

      case 'creative_artist':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full fill-none drop-shadow-md">
            {/* Head */}
            <circle cx="50" cy="48" r="24" fill="#fde047" />
            {/* Beret / Designer Hat */}
            <ellipse cx="48" cy="30" rx="26" ry="12" fill="#047857" />
            <circle cx="48" cy="22" r="3" fill="#10b981" />
            {/* Round Specs / Glasses */}
            <circle cx="42" cy="48" r="7" stroke="#1f2937" strokeWidth="2" fill="none" />
            <circle cx="58" cy="48" r="7" stroke="#1f2937" strokeWidth="2" fill="none" />
            <line x1="49" y1="48" x2="51" y2="48" stroke="#1f2937" strokeWidth="2" />
            {/* Moustache / Smile */}
            <path d="M44 60 Q50 65 56 60" stroke="#047857" strokeWidth="2" strokeLinecap="round" />
            {/* Artist Scarf & Collar */}
            <path d="M22 95 C25 78, 42 74, 50 74 C58 74, 75 78, 78 95 Z" fill="#1e293b" />
            <path d="M38 74 C38 85, 62 85, 62 74 Z" fill="#10b981" />
          </svg>
        );

      case 'phoenix_fire':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full fill-none drop-shadow-md">
            {/* Flame Halo */}
            <path
              d="M50 10 C60 25, 75 30, 75 50 C75 70, 60 85, 50 90 C40 85, 25 70, 25 50 C25 30, 40 25, 50 10 Z"
              fill="#ea580c"
              opacity="0.2"
            />
            {/* Wings */}
            <path
              d="M50 45 C30 25, 10 35, 12 60 C25 65, 38 55, 50 68 C62 55, 75 65, 88 60 C90 35, 70 25, 50 45 Z"
              fill="#f97316"
              stroke="#fbbf24"
              strokeWidth="2"
            />
            {/* Phoenix Head */}
            <path d="M50 22 L55 35 L45 35 Z" fill="#fbbf24" />
            <circle cx="50" cy="34" r="7" fill="#fbbf24" />
            {/* Beak */}
            <polygon points="50,38 46,45 54,45" fill="#b45309" />
            {/* Eye */}
            <circle cx="50" cy="33" r="2" fill="#ef4444" />
            {/* Fire Crest */}
            <path d="M50 18 Q54 10 60 14 Q52 24 50 26" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );

      case 'cyberpunk_hacker':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full fill-none drop-shadow-md">
            {/* Dark Hood */}
            <path d="M18 95 C18 40, 30 18, 50 14 C70 18, 82 40, 82 95 Z" fill="#020617" stroke="#22d3ee" strokeWidth="2" />
            {/* Neon Gas Mask / Filter */}
            <circle cx="36" cy="62" r="7" fill="#0f172a" stroke="#22d3ee" strokeWidth="2" />
            <circle cx="64" cy="62" r="7" fill="#0f172a" stroke="#22d3ee" strokeWidth="2" />
            {/* Digital Binary Goggles */}
            <rect x="28" y="38" width="44" height="14" rx="4" fill="#082f49" stroke="#22d3ee" strokeWidth="2" />
            <line x1="32" y1="45" x2="46" y2="45" stroke="#38bdf8" strokeWidth="3" />
            <line x1="54" y1="45" x2="68" y2="45" stroke="#38bdf8" strokeWidth="3" />
          </svg>
        );

      case 'star_influencer':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full fill-none drop-shadow-md">
            {/* Head */}
            <circle cx="50" cy="48" r="24" fill="#fbcfe8" />
            {/* Trendy Hair */}
            <path
              d="M24 45 C24 24, 40 18, 50 18 C65 18, 76 24, 76 42 C72 32, 64 26, 50 26 C36 26, 28 32, 24 45 Z"
              fill="#9333ea"
            />
            {/* Star-shaped Glasses */}
            <polygon points="40,38 42,44 48,44 43,48 45,54 40,50 35,54 37,48 32,44 38,44" fill="#f43f5e" />
            <polygon points="60,38 62,44 68,44 63,48 65,54 60,50 55,54 57,48 52,44 58,44" fill="#f43f5e" />
            {/* Lip Gloss Smile */}
            <path d="M43 62 Q50 67 57 62" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" />
            {/* Stylish Jacket */}
            <path d="M20 95 C22 76, 38 72, 50 72 C62 72, 78 76, 80 95 Z" fill="#4c1d95" stroke="#f472b6" strokeWidth="2" />
          </svg>
        );

      // Default: Pro Executive
      case 'pro_executive':
      default:
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full fill-none drop-shadow-md">
            {/* Head */}
            <circle cx="50" cy="46" r="23" fill="#fed7aa" />
            {/* Sleek Haircut */}
            <path
              d="M26 44 C26 24, 42 18, 50 18 C62 18, 74 24, 74 40 C70 30, 60 25, 50 25 C38 25, 30 32, 26 44 Z"
              fill="#0f172a"
            />
            {/* Modern Glasses */}
            <rect x="32" y="40" width="14" height="10" rx="3" stroke="#0284c7" strokeWidth="2" fill="none" />
            <rect x="54" y="40" width="14" height="10" rx="3" stroke="#0284c7" strokeWidth="2" fill="none" />
            <line x1="46" y1="45" x2="54" y2="45" stroke="#0284c7" strokeWidth="2" />
            {/* Eyes */}
            <circle cx="39" cy="45" r="1.5" fill="#0f172a" />
            <circle cx="61" cy="45" r="1.5" fill="#0f172a" />
            {/* Smile */}
            <path d="M44 57 Q50 61 56 57" stroke="#9a3412" strokeWidth="2" strokeLinecap="round" />
            {/* Formal Suit & Blue Tie */}
            <path d="M22 95 L34 70 L66 70 L78 95 Z" fill="#0f172a" stroke="#0284c7" strokeWidth="1" />
            <polygon points="50,70 44,86 50,96 56,86" fill="#0284c7" />
            {/* White Collar */}
            <polygon points="40,70 50,78 46,70" fill="#ffffff" />
            <polygon points="60,70 50,78 54,70" fill="#ffffff" />
          </svg>
        );
    }
  };

  const renderAccessoryBadge = () => {
    if (!showBadge || currentConfig.accessory === 'none') return null;

    const sizeClass = ACCESSORY_SIZE[size];

    switch (currentConfig.accessory) {
      case 'crown':
        return (
          <div
            className={`absolute -top-1 -end-1 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-950 shadow-md ring-2 ring-white dark:ring-slate-900 ${sizeClass} flex items-center justify-center`}
            title="VIP Crown"
          >
            <Crown className="w-full h-full fill-current" />
          </div>
        );
      case 'verified':
        return (
          <div
            className={`absolute -bottom-1 -end-1 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md ring-2 ring-white dark:ring-slate-900 ${sizeClass} flex items-center justify-center`}
            title="Verified Official"
          >
            <CheckCircle2 className="w-full h-full fill-current text-white" />
          </div>
        );
      case 'headphones':
        return (
          <div
            className={`absolute -bottom-1 -start-1 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 text-white shadow-md ring-2 ring-white dark:ring-slate-900 ${sizeClass} flex items-center justify-center`}
            title="Support & Audio Pro"
          >
            <Headphones className="w-full h-full" />
          </div>
        );
      case 'glasses':
        return (
          <div
            className={`absolute -top-1 -start-1 rounded-full bg-gradient-to-tr from-sky-400 to-cyan-500 text-slate-950 shadow-md ring-2 ring-white dark:ring-slate-900 ${sizeClass} flex items-center justify-center`}
            title="Cyber Shades"
          >
            <Glasses className="w-full h-full" />
          </div>
        );
      case 'lightning':
        return (
          <div
            className={`absolute -bottom-1 -end-1 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 text-white shadow-md ring-2 ring-white dark:ring-slate-900 ${sizeClass} flex items-center justify-center`}
            title="Super Speed"
          >
            <Zap className="w-full h-full fill-white" />
          </div>
        );
      case 'sparkles':
        return (
          <div
            className={`absolute -top-1 -end-1 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 text-white shadow-md ring-2 ring-white dark:ring-slate-900 ${sizeClass} flex items-center justify-center`}
            title="Magic Sparkles"
          >
            <Sparkles className="w-full h-full fill-white" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`relative inline-block select-none shrink-0 ${className}`}>
      {/* Outer Glow Container */}
      <div
        className={`${SIZE_MAP[size]} rounded-2xl bg-gradient-to-tr ${bgGradient} p-1 shadow-md flex items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-105 border border-white/20 dark:border-white/10`}
      >
        {renderVectorGraphic(currentConfig.presetId)}
      </div>

      {/* Render Accessory Badge */}
      {renderAccessoryBadge()}
    </div>
  );
};
