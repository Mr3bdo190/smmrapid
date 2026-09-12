import dns from 'node:dns';
import { promises as dnsPromises } from 'node:dns';
import net from 'node:net';
dns.setDefaultResultOrder('ipv4first');
import crypto from 'node:crypto';
import path from 'node:path';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import { eq, desc, asc, and, inArray, isNull, sql } from 'drizzle-orm';
import { db } from './src/db/index';
import {
  users, orders, payments, tickets, ticketMessages, services, categories, settings,
  providers, shortlinks, shortlinkClaims, shortlinkTokens, raffles, raffleTickets,
  mysteryBoxTiers, walletLedger, referralClicks, affiliateCommissions, auditLogs,
  systemReports, contactMessages, refillRequests
} from './src/db/schema';
import { adminAuth } from './src/lib/firebase-admin';
import { ProviderClient, placeOrderToProvider, startProviderWorker, checkOrderStatus, refundOrderOnce } from './src/lib/provider-engine';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');
app.set('trust proxy', 1);

// Security headers (no extra dependency needed).
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https:; " +
    "frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );
  if (isProd) res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  next();
});

// The public SMM API is meant to be called from third-party servers/scripts that pass
// an API key in the body (like JAP's /api/v2), so it is safe to allow cross-origin requests.
// /api/v2 is the primary, documented path; /api/v1 is kept as a permanent alias for older integrations.
app.use(['/api/v1', '/api/v2'], (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));
const globalLimiter = rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many authentication attempts', code: 'RATE_LIMITED' } });
const apiLimiter = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false, message: { error: 'API rate limit exceeded', code: 'RATE_LIMITED' } });
const contactLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 5, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many messages sent — please try again later', code: 'RATE_LIMITED' } });
app.use(globalLimiter);

const apiError = (res: express.Response, status: number, message: string, code = 'ERROR') =>
  res.status(status).json({ error: message, code });

const num = (v: unknown) => typeof v === 'number' ? v : Number(v);
const money = (v: number) => Math.round((v + Number.EPSILON) * 10000) / 10000;
const positiveMoney = (v: unknown) => Number.isFinite(num(v)) && num(v) > 0;
const uuidLike = (v: unknown) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const validUrl = (v: unknown) => { try { const u = new URL(String(v)); return ['http:', 'https:'].includes(u.protocol); } catch { return false; } };

// Provider sync jobs are tracked in-process so admins can see live progress instead of
// waiting on one long HTTP request. The actual service rows are persisted in Postgres.
type ProviderSyncJob = {
  id: string; providerId: string; status: 'queued'|'running'|'completed'|'failed';
  total: number; processed: number; created: number; updated: number; skipped: number;
  startedAt: string; finishedAt?: string; error?: string;
};
const providerSyncJobs = new Map<string, ProviderSyncJob>();
const activeProviderSync = new Map<string, string>();
const buildProviderDescription = (raw: any, name: string, rate: number, min: number, max: number, refillable: boolean, cancelable: boolean, dripfeed: boolean) => {
  const source = String(raw?.description ?? raw?.desc ?? '').trim();
  if (source) return source.slice(0, 5000);
  const parts = [`${name} — provider service.`];
  if (Number.isFinite(rate)) parts.push(`Provider ${min === 1 && max === 1 ? 'price per item' : 'rate per 1K'}: ${rate}.`);
  parts.push(`Minimum: ${min.toLocaleString()}. Maximum: ${max.toLocaleString()}.`);
  parts.push(`Refill: ${refillable ? 'Available' : 'Not available'}. Cancel: ${cancelable ? 'Available' : 'Not available'}.`);
  if (dripfeed) parts.push('Drip-feed: available.');
  if (raw?.type) parts.push(`Type: ${String(raw.type)}.`);
  return parts.join(' ').slice(0, 5000);
};

const hashApiKey = (key: string) => crypto.createHash('sha256').update(key).digest('hex');
const isPrivateIp = (ip: string) => {
  if (net.isIPv4(ip)) {
    const [a,b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  if (net.isIPv6(ip)) {
    const x = ip.toLowerCase();
    return x === '::1' || x === '::' || x.startsWith('fc') || x.startsWith('fd') || x.startsWith('fe80:');
  }
  return false;
};
const assertSafeProviderUrl = async (value: string) => {
  const u = new URL(value);
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Provider URL must use HTTP(S)');
  const hostname = u.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === 'metadata.google.internal') throw new Error('Provider host is not allowed');
  if (net.isIP(hostname) && isPrivateIp(hostname)) throw new Error('Provider host is not allowed');
  try {
    const answers = await dnsPromises.lookup(hostname, { all: true });
    if (answers.some(a => isPrivateIp(a.address))) throw new Error('Provider host resolves to a private address');
  } catch (e:any) {
    if (e?.message === 'Provider host resolves to a private address') throw e;
    // DNS failure is allowed here; fetch will report the actual connectivity error.
  }
};

async function audit(adminId: string, actionType: string, entityType: string, entityId: string, details?: string, oldValue?: string, newValue?: string) {
  await db.insert(auditLogs).values({ adminId, actionType, entityType, entityId, details, oldValue, newValue });
}

async function creditWallet(tx: any, userId: string, amount: number, description: string, referenceId?: string) {
  const a = money(amount);
  if (!(a > 0)) throw new Error('Invalid credit amount');
  const [u] = await tx.select().from(users).where(eq(users.id, userId)).for('update');
  if (!u) throw new Error('User not found');
  const next = money(num(u.balance) + a);
  await tx.update(users).set({ balance: next.toFixed(4) }).where(eq(users.id, userId));
  await tx.insert(walletLedger).values({ id: crypto.randomUUID(), userId, amount: a.toFixed(4), type: 'credit', description, referenceId: referenceId ?? null, createdAt: new Date() });
}

async function debitWallet(tx: any, userId: string, amount: number, description: string, referenceId?: string) {
  const a = money(amount);
  if (!(a > 0)) throw new Error('Invalid debit amount');
  const [u] = await tx.select().from(users).where(eq(users.id, userId)).for('update');
  if (!u) throw new Error('User not found');
  const current = num(u.balance);
  if (current < a) throw new Error('Insufficient balance');
  const next = money(current - a);
  await tx.update(users).set({ balance: next.toFixed(4) }).where(eq(users.id, userId));
  await tx.insert(walletLedger).values({ id: crypto.randomUUID(), userId, amount: (-a).toFixed(4), type: 'debit', description, referenceId: referenceId ?? null, createdAt: new Date() });
}

const requireAuth = async (req: any, res: any, next: any) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return apiError(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  const token = header.slice(7).trim();
  if (!token) return apiError(res, 401, 'Unauthorized', 'UNAUTHORIZED');

  let decoded: any;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch (e: any) {
    console.error('[auth] Firebase token verification failed:', e?.code || e?.message || e);
    return apiError(res, 401, 'Firebase authentication failed. Please sign in again.', 'INVALID_TOKEN');
  }

  try {
    req.user = decoded;
    let userRecord = await db.query.users.findFirst({ where: eq(users.uid, decoded.uid) });
    if (!userRecord) {
      const email = decoded.email;
      if (!email) return apiError(res, 400, 'Verified account has no email', 'INVALID_ACCOUNT');
      const referralCode = crypto.randomBytes(6).toString('hex').toUpperCase();
      // New accounts are regular users by default. Admin promotion is explicit in the database.
      try {
        const [created] = await db.insert(users).values({ uid: decoded.uid, email, name: decoded.name || null, role: 'user', status: 'active', referralCode }).returning();
        userRecord = created;
      } catch (insertError: any) {
        // A concurrent first request may have created the same user.
        userRecord = await db.query.users.findFirst({ where: eq(users.uid, decoded.uid) });
        if (!userRecord) throw insertError;
      }
    }
    if (userRecord.status !== 'active') return apiError(res, 403, 'Account is not active', 'ACCOUNT_DISABLED');
    req.dbUser = userRecord;
    next();
  } catch (e: any) {
    console.error('[auth] Database/user sync failed:', e?.code || e?.message || e);
    return apiError(res, 503, 'Authentication succeeded, but the account database is unavailable.', 'AUTH_DB_UNAVAILABLE');
  }
};
const requireAdmin = (req: any, res: any, next: any) => req.dbUser?.role === 'admin' ? next() : apiError(res, 403, 'Admin access required', 'FORBIDDEN');

app.get('/api/health', async (_req, res) => {
  try { await db.execute(sql`select 1`); res.json({ ok: true, service: 'smm-panel', time: new Date().toISOString() }); }
  catch { apiError(res, 503, 'Database unavailable', 'DB_UNAVAILABLE'); }
});

// Public configuration: never expose secrets.
app.get('/api/client/config', async (_req, res) => {
  const rows = await db.select().from(settings);
  const s = Object.fromEntries(rows.map(x => [x.key, x.value]));
  res.json({ siteName: s.site_name || 'RapidSMM', currencySymbol: '$', currencyCode: 'USD', vodafoneCashNumber: s.vodafone_cash_number || '', shahnawyEnabled: s.shahnawy_enabled === 'true', shahnawyMerchantWalletNumber: s.shahnawy_merchant_wallet_number || s.vodafone_cash_number || '', shahnawyMinAmount: num(s.shahnawy_min_amount || '5'), shahnawyMaxAmount: num(s.shahnawy_max_amount || '10000'), siteDescription: s.site_description || '', supportEmail: s.support_email || process.env.SUPPORT_EMAIL || 'support@smmrapid.store', siteLogo: s.site_logo || '', usdExchangeRate: num(s.usd_exchange_rate || '50'), heleketCurrency: process.env.HELEKET_CURRENCY || 'USD', heleketEnabled: Boolean(process.env.HELEKET_MERCHANT_ID && process.env.HELEKET_PAYMENT_API_KEY) });
});

// Public, read-only preview used by the landing page — no pricing/account secrets, safe to expose logged-out.
app.get('/api/public/showcase', async (_req, res) => {
  const [[catRow], [svcRow]] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(categories).where(eq(categories.status, 'active')),
    db.select({ count: sql<number>`count(*)` }).from(services).where(eq(services.status, 'active')),
  ]);
  const preview = await db.query.services.findMany({ where: eq(services.status, 'active'), with: { category: true }, orderBy: [asc(services.sortOrder)], limit: 8 });
  res.json({
    categoryCount: Number(catRow?.count || 0),
    serviceCount: Number(svcRow?.count || 0),
    services: preview.filter(s => s.category?.status === 'active').map(s => ({ id: s.id, name: s.name, category: s.category?.name || '', rate: s.pricePer1k, min: s.minQuantity, max: s.maxQuantity })),
  });
});

// Full public catalog of everything for sale, grouped by category — required so anonymous
// visitors (including payment-processor reviewers) can see the actual goods/services on offer
// without needing to create an account first.
app.get('/api/public/services', async (_req, res) => {
  const cats = await db.select().from(categories).where(eq(categories.status, 'active')).orderBy(categories.sortOrder);
  const svcs = await db.query.services.findMany({ where: eq(services.status, 'active'), orderBy: [asc(services.sortOrder)] });
  const grouped = cats.map(c => ({
    id: c.id,
    name: c.name,
    services: svcs.filter(s => s.categoryId === c.id).map(s => ({ id: s.id, name: s.name, description: s.description, rate: s.pricePer1k, min: s.minQuantity, max: s.maxQuantity })),
  })).filter(c => c.services.length > 0);
  res.json({ categories: grouped });
});

