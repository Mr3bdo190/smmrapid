import {
  paymentGatewayAuthFailed,
  paymentGatewayRejected,
  paymentGatewayUnreachable,
} from '../errors.js';
import type { DepositIntent, DepositRequest, DepositStatus, GatewayConfig, PaymentAdapter, WebhookVerdict } from '../types.js';

/**
 * Sha7nawy Gate — Egyptian e-wallet deposits (Vodafone / Orange / Etisalat cash).
 *
 * Documented integration (their Postman collection):
 *   - `POST /api/payment/create`  { number, amount, method, client, details, webhook_url }
 *     → { status, code, message, data: { id, reference: "SH-…", status: "pending", … } }
 *     The `message` is written in Arabic for the payer ("اطلب *9*1# خلال دقيقة"), so it is passed
 *     through as the customer's instruction instead of being replaced with our own wording.
 *   - `POST /api/payment/confirm` { ref_code } → 200 completed, or 400 while the customer has not
 *     approved yet / the confirmation window closed. Their 400 carries no status field, so the
 *     message is the only signal (documented heuristic below).
 *   - `GET  /api/payment/info/{id}` with the SECRET key → the authoritative status read.
 *
 * Two keys: the public key authorises create/confirm, the secret key authorises info. Neither is
 * ever logged, stored or returned.
 *
 * Their webhook carries **no signature** (only X-Webhook-* headers). An unsigned notification is
 * never trusted on its own: it is recorded as unverified, and the status is then read back from
 * `/api/payment/info` before any money moves.
 */

const DEFAULT_TIMEOUT_MS = 15_000;

const mapStatus = (value: unknown): DepositStatus => {
  const status = String(value ?? '').toLowerCase();
  if (status === 'completed' || status === 'approved' || status === 'paid') return 'completed';
  if (status === 'rejected' || status === 'failed' || status === 'canceled' || status === 'cancelled') return 'rejected';
  if (status === 'expired') return 'expired';
  return 'pending';
};

type ShahnawyEnvelope = { status?: boolean; code?: number; message?: string; data?: Record<string, unknown> | unknown[] };

const dataOf = (envelope: ShahnawyEnvelope): Record<string, unknown> =>
  (envelope.data && !Array.isArray(envelope.data) ? (envelope.data as Record<string, unknown>) : {});

function intentFrom(envelope: ShahnawyEnvelope, fallbackId: string): DepositIntent {
  const data = dataOf(envelope);
  return {
    externalId: data.id === undefined || data.id === null ? fallbackId : String(data.id),
    reference: data.reference ? String(data.reference) : null,
    status: mapStatus(data.status),
    payUrl: null, // Sha7nawy has no hosted page: the customer approves on their phone
    instructions: envelope.message ? String(envelope.message) : null,
    raw: envelope,
  };
}

