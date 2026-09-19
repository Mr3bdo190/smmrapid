import { randomUUID } from 'node:crypto';
import { query, queryOne, withTransaction } from '../../lib/db.js';
import { logger as defaultLogger } from '../../lib/logger.js';
import { applyWalletMovement } from '../wallet/service.js';
import { createHeleketAdapter } from './adapters/heleket.js';
import { createShahnawyAdapter } from './adapters/shahnawy.js';
import {
  paymentAlreadyResolved,
  paymentAmountOutOfRange,
  paymentExpired,
  paymentGatewayOff,
  paymentGatewayUnconfigured,
  paymentMethodInvalid,
  paymentNotFound,
  paymentPendingConfirmation,
  paymentSignatureInvalid,
  paymentWalletNumberInvalid,
} from './errors.js';
import {
  PAYMENT_GATEWAYS,
  SHAHNAWY_METHODS,
  type DepositIntent,
  type GatewayConfig,
  type GatewayRegistry,
  type PaymentAdapter,
  type PaymentGateway,
  type PaymentSettings,
  type PaymentStatus,
  type PaymentsServiceDeps,
  type PublicPayment,
} from './types.js';

/**
 * Deposits.
 *
 * The rule this file exists to enforce: **a gateway reports, we decide.** Money reaches a wallet
 * only through `creditDeposit()`, which runs the ledger movement and the payment update in one
 * transaction, keyed by the payment id — so a repeated webhook, a repeated confirm click, or two
 * workers polling the same deposit can never credit twice.
 *
 * A customer-visible payment never exposes a gateway credential or raw provider wording beyond the
 * message the provider itself addresses to the payer (Sha7nawy's Arabic instructions).
 */

const DEFAULT_SETTINGS: PaymentSettings = { usdExchangeRate: 50, minDepositMinor: 100, maxDepositMinor: 1_000_000 };
/** Sha7nawy enforces these on their side; we check first so the customer gets our wording. */
const SHAHNAWY_MIN_MINOR = 500;
const SHAHNAWY_MAX_MINOR = 1_000_000;

export function createGatewayRegistry(): GatewayRegistry {
  const factories: Record<string, (config: GatewayConfig) => PaymentAdapter> = {
    heleket: createHeleketAdapter,
    shahnawy: createShahnawyAdapter,
  };
  return {
    has: (key) => key in factories,
    keys: () => Object.keys(factories),
    create: (key, config) => {
      const factory = factories[key];
      if (!factory) throw paymentGatewayUnconfigured(key);
      return factory(config);
    },
  };
}

/**
 * Credentials come from the environment only.
 *
 * Heleket: `HELEKET_MERCHANT_ID` + `HELEKET_API_KEY`.
 * Sha7nawy: `SHAHNAWY_BASE_URL` + `SHAHNAWY_PUBLIC_KEY` + `SHAHNAWY_SECRET_KEY`.
 *
 * The earlier scaffold used `HELEKET_PAYMENT_API_KEY` and `SHAHNAWY_API_KEY`; both spellings are
 * accepted so a deployed environment never silently loses its credentials.
 */
export function gatewayConfigFromEnv(): Record<PaymentGateway, GatewayConfig> {
  return {
    heleket: {
      baseUrl: process.env.HELEKET_BASE_URL ?? 'https://api.heleket.com',
      merchantId: process.env.HELEKET_MERCHANT_ID ?? null,
      // The scaffold named this HELEKET_PAYMENT_API_KEY before the gateway integration existed;
      // both are accepted so an environment that already set one keeps working.
      secretKey: process.env.HELEKET_API_KEY ?? process.env.HELEKET_PAYMENT_API_KEY ?? null,
      publicKey: null,
    },
    shahnawy: {
      baseUrl: process.env.SHAHNAWY_BASE_URL ?? null,
      // Their API uses a public key for create/confirm and a secret key for the status read.
      // SHAHNAWY_API_KEY is the older scaffold name and is still honoured.
      publicKey: process.env.SHAHNAWY_PUBLIC_KEY ?? process.env.SHAHNAWY_API_KEY ?? null,
      secretKey: process.env.SHAHNAWY_SECRET_KEY ?? null,
      merchantId: null,
    },
  };
}

