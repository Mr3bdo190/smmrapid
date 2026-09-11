// import { Request, Response } from 'express';
import { eq, and, isNull } from 'drizzle-orm';
import crypto from 'node:crypto';
import { db } from '../../src/db/index';
import { users, settings } from '../../src/db/schema';
import { adminAuth } from '../../src/lib/firebase-admin';
import { apiError } from '../api-utils';

interface AuthenticatedRequest extends Request {
  user?: any;
  dbUser?: any;
}

export default async function handler(req: AuthenticatedRequest, res: Response) {
  if (req.method !== 'POST') {
    return apiError(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
  }

  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return apiError(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    const token = header.slice(7).trim();
    if (!token) return apiError(res, 401, 'Unauthorized', 'UNAUTHORIZED');

    let decoded: any;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch (e: any) {
      console.error('[auth/sync] Firebase token verification failed:', e?.code || e?.message || e);
      return apiError(res, 401, 'Firebase authentication failed. Please sign in again.', 'INVALID_TOKEN');
    }

    let userRecord = await db.query.users.findFirst({ where: eq(users.uid, decoded.uid) });
    if (!userRecord) {
      const email = decoded.email;
      if (!email) return apiError(res, 400, 'Verified account has no email', 'INVALID_ACCOUNT');
      const referralCode = crypto.randomBytes(6).toString('hex').toUpperCase();
      // New accounts are regular users. Promote an administrator explicitly in the database.
      const role = 'user';
      const name = decoded.name || req.body?.name || null;
      try {
        const [created] = await db.insert(users).values({ uid: decoded.uid, email, name, role, status: 'active', referralCode }).returning();
        userRecord = created;
      } catch (insertError: any) {
        userRecord = await db.query.users.findFirst({ where: eq(users.uid, decoded.uid) });
        if (!userRecord) throw insertError;
      }
    }
    
    // Update name if provided and user doesn't have one yet
    if (req.body?.name && !userRecord.name) {
      const [updated] = await db.update(users).set({ name: req.body.name }).where(eq(users.id, userRecord.id)).returning();
      if (updated) userRecord = updated;
    }
    
    if (userRecord.status !== 'active') return apiError(res, 403, 'Account is not active', 'ACCOUNT_DISABLED');

    const referralCode = typeof req.body?.referralCode === 'string' ? req.body.referralCode.trim().toUpperCase() : '';
    if (!userRecord.referredBy && referralCode) {
      const ref = await db.query.users.findFirst({ where: eq(users.referralCode, referralCode) });
      if (ref && ref.id !== userRecord.id) {
        const [updated] = await db.update(users).set({ referredBy: ref.id }).where(and(eq(users.id, userRecord.id), isNull(users.referredBy))).returning();
        if (updated) userRecord = updated;
      }
    }

    if (!userRecord.referralCode) {
      for (let i = 0; i < 5 && !userRecord.referralCode; i++) {
        const code = crypto.randomBytes(6).toString('hex').toUpperCase();
        try {
          const [updated] = await db.update(users).set({ referralCode: code }).where(and(eq(users.id, userRecord.id), isNull(users.referralCode))).returning();
          if (updated) userRecord = updated;
          else userRecord = (await db.query.users.findFirst({ where: eq(users.id, userRecord.id) })) || userRecord;
        } catch { /* retry */ }
      }
    }

    const settingsRows = await db.select().from(settings);
    const s = Object.fromEntries(settingsRows.map(x => [x.key, x.value]));
    const config = {
      siteName: s.site_name || 'RapidSMM',
      currencySymbol: s.currency_symbol || '$',
      vodafoneCashNumber: s.vodafone_cash_number || '',
      siteDescription: s.site_description || '',
      supportEmail: s.support_email || '',
      siteLogo: s.site_logo || '',
      usdExchangeRate: Number(s.usd_exchange_rate || '50'),
      heleketCurrency: process.env.HELEKET_CURRENCY || 'USD'
    };

    res.json({ ...userRecord, config });
  } catch (e: any) {
    console.error('[auth/sync] Error:', e);
    apiError(res, 500, 'Internal server error', 'INTERNAL_ERROR');
  }
}
