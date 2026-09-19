/**
 * The generic SMM-panel adapter.
 *
 * Thousands of suppliers expose the same *shape*: a single POST endpoint that takes a
 * form-urlencoded body with an API key, an action name and a few parameters, and answers JSON.
 * This adapter implements that shape and nothing else — no vendor name, no host and no path is
 * baked in. Everything that varies per supplier is configuration:
 *
 *   baseUrl        the supplier's API address (providers.base_url)
 *   credential     the API key (decrypted from providers.credentials_encrypted)
 *   actions        which action name to send: balance / services / add / status / cancel
 *   params         the parameter names: key / action / service / link / quantity / orderId / …
 *   mapping        where the values live in the answer: balanceField, servicesPath, rateField, …
 *   extraParams    any additional constant parameter a supplier insists on
 *   capabilities   explicit override; otherwise derived from which mapping fields are configured
 *
 * Disabling a mapping field (empty string or null) disables the matching capability, so a supplier
 * that only lists services is representable without lying about what it can do.
 *
 * Two rules hold for every request:
 *  1. The credential only ever travels in the request body — never in a URL, never in a log line.
 *  2. Anything the supplier returns is logged only through `redactMeta`/`redactUpstream` and is
 *     never surfaced to a client verbatim.
 */
import { toMinor } from '../../../lib/money.js';
import { providerError, providerMessage, looksLikeAuthFailure } from '../errors.js';
import { logger as defaultLogger } from '../../../lib/logger.js';
import { redactMeta, redactUpstream } from '../redact.js';
import { PROVIDER_CAPABILITIES } from '../types.js';
import type {
  AdapterService,
  BalanceResult,
  CancelOrderResult,
  CreateOrderInput,
  CreateOrderResult,
  FetchLike,
  LoggerLike,
  OrderStatusResult,
  ProviderAdapter,
  ProviderCapability,
  ProviderConnection,
  ProviderOrderStatus,
} from '../types.js';

export const PANEL_ADAPTER_KEY = 'smm-panel';

type PanelAction = 'balance' | 'services' | 'add' | 'status' | 'cancel';
type PanelParam =
  | 'key'
  | 'action'
  | 'service'
  | 'link'
  | 'quantity'
  | 'comments'
  | 'username'
  | 'orderId'
  | 'runs'
  | 'interval'
  | 'dripFeed';

/**
 * The documented shape of `providers.adapter_config`. Read defensively (every key is optional),
 * so a partially configured supplier still works with these defaults.
 */
export type PanelAdapterConfig = {
  actions?: Partial<Record<PanelAction, string>>;
  params?: Partial<Record<PanelParam, string>>;
  mapping?: Partial<PanelMapping>;
  extraParams?: Record<string, string | number>;
  capabilities?: ProviderCapability[];
  currency?: string;
  timeoutMs?: number;
};

export type PanelMapping = {
  /** Any value here marks an in-band failure (SMM panels answer 200 with `{"error": "…"}`). */
  errorField: string;
  errorMessageField: string;
  balanceField: string;
  currencyField: string;
  /** Dotted path to the service array, or '' when the array IS the response body. */
  servicesPath: string;
  serviceIdField: string;
  serviceNameField: string;
  serviceTypeField: string;
  rateField: string;
  rateCurrencyField: string;
  minField: string;
  maxField: string;
  refillField: string;
  cancelField: string;
  dripFeedField: string;
  orderIdField: string;
  orderStatusField: string;
  orderChargeField: string;
  orderStartCountField: string;
  orderRemainsField: string;
  /** Only used when it is configured; an unconfigured cancel answer is read as success. */
  cancelResultField: string;
};

/** The action names and parameter names an SMM-panel API conventionally uses. */
export const PANEL_DEFAULT_ACTIONS: Record<PanelAction, string> = {
  balance: 'balance',
  services: 'services',
  add: 'add',
  status: 'status',
  cancel: 'cancel',
};

export const PANEL_DEFAULT_PARAMS: Record<PanelParam, string> = {
  key: 'key',
  action: 'action',
  service: 'service',
  link: 'link',
  quantity: 'quantity',
  comments: 'comments',
  username: 'username',
  orderId: 'order_id',
  runs: 'runs',
  interval: 'interval',
  dripFeed: 'dripfeed',
};