export async function loadPaymentSettings(): Promise<PaymentSettings> {
  try {
    const rows = await query<{ key: string; value: unknown }>(
      'select key, value from settings where key = any($1::text[])',
      [['finance.usd_exchange_rate', 'finance.min_deposit_minor', 'finance.max_deposit_minor']],
    );
    const byKey = new Map(rows.map((row) => [row.key, Number(row.value)]));
    return {
      usdExchangeRate: Number.isFinite(byKey.get('finance.usd_exchange_rate')) ? Number(byKey.get('finance.usd_exchange_rate')) : DEFAULT_SETTINGS.usdExchangeRate,
      minDepositMinor: Number.isFinite(byKey.get('finance.min_deposit_minor')) ? Number(byKey.get('finance.min_deposit_minor')) : DEFAULT_SETTINGS.minDepositMinor,
      maxDepositMinor: Number.isFinite(byKey.get('finance.max_deposit_minor')) ? Number(byKey.get('finance.max_deposit_minor')) : DEFAULT_SETTINGS.maxDepositMinor,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Which gateways the operator has switched on (`feature_flags`). */
export async function enabledGateways(): Promise<PaymentGateway[]> {
  try {
    const rows = await query<{ key: string; enabled: boolean }>(
      'select key, enabled from feature_flags where key = any($1::text[])',
      [PAYMENT_GATEWAYS.map((gateway) => `payments.${gateway}`)],
    );
    const on = new Set(rows.filter((row) => row.enabled).map((row) => row.key.replace('payments.', '')));
    return PAYMENT_GATEWAYS.filter((gateway) => on.has(gateway));
  } catch {
    return [];
  }
}

const resolveAdapter = (gateway: PaymentGateway, deps: PaymentsServiceDeps): PaymentAdapter => {
  if (deps.adapter) return deps.adapter(gateway);
  const config = deps.config?.[gateway] ?? gatewayConfigFromEnv()[gateway];
  return createGatewayRegistry().create(gateway, config);
};

const iso = (value: string | Date | null | undefined): string | null =>
  value === null || value === undefined ? null : value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const num = (value: unknown): number => (value === null || value === undefined ? 0 : Number(value));

type DbPayment = {
  id: string;
  public_id: string;
  user_id: string;
  gateway: PaymentGateway;
  method: string | null;
  status: PaymentStatus;
  currency: string;
  amount_minor: string | number;
  gateway_currency: string | null;
  gateway_amount_minor: string | number | null;
  fx_rate: string | number | null;
  provider_reference: string | null;
  provider_payload: Record<string, unknown> | null;
  wallet_transaction_id: string | number | null;
  resolved_at: string | null;
  created_at: string;
};

export function publicPayment(row: DbPayment, extras: { payUrl?: string | null; instructions?: string | null; walletNumber?: string | null } = {}): PublicPayment {
  const payload = (row.provider_payload ?? {}) as Record<string, unknown>;
  return {
    publicId: row.public_id,
    gateway: row.gateway,
    method: row.method,
    status: row.status,
    currency: row.currency,
    amountMinor: num(row.amount_minor),
    gatewayCurrency: row.gateway_currency,
    gatewayAmountMinor: row.gateway_amount_minor === null ? null : num(row.gateway_amount_minor),
    fxRate: row.fx_rate === null ? null : Number(row.fx_rate),
    payUrl: extras.payUrl ?? (typeof payload.payUrl === 'string' ? payload.payUrl : null),
    instructions: extras.instructions ?? (typeof payload.instructions === 'string' ? payload.instructions : null),
    walletNumber: extras.walletNumber ?? (typeof payload.walletNumber === 'string' ? payload.walletNumber : null),
    createdAt: iso(row.created_at) ?? '',
    resolvedAt: iso(row.resolved_at),
  };
}

export type CreateDepositInput = {
  userId: string;
  gateway: PaymentGateway;
  /** In the gateway's own currency: USD minor for Heleket, EGP minor (piastres) for Sha7nawy. */
  amountMinor: number;
  method?: string | null;
  walletNumber?: string | null;
};

const WALLET_NUMBER = /^01[0-9]{9}$/;

export async function createDeposit(input: CreateDepositInput, deps: PaymentsServiceDeps = {}): Promise<PublicPayment> {
  const logger = deps.logger ?? defaultLogger;
  const settings = await (deps.settings ?? loadPaymentSettings)();
  const enabled = await (deps.enabled ?? enabledGateways)();
  if (!enabled.includes(input.gateway)) throw paymentGatewayOff(input.gateway);

  const adapter = resolveAdapter(input.gateway, deps);
  if (!adapter.configured()) throw paymentGatewayUnconfigured(input.gateway);

  // Amount limits: the gateway's own bounds for EGP, our configured bounds for USD deposits.
  const [minMinor, maxMinor] = adapter.key === 'shahnawy' ? [SHAHNAWY_MIN_MINOR, SHAHNAWY_MAX_MINOR] : [settings.minDepositMinor, settings.maxDepositMinor];
  if (!Number.isInteger(input.amountMinor) || input.amountMinor < minMinor || input.amountMinor > maxMinor) {
    throw paymentAmountOutOfRange(minMinor, maxMinor, adapter.currency);
  }

  let method: string | null = null;
  let walletNumber: string | null = null;
  if (adapter.key === 'shahnawy') {
    method = String(input.method ?? '');
    if (!SHAHNAWY_METHODS.includes(method as (typeof SHAHNAWY_METHODS)[number])) throw paymentMethodInvalid(SHAHNAWY_METHODS);
    walletNumber = String(input.walletNumber ?? '').trim();
    if (!WALLET_NUMBER.test(walletNumber)) throw paymentWalletNumberInvalid();
  }

  // Heleket charges the wallet currency directly; Sha7nawy charges EGP and is converted at credit.
  const walletCurrency = 'USD';
  const fxRate = adapter.key === 'shahnawy' ? settings.usdExchangeRate : null;
  const walletAmountMinor = fxRate ? Math.max(1, Math.round(input.amountMinor / fxRate)) : input.amountMinor;

  const paymentId = randomUUID();
  const publicId = `PAY${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;

  const inserted = await queryOne<DbPayment>(
    `insert into payments (id, public_id, user_id, gateway, method, status, currency, amount_minor,
                           gateway_currency, gateway_amount_minor, fx_rate, provider_payload)
     values ($1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9, $10, $11)
     returning *`,
    [
      paymentId,
      publicId,
      input.userId,
      input.gateway,
      // payments.method is NOT NULL: a crypto deposit has no wallet method, so it says so.
      method ?? 'crypto',
      walletCurrency,
      walletAmountMinor,
      adapter.currency,
      input.amountMinor,
      fxRate,
      JSON.stringify({ walletNumber, requestedMinor: input.amountMinor }),
    ],
  );
  if (!inserted) throw paymentNotFound();

  const origin = (deps.publicOrigin ?? process.env.PUBLIC_ORIGIN ?? 'https://smmrapid.store').replace(/\/+$/, '');
  const webhookUrl = `${origin}/api/webhooks/payments/${input.gateway}`;

  try {
    const intent = await adapter.createDeposit({
      paymentId,
      publicId,
      userId: input.userId,
      amountMinor: input.amountMinor,
      currency: adapter.currency,
      method,
      walletNumber,
      webhookUrl,
      returnUrl: `${origin}/wallet`,
    });

    await query(
      `update payments set provider_reference = $2, provider_payload = $3 where id = $1`,
      [paymentId, intent.reference ?? intent.externalId, JSON.stringify({ ...(inserted.provider_payload ?? {}), ...intentPayload(intent) })],
    );

    await recordAttempt({ paymentId, userId: input.userId, gateway: input.gateway, operation: 'create', httpStatus: 200, success: true, request: { amountMinor: input.amountMinor, method }, response: intent.raw });

    return publicPayment({ ...inserted, provider_reference: intent.reference ?? intent.externalId }, {
      payUrl: intent.payUrl,
      instructions: intent.instructions,
      walletNumber,
    });
  } catch (error) {
    const code = String((error as { code?: string }).code ?? 'PAYMENT_GATEWAY_REJECTED');
    await query(`update payments set status = 'rejected', resolved_at = now() where id = $1`, [paymentId]);
    await recordAttempt({
      paymentId,
      userId: input.userId,
      gateway: input.gateway,
      operation: 'create',
      httpStatus: null,
      success: false,
      request: { amountMinor: input.amountMinor, method },
      response: null,
      errorCode: code,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    logger.warn('deposit creation failed', { publicId, gateway: input.gateway, code });
    throw error;
  }
}

const intentPayload = (intent: DepositIntent): Record<string, unknown> => ({
  externalId: intent.externalId,
  payUrl: intent.payUrl,
  instructions: intent.instructions,
});

async function recordAttempt(values: {
  paymentId: string;
  userId: string | null;
  gateway: PaymentGateway;
  operation: string;
  httpStatus: number | null;
  success: boolean;
  request: unknown;
  response: unknown;
  errorCode?: string | null;
  errorMessage?: string | null;
}): Promise<void> {
  try {
    await query(
      `insert into payment_attempts (payment_id, user_id, gateway, operation, http_status, success, request, response, error_code, error_message)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        values.paymentId,
        values.userId,
        values.gateway,
        values.operation,
        values.httpStatus,
        values.success,
        values.request ? JSON.stringify(values.request) : null,
        values.response ? JSON.stringify(values.response) : null,
        values.errorCode ?? null,
        values.errorMessage ? values.errorMessage.slice(0, 500) : null,
      ],
    );
  } catch {
    // An attempt log must never be the reason a deposit fails.
  }
}

