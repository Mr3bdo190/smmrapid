import type { User } from 'firebase/auth';

// Mutex for token refresh to prevent race conditions
let refreshPromise: Promise<string> | null = null;

async function refreshTokenWithMutex(user: User): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = user.getIdToken(true).finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

// Error code constant for standardized checking
export const AUTH_DB_UNAVAILABLE = 'AUTH_DB_UNAVAILABLE';

export function isAuthDbUnavailableError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || '').toString().toUpperCase();
  const code = (error.code || '').toString().toUpperCase();
  return (
    msg.includes('AUTH_DB_UNAVAILABLE') ||
    code === 'AUTH_DB_UNAVAILABLE' ||
    msg.includes('DB_UNAVAILABLE') ||
    code === 'DB_UNAVAILABLE'
  );
}

export async function apiFetch(path: string, user?: User | null, init: RequestInit = {}) {
  let token = user ? await user.getIdToken() : undefined;
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  let response = await fetch(path, { ...init, headers });
  if (response.status === 401 && user) {
    // Use mutex to prevent multiple simultaneous token refreshes
    token = await refreshTokenWithMutex(user);
    headers.set('Authorization', `Bearer ${token}`);
    response = await fetch(path, { ...init, headers });
  }
  return response;
}

export async function apiJson<T = any>(path: string, user?: User | null, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, user, init);
  let body: any = {};
  try {
    body = await response.json();
  } catch {
    // Non-JSON response body
    body = {};
  }
  if (!response.ok) {
    // Build error from server response or generic message
    const normalizedError: any = new Error(body?.error || body?.message || `Request failed (${response.status})`);
    normalizedError.status = response.status;
    normalizedError.code = body?.code;
    // If the server didn't send a code but the message implies db unavailable, tag it
    if (!normalizedError.code && isAuthDbUnavailableError(normalizedError)) {
      normalizedError.code = AUTH_DB_UNAVAILABLE;
    }
    throw normalizedError;
  }
  return body as T;
}
