/**
 * Live-update registry (server side).
 *
 * Every signed-in browser keeps one Server-Sent Events stream open against `/api/events`. This
 * module only tracks who is listening and writes events to them — it deliberately imports nothing
 * so both the API layer (server.ts) and the fulfilment engine (provider-engine.ts) can push
 * without creating an import cycle.
 *
 * Events currently emitted:
 *   ready         — sent once when the stream opens
 *   notification  — a notification row was created for this user (badge + toast)
 *   balance       — the wallet balance changed (credit, debit, refund)
 *   order         — an order changed status (dispatched, in progress, completed, canceled, refund)
 *   admin-queue   — something for the admin to look at (new ticket, support message, deposit request)
 */
export type LiveEvent = 'ready' | 'notification' | 'balance' | 'order' | 'admin-queue';

type Client = { res: any; since: number };

const clients = new Map<string, Set<Client>>();

export function sseAdd(userId: string, res: any) {
  const key = String(userId);
  if (!clients.has(key)) clients.set(key, new Set());
  clients.get(key)!.add({ res, since: Date.now() });
}

export function sseRemove(userId: string, res: any) {
  const key = String(userId);
  const set = clients.get(key);
  if (!set) return;
  for (const c of set) if (c.res === res) set.delete(c);
  if (!set.size) clients.delete(key);
}

export function ssePush(userId: string, event: LiveEvent, data: Record<string, any> = {}) {
  const set = clients.get(String(userId));
  if (!set?.size) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify({ ...data, at: Date.now() })}\n\n`;
  for (const c of set) {
    try { c.res.write(payload); }
    catch { /* the stream is gone; the 'close' handler removes it */ }
  }
}

/** How many streams this user has open (used by the health/debug endpoint). */
export function sseCount(userId?: string) {
  if (userId === undefined) {
    let total = 0;
    for (const set of clients.values()) total += set.size;
    return total;
  }
  return clients.get(String(userId))?.size || 0;
}
