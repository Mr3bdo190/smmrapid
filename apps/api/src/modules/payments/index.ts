import { createGatewayRegistry, gatewayConfigFromEnv } from './service.js';
import type { PaymentsDeps, PaymentGateway, PaymentAdapter } from './types.js';

export { createPaymentsModule } from './routes.js';
export {
  createDeposit,
  createGatewayRegistry,
  creditDeposit,
  enabledGateways,
  gatewayConfigFromEnv,
  handleWebhook,
  listDeposits,
  loadPaymentSettings,
  publicPayment,
  refreshDeposit,
} from './service.js';
export { createHeleketAdapter } from './adapters/heleket.js';
export { createShahnawyAdapter } from './adapters/shahnawy.js';
export {
  PAYMENT_ERROR_CODES,
  paymentAlreadyResolved,
  paymentAmountOutOfRange,
  paymentExpired,
  paymentGatewayAuthFailed,
  paymentGatewayOff,
  paymentGatewayRejected,
  paymentGatewayUnconfigured,
  paymentGatewayUnreachable,
  paymentMethodInvalid,
  paymentNotFound,
  paymentPendingConfirmation,
  paymentSignatureInvalid,
  paymentWalletNumberInvalid,
} from './errors.js';
export { PAYMENT_GATEWAYS, PAYMENT_STATUSES, SHAHNAWY_METHODS } from './types.js';
export type { CreateDepositInput, WebhookOutcome } from './service.js';
export type { DepositIntent, PaymentsDeps, PaymentsServiceDeps, PublicPayment } from './types.js';

/**
 * Production wiring: gateways read their credentials from the environment, and the adapter for a
 * gateway is built on demand (so a gateway without credentials simply is not offered).
 */
export function productionPaymentsDeps(auth: PaymentsDeps['auth']): PaymentsDeps {
  const config = gatewayConfigFromEnv();
  const registry = createGatewayRegistry();
  const cache = new Map<PaymentGateway, PaymentAdapter>();

  return {
    auth,
    config,
    adapter: (gateway) => {
      const existing = cache.get(gateway);
      if (existing) return existing;
      const adapter = registry.create(gateway, config[gateway]);
      cache.set(gateway, adapter);
      return adapter;
    },
    publicOrigin: process.env.PUBLIC_ORIGIN ?? 'https://smmrapid.store',
  };
}