// Public contact form — no login required. Anyone (including a payment-processor reviewer)
// needs a working way to reach support before they have an account.
app.post('/api/public/contact', contactLimiter, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim();
    const subject = String(req.body?.subject || '').trim();
    const message = String(req.body?.message || '').trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (name.length < 2 || name.length > 100) return apiError(res, 400, 'Please enter your name', 'INVALID_NAME');
    if (!emailOk || email.length > 200) return apiError(res, 400, 'Please enter a valid email address', 'INVALID_EMAIL');
    if (subject.length < 3 || subject.length > 200) return apiError(res, 400, 'Please enter a subject', 'INVALID_SUBJECT');
    if (message.length < 10 || message.length > 5000) return apiError(res, 400, 'Message must be between 10 and 5000 characters', 'INVALID_MESSAGE');
    await db.insert(contactMessages).values({ name, email, subject, message });
    res.status(201).json({ success: true });
  } catch (e: any) { apiError(res, 400, e.message || 'Failed to send message', 'CONTACT_ERROR'); }
});

app.get('/api/admin/contact-messages', requireAuth, requireAdmin, async (_req, res) => {
  res.json(await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(500));
});
app.put('/api/admin/contact-messages/:id/status', requireAuth, requireAdmin, async (req, res) => {
  if (!['New', 'Read', 'Replied'].includes(req.body?.status)) return apiError(res, 400, 'Invalid status');
  const [m] = await db.update(contactMessages).set({ status: req.body.status }).where(eq(contactMessages.id, req.params.id)).returning();
  if (!m) return apiError(res, 404, 'Message not found', 'NOT_FOUND');
  res.json(m);
});

app.post('/api/auth/sync', authLimiter, requireAuth, async (req: any, res) => {
  let user = req.dbUser;
  const referralCode = typeof req.body?.referralCode === 'string' ? req.body.referralCode.trim().toUpperCase() : '';
  if (!user.referredBy && referralCode) {
    const ref = await db.query.users.findFirst({ where: eq(users.referralCode, referralCode) });
    if (ref && ref.id !== user.id) {
      const [updated] = await db.update(users).set({ referredBy: ref.id }).where(and(eq(users.id, user.id), isNull(users.referredBy))).returning();
      if (updated) user = updated;
    }
  }
  res.json(user);
});

// Client profile/dashboard
app.get('/api/client/me', requireAuth, async (req: any, res) => {
  let u = req.dbUser;
  if (!u.referralCode) {
    for (let i = 0; i < 5 && !u.referralCode; i++) {
      const code = crypto.randomBytes(6).toString('hex').toUpperCase();
      try { const [updated] = await db.update(users).set({ referralCode: code }).where(and(eq(users.id, u.id), isNull(users.referralCode))).returning(); if (updated) u = updated; else u = (await db.query.users.findFirst({ where: eq(users.id, u.id) })) || u; } catch { /* retry a unique code */ }
    }
  }
  res.json(u);
});
app.post('/api/client/api-key/generate', requireAuth, async (req: any, res) => { const key = `smm_${crypto.randomBytes(24).toString('hex')}`; const [u] = await db.update(users).set({ apiKey: key }).where(eq(users.id, req.dbUser.id)).returning({ apiKey: users.apiKey }); res.json({ success: true, apiKey: u.apiKey }); });
app.get('/api/client/dashboard', requireAuth, async (req: any, res) => {
  const rows = await db.select().from(orders).where(eq(orders.userId, req.dbUser.id));
  res.json({ totalOrders: rows.length, totalSpent: money(rows.reduce((a, o) => a + num(o.charge), 0)).toFixed(2), balance: req.dbUser.balance });
});

app.get('/api/client/services', requireAuth, async (_req, res) => {
  const rows = await db.query.services.findMany({ where: eq(services.status, 'active'), with: { category: true, provider: true }, orderBy: [asc(services.sortOrder)] });
  res.json(rows.filter(x => x.category?.status === 'active' && (!x.providerId || x.provider?.status === 'active')));
});

app.get('/api/client/orders', requireAuth, async (req: any, res) => {
  const rows = await db.query.orders.findMany({ where: eq(orders.userId, req.dbUser.id), orderBy: [desc(orders.createdAt)], with: { service: true } });
  res.json(rows);
});

// Refill: allowed once an order has run (Completed/Partial) and the service supports it.
// Shared by the client UI route and the public API's `refill` action.
async function requestRefillForOrder(orderId: string, userId: string) {
  const o = await db.query.orders.findFirst({ where: eq(orders.id, orderId), with: { service: true } });
  if (!o || o.userId !== userId) { const e: any = new Error('Order not found'); e.status = 404; e.code = 'NOT_FOUND'; throw e; }
  if (!o.service?.refillable) { const e: any = new Error('This service does not support refill'); e.status = 400; e.code = 'NOT_REFILLABLE'; throw e; }
  if (!['Completed', 'Partial'].includes(o.status)) { const e: any = new Error('Order is not eligible for refill yet'); e.status = 400; e.code = 'NOT_ELIGIBLE'; throw e; }
  if (!o.providerOrderId) { const e: any = new Error('Order has no provider reference'); e.status = 400; e.code = 'NOT_ELIGIBLE'; throw e; }
  const existing = await db.query.refillRequests.findFirst({ where: and(eq(refillRequests.orderId, o.id), eq(refillRequests.status, 'Pending')) });
  if (existing) { const e: any = new Error('A refill request is already pending for this order'); e.status = 409; e.code = 'ALREADY_REQUESTED'; throw e; }
  const [service] = await db.select().from(services).where(eq(services.id, o.serviceId));
  if (!service?.providerId) { const e: any = new Error('No provider configured for this service'); e.status = 400; e.code = 'NOT_ELIGIBLE'; throw e; }
  const [provider] = await db.select().from(providers).where(and(eq(providers.id, service.providerId), eq(providers.isDeleted, false)));
  if (!provider || provider.status !== 'active') { const e: any = new Error('Provider unavailable'); e.status = 503; e.code = 'PROVIDER_UNAVAILABLE'; throw e; }
  const result = await new ProviderClient(provider.apiUrl, provider.apiKey).refill(o.providerOrderId);
  if (result?.error || !result?.refill) { const e: any = new Error(result?.error || 'Provider refused the refill request'); e.status = 502; e.code = 'PROVIDER_ERROR'; throw e; }
  const [r] = await db.insert(refillRequests).values({ orderId: o.id, userId, providerRefillId: String(result.refill), status: 'Pending' }).returning();
  return r;
}
app.post('/api/client/orders/:id/refill', requireAuth, async (req: any, res) => {
  try { const r = await requestRefillForOrder(req.params.id, req.dbUser.id); res.status(201).json({ success: true, refillRequest: r }); }
  catch (e: any) { apiError(res, e.status || 400, e.message || 'Refill request failed', e.code || 'REFILL_ERROR'); }
});

// Cancel: only while an order has not finished running, and only if the service supports it.
// Shared by the client UI route and the public API's `cancel` action.
async function requestCancelForOrder(orderId: string, userId: string) {
  const o = await db.query.orders.findFirst({ where: eq(orders.id, orderId), with: { service: true } });
  if (!o || o.userId !== userId) { const e: any = new Error('Order not found'); e.status = 404; e.code = 'NOT_FOUND'; throw e; }
  if (!o.service?.cancelable) { const e: any = new Error('This service does not support cancellation'); e.status = 400; e.code = 'NOT_CANCELABLE'; throw e; }
  if (!['Pending', 'Processing', 'In Progress'].includes(o.status)) { const e: any = new Error('Order can no longer be canceled'); e.status = 400; e.code = 'NOT_ELIGIBLE'; throw e; }
  if (o.cancelRequested) { const e: any = new Error('Cancellation already requested'); e.status = 409; e.code = 'ALREADY_REQUESTED'; throw e; }
  if (!o.providerOrderId) {
    const refunded = await refundOrderOnce(o.id, num(o.charge), 'Canceled before dispatch');
    if (!refunded) { const e: any = new Error('Order already resolved'); e.status = 409; e.code = 'ALREADY_RESOLVED'; throw e; }
    return { refunded: true };
  }
  const [service] = await db.select().from(services).where(eq(services.id, o.serviceId));
  if (!service?.providerId) { const e: any = new Error('No provider configured for this service'); e.status = 400; e.code = 'NOT_ELIGIBLE'; throw e; }
  const [provider] = await db.select().from(providers).where(and(eq(providers.id, service.providerId), eq(providers.isDeleted, false)));
  if (!provider) { const e: any = new Error('Provider unavailable'); e.status = 503; e.code = 'PROVIDER_UNAVAILABLE'; throw e; }
  await db.update(orders).set({ cancelRequested: true }).where(eq(orders.id, o.id));
  const result = await new ProviderClient(provider.apiUrl, provider.apiKey).cancel(o.providerOrderId);
  if (result?.error) {
    await db.update(orders).set({ cancelRequested: false }).where(eq(orders.id, o.id));
    const e: any = new Error(result.error); e.status = 502; e.code = 'PROVIDER_ERROR'; throw e;
  }
  const refunded = await refundOrderOnce(o.id, num(o.charge), 'Canceled by provider');
  return { refunded };
}
app.post('/api/client/orders/:id/cancel', requireAuth, async (req: any, res) => {
  try { const r = await requestCancelForOrder(req.params.id, req.dbUser.id); res.json({ success: true, ...r }); }
  catch (e: any) { apiError(res, e.status || 400, e.message || 'Cancel request failed', e.code || 'CANCEL_ERROR'); }
});

function isSingleUnitService(service: any) {
  return Number(service?.minQuantity) === 1 && Number(service?.maxQuantity) === 1;
}

function calculateServiceCharge(service: any, quantity: number) {
  // Standard SMM services are priced per 1,000. A service whose only valid
  // quantity is exactly 1 is treated as a single-unit/package service: the
  // provider's displayed rate is the price for that one item, not 1/1000 of it.
  return isSingleUnitService(service) ? money(num(service.pricePer1k) * quantity) : money(num(service.pricePer1k) * quantity / 1000);
}

function calculateProviderCost(service: any, quantity: number) {
  return isSingleUnitService(service) ? money(num(service.providerPrice) * quantity) : money(num(service.providerPrice) * quantity / 1000);
}

async function validateOrderInput(serviceId: unknown, link: unknown, quantity: unknown) {
  if (!uuidLike(serviceId) || typeof link !== 'string' || link.trim().length < 1 || link.length > 2048) throw new Error('Invalid order data');
  const service = await db.query.services.findFirst({ where: eq(services.id, String(serviceId)), with: { category: true, provider: true } });
  if (!service || service.status !== 'active' || service.category?.status !== 'active') throw new Error('Service is unavailable');

  const singleUnit = isSingleUnitService(service);
  // Single-unit/package services may receive an email, username, license key,
  // account identifier, or another provider-specific value instead of a URL.
  if (!singleUnit && !validUrl(link.trim())) throw new Error('A valid URL is required for this service');

  const rawQ = quantity === undefined || quantity === null || quantity === '' ? (singleUnit ? 1 : NaN) : Number(quantity);
  if (!Number.isInteger(rawQ) || rawQ <= 0) throw new Error('Invalid quantity');
  const q = singleUnit ? 1 : rawQ;
  if (!singleUnit && (q < service.minQuantity || q > service.maxQuantity)) throw new Error(`Quantity must be between ${service.minQuantity} and ${service.maxQuantity}`);
  if (singleUnit && rawQ !== 1) throw new Error('This service accepts exactly 1 item');
  const charge = calculateServiceCharge(service, q);
  return { service, q, charge, singleUnit };
}

app.post('/api/client/orders', requireAuth, async (req: any, res) => {
  try {
    const { service, q, charge } = await validateOrderInput(req.body?.serviceId, req.body?.link, req.body?.quantity);
    let orderId = '';
    await db.transaction(async tx => {
      await debitWallet(tx, req.dbUser.id, charge, `Order charge: ${service.name}`);
      const [o] = await tx.insert(orders).values({ userId: req.dbUser.id, serviceId: service.id, link: req.body.link.trim(), quantity: q, charge: charge.toFixed(4), cost: calculateProviderCost(service, q).toFixed(4), status: 'Pending' }).returning();
      orderId = o.id;
    });
    placeOrderToProvider(orderId).catch(err => console.error('provider order error', err));
    res.status(201).json({ success: true, orderId });
  } catch (e: any) { apiError(res, 400, e.message || 'Invalid order', 'ORDER_ERROR'); }
});

