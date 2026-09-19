/**
 * Adapter registry.
 *
 * `providers.adapter_key` selects the implementation, so a second supplier *shape* is added by
 * registering one factory — no route, no schema and no sync-service change. The generic
 * SMM-panel shape is registered out of the box; anything else is passed in by the caller.
 */
import { providerError } from '../errors.js';
import { decodeCredential } from '../credentials.js';
import { PANEL_ADAPTER_KEY, createPanelAdapter } from './panel.js';
import type { ProviderDbRow } from '../repository.js';
import type {
  AdapterRegistry,
  FetchLike,
  LoggerLike,
  ProviderAdapter,
  ProviderAdapterFactory,
  ProviderConnection,
} from '../types.js';

export function createAdapterRegistry(extra: Record<string, ProviderAdapterFactory> = {}): AdapterRegistry {
  const factories = new Map<string, ProviderAdapterFactory>();

  factories.set(PANEL_ADAPTER_KEY, createPanelAdapter);
  for (const [key, factory] of Object.entries(extra)) factories.set(key, factory);

  return {
    register(key, factory) {
      factories.set(key, factory);
    },
    has: (key) => factories.has(key),
    keys: () => [...factories.keys()].sort(),
    create(connection) {
      const factory = factories.get(connection.adapterKey);
      if (!factory) {
        throw providerError(
          'PROVIDER_ADAPTER_UNKNOWN',
          'This supplier type is not available, so nothing was changed. Ask an administrator to choose a supported supplier type.',
          422,
          { adapterKey: connection.adapterKey, known: [...factories.keys()].sort() },
        );
      }
      return factory(connection);
    },
  };
}

export type ConnectionExtras = {
  credential: string | null;
  fetchImpl?: FetchLike;
  logger?: LoggerLike;
  timeoutMs?: number;
};

/** Builds the connection handed to an adapter factory. The credential never leaves this object. */
export function connectionFor(row: ProviderDbRow, extras: ConnectionExtras): ProviderConnection {
  return {
    providerId: row.id,
    slug: row.slug,
    adapterKey: row.adapter_key,
    baseUrl: row.base_url,
    credential: extras.credential,
    currency: row.balance_currency,
    config: row.adapter_config && typeof row.adapter_config === 'object' ? row.adapter_config : {},
    ...(extras.fetchImpl ? { fetchImpl: extras.fetchImpl } : {}),
    ...(extras.logger ? { logger: extras.logger } : {}),
    ...(extras.timeoutMs ? { timeoutMs: extras.timeoutMs } : {}),
  };
}

/**
 * Decrypts the provider's credential and builds its adapter.
 *
 * This is the only path from a database row to an adapter, so there is exactly one place where a
 * credential is decrypted — and it never touches a log line or a response.
 */
export function adapterForProvider(
  row: ProviderDbRow,
  deps: { registry?: AdapterRegistry; fetchImpl?: FetchLike; logger?: LoggerLike } = {},
): { adapter: ProviderAdapter; credential: string | null } {
  const credential = decodeCredential(row);
  const registry = deps.registry ?? createAdapterRegistry();
  const adapter = registry.create(connectionFor(row, { credential, fetchImpl: deps.fetchImpl, logger: deps.logger }));
  return { adapter, credential };
}

/** Convenience for callers that only need to know whether a provider type is registered. */
export function isKnownAdapterKey(key: string, registry: AdapterRegistry = createAdapterRegistry()): boolean {
  return registry.has(key);
}

export { PANEL_ADAPTER_KEY, createPanelAdapter };
export { createAdapterRegistry as defaultRegistryFactory };
