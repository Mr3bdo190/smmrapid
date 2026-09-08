import { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';
import { db } from '../../src/db/index';
import { users } from '../../src/db/schema';
import { adminAuth } from '../../src/lib/firebase-admin';
import { apiError } from '../api-utils';

interface AuthenticatedRequest extends Request {
  user?: any;
  dbUser?: any;
}

export default async function handler(req: AuthenticatedRequest, res: Response) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
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
      return apiError(res, 401, 'Firebase authentication failed. Please sign in again.', 'INVALID_TOKEN');
    }

    let userRecord = await db.query.users.findFirst({ where: eq(users.uid, decoded.uid) });
    if (!userRecord || userRecord.status !== 'active') return apiError(res, 403, 'Account is not active', 'ACCOUNT_DISABLED');

    if (req.method === 'PUT') {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      if (name && name.length <= 50) {
        const [updated] = await db.update(users).set({ name }).where(eq(users.id, userRecord.id)).returning();
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

    res.json(userRecord);
  } catch (e: any) {
    console.error('[client/me] Error:', e);
    apiError(res, 500, 'Internal server error', 'INTERNAL_ERROR');
  }
}

import { isNull } from 'drizzle-orm';