app.post('/api/client/orders/mass', requireAuth, async (req: any, res) => {
  try {
    if (typeof req.body?.ordersText !== 'string') throw new Error('No orders provided');
    const lines = req.body.ordersText.split(/\r?\n/).map((x: string) => x.trim()).filter(Boolean);
    if (!lines.length || lines.length > 100) throw new Error('Provide 1 to 100 orders');
    const parsed: any[] = [];
    let total = 0;
    for (const line of lines) {
      const parts = line.split('|').map((x: string) => x.trim());
      const serviceId = parts[0];
      const link = parts[1];
      const qty = parts.length >= 3 ? parts[2] : undefined;
      const { service, q, charge } = await validateOrderInput(serviceId, link, qty);
      parsed.push({ service, link, q, charge }); total += charge;
    }
    total = money(total);
    const ids: string[] = [];
    await db.transaction(async tx => {
      await debitWallet(tx, req.dbUser.id, total, `Mass order (${parsed.length} orders)`);
      for (const p of parsed) {
        const [o] = await tx.insert(orders).values({ userId: req.dbUser.id, serviceId: p.service.id, link: p.link, quantity: p.q, charge: p.charge.toFixed(4), cost: calculateProviderCost(p.service, p.q).toFixed(4), status: 'Pending' }).returning();
        ids.push(o.id);
      }
    });
    for (const id of ids) placeOrderToProvider(id).catch(err => console.error(err));
    res.status(201).json({ success: true, orderIds: ids, message: `${ids.length} orders successfully placed` });
  } catch (e: any) { apiError(res, 400, e.message || 'Mass order failed', 'MASS_ORDER_ERROR'); }
});

// Wallet/payment
app.get('/api/client/payments', requireAuth, async (req: any, res) => res.json(await db.query.payments.findMany({ where: eq(payments.userId, req.dbUser.id), orderBy: [desc(payments.createdAt)] })));
app.get('/api/client/transactions', requireAuth, async (req: any, res) => res.json(await db.select().from(walletLedger).where(eq(walletLedger.userId, req.dbUser.id)).orderBy(desc(walletLedger.createdAt))));
app.post('/api/client/payments', requireAuth, async (req: any, res) => {
  // Manual payment methods (Vodafone Cash) are always entered in EGP and converted to the
  // site's base currency (USD) using the admin-configured rate, so an admin approving this
  // later credits the correct USD amount regardless of what exchange rate was set at the time.
  const amountEgp = num(req.body?.amount);
  if (!positiveMoney(amountEgp) || amountEgp < 1 || amountEgp > 10000000) return apiError(res, 400, 'Invalid amount', 'INVALID_AMOUNT');
  const method = typeof req.body?.method === 'string' && req.body.method.length <= 50 ? req.body.method : 'Vodafone Cash';
  const details = req.body?.transactionDetails && typeof req.body.transactionDetails === 'object' ? req.body.transactionDetails : {};
  const settingsRows = await db.select().from(settings);
  const rate = num(settingsRows.find(s => s.key === 'usd_exchange_rate')?.value ?? '50');
  if (!Number.isFinite(rate) || rate <= 0) return apiError(res, 503, 'Exchange rate is not configured — set it in Admin Settings', 'RATE_NOT_CONFIGURED');
  const usdAmount = money(amountEgp / rate);
  if (!positiveMoney(usdAmount)) return apiError(res, 400, 'Invalid amount', 'INVALID_AMOUNT');
  const [p] = await db.insert(payments).values({
    userId: req.dbUser.id,
    amount: usdAmount.toFixed(4),
    method,
    status: 'Pending',
    transactionDetails: { ...details, egpAmount: amountEgp.toFixed(2), rate },
  }).returning();
  res.status(201).json(p);
});

const applyAffiliateCommission = async (tx:any, payment:any) => {
  const [u] = await tx.select().from(users).where(eq(users.id, payment.userId));
  if (!u?.referredBy) return;
  const [existing] = await tx.select().from(affiliateCommissions).where(eq(affiliateCommissions.paymentId, payment.id));
  if (existing) return;
  const settingsRows = await tx.select().from(settings);
  const pct = Math.max(0, Math.min(100, num(settingsRows.find((s:any) => s.key === 'affiliate_commission_percentage')?.value || 5)));
  const commission = money(num(payment.amount) * pct / 100);
  if (commission > 0) {
    await tx.insert(affiliateCommissions).values({ affiliateId: u.referredBy, referredUserId: u.id, paymentId: payment.id, amount: commission.toFixed(4) });
    await creditWallet(tx, u.referredBy, commission, `Affiliate commission from ${u.email}`, payment.id);
  }
};

const GATEWAY_VERIFIED_METHODS = new Set(['Heleket', 'المحفظة الإلكترونية']);
const paymentApprove = async (paymentId: string, adminId: string) => {
  return db.transaction(async tx => {
    const [p] = await tx.select().from(payments).where(eq(payments.id, paymentId)).for('update');
    if (!p) throw new Error('Payment not found');
    if (GATEWAY_VERIFIED_METHODS.has(p.method)) throw Object.assign(new Error(`${p.method} payments are confirmed automatically by server-side gateway verification and cannot be approved manually — approving without a real webhook would credit a wallet for a payment that was never verified.`), { status: 400 });
    if (p.status !== 'Pending') return false;
    await tx.update(payments).set({ status: 'Approved', resolvedAt: new Date() }).where(eq(payments.id, p.id));
    await creditWallet(tx, p.userId, num(p.amount), `Funds added via ${p.method}`, p.id);
    await applyAffiliateCommission(tx, p);
    return true;
  });
};
app.put('/api/admin/payments/:id/approve', requireAuth, requireAdmin, async (req: any, res) => { try { const changed = await paymentApprove(req.params.id, req.dbUser.id); if (!changed) return apiError(res, 409, 'Payment already resolved', 'ALREADY_RESOLVED'); await audit(req.dbUser.id, 'APPROVE_PAYMENT', 'PAYMENT', req.params.id); res.json({ success: true }); } catch (e: any) { apiError(res, e.status || 400, e.message); } });
app.put('/api/admin/payments/:id/reject', requireAuth, requireAdmin, async (req: any, res) => { try { await db.transaction(async tx => { const [p] = await tx.select().from(payments).where(eq(payments.id, req.params.id)).for('update'); if (!p) throw new Error('Payment not found'); if (GATEWAY_VERIFIED_METHODS.has(p.method)) throw Object.assign(new Error(`${p.method} payments are resolved automatically by server-side gateway verification and cannot be rejected manually. If it's genuinely stuck, wait for the invoice to expire.`), { status: 400 }); if (p.status !== 'Pending') throw new Error('Payment already resolved'); await tx.update(payments).set({ status: 'Rejected', resolvedAt: new Date() }).where(eq(payments.id, p.id)); }); await audit(req.dbUser.id, 'REJECT_PAYMENT', 'PAYMENT', req.params.id); res.json({ success: true }); } catch (e: any) { apiError(res, e.status || 400, e.message); } });

