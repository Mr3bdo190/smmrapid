/**
 * The supplier (provider) contract.
 *
 * No module talks to a supplier directly: it talks to an adapter. Capabilities are declared up
 * front so a caller can ask `supports('order.cancel')` before calling it, and a supplier that
 * only exposes a balance and a service list stays representable instead of pretending otherwise
 * (calling an unsupported action answers PROVIDER_CAPABILITY_UNSUPPORTED, never a crash).
 *
 * `ProviderConnection.credential` is the only secret this layer holds. It is decrypted per call,
 * never cached, never logged (every log line built from a connection goes through `redactMeta`).
 */
import type { AuthDeps } from '../auth/types.js';

/** Everything an SMM supplier may be asked to do. One supplier supports a subset of it. */
export const PROVIDER_CAPABILITIES = [
  'balance',
  'services',
  'order.create',
  'order.status',
  'order.cancel',
] as const;

export type ProviderCapability = (typeof PROVIDER_CAPABILITIES)[number];

/** Injectable fetch: production passes the global one, tests pass a fake. Never a real call in tests. */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export type LoggerLike = {
  debug: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

/**
 * One row of the supplier's own catalogue, already mapped onto our column names.
 *
 * `rateMinor` is the supplier's own cost, in minor units, for the supplier's rate unit (per 1000
 * by convention). Pricing and markup are deliberately absent: this is source data, not an offer.
 */
export type AdapterService = {
  externalServiceId: string;
  name: string;
  type: string | null;
  rateMinor: number | null;
  rateCurrency: string;
  minQuantity: number | null;
  maxQuantity: number | null;
  supportsRefill: boolean;
  supportsCancel: boolean;
  supportsDripFeed: boolean;
  /** The supplier's own object, kept verbatim for support and for later remapping. */
  raw: Record<string, unknown>;
};

export type BalanceResult = { balanceMinor: number | null; currency: string; raw: unknown };

export type CreateOrderInput = {
  externalServiceId: string;
  link: string;
  quantity: number;
  /** Service-specific extras the supplier asked for (comments, username, …). */
  extra?: Record<string, string>;
  dripFeed?: boolean;
  runs?: number | null;
  interval?: number | null;
};

export type CreateOrderResult = {
  externalOrderId: string;
  chargeMinor: number | null;
  currency: string;
  raw: unknown;
};

/** Mirrors the database `order_status` enum so a supplier status maps onto ours 1:1. */
export type ProviderOrderStatus =
  | 'pending'
  | 'processing'
  | 'in_progress'
  | 'completed'
  | 'partial'
  | 'canceled'
  | 'failed'
  | 'refunded';

export type OrderStatusResult = {
  externalOrderId: string;
  status: ProviderOrderStatus;
  startCount: number | null;
  remains: number | null;
  chargeMinor: number | null;
  currency: string;
  raw: unknown;
};

export type CancelOrderResult = { externalOrderId: string; canceled: boolean; raw: unknown };

/** The contract every supplier integration implements. */
export interface ProviderAdapter {
  /** `providers.adapter_key` — which implementation this is (shape, never a vendor guarantee). */
  readonly key: string;
  readonly capabilities: readonly ProviderCapability[];
  supports(capability: ProviderCapability): boolean;
  balance(): Promise<BalanceResult>;
  listServices(): Promise<AdapterService[]>;
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  orderStatus(externalOrderId: string): Promise<OrderStatusResult>;
  cancelOrder(externalOrderId: string): Promise<CancelOrderResult>;
}

/**
 * Everything an adapter factory needs to build an adapter for one provider row.
 *
 * `config` is `providers.adapter_config` (action names, parameter names, response field mapping).
 * It must never hold a secret: the API key travels in `credential` and nowhere else.
 */
export type ProviderConnection = {
  providerId: string;
  slug: string;
  adapterKey: string;
  baseUrl: string | null;
  credential: string | null;
  /** providers.balance_currency — the default currency when the supplier does not report one. */
  currency: string;
  config: Record<string, unknown>;
  fetchImpl?: FetchLike;
  /** Injectable logger so tests can assert that nothing sensitive is written. */
  logger?: LoggerLike;
  timeoutMs?: number;
};

export type ProviderAdapterFactory = (connection: ProviderConnection) => ProviderAdapter;

export type AdapterRegistry = {
  register(key: string, factory: ProviderAdapterFactory): void;
  has(key: string): boolean;
  keys(): string[];
  /** Throws PROVIDER_ADAPTER_UNKNOWN for a key nobody registered. */
  create(connection: ProviderConnection): ProviderAdapter;
};

/** Dependencies for the HTTP module — the AuthDeps pattern, so routes are testable with fakes. */
export type ProvidersDeps = {
  auth: AuthDeps;
  registry?: AdapterRegistry;
  fetchImpl?: FetchLike;
  logger?: LoggerLike;
};