export const PANEL_DEFAULT_MAPPING: PanelMapping = {
  errorField: 'error',
  errorMessageField: '',
  balanceField: 'balance',
  currencyField: 'currency',
  servicesPath: '',
  serviceIdField: 'service',
  serviceNameField: 'name',
  serviceTypeField: 'type',
  rateField: 'rate',
  rateCurrencyField: '',
  minField: 'min',
  maxField: 'max',
  refillField: 'refill',
  cancelField: 'cancel',
  dripFeedField: 'dripfeed',
  orderIdField: 'order',
  orderStatusField: 'status',
  orderChargeField: 'charge',
  orderStartCountField: 'start_count',
  orderRemainsField: 'remains',
  cancelResultField: '',
};

const STATUS_MAP: Record<string, ProviderOrderStatus> = {
  pending: 'pending',
  processing: 'processing',
  'in progress': 'in_progress',
  inprogress: 'in_progress',
  'in_progress': 'in_progress',
  completed: 'completed',
  complete: 'completed',
  partial: 'partial',
  canceled: 'canceled',
  cancelled: 'canceled',
  refunded: 'refunded',
  failed: 'failed',
  error: 'failed',
};

const DEFAULT_TIMEOUT_MS = 20_000;
const MIN_TIMEOUT_MS = 100;
const MAX_TIMEOUT_MS = 120_000;

/** Reads a value out of an unknown JSON blob without trusting its shape. */
export function readPath(value: unknown, path: string | null | undefined): unknown {
  if (!path) return undefined;
  let current: unknown = value;

  for (const segment of path.split('.')) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) return undefined;
      current = current[index];
      continue;
    }
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/** Non-empty string from a JSON blob, else the fallback. */
const asString = (source: Record<string, unknown>, key: string, fallback: string): string => {
  const value = source[key];
  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : fallback;
};

/** '' / null / false in the config means "this supplier does not offer it". */
const configured = (value: string): boolean => value.trim().length > 0;

const booleanish = (value: unknown): boolean => {
  if (value === true || value === 1) return true;
  if (typeof value !== 'string') return false;
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(value.trim().toLowerCase());
};

const integerOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(String(value).trim().replace(/[,_\s]/g, ''));
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
};

/**
 * A decimal amount to integer minor units, without ever going through a float multiply.
 * `minorExponent` 2 = a price written as 12.34, 0 = a price already written in minor units.
 */
export function amountToMinor(value: unknown, minorExponent: number): number | null {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).trim().replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(text)) return null;

  if (minorExponent === 2) return toMinor(text);

  const [whole = '0', fraction = ''] = text.split('.');
  const digits = (fraction + '0'.repeat(Math.max(minorExponent, 0))).slice(0, Math.max(minorExponent, 0));
  const rest = fraction.slice(Math.max(minorExponent, 0));
  const base = Number(`${whole}${digits}`);
  if (!Number.isSafeInteger(base)) return null;
  return base + (rest.length > 0 && Number(rest[0] ?? '0') >= 5 ? 1 : 0);
}

