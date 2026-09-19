/**
 * Provider-level errors.
 *
 * Every failure a supplier can cause becomes one of these codes, answered as
 * `{ success: false, error: { code, message } }`. The rules:
 *
 *  - a code is stable and documented in `docs/ERROR_CODES.md` with an Arabic sentence a customer
 *    understands — a code that is not in that file does not exist;
 *  - the message says what happened and what to do next, never a stack trace, a driver message,
 *    a status code alone, or anything the supplier returned verbatim;
 *  - the supplier's own words are redacted (`providerMessage`) and go into `details`, never
 *    into a message a customer reads.
 *
 * `AppError` is imported rather than re-implemented so the global error handler renders the one
 * envelope. Callers must match on `code`, never on `instanceof` (each build entry bundles its own
 * copy of these classes).
 */
import { AppError } from '../../middleware/error-handler.js';
import { redactText, type RedactOptions } from './redact.js';

/** Every code this module is allowed to answer with. Kept in sync with docs/ERROR_CODES.md. */
export const PROVIDER_ERROR_CODES = [
  'PROVIDER_NOT_FOUND',
  'PROVIDER_NOT_CONFIGURED',
  'PROVIDER_ADAPTER_UNKNOWN',
  'PROVIDER_CAPABILITY_UNSUPPORTED',
  'PROVIDER_SLUG_TAKEN',
  'PROVIDER_CONFIG_UNAVAILABLE',
  'CREDENTIAL_ENCRYPTION_UNAVAILABLE',
  'CREDENTIAL_INVALID',
  'CREDENTIAL_UNREADABLE',
  'PROVIDER_UNREACHABLE',
  'PROVIDER_TIMEOUT',
  'PROVIDER_HTTP_ERROR',
  'PROVIDER_RATE_LIMITED',
  'PROVIDER_EMPTY_RESPONSE',
  'PROVIDER_BAD_RESPONSE',
  'PROVIDER_AUTH_FAILED',
  'PROVIDER_REJECTED',
] as const;

export type ProviderErrorCode = (typeof PROVIDER_ERROR_CODES)[number];

/** Builds a customer-safe provider error. `details` is additive data only — never a secret. */
export function providerError(
  code: ProviderErrorCode,
  message: string,
  status = 502,
  details?: Record<string, unknown>,
): AppError {
  return new AppError(code, message, status, details);
}

/**
 * The supplier's own words, flattened, redacted and capped: safe to store on a sync log row or to
 * return in `error.details`. It is never the message a customer sees.
 */
export function providerMessage(value: unknown, options: RedactOptions = {}): string {
  return redactText(String(value ?? '').replace(/\s+/g, ' ').trim(), options);
}

/**
 * True when an upstream error reads like a rejected credential. SMM panels answer a bad key with
 * prose rather than a status code, so the message is the only signal available — and the result
 * has to be an auth code, because "re-enter the API key" is the fix the operator needs to see.
 */
export function looksLikeAuthFailure(message: string): boolean {
  return /(invalid|incorrect|wrong|bad|expired|missing)\s+(api[_\s-]?key|key|token)|api[_\s-]?key|unauthori[sz]ed|forbidden|access\s+denied|authenticat|permission/i.test(
    message,
  );
}
