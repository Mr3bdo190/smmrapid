import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { notify } from './notify';

/**
 * Live updates.
 *
 * Opens one SSE stream (`/api/events`) while the user is signed in and turns each server event into
 * a react-query invalidation, so balances, order rows and badges move the moment the server changes
 * instead of on the next poll. Orders and the dashboard keep their slow polling as a safety net for
 * restricted networks where EventSource is blocked.
 */
const INVALIDATE: Record<string, string[]> = {
  balance: ['client-me', 'client-dashboard', 'client-transactions', 'client-payments', 'admin-users', 'admin-payments', 'admin-dashboard'],
  order: ['client-orders', 'client-dashboard', 'admin-orders', 'admin-dashboard', 'admin-system-reports'],
  notification: ['client-notifications', 'admin-notifications'],
  'admin-queue': ['admin-notifications', 'admin-tickets', 'admin-payments', 'admin-dashboard'],
};

export function useLiveUpdates() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    if (typeof EventSource === 'undefined') return; // non-browser render (tests, SSR)

    let source: EventSource | null = null;
    let closed = false;
    let attempt = 0;
    let timer: any = null;

    const handle = (event: string) => (raw: MessageEvent) => {
      let data: any = {};
      try { data = JSON.parse(raw.data || '{}'); } catch { /* ignore malformed frame */ }
      for (const key of INVALIDATE[event] || []) qc.invalidateQueries({ queryKey: [key] });

      if (event === 'notification' && data.title) {
        notify.info(`${data.title}${data.message ? ` — ${data.message}` : ''}`);
      }
      if (event === 'admin-queue' && data.title) {
        notify.info(`${data.title}${data.message ? ` — ${data.message}` : ''}`);
      }
    };

    const connect = async () => {
      if (closed) return;
      try {
        const token = await user.getIdToken();
        source = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);
      } catch {
        return;
      }
      source.addEventListener('notification', handle('notification') as any);
      source.addEventListener('balance', handle('balance') as any);
      source.addEventListener('order', handle('order') as any);
      source.addEventListener('admin-queue', handle('admin-queue') as any);
      source.addEventListener('ready', () => { attempt = 0; });
      source.onerror = () => {
        source?.close();
        source = null;
        if (closed) return;
        attempt += 1;
        timer = setTimeout(connect, Math.min(30_000, 2_000 * attempt));
      };
    };

    connect();
    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      source?.close();
    };
  }, [user, qc]);
}