const currencyOf = (value: unknown, fallback: string): string => {
  const text = String(value ?? '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(text) ? text : fallback;
};

type ResolvedConfig = {
  baseUrl: string;
  credential: string | null;
  currency: string;
  timeoutMs: number;
  minorExponent: number;
  actions: Record<PanelAction, string>;
  params: Record<PanelParam, string>;
  mapping: PanelMapping;
  extraParams: Record<string, string | number>;
  capabilities: ProviderCapability[];
  fetchImpl: FetchLike;
  logger: LoggerLike;
};

function resolveConfig(connection: ProviderConnection, config: Record<string, unknown>): ResolvedConfig {
  const baseUrl = String(connection.baseUrl ?? '').trim().replace(/\/+$/, '');
  if (!configured(baseUrl)) {
    throw providerError(
      'PROVIDER_NOT_CONFIGURED',
      'This supplier has no API address saved, so we did not contact anyone. Add the supplier’s API address first.',
      422,
    );
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw providerError(
      'PROVIDER_NOT_CONFIGURED',
      'The API address saved for this supplier is not a valid address, so we did not contact anyone. Correct it first.',
      422,
    );
  }
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    throw providerError(
      'PROVIDER_NOT_CONFIGURED',
      'The API address saved for this supplier must start with http:// or https://. Correct it first.',
      422,
    );
  }

  const actionSection = config.actions && typeof config.actions === 'object' ? (config.actions as Record<string, unknown>) : {};
  const paramSection = config.params && typeof config.params === 'object' ? (config.params as Record<string, unknown>) : {};
  const mappingSection = config.mapping && typeof config.mapping === 'object' ? (config.mapping as Record<string, unknown>) : {};
  const extraSection = config.extraParams && typeof config.extraParams === 'object' ? (config.extraParams as Record<string, unknown>) : {};

  const actions = Object.fromEntries(
    (Object.keys(PANEL_DEFAULT_ACTIONS) as PanelAction[]).map((name) => [
      name,
      asString(actionSection, name, PANEL_DEFAULT_ACTIONS[name]),
    ]),
  ) as Record<PanelAction, string>;

  const params = Object.fromEntries(
    (Object.keys(PANEL_DEFAULT_PARAMS) as PanelParam[]).map((name) => [
      name,
      asString(paramSection, name, PANEL_DEFAULT_PARAMS[name]),
    ]),
  ) as Record<PanelParam, string>;

  const mapping = Object.fromEntries(
    (Object.keys(PANEL_DEFAULT_MAPPING) as (keyof PanelMapping)[]).map((key) => [
      key,
      asString(mappingSection, key, PANEL_DEFAULT_MAPPING[key]),
    ]),
  ) as PanelMapping;

  const extraParams = Object.fromEntries(
    Object.entries(extraSection).filter((entry): entry is [string, string | number] =>
      ['string', 'number'].includes(typeof entry[1]),
    ),
  );

  const minorExponent = integerOrNull(config.minorExponent) ?? 2;
  const timeoutMs = Math.min(
    Math.max(integerOrNull(config.timeoutMs) ?? connection.timeoutMs ?? DEFAULT_TIMEOUT_MS, MIN_TIMEOUT_MS),
    MAX_TIMEOUT_MS,
  );

  const declared = Array.isArray(config.capabilities)
    ? (config.capabilities.filter((value): value is ProviderCapability =>
        (PROVIDER_CAPABILITIES as readonly string[]).includes(String(value)),
      ) as ProviderCapability[])
    : null;

  const derived: ProviderCapability[] = [];
  if (configured(actions.balance) && configured(mapping.balanceField)) derived.push('balance');
  if (configured(actions.services)) derived.push('services');
  if (configured(actions.add) && configured(mapping.orderIdField)) derived.push('order.create');
  if (configured(actions.status) && configured(mapping.orderStatusField)) derived.push('order.status');
  if (configured(actions.cancel)) derived.push('order.cancel');

  // The credential is passed to fetch but is never part of a config object that gets logged.
  const credential = typeof connection.credential === 'string' && connection.credential.length > 0 ? connection.credential : null;

  return {
    baseUrl,
    credential,
    currency: currencyOf(config.currency, currencyOf(connection.currency, 'USD')),
    timeoutMs,
    minorExponent,
    actions,
    params,
    mapping,
    extraParams: extraParams as Record<string, string | number>,
    capabilities: declared ?? derived,
    fetchImpl: connection.fetchImpl ?? ((url, init) => globalThis.fetch(url, init)),
    logger: connection.logger ?? defaultLogger,
  };
}

/** The `order_status` enum value for a supplier's status word, or null when it is unknown. */
export function mapOrderStatus(value: unknown): ProviderOrderStatus | null {
  const key = String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  return STATUS_MAP[key] ?? STATUS_MAP[key.replace(/-/g, '_')] ?? null;
}