export function createShahnawyAdapter(config: GatewayConfig): PaymentAdapter {
  const baseUrl = (config.baseUrl ?? '').replace(/\/+$/, '');
  const fetchImpl = config.fetchImpl ?? ((url, init) => fetch(url, init));
  const log = config.logger;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function call(
    path: string,
    init: { method: 'GET' | 'POST'; key: string | null; body?: Record<string, unknown> },
  ): Promise<ShahnawyEnvelope> {
    if (!baseUrl) throw paymentGatewayUnreachable();
    if (!init.key) throw paymentGatewayAuthFailed();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        method: init.method,
        headers: {
          accept: 'application/json',
          authorization: init.key,
          ...(init.body ? { 'content-type': 'application/json' } : {}),
        },
        ...(init.body ? { body: JSON.stringify(init.body) } : {}),
        signal: controller.signal,
      });

      const text = await response.text();
      let payload: ShahnawyEnvelope = {};
      try {
        payload = JSON.parse(text) as ShahnawyEnvelope;
      } catch {
        log?.warn('sha7nawy returned a non-JSON body', { status: response.status, path });
        throw paymentGatewayRejected('the provider answered in an unexpected format');
      }

      if (response.status === 401 || response.status === 403) throw paymentGatewayAuthFailed();
      if (response.status >= 500) throw paymentGatewayUnreachable();

      // A 400 with a message is a business answer (pending / expired / not found), not a crash.
      if (!response.ok && !payload.message) {
        throw paymentGatewayRejected(String(payload.message ?? `status ${response.status}`));
      }
      return payload;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw paymentGatewayUnreachable();
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    key: 'shahnawy',
    currency: 'EGP',
    methods: ['vf_cash', 'or_cash', 'et_cash'],
    configured: () => Boolean(baseUrl && config.publicKey && config.secretKey),

    async createDeposit(input: DepositRequest): Promise<DepositIntent> {
      const envelope = await call('/api/payment/create', {
        method: 'POST',
        key: config.publicKey,
        body: {
          // Their API takes pounds with two decimals, and enforces 5 … 10000 on its own side.
          number: input.walletNumber ?? '',
          amount: Number((input.amountMinor / 100).toFixed(2)),
          method: input.method ?? 'vf_cash',
          client: input.publicId,
          details: `SMM Rapid deposit ${input.publicId}`,
          webhook_url: input.webhookUrl,
        },
      });

      if (envelope.status === false) {
        throw paymentGatewayRejected(String(envelope.message ?? 'the request was refused'));
      }
      return intentFrom(envelope, input.publicId);
    },

    async checkDeposit(externalId: string): Promise<DepositIntent> {
      const envelope = await call(`/api/payment/info/${encodeURIComponent(externalId)}`, {
        method: 'GET',
        key: config.secretKey,
      });
      if (envelope.status === false) {
        // "العملية غير موجودة" — the transaction is not theirs, so it cannot be credited.
        return {
          externalId,
          reference: null,
          status: 'rejected',
          payUrl: null,
          instructions: envelope.message ? String(envelope.message) : null,
          raw: envelope,
        };
      }
      return intentFrom(envelope, externalId);
    },

    /** Ask them to settle the withdrawal now that the customer has approved it. */
    async confirmDeposit(intent: DepositIntent): Promise<DepositIntent> {
      if (!intent.reference) return intent;
      const envelope = await call('/api/payment/confirm', {
        method: 'POST',
        key: config.publicKey,
        body: { ref_code: intent.reference },
      });

      const data = dataOf(envelope);
      if (envelope.status === false) {
        // Their 400 does not carry a status: the message is the only signal, and the wording they
        // document is "العملية منتهية - انتهت مدة التأكيد" for the expired case.
        const message = String(envelope.message ?? '');
        const status: DepositStatus = /منتهية|expired/i.test(message) ? 'expired' : 'pending';
        return { ...intent, status, instructions: message || intent.instructions, raw: envelope };
      }

      return {
        ...intent,
        status: mapStatus(data.status),
        reference: data.reference ? String(data.reference) : intent.reference,
        instructions: envelope.message ? String(envelope.message) : intent.instructions,
        raw: envelope,
      };
    },

    /**
     * Their notification is unsigned, so it is never authoritative. The reference and the reported
     * status are extracted (they are a useful hint and they are what the caller re-verifies), but
     * `valid` stays false: the decision is made by `checkDeposit`.
     */
    verifyWebhook({ headers, body }): WebhookVerdict {
      const payload = (body ?? {}) as Record<string, unknown>;
      const transaction = (payload.transaction ?? {}) as Record<string, unknown>;
      const headerValue = (name: string): string | null => {
        const raw = headers[name.toLowerCase()] ?? headers[name];
        const value = Array.isArray(raw) ? raw[0] : raw;
        return value ? String(value) : null;
      };

      const externalId = headerValue('x-transaction-id') ?? (transaction.id === undefined ? null : String(transaction.id));
      const reference = headerValue('x-transaction-reference') ?? (transaction.reference ? String(transaction.reference) : null);
      const status = mapStatus(headerValue('x-transaction-status') ?? transaction.status);

      return {
        valid: false, // unsigned: never trusted on its own
        eventId: `${externalId ?? reference ?? 'unknown'}:${status}`,
        externalId,
        reference,
        status,
        authoritative: false,
      };
    },
  };
}