/**
 * Credits a completed deposit. Idempotent by construction: the ledger movement carries the payment
 * id as its idempotency key, and the payment row is only flipped to `approved` once.
 */
export async function creditDeposit(
  paymentId: string,
  intent?: DepositIntent,
  /** Accepted for a stable call signature: crediting needs the ledger, not a gateway. */
  _deps: PaymentsServiceDeps = {},
): Promise<boolean> {
  const row = await queryOne<DbPayment>('select * from payments where id = $1', [paymentId]);
  if (!row) throw paymentNotFound();
  if (row.status === 'approved') return false;
  if (row.status !== 'pending') throw paymentAlreadyResolved(row.status);

  const amountMinor = num(row.amount_minor);
  if (amountMinor <= 0) throw paymentAlreadyResolved(row.status);

  await withTransaction(async (client) => {
    const movement = await applyWalletMovement(
      {
        userId: row.user_id,
        direction: 'credit',
        type: 'payment',
        amountMinor,
        description: `Deposit ${row.public_id}`,
        idempotencyKey: `payment:${row.id}`,
        paymentId: row.id,
      },
      client,
    );

    await client.query(
      `update payments
          set status = 'approved', resolved_at = now(), wallet_transaction_id = $2,
              provider_payload = coalesce($3, provider_payload), provider_reference = coalesce($4, provider_reference)
        where id = $1 and status = 'pending'`,
      [paymentId, movement.transactionId, intent ? JSON.stringify(intent.raw) : null, intent?.reference ?? null],
    );
  });

  // The customer hears that the money arrived (a notification never fails a credit).
  const { createNotifier } = await import('../tickets/service.js');
  await createNotifier()({
    userId: row.user_id,
    type: 'payment.approved',
    title: 'تم إضافة الرصيد لمحفظتك',
    body: `العملية ${row.public_id}`,
    link: '/wallet',
  });

  return true;
}