function wrap(connection: ProviderConnection, config: Record<string, unknown>): ProviderAdapter {
  const resolved = resolveConfig(connection, config);
  const { actions, params, mapping, credential, baseUrl, currency, extraParams, capabilities } = resolved;
  // Whatever is passed to a logger from here on carries this list, so a supplier value that
  // echoes the key back can never reach a log line or an error body.
  const secrets = credential ? [credential] : [];
  const logger = resolved.logger;
  const label = { provider: connection.slug, adapter: connection.adapterKey, providerId: connection.providerId };

  const readBody = async (response: Response): Promise<string> => {
    try {
      return await response.text();
    } catch {
      return '';
    }
  };

  /** POSTs one action and returns the parsed body, or throws a documented provider error. */
  const post = async (action: string, fields: Record<string, unknown>): Promise<unknown> => {
    const body = new URLSearchParams();
    if (credential) body.set(params.key, credential);
    body.set(params.action, action);
    for (const [name, value] of Object.entries(fields)) {
      if (value === undefined || value === null || value === '') continue;
      body.set(name, String(value));
    }
    for (const [name, value] of Object.entries(extraParams)) body.set(name, String(value));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), resolved.timeoutMs);
    const startedAt = Date.now();
    let response: Response;

    try {
      response = await resolved.fetchImpl(baseUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
        body: body.toString(),
        signal: controller.signal,
      });
    } catch (error) {
      const failure = error as { name?: string; message?: string };
      const timedOut = controller.signal.aborted || failure?.name === 'AbortError' || /abort/i.test(failure?.message ?? '');
      logger.warn(
        'provider request failed',
        redactMeta(
          { ...label, action, timedOut, durationMs: Date.now() - startedAt, error: failure?.message ?? 'unknown' },
          { secrets },
        ),
      );
      throw timedOut
        ? providerError(
            'PROVIDER_TIMEOUT',
            'The supplier did not answer in time, so nothing was changed. Please try again in a few minutes.',
            504,
            { action },
          )
        : providerError(
            'PROVIDER_UNREACHABLE',
            'We could not reach the supplier, so nothing was changed. Please try again in a few minutes.',
            502,
            { action },
          );
    } finally {
      clearTimeout(timer);
    }

    const text = await readBody(response);
    const durationMs = Date.now() - startedAt;

    if (response.status === 401 || response.status === 403) {
      logger.warn('provider rejected the credential', redactMeta({ ...label, action, status: response.status, durationMs, response: text }, { secrets }));
      throw providerError(
        'PROVIDER_AUTH_FAILED',
        'The supplier refused our API key, so nothing was changed. Ask an administrator to save the supplier’s API key again.',
        502,
        { action, supplierStatus: response.status },
      );
    }
    if (response.status === 429) {
      logger.warn('provider rate limited us', redactMeta({ ...label, action, status: 429, durationMs }, { secrets }));
      throw providerError(
        'PROVIDER_RATE_LIMITED',
        'The supplier is asking us to slow down, so nothing was changed. Please try again in a few minutes.',
        503,
        { action },
      );
    }
    if (!response.ok) {
      logger.warn('provider answered an error', redactMeta({ ...label, action, status: response.status, durationMs, response: text }, { secrets }));
      throw providerError(
        'PROVIDER_HTTP_ERROR',
        `The supplier answered with an error (status ${response.status}) and nothing was changed. Please try again, and contact support if it keeps happening.`,
        502,
        { action, supplierStatus: response.status },
      );
    }
    if (!text.trim()) {
      logger.warn('provider answered an empty body', redactMeta({ ...label, action, status: response.status, durationMs }, { secrets }));
      throw providerError(
        'PROVIDER_EMPTY_RESPONSE',
        'The supplier answered with nothing we could read, so nothing was changed. Please try again in a few minutes.',
        502,
        { action },
      );
    }

    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      logger.warn(
        'provider answered invalid JSON',
        redactMeta({ ...label, action, durationMs, response: redactUpstream(text, { secrets }) }, { secrets }),
      );
      throw providerError(
        'PROVIDER_BAD_RESPONSE',
        'We could not understand the supplier’s answer, so nothing was changed. Contact support if this keeps happening.',
        502,
        { action },
      );
    }

    if (payload === null || (typeof payload !== 'object' && typeof payload !== 'string')) {
      logger.warn('provider answered an unusable payload', redactMeta({ ...label, action, response: text }, { secrets }));
      throw providerError(
        'PROVIDER_BAD_RESPONSE',
        'We could not understand the supplier’s answer, so nothing was changed. Contact support if this keeps happening.',
        502,
        { action },
      );
    }

    // The classic SMM-panel failure: HTTP 200 whose body carries an error message.
    if (mapping.errorField && payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const rawError = readPath(payload, mapping.errorField);
      const isError =
        rawError !== undefined &&
        rawError !== null &&
        rawError !== false &&
        !(typeof rawError === 'string' && rawError.trim() === '');
      if (isError) {
        const detail = mapping.errorMessageField ? readPath(payload, mapping.errorMessageField) : undefined;
        const supplierText = providerMessage(detail ?? rawError, { secrets, limit: 200 });
        const code = looksLikeAuthFailure(supplierText) ? 'PROVIDER_AUTH_FAILED' : 'PROVIDER_REJECTED';
        // The supplier's own words stay on the server (log line + sync log row). A client only
        // ever sees our code and our sentence.
        logger.warn(
          'provider refused the request',
          redactMeta({ ...label, action, status: response.status, durationMs, supplierMessage: supplierText }, { secrets }),
        );
        throw providerError(
          code,
          code === 'PROVIDER_AUTH_FAILED'
            ? 'The supplier refused our API key, so nothing was changed. Ask an administrator to save the supplier’s API key again.'
            : 'The supplier refused this request and nothing was changed. Please check the supplier’s settings, and contact support if it keeps happening.',
          502,
          { action },
        );
      }
    }

    logger.debug('provider request ok', redactMeta({ ...label, action, status: response.status, durationMs }, { secrets }));
    return payload;
  };

  /** Guards a capability before the call, with one documented answer instead of a crash. */
  const require = (capability: ProviderCapability, action: string): void => {
    if (!capabilities.includes(capability)) {
      throw providerError(
        'PROVIDER_CAPABILITY_UNSUPPORTED',
        'This supplier does not offer that action, so nothing was changed. Ask an administrator to check the supplier’s settings.',
        501,
        { capability, action },
      );
    }
  };

  const adapter: ProviderAdapter = {
    key: connection.adapterKey,
    capabilities,

    supports: (capability) => capabilities.includes(capability),

    async balance(): Promise<BalanceResult> {
      require('balance', actions.balance);
      const payload = await post(actions.balance, {});
      const rawBalance = readPath(payload, mapping.balanceField);
      const balanceMinor = amountToMinor(rawBalance, resolved.minorExponent);
      if (balanceMinor === null) {
        throw providerError(
          'PROVIDER_BAD_RESPONSE',
          'We could not read the supplier’s balance, so nothing was changed. Contact support if this keeps happening.',
          502,
        );
      }
      return {
        balanceMinor,
        currency: currencyOf(readPath(payload, mapping.currencyField), currency),
        raw: payload,
      };
    },

    async listServices(): Promise<AdapterService[]> {
      require('services', actions.services);
      const payload = await post(actions.services, {});
      const items = extractServiceItems(payload, mapping.servicesPath);

      if (items === null) {
        throw providerError(
          'PROVIDER_BAD_RESPONSE',
          'We could not read the supplier’s service list, so nothing was changed. Contact support if this keeps happening.',
          502,
          { expectedAt: mapping.servicesPath || '(root)' },
        );
      }

      return items.map((item) => {
        const externalServiceId = String(readPath(item, mapping.serviceIdField) ?? '').trim();
        if (!externalServiceId) {
          throw providerError(
            'PROVIDER_BAD_RESPONSE',
            'The supplier’s service list is missing an identifier we need, so nothing was changed. Contact support if this keeps happening.',
            502,
            { expectedField: mapping.serviceIdField },
          );
        }
        const name = String(readPath(item, mapping.serviceNameField) ?? '').trim() || externalServiceId;

        return {
          externalServiceId,
          name,
          type: strOrNull(readPath(item, mapping.serviceTypeField)),
          rateMinor: amountToMinor(readPath(item, mapping.rateField), resolved.minorExponent),
          rateCurrency: currencyOf(readPath(item, mapping.rateCurrencyField), currency),
          minQuantity: integerOrNull(readPath(item, mapping.minField)),
          maxQuantity: integerOrNull(readPath(item, mapping.maxField)),
          supportsRefill: booleanish(readPath(item, mapping.refillField)),
          supportsCancel: booleanish(readPath(item, mapping.cancelField)),
          supportsDripFeed: booleanish(readPath(item, mapping.dripFeedField)),
          raw: (typeof item === 'object' && item !== null ? item : { value: item }) as Record<string, unknown>,
        };
      });
    },

    async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
      require('order.create', actions.add);
      const payload = await post(actions.add, {
        [params.service]: input.externalServiceId,
        [params.link]: input.link,
        [params.quantity]: input.quantity,
        ...(input.dripFeed ? { [params.dripFeed]: 1 } : {}),
        ...(input.runs !== null && input.runs !== undefined ? { [params.runs]: input.runs } : {}),
        ...(input.interval !== null && input.interval !== undefined ? { [params.interval]: input.interval } : {}),
        ...mapExtras(input.extra, params),
      });

      const externalOrderId = String(readPath(payload, mapping.orderIdField) ?? '').trim();
      if (!externalOrderId) {
        throw providerError(
          'PROVIDER_BAD_RESPONSE',
          'The supplier did not give us an order number, so the order was not placed. Please try again in a few minutes.',
          502,
          { expectedField: mapping.orderIdField },
        );
      }

      return {
        externalOrderId,
        chargeMinor: amountToMinor(readPath(payload, mapping.orderChargeField), resolved.minorExponent),
        currency: currencyOf(readPath(payload, mapping.currencyField), currency),
        raw: payload,
      };
    },

    async orderStatus(externalOrderId: string): Promise<OrderStatusResult> {
      require('order.status', actions.status);
      const payload = await post(actions.status, { [params.orderId]: externalOrderId });
      const status = mapOrderStatus(readPath(payload, mapping.orderStatusField));

      if (!status) {
        throw providerError(
          'PROVIDER_BAD_RESPONSE',
          'We could not understand the supplier’s order status, so nothing was changed. Contact support if this keeps happening.',
          502,
          { expectedField: mapping.orderStatusField },
        );
      }

      return {
        externalOrderId: String(readPath(payload, mapping.orderIdField) ?? externalOrderId),
        status,
        startCount: integerOrNull(readPath(payload, mapping.orderStartCountField)),
        remains: integerOrNull(readPath(payload, mapping.orderRemainsField)),
        chargeMinor: amountToMinor(readPath(payload, mapping.orderChargeField), resolved.minorExponent),
        currency: currencyOf(readPath(payload, mapping.currencyField), currency),
        raw: payload,
      };
    },

    async cancelOrder(externalOrderId: string): Promise<CancelOrderResult> {
      require('order.cancel', actions.cancel);
      const payload = await post(actions.cancel, { [params.orderId]: externalOrderId });
      // A cancel answer is only read for a negative when the supplier documents a field for it;
      // an in-band error already threw above, so a 2xx without one is a cancel.
      const result = mapping.cancelResultField ? readPath(payload, mapping.cancelResultField) : undefined;
      const canceled = mapping.cancelResultField ? booleanish(result) : true;

      return { externalOrderId: String(readPath(payload, mapping.orderIdField) ?? externalOrderId), canceled, raw: payload };
    },
  };

  return adapter;
}

