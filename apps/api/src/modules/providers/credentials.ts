/**
 * Credential handling for one provider row.
 *
 * `providers.credentials_encrypted` is the single column the schema defines for the API key, so
 * the whole AES-256-GCM envelope (version, IV, auth tag, ciphertext) is packed into it — see
 * crypto.ts. Nothing else about a provider is secret, and nothing about the credential is ever
 * returned by an API response: callers only learn whether one is stored.
 */
import { decryptCredential, encryptCredential, isEncryptedCredential } from './crypto.js';
import { providerError } from './errors.js';
import type { ProviderDbRow } from './repository.js';

/** Encrypts a credential for storage. Fails loudly (503) when the server key is missing. */
export function encodeCredential(secret: string): string {
  return encryptCredential(secret);
}

/**
 * Decrypts the credential of a provider row.
 *
 * Answers `null` when the provider has no credential stored (a supplier that needs none, or one
 * that has not been configured yet) — the adapter decides whether that is fatal. A stored value
 * that cannot be decrypted throws CREDENTIAL_UNREADABLE, which is a clear, documented answer with
 * no stack trace and no ciphertext.
 */
export function decodeCredential(row: Pick<ProviderDbRow, 'credentials_encrypted'>): string | null {
  const stored = row.credentials_encrypted;
  if (stored === null || stored === undefined || String(stored).trim() === '') return null;
  if (!isEncryptedCredential(stored)) {
    throw providerError(
      'CREDENTIAL_UNREADABLE',
      'The API key saved for this supplier was not stored in a format this version can read, so we did not contact the supplier. Please save the supplier’s API key again.',
      500,
    );
  }
  return decryptCredential(stored);
}

/** True when a credential is stored — the only thing a response may reveal about it. */
export function hasStoredCredential(row: Pick<ProviderDbRow, 'credentials_encrypted'>): boolean {
  return row.credentials_encrypted !== null && row.credentials_encrypted !== undefined && String(row.credentials_encrypted).trim() !== '';
}
