import type { User } from 'firebase/auth';

export async function apiFetch(path: string, user?: User | null, init: RequestInit = {}) {
  let token = user ? await user.getIdToken() : undefined;
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  let response = await fetch(path, { ...init, headers });
  if (response.status === 401 && user) {
    token = await user.getIdToken(true);
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