// Heleket crypto payment gateway.
// API authentication: MD5(base64(JSON body) + payment API key).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const heleketJson = (value: any) => JSON.stringify(value).replace(/\\\//g, '\\/');
const heleketSign = (body: string, apiKey: string) => crypto.createHash('md5').update(Buffer.from(body).toString('base64') + apiKey).digest('hex');
// Reads + validates the Heleket credentials once per call so a bad/placeholder value in
// Render's env vars fails fast with a message that says exactly what to fix, instead of a
// confusing raw "Merchant unknown" round-trip to Heleket's servers.
function getHeleketCredentials() {
  const merchant = (process.env.HELEKET_MERCHANT_ID || '').trim();
  const apiKey = (process.env.HELEKET_PAYMENT_API_KEY || '').trim();
  if (!merchant || !apiKey) {
    throw Object.assign(new Error('Heleket is not configured — set HELEKET_MERCHANT_ID and HELEKET_PAYMENT_API_KEY'), { code: 'GATEWAY_NOT_CONFIGURED' });
  }
  if (!UUID_RE.test(merchant)) {
    // This is almost always the cause of a "Merchant unknown" error from Heleket: HELEKET_MERCHANT_ID
    // is missing, still the .env.example placeholder, or the API key was pasted into the wrong field.
    // Fix: Heleket dashboard → Settings → copy the "Merchant ID" (a UUID) into HELEKET_MERCHANT_ID on Render.
    throw Object.assign(new Error("Heleket merchant ID is not a valid UUID — check HELEKET_MERCHANT_ID in your Render environment variables against your Heleket dashboard's Settings page"), { code: 'INVALID_MERCHANT_ID' });
  }
  return { merchant, apiKey };
}
const heleketApiPost = async (pathName: string, payload: any) => {
  const { merchant, apiKey } = getHeleketCredentials();
  const body = heleketJson(payload);
  const response = await fetch(`https://api.heleket.com${pathName}`, {
    method: 'POST',
    headers: { merchant, sign: heleketSign(body, apiKey), 'Content-Type': 'application/json' },
    body,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || Number(data.state) !== 0) {
    const rawMessage = data?.message || data?.result?.message || `Heleket API error (${response.status})`;
    console.error('Heleket API rejected the request:', rawMessage, '— full response:', JSON.stringify(data));
    // "Merchant unknown" / similar auth-layer messages mean Heleket doesn't recognize the merchant
    // UUID at all — that's a dashboard/env-var mismatch, not something a retry will fix.
    if (/merchant/i.test(rawMessage) && /unknown|not found|invalid/i.test(rawMessage)) {
      throw Object.assign(new Error('Heleket does not recognize this merchant account. Double-check HELEKET_MERCHANT_ID matches the "Merchant ID" shown in your Heleket dashboard exactly, and that the merchant has been activated by Heleket.'), { code: 'MERCHANT_UNKNOWN' });
    }
    throw new Error(rawMessage);
  }
  return data.result;
};

// Lets the admin verify Heleket credentials are correct without leaving the dashboard —
// calls Heleket's own "list of services" endpoint (requires auth, no side effects) as a live test.
app.get('/api/admin/heleket/status', requireAuth, requireAdmin, async (_req, res) => {
  const merchantRaw = (process.env.HELEKET_MERCHANT_ID || '').trim();
  const apiKeyRaw = (process.env.HELEKET_PAYMENT_API_KEY || '').trim();
  const configured = !!merchantRaw && !!apiKeyRaw;
  const merchantLooksValid = UUID_RE.test(merchantRaw);
  const maskedMerchant = merchantRaw ? `${merchantRaw.slice(0, 8)}...${merchantRaw.slice(-4)}` : null;
  if (!configured) return res.json({ configured: false, merchantLooksValid: false, maskedMerchant, connectionOk: false, error: 'HELEKET_MERCHANT_ID or HELEKET_PAYMENT_API_KEY is not set' });
  if (!merchantLooksValid) return res.json({ configured: true, merchantLooksValid: false, maskedMerchant, connectionOk: false, error: 'HELEKET_MERCHANT_ID is not a valid UUID — copy the "Merchant ID" from your Heleket dashboard Settings page exactly' });
  try {
    await heleketApiPost('/v1/payment/services', {});
    res.json({ configured: true, merchantLooksValid: true, maskedMerchant, connectionOk: true });
  } catch (e: any) {
    res.json({ configured: true, merchantLooksValid: true, maskedMerchant, connectionOk: false, error: e?.message || 'Heleket rejected the test request' });
  }
});

app.post('/api/heleket/create', requireAuth, async (req: any, res) => {
  try {
    // The site's base currency is USD, and Heleket is charged in USD too — so the amount the
    // client enters is credited to their wallet at face value, no conversion needed here.
    // (Electronic-wallet deposits are paid in EGP and converted to USD using the admin exchange rate.)
    const amount = num(req.body?.amount);
    if (!positiveMoney(amount) || amount < 1 || amount > 1000000) return apiError(res, 400, 'Invalid amount', 'INVALID_AMOUNT');
    getHeleketCredentials(); // fails fast with a clear message if HELEKET_MERCHANT_ID/HELEKET_PAYMENT_API_KEY are missing or malformed
    const currency = process.env.HELEKET_CURRENCY || 'USD';
    const baseUrl = process.env.PUBLIC_APP_URL || `${req.protocol}://${req.get('host')}`;
    const [p] = await db.insert(payments).values({
      userId: req.dbUser.id,
      amount: money(amount).toFixed(4),
      method: 'Heleket',
      status: 'Pending',
      transactionDetails: { gateway: 'heleket', currency },
    }).returning();
    try {
      const orderId = `PAY-${p.id}`;
      const result = await heleketApiPost('/v1/payment', {
        amount: money(amount).toFixed(2),
        currency,
        order_id: orderId,
        url_return: `${baseUrl}/dashboard/add-funds?payment=return`,
        url_success: `${baseUrl}/dashboard/add-funds?payment=success`,
        url_callback: `${baseUrl}/api/heleket/webhook`,
        is_payment_multiple: false,
        lifetime: Number(process.env.HELEKET_INVOICE_LIFETIME || 3600),
        payer_email: req.dbUser.email || null,
        additional_data: p.id,
        theme: 'light',
      });
      await db.update(payments).set({
        transactionId: String(result?.uuid || orderId),
        transactionDetails: { gateway: 'heleket', currency, invoiceUuid: result?.uuid || null, orderId, response: result },
      }).where(eq(payments.id, p.id));
      res.json({ paymentId: p.id, orderId, invoiceUuid: result?.uuid, paymentUrl: result?.url, expiresAt: result?.expired_at || null });
    } catch (invoiceErr: any) {
      // Don't leave an orphaned "Pending" payment row behind if Heleket never actually issued an invoice.
      await db.update(payments).set({ status: 'Rejected', transactionDetails: { gateway: 'heleket', currency, error: invoiceErr?.message || String(invoiceErr) } }).where(eq(payments.id, p.id));
      throw invoiceErr;
    }
  } catch (e: any) {
    console.error('Heleket create:', e?.message || e);
    const status = e?.code === 'GATEWAY_NOT_CONFIGURED' || e?.code === 'INVALID_MERCHANT_ID' ? 503 : e?.code === 'MERCHANT_UNKNOWN' ? 502 : 400;
    const clientMessage = ['GATEWAY_NOT_CONFIGURED', 'INVALID_MERCHANT_ID', 'MERCHANT_UNKNOWN'].includes(e?.code)
      ? 'Crypto payment is temporarily unavailable. Please try another payment method or contact support.'
      : (e?.message || 'Heleket payment initialization failed');
    apiError(res, status, clientMessage, e?.code || 'HELEKET_CREATE_ERROR');
  }
});

app.post('/api/heleket/webhook', async (req, res) => {
  try {
    let merchant: string, apiKey: string;
    try { ({ merchant, apiKey } = getHeleketCredentials()); }
    catch { return apiError(res, 503, 'Heleket is not configured', 'GATEWAY_NOT_CONFIGURED'); }
    if (req.headers.merchant && String(req.headers.merchant) !== merchant) return apiError(res, 401, 'Invalid merchant', 'INVALID_MERCHANT');
    const payload = { ...(req.body || {}) };
    const provided = String(payload.sign || '');
    delete payload.sign;
    if (!provided) return apiError(res, 401, 'Missing signature', 'INVALID_SIGNATURE');
    const expected = heleketSign(heleketJson(payload), apiKey);
    if (provided.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) return apiError(res, 401, 'Invalid signature', 'INVALID_SIGNATURE');

    const orderId = String(payload.order_id || '');
    const paymentId = String(payload.additional_data || '').match(/^[0-9a-f-]{36}$/i)?.[0] || (orderId.startsWith('PAY-') ? orderId.slice(4) : '');
    if (!paymentId) return apiError(res, 400, 'Invalid payment reference', 'INVALID_PAYMENT');
    const [p] = await db.select().from(payments).where(eq(payments.id, paymentId));
    if (!p || p.method !== 'Heleket') return apiError(res, 404, 'Payment not found', 'PAYMENT_NOT_FOUND');
    // Base currency is USD and Heleket bills in USD too, so this compares like-for-like directly.
    if (money(num(payload.amount)) !== money(num(p.amount))) return apiError(res, 400, 'Payment amount mismatch', 'PAYMENT_MISMATCH');

    const status = String(payload.status || '').toLowerCase();
    const finalCreditStatuses = new Set(['paid', 'paid_over']);
    const rejectStatuses = new Set(['cancel', 'fail', 'system_fail', 'refund_fail']);
    if (finalCreditStatuses.has(status)) {
      await db.transaction(async tx => {
        const [locked] = await tx.select().from(payments).where(eq(payments.id, p.id)).for('update');
        if (!locked || locked.status !== 'Pending') return;
        await tx.update(payments).set({ status: 'Approved', transactionId: String(payload.txid || payload.uuid || locked.transactionId || orderId), transactionDetails: { ...(locked.transactionDetails as any || {}), webhook: payload }, resolvedAt: new Date() }).where(eq(payments.id, locked.id));
        // This webhook is the ONLY thing that credits a Heleket payment — admins cannot manually
        // approve Heleket payments (see the guard in /api/admin/payments/:id/approve).
        await creditWallet(tx, locked.userId, num(locked.amount), 'Heleket Deposit', locked.id);
        await applyAffiliateCommission(tx, locked);
      });
    } else if (rejectStatuses.has(status)) {
      await db.update(payments).set({ status: 'Rejected', transactionId: String(payload.txid || payload.uuid || p.transactionId || orderId), transactionDetails: { gateway: 'heleket', webhook: payload }, resolvedAt: new Date() }).where(and(eq(payments.id, p.id), eq(payments.status, 'Pending')));
    } else {
      await db.update(payments).set({ transactionDetails: { gateway: 'heleket', webhook: payload } }).where(eq(payments.id, p.id));
    }
    res.sendStatus(200);
  } catch (e: any) {
    console.error('Heleket webhook:', e?.message || e);
    apiError(res, 400, 'Webhook processing failed', 'WEBHOOK_ERROR');
  }
});

// Sha7nawy Gate electronic-wallet gateway.
// The uploaded Postman collection defines:
// - POST /api/payment/create with Public Key
// - POST /api/payment/confirm with Public Key
// - GET /api/payment/info/{transaction_id} with Secret Key
// Webhooks are verified again server-side by querying the transaction with Secret Key
// before any wallet credit is issued. The collection does not document a webhook signature.
const getSha7nawyConfig = async (requireEnabled=true) => {
  const rows = await db.select().from(settings);
  const s: any = Object.fromEntries(rows.map((r:any) => [r.key, r.value]));
  const enabled = s.shahnawy_enabled === 'true';
  const baseUrl = String(s.shahnawy_base_url || 'https://gate.sha7nawy.com').replace(/\/+$/, '');
  const publicKey = String(s.shahnawy_public_key || '').trim();
  const secretKey = String(s.shahnawy_secret_key || '').trim();
  const merchantWalletNumber = String(s.shahnawy_merchant_wallet_number || s.vodafone_cash_number || '').trim();
  const minAmount = num(s.shahnawy_min_amount || '5');
  const maxAmount = num(s.shahnawy_max_amount || '10000');
  if (requireEnabled && !enabled) throw Object.assign(new Error('Electronic wallet payments are currently disabled'), { code: 'GATEWAY_DISABLED' });
  if (!publicKey || !secretKey || !baseUrl) throw Object.assign(new Error('Electronic wallet gateway is not configured'), { code: 'GATEWAY_NOT_CONFIGURED' });
  return { baseUrl, publicKey, secretKey, merchantWalletNumber, minAmount, maxAmount };
};
const sha7nawyRequest = async (cfg:any, pathName:string, init:any={}) => {
  const response = await fetch(`${cfg.baseUrl}${pathName}`, {
    ...init,
    headers: { Accept: 'application/json', ...(init.headers || {}) },
  });
  const text = await response.text();
  let body:any = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { message: text }; }
  if (!response.ok || body?.status === false) {
    const err:any = new Error(body?.message || `Sha7nawy Gate request failed (${response.status})`);
    err.httpStatus = response.status;
    err.gatewayBody = body;
    throw err;
  }
  return body;
};
const sha7nawyCreate = async (cfg:any, payload:any) => sha7nawyRequest(cfg, '/api/payment/create', {
  method: 'POST', headers: { Authorization: cfg.publicKey, 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
});
const sha7nawyConfirm = async (cfg:any, reference:string) => sha7nawyRequest(cfg, '/api/payment/confirm', {
  method: 'POST', headers: { Authorization: cfg.publicKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ ref_code: reference })
});
const sha7nawyInfo = async (cfg:any, transactionId:string) => sha7nawyRequest(cfg, `/api/payment/info/${encodeURIComponent(transactionId)}`, {
  method: 'GET', headers: { Authorization: cfg.secretKey }
});

app.post('/api/shahnawy/create', requireAuth, async (req:any, res) => {
  try {
    const cfg = await getSha7nawyConfig();
    const amountEgp = num(req.body?.amount);
    const number = String(req.body?.number || '').replace(/\s+/g, '');
    const method = String(req.body?.method || 'vf_cash');
    if (!/^01\d{9}$/.test(number)) return apiError(res, 400, 'Enter a valid 11-digit Egyptian wallet number', 'INVALID_WALLET_NUMBER');
    if (!['vf_cash','or_cash','et_cash'].includes(method)) return apiError(res, 400, 'Unsupported electronic wallet', 'INVALID_WALLET_METHOD');
    if (!positiveMoney(amountEgp) || amountEgp < cfg.minAmount || amountEgp > cfg.maxAmount) return apiError(res, 400, `Amount must be between ${cfg.minAmount} and ${cfg.maxAmount} EGP`, 'INVALID_AMOUNT');
    const rate = num((await db.select().from(settings)).find((s:any)=>s.key==='usd_exchange_rate')?.value || '50');
    if (!Number.isFinite(rate) || rate <= 0) return apiError(res, 503, 'Exchange rate is not configured', 'RATE_NOT_CONFIGURED');
    const usdAmount = money(amountEgp / rate);
    const [p] = await db.insert(payments).values({
      userId: req.dbUser.id,
      amount: usdAmount.toFixed(4),
      method: 'المحفظة الإلكترونية',
      status: 'Pending',
      transactionDetails: { gateway:'shahnawy', walletMethod:method, senderWallet:number, egpAmount:amountEgp.toFixed(2), rate, merchantWalletNumber:cfg.merchantWalletNumber }
    }).returning();
    try {
      const baseUrl = process.env.PUBLIC_APP_URL || `${req.protocol}://${req.get('host')}`;
      const result = await sha7nawyCreate(cfg, {
        number,
        amount: Number(amountEgp.toFixed(2)),
        method,
        client: req.dbUser.email || req.dbUser.id,
        details: `RapidSMM wallet deposit ${p.id}`,
        webhook_url: `${baseUrl}/api/shahnawy/webhook`,
      });
      const d = result?.data || {};
      await db.update(payments).set({
        transactionId: d.id || d.transaction_id ? String(d.id || d.transaction_id) : null,
        transactionDetails: { gateway:'shahnawy', walletMethod:method, senderWallet:number, egpAmount:amountEgp.toFixed(2), rate, merchantWalletNumber:cfg.merchantWalletNumber, reference:d.reference || null, gatewayResponse:result }
      }).where(eq(payments.id,p.id));
      res.status(201).json({ paymentId:p.id, transactionId:d.id, reference:d.reference, status:d.status || 'pending', amountEgp, usdAmount:usdAmount.toFixed(2), merchantWalletNumber:cfg.merchantWalletNumber });
    } catch (e:any) {
      await db.update(payments).set({ status:'Rejected', transactionDetails:{ gateway:'shahnawy', error:e?.message || String(e), gatewayBody:e?.gatewayBody || null } }).where(eq(payments.id,p.id));
      throw e;
    }
  } catch(e:any) {
    console.error('Sha7nawy create:', e?.message || e);
    const code=e?.code || (e?.httpStatus===401?'GATEWAY_UNAUTHORIZED':'SHA7NAWY_CREATE_ERROR');
    const status=e?.httpStatus===401?503:(e?.code==='GATEWAY_DISABLED'?503:e?.code==='GATEWAY_NOT_CONFIGURED'?503:400);
    apiError(res,status,e?.message || 'Electronic wallet payment initialization failed',code);
  }
});

