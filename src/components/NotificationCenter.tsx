import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell, CheckCheck, Clock, Handshake, LifeBuoy, ShoppingCart, Users, Wallet, X,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../lib/i18n';
import { cn } from '../lib/utils';

/**
 * Notification centre.
 *
 * The old bell opened a small dropdown that clipped the list and cut long text, so notifications
 * could not actually be read. This is a proper panel: fixed to the viewport (never clipped by the
 * shell's overflow), full height on phones, comfortable card on desktop, with a scrolling list,
 * untruncated text, per-item read state and the unread count in the header.
 *
 * `base` is the API root ('/api/client' or '/api/admin'); the endpoints match:
 *   GET  {base}/notifications            -> { notifications, unread }
 *   PUT  {base}/notifications/:id/read
 *   PUT  {base}/notifications/read-all   (optional ?type= / ?link=)
 */
export default function NotificationCenter({ base, queryKey, className }: { base: string; queryKey: string; className?: string }) {
  const { user } = useAuth();
  const { t, dir } = useTranslation();
  const ar = dir === 'rtl';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const res = await apiFetch(`${base}/notifications`, user);
      return res.ok ? res.json() : { notifications: [], unread: 0 };
    },
    enabled: !!user,
    refetchInterval: 60_000, // safety net — live pushes arrive instantly
  });

  const items: any[] = data?.notifications || [];
  const unread = Number(data?.unread || 0);

  // Escape closes, and the page behind stops scrolling while the panel is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const markRead = async (n: any) => {
    if (!n.readAt) {
      try { await apiFetch(`${base}/notifications/${n.id}/read`, user, { method: 'PUT' }); } catch { /* already gone */ }
      refetch();
      qc.invalidateQueries({ queryKey: [queryKey] });
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    try { await apiFetch(`${base}/notifications/read-all`, user, { method: 'PUT' }); } catch { /* ignore */ }
    refetch();
    qc.invalidateQueries({ queryKey: [queryKey] });
  };

  const relative = (value: string) => {
    const time = new Date(value).getTime();
    if (!Number.isFinite(time)) return '';
    const diff = Math.max(0, Date.now() - time);
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return t('notifications.now');
    if (mins < 60) return `${mins} ${t('notifications.minutesAgo')}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ${t('notifications.hoursAgo')}`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} ${t('notifications.daysAgo')}`;
    return new Date(value).toLocaleDateString();
  };

  const iconFor = (type: string) => {
    const kind = String(type || '').toLowerCase();
    if (kind.includes('ticket')) return LifeBuoy;
    if (kind.includes('payment')) return Wallet;
    if (kind.includes('order')) return ShoppingCart;
    if (kind.includes('affiliate')) return Users;
    if (kind.includes('referral')) return Handshake;
    return Bell;
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t('notifications.title')}
        aria-expanded={open}
        className={cn('relative flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface', className)}
      >
        <Bell className="h-[18px] w-[18px] shrink-0" />
        {unread > 0 && (
          <span className="absolute -end-1 -top-1 min-w-[18px] rounded-full bg-error px-1 text-center font-mono text-[10px] font-bold leading-[18px] text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/50 p-2 backdrop-blur-sm sm:p-4" dir={dir}
          onMouseDown={e => { if (e.currentTarget === e.target) setOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-label={t('notifications.title')}
            className="mt-14 flex max-h-[calc(100vh-4.5rem)] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface-container shadow-2xl">

            {/* header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-outline-variant px-4 py-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-base font-black text-on-surface">
                  <Bell className="h-4 w-4" />{t('notifications.title')}
                </h2>
                <p className="mt-0.5 text-xs text-on-surface-variant">
                  {unread > 0
                    ? <span className="font-bold text-error">{unread} {t('notifications.unreadCount')}</span>
                    : t('notifications.allRead')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {unread > 0 && (
                  <button onClick={markAll}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-high px-2.5 py-1.5 text-xs font-bold text-on-surface-variant transition-colors hover:text-on-surface">
                    <CheckCheck className="h-3.5 w-3.5" />{t('notifications.markAll')}
                  </button>
                )}
                <button onClick={() => setOpen(false)} aria-label={t('notifications.close')}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant transition-colors hover:text-on-surface">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* list — scrolls, nothing is truncated */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant"><Bell className="h-5 w-5" /></span>
                  <p className="text-sm font-bold text-on-surface">{t('notifications.empty')}</p>
                </div>
              ) : (
                items.map((n: any) => {
                  const Icon = iconFor(n.type);
                  return (
                    <button key={n.id} onClick={() => markRead(n)}
                      className={cn('flex w-full items-start gap-3 border-b border-outline-variant px-4 py-3.5 text-start transition-colors last:border-0 hover:bg-surface-container-high',
                        !n.readAt && 'bg-error/[.06]')}>
                      <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                        n.readAt ? 'bg-surface-container-high text-on-surface-variant' : 'bg-error/12 text-error')}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start gap-2">
                          <b className="min-w-0 flex-1 text-sm font-bold leading-snug text-on-surface">{n.title}</b>
                          {!n.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-error" />}
                        </span>
                        <span className="mt-1 block text-[13px] leading-relaxed text-on-surface-variant">{n.message}</span>
                        <span className="mt-1.5 flex items-center gap-1.5 font-mono text-[11px] text-on-surface-variant/80">
                          <Clock className="h-3 w-3" />{relative(n.createdAt)}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* footer */}
            {items.length > 0 && (
              <div className="shrink-0 border-t border-outline-variant px-4 py-2.5 text-center text-[11px] text-on-surface-variant">
                {t('notifications.showing')} ({items.length})
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
