/**
 * The i18n layer, in one import:
 *
 *   import { LocaleProvider, useT, describeError } from '@/i18n';
 */
export { DEFAULT_LOCALE, DIRECTION, directionOf, LOCALES, LOCALE_SELF_NAME, OTHER_LOCALE, INTL_TAG, LOCALE_STORAGE_KEY, isLocale, applyDocumentLocale } from './locale';
export type { Direction, Locale } from './locale';
export { en } from './en';
export type { MessageKey, Messages, TFunction, MessageParams, ExtractParams } from './en';
export { ar } from './ar';
export { DICTIONARIES, createTranslator, dictionaryGaps } from './dictionary';
export { createFormatters, fallbackFormatters, parseDate, MINOR_UNITS_PER_UNIT } from './format';
export type { Formatters } from './format';
export { LocaleProvider, useT, useLocale } from './LocaleProvider';
export type { LocaleContextValue, LocaleProviderProps } from './LocaleProvider';
export { LocaleSwitch } from './LocaleSwitch';
/* Error copy: one catalogue, both languages, typed key union (see error-codes.ts). */
export { ERROR_CODES, ERROR_CATALOGUE, UNKNOWN_ERROR_COPY, errorCopyFor, isErrorCode } from './error-codes';
export type { ErrorCode, ErrorCopy, ErrorCatalogue } from './error-codes';
/* Resolution helpers: code detection, support reference, localized {title,message,nextStep}. */
export { describeError, errorCodeOf, errorSupportRefOf, isKnownError } from './errors';
export type { ResolvedError } from './errors';