const finalizeSha7nawyPayment = async (paymentId:string, gatewayInfo:any, source:string) => {
  return db.transaction(async tx => {
    const [p] = await tx.select().from(payments).where(eq(payments.id,paymentId)).for('update');
    if (!p || p.method !== 'المحفظة الإلكترونية') throw new Error('Payment not found');
    if (p.status !== 'Pending') return false;
    const td:any = p.transactionDetails || {};
    const gatewayAmount = num(gatewayInfo?.amount);
    const expectedEgp = num(td.egpAmount);
    if (!positiveMoney(gatewayAmount) || money(gatewayAmount) !== money(expectedEgp)) throw Object.assign(new Error('Payment amount mismatch'),{code:'PAYMENT_MISMATCH'});
    const gatewayStatus = String(gatewayInfo?.status || '').toLowerCase();
    if (gatewayStatus !== 'completed') return false;
    await tx.update(payments).set({ status:'Approved', transactionId:String(gatewayInfo?.transaction_id || gatewayInfo?.id || p.transactionId || ''), transactionDetails:{...td, gatewayStatus, verifiedBy:source, gatewayInfo}, resolvedAt:new Date() }).where(eq(payments.id,p.id));
    await creditWallet(tx,p.userId,num(p.amount),`Funds added via ${p.method}`,p.id);
    await applyAffiliateCommission(tx,p);
    return true;
  });
};

app.post('/api/shahnawy/confirm', requireAuth, async (req:any,res) => {
  try {
    const cfg=await getSha7nawyConfig();
    const paymentId=String(req.body?.paymentId||'');
    const [p]=await db.select().from(payments).where(and(eq(payments.id,paymentId),eq(payments.userId,req.dbUser.id)));
    if(!p || p.method!=='المحفظة الإلكترونية') return apiError(res,404,'Payment not found','PAYMENT_NOT_FOUND');
    if(p.status==='Approved') return res.json({success:true,status:'completed',alreadyApproved:true});
    const td:any=p.transactionDetails||{};
    if(!td.reference) return apiError(res,400,'Payment reference is missing','REFERENCE_MISSING');
    try {
      const result=await sha7nawyConfirm(cfg,td.reference);
      const info=result?.data||{};
      if(String(info.status||'').toLowerCase()==='completed') {
        await finalizeSha7nawyPayment(p.id,info,'confirm');
        return res.json({success:true,status:'completed',data:info});
      }
      return res.status(202).json({success:false,status:String(info.status||'pending'),message:result?.message||'Payment is still pending'});
    } catch(e:any) {
      const msg=String(e?.message||'');
      if(/pending|معلقة|يرجى إعادة المحاولة/i.test(msg)) return res.status(202).json({success:false,status:'pending',message:msg});
      throw e;
    }
  } catch(e:any){ apiError(res,e?.httpStatus===401?503:400,e?.message||'Payment confirmation failed',e?.code||'SHA7NAWY_CONFIRM_ERROR'); }
});

app.post('/api/shahnawy/webhook', async (req:any,res) => {
  try {
    const cfg=await getSha7nawyConfig(false);
    const txId=String(req.headers['x-transaction-id']||req.body?.transaction?.id||'');
    const reference=String(req.headers['x-transaction-reference']||req.body?.transaction?.reference||'');
    const event=String(req.headers['x-webhook-event']||req.body?.event||'');
    if(!txId && !reference) return apiError(res,400,'Missing transaction reference','INVALID_WEBHOOK');
    let payment:any=null;
    if(txId){ [payment]=await db.select().from(payments).where(and(eq(payments.transactionId,txId),eq(payments.method,'المحفظة الإلكترونية'))); }
    if(!payment && reference){
      const rows=await db.select().from(payments).where(eq(payments.method,'المحفظة الإلكترونية'));
      payment=rows.find((x:any)=>String((x.transactionDetails as any)?.reference||'')===reference) || null;
    }
    if(!payment) return res.sendStatus(200); // Do not leak payment existence to a third party.
    // Never trust webhook amount/status blindly: re-query Sha7nawy with the Secret Key.
    const verified=await sha7nawyInfo(cfg,txId || String(payment.transactionId));
    const info=verified?.data||{};
    const gatewayStatus=String(info.status||req.body?.transaction?.status||'').toLowerCase();
    if(gatewayStatus==='completed') await finalizeSha7nawyPayment(payment.id,info,'webhook');
    else if(['rejected','failed','expired','cancelled'].includes(gatewayStatus)) await db.update(payments).set({status:'Rejected',transactionDetails:{...(payment.transactionDetails as any||{}),gatewayStatus,event,webhook:req.body},resolvedAt:new Date()}).where(and(eq(payments.id,payment.id),eq(payments.status,'Pending')));
    else await db.update(payments).set({transactionDetails:{...(payment.transactionDetails as any||{}),gatewayStatus,event,webhook:req.body}}).where(eq(payments.id,payment.id));
    res.sendStatus(200);
  } catch(e:any){ console.error('Sha7nawy webhook:',e?.message||e); res.sendStatus(200); }
});

