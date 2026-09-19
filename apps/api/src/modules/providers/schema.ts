/**
 * Which optional columns this database actually has.
 *
 * Phase 7 needs two columns the initial schema does not define yet (`providers.adapter_config`
 * and `provider_services.is_active`). Migrations are owned by the parent session, so the module
 * asks the live catalogue instead of assuming: when the column is there it is used and the
 * explicit behaviour is enabled, when it is not the documented fallback applies.
 *
 * The answer is cached per process (it cannot change without a migration + a restart), and a
 * failed lookup is never cached, so a transient database error does not poison the cache.
 */
import { query } from '../../lib/db.js';

const cache = new Map<string, Promise<Set<string>>>();

/** Column names of one table in the current schema. Cached after the first successful lookup. */
export function tableColumns(table: string): Promise<Set<string>> {
  const cached = cache.get(table);
  if (cached) return cached;

  const pending = query<{ column_name: string }>(
    `select column_name from information_schema.columns
      where table_schema = current_schema() and table_name = $1`,
    [table],
  )
    .then((rows) => new Set(rows.map((row) => row.column_name)))
    .catch((error: unknown) => {
      cache.delete(table);
      throw error;
    });

  cache.set(table, pending);
  return pending;
}

export async function hasColumn(table: string, column: string): Promise<boolean> {
  return (await tableColumns(table)).has(column);
}

/** `providers.adapter_config` — action names, parameter names, response field mapping. */
export const ADAPTER_CONFIG_COLUMN = 'adapter_config';

/** `provider_services.is_active` — the explicit "the supplier stopped offering this" flag. */
export const PROVIDER_SERVICE_ACTIVE_COLUMN = 'is_active';

export function hasAdapterConfig(): Promise<boolean> {
  return hasColumn('providers', ADAPTER_CONFIG_COLUMN);
}

export function hasProviderServiceActiveFlag(): Promise<boolean> {
  return hasColumn('provider_services', PROVIDER_SERVICE_ACTIVE_COLUMN);
}

/** Test hook: forget what was learned (a test database can gain a column mid-run). */
export function resetSchemaCache(): void {
  cache.clear();
}
