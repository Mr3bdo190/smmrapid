import { AppError } from '../../middleware/error-handler.js';

/**
 * Order failures, written for the customer.
 *
 * Every code here is registered in docs/ERROR_CODES.md and in the web catalogue
 * (apps/web/src/i18n/error-codes.ts) with an Arabic sentence and a next step. The pricing and
 * wallet codes are reused rather than duplicated, so one situation always answers one code.
 */

export const ORDER_ERROR_CODES = [
  'ORDER_NOT_FOUND',
  'ORDER_TARGET_INVALID',
  'ORDER_IDEMPOTENCY_CONFLICT',
  'ORDER_NOT_REPEATABLE',
  'ORDER_DUPLICATE_TARGET',
  'ORDER_DISPATCH_FAILED',
] as const;
export type OrderErrorCode = (typeof ORDER_ERROR_CODES)[number] | string;

export function orderError(
  code: OrderErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>,
): AppError {
  return new AppError(code, message, status, details);
}

export const orderNotFound = () =>
  orderError('ORDER_NOT_FOUND', 'We could not find this order on your account.', 404);

export const orderTargetInvalid = (reason: string) =>
  orderError('ORDER_TARGET_INVALID', `That link or username cannot be used: ${reason}`, 422, { field: 'target' });

export const orderIdempotencyConflict = () =>
  orderError(
    'ORDER_IDEMPOTENCY_CONFLICT',
    'This request was already used with different details, so nothing was created. Start the order again.',
    409,
  );

export const orderNotRepeatable = (reason: string) =>
  orderError('ORDER_NOT_REPEATABLE', `This order cannot be repeated: ${reason}`, 409);

export const orderDuplicateTarget = () =>
  orderError(
    'ORDER_DUPLICATE_TARGET',
    'You already have an open order for this service and the same link. Wait for it to finish, or contact support.',
    409,
  );

/** The dispatcher could not even start: no supplier for the order, or it is switched off. */
export const orderDispatchFailed = (reason: string) =>
  orderError('ORDER_DISPATCH_FAILED', `The order could not be sent to the supplier: ${reason}`, 503);
