/**
 * Service catalogue sync.
 *
 * One run: ask the supplier for its service list and reconcile it into `provider_services`.
 * Invariants that matter more than the happy path:
 *
 *  - rows are never deleted: a service that disappears is marked (or, until the `is_active`
 *    migration lands, left with its old `fetched_at` so it is provably no longer offered);
 *  - only supplier-owned columns are written — our pricing and markup live elsewhere and are
 *    not read or written by this module at all;
 *  - an empty list never deactivates the whole catalogue: that is what a wrong API key looks
 *    like, not what a supplier with no services looks like;
 *  - every run is recorded in `provider_sync_logs` (counts, status, redacted message), including
 *    the failed ones, so an operator can see what happened without a log dive.
 */
import { withTransaction } from '../../lib/db.js';
import { logger as defaultLogger } from '../../lib/logger.js';
import { adapterForProvider } from './adapters/registry.js';
import { providerError } from './errors.js';
import { redactMeta, redactText } from './redact.js';
import {
  deactivateMissingProviderServices,
  finishSyncLog,
  getProvider,
  markProviderSynced,
  previousCompletedSyncStartedAt,
  startSyncLog,
  upsertProviderServices,
} from './repository.js';
import { hasProviderServiceActiveFlag } from './schema.js';
import type { AdapterRegistry, AdapterService, FetchLike, LoggerLike } from './types.js';

export type SyncProviderServicesResult = {
  providerId: string;
  fetched: number;
  created: number;
  updated: number;
  deactivated: number;
  /** Rows the supplier sent twice (or without an id) that were folded into one. */
  skipped: number;
  /**
   * `flag` = marked inactive through provider_services.is_active;
   * `fetched_at` = the column is missing, so a disappeared row keeps its old fetched_at
   * (documented fallback; see docs/ERROR_CODES.md and the migration report).
   */
  deactivationMode: 'flag' | 'fetched_at';
  logId: number;
  startedAt: string;
  finishedAt: string;
  message: string;
};

export type SyncDeps = {
  registry?: AdapterRegistry;
  fetchImpl?: FetchLike;
  logger?: LoggerLike;
};

/** The same service id twice in one answer would break a single upsert statement. */
function dedupe(services: readonly AdapterService[]): AdapterService[] {
  const byId = new Map<string, AdapterService>();
  for (const service of services) byId.set(service.externalServiceId, service);
  return [...byId.values()];
}

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error ?? 'unknown failure');

export async function syncProviderServices(
  input: { providerId: string; startedBy?: string | null },
  deps: SyncDeps = {},
): Promise<SyncProviderServicesResult> {
  const logger = deps.logger ?? defaultLogger;
  const provider = await getProvider(input.providerId);

  if (!provider || provider.deleted_at) {
    throw providerError('PROVIDER_NOT_FOUND', 'This supplier does not exist, so nothing was changed.', 404);
  }

  const startedAt = new Date();
  const logId = await startSyncLog(provider.id, input.startedBy ?? null);
  // Every log line and stored message in this run goes through this list.
  const secrets: string[] = [];

  try {
    const { adapter, credential } = adapterForProvider(provider, {
      registry: deps.registry,
      fetchImpl: deps.fetchImpl,
      logger,
    });
    if (credential) secrets.push(credential);

    if (!adapter.supports('services')) {
      throw providerError(
        'PROVIDER_CAPABILITY_UNSUPPORTED',
        'This supplier does not offer a service list, so nothing was changed. Ask an administrator to check the supplier’s settings.',
        501,
        { capability: 'services' },
      );
    }

    const listed = await adapter.listServices();
    const services = dedupe(listed);
    const skipped = listed.length - services.length;
    const withActiveFlag = await hasProviderServiceActiveFlag();
    const deactivationMode: 'flag' | 'fetched_at' = withActiveFlag ? 'flag' : 'fetched_at';

    let created = 0;
    let updated = 0;
    let deactivated = 0;
    let message: string;

    if (services.length === 0) {
      // A supplier answering "no services" is far more often a broken credential or address than
      // an empty catalogue, and deactivating everything on that signal would be destructive.
      message =
        'The supplier returned no services, so nothing was changed. Check the supplier’s API address and key.';
    } else {
      const previousStart = await previousCompletedSyncStartedAt(provider.id, logId);
      const counts = await withTransaction(async (client) => {
        const upserted = await upsertProviderServices(client, provider.id, services, { withActiveFlag });
        const disappeared = await deactivateMissingProviderServices(
          client,
          provider.id,
          services.map((service) => service.externalServiceId),
          { withActiveFlag, since: previousStart },
        );
        return { ...upserted, deactivated: disappeared };
      });

      created = counts.created;
      updated = counts.updated;
      deactivated = counts.deactivated;
      message = `Imported ${services.length} services: ${created} new, ${updated} updated, ${deactivated} no longer offered.`;
    }

    await finishSyncLog(logId, 'completed', {
      added: created,
      updated,
      disabled: deactivated,
      message: redactText(message, { secrets }),
    });
    await markProviderSynced(provider.id, 'completed');

    logger.info(
      'provider sync completed',
      redactMeta(
        {
          providerId: provider.id,
          slug: provider.slug,
          fetched: services.length,
          created,
          updated,
          deactivated,
          skipped,
          deactivationMode,
        },
        { secrets },
      ),
    );

    return {
      providerId: provider.id,
      fetched: services.length,
      created,
      updated,
      deactivated,
      skipped,
      deactivationMode,
      logId,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      message,
    };
  } catch (error) {
    const message = redactText(errorText(error), { secrets, limit: 300 });

    logger.error(
      'provider sync failed',
      redactMeta({ providerId: provider.id, slug: provider.slug, error: message }, { secrets }),
    );

    // The run is recorded even when it failed; a failed bookkeeping write must not replace the
    // real error the caller needs to see.
    await finishSyncLog(logId, 'failed', { added: 0, updated: 0, disabled: 0, error: message }).catch(
      () => undefined,
    );
    await markProviderSynced(provider.id, 'failed').catch(() => undefined);

    throw error;
  }
}