/**
 * Asks the gateway for the authoritative status of a deposit and acts on it.
 *
 * Sha7nawy needs an explicit confirm call first (their flow), Heleket does not. Only the answer from
 * the gateway can move money — never the status we were told in a query string.
 */
export async function refreshDeposit(userId: string, publicId: string, deps: PaymentsServiceDeps = {}): Promise<PublicPayment> {
  const row = await queryOne<DbPayment>('select * from payments where public_id = $1 and user_id = $2', [publicId, userId]);
  if (!row) throw paymentNotFound();
  if (row.status !== 'pending') return publicPayment(row);

  const adapter = resolveAdapter(row.gateway, deps);
  if (!adapter.configured()) throw paymentGatewayUnconfigured(row.gateway);
  if (!row.provider_reference) throw paymentNotFound();

  let intent: DepositIntent = await adapter.checkDeposit(row.provider_reference);
  if (intent.status === 'pending' && adapter.confirmDeposit) {
    intent = await adapter.confirmDeposit(intent);
  }

  await recordAttempt({
    paymentId: row.id,
    userId,
    gateway: row.gateway,
    operation: 'refresh',
    httpStatus: 200,
    success: intent.status !== 'rejected',
    request: { publicId },
    response: intent.raw,
  });

  if (intent.status === 'completed') {
    await creditDeposit(row.id, intent, deps);
    const fresh = await queryOne<DbPayment>('select * from payments where id = $1', [row.id]);
    return publicPayment(fresh ?? row, { instructions: intent.instructions });
  }

  if (intent.status === 'rejected' || intent.status === 'expired') {
    await query(
      `update payments set status = $2, resolved_at = now(), provider_payload = coalesce($3, provider_payload) where id = $1 and status = 'pending'`,
      [row.id, intent.status === 'expired' ? 'expired' : 'rejected', JSON.stringify(intent.raw)],
    );
    if (intent.status === 'expired') throw paymentExpired();
    throw paymentAlreadyResolved('rejected');
  }

  throw paymentPendingConfirmation(intent.instructions);
}