/** Comments/username style extras, renamed onto the supplier's parameter names. */
function mapExtras(extra: Record<string, string> | undefined, params: Record<PanelParam, string>): Record<string, string> {
  if (!extra) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(extra)) {
    const name = (params as Record<string, string>)[key] ?? key;
    out[name] = value;
  }
  return out;
}

function strOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

/**
 * The supplier's service list, in the shapes panels actually use:
 *  - an array at the configured dotted path (`servicesPath`);
 *  - the response body itself as an array;
 *  - an object with one array field (plus scalars), which is the list — this is the common
 *    `{"services": [...]}` / `{"status": "ok", "data": [...]}` answer, and it works without
 *    per-provider configuration, which matters while `adapter_config` is a pending migration;
 *  - an object keyed by service id (a map), which every panel with a `getServices`-style answer
 *    produces.
 */
export function extractServiceItems(payload: unknown, servicesPath: string): unknown[] | null {
  const candidate = servicesPath ? readPath(payload, servicesPath) : payload;
  if (Array.isArray(candidate)) return candidate;

  if (candidate && typeof candidate === 'object') {
    const values = Object.values(candidate as Record<string, unknown>);

    const arrays = values.filter((value) => Array.isArray(value));
    const onlyListsAndScalars = values.every(
      (value) => Array.isArray(value) || value === null || typeof value !== 'object',
    );
    if (arrays.length === 1 && onlyListsAndScalars) return arrays[0] as unknown[];

    // a keyed map of services: every value is an object carrying whatever the mapping reads
    const objects = values.filter((value) => value !== null && typeof value === 'object' && !Array.isArray(value));
    if (objects.length > 0 && objects.length === values.length) return objects;
  }
  return null;
}

/** Adapter factory for `providers.adapter_key = 'smm-panel'`. */
export function createPanelAdapter(connection: ProviderConnection): ProviderAdapter {
  return wrap(connection, connection.config ?? {});
}

export const panelAdapterFactory = createPanelAdapter;

/** The config keys this adapter understands — used by the admin schema and the docs. */
export const PANEL_CONFIG_KEYS = [
  'actions',
  'params',
  'mapping',
  'extraParams',
  'capabilities',
  'currency',
  'timeoutMs',
  'minorExponent',
] as const;
