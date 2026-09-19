import { AppError } from '../../middleware/error-handler.js';

/**
 * Payment failures, written for the customer.
 *
 * Everything here ends up in docs/ERROR_CODES.md and in the web catalogue with an Arabic sentence
 * and a next step. Nothing from a gateway's own response is forwarded verbatim: a gateway message is
 * logged for support and mapped to a code the customer can act on.
 */
export const PAYMENT_ERROR_CODES = [
  'PAYMENT_NOT_FOUND',
  'PAYMENT_GATEWAY_OFF',
  'PAYMENT_GATEWAY_UNCONFIGURED',
  'PAYMENT_AMOUNT_OUT_OF_RANGE',
  'PAYMENT_METHOD_INVALID',
  'PAYMENT_WALLET_NUMBER_INVALID',
  'PAYMENT_ALREADY_RESOLVED',
  'PAYMENT_PENDING_CONFIRMATION',
  'PAYMENT_EXPIRED',
  'PAYMENT_GATEWAY_UNREACHABLE',
  'PAYMENT_GATEWAY_REJECTED',
  'PAYMENT_GATEWAY_AUTH_FAILED',
  'PAYMENT_SIGNATURE_INVALID',
] as const;
export type PaymentErrorCode = (typeof PAYMENT_ERROR_CODES)[number] | string;

function paymentError(code: PaymentErrorCode, message: string, status: number, details?: Record<string, unknown>): AppError {
  return new AppError(code, message, status, details);
}

export const paymentNotFound = () =>
  paymentError('PAYMENT_NOT_FOUND', 'We could not find this payment on your account.', 404);

export const paymentGatewayOff = (gateway: string) =>
  paymentError('PAYMENT_GATEWAY_OFF', `The ${gateway} deposit method is switched off right now.`, 503);

export const paymentGatewayUnconfigured = (gateway: string) =>
  paymentError(
    'PAYMENT_GATEWAY_UNCONFIGURED',
    `The ${gateway} deposit method is not configured on our side yet, so no payment was started.`,
    503,
  );

export const paymentAmountOutOfRange = (minMinor: number, maxMinor: number, currency: string) =>
  paymentError(
    'PAYMENT_AMOUNT_OUT_OF_RANGE',
    `The amount must be between ${minMinor / 100} and ${maxMinor / 100} ${currency}.`,
    422,
    { fields: [{ field: 'amountMinor', message: `must be between ${minMinor} and ${maxMinor} ${currency} minor units` }] },
  );

export const paymentMethodInvalid = (allowed: readonly string[]) =>
  paymentError('PAYMENT_METHOD_INVALID', `That deposit method is not available. Choose one of: ${allowed.join(', ')}.`, 422, {
    fields: [{ field: 'method', message: `must be one of ${allowed.join(', ')}` }],
  });

export const paymentWalletNumberInvalid = () =>
  paymentError(
    'PAYMENT_WALLET_NUMBER_INVALID',
    'The wallet number must be 11 digits, like 01012345678.',
    422,
    { fields: [{ field: 'walletNumber', message: 'must be 11 digits' }] },
  );

export const paymentAlreadyResolved = (status: string) =>
  paymentError('PAYMENT_ALREADY_RESOLVED', `This payment is already ${status}, so nothing was changed.`, 409);

export const paymentPendingConfirmation = (instructions: string | null) =>
  paymentError(
    'PAYMENT_PENDING_CONFIRMATION',
    instructions ??
      'The wallet has not confirmed the payment yet. Approve it on your phone, then check again.',
    409,
  );

export const paymentExpired = () =>
  paymentError('PAYMENT_EXPIRED', 'The confirmation time for this payment ran out, so it was cancelled and nothing was charged.', 409);

export const paymentGatewayUnreachable = () =>
  paymentError('PAYMENT_GATEWAY_UNREACHABLE', 'The payment provider could not be reached, so nothing was charged. Try again in a moment.', 503);

export const paymentGatewayRejected = (reason: string) =>
  paymentError('PAYMENT_GATEWAY_REJECTED', `The payment provider refused this request: ${reason}`, 502);

export const paymentGatewayAuthFailed = () =>
  paymentError('PAYMENT_GATEWAY_AUTH_FAILED', 'Our payment credentials were refused by the provider. Nothing was charged — please contact support.', 503);

export const paymentSignatureInvalid = () =>
  paymentError('PAYMENT_SIGNATURE_INVALID', 'The notification did not come from the payment provider, so it was ignored.', 400);
