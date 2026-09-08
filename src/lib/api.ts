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
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error: any = new Error(body?.error || body?.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.code = body?.code;
    throw error;
  }
  return body as T;
}
