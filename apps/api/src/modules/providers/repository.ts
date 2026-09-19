/**
 * Database access for providers, their synced catalogue and the sync log.
 *
 * The schema is the contract: column names here are the ones in `0001_initial_schema.sql`.
 * Two optional columns are handled defensively (`providers.adapter_config`,
 * `provider_services.is_active`) because the initial schema does not define them — see schema.ts.
 * Nothing here ever selects or returns a credential to a caller that renders JSON.
 */
import type { PoolClient } from 'pg';
import { query, queryOne } from '../../lib/db.js';
import { providerError } from './errors.js';
import { hasAdapterConfig, hasProviderServiceActiveFlag } from './schema.js';
import type { AdapterService } from './types.js';

export type ProviderDbRow = {
  id: string;
  name: string;
  slug: string;
  adapter_key: string;
  base_url: string | null;
  credentials_encrypted: string | null;
  /** Present only when the column exists (pending migration). */
  adapter_config?: Record<string, unknown> | null;
  is_active: boolean;
  priority: number;
  balance_minor: string | null;
  balance_currency: string;
  last_sync_at: string | null;
  last_sync_status: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ProviderServiceDbRow = {
  id: string;
  provider_id: string;
  provider_service_id: string;
  name: string;
  type: string | null;
  rate_minor: string | null;
  rate_currency: string;
  min_quantity: string | null;
  max_quantity: string | null;
  supports_refill: boolean;
  supports_cancel: boolean;
  supports_drip_feed: boolean;
  raw: Record<string, unknown> | null;
  fetched_at: string;
  created_at: string;
  updated_at: string;
  is_active?: boolean;
};

const PROVIDER_SELECT = `p.id, p.name, p.slug, p.adapter_key, p.base_url, p.credentials_encrypted,
       p.is_active, p.priority, p.balance_minor, p.balance_currency, p.last_sync_at,
       p.last_sync_status, p.notes, p.created_at, p.updated_at, p.deleted_at`;

const PROVIDER_RETURNING = `id, name, slug, adapter_key, base_url, credentials_encrypted,
       is_active, priority, balance_minor, balance_currency, last_sync_at,
       last_sync_status, notes, created_at, updated_at, deleted_at`;

/** Postgres error codes we translate; anything else keeps the generic internal-error path. */
function translatePgError(error: unknown): never {
  const code = String((error as { code?: unknown })?.code ?? '');
  if (code === '23505') {
    throw providerError(
      'PROVIDER_SLUG_TAKEN',
      'A supplier with this short name already exists. Choose a different one.',
      409,
    );
  }
  if (code === '23514') {
    throw providerError('PROVIDER_ADAPTER_UNKNOWN', 'The chosen supplier type is not available, so nothing was changed.', 422);
  }
  throw error;
}

export async function listProviders(options: { includeInactive?: boolean } = {}): Promise<
  (ProviderDbRow & { services_total: number })[]
> {
  const withConfig = await hasAdapterConfig();
  return query<ProviderDbRow & { services_total: number }>(
    `select ${PROVIDER_SELECT}${withConfig ? ', p.adapter_config' : ''},
            (select count(*) from provider_services ps where ps.provider_id = p.id)::int as services_total
       from providers p
      where p.deleted_at is null
        and ($1::boolean or p.is_active)
      order by p.priority asc, p.created_at asc`,
    [options.includeInactive === true],
  );
}

export async function getProvider(id: string): Promise<ProviderDbRow | null> {
  const withConfig = await hasAdapterConfig();
  return queryOne<ProviderDbRow>(
    `select ${PROVIDER_SELECT}${withConfig ? ', p.adapter_config' : ''} from providers p where p.id = $1`,
    [id],
  );
}

export type NewProviderRow = {
  name: string;
  slug: string;
  adapterKey: string;
  baseUrl: string | null;
  credentialsEncrypted: string | null;
  adapterConfig: Record<string, unknown> | null;
  priority: number;
  currency: string;
  notes: string | null;
  isActive: boolean;
};

export async function createProvider(values: NewProviderRow): Promise<ProviderDbRow> {
  const columns = [
    'name',
    'slug',
    'adapter_key',
    'base_url',
    'credentials_encrypted',
    'priority',
    'balance_currency',
    'notes',
    'is_active',
  ];
  const parameters: unknown[] = [
    values.name,
    values.slug,
    values.adapterKey,
    values.baseUrl,
    values.credentialsEncrypted,
    values.priority,
    values.currency,
    values.notes,
    values.isActive,
  ];

  const withConfig = await hasAdapterConfig();
  if (withConfig) {
    columns.push('adapter_config');
    parameters.push(JSON.stringify(values.adapterConfig ?? {}));
  }

  const row = await queryOne<ProviderDbRow>(
    `insert into providers (${columns.join(', ')})
     values (${parameters.map((_, index) => `$${index + 1}`).join(', ')})
     returning ${PROVIDER_RETURNING}${withConfig ? ', adapter_config' : ''}`,
    parameters,
  ).catch(translatePgError);

  if (!row) throw providerError('PROVIDER_NOT_FOUND', 'The supplier could not be created. Please try again.', 500);
  return row;
}

export type ProviderPatch = {
  name?: string;
  slug?: string;
  adapterKey?: string;
  baseUrl?: string | null;
  credentialsEncrypted?: string | null;
  adapterConfig?: Record<string, unknown>;
  priority?: number;
  currency?: string;
  notes?: string | null;
  isActive?: boolean;
};

export async function updateProvider(id: string, patch: ProviderPatch): Promise<ProviderDbRow | null> {
  const withConfig = await hasAdapterConfig();
  const assignments: string[] = [];
  const parameters: unknown[] = [];

  const set = (column: string, value: unknown): void => {
    parameters.push(value);
    assignments.push(`${column} = $${parameters.length}`);
  };

  if (patch.name !== undefined) set('name', patch.name);
  if (patch.slug !== undefined) set('slug', patch.slug);
  if (patch.adapterKey !== undefined) set('adapter_key', patch.adapterKey);
  if (patch.baseUrl !== undefined) set('base_url', patch.baseUrl);
  if (patch.credentialsEncrypted !== undefined) set('credentials_encrypted', patch.credentialsEncrypted);
  if (patch.priority !== undefined) set('priority', patch.priority);
  if (patch.currency !== undefined) set('balance_currency', patch.currency);
  if (patch.notes !== undefined) set('notes', patch.notes);
  if (patch.isActive !== undefined) set('is_active', patch.isActive);
  if (patch.adapterConfig !== undefined && withConfig) set('adapter_config', JSON.stringify(patch.adapterConfig));

  if (assignments.length === 0) return getProvider(id);

  parameters.push(id);
  return queryOne<ProviderDbRow>(
    `update providers set ${assignments.join(', ')}
      where id = $${parameters.length} and deleted_at is null
      returning ${PROVIDER_RETURNING}${withConfig ? ', adapter_config' : ''}`,
    parameters,
  ).catch(translatePgError);
}

/** Deactivates a supplier. Rows are never deleted: order history must stay readable. */
export async function deactivateProvider(id: string): Promise<ProviderDbRow | null> {
  const withConfig = await hasAdapterConfig();
  return queryOne<ProviderDbRow>(
    `update providers set is_active = false
      where id = $1 and deleted_at is null
      returning ${PROVIDER_RETURNING}${withConfig ? ', adapter_config' : ''}`,
    [id],
  );
}

export type SyncLogCounts = {
  added: number;
  updated: number;
  disabled: number;
  message?: string | null;
  error?: string | null;
};

export async function startSyncLog(providerId: string, startedBy: string | null): Promise<number> {
  const row = await queryOne<{ id: string }>(
    `insert into provider_sync_logs (provider_id, status, started_by)
     values ($1, 'running', $2) returning id`,
    [providerId, startedBy],
  );
  return Number(row?.id ?? 0);
}

export async function finishSyncLog(
  logId: number,
  status: 'completed' | 'failed',
  counts: SyncLogCounts,
): Promise<void> {
  await query(
    `update provider_sync_logs
        set status = $2, finished_at = now(), added_count = $3, updated_count = $4,
            disabled_count = $5, message = $6, error = $7
      where id = $1`,
    [logId, status, counts.added, counts.updated, counts.disabled, counts.message ?? null, counts.error ?? null],
  );
}

export async function markProviderSynced(providerId: string, status: 'completed' | 'failed'): Promise<void> {
  await query(
    `update providers set last_sync_at = now(), last_sync_status = $2::provider_sync_status where id = $1`,
    [providerId, status],
  );
}

/**
 * When the previous *completed* sync of this provider started. It is what makes the
 * "the supplier stopped offering this" count happen once per disappearance rather than on every
 * later run — see the fallback in deactivateMissingProviderServices.
 */
export async function previousCompletedSyncStartedAt(providerId: string, excludeLogId: number): Promise<Date | null> {
  const row = await queryOne<{ started_at: string }>(
    `select started_at from provider_sync_logs
      where provider_id = $1 and id <> $2 and status = 'completed'
      order by id desc limit 1`,
    [providerId, excludeLogId],
  );
  return row ? new Date(row.started_at) : null;
}

/**
 * The provider's synced catalogue, newest supplier data first.
 * `is_active` is selected only when the column exists (see schema.ts).
 */
export async function listProviderServices(providerId: string): Promise<ProviderServiceDbRow[]> {
  const withFlag = await hasProviderServiceActiveFlag();
  return query<ProviderServiceDbRow>(
    `select id, provider_id, provider_service_id, name, type, rate_minor, rate_currency,
            min_quantity, max_quantity, supports_refill, supports_cancel, supports_drip_feed,
            raw, fetched_at, created_at, updated_at${withFlag ? ', is_active' : ''}
       from provider_services
      where provider_id = $1
      order by provider_service_id asc`,
    [providerId],
  );
}

export async function providerServiceCount(providerId: string): Promise<number> {
  const row = await queryOne<{ count: number }>(
    `select count(*)::int as count from provider_services where provider_id = $1`,
    [providerId],
  );
  return row?.count ?? 0;
}

/**
 * Upserts the supplier's catalogue, matching on (provider_id, provider_service_id).
 *
 * Only supplier-owned columns are written: name, type, the supplier's own rate, quantities,
 * capability flags, the raw snapshot and fetched_at. `created_at` is local history and is never
 * touched, and no pricing column of ours is read or written anywhere in this module.
 *
 * One statement for the whole list (unnest), so a 4,000-service catalogue is one round trip.
 */
export async function upsertProviderServices(
  client: PoolClient,
  providerId: string,
  services: readonly AdapterService[],
  options: { withActiveFlag: boolean },
): Promise<{ created: number; updated: number }> {
  if (services.length === 0) return { created: 0, updated: 0 };

  const existingRows = await client.query<{ provider_service_id: string }>(
    'select provider_service_id from provider_services where provider_id = $1',
    [providerId],
  );
  const existing = new Set(existingRows.rows.map((row) => row.provider_service_id));

  const ids = services.map((service) => service.externalServiceId);
  const names = services.map((service) => service.name);
  const types = services.map((service) => service.type);
  const rates = services.map((service) => service.rateMinor);
  const currencies = services.map((service) => service.rateCurrency);
  const minimums = services.map((service) => service.minQuantity);
  const maximums = services.map((service) => service.maxQuantity);
  const refills = services.map((service) => service.supportsRefill);
  const cancels = services.map((service) => service.supportsCancel);
  const drips = services.map((service) => service.supportsDripFeed);
  const raws = services.map((service) => JSON.stringify(service.raw ?? {}));

  await client.query(
    `insert into provider_services (
       provider_id, provider_service_id, name, type, rate_minor, rate_currency,
       min_quantity, max_quantity, supports_refill, supports_cancel, supports_drip_feed, raw, fetched_at
     )
     select $1, s.provider_service_id, s.name, s.type, s.rate_minor, s.rate_currency,
            s.min_quantity, s.max_quantity, s.supports_refill, s.supports_cancel,
            s.supports_drip_feed, s.raw, now()
       from unnest(
              $2::text[], $3::text[], $4::text[], $5::bigint[], $6::text[], $7::bigint[],
              $8::bigint[], $9::boolean[], $10::boolean[], $11::boolean[], $12::jsonb[]
            ) as s(provider_service_id, name, type, rate_minor, rate_currency, min_quantity,
                   max_quantity, supports_refill, supports_cancel, supports_drip_feed, raw)
     on conflict (provider_id, provider_service_id) do update set
       name                = excluded.name,
       type                = excluded.type,
       rate_minor          = excluded.rate_minor,
       rate_currency       = excluded.rate_currency,
       min_quantity        = excluded.min_quantity,
       max_quantity        = excluded.max_quantity,
       supports_refill     = excluded.supports_refill,
       supports_cancel     = excluded.supports_cancel,
       supports_drip_feed  = excluded.supports_drip_feed,
       raw                 = excluded.raw,
       fetched_at          = excluded.fetched_at
       ${options.withActiveFlag ? ', is_active = true' : ''}`,
    [providerId, ids, names, types, rates, currencies, minimums, maximums, refills, cancels, drips, raws],
  );

  let created = 0;
  for (const id of ids) if (!existing.has(id)) created += 1;
  return { created, updated: ids.length - created };
}

/**
 * Counts (and, when the column exists, marks) the services that disappeared from the supplier.
 *
 * Rows are never deleted — an order placed against a service that has since vanished must stay
 * readable. With `is_active` present the mark is durable and the count is exactly the rows that
 * were still active; without it the schema's own signal is `fetched_at`, and a row counts as
 * newly disappeared only if the previous completed sync fetched it (so a second run does not
 * report the same disappearance again).
 */
export async function deactivateMissingProviderServices(
  client: PoolClient,
  providerId: string,
  keepIds: readonly string[],
  options: { withActiveFlag: boolean; since: Date | null },
): Promise<number> {
  if (options.withActiveFlag) {
    const result = await client.query(
      `update provider_services
          set is_active = false
        where provider_id = $1
          and is_active
          and not (provider_service_id = any($2::text[]))
        returning provider_service_id`,
      [providerId, keepIds],
    );
    return result.rowCount ?? result.rows.length;
  }

  const row = await client.query<{ count: number }>(
    `select count(*)::int as count
       from provider_services
      where provider_id = $1
        and not (provider_service_id = any($2::text[]))
        and ($3::timestamptz is null or fetched_at >= $3::timestamptz)`,
    [providerId, keepIds, options.since ? options.since.toISOString() : null],
  );
  return row.rows[0]?.count ?? 0;
}

/** Append-only audit row for an administrative provider action. Never carries a credential. */
export async function auditProvider(
  action: string,
  providerId: string,
  actorUserId: string | null,
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null,
): Promise<void> {
  await query(
    `insert into audit_logs (actor_type, actor_user_id, action, entity_type, entity_id, old_value, new_value)
     values ('admin', $1::uuid, $2, 'provider', $3, $4, $5)`,
    [actorUserId, action, providerId, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null],
  );
}
