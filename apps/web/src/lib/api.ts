import type { User } from 'firebase/auth';

/**
 * Every error the API can return, in the shape the server actually sends:
 *   { success: false, error: { code, message, ref? } }
 *
 * `code` is what the UI translates; `ref` is the support reference for internal failures.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly supportRef?: string;

  constructor(message: string, code: string, status: number, supportRef?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.supportRef = supportRef;
  }
}

async function readBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function toApiError(response: Response, body: unknown): ApiError {
  const error = (body as { error?: { code?: string; message?: string; ref?: string } } | null)?.error;
  return new ApiError(
    error?.message || `Request failed (${response.status})`,
    error?.code || 'REQUEST_FAILED',
    response.status,
    error?.ref,
  );
}

/**
 * Calls the API with the signed-in user's ID token.
 * On a 401 the token is forcibly refreshed once before giving up, so an expired token on a
 * long-lived tab does not look like a sign-out to the customer.
 */
export async function apiFetch(path: string, user: User | null, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const send = async (forceRefresh: boolean) => {
    if (user) headers.set('Authorization', `Bearer ${await user.getIdToken(forceRefresh)}`);
    return fetch(path, { ...init, headers });
  };

  let response = await send(false);
  if (response.status === 401 && user) response = await send(true);
  return response;
}

/** Same as apiFetch, but returns the parsed body and throws a typed ApiError on failure. */
export async function apiJson<T>(path: string, user: User | null, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, user, init);
  const body = await readBody(response);
  if (!response.ok) throw toApiError(response, body);
  return body as T;
}
