import { Response } from 'express';

export function apiError(res: Response, status: number, message: string, code = 'ERROR') {
  return res.status(status).json({ error: message, code });
}

export function validateAuth(req: any): { user: any; dbUser: any } | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  return { token };
}
