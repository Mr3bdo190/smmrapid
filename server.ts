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
  systemReports
} from './src/db/schema';
import { adminAuth } from './src/lib/firebase-admin';
import { ProviderClient, placeOrderToProvider, startProviderWorker, checkOrderStatus } from './src/lib/provider-engine';

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

// The public SMM API (/api/v1) is meant to be called from third-party servers/scripts
// that pass an API key in the body, so it is safe to allow cross-origin requests to it.
app.use('/api/v1', (req, res, next) => {
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
app.use(globalLimiter);

const apiError = (res: express.Response, status: number, message: string, code = 'ERROR') =>
  res.status(status).json({ error: message, code });

const num = (v: unknown) => typeof v === 'number' ? v : Number(v);
const money = (v: number) => Math.round((v + Number.EPSILON) * 10000) / 10000;
const positiveMoney = (v: unknown) => Number.isFinite(num(v)) && num(v) > 0;
const uuidLike = (v: unknown) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const validUrl = (v: unknown) => { try { const u = new URL(String(v)); return ['http:', 'https:'].includes(u.protocol); } catch { return false; } };
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
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((x:string)=>x.trim().toLowerCase()).filter(Boolean);
      const role = adminEmails.includes(email.toLowerCase()) ? 'admin' : 'user';
      try {
        const [created] = await db.insert(users).values({ uid: decoded.uid, email, name: decoded.name || null, role, status: 'active', referralCode }).returning();
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
  res.json({ siteName: s.site_name || 'RapidSMM', currencySymbol: s.currency_symbol || '$', vodafoneCashNumber: s.vodafone_cash_number || '', siteDescription: s.site_description || '', supportEmail: s.support_email || '', siteLogo: s.site_logo || '' });
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

async function validateOrderInput(serviceId: unknown, link: unknown, quantity: unknown) {
  if (!uuidLike(serviceId) || typeof link !== 'string' || link.length < 3 || link.length > 2048 || !validUrl(link)) throw new Error('Invalid order data');
  const q = Number(quantity);
  if (!Number.isInteger(q) || q <= 0) throw new Error('Invalid quantity');
  const service = await db.query.services.findFirst({ where: eq(services.id, String(serviceId)), with: { category: true, provider: true } });
  if (!service || service.status !== 'active' || service.category?.status !== 'active') throw new Error('Service is unavailable');
  if (q < service.minQuantity || q > service.maxQuantity) throw new Error(`Quantity must be between ${service.minQuantity} and ${service.maxQuantity}`);
  const charge = money(num(service.pricePer1k) * q / 1000);
  return { service, q, charge };
}

app.post('/api/client/orders', requireAuth, async (req: any, res) => {
  try {
    const { service, q, charge } = await validateOrderInput(req.body?.serviceId, req.body?.link, req.body?.quantity);
    let orderId = '';
    await db.transaction(async tx => {
      await debitWallet(tx, req.dbUser.id, charge, `Order charge: ${service.name}`);
      const [o] = await tx.insert(orders).values({ userId: req.dbUser.id, serviceId: service.id, link: req.body.link.trim(), quantity: q, charge: charge.toFixed(4), cost: money(num(service.providerPrice) * q / 1000).toFixed(4), status: 'Pending' }).returning();
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
      const [serviceId, link, qty] = line.split('|').map((x: string) => x.trim());
      const { service, q, charge } = await validateOrderInput(serviceId, link, qty);
      parsed.push({ service, link, q, charge }); total += charge;
    }
    total = money(total);
    const ids: string[] = [];
    await db.transaction(async tx => {
      await debitWallet(tx, req.dbUser.id, total, `Mass order (${parsed.length} orders)`);
      for (const p of parsed) {
        const [o] = await tx.insert(orders).values({ userId: req.dbUser.id, serviceId: p.service.id, link: p.link, quantity: p.q, charge: p.charge.toFixed(4), cost: money(num(p.service.providerPrice) * p.q / 1000).toFixed(4), status: 'Pending' }).returning();
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
  const amount = num(req.body?.amount);
  if (!positiveMoney(amount) || amount < 1 || amount > 1000000) return apiError(res, 400, 'Invalid amount', 'INVALID_AMOUNT');
  const method = typeof req.body?.method === 'string' && req.body.method.length <= 50 ? req.body.method : 'Vodafone Cash';
  const details = req.body?.transactionDetails && typeof req.body.transactionDetails === 'object' ? req.body.transactionDetails : {};
  const [p] = await db.insert(payments).values({ userId: req.dbUser.id, amount: money(amount).toFixed(4), method, status: 'Pending', transactionDetails: details }).returning();
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

const paymentApprove = async (paymentId: string, adminId: string) => {
  return db.transaction(async tx => {
    const [p] = await tx.select().from(payments).where(eq(payments.id, paymentId)).for('update');
    if (!p) throw new Error('Payment not found');
    if (p.status !== 'Pending') return false;
    await tx.update(payments).set({ status: 'Approved', resolvedAt: new Date() }).where(eq(payments.id, p.id));
    await creditWallet(tx, p.userId, num(p.amount), `Funds added via ${p.method}`, p.id);
    await applyAffiliateCommission(tx, p);
    return true;
  });
};
app.put('/api/admin/payments/:id/approve', requireAuth, requireAdmin, async (req: any, res) => { try { const changed = await paymentApprove(req.params.id, req.dbUser.id); if (!changed) return apiError(res, 409, 'Payment already resolved', 'ALREADY_RESOLVED'); await audit(req.dbUser.id, 'APPROVE_PAYMENT', 'PAYMENT', req.params.id); res.json({ success: true }); } catch (e: any) { apiError(res, 400, e.message); } });
app.put('/api/admin/payments/:id/reject', requireAuth, requireAdmin, async (req: any, res) => { try { await db.transaction(async tx => { const [p] = await tx.select().from(payments).where(eq(payments.id, req.params.id)).for('update'); if (!p) throw new Error('Payment not found'); if (p.status !== 'Pending') throw new Error('Payment already resolved'); await tx.update(payments).set({ status: 'Rejected', resolvedAt: new Date() }).where(eq(payments.id, p.id)); }); await audit(req.dbUser.id, 'REJECT_PAYMENT', 'PAYMENT', req.params.id); res.json({ success: true }); } catch (e: any) { apiError(res, 400, e.message); } });

// Heleket crypto payment gateway.
// API authentication: MD5(base64(JSON body) + payment API key).
const heleketJson = (value: any) => JSON.stringify(value).replace(/\\\//g, '\\/');
const heleketSign = (body: string, apiKey: string) => crypto.createHash('md5').update(Buffer.from(body).toString('base64') + apiKey).digest('hex');
const heleketApiPost = async (pathName: string, payload: any) => {
  const merchant = process.env.HELEKET_MERCHANT_ID;
  const apiKey = process.env.HELEKET_PAYMENT_API_KEY;
  if (!merchant || !apiKey) throw Object.assign(new Error('Heleket gateway is not configured'), { code: 'GATEWAY_NOT_CONFIGURED' });
  const body = heleketJson(payload);
  const response = await fetch(`https://api.heleket.com${pathName}`, {
    method: 'POST',
    headers: { merchant, sign: heleketSign(body, apiKey), 'Content-Type': 'application/json' },
    body,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || Number(data.state) !== 0) {
    throw new Error(data?.message || data?.result?.message || `Heleket API error (${response.status})`);
  }
  return data.result;
};

app.post('/api/heleket/create', requireAuth, async (req: any, res) => {
  try {
    const amount = num(req.body?.amount);
    if (!positiveMoney(amount) || amount < 1 || amount > 1000000) return apiError(res, 400, 'Invalid amount', 'INVALID_AMOUNT');
    const apiKey = process.env.HELEKET_PAYMENT_API_KEY;
    const merchant = process.env.HELEKET_MERCHANT_ID;
    if (!apiKey || !merchant) return apiError(res, 503, 'Heleket is not configured', 'GATEWAY_NOT_CONFIGURED');
    const currency = process.env.HELEKET_CURRENCY || process.env.CURRENCY || 'USD';
    const baseUrl = process.env.PUBLIC_APP_URL || `${req.protocol}://${req.get('host')}`;
    const [p] = await db.insert(payments).values({
      userId: req.dbUser.id,
      amount: money(amount).toFixed(4),
      method: 'Heleket',
      status: 'Pending',
      transactionDetails: { gateway: 'heleket', currency },
    }).returning();
    const orderId = `PAY-${p.id}`;
    const result = await heleketApiPost('/v1/payment', {
      amount: money(amount).toFixed(4),
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
  } catch (e: any) {
    console.error('Heleket create:', e?.message || e);
    apiError(res, e?.code === 'GATEWAY_NOT_CONFIGURED' ? 503 : 400, e?.message || 'Heleket payment initialization failed', e?.code || 'HELEKET_CREATE_ERROR');
  }
});

app.post('/api/heleket/webhook', async (req, res) => {
  try {
    const apiKey = process.env.HELEKET_PAYMENT_API_KEY;
    const merchant = process.env.HELEKET_MERCHANT_ID;
    if (!apiKey || !merchant) return apiError(res, 503, 'Heleket is not configured', 'GATEWAY_NOT_CONFIGURED');
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
    if (money(num(payload.amount)) !== money(num(p.amount))) return apiError(res, 400, 'Payment amount mismatch', 'PAYMENT_MISMATCH');

    const status = String(payload.status || '').toLowerCase();
    const finalCreditStatuses = new Set(['paid', 'paid_over']);
    const rejectStatuses = new Set(['cancel', 'fail', 'system_fail', 'refund_fail']);
    if (finalCreditStatuses.has(status)) {
      await db.transaction(async tx => {
        const [locked] = await tx.select().from(payments).where(eq(payments.id, p.id)).for('update');
        if (!locked || locked.status !== 'Pending') return;
        await tx.update(payments).set({ status: 'Approved', transactionId: String(payload.txid || payload.uuid || locked.transactionId || orderId), transactionDetails: { gateway: 'heleket', webhook: payload }, resolvedAt: new Date() }).where(eq(payments.id, locked.id));
        // Credit the invoice amount only after a verified final payment webhook.
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

// Kashier integration. Signature verification must be configured for live mode.
app.post('/api/kashier/create', requireAuth, async (req: any, res) => {
  try {
    const amount = num(req.body?.amount);
    if (!positiveMoney(amount) || amount < 1 || amount > 1000000) throw new Error('Invalid amount');
    const merchantId = process.env.KASHIER_MERCHANT_ID;
    const apiKey = process.env.KASHIER_API_KEY;
    if (!merchantId || !apiKey) return apiError(res, 503, 'Payment gateway is not configured', 'GATEWAY_NOT_CONFIGURED');
    const currency = process.env.KASHIER_CURRENCY || 'EGP';
    const [p] = await db.insert(payments).values({ userId: req.dbUser.id, amount: money(amount).toFixed(4), method: 'Kashier', status: 'Pending' }).returning();
    const mode = process.env.KASHIER_MODE === 'live' ? 'live' : 'test'; if (isProd && mode !== 'live') return apiError(res,503,'Live payment gateway is not enabled','GATEWAY_NOT_LIVE');
    const baseUrl = process.env.KASHIER_CHECKOUT_URL || 'https://checkout.kashier.io/';
    const pathToSign = `/?payment=${merchantId}.${p.id}.${amount}.${currency}`;
    const hash = crypto.createHmac('sha256', apiKey).update(pathToSign).digest('hex');
    res.json({ orderId: p.id, amount, currency, merchantId, paymentUrl: `${baseUrl}?merchantId=${encodeURIComponent(merchantId)}&orderId=${encodeURIComponent(p.id)}&amount=${encodeURIComponent(amount)}&currency=${encodeURIComponent(currency)}&hash=${encodeURIComponent(hash)}` });
  } catch (e: any) { apiError(res, 400, e.message); }
});
app.post('/api/kashier/webhook', async (req, res) => {
  try {
    const secret = process.env.KASHIER_WEBHOOK_SECRET || process.env.KASHIER_API_KEY;
    if (!secret) return apiError(res, 503, 'Gateway not configured', 'GATEWAY_NOT_CONFIGURED');
    const provided = String(req.headers['x-kashier-signature'] || req.headers['x-signature'] || '');
    const raw = JSON.stringify(req.body || {});
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    if (!provided || provided.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) return apiError(res, 401, 'Invalid signature', 'INVALID_SIGNATURE');
    const { merchantOrderId, amount, merchantId, paymentStatus, transactionId } = req.body || {};
    if (!merchantOrderId || merchantId !== process.env.KASHIER_MERCHANT_ID) return apiError(res, 400, 'Invalid payment', 'INVALID_PAYMENT');
    const [p] = await db.select().from(payments).where(eq(payments.id, String(merchantOrderId)));
    if (!p || num(p.amount) !== num(amount)) return apiError(res, 400, 'Payment mismatch', 'PAYMENT_MISMATCH');
    if (paymentStatus === 'SUCCESS') {
      await db.transaction(async tx => {
        const [locked] = await tx.select().from(payments).where(eq(payments.id, p.id)).for('update');
        if (!locked || locked.status !== 'Pending') return;
        await tx.update(payments).set({ status: 'Approved', transactionId: transactionId ? String(transactionId) : null, transactionDetails: req.body, resolvedAt: new Date() }).where(eq(payments.id, locked.id));
        await creditWallet(tx, locked.userId, num(locked.amount), 'Kashier Deposit', locked.id);
        await applyAffiliateCommission(tx, locked);
      });
    } else if (['FAILED', 'CANCELLED'].includes(paymentStatus)) {
      await db.update(payments).set({ status: 'Rejected', transactionId: transactionId ? String(transactionId) : null, transactionDetails: req.body, resolvedAt: new Date() }).where(and(eq(payments.id, p.id), eq(payments.status, 'Pending')));
    }
    res.sendStatus(200);
  } catch (e: any) { console.error('Kashier webhook:', e); apiError(res, 400, 'Webhook processing failed', 'WEBHOOK_ERROR'); }
});

// Tickets
app.get('/api/client/tickets', requireAuth, async (req: any, res) => res.json(await db.query.tickets.findMany({ where: eq(tickets.userId, req.dbUser.id), orderBy: [desc(tickets.createdAt)] })));
app.post('/api/client/tickets', requireAuth, async (req: any, res) => {
  const subject = String(req.body?.subject || '').trim(), message = String(req.body?.message || '').trim();
  if (subject.length < 3 || subject.length > 200 || message.length < 1 || message.length > 5000) return apiError(res, 400, 'Invalid ticket data', 'VALIDATION_ERROR');
  const created = await db.transaction(async tx => { const [t] = await tx.insert(tickets).values({ userId: req.dbUser.id, subject, status: 'Open' }).returning(); await tx.insert(ticketMessages).values({ ticketId: t.id, senderId: req.dbUser.id, message, isAdmin: false }); return t; });
  res.status(201).json(created);
});
app.get('/api/client/tickets/:id', requireAuth, async (req: any, res) => { const t = await db.query.tickets.findFirst({ where: eq(tickets.id, req.params.id) }); if (!t || t.userId !== req.dbUser.id) return apiError(res,404,'Ticket not found','NOT_FOUND'); const messages = await db.query.ticketMessages.findMany({ where: eq(ticketMessages.ticketId,t.id), orderBy:[desc(ticketMessages.createdAt)] }); res.json({ ticket:t, messages }); });
app.post('/api/client/tickets/:id/messages', requireAuth, async (req: any, res) => { const message=String(req.body?.message||'').trim(); if(!message||message.length>5000)return apiError(res,400,'Invalid message','VALIDATION_ERROR'); const t=await db.query.tickets.findFirst({where:eq(tickets.id,req.params.id)}); if(!t||t.userId!==req.dbUser.id)return apiError(res,404,'Ticket not found','NOT_FOUND'); if(t.status==='Closed')return apiError(res,409,'Ticket is closed','TICKET_CLOSED'); const [m]=await db.insert(ticketMessages).values({ticketId:t.id,senderId:req.dbUser.id,message,isAdmin:false}).returning(); await db.update(tickets).set({status:'Open'}).where(eq(tickets.id,t.id)); res.status(201).json(m); });

// Affiliate / Referral system
const ensureReferralCode = async (userId: string, current?: string) => {
  if (current) return current;
  for (let i = 0; i < 8; i++) {
    const code = crypto.randomBytes(6).toString('hex').toUpperCase();
    try {
      const [updated] = await db.update(users).set({ referralCode: code }).where(and(eq(users.id, userId), isNull(users.referralCode))).returning({ referralCode: users.referralCode });
      if (updated?.referralCode) return updated.referralCode;
      const row = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { referralCode: true } });
      if (row?.referralCode) return row.referralCode;
    } catch { /* retry on the unique referral_code constraint */ }
  }
  throw new Error('Could not generate referral code');
};

app.post('/api/client/affiliates/click', async (req,res)=>{
  try {
    const code=String(req.body?.referralCode||'').trim().toUpperCase();
    if(!/^[A-Z0-9]{6,32}$/.test(code))return apiError(res,400,'Invalid referral code','VALIDATION_ERROR');
    const ref=await db.query.users.findFirst({where:eq(users.referralCode,code),columns:{id:true,referralCode:true}});
    if(!ref)return res.status(404).json({error:'Referral code not found',code:'REFERRAL_NOT_FOUND'});
    await db.insert(referralClicks).values({referralCode:code});
    res.json({success:true});
  } catch(e:any){ apiError(res,500,e.message||'Unable to record referral click','REFERRAL_CLICK_ERROR'); }
});

app.get('/api/client/affiliates/stats', requireAuth, async (req:any,res)=>{
  try {
    const code = await ensureReferralCode(req.dbUser.id, req.dbUser.referralCode);
    const [clickRow] = await db.select({count:sql<number>`count(*)`}).from(referralClicks).where(eq(referralClicks.referralCode,code));
    const [signupRow] = await db.select({count:sql<number>`count(*)`}).from(users).where(eq(users.referredBy,req.dbUser.id));
    const [paidRow] = await db.select({count:sql<number>`count(distinct ${affiliateCommissions.referredUserId})`}).from(affiliateCommissions).where(eq(affiliateCommissions.affiliateId,req.dbUser.id));
    const [depositRow] = await db.select({amount:sql<string>`coalesce(sum(${payments.amount}),0)`}).from(affiliateCommissions).innerJoin(payments,eq(payments.id,affiliateCommissions.paymentId)).where(eq(affiliateCommissions.affiliateId,req.dbUser.id));
    const [commissionRow] = await db.select({amount:sql<string>`coalesce(sum(${affiliateCommissions.amount}),0)`}).from(affiliateCommissions).where(eq(affiliateCommissions.affiliateId,req.dbUser.id));
    const referred = await db.select({id:users.id,name:users.name,email:users.email,status:users.status,createdAt:users.createdAt}).from(users).where(eq(users.referredBy,req.dbUser.id)).orderBy(desc(users.createdAt)).limit(100);
    const commissions = await db.select({id:affiliateCommissions.id,amount:affiliateCommissions.amount,paymentId:affiliateCommissions.paymentId,createdAt:affiliateCommissions.createdAt,referredEmail:users.email}).from(affiliateCommissions).innerJoin(users,eq(users.id,affiliateCommissions.referredUserId)).where(eq(affiliateCommissions.affiliateId,req.dbUser.id)).orderBy(desc(affiliateCommissions.createdAt)).limit(100);
    const totalCommission=money(num(commissionRow?.amount||0));
    res.json({referralCode:code,referralLink:`${process.env.PUBLIC_APP_URL || `${req.protocol}://${req.get('host')}`}/?ref=${encodeURIComponent(code)}`,clicks:Number(clickRow?.count||0),signups:Number(signupRow?.count||0),paidReferrals:Number(paidRow?.count||0),referralDeposits:money(num(depositRow?.amount||0)),totalCommission,referred,commissions});
  } catch(e:any){ console.error('affiliate stats',e); apiError(res,500,'Unable to load affiliate statistics','AFFILIATE_STATS_ERROR'); }
});

app.get('/api/admin/affiliates', requireAuth, requireAdmin, async (_req,res)=>{
  try {
    const [settingsRows, usersRows, clicksRows, commissionRows] = await Promise.all([
      db.select().from(settings),
      db.select({id:users.id,name:users.name,email:users.email,referralCode:users.referralCode,createdAt:users.createdAt}).from(users).orderBy(desc(users.createdAt)),
      db.select({referralCode:referralClicks.referralCode,count:sql<number>`count(*)`}).from(referralClicks).groupBy(referralClicks.referralCode),
      db.select({id:affiliateCommissions.id,affiliateId:affiliateCommissions.affiliateId,referredUserId:affiliateCommissions.referredUserId,paymentId:affiliateCommissions.paymentId,amount:affiliateCommissions.amount,createdAt:affiliateCommissions.createdAt}).from(affiliateCommissions).orderBy(desc(affiliateCommissions.createdAt)).limit(500)
    ]);
    const clickMap=new Map(clicksRows.map((r:any)=>[r.referralCode,Number(r.count||0)]));
    const ids=commissionRows.map((r:any)=>r.affiliateId).filter(Boolean);
    const refIds=commissionRows.map((r:any)=>r.referredUserId).filter(Boolean);
    const payIds=commissionRows.map((r:any)=>r.paymentId).filter(Boolean);
    const [commissionUsers,paymentRows]=await Promise.all([
      ids.length?db.select({id:users.id,email:users.email,name:users.name,referredBy:users.referredBy}).from(users).where(inArray(users.id,[...new Set([...ids,...refIds])])):Promise.resolve([]),
      payIds.length?db.select({id:payments.id,amount:payments.amount}).from(payments).where(inArray(payments.id,[...new Set(payIds)])):Promise.resolve([])
    ]);
    const userMap=new Map((commissionUsers as any[]).map((u:any)=>[u.id,u]));
    const payMap=new Map((paymentRows as any[]).map((p:any)=>[p.id,num(p.amount)]));
    const byAffiliate=new Map<string,any>();
    for(const u of usersRows){
      byAffiliate.set(u.id,{...u,clicks:Number(clickMap.get(u.referralCode)||0),signups:0,paidReferrals:new Set<string>(),referralDeposits:0,totalCommission:0});
    }
    const signupMap=new Map<string,number>();
    for(const u of (await db.select({id:users.id,referredBy:users.referredBy}).from(users))) if(u.referredBy) signupMap.set(u.referredBy,(signupMap.get(u.referredBy)||0)+1);
    for(const [id,row] of byAffiliate) row.signups=signupMap.get(id)||0;
    for(const c of commissionRows){ const row=byAffiliate.get(c.affiliateId); if(row){row.paidReferrals.add(c.referredUserId);row.referralDeposits+=payMap.get(c.paymentId)||0;row.totalCommission+=num(c.amount);} }
    const affiliates=[...byAffiliate.values()].map(r=>({...r,paidReferrals:r.paidReferrals.size,referralDeposits:money(r.referralDeposits),totalCommission:money(r.totalCommission)})).filter(r=>r.referralCode||r.signups||r.totalCommission!=='0.0000');
    const summary={clicks:[...clickMap.values()].reduce((a,b)=>a+b,0),signups:[...signupMap.values()].reduce((a,b)=>a+b,0),deposited:money(commissionRows.reduce((a,c)=>a+(payMap.get(c.paymentId)||0),0)),commissions:money(commissionRows.reduce((a,c)=>a+num(c.amount),0)),commissionPercentage:settingsRows.find((x:any)=>x.key==='affiliate_commission_percentage')?.value||'5'};
    const recentCommissions=commissionRows.slice(0,100).map((c:any)=>({id:c.id,affiliateEmail:userMap.get(c.affiliateId)?.email||'-',referredEmail:userMap.get(c.referredUserId)?.email||'-',paymentId:c.paymentId,amount:c.amount,createdAt:c.createdAt}));
    res.json({summary,affiliates,recentCommissions});
  } catch(e:any){ console.error('admin affiliates',e); apiError(res,500,'Unable to load affiliate report','AFFILIATE_ADMIN_ERROR'); }
});

// Game/rewards
app.post('/api/client/game/claim', requireAuth, async (req:any,res)=>{ try { let result:any; await db.transaction(async tx=>{ const [u]=await tx.select().from(users).where(eq(users.id,req.dbUser.id)).for('update'); const now=new Date(); if(u.lastClaimDate && now.getTime()-new Date(u.lastClaimDate).getTime()<24*60*60*1000)throw new Error('Daily claim is not available yet'); const last=u.lastClaimDate?new Date(u.lastClaimDate):null; const within=last && now.getTime()-last.getTime()<=48*60*60*1000; const streak=within?(u.currentStreak+1):1; const points=10+Math.min(streak,30)*2; await tx.update(users).set({gamePoints:u.gamePoints+points,currentStreak:streak,lastClaimDate:now}).where(eq(users.id,u.id)); result={points,currentStreak:streak}; }); res.json(result); } catch(e:any){apiError(res,400,e.message);} });
app.post('/api/client/game/exchange', requireAuth, async (req:any,res)=>{ try { await db.transaction(async tx=>{const [u]=await tx.select().from(users).where(eq(users.id,req.dbUser.id)).for('update'); if(u.gamePoints<100)throw new Error('Need at least 100 points'); await tx.update(users).set({gamePoints:u.gamePoints-100,keys:u.keys+1}).where(eq(users.id,u.id));}); res.json({success:true,keys:1}); }catch(e:any){apiError(res,400,e.message);} });

// Shortlinks with signed one-time claim tokens.
app.get('/api/client/shortlinks', requireAuth, async (req:any,res)=>{const rows=await db.select().from(shortlinks).where(eq(shortlinks.status,'active')); const claims=await db.select().from(shortlinkClaims).where(eq(shortlinkClaims.userId,req.dbUser.id)); const claimed=new Set(claims.map(c=>c.shortlinkId)); res.json(rows.map(s=>({...s,claimed:claimed.has(s.id)})));});
app.post('/api/client/shortlinks/:id/start', requireAuth, async (req:any,res)=>{const s=await db.query.shortlinks.findFirst({where:and(eq(shortlinks.id,req.params.id),eq(shortlinks.status,'active'))}); if(!s)return apiError(res,404,'Shortlink not found','NOT_FOUND'); const existing=await db.query.shortlinkClaims.findFirst({where:and(eq(shortlinkClaims.userId,req.dbUser.id),eq(shortlinkClaims.shortlinkId,s.id))}); if(existing)return apiError(res,409,'Already claimed','ALREADY_CLAIMED'); const token=crypto.randomBytes(32).toString('hex'); await db.insert(shortlinkTokens).values({token,userId:req.dbUser.id,shortlinkId:s.id,expiresAt:new Date(Date.now()+30*60*1000)}); res.json({token,url:s.url});});
app.post('/api/client/shortlinks/:id/claim', requireAuth, async (req:any,res)=>{try{const token=String(req.body?.token||''); if(!token)throw new Error('Open the shortlink first'); await db.transaction(async tx=>{const [t]=await tx.select().from(shortlinkTokens).where(and(eq(shortlinkTokens.token,token),eq(shortlinkTokens.userId,req.dbUser.id),eq(shortlinkTokens.shortlinkId,req.params.id))).for('update'); if(!t||!t.expiresAt||new Date(t.expiresAt)<new Date())throw new Error('Claim token expired'); if(Date.now()-new Date(t.createdAt).getTime()<10_000)throw new Error('Please wait a few seconds after visiting the shortlink'); const [s]=await tx.select().from(shortlinks).where(eq(shortlinks.id,req.params.id)); if(!s||s.status!=='active')throw new Error('Shortlink unavailable'); const [already]=await tx.select().from(shortlinkClaims).where(and(eq(shortlinkClaims.userId,req.dbUser.id),eq(shortlinkClaims.shortlinkId,s.id))); if(already)throw new Error('Already claimed'); await tx.insert(shortlinkClaims).values({userId:req.dbUser.id,shortlinkId:s.id}); await creditWallet(tx,req.dbUser.id,num(s.rewardAmount),'Shortlink reward',s.id); await tx.delete(shortlinkTokens).where(eq(shortlinkTokens.token,t.token));}); res.json({success:true});}catch(e:any){apiError(res,400,e.message);}});

// Raffles
app.get('/api/client/raffles', requireAuth, async (req:any,res)=>{const rs=await db.select().from(raffles).orderBy(desc(raffles.createdAt)); const out=[]; for(const r of rs){const ts=await db.select().from(raffleTickets).where(eq(raffleTickets.raffleId,r.id)); out.push({...r,ticketsCount:ts.length,userTicketsCount:ts.filter(t=>t.userId===req.dbUser.id).length});} res.json(out);});
app.post('/api/client/raffles/:id/buy', requireAuth, async(req:any,res)=>{try{const qty=Number(req.body?.qty||1); if(!Number.isInteger(qty)||qty<1||qty>100)throw new Error('Invalid quantity'); await db.transaction(async tx=>{const [r]=await tx.select().from(raffles).where(eq(raffles.id,req.params.id)).for('update'); if(!r)throw new Error('Raffle not found'); if(r.status!=='Open'||new Date(r.endDate)<=new Date())throw new Error('Raffle is closed'); const [countRow]=await tx.select({count:sql<number>`count(*)`}).from(raffleTickets).where(eq(raffleTickets.raffleId,r.id)); const total=Number(countRow.count||0); const [userCountRow]=await tx.select({count:sql<number>`count(*)`}).from(raffleTickets).where(and(eq(raffleTickets.raffleId,r.id),eq(raffleTickets.userId,req.dbUser.id))); const uc=Number(userCountRow.count||0); if(r.maxTickets && total+qty>r.maxTickets)throw new Error('Maximum tickets reached'); if(r.maxTicketsPerUser&&uc+qty>r.maxTicketsPerUser)throw new Error('User ticket limit reached'); const cost=money(num(r.ticketPrice)*qty); await debitWallet(tx,req.dbUser.id,cost,`Raffle tickets: ${r.title}`,r.id); await tx.insert(raffleTickets).values(Array.from({length:qty},()=>({raffleId:r.id,userId:req.dbUser.id})));}); res.json({success:true});}catch(e:any){apiError(res,400,e.message);}});

// Admin settings/users/categories/services/providers/orders/payments/tickets/reports/audit/raffles/mystery
const secretKeys = new Set(['KASHIER_API_KEY','KASHIER_WEBHOOK_SECRET','provider_api_key']);
app.get('/api/admin/settings',requireAuth,requireAdmin,async(_req,res)=>{const rows=await db.select().from(settings); const out:any={}; for(const r of rows)out[r.key]=secretKeys.has(r.key)?'********':r.value; res.json(out);});
app.put('/api/admin/settings',requireAuth,requireAdmin,async(req:any,res)=>{const allowed=new Set(['site_name','currency_symbol','vodafone_cash_number','site_description','support_email','site_logo','affiliate_commission_percentage']); for(const [key,val] of Object.entries(req.body||{})){if(!allowed.has(key))return apiError(res,400,`Setting not allowed: ${key}`,'INVALID_SETTING'); const value=String(val).trim(); if(key==='affiliate_commission_percentage'&&(!Number.isFinite(num(value))||num(value)<0||num(value)>100))return apiError(res,400,'Invalid commission percentage','INVALID_SETTING'); await db.insert(settings).values({key,value}).onConflictDoUpdate({target:settings.key,set:{value}});} await audit(req.dbUser.id,'UPDATE_SETTINGS','SETTINGS','settings'); res.json({success:true});});
app.get('/api/admin/users',requireAuth,requireAdmin,async(_req,res)=>{
  const rows=await db.select({
    id:users.id,uid:users.uid,name:users.name,email:users.email,role:users.role,status:users.status,
    balance:users.balance,gamePoints:users.gamePoints,currentStreak:users.currentStreak,keys:users.keys,
    referralCode:users.referralCode,referredBy:users.referredBy,createdAt:users.createdAt
  }).from(users).orderBy(desc(users.createdAt));
  res.json(rows);
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
app.post('/api/admin/services',requireAuth,requireAdmin,async(req:any,res)=>{const d=req.body||{};const min=Number(d.minQuantity),max=Number(d.maxQuantity),price=num(d.pricePer1k);if(!uuidLike(d.categoryId)||!d.name||!positiveMoney(price)||!Number.isInteger(min)||!Number.isInteger(max)||min<1||max<min)return apiError(res,400,'Invalid service data');const cat=await db.query.categories.findFirst({where:eq(categories.id,d.categoryId)});if(!cat)return apiError(res,404,'Category not found');if(d.providerId&&uuidLike(d.providerId)){const pr=await db.query.providers.findFirst({where:and(eq(providers.id,d.providerId),eq(providers.isDeleted,false))});if(!pr)return apiError(res,404,'Provider not found');}const [s]=await db.insert(services).values({categoryId:d.categoryId,name:String(d.name).trim(),pricePer1k:money(price).toFixed(4),minQuantity:min,maxQuantity:max,providerId:uuidLike(d.providerId)?d.providerId:null,providerServiceId:d.providerServiceId||null,providerPrice:positiveMoney(d.providerPrice)?money(num(d.providerPrice)).toFixed(4):'0.0000',description:d.description||null,sortOrder:Number(d.sortOrder||0),cashbackPercentage:Math.max(0,Math.min(100,Number(d.cashbackPercentage||0))),status:d.status==='inactive'?'inactive':'active'}).returning();res.status(201).json(s);});
app.put('/api/admin/services/:id',requireAuth,requireAdmin,async(req:any,res)=>{const d=req.body||{};const [s]=await db.update(services).set({name:d.name,categoryId:d.categoryId,pricePer1k:String(d.pricePer1k),minQuantity:Number(d.minQuantity),maxQuantity:Number(d.maxQuantity),providerId:d.providerId||null,providerServiceId:d.providerServiceId||null,providerPrice:d.providerPrice?String(d.providerPrice):'0.0000',description:d.description||null,sortOrder:Number(d.sortOrder||0),cashbackPercentage:Number(d.cashbackPercentage||0),status:d.status==='inactive'?'inactive':'active'}).where(eq(services.id,req.params.id)).returning();if(!s)return apiError(res,404,'Service not found');res.json(s);});
app.delete('/api/admin/services/:id',requireAuth,requireAdmin,async(req,res)=>{const [s]=await db.update(services).set({status:'inactive'}).where(eq(services.id,req.params.id)).returning();if(!s)return apiError(res,404,'Service not found');res.json({success:true});});
app.put('/api/admin/services/bulk',requireAuth,requireAdmin,async(req:any,res)=>{try{const ids=Array.isArray(req.body?.serviceIds)?req.body.serviceIds.filter(uuidLike):[];if(!ids.length)return apiError(res,400,'No services selected');const status=req.body?.status;if(!['active','inactive'].includes(status))return apiError(res,400,'Invalid status');const changed=await db.update(services).set({status}).where(inArray(services.id,ids)).returning({id:services.id});await audit(req.dbUser.id,'BULK_UPDATE_SERVICES','SERVICE','bulk',undefined,undefined,`${changed.length} services -> ${status}`);res.json({success:true,changed:changed.length});}catch(e:any){apiError(res,400,e.message||'Bulk update failed');}});

app.get('/api/admin/providers',requireAuth,requireAdmin,async(_req,res)=>{const ps=await db.select({id:providers.id,name:providers.name,apiUrl:providers.apiUrl,profitMargin:providers.profitMargin,status:providers.status,isDeleted:providers.isDeleted}).from(providers).where(eq(providers.isDeleted,false));res.json(ps);});
app.post('/api/admin/providers',requireAuth,requireAdmin,async(req:any,res)=>{if(!req.body?.name||!validUrl(req.body.apiUrl)||!req.body.apiKey)return apiError(res,400,'Invalid provider');await assertSafeProviderUrl(String(req.body.apiUrl));const margin=Number(req.body.profitMargin ?? 50);if(!Number.isInteger(margin)||margin<0||margin>10000)return apiError(res,400,'Invalid profit margin');const [p]=await db.insert(providers).values({name:String(req.body.name).trim(),apiUrl:String(req.body.apiUrl).trim(),apiKey:String(req.body.apiKey),profitMargin:margin,status:req.body.status==='inactive'?'inactive':'active'}).returning();await audit(req.dbUser.id,'CREATE_PROVIDER','PROVIDER',p.id);res.status(201).json({id:p.id,name:p.name,apiUrl:p.apiUrl,status:p.status});});
app.put('/api/admin/providers/:id',requireAuth,requireAdmin,async(req:any,res)=>{
  try {
    const [old]=await db.select().from(providers).where(and(eq(providers.id,req.params.id),eq(providers.isDeleted,false)));
    if(!old)return apiError(res,404,'Provider not found');
    const name=String(req.body?.name ?? old.name).trim();
    const apiUrl=String(req.body?.apiUrl ?? old.apiUrl).trim();
    const apiKey=String(req.body?.apiKey ?? '').trim();
    const margin=Number(req.body?.profitMargin ?? old.profitMargin);
    const status=req.body?.status==='inactive'?'inactive':'active';
    if(name.length<2||name.length>100||!validUrl(apiUrl)||!Number.isInteger(margin)||margin<0||margin>10000)return apiError(res,400,'Invalid provider data');
    await assertSafeProviderUrl(apiUrl);
    const patch:any={name,apiUrl,profitMargin:margin,status};
    if(apiKey)patch.apiKey=apiKey;
    const [updated]=await db.update(providers).set(patch).where(eq(providers.id,old.id)).returning({id:providers.id,name:providers.name,apiUrl:providers.apiUrl,profitMargin:providers.profitMargin,status:providers.status,isDeleted:providers.isDeleted});
    await audit(req.dbUser.id,'UPDATE_PROVIDER','PROVIDER',old.id,undefined,old.name,updated.name);
    res.json(updated);
  } catch(e:any){apiError(res,400,e.message||'Invalid provider');}
});
app.post('/api/admin/providers/:id/test',requireAuth,requireAdmin,async(req:any,res)=>{
  try{
    const [p]=await db.select().from(providers).where(and(eq(providers.id,req.params.id),eq(providers.isDeleted,false)));
    if(!p)return apiError(res,404,'Provider not found');
    await assertSafeProviderUrl(p.apiUrl);
    const client=new ProviderClient(p.apiUrl,p.apiKey);
    const result=await client.balance();
    if(result.error)return apiError(res,502,result.error,'PROVIDER_CONNECTION_FAILED');
    res.json({success:true,message:'Connection successful',balance:result.balance??null,currency:result.currency??null});
  }catch(e:any){apiError(res,502,e.message||'Provider connection failed','PROVIDER_CONNECTION_FAILED');}
});
app.get('/api/admin/providers/:id/services',requireAuth,requireAdmin,async(req,res)=>{
  const rows=await db.select().from(services).where(and(eq(services.providerId,req.params.id),eq(services.status,'active'))).orderBy(asc(services.sortOrder));
  res.json(rows);
});
app.put('/api/admin/providers/:id/services/bulk',requireAuth,requireAdmin,async(req:any,res)=>{
  try{
    const [p]=await db.select().from(providers).where(and(eq(providers.id,req.params.id),eq(providers.isDeleted,false)));
    if(!p)return apiError(res,404,'Provider not found');
    const ids=Array.isArray(req.body?.serviceIds)?req.body.serviceIds.filter(uuidLike):[];
    if(!ids.length)return apiError(res,400,'No services selected');
    const patch:any={};
    if(req.body?.status==='active'||req.body?.status==='inactive')patch.status=req.body.status;
    if(req.body?.providerPrice !== undefined && req.body?.providerPrice !== ''){const v=num(req.body.providerPrice);if(v<0||!Number.isFinite(v))return apiError(res,400,'Invalid provider price');patch.providerPrice=v.toFixed(4);}
    const priceChange=req.body?.priceChangePercent;
    if(priceChange!==undefined && priceChange!==''){const pct=Number(priceChange);if(!Number.isFinite(pct)||pct<-100||pct>1000)return apiError(res,400,'Invalid price change');}
    let changed=0;
    await db.transaction(async tx=>{
      const rows=await tx.select().from(services).where(and(inArray(services.id,ids),eq(services.providerId,p.id)));
      for(const row of rows){
        const localPatch={...patch};
        if(priceChange!==undefined && priceChange!==''){const pct=Number(priceChange);localPatch.pricePer1k=(Number(row.pricePer1k)*(1+pct/100)).toFixed(4);}
        if(Object.keys(localPatch).length){await tx.update(services).set(localPatch).where(eq(services.id,row.id));changed++;}
      }
    });
    await audit(req.dbUser.id,'BULK_UPDATE_PROVIDER_SERVICES','PROVIDER',p.id,undefined,undefined,`${changed} services`);
    res.json({success:true,changed});
  }catch(e:any){apiError(res,400,e.message||'Bulk update failed');}
});

app.delete('/api/admin/providers/:id',requireAuth,requireAdmin,async(req:any,res)=>{
  const [p]=await db.update(providers).set({isDeleted:true,status:'inactive'}).where(and(eq(providers.id,req.params.id),eq(providers.isDeleted,false))).returning();
  if(!p)return apiError(res,404,'Provider not found');
  await audit(req.dbUser.id,'DELETE_PROVIDER','PROVIDER',p.id);
  res.json({success:true});
});
app.get('/api/admin/providers/:id/balance',requireAuth,requireAdmin,async(req,res)=>{try{const [p]=await db.select().from(providers).where(and(eq(providers.id,req.params.id),eq(providers.isDeleted,false)));if(!p)return apiError(res,404,'Provider not found');await assertSafeProviderUrl(p.apiUrl);const c=new ProviderClient(p.apiUrl,p.apiKey);const b=await c.balance();if(b.error)return apiError(res,502,'Provider request failed');res.json(b);}catch{apiError(res,502,'Provider request failed');}});
app.post('/api/admin/providers/:id/sync',requireAuth,requireAdmin,async(req:any,res)=>{
  try{
    const [p]=await db.select().from(providers).where(and(eq(providers.id,req.params.id),eq(providers.isDeleted,false)));
    if(!p)return apiError(res,404,'Provider not found');
    await assertSafeProviderUrl(p.apiUrl);
    const data=await new ProviderClient(p.apiUrl,p.apiKey).services();
    if(data.error)return apiError(res,502,`Provider error: ${String(data.error)}`,'PROVIDER_SYNC_FAILED');
    const incoming=Array.isArray(data) ? data : (Array.isArray(data.services) ? data.services : Array.isArray(data.data) ? data.data : Array.isArray(data.result) ? data.result : []);
    if(!incoming.length)return res.json({success:true,synced:0,created:0,updated:0});
    const defaultCategoryName=`${p.name} Services`;
    let created=0,updated=0;
    await db.transaction(async tx=>{
      const categoryRows=await tx.select().from(categories).where(eq(categories.name,defaultCategoryName)).limit(1); let category=categoryRows[0];
      if(!category){
        const [c]=await tx.insert(categories).values({name:defaultCategoryName,status:'active'}).returning();
        category=c;
      }
      for(const raw of incoming.slice(0,2000)){
        const providerServiceId=String(raw.service ?? raw.id ?? '').trim();
        const name=String(raw.name ?? `Service ${providerServiceId}`).trim().slice(0,150);
        const providerPrice=Number(raw.rate ?? raw.price ?? raw.pricePer1k);
        const min=Number(raw.min ?? raw.minQuantity ?? 1);
        const max=Number(raw.max ?? raw.maxQuantity ?? 1000000);
        if(!providerServiceId||!name||!Number.isFinite(providerPrice)||providerPrice<0||!Number.isInteger(min)||!Number.isInteger(max)||min<1||max<min)continue;
        const selling=money(providerPrice*(1+Math.max(0,p.profitMargin)/100));
        const existingRows=await tx.select().from(services).where(and(eq(services.providerId,p.id),eq(services.providerServiceId,providerServiceId))).limit(1); const existing=existingRows[0];
        if(existing){
          await tx.update(services).set({name,categoryId:category.id,providerPrice:providerPrice.toFixed(4),pricePer1k:selling.toFixed(4),minQuantity:min,maxQuantity:max,status:'active'}).where(eq(services.id,existing.id));
          updated++;
        }else{
          await tx.insert(services).values({categoryId:category.id,providerId:p.id,providerServiceId,name,providerPrice:providerPrice.toFixed(4),pricePer1k:selling.toFixed(4),minQuantity:min,maxQuantity:max,status:'active'});
          created++;
        }
      }
    });
    await audit(req.dbUser.id,'SYNC_PROVIDER','PROVIDER',p.id,`created=${created},updated=${updated}`);
    res.json({success:true,synced:created+updated,created,updated});
  }catch(e:any){apiError(res,502,e.message||'Provider synchronization failed','PROVIDER_SYNC_FAILED');}
});

app.get('/api/admin/orders',requireAuth,requireAdmin,async(_req,res)=>res.json(await db.query.orders.findMany({orderBy:[desc(orders.createdAt)],with:{user:true,service:true},limit:500})));
app.post('/api/admin/orders/:id/refresh',requireAuth,requireAdmin,async(req:any,res)=>{try{const [o]=await db.select().from(orders).where(eq(orders.id,req.params.id));if(!o)return apiError(res,404,'Order not found');if(!o.providerOrderId)return apiError(res,409,'Order has no provider order ID');await checkOrderStatus(o.id);const [updated]=await db.select().from(orders).where(eq(orders.id,o.id));await audit(req.dbUser.id,'REFRESH_ORDER_STATUS','ORDER',o.id,undefined,o.status,updated?.status||o.status);res.json(updated||o);}catch(e:any){apiError(res,400,e.message||'Failed to refresh order');}});
app.get('/api/admin/payments',requireAuth,requireAdmin,async(_req,res)=>res.json(await db.query.payments.findMany({orderBy:[desc(payments.createdAt)],with:{user:true},limit:500})));
app.get('/api/admin/tickets',requireAuth,requireAdmin,async(_req,res)=>res.json(await db.query.tickets.findMany({orderBy:[desc(tickets.createdAt)],with:{user:true},limit:500})));
app.get('/api/admin/tickets/:id',requireAuth,requireAdmin,async(req,res)=>{const t=await db.query.tickets.findFirst({where:eq(tickets.id,req.params.id),with:{user:true}});if(!t)return apiError(res,404,'Ticket not found');res.json({ticket:t,messages:await db.query.ticketMessages.findMany({where:eq(ticketMessages.ticketId,t.id),orderBy:[desc(ticketMessages.createdAt)]})});});
app.post('/api/admin/tickets/:id/messages',requireAuth,requireAdmin,async(req:any,res)=>{const m=String(req.body?.message||'').trim();const t=await db.query.tickets.findFirst({where:eq(tickets.id,req.params.id)});if(!t)return apiError(res,404,'Ticket not found');if(!m||m.length>5000)return apiError(res,400,'Invalid message');const [msg]=await db.insert(ticketMessages).values({ticketId:t.id,senderId:req.dbUser.id,message:m,isAdmin:true}).returning();await db.update(tickets).set({status:'Answered'}).where(eq(tickets.id,t.id));res.status(201).json(msg);});
app.put('/api/admin/tickets/:id/status',requireAuth,requireAdmin,async(req,res)=>{if(!['Open','Answered','Closed'].includes(req.body?.status))return apiError(res,400,'Invalid status');const [t]=await db.update(tickets).set({status:req.body.status}).where(eq(tickets.id,req.params.id)).returning();if(!t)return apiError(res,404,'Ticket not found');res.json(t);});
app.get('/api/admin/audit',requireAuth,requireAdmin,async(_req,res)=>res.json(await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(500)));
app.get('/api/admin/reports',requireAuth,requireAdmin,async(_req,res)=>res.json(await db.select().from(systemReports).orderBy(desc(systemReports.createdAt)).limit(500)));
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

// Public SMM API
app.post('/api/v1', apiLimiter, async (req,res)=>{try{const key=String(req.body?.key||'');if(!key)return apiError(res,401,'Invalid API key','INVALID_API_KEY');const u=await db.query.users.findFirst({where:and(eq(users.status,'active'),sql`(${users.apiKeyHash} = ${hashApiKey(key)} OR ${users.apiKey} = ${key})`)});if(!u)return apiError(res,401,'Invalid API key','INVALID_API_KEY');
if (!u.apiKeyHash && u.apiKey === key) {
  await db.update(users).set({ apiKey: null, apiKeyHash: hashApiKey(key) }).where(eq(users.id, u.id));
}const action=String(req.body?.action||'');if(action==='balance')return res.json({balance:u.balance,currency:(process.env.CURRENCY||'EGP')});if(action==='services'){const rows=await db.query.services.findMany({where:eq(services.status,'active'),with:{category:true}});return res.json(rows.filter(s=>s.category?.status==='active').map(s=>({service:s.id,name:s.name,rate:s.pricePer1k,min:s.minQuantity,max:s.maxQuantity,category:s.category?.name||''})));}if(action==='status'){const o=await db.query.orders.findFirst({where:and(eq(orders.id,String(req.body.order||'')),eq(orders.userId,u.id))});if(!o)return apiError(res,404,'Order not found','NOT_FOUND');return res.json({order:o.id,status:o.status,charge:o.charge,start_count:o.startCount,remains:o.remains});}if(action==='add'){const link=typeof req.body.link==='string'?req.body.link.trim():req.body.link;const {service,q,charge}=await validateOrderInput(req.body.service,link,req.body.quantity);let id='';await db.transaction(async tx=>{await debitWallet(tx,u.id,charge,'API order',undefined);const [o]=await tx.insert(orders).values({userId:u.id,serviceId:service.id,link,quantity:q,charge:charge.toFixed(4),cost:money(num(service.providerPrice)*q/1000).toFixed(4),status:'Pending'}).returning();id=o.id;});placeOrderToProvider(id).catch(console.error);return res.json({order:id});}return apiError(res,400,'Invalid action','INVALID_ACTION');}catch(e:any){apiError(res,400,e.message||'API error','API_ERROR');}});

// Auto-close raffles safely; no fake system audit user.
setInterval(async()=>{try{await db.update(raffles).set({status:'Closed'}).where(and(eq(raffles.status,'Open'),sql`${raffles.endDate} <= now()`));}catch(e){console.error('raffle close job',e);}},60_000);

function validateEnv() {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL && !process.env.SQL_HOST) missing.push('DATABASE_URL (or SQL_HOST/SQL_USER/SQL_PASSWORD/SQL_DB_NAME)');
  if (isProd) {
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      missing.push('FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY');
    }
    if (!process.env.ADMIN_EMAILS) console.warn('[startup] ADMIN_EMAILS is not set — no account will be auto-promoted to admin.');
    if (process.env.KASHIER_MODE !== 'live') console.warn('[startup] KASHIER_MODE is not "live" — real deposits via Kashier will be refused in production.');
  }
  if (missing.length) {
    console.error(`[startup] Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
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
  try { await ensureWalletLedgerSchema(); } catch (e) { console.error('[startup] wallet_ledger schema check failed', e); }
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