// Admin settings/users/categories/services/providers/orders/payments/tickets/reports/audit/raffles/mystery
const secretKeys = new Set(['shahnawy_public_key','shahnawy_secret_key','provider_api_key']);
app.get('/api/admin/settings',requireAuth,requireAdmin,async(_req,res)=>{const rows=await db.select().from(settings); const out:any={}; for(const r of rows)out[r.key]=secretKeys.has(r.key)?'********':r.value; res.json(out);});
app.put('/api/admin/settings',requireAuth,requireAdmin,async(req:any,res)=>{const allowed=new Set(['site_name','currency_symbol','vodafone_cash_number','site_description','support_email','site_logo','affiliate_commission_percentage','usd_exchange_rate','default_profit_margin','shahnawy_enabled','shahnawy_base_url','shahnawy_public_key','shahnawy_secret_key','shahnawy_merchant_wallet_number','shahnawy_min_amount','shahnawy_max_amount']); for(const [key,val] of Object.entries(req.body||{})){if(!allowed.has(key))return apiError(res,400,`Setting not allowed: ${key}`,'INVALID_SETTING'); const value=String(val).trim(); if(secretKeys.has(key)&&value==='********') continue; if(key==='shahnawy_enabled'&&!['true','false'].includes(value))return apiError(res,400,'Invalid gateway enabled value','INVALID_SETTING'); if(key==='shahnawy_base_url'&&!/^https?:\/\//i.test(value))return apiError(res,400,'Invalid Sha7nawy base URL','INVALID_SETTING'); if(['shahnawy_min_amount','shahnawy_max_amount'].includes(key)&&(!Number.isFinite(num(value))||num(value)<1||num(value)>10000000))return apiError(res,400,'Invalid Sha7nawy amount limit','INVALID_SETTING'); if(key==='affiliate_commission_percentage'&&(!Number.isFinite(num(value))||num(value)<0||num(value)>100))return apiError(res,400,'Invalid commission percentage','INVALID_SETTING'); if(key==='usd_exchange_rate'&&(!Number.isFinite(num(value))||num(value)<=0||num(value)>100000))return apiError(res,400,'Invalid exchange rate','INVALID_SETTING'); if(key==='default_profit_margin'&&(!Number.isFinite(num(value))||num(value)<0||num(value)>10000))return apiError(res,400,'Invalid default profit margin','INVALID_SETTING'); await db.insert(settings).values({key,value}).onConflictDoUpdate({target:settings.key,set:{value}});} await audit(req.dbUser.id,'UPDATE_SETTINGS','SETTINGS','settings'); res.json({success:true});});
app.get('/api/admin/users',requireAuth,requireAdmin,async(req:any,res)=>{
  const page=Math.max(1,parseInt(req.query.page)||1);
  const pageSize=Math.min(200,Math.max(1,parseInt(req.query.pageSize)||50));
  const q=typeof req.query.q==='string'?req.query.q.trim():'';
  const status=typeof req.query.status==='string'&&req.query.status!=='all'?req.query.status:'';
  const conditions=[];
  if(status)conditions.push(eq(users.status,status as any));
  if(q)conditions.push(sql`(${users.email} ILIKE ${'%'+q+'%'} OR ${users.name} ILIKE ${'%'+q+'%'})`);
  const where=conditions.length?and(...conditions):undefined;
  const cols={id:users.id,uid:users.uid,name:users.name,email:users.email,role:users.role,status:users.status,balance:users.balance,gamePoints:users.gamePoints,currentStreak:users.currentStreak,keys:users.keys,referralCode:users.referralCode,referredBy:users.referredBy,createdAt:users.createdAt};
  const [rows,[{count}]]=await Promise.all([
    (where?db.select(cols).from(users).where(where):db.select(cols).from(users)).orderBy(desc(users.createdAt)).limit(pageSize).offset((page-1)*pageSize),
    (where?db.select({count:sql<number>`count(*)`}).from(users).where(where):db.select({count:sql<number>`count(*)`}).from(users)),
  ]);
  res.json({data:rows,total:Number(count),page,pageSize});
});
app.get('/api/admin/users/:id',requireAuth,requireAdmin,async(req,res)=>{const u=await db.select({
    id:users.id,uid:users.uid,name:users.name,email:users.email,role:users.role,status:users.status,
    balance:users.balance,gamePoints:users.gamePoints,currentStreak:users.currentStreak,keys:users.keys,
    referralCode:users.referralCode,referredBy:users.referredBy,createdAt:users.createdAt
  }).from(users).where(eq(users.id,req.params.id)).limit(1).then(r=>r[0]);
  if(!u)return apiError(res,404,'User not found','NOT_FOUND');res.json({user:u,orders:await db.query.orders.findMany({where:eq(orders.userId,u.id),with:{service:true},orderBy:[desc(orders.createdAt)]}),payments:await db.query.payments.findMany({where:eq(payments.userId,u.id),orderBy:[desc(payments.createdAt)]}),tickets:await db.query.tickets.findMany({where:eq(tickets.userId,u.id),orderBy:[desc(tickets.createdAt)]})});});
app.put('/api/admin/users/:id/status',requireAuth,requireAdmin,async(req:any,res)=>{const status=req.body?.status;if(!['active','suspended','banned'].includes(status))return apiError(res,400,'Invalid status');if(req.params.id===req.dbUser.id)return apiError(res,403,'Cannot modify your own status');const [u]=await db.select().from(users).where(eq(users.id,req.params.id));if(!u)return apiError(res,404,'User not found');const [updated]=await db.update(users).set({status}).where(eq(users.id,u.id)).returning({
id:users.id,uid:users.uid,name:users.name,email:users.email,role:users.role,status:users.status,balance:users.balance,
gamePoints:users.gamePoints,currentStreak:users.currentStreak,keys:users.keys,referralCode:users.referralCode,referredBy:users.referredBy,createdAt:users.createdAt
});await audit(req.dbUser.id,'UPDATE_STATUS','USER',u.id,`Status changed to ${status}`,u.status,status);res.json(updated);});
app.put('/api/admin/users/:id/balance',requireAuth,requireAdmin,async(req:any,res)=>{try{const amount=num(req.body?.amount);if(!Number.isFinite(amount)||amount===0||Math.abs(amount)>1000000)throw new Error('Invalid balance adjustment');await db.transaction(async tx=>{if(amount>0)await creditWallet(tx,req.params.id,amount,'Admin balance adjustment',req.params.id);else await debitWallet(tx,req.params.id,Math.abs(amount),'Admin balance adjustment',req.params.id);});await audit(req.dbUser.id,'ADJUST_BALANCE','USER',req.params.id,`Adjustment ${amount}`);res.json({success:true});}catch(e:any){apiError(res,400,e.message);}});
app.get('/api/admin/stats',requireAuth,requireAdmin,async(_req,res)=>{const [[u],[o],[p]] = await Promise.all([db.select({count:sql<number>`count(*)`}).from(users),db.select({count:sql<number>`count(*)`}).from(orders),db.select({count:sql<number>`count(*)`}).from(payments)]);res.json({totalUsers:Number(u.count),totalOrders:Number(o.count),totalPayments:Number(p.count)});});

app.get('/api/admin/categories',requireAuth,requireAdmin,async(_req,res)=>res.json(await db.select().from(categories).orderBy(categories.sortOrder)));
app.post('/api/admin/categories',requireAuth,requireAdmin,async(req:any,res)=>{const name=String(req.body?.name||'').trim();if(name.length<2||name.length>100)return apiError(res,400,'Invalid category name');const [c]=await db.insert(categories).values({name,sortOrder:Number(req.body?.sortOrder||0),status:req.body?.status==='inactive'?'inactive':'active'}).returning();await audit(req.dbUser.id,'CREATE_CATEGORY','CATEGORY',c.id);res.status(201).json(c);});
app.put('/api/admin/categories/:id',requireAuth,requireAdmin,async(req:any,res)=>{const [c]=await db.update(categories).set({name:req.body.name,sortOrder:Number(req.body.sortOrder||0),status:req.body.status==='inactive'?'inactive':'active'}).where(eq(categories.id,req.params.id)).returning();if(!c)return apiError(res,404,'Category not found');await audit(req.dbUser.id,'UPDATE_CATEGORY','CATEGORY',c.id);res.json(c);});
app.delete('/api/admin/categories/:id',requireAuth,requireAdmin,async(req:any,res)=>{const used=await db.query.services.findFirst({where:eq(services.categoryId,req.params.id)});if(used)return apiError(res,409,'Category has services; deactivate it instead');await db.delete(categories).where(eq(categories.id,req.params.id));res.json({success:true});});

app.get('/api/admin/services',requireAuth,requireAdmin,async(_req,res)=>res.json(await db.query.services.findMany({with:{category:true,provider:true},orderBy:[asc(services.sortOrder)]})));
app.post('/api/admin/services',requireAuth,requireAdmin,async(req:any,res)=>{const d=req.body||{};const min=Number(d.minQuantity),max=Number(d.maxQuantity),price=num(d.pricePer1k);if(!uuidLike(d.categoryId)||!d.name||!positiveMoney(price)||!Number.isInteger(min)||!Number.isInteger(max)||min<1||max<min)return apiError(res,400,'Invalid service data');const cat=await db.query.categories.findFirst({where:eq(categories.id,d.categoryId)});if(!cat)return apiError(res,404,'Category not found');if(d.providerId&&uuidLike(d.providerId)){const pr=await db.query.providers.findFirst({where:and(eq(providers.id,d.providerId),eq(providers.isDeleted,false))});if(!pr)return apiError(res,404,'Provider not found');}const [s]=await db.insert(services).values({categoryId:d.categoryId,name:String(d.name).trim(),pricePer1k:money(price).toFixed(4),minQuantity:min,maxQuantity:max,providerId:uuidLike(d.providerId)?d.providerId:null,providerServiceId:d.providerServiceId||null,providerPrice:positiveMoney(d.providerPrice)?money(num(d.providerPrice)).toFixed(4):'0.0000',description:d.description||null,sortOrder:Number(d.sortOrder||0),cashbackPercentage:Math.max(0,Math.min(100,Number(d.cashbackPercentage||0))),refillable:!!d.refillable,cancelable:!!d.cancelable,status:d.status==='inactive'?'inactive':'active'}).returning();res.status(201).json(s);});
app.put('/api/admin/services/:id',requireAuth,requireAdmin,async(req:any,res:any)=>{const d=req.body||{};const current=await db.query.services.findFirst({where:eq(services.id,req.params.id)});if(!current)return apiError(res,404,'Service not found');const oldMeta=(current.providerMeta||{}) as any;const nextProviderId=d.providerId||null;const nextProviderServiceId=d.providerServiceId||null;const customName=Boolean(nextProviderId&&nextProviderServiceId);const descriptionValue=String(d.description??'').trim();const customDescription=descriptionValue.length>0;const nextMeta={...oldMeta,customName,customDescription,description:customDescription?descriptionValue:null};const [s]=await db.update(services).set({name:String(d.name||current.name).trim(),categoryId:d.categoryId,pricePer1k:String(d.pricePer1k),minQuantity:Number(d.minQuantity),maxQuantity:Number(d.maxQuantity),providerId:nextProviderId,providerServiceId:nextProviderServiceId,providerPrice:d.providerPrice?String(d.providerPrice):'0.0000',description:d.description||null,sortOrder:Number(d.sortOrder||0),cashbackPercentage:Number(d.cashbackPercentage||0),refillable:!!d.refillable,cancelable:!!d.cancelable,status:d.status==='inactive'?'inactive':'active',providerMeta:nextMeta}).where(eq(services.id,req.params.id)).returning();res.json(s);});
app.get('/api/admin/providers/:id/balance',requireAuth,requireAdmin,async(req,res)=>{try{const [p]=await db.select().from(providers).where(and(eq(providers.id,req.params.id),eq(providers.isDeleted,false)));if(!p)return apiError(res,404,'Provider not found');await assertSafeProviderUrl(p.apiUrl);const c=new ProviderClient(p.apiUrl,p.apiKey);const b=await c.balance();if(b.error)return apiError(res,502,'Provider request failed');res.json(b);}catch{apiError(res,502,'Provider request failed');}});
app.post('/api/admin/providers/:id/sync',requireAuth,requireAdmin,async(req:any,res:any)=>{
  try{
    const [p]=await db.select().from(providers).where(and(eq(providers.id,req.params.id),eq(providers.isDeleted,false)));
    if(!p)return apiError(res,404,'Provider not found');
    const active=activeProviderSync.get(p.id);
    if(active){
      const existing=providerSyncJobs.get(active);
      if(existing && (existing.status==='queued'||existing.status==='running')) return res.status(409).json({error:'A synchronization is already running',code:'SYNC_IN_PROGRESS',jobId:active});
      activeProviderSync.delete(p.id);
    }
    await assertSafeProviderUrl(p.apiUrl);
    const data=await new ProviderClient(p.apiUrl,p.apiKey).services();
    if(data.error)return apiError(res,502,`Provider error: ${String(data.error)}`,'PROVIDER_SYNC_FAILED');
    const incoming=Array.isArray(data) ? data : (Array.isArray(data.services) ? data.services : Array.isArray(data.data) ? data.data : Array.isArray(data.result) ? data.result : []);
    const items=incoming.slice(0,5000);
    if(!items.length)return res.json({success:true,synced:0,created:0,updated:0,skipped:0,message:'Provider returned no services'});
    const job:ProviderSyncJob={id:crypto.randomUUID(),providerId:p.id,status:'queued',total:items.length,processed:0,created:0,updated:0,skipped:0,startedAt:new Date().toISOString()};
    providerSyncJobs.set(job.id,job); activeProviderSync.set(p.id,job.id);
    res.status(202).json({success:true,jobId:job.id,total:job.total,status:job.status,message:'Synchronization started'});

    void (async()=>{
      job.status='running';
      try{
        const allCategories=await db.select().from(categories);
        const categoryMap=new Map(allCategories.map((c:any)=>[String(c.name).trim(),c]));
        const existingRows=await db.select().from(services).where(eq(services.providerId,p.id));
        const existingMap=new Map(existingRows.filter((x:any)=>x.providerServiceId).map((x:any)=>[String(x.providerServiceId),x]));
        const BATCH=50;
        for(let offset=0;offset<items.length;offset+=BATCH){
          const batch=items.slice(offset,offset+BATCH);
          await Promise.all(batch.map(async(raw:any)=>{
            try{
              const providerServiceId=String(raw.service ?? raw.id ?? '').trim();
              const name=String(raw.name ?? `Service ${providerServiceId}`).trim().slice(0,255);
              const providerPrice=Number(raw.rate ?? raw.price ?? raw.pricePer1k);
              const min=Number(raw.min ?? raw.minQuantity ?? 1);
              const max=Number(raw.max ?? raw.maxQuantity ?? 1000000);
              if(!providerServiceId||!name||!Number.isFinite(providerPrice)||providerPrice<0||!Number.isInteger(min)||!Number.isInteger(max)||min<1||max<min){job.skipped++;return;}
              const categoryName=String(raw.category ?? raw.category_name ?? raw.categoryName ?? raw.type ?? 'Uncategorized').trim().slice(0,120)||'Uncategorized';
              let category=categoryMap.get(categoryName);
              if(!category){ const [c]=await db.insert(categories).values({name:categoryName,status:'active'}).returning(); category=c; categoryMap.set(categoryName,c); }
              const refillable=Boolean(raw.refill ?? raw.refillable ?? false);
              const cancelable=Boolean(raw.cancel ?? raw.cancelable ?? false);
              const dripfeed=Boolean(raw.dripfeed ?? raw.drip_feed ?? false);
              const description=buildProviderDescription(raw,name,providerPrice,min,max,refillable,cancelable,dripfeed);
              const existingService=existingMap.get(providerServiceId);
              const previousMeta=(existingService?.providerMeta || {}) as any;
              const customName=Boolean(previousMeta?.customName);
              const displayName=customName && existingMap.get(providerServiceId)?.name ? String(existingMap.get(providerServiceId).name) : name;
              const preservedDescription=previousMeta.customDescription && String(existingService?.description || '').trim() ? String(existingService?.description).trim() : description;
              const providerMeta={...previousMeta,sourceServiceId:providerServiceId,providerRate:providerPrice,providerMin:min,providerMax:max,category:categoryName,description:preservedDescription,refillable,cancelable,dripfeed,type:raw.type??null,customName,customDescription:Boolean(previousMeta.customDescription && String(existingService?.description || '').trim()),syncedAt:new Date().toISOString()};
              const selling=money(providerPrice*(1+Math.max(0,p.profitMargin)/100));
              const existing=existingMap.get(providerServiceId);
              if(existing){
                await db.update(services).set({name:displayName,categoryId:category.id,providerPrice:providerPrice.toFixed(4),pricePer1k:selling.toFixed(4),minQuantity:min,maxQuantity:max,description:preservedDescription,refillable,cancelable,providerMeta,status:'active'}).where(eq(services.id,existing.id));
                job.updated++;
              }else{
                const [created]=await db.insert(services).values({categoryId:category.id,providerId:p.id,providerServiceId,name,providerPrice:providerPrice.toFixed(4),pricePer1k:selling.toFixed(4),minQuantity:min,maxQuantity:max,description:preservedDescription,refillable,cancelable,providerMeta,status:'active'}).returning();
                existingMap.set(providerServiceId,created); job.created++;
              }
            }catch{job.skipped++;}
            finally{job.processed++;}
          }));
        }
        job.status='completed'; job.finishedAt=new Date().toISOString();
        await audit(req.dbUser.id,'SYNC_PROVIDER','PROVIDER',p.id,`created=${job.created},updated=${job.updated},skipped=${job.skipped}`);
      }catch(e:any){job.status='failed';job.error=e?.message||'Provider synchronization failed';job.finishedAt=new Date().toISOString();}
      finally{activeProviderSync.delete(p.id);setTimeout(()=>providerSyncJobs.delete(job.id),30*60*1000);}
    })();
  }catch(e:any){apiError(res,502,e.message||'Provider synchronization failed','PROVIDER_SYNC_FAILED');}
});
app.get('/api/admin/providers/:id/sync/:jobId',requireAuth,requireAdmin,async(req:any,res:any)=>{
  const job=providerSyncJobs.get(req.params.jobId);
  if(!job||job.providerId!==req.params.id)return apiError(res,404,'Sync job not found','SYNC_NOT_FOUND');
  const percent=job.total?Math.min(100,Math.round(job.processed/job.total*100)):100;
  res.json({...job,percent});
});

app.get('/api/admin/orders',requireAuth,requireAdmin,async(req:any,res)=>{
  const page=Math.max(1,parseInt(req.query.page)||1);
  const pageSize=Math.min(200,Math.max(1,parseInt(req.query.pageSize)||100));
  const q=typeof req.query.q==='string'?req.query.q.trim():'';
  const status=typeof req.query.status==='string'&&req.query.status!=='all'?req.query.status:'';
  const conditions=[];
  if(status)conditions.push(eq(orders.status,status as any));
  if(q)conditions.push(sql`(${orders.link} ILIKE ${'%'+q+'%'} OR ${orders.providerOrderId} ILIKE ${'%'+q+'%'} OR ${orders.id}::text ILIKE ${'%'+q+'%'})`);
  const where=conditions.length?and(...conditions):undefined;
  const [data,[{count}]]=await Promise.all([
    db.query.orders.findMany({where,orderBy:[desc(orders.createdAt)],with:{user:true,service:true},limit:pageSize,offset:(page-1)*pageSize}),
    where?db.select({count:sql<number>`count(*)`}).from(orders).where(where):db.select({count:sql<number>`count(*)`}).from(orders),
  ]);
  res.json({data,total:Number(count),page,pageSize});
});
app.post('/api/admin/orders/:id/refresh',requireAuth,requireAdmin,async(req:any,res)=>{try{const [o]=await db.select().from(orders).where(eq(orders.id,req.params.id));if(!o)return apiError(res,404,'Order not found');if(!o.providerOrderId)return apiError(res,409,'Order has no provider order ID');await checkOrderStatus(o.id);const [updated]=await db.select().from(orders).where(eq(orders.id,o.id));await audit(req.dbUser.id,'REFRESH_ORDER_STATUS','ORDER',o.id,undefined,o.status,updated?.status||o.status);res.json(updated||o);}catch(e:any){apiError(res,400,e.message||'Failed to refresh order');}});
app.get('/api/admin/payments',requireAuth,requireAdmin,async(req:any,res)=>{
  const page=Math.max(1,parseInt(req.query.page)||1);
  const pageSize=Math.min(200,Math.max(1,parseInt(req.query.pageSize)||100));
  const status=typeof req.query.status==='string'&&req.query.status!=='all'?req.query.status:'';
  const where=status?eq(payments.status,status as any):undefined;
  const [data,[{count}]]=await Promise.all([
    db.query.payments.findMany({where,orderBy:[desc(payments.createdAt)],with:{user:true},limit:pageSize,offset:(page-1)*pageSize}),
    where?db.select({count:sql<number>`count(*)`}).from(payments).where(where):db.select({count:sql<number>`count(*)`}).from(payments),
  ]);
  res.json({data,total:Number(count),page,pageSize});
});
app.get('/api/admin/tickets',requireAuth,requireAdmin,async(_req,res)=>res.json(await db.query.tickets.findMany({orderBy:[desc(tickets.createdAt)],with:{user:true},limit:500})));
app.get('/api/admin/tickets/:id',requireAuth,requireAdmin,async(req,res)=>{const t=await db.query.tickets.findFirst({where:eq(tickets.id,req.params.id),with:{user:true}});if(!t)return apiError(res,404,'Ticket not found');res.json({ticket:t,messages:await db.query.ticketMessages.findMany({where:eq(ticketMessages.ticketId,t.id),orderBy:[desc(ticketMessages.createdAt)]})});});
app.post('/api/admin/tickets/:id/messages',requireAuth,requireAdmin,async(req:any,res)=>{const m=String(req.body?.message||'').trim();const t=await db.query.tickets.findFirst({where:eq(tickets.id,req.params.id)});if(!t)return apiError(res,404,'Ticket not found');if(!m||m.length>5000)return apiError(res,400,'Invalid message');const [msg]=await db.insert(ticketMessages).values({ticketId:t.id,senderId:req.dbUser.id,message:m,isAdmin:true}).returning();await db.update(tickets).set({status:'Answered'}).where(eq(tickets.id,t.id));res.status(201).json(msg);});
app.put('/api/admin/tickets/:id/status',requireAuth,requireAdmin,async(req,res)=>{if(!['Open','Answered','Closed'].includes(req.body?.status))return apiError(res,400,'Invalid status');const [t]=await db.update(tickets).set({status:req.body.status}).where(eq(tickets.id,req.params.id)).returning();if(!t)return apiError(res,404,'Ticket not found');res.json(t);});
app.get('/api/admin/audit',requireAuth,requireAdmin,async(req:any,res)=>{
  const page=Math.max(1,parseInt(req.query.page)||1);
  const pageSize=Math.min(200,Math.max(1,parseInt(req.query.pageSize)||100));
  const [data,[{count}]]=await Promise.all([
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(pageSize).offset((page-1)*pageSize),
    db.select({count:sql<number>`count(*)`}).from(auditLogs),
  ]);
  res.json({data,total:Number(count),page,pageSize});
});
app.get('/api/admin/reports',requireAuth,requireAdmin,async(req:any,res)=>{
  const page=Math.max(1,parseInt(req.query.page)||1);
  const pageSize=Math.min(200,Math.max(1,parseInt(req.query.pageSize)||100));
  const status=typeof req.query.status==='string'&&req.query.status!=='all'?req.query.status:'';
  const where=status?eq(systemReports.status,status as any):undefined;
  const [data,[{count}]]=await Promise.all([
    (where?db.select().from(systemReports).where(where):db.select().from(systemReports)).orderBy(desc(systemReports.createdAt)).limit(pageSize).offset((page-1)*pageSize),
    where?db.select({count:sql<number>`count(*)`}).from(systemReports).where(where):db.select({count:sql<number>`count(*)`}).from(systemReports),
  ]);
  res.json({data,total:Number(count),page,pageSize});
});
app.put('/api/admin/reports/:id/status',requireAuth,requireAdmin,async(req:any,res)=>{if(!['Unresolved','Resolved'].includes(req.body?.status))return apiError(res,400,'Invalid report status');const [r]=await db.update(systemReports).set({status:req.body.status}).where(eq(systemReports.id,req.params.id)).returning();if(!r)return apiError(res,404,'Report not found');await audit(req.dbUser.id,'UPDATE_REPORT_STATUS','REPORT',r.id,undefined,undefined,r.status);res.json(r);});

app.get('/api/admin/shortlinks',requireAuth,requireAdmin,async(_req,res)=>res.json(await db.select().from(shortlinks).orderBy(desc(shortlinks.createdAt))));
app.post('/api/admin/shortlinks',requireAuth,requireAdmin,async(req:any,res)=>{const reward=num(req.body?.rewardAmount);if(!req.body?.name||!validUrl(req.body?.url)||!positiveMoney(reward))return apiError(res,400,'Invalid shortlink');const [s]=await db.insert(shortlinks).values({name:String(req.body.name).trim(),url:req.body.url,rewardAmount:money(reward).toFixed(4),status:'active'}).returning();res.status(201).json(s);});

app.put('/api/admin/shortlinks/:id',requireAuth,requireAdmin,async(req:any,res)=>{
  const reward=num(req.body?.rewardAmount);
  const status=req.body?.status==='inactive'?'inactive':'active';
  if(!req.body?.name||!validUrl(req.body?.url)||!positiveMoney(reward))return apiError(res,400,'Invalid shortlink');
  const [s]=await db.update(shortlinks).set({name:String(req.body.name).trim(),url:String(req.body.url),rewardAmount:money(reward).toFixed(4),status}).where(eq(shortlinks.id,req.params.id)).returning();
  if(!s)return apiError(res,404,'Shortlink not found');
  await audit(req.dbUser.id,'UPDATE_SHORTLINK','SHORTLINK',s.id);
  res.json(s);
});
app.delete('/api/admin/shortlinks/:id',requireAuth,requireAdmin,async(req:any,res)=>{
  const [s]=await db.update(shortlinks).set({status:'inactive'}).where(eq(shortlinks.id,req.params.id)).returning();
  if(!s)return apiError(res,404,'Shortlink not found');
  await audit(req.dbUser.id,'DEACTIVATE_SHORTLINK','SHORTLINK',s.id);
  res.json({success:true});
});
app.get('/api/admin/raffles',requireAuth,requireAdmin,async(_req,res)=>{const rs=await db.select().from(raffles).orderBy(desc(raffles.createdAt));const out=[];for(const r of rs){const [c]=await db.select({count:sql<number>`count(*)`}).from(raffleTickets).where(eq(raffleTickets.raffleId,r.id));out.push({...r,ticketsCount:Number(c.count||0)});}res.json(out);});
app.post('/api/admin/raffles',requireAuth,requireAdmin,async(req:any,res)=>{const prize=num(req.body?.prizeAmount),ticket=num(req.body?.ticketPrice),end=new Date(req.body?.endDate);if(!positiveMoney(prize)||!positiveMoney(ticket)||isNaN(end.getTime())||end<=new Date())return apiError(res,400,'Invalid raffle');const [r]=await db.insert(raffles).values({title:String(req.body?.title||'Weekly Raffle').trim(),prizeAmount:money(prize).toFixed(4),ticketPrice:money(ticket).toFixed(4),maxTickets:req.body?.maxTickets?Number(req.body.maxTickets):null,maxTicketsPerUser:req.body?.maxTicketsPerUser?Number(req.body.maxTicketsPerUser):null,endDate:end,status:'Open'}).returning();await audit(req.dbUser.id,'CREATE_RAFFLE','RAFFLE',r.id);res.status(201).json(r);});
app.put('/api/admin/raffles/:id/close',requireAuth,requireAdmin,async(req,res)=>{const [r]=await db.update(raffles).set({status:'Closed'}).where(and(eq(raffles.id,req.params.id),eq(raffles.status,'Open'))).returning();if(!r)return apiError(res,409,'Raffle cannot be closed');await audit(req.dbUser.id,'CLOSE_RAFFLE','RAFFLE',r.id);res.json(r);});
app.put('/api/admin/raffles/:id/draw',requireAuth,requireAdmin,async(req:any,res)=>{try{let winnerId:string|null=null;await db.transaction(async tx=>{const [r]=await tx.select().from(raffles).where(eq(raffles.id,req.params.id)).for('update');if(!r)throw new Error('Raffle not found');if(r.status==='Drawn')throw new Error('Already drawn');if(r.status==='Open')throw new Error('Close raffle first');const ts=await tx.select().from(raffleTickets).where(eq(raffleTickets.raffleId,r.id));if(ts.length){const win=ts[crypto.randomInt(0,ts.length)];winnerId=win.userId;await tx.update(raffles).set({status:'Drawn',winnerId}).where(eq(raffles.id,r.id));await creditWallet(tx,win.userId,num(r.prizeAmount),`Raffle prize: ${r.title}`,r.id);}else await tx.update(raffles).set({status:'Drawn'}).where(eq(raffles.id,r.id));});await audit(req.dbUser.id,'DRAW_RAFFLE','RAFFLE',req.params.id,winnerId?`Winner ${winnerId}`:'No participants');res.json({success:true,winnerId});}catch(e:any){apiError(res,400,e.message);}});

app.get('/api/admin/mystery-boxes',requireAuth,requireAdmin,async(_req,res)=>res.json(await db.select().from(mysteryBoxTiers)));
app.post('/api/admin/mystery-boxes',requireAuth,requireAdmin,async(req:any,res)=>{const min=num(req.body?.minAmount),max=num(req.body?.maxAmount),prob=Number(req.body?.probability);if(!req.body?.name||!Number.isFinite(min)||!Number.isFinite(max)||min<0||max<min||!Number.isInteger(prob)||prob<=0)return apiError(res,400,'Invalid tier');const [t]=await db.insert(mysteryBoxTiers).values({name:String(req.body.name).trim(),minAmount:min.toFixed(4),maxAmount:max.toFixed(4),probability:prob,status:'active'}).returning();res.status(201).json(t);});
app.put('/api/admin/mystery-boxes/:id',requireAuth,requireAdmin,async(req:any,res)=>{
  const min=num(req.body?.minAmount),max=num(req.body?.maxAmount),prob=Number(req.body?.probability);
  if(!req.body?.name||!Number.isFinite(min)||!Number.isFinite(max)||min<0||max<min||!Number.isInteger(prob)||prob<=0)return apiError(res,400,'Invalid tier');
  const [t]=await db.update(mysteryBoxTiers).set({name:String(req.body.name).trim(),minAmount:min.toFixed(4),maxAmount:max.toFixed(4),probability:prob,status:req.body.status==='inactive'?'inactive':'active'}).where(eq(mysteryBoxTiers.id,req.params.id)).returning();
  if(!t)return apiError(res,404,'Tier not found');
  res.json(t);
});
app.delete('/api/admin/mystery-boxes/:id',requireAuth,requireAdmin,async(req:any,res)=>{
  const [t]=await db.update(mysteryBoxTiers).set({status:'inactive'}).where(eq(mysteryBoxTiers.id,req.params.id)).returning();
  if(!t)return apiError(res,404,'Tier not found');
  res.json({success:true});
});
app.post('/api/client/mystery-boxes/open',requireAuth,async(req:any,res)=>{try{let result:any;await db.transaction(async tx=>{const [u]=await tx.select().from(users).where(eq(users.id,req.dbUser.id)).for('update');if(u.keys<1)throw new Error('You need a key');const tiers=await tx.select().from(mysteryBoxTiers).where(eq(mysteryBoxTiers.status,'active'));const total=tiers.reduce((a,t)=>a+t.probability,0);if(!tiers.length||total<=0)throw new Error('Mystery box is unavailable');let n=crypto.randomInt(0,total),chosen=tiers[tiers.length-1];for(const t of tiers){if(n<t.probability){chosen=t;break;}n-=t.probability;}const reward=money(num(chosen.minAmount)+Math.random()*(num(chosen.maxAmount)-num(chosen.minAmount)));await tx.update(users).set({keys:u.keys-1}).where(eq(users.id,u.id));await creditWallet(tx,u.id,reward,`Mystery Box: ${chosen.name}` ,chosen.id);result={tier:chosen.name,reward};});res.json(result);}catch(e:any){apiError(res,400,e.message);}});

// Public SMM API — served at /api/v2 (the documented, current path) with /api/v1 kept
// as a permanent alias so existing integrations never break.
app.post(['/api/v1', '/api/v2'], apiLimiter, async (req,res)=>{try{const key=String(req.body?.key||'');if(!key)return apiError(res,401,'Invalid API key','INVALID_API_KEY');const u=await db.query.users.findFirst({where:and(eq(users.status,'active'),sql`(${users.apiKeyHash} = ${hashApiKey(key)} OR ${users.apiKey} = ${key})`)});if(!u)return apiError(res,401,'Invalid API key','INVALID_API_KEY');
if (!u.apiKeyHash && u.apiKey === key) {
  await db.update(users).set({ apiKey: null, apiKeyHash: hashApiKey(key) }).where(eq(users.id, u.id));
}const action=String(req.body?.action||'');if(action==='balance')return res.json({balance:u.balance,currency:(process.env.CURRENCY||'USD')});if(action==='services'){const rows=await db.query.services.findMany({where:eq(services.status,'active'),with:{category:true}});return res.json(rows.filter(s=>s.category?.status==='active').map(s=>({service:s.id,name:s.name,rate:s.pricePer1k,min:s.minQuantity,max:s.maxQuantity,category:s.category?.name||'',refill:s.refillable,cancel:s.cancelable})));}
if(action==='status'){
  const single=req.body?.order!==undefined;
  if(single){const o=await db.query.orders.findFirst({where:and(eq(orders.id,String(req.body.order||'')),eq(orders.userId,u.id))});if(!o)return apiError(res,404,'Order not found','NOT_FOUND');return res.json({order:o.id,status:o.status,charge:o.charge,start_count:o.startCount,remains:o.remains,currency:(process.env.CURRENCY||'USD')});}
  const ids=String(req.body?.orders||'').split(',').map(s=>s.trim()).filter(Boolean).slice(0,100);
  if(!ids.length)return apiError(res,400,'Provide order or orders','VALIDATION_ERROR');
  const rows=await db.query.orders.findMany({where:and(inArray(orders.id,ids.filter(uuidLike)),eq(orders.userId,u.id))});
  const byId=new Map(rows.map(o=>[o.id,o]));
  const out:Record<string,any>={};
  for(const id of ids){const o=byId.get(id);out[id]=o?{charge:o.charge,start_count:o.startCount,status:o.status,remains:o.remains,currency:(process.env.CURRENCY||'USD')}:{error:'Incorrect order ID'};}
  return res.json(out);
}
if(action==='add'){const link=typeof req.body.link==='string'?req.body.link.trim():req.body.link;const {service,q,charge}=await validateOrderInput(req.body.service,link,req.body.quantity);let id='';await db.transaction(async tx=>{await debitWallet(tx,u.id,charge,'API order',undefined);const [o]=await tx.insert(orders).values({userId:u.id,serviceId:service.id,link,quantity:q,charge:charge.toFixed(4),cost:calculateProviderCost(service,q).toFixed(4),status:'Pending'}).returning();id=o.id;});placeOrderToProvider(id).catch(console.error);return res.json({order:id});}
if(action==='refill'){
  const single=req.body?.order!==undefined;
  if(single){try{const r=await requestRefillForOrder(String(req.body.order||''),u.id);return res.json({refill:r.id});}catch(e:any){return res.json({error:e.message||'Refill failed'});}}
  const ids=String(req.body?.orders||'').split(',').map(s=>s.trim()).filter(Boolean).slice(0,100);
  if(!ids.length)return apiError(res,400,'Provide order or orders','VALIDATION_ERROR');
  const out=[];for(const id of ids){try{const r=await requestRefillForOrder(id,u.id);out.push({order:id,refill:r.id});}catch(e:any){out.push({order:id,refill:{error:e.message||'Refill failed'}});}}
  return res.json(out);
}
if(action==='refill_status'){
  const single=req.body?.refill!==undefined;
  if(single){const r=await db.query.refillRequests.findFirst({where:and(eq(refillRequests.id,String(req.body.refill||'')),eq(refillRequests.userId,u.id))});if(!r)return apiError(res,404,'Refill not found','NOT_FOUND');return res.json({status:r.status});}
  const ids=String(req.body?.refills||'').split(',').map(s=>s.trim()).filter(Boolean).slice(0,100);
  if(!ids.length)return apiError(res,400,'Provide refill or refills','VALIDATION_ERROR');
  const rows=await db.query.refillRequests.findMany({where:and(inArray(refillRequests.id,ids.filter(uuidLike)),eq(refillRequests.userId,u.id))});
  const byId=new Map(rows.map(r=>[r.id,r]));
  return res.json(ids.map(id=>{const r=byId.get(id);return {refill:id,status:r?r.status:{error:'Refill not found'}};}));
}
if(action==='cancel'){
  const ids=String(req.body?.orders||req.body?.order||'').split(',').map(s=>s.trim()).filter(Boolean).slice(0,100);
  if(!ids.length)return apiError(res,400,'Provide orders','VALIDATION_ERROR');
  const out=[];for(const id of ids){try{await requestCancelForOrder(id,u.id);out.push({order:id,cancel:1});}catch(e:any){out.push({order:id,cancel:{error:e.message||'Cancel failed'}});}}
  return res.json(out);
}
return apiError(res,400,'Invalid action','INVALID_ACTION');}catch(e:any){apiError(res,400,e.message||'API error','API_ERROR');}});

// Auto-close raffles safely; no fake system audit user.
setInterval(async()=>{try{await db.update(raffles).set({status:'Closed'}).where(and(eq(raffles.status,'Open'),sql`${raffles.endDate} <= now()`));}catch(e){console.error('raffle close job',e);}},60_000);

function validateEnv() {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL && !process.env.SQL_HOST) missing.push('DATABASE_URL (or SQL_HOST/SQL_USER/SQL_PASSWORD/SQL_DB_NAME)');
  if (isProd) {
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      missing.push('FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY');
    }
  }
  if (missing.length) {
    console.error(`[startup] Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

async function ensureAuthSchema(){
  // Older production databases were created before the auth verification/reset
  // fields were added to the Drizzle schema. Keep startup backward-compatible.
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token text`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires timestamp`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token text`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires timestamp`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key_hash text`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS users_email_verification_token_idx ON users(email_verification_token)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS users_password_reset_token_idx ON users(password_reset_token)`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS users_api_key_hash_unique ON users(api_key_hash) WHERE api_key_hash IS NOT NULL`);
}

async function ensureWalletLedgerSchema(){
  // Keep the ledger compatible with older deployments that created this table manually.
  // This prevents wallet credits/debits from failing because of a stale enum/type definition.
  await db.execute(sql`CREATE TABLE IF NOT EXISTS wallet_ledger (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    amount numeric(12,4) NOT NULL,
    type text NOT NULL,
    description text NOT NULL,
    reference_id text,
    created_at timestamp DEFAULT now() NOT NULL
  )`);
  await db.execute(sql`ALTER TABLE wallet_ledger ALTER COLUMN type TYPE text USING type::text`);
  await db.execute(sql`DO $$ DECLARE c record; BEGIN FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='wallet_ledger'::regclass AND contype='c' AND pg_get_constraintdef(oid) ILIKE '%type%' LOOP EXECUTE format('ALTER TABLE wallet_ledger DROP CONSTRAINT %I', c.conname); END LOOP; END $$`);
  await db.execute(sql`ALTER TABLE wallet_ledger ALTER COLUMN amount TYPE numeric(12,4) USING amount::numeric`);
  await db.execute(sql`ALTER TABLE wallet_ledger ALTER COLUMN reference_id TYPE text USING reference_id::text`);
  await db.execute(sql`ALTER TABLE wallet_ledger ALTER COLUMN created_at TYPE timestamp USING created_at::timestamp`);
}

async function startServer(){
  validateEnv();
  try { await ensureAuthSchema(); } catch (e) { console.error('[startup] auth schema check failed', e); throw e; }
  try { await ensureWalletLedgerSchema(); } catch (e) { console.error('[startup] wallet_ledger schema check failed', e); throw e; }
  // JSON 404 for unmatched API routes — must be registered before the SPA/static fallback
  // so a typo'd or unknown /api/* path returns JSON instead of index.html.
  app.use('/api', (_req, res) => apiError(res, 404, 'Not found', 'NOT_FOUND'));
  if(!isProd){const vite=await createViteServer({server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);}else{const distPath=path.join(process.cwd(),'dist');app.use(express.static(distPath));app.get('*',(_req,res)=>res.sendFile(path.join(distPath,'index.html')));}
  app.use((err:any,_req:any,res:any,_next:any)=>{console.error(err);if(!res.headersSent)apiError(res,500,'Internal server error','INTERNAL_ERROR');});
  const server = app.listen(PORT,'0.0.0.0',()=>{console.log(`Server listening on ${PORT}`);startProviderWorker();});

  const shutdown = (signal: string) => {
    console.log(`[shutdown] ${signal} received, closing server...`);
    server.close(() => { console.log('[shutdown] HTTP server closed.'); process.exit(0); });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
startServer().catch(err=>{console.error(err);process.exit(1);});
