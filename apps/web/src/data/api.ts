import type { User } from 'firebase/auth';
import { apiJson } from '../lib/api';
import type {
  GatewayInfo,
  LedgerEntry,
  PaymentGatewayKey,
  PublicPayment,
  ShahnawyMethod,
  OrderQuote,
  PublicNotification,
  PublicOrder,
  PublicService,
  PublicCategory,
  ServiceListResponse,
  TicketDetail,
  PublicTicket,
  WalletSummary,
} from './types';

/**
 * The API, as the screens call it: one thin function per endpoint, no logic beyond unwrapping the
 * envelope. Signatures take the signed-in user (or null) because every call needs an ID token —
 * keeping that explicit is what stops a page from quietly calling the API as nobody.
 */

type Envelope<T> = { success: true; data: T };

/* ── catalogue (public) ──────────────────────────────────────────────────────────────────────── */

export async function fetchServices(
  params: { category?: string; q?: string; page?: number; pageSize?: number; featured?: boolean } = {},
): Promise<ServiceListResponse> {
  const search = new URLSearchParams();
  if (params.category) search.set('category', params.category);
  if (params.q) search.set('q', params.q);
  if (params.page) search.set('page', String(params.page));
  if (params.pageSize) search.set('pageSize', String(params.pageSize));
  if (params.featured !== undefined) search.set('featured', String(params.featured));
  const suffix = search.toString();
  const { data } = await apiJson<Envelope<ServiceListResponse>>(
    `/api/catalog/services${suffix ? `?${suffix}` : ''}`,
    null,
  );
  return data;
}

export async function fetchService(slug: string): Promise<PublicService> {
  const { data } = await apiJson<Envelope<{ service: PublicService }>>(
    `/api/catalog/services/${encodeURIComponent(slug)}`,
    null,
  );
  return data.service;
}

export async function fetchCategories(): Promise<PublicCategory[]> {
  const { data } = await apiJson<Envelope<{ categories: PublicCategory[] }>>('/api/catalog/categories', null);
  return data.categories;
}

/* ── pricing (public) ────────────────────────────────────────────────────────────────────────── */

export async function quoteOrder(
  input: { serviceSlug: string; quantity: number; variantId?: string | null; couponCode?: string | null },
  user: User | null,
): Promise<OrderQuote> {
  const { data } = await apiJson<Envelope<{ quote: OrderQuote }>>('/api/pricing/quote', user, {
    method: 'POST',
    body: JSON.stringify({
      serviceSlug: input.serviceSlug,
      quantity: input.quantity,
      ...(input.variantId ? { variantId: input.variantId } : {}),
      ...(input.couponCode ? { couponCode: input.couponCode } : {}),
    }),
  });
  return data.quote;
}

/* ── orders ──────────────────────────────────────────────────────────────────────────────────── */

export async function fetchOrders(
  user: User | null,
  params: { status?: string; page?: number; pageSize?: number } = {},
): Promise<{ orders: PublicOrder[]; total: number; page: number; pageSize: number }> {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  if (params.page) search.set('page', String(params.page));
  if (params.pageSize) search.set('pageSize', String(params.pageSize));
  const suffix = search.toString();
  const { data } = await apiJson<
    Envelope<{ orders: PublicOrder[]; total?: number; page?: number; pageSize?: number }>
  >(`/api/orders${suffix ? `?${suffix}` : ''}`, user);
  return {
    orders: data.orders,
    total: data.total ?? data.orders.length,
    page: data.page ?? 1,
    pageSize: data.pageSize ?? data.orders.length,
  };
}

export async function fetchOrder(user: User | null, publicId: string): Promise<PublicOrder> {
  const { data } = await apiJson<Envelope<{ order: PublicOrder }>>(
    `/api/orders/${encodeURIComponent(publicId)}`,
    user,
  );
  return data.order;
}

