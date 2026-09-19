/**
 * Phase 7 — provider adapters, encrypted credentials and catalogue sync.
 *
 * Public surface of the module. The parent session wires it in with two lines:
 *
 *     // apps/api/src/routes/index.ts
 *     import { createProvidersModule } from '../modules/providers/index.js';
 *     app.use('/api/admin/providers', createProvidersModule({ auth: deps.auth }).router);
 *
 * and adds the module to the esbuild entry list in apps/api/package.json (see the phase report),
 * so that `dist/modules/providers/index.js` exists for the tests and for the bundle.
 */
export {
  PROVIDER_CAPABILITIES,
  type AdapterRegistry,
  type AdapterService,
  type BalanceResult,
  type CancelOrderResult,
  type CreateOrderInput,
  type CreateOrderResult,
  type FetchLike,
  type LoggerLike,
  type OrderStatusResult,
  type ProviderAdapter,
  type ProviderAdapterFactory,
  type ProviderCapability,
  type ProviderConnection,
  type ProviderOrderStatus,
  type ProvidersDeps,
} from './types.js';

export { PROVIDER_ERROR_CODES, providerError, providerMessage, looksLikeAuthFailure } from './errors.js';
export type { ProviderErrorCode } from './errors.js';

export { DEFAULT_LIMIT, REDACTED, redactMeta, redactText, redactUpstream, truncate } from './redact.js';
export type { RedactOptions } from './redact.js';

export {
  CREDENTIAL_FORMAT_VERSION,
  CREDENTIAL_KEY_ENV,
  decryptCredential,
  encryptCredential,
  encryptionKeyConfigured,
  isEncryptedCredential,
  readEncryptionKey,
} from './crypto.js';

export { decodeCredential, encodeCredential, hasStoredCredential } from './credentials.js';

export {
  ADAPTER_CONFIG_COLUMN,
  PROVIDER_SERVICE_ACTIVE_COLUMN,
  hasAdapterConfig,
  hasColumn,
  hasProviderServiceActiveFlag,
  resetSchemaCache,
  tableColumns,
} from './schema.js';

export {
  deactivateMissingProviderServices,
  getProvider,
  listProviderServices,
  listProviders,
  getProvider as getProviderRow,
  upsertProviderServices,
} from './repository.js';
export type { ProviderDbRow, ProviderServiceDbRow } from './repository.js';

export {
  PANEL_ADAPTER_KEY,
  PANEL_CONFIG_KEYS,
  PANEL_DEFAULT_ACTIONS,
  PANEL_DEFAULT_MAPPING,
  PANEL_DEFAULT_PARAMS,
  amountToMinor,
  createPanelAdapter,
  extractServiceItems,
  mapOrderStatus,
  panelAdapterFactory,
  readPath,
} from './adapters/panel.js';
export type { PanelAdapterConfig, PanelMapping } from './adapters/panel.js';

export {
  PANEL_ADAPTER_KEY as PANEL_ADAPTER,
  adapterForProvider,
  connectionFor,
  createAdapterRegistry,
  isKnownAdapterKey,
} from './adapters/registry.js';

export { syncProviderServices } from './sync.js';
export type { SyncDeps, SyncProviderServicesResult } from './sync.js';

export {
  createProviderForAdmin,
  deactivateProviderForAdmin,
  findProviderForAdmin,
  listProvidersForAdmin,
  providerCredentialState,
  publicProvider,
  updateProviderForAdmin,
} from './service.js';
export type { ProviderInput, PublicProvider } from './service.js';

export { PROVIDER_PERMISSIONS, createProvidersModule } from './routes.js';

/** Re-exported so a caller can render the same envelope from a test or a script. */
export { AppError, errorHandler, notFoundHandler } from '../../middleware/error-handler.js';
