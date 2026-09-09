import { Request, Response } from 'express';
import { eq, asc } from 'drizzle-orm';
import { db } from '../../src/db/index';
import { services, categories } from '../../src/db/schema';
import { adminAuth } from '../../src/lib/firebase-admin';
import { apiError } from '../api-utils';

interface AuthenticatedRequest extends Request {
  user?: any;
  dbUser?: any;
}

export default async function handler(req: AuthenticatedRequest, res: Response) {
  if (req.method !== 'GET') {
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

    const userRecord = await db.query.users.findFirst({ where: eq(users.uid, decoded.uid) });
    if (!userRecord || userRecord.status !== 'active') return apiError(res, 403, 'Account is not active', 'ACCOUNT_DISABLED');

    const rows = await db.query.services.findMany({
      where: eq(services.status, 'active'),
      with: { category: true, provider: true },
      orderBy: [asc(services.sortOrder)]
    });

    const filtered = rows.filter(x => x.category?.status === 'active' && (!x.providerId || x.provider?.status === 'active'));
    res.json(filtered);
  } catch (e: any) {
    console.error('[client/services] Error:', e);
    apiError(res, 500, 'Internal server error', 'INTERNAL_ERROR');
  }
}

// Need to import users for the auth check
import { users } from '../../src/db/schema';
