import type { AuthDeps } from '../auth/types.js';

/**
 * Payments (deposits).
 *
 * A gateway never decides a customer's balance. It reports; we verify against the gateway's own
 * authoritative endpoint, and only then does the ledger move — once, keyed by the payment id.
 *
 * Two currencies are in play and they are never mixed: the wallet keeps USD minor units, while a
 * local gateway charges EGP. The conversion happens once, at credit time, and both the rate and the
 * gateway amount are stored on the payment row.
 */

/** Matches the database `payment_gateway` enum exactly. */
export const PAYMENT_GATEWAYS = ['shahnawy', 'heleket'] as const;
export type PaymentGateway = (typeof PAYMENT_GATEWAYS)[number];

/** Wallet-side status; a subset of the database `payment_status` enum. */
export const PAYMENT_STATUSES = ['pending', 'approved', 'rejected', 'expired', 'canceled'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** The e-wallet methods Sha7nawy exposes, in the gateway's own vocabulary. */
export const SHAHNAWY_METHODS = ['vf_cash', 'or_cash', 'et_cash'] as const;
export type ShahnawyMethod = (typeof SHAHNAWY_METHODS)[number];

export type DepositStatus = 'pending' | 'completed' | 'rejected' | 'expired';

export type DepositRequest = {
  /** Our payment row: the gateway gets the public id as its client reference. */
  paymentId: string;
  publicId: string;
  userId: string;
  /** Amount in the gateway's own currency, minor units (10050 = 100.50). */
  amountMinor: number;
  currency: string;
  /** Sha7nawy: which wallet. Heleket: null (the payer chooses on the invoice page). */
  method?: string | null;
  /** Sha7nawy: the customer's 11-digit wallet number. */
  walletNumber?: string | null;
  webhookUrl: string;
  returnUrl?: string | null;
};

export type DepositIntent = {
  /** The gateway's own id for this deposit (Heleket uuid / Sha7nawy numeric id). */
  externalId: string;
  /** The gateway's human reference (Sha7nawy `SH-…`); Heleket echoes our public id. */
  reference: string | null;
  status: DepositStatus;
  /** Where to send the customer, when the gateway hosts a page. */
  payUrl: string | null;
  /**
   * What the CUSTOMER must do next, in Arabic, straight from the gateway when it says so
   * ("اطلب *9*1# خلال دقيقة") — never invented by us.
   */
  instructions: string | null;
  raw: unknown;
};

export type WebhookVerdict = {
  valid: boolean;
  /** Stable per gateway+event, so a replayed webhook is stored once. */
  eventId: string;
  externalId: string | null;
  reference: string | null;
  status: DepositStatus | null;
  /** Heleket signs its payload, so a valid signature is authoritative there. */
  authoritative: boolean;
};

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export type LoggerLike = {
  debug: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

export type GatewayConfig = {
  baseUrl: string | null;
  publicKey: string | null;
  secretKey: string | null;
  merchantId: string | null;
  fetchImpl?: FetchLike;
  logger?: LoggerLike;
  timeoutMs?: number;
};

export interface PaymentAdapter {
  readonly key: PaymentGateway;
  /** What this gateway charges in ('EGP', 'USD'). */
  readonly currency: string;
  /** Methods a customer may pick; empty when the gateway decides. */
  readonly methods: readonly string[];
  /** False when the credentials are missing — the gateway is then simply not offered. */
  configured(): boolean;
  createDeposit(input: DepositRequest): Promise<DepositIntent>;
  /** The authoritative status read: this is what decides a wallet credit. */
  checkDeposit(externalId: string): Promise<DepositIntent>;
  /** Sha7nawy needs an explicit confirm; Heleket does not. */
  confirmDeposit?(intent: DepositIntent): Promise<DepositIntent>;
  verifyWebhook(request: { headers: Record<string, string | string[] | undefined>; body: unknown; rawBody: string }): WebhookVerdict;
}

export type PaymentAdapterFactory = (config: GatewayConfig) => PaymentAdapter;

export type GatewayRegistry = {
  has(key: string): boolean;
  keys(): string[];
  create(key: string, config: GatewayConfig): PaymentAdapter;
};

/** Public shape of a deposit, as the customer sees it. */
export type PublicPayment = {
  publicId: string;
  gateway: PaymentGateway;
  method: string | null;
  status: PaymentStatus;
  currency: string;
  amountMinor: number;
  gatewayCurrency: string | null;
  gatewayAmountMinor: number | null;
  fxRate: number | null;
  payUrl: string | null;
  instructions: string | null;
  walletNumber: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

/** What the service layer needs. Kept separate from the HTTP deps so it can be driven directly. */
export type PaymentsServiceDeps = {
  /** Resolves the adapter for a gateway (production reads credentials from the environment). */
  adapter?: (gateway: PaymentGateway) => PaymentAdapter;
  config?: Partial<Record<PaymentGateway, GatewayConfig>>;
  settings?: () => Promise<PaymentSettings>;
  /** Gateways the operator has switched on; defaults to the feature flags. */
  enabled?: () => Promise<PaymentGateway[]>;
  /** Public origin used to build webhook/return URLs. */
  publicOrigin?: string;
  logger?: LoggerLike;
};

export type PaymentsDeps = PaymentsServiceDeps & { auth: AuthDeps };

export type PaymentSettings = {
  usdExchangeRate: number;
  minDepositMinor: number;
  maxDepositMinor: number;
};