/** The customer's own deposits, newest first. */
export async function listDeposits(userId: string, limit = 20): Promise<PublicPayment[]> {
  const rows = await query<DbPayment>(
    'select * from payments where user_id = $1 order by created_at desc limit $2',
    [userId, Math.min(Math.max(limit, 1), 100)],
  );
  return rows.map((row) => publicPayment(row));
}

export type WebhookOutcome = {
  duplicate: boolean;
  signatureValid: boolean;
  handled: boolean;
  status: PaymentStatus | null;
  credited: boolean;
};

/**
 * Webhook ingestion.
 *
 * Every delivery is recorded once (the database enforces uniqueness on `(gateway, event_id)`), then
 * acted on. A signed gateway (Heleket) is trusted when its signature verifies; an unsigned one
 * (Sha7nawy) is treated as a hint and the status is read back from the gateway before any credit.
 */
export async function handleWebhook(
  gateway: PaymentGateway,
  delivery: { headers: Record<string, string | string[] | undefined>; body: unknown },
  deps: PaymentsServiceDeps = {},
): Promise<WebhookOutcome> {
  const logger = deps.logger ?? defaultLogger;
  const adapter = resolveAdapter(gateway, deps);
  const verdict = adapter.verifyWebhook({ headers: delivery.headers, body: delivery.body, rawBody: JSON.stringify(delivery.body ?? {}) });

  const payload = (delivery.body ?? {}) as Record<string, unknown>;
  const inserted = await queryOne<{ id: string }>(
    `insert into webhook_events (gateway, event_id, signature_valid, status, payload)
     values ($1, $2, $3, 'received', $4)
     on conflict (gateway, event_id) do nothing
     returning id`,
    [gateway, verdict.eventId, verdict.valid, JSON.stringify(payload)],
  );

  // Already seen: acknowledge and do nothing (the gateway is told everything is fine).
  if (!inserted) return { duplicate: true, signatureValid: verdict.valid, handled: true, status: null, credited: false };

  const eventId = inserted.id;

  if (gateway === 'heleket' && !verdict.valid) {
    await query(`update webhook_events set status = 'ignored', error = $2, processed_at = now() where id = $1`, [
      eventId,
      'signature did not verify',
    ]);
    throw paymentSignatureInvalid();
  }

  try {
    const row = await queryOne<DbPayment>(
      `select * from payments
        where gateway = $1 and (provider_reference = $2 or public_id = $2 or public_id = $3 or provider_reference = $3)
        order by created_at desc limit 1`,
      [gateway, verdict.reference, verdict.externalId],
    );

    if (!row) {
      await query(`update webhook_events set status = 'ignored', error = $2, processed_at = now() where id = $1`, [
        eventId,
        'no payment matches this notification',
      ]);
      logger.warn('webhook for an unknown payment', { gateway, eventId: verdict.eventId });
      return { duplicate: false, signatureValid: verdict.valid, handled: false, status: null, credited: false };
    }

    await query(`update webhook_events set payment_id = $2 where id = $1`, [eventId, row.id]);

    let credited = false;
    let status: PaymentStatus | null = row.status;

    if (verdict.valid && verdict.status === 'completed') {
      credited = await creditDeposit(row.id, undefined, deps);
      status = 'approved';
    } else {
      // Not authoritative (or not a completion): ask the gateway what is true.
      const intent = await adapter.checkDeposit(verdict.externalId ?? row.provider_reference ?? row.public_id);
      const settled = intent.status === 'pending' && adapter.confirmDeposit ? await adapter.confirmDeposit(intent) : intent;

      if (settled.status === 'completed') {
        credited = await creditDeposit(row.id, settled, deps);
        status = 'approved';
      } else if (settled.status === 'rejected' || settled.status === 'expired') {
        await query(
          `update payments set status = $2, resolved_at = now() where id = $1 and status = 'pending'`,
          [row.id, settled.status === 'expired' ? 'expired' : 'rejected'],
        );
        status = settled.status === 'expired' ? 'expired' : 'rejected';
      }
    }

    await query(`update webhook_events set status = 'processed', processed_at = now() where id = $1`, [eventId]);
    return { duplicate: false, signatureValid: verdict.valid, handled: true, status, credited };
  } catch (error) {
    await query(`update webhook_events set status = 'failed', error = $2, processed_at = now() where id = $1`, [
      eventId,
      (error instanceof Error ? error.message : String(error)).slice(0, 500),
    ]);
    throw error;
  }
}