export async function createOrder(
  user: User | null,
  input: { serviceSlug: string; target: string; quantity: number; variantId?: string | null; dripFeed?: unknown; couponCode?: string | null },
): Promise<PublicOrder> {
  const { data } = await apiJson<Envelope<{ order: PublicOrder }>>('/api/orders', user, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.order;
}

export async function repeatOrder(user: User | null, publicId: string): Promise<{ order: PublicOrder }> {
  const { data } = await apiJson<Envelope<{ order: PublicOrder }>>(
    `/api/orders/${encodeURIComponent(publicId)}/repeat`,
    user,
    { method: 'POST' },
  );
  return data;
}

/* ── wallet ──────────────────────────────────────────────────────────────────────────────────── */

export async function fetchWallet(user: User | null): Promise<WalletSummary> {
  const { data } = await apiJson<Envelope<WalletSummary>>('/api/wallet', user);
  return data;
}

export async function fetchLedger(
  user: User | null,
  params: { limit?: number; cursor?: string | null } = {},
): Promise<{ transactions: LedgerEntry[]; hasMore: boolean; nextCursor: string | null }> {
  const search = new URLSearchParams();
  if (params.limit) search.set('limit', String(params.limit));
  if (params.cursor) search.set('cursor', params.cursor);
  const suffix = search.toString();
  const { data } = await apiJson<Envelope<{ transactions: LedgerEntry[]; hasMore: boolean; nextCursor: string | null }>>(
    `/api/wallet/transactions${suffix ? `?${suffix}` : ''}`,
    user,
  );
  return data;
}

/* ── notifications ───────────────────────────────────────────────────────────────────────────── */

export async function fetchNotifications(
  user: User | null,
  params: { limit?: number } = {},
): Promise<{ notifications: PublicNotification[]; unread: number }> {
  const suffix = params.limit ? `?limit=${params.limit}` : '';
  const { data } = await apiJson<Envelope<{ notifications: PublicNotification[]; unread: number }>>(
    `/api/notifications${suffix}`,
    user,
  );
  return data;
}

export async function markNotificationRead(user: User | null, id: string): Promise<{ unread: number }> {
  const { data } = await apiJson<Envelope<{ unread: number }>>(
    `/api/notifications/${encodeURIComponent(id)}/read`,
    user,
    { method: 'POST' },
  );
  return data;
}

export async function markAllNotificationsRead(user: User | null): Promise<{ marked: number; unread: number }> {
  const { data } = await apiJson<Envelope<{ marked: number; unread: number }>>(
    '/api/notifications/read-all',
    user,
    { method: 'POST' },
  );
  return data;
}

/* ── support tickets ─────────────────────────────────────────────────────────────────────────── */

export async function fetchTickets(user: User | null): Promise<PublicTicket[]> {
  const { data } = await apiJson<Envelope<{ tickets: PublicTicket[] }>>('/api/tickets', user);
  return data.tickets;
}

export async function fetchTicket(user: User | null, publicId: string): Promise<TicketDetail> {
  const { data } = await apiJson<Envelope<{ ticket: TicketDetail }>>(
    `/api/tickets/${encodeURIComponent(publicId)}`,
    user,
  );
  return data.ticket;
}

export async function createTicket(
  user: User | null,
  input: { subject: string; body: string; category?: string | null },
): Promise<PublicTicket> {
  const { data } = await apiJson<Envelope<{ ticket: PublicTicket }>>('/api/tickets', user, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.ticket;
}

export async function replyToTicket(user: User | null, publicId: string, body: string): Promise<TicketDetail> {
  const { data } = await apiJson<Envelope<{ ticket: TicketDetail }>>(
    `/api/tickets/${encodeURIComponent(publicId)}/messages`,
    user,
    { method: 'POST', body: JSON.stringify({ body }) },
  );
  return data.ticket;
}

export async function closeTicket(user: User | null, publicId: string): Promise<PublicTicket> {
  const { data } = await apiJson<Envelope<{ ticket: PublicTicket }>>(
    `/api/tickets/${encodeURIComponent(publicId)}/close`,
    user,
    { method: 'POST' },
  );
  return data.ticket;
}

/* ── deposits ────────────────────────────────────────────────────────────────────────────────── */

export async function fetchGateways(user: User | null): Promise<GatewayInfo[]> {
  const { data } = await apiJson<Envelope<{ gateways: GatewayInfo[] }>>('/api/payments/gateways', user);
  return data.gateways;
}

export async function createDeposit(
  user: User | null,
  input: { gateway: PaymentGatewayKey; amountMinor: number; method?: ShahnawyMethod | null; walletNumber?: string | null },
): Promise<PublicPayment> {
  const { data } = await apiJson<Envelope<{ payment: PublicPayment }>>('/api/payments/deposits', user, {
    method: 'POST',
    body: JSON.stringify({
      gateway: input.gateway,
      amountMinor: input.amountMinor,
      ...(input.method ? { method: input.method } : {}),
      ...(input.walletNumber ? { walletNumber: input.walletNumber } : {}),
    }),
  });
  return data.payment;
}

export async function fetchDeposits(user: User | null): Promise<PublicPayment[]> {
  const { data } = await apiJson<Envelope<{ payments: PublicPayment[] }>>('/api/payments/deposits', user);
  return data.payments;
}

export async function fetchDeposit(user: User | null, publicId: string): Promise<PublicPayment> {
  const { data } = await apiJson<Envelope<{ payment: PublicPayment }>>(
    `/api/payments/deposits/${encodeURIComponent(publicId)}`,
    user,
  );
  return data.payment;
}

/**
 * Asks the gateway what really happened. The response is only an outcome label — the balance moves
 * server-side, so the page reloads the account afterwards rather than trusting this call.
 */
export async function confirmDeposit(user: User | null, publicId: string): Promise<{ status?: string }> {
  const { data } = await apiJson<Envelope<{ status?: string }>>(
    `/api/payments/deposits/${encodeURIComponent(publicId)}/confirm`,
    user,
    { method: 'POST' },
  );
  return data;
}
