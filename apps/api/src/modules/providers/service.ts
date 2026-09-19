/**
 * Administrative operations on suppliers.
 *
 * This is the only place a credential is encrypted, and the only place the public shape of a
 * provider is decided — `credentials_encrypted` never leaves the process, so a response can only
 * ever say *that* a key is stored (`hasCredential`), never what it is, not even shortened.
 *
 * Every mutation writes an audit row. The audit payload deliberately records `credentialUpdated:
 * true` rather than the value: audit_logs is append-only and readable by support.
 */
import { createAdapterRegistry } from './adapters/registry.js';
import { decodeCredential, encodeCredential, hasStoredCredential } from './credentials.js';
import { providerError } from './errors.js';
import { redactMeta } from './redact.js';
import {
  auditProvider,
  createProvider,
  deactivateProvider,
  getProvider,
  listProviders,
  updateProvider,
} from './repository.js';
import { hasAdapterConfig } from './schema.js';
import type { ProviderDbRow } from './repository.js';
import type { AdapterRegistry } from './types.js';

export type PublicProvider = {
  id: string;
  name: string;
  slug: string;
  adapterKey: string;
  baseUrl: string | null;
  hasCredential: boolean;
  adapterConfig: Record<string, unknown>;
  isActive: boolean;
  priority: number;
  balanceMinor: number | null;
  balanceCurrency: string;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  notes: string | null;
  serviceCount: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * The provider shape a client sees. `adapter_config` is passed through `redactMeta`, so a
 * misconfigured `extraParams.token` is masked instead of shipped to a browser.
 */
export function publicProvider(row: ProviderDbRow, options: { serviceCount?: number } = {}): PublicProvider {
  const config = row.adapter_config && typeof row.adapter_config === 'object' ? row.adapter_config : {};

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    adapterKey: row.adapter_key,
    baseUrl: row.base_url,
    hasCredential: hasStoredCredential(row),
    adapterConfig: redactMeta(config) as Record<string, unknown>,
    isActive: row.is_active,
    priority: row.priority,
    balanceMinor: row.balance_minor === null || row.balance_minor === undefined ? null : Number(row.balance_minor),
    balanceCurrency: row.balance_currency,
    lastSyncAt: row.last_sync_at,
    lastSyncStatus: row.last_sync_status,
    notes: row.notes,
    serviceCount: options.serviceCount ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** The fields an admin may set. Already validated by the route schema. */
export type ProviderInput = {
  name?: string;
  slug?: string;
  adapterKey?: string;
  baseUrl?: string | null;
  credential?: string | null;
  adapterConfig?: Record<string, unknown>;
  priority?: number;
  currency?: string;
  notes?: string | null;
  isActive?: boolean;
};

function registryOf(deps: { registry?: AdapterRegistry }): AdapterRegistry {
  return deps.registry ?? createAdapterRegistry();
}

function assertKnownAdapter(adapterKey: string, deps: { registry?: AdapterRegistry }): void {
  const registry = registryOf(deps);
  if (!registry.has(adapterKey)) {
    throw providerError(
      'PROVIDER_ADAPTER_UNKNOWN',
      'This supplier type is not available, so nothing was changed. Choose one of the supported supplier types.',
      422,
      { adapterKey, known: registry.keys() },
    );
  }
}

/** `adapter_config` is a documented pending migration; storing it must fail loudly, not silently. */
async function assertConfigStorable(config: Record<string, unknown> | undefined): Promise<void> {
  if (config === undefined) return;
  if (await hasAdapterConfig()) return;
  throw providerError(
    'PROVIDER_CONFIG_UNAVAILABLE',
    'Supplier settings cannot be saved on this version yet, so nothing was changed. Please contact support.',
    503,
  );
}

/** Fields recorded in the audit row — for a credential, only that it changed. */
function auditShape(row: ProviderDbRow | null): Record<string, unknown> | null {
  if (!row) return null;
  return {
    name: row.name,
    slug: row.slug,
    adapterKey: row.adapter_key,
    baseUrl: row.base_url,
    isActive: row.is_active,
    priority: row.priority,
    currency: row.balance_currency,
    credentialStored: hasStoredCredential(row),
  };
}

export async function listProvidersForAdmin(
  options: { includeInactive?: boolean } = {},
): Promise<PublicProvider[]> {
  const rows = await listProviders(options);
  return rows.map((row) => publicProvider(row, { serviceCount: row.services_total ?? 0 }));
}

export async function findProviderForAdmin(id: string): Promise<PublicProvider | null> {
  const row = await getProvider(id);
  return row ? publicProvider(row) : null;
}

export async function createProviderForAdmin(
  input: ProviderInput,
  deps: { registry?: AdapterRegistry; actorUserId?: string | null } = {},
): Promise<PublicProvider> {
  const adapterKey = String(input.adapterKey ?? '');
  assertKnownAdapter(adapterKey, deps);
  await assertConfigStorable(input.adapterConfig);

  const row = await createProvider({
    name: String(input.name ?? '').trim(),
    slug: String(input.slug ?? '').trim(),
    adapterKey,
    baseUrl: input.baseUrl ? String(input.baseUrl).trim().replace(/\/+$/, '') : null,
    credentialsEncrypted: input.credential ? encodeCredential(input.credential) : null,
    adapterConfig: input.adapterConfig ?? null,
    priority: input.priority ?? 100,
    currency: input.currency ?? 'USD',
    notes: input.notes ?? null,
    isActive: input.isActive ?? true,
  });

  await auditProvider('PROVIDER_CREATE', row.id, deps.actorUserId ?? null, null, auditShape(row));
  return publicProvider(row);
}

export async function updateProviderForAdmin(
  id: string,
  input: ProviderInput,
  deps: { registry?: AdapterRegistry; actorUserId?: string | null } = {},
): Promise<PublicProvider> {
  const before = await getProvider(id);
  if (!before || before.deleted_at) {
    throw providerError('PROVIDER_NOT_FOUND', 'This supplier does not exist, so nothing was changed.', 404);
  }

  if (input.adapterKey !== undefined) assertKnownAdapter(input.adapterKey, deps);
  await assertConfigStorable(input.adapterConfig);

  const row = await updateProvider(id, {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.slug !== undefined ? { slug: input.slug } : {}),
    ...(input.adapterKey !== undefined ? { adapterKey: input.adapterKey } : {}),
    ...(input.baseUrl !== undefined
      ? { baseUrl: input.baseUrl ? String(input.baseUrl).trim().replace(/\/+$/, '') : null }
      : {}),
    ...(input.credential !== undefined && input.credential !== null
      ? { credentialsEncrypted: encodeCredential(input.credential) }
      : {}),
    ...(input.adapterConfig !== undefined ? { adapterConfig: input.adapterConfig } : {}),
    ...(input.priority !== undefined ? { priority: input.priority } : {}),
    ...(input.currency !== undefined ? { currency: input.currency } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
  });

  if (!row) {
    throw providerError('PROVIDER_NOT_FOUND', 'This supplier does not exist, so nothing was changed.', 404);
  }

  await auditProvider('PROVIDER_UPDATE', id, deps.actorUserId ?? null, auditShape(before), auditShape(row));
  return publicProvider(row);
}

/** Deactivates a supplier: `is_active = false`. The row, its catalogue and its history stay. */
export async function deactivateProviderForAdmin(
  id: string,
  deps: { actorUserId?: string | null } = {},
): Promise<PublicProvider> {
  const row = await deactivateProvider(id);
  if (!row) {
    throw providerError('PROVIDER_NOT_FOUND', 'This supplier does not exist, so nothing was changed.', 404);
  }
  await auditProvider('PROVIDER_DEACTIVATE', id, deps.actorUserId ?? null, null, auditShape(row));
  return publicProvider(row);
}

/**
 * Reports whether the provider's stored credential can still be decrypted — the one check that
 * cannot be answered by reading the row, and the one an admin needs after a key rotation.
 */
export async function providerCredentialState(id: string): Promise<{ stored: boolean; readable: boolean }> {
  const row = await getProvider(id);
  if (!row) throw providerError('PROVIDER_NOT_FOUND', 'This supplier does not exist.', 404);
  if (!hasStoredCredential(row)) return { stored: false, readable: false };

  try {
    decodeCredential(row);
    return { stored: true, readable: true };
  } catch {
    return { stored: true, readable: false };
  }
}
