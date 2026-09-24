import React from 'react';
import { SocialPlatform } from '../types';
import {
  Instagram,
  Youtube,
  Twitter,
  Send,
  Facebook,
  Linkedin,
  Music,
  Share2
} from 'lucide-react';

interface PlatformBadgeProps {
  platform: SocialPlatform;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const getPlatformMeta = (platform: SocialPlatform) => {
  switch (platform) {
    case 'instagram':
      return {
        labelAr: 'انستغرام',
        labelEn: 'Instagram',
        color: 'from-pink-500 via-rose-500 to-amber-500',
        textColor: 'text-pink-500 dark:text-pink-400',
        bgColor: 'bg-pink-500/10 border-pink-500/20 text-pink-500 dark:text-pink-400',
        Icon: Instagram
      };
    case 'tiktok':
      return {
        labelAr: 'تيك توك',
        labelEn: 'TikTok',
        color: 'from-cyan-400 to-rose-500',
        textColor: 'text-cyan-400',
        bgColor: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
        Icon: Music
      };
    case 'youtube':
      return {
        labelAr: 'يوتيوب',
        labelEn: 'YouTube',
        color: 'from-red-600 to-rose-600',
        textColor: 'text-red-500 dark:text-red-400',
        bgColor: 'bg-red-500/10 border-red-500/20 text-red-500 dark:text-red-400',
        Icon: Youtube
      };
    case 'twitter':
      return {
        labelAr: 'تويتر / X',
        labelEn: 'X / Twitter',
        color: 'from-sky-500 to-blue-600',
        textColor: 'text-sky-500 dark:text-sky-400',
        bgColor: 'bg-sky-500/10 border-sky-500/20 text-sky-500 dark:text-sky-400',
        Icon: Twitter
      };
    case 'telegram':
      return {
        labelAr: 'تيليجرام',
        labelEn: 'Telegram',
        color: 'from-sky-400 to-blue-500',
        textColor: 'text-sky-400',
        bgColor: 'bg-sky-400/10 border-sky-400/20 text-sky-400',
        Icon: Send
      };
    case 'facebook':
      return {
        labelAr: 'فيسبوك',
        labelEn: 'Facebook',
        color: 'from-blue-600 to-indigo-600',
        textColor: 'text-blue-500 dark:text-blue-400',
        bgColor: 'bg-blue-500/10 border-blue-500/20 text-blue-500 dark:text-blue-400',
        Icon: Facebook
      };
    case 'linkedin':
      return {
        labelAr: 'لينكد إن',
        labelEn: 'LinkedIn',
        color: 'from-blue-700 to-cyan-700',
        textColor: 'text-blue-400',
        bgColor: 'bg-blue-600/10 border-blue-600/20 text-blue-400',
        Icon: Linkedin
      };
    case 'spotify':
      return {
        labelAr: 'سبوتيفاي',
        labelEn: 'Spotify',
        color: 'from-emerald-500 to-green-600',
        textColor: 'text-emerald-500 dark:text-emerald-400',
        bgColor: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400',
        Icon: Share2
      };
    default:
      return {
        labelAr: 'عام',
        labelEn: 'General',
        color: 'from-slate-500 to-gray-600',
        textColor: 'text-slate-400',
        bgColor: 'bg-slate-500/10 border-slate-500/20 text-slate-400',
        Icon: Share2
      };
  }
};

export const PlatformBadge: React.FC<PlatformBadgeProps> = ({
  platform,
  showLabel = true,
  size = 'md',
  className = ''
}) => {
  const meta = getPlatformMeta(platform);
  const Icon = meta.Icon;

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const badgePaddings = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold rounded-lg border ${meta.bgColor} ${badgePaddings[size]} ${className}`}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && <span>{meta.labelAr}</span>}
    </span>
  );
};
