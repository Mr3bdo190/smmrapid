import { ApiError } from '../lib/api';
import { errorCopyFor, isErrorCode } from './error-codes';
import type { ErrorCode } from './error-codes';
import type { Locale } from './locale';

/**
 * Runtime helpers that turn anything thrown into something a customer can act on.
 *
 * The copy itself lives in `error-codes.ts` (the single catalogue). This file only decides
 * *which* code a thrown value carries and what the caller should be shown:
 *
 *   { title, message, nextStep, actionLabel?, supportRef?, detail?, code, known }
 *
 * Guarantees:
 *   - an unknown code still renders the server's own message + the support reference;
 *   - a known code never leaks raw server wording as the main sentence (it is kept as `detail`
 *     for support, behind a disclosure);
 *   - nothing here throws — it runs inside error boundaries of the UI.
 */

/** A resolved, displayable error. Everything the UI needs, already localized. */
export type ResolvedError = {
  /** The raw code, shown as-is so support can match it against the API logs. */
  code: string;
  /** True when the code is in the catalogue (so `title`/`message`/`nextStep` are hand-written). */
  known: boolean;
  title: string;
  message: string;
  nextStep: string;
  /** Button label for the next step, when the catalogue names a specific action. */
  actionLabel?: string;
  supportRef?: string;
  /** The server's own wording, for support. Rendered behind a disclosure, never as the message. */
  detail?: string;
};

/** Reads the code out of anything that can be thrown. Never throws itself. */
export function errorCodeOf(error: unknown): string {
  if (error instanceof ApiError) return error.code;

  const candidate = (error as { code?: unknown } | null | undefined)?.code;
  if (typeof candidate === 'string' && candidate.length > 0) return candidate;

  // `fetch` rejects with a TypeError when the request never left the device.
  if (error instanceof TypeError) return 'NETWORK_ERROR';

  return 'REQUEST_FAILED';
}

/** Reads the support reference off a thrown value, when the server sent one. */
export function errorSupportRefOf(error: unknown): string | undefined {
  if (error instanceof ApiError) return error.supportRef;
  const candidate = error as { ref?: unknown; supportRef?: unknown } | null | undefined;
  const ref = candidate?.supportRef ?? candidate?.ref;
  return typeof ref === 'string' && ref.length > 0 ? ref : undefined;
}

export function isKnownError(error: unknown): error is { code: ErrorCode } {
  return isErrorCode(errorCodeOf(error));
}

function serverMessageOf(error: unknown): string {
  if (error instanceof Error) return error.message.trim();
  return typeof error === 'string' ? error.trim() : '';
}

/**
 * Turns any thrown value into a localized, actionable error for the given locale.
 *
 *   const resolved = describeError(error, locale);   // works outside React too
 *   <ErrorBanner error={error} />                    // does this internally
 */
export function describeError(error: unknown, locale: Locale): ResolvedError {
  const code = errorCodeOf(error);
  const supportRef = errorSupportRefOf(error);
  const serverMessage = serverMessageOf(error);

  const known = isErrorCode(code);
  const copy = errorCopyFor(code, locale);

  // Unknown code → the server's message is the message (it is all we have), plus the reference
  // and a generic "try again / send us the reference" next step. Never a blank screen.
  const message = known ? copy.message : serverMessage || copy.message;

  return {
    code,
    known,
    title: copy.title,
    message,
    nextStep: copy.nextStep,
    ...(copy.actionLabel ? { actionLabel: copy.actionLabel } : {}),
    ...(supportRef ? { supportRef } : {}),
    ...(known && serverMessage && serverMessage !== message ? { detail: serverMessage } : {}),
  };
}
