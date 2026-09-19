import { createHash, timingSafeEqual } from 'node:crypto';
import { paymentGatewayAuthFailed, paymentGatewayRejected, paymentGatewayUnreachable } from '../errors.js';
import type { DepositIntent, DepositRequest, DepositStatus, GatewayConfig, PaymentAdapter, WebhookVerdict } from '../types.js';

/**
 * Heleket — crypto deposits.
 *
 * Documented integration (doc.heleket.com):
 *   - credentials: a merchant UUID and a payment API key, sent as the `merchant` and `sign` headers
 *   - signature: `md5(base64(jsonBody) + apiKey)` where the JSON is encoded the way PHP's
 *     json_encode does it — unescaped unicode, but forward slashes escaped (`\/`)
 *   - create:  POST /v1/payment        → { uuid, url, status, is_final, … }
 *   - status:  POST /v1/payment/info   → same shape, this is the authoritative read
 *   - webhook: Heleket POSTs the payment object with a `sign` field; the signature covers the body
 *     **without** `sign`, which makes a valid webhook authoritative on its own
 *
 * The API key never leaves this file: it is used to sign and is never logged, stored or returned.
 */

const DEFAULT_BASE = 'https://api.heleket.com';
const DEFAULT_TIMEOUT_MS = 15_000;

/** PHP's json_encode escapes forward slashes; the signature is computed over exactly that text. */
function phpLikeJson(value: unknown): string {
  return JSON.stringify(value).replace(/\//g, '\\/');
}

function signBody(body: unknown, apiKey: string): string {
  return createHash('md5').update(Buffer.from(phpLikeJson(body), 'utf8').toString('base64') + apiKey).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

type HeleketResult = {
  uuid?: string;
  order_id?: string;
  status?: string;
  payment_status?: string;
  is_final?: boolean;
  url?: string;
  expired_at?: number | null;
  amount?: string;
  [key: string]: unknown;
};

function mapStatus(result: HeleketResult | undefined): DepositStatus {
  const status = String(result?.payment_status ?? result?.status ?? '').toLowerCase();
  if (status === 'paid' || status === 'paid_over') return 'completed';
  if (status === 'expired') return 'expired';
  if (['cancel', 'canceled', 'cancelled', 'fail', 'failed', 'wrong_amount', 'locked'].includes(status)) return 'rejected';
  return 'pending';
}

function intentFrom(result: HeleketResult, fallbackId: string): DepositIntent {
  return {
    externalId: String(result.uuid ?? fallbackId),
    reference: result.order_id ? String(result.order_id) : null,
    status: mapStatus(result),
    payUrl: result.url ? String(result.url) : null,
    instructions: null,
    raw: result,
  };
}

export function createHeleketAdapter(config: GatewayConfig): PaymentAdapter {
  const baseUrl = (config.baseUrl ?? DEFAULT_BASE).replace(/\/+$/, '');
  const fetchImpl = config.fetchImpl ?? ((url, init) => fetch(url, init));
  const log = config.logger;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function call(path: string, body: Record<string, unknown>): Promise<HeleketResult> {
    if (!config.merchantId || !config.secretKey) throw paymentGatewayAuthFailed();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          merchant: config.merchantId,
          sign: signBody(body, config.secretKey),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const text = await response.text();
      let payload: { state?: number; result?: HeleketResult; message?: string } = {};
      try {
        payload = JSON.parse(text) as typeof payload;
      } catch {
        log?.warn('heleket returned a non-JSON body', { status: response.status, path });
        throw paymentGatewayRejected('the provider answered in an unexpected format');
      }

      if (response.status === 401 || response.status === 403) throw paymentGatewayAuthFailed();
      if (response.status >= 500) throw paymentGatewayUnreachable();
      if (!response.ok || (payload.state ?? 0) !== 0 || !payload.result) {
        // The provider's own wording is logged for support and never shown to a customer verbatim.
        throw paymentGatewayRejected(String(payload.message ?? `status ${response.status}`));
      }

      return payload.result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw paymentGatewayUnreachable();
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    key: 'heleket',
    currency: 'USD',
    methods: [],
    configured: () => Boolean(config.baseUrl ?? true) && Boolean(config.merchantId && config.secretKey),

    async createDeposit(input: DepositRequest): Promise<DepositIntent> {
      const body: Record<string, unknown> = {
        amount: (input.amountMinor / 100).toFixed(2),
        currency: input.currency,
        order_id: input.publicId,
        url_callback: input.webhookUrl,
      };
      if (input.returnUrl) body.url_return = input.returnUrl;
      const result = await call('/v1/payment', body);
      return intentFrom(result, input.publicId);
    },

    async checkDeposit(externalId: string): Promise<DepositIntent> {
      const result = await call('/v1/payment/info', { uuid: externalId });
      return intentFrom(result, externalId);
    },

    /**
     * Heleket signs the notification, so a valid signature is proof the message came from Heleket
     * and the status it carries can be trusted. The signature covers the body without `sign`.
     */
    verifyWebhook({ body }): WebhookVerdict {
      const payload = (body ?? {}) as Record<string, unknown> & { sign?: string };
      const signature = typeof payload.sign === 'string' ? payload.sign : '';
      const { sign: _sign, ...rest } = payload;

      const expected = config.secretKey ? signBody(rest, config.secretKey) : '';
      const valid = Boolean(signature && expected && safeEqual(signature, expected));

      const uuid = typeof rest.uuid === 'string' ? rest.uuid : null;
      const status = mapStatus(rest as HeleketResult);

      return {
        valid,
        // The payment uuid plus its final status is unique per notification.
        eventId: `${uuid ?? 'unknown'}:${String((rest as HeleketResult).status ?? '')}`,
        externalId: uuid,
        reference: typeof rest.order_id === 'string' ? rest.order_id : null,
        status,
        authoritative: valid,
      };
    },
  };
}
