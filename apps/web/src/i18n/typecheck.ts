// `import type` of a value binding is intentional: these are used only in `typeof` positions.
import type { ar } from './ar';
import type { en } from './en';
import type { Messages, TFunction } from './en';
import { createTranslator } from './dictionary';
import type { ERROR_CATALOGUE } from './error-codes';
import type { ErrorCode } from './error-codes';

/**
 * Compile-time proofs — this file is never imported by the app; `tsc` is the test runner.
 *
 * Each `@ts-expect-error` below **fails the build if the error it expects stops happening** (an
 * unnecessary directive is itself an error), and each exported type fails the build if the set it
 * proves non-empty is no longer empty. That is how these guarantees stay true as the app grows:
 *
 *   - a key that does not exist is a TypeScript error, not a blank string at runtime;
 *   - a message with `{placeholders}` demands its parameters, and one without rejects them;
 *   - every error code has copy in both languages.
 */
type AssertNever<T extends never> = T;

/** The Arabic dictionary must not be missing any key of the English one. */
export type MissingArabicKeys = AssertNever<Exclude<keyof typeof en, keyof Messages>>;

/** Every error code must have an entry in the catalogue (which itself carries ar + en copy). */
export type ErrorCodesWithoutCopy = AssertNever<Exclude<ErrorCode, keyof typeof ERROR_CATALOGUE>>;

/** The Arabic dictionary must be complete: this is the same check the runtime uses for `ar`. */
export type ArabicIsComplete = AssertNever<Exclude<keyof typeof ar, keyof typeof en>>;

/** Behavioural proofs, kept in one function so nothing executes at import time. */
export function typeProofs(): [string, string] {
  const t: TFunction = createTranslator('en');

  // @ts-expect-error — 'auth.field.nmae' is not a translation key (typo must not compile)
  const typo = t('auth.field.nmae');

  // @ts-expect-error — 'ui.pagination.summary' has {page} and {total}: the parameters are required
  const missingParams = t('ui.pagination.summary');

  // @ts-expect-error — 'common.retry' has no placeholders, so passing parameters is an error
  const surplusParams = t('common.retry', { page: 1 });

  return [typo, `${missingParams}${String(surplusParams)}`];
}
