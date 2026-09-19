/**
 * Supplier credentials at rest: AES-256-GCM with a fresh random IV per record.
 *
 * The stored value is `providers.credentials_encrypted` and has the shape
 *
 *     v1.<iv>.<auth tag>.<ciphertext>          (each part base64url)
 *
 * GCM is authenticated, so a tampered ciphertext or a wrong key fails *decryption* instead of
 * returning garbage — that failure is converted into CREDENTIAL_UNREADABLE: a clear, actionable
 * error with no stack trace, no ciphertext and no key material in the response.
 *
 * The data key never lives in the database: it is read from `PROVIDER_ENCRYPTION_KEY` (32 bytes,
 * base64 by preference; 64 hex characters and a raw 32-character string are accepted). It is
 * deliberately read at call time rather than at import time, so a key rotation or a test key takes
 * effect without a rebuild.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { providerError } from './errors.js';

export const CREDENTIAL_KEY_ENV = 'PROVIDER_ENCRYPTION_KEY';
export const CREDENTIAL_FORMAT_VERSION = 'v1';

const KEY_BYTES = 32;
const IV_BYTES = 12; // 96 bits, the size GCM is specified for
const TAG_BYTES = 16;
const HEX_KEY = /^[0-9a-fA-F]{64}$/;
const BASE64_KEY = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * Reads the 32-byte data key.
 *
 * Throws CREDENTIAL_ENCRYPTION_UNAVAILABLE (503) when it is missing or the wrong size: storing a
 * credential is impossible without it, and answering a silent 500 would hide a deploy mistake.
 */
export function readEncryptionKey(source: NodeJS.ProcessEnv = process.env): Buffer {
  const configured = String(source[CREDENTIAL_KEY_ENV] ?? '').trim();

  if (!configured) {
    throw providerError(
      'CREDENTIAL_ENCRYPTION_UNAVAILABLE',
      'Supplier credentials cannot be saved right now because this server is missing its encryption key. Please contact support.',
      503,
      { missing: CREDENTIAL_KEY_ENV },
    );
  }

  const candidates: Buffer[] = [];
  if (HEX_KEY.test(configured)) candidates.push(Buffer.from(configured, 'hex'));
  if (BASE64_KEY.test(configured)) candidates.push(Buffer.from(configured, 'base64'));
  candidates.push(Buffer.from(configured, 'utf8'));

  const key = candidates.find((candidate) => candidate.length === KEY_BYTES);
  if (!key) {
    throw providerError(
      'CREDENTIAL_ENCRYPTION_UNAVAILABLE',
      'Supplier credentials cannot be saved right now because this server’s encryption key is not a valid 32-byte key. Please contact support.',
      503,
      { configuredLength: configured.length },
    );
  }
  return key;
}

/** True when a usable key is present — lets the admin UI show the state without trying a write. */
export function encryptionKeyConfigured(source: NodeJS.ProcessEnv = process.env): boolean {
  try {
    readEncryptionKey(source);
    return true;
  } catch {
    return false;
  }
}

/** Encrypts a supplier credential for storage. The plaintext is never returned elsewhere. */
export function encryptCredential(plaintext: string, options: { key?: Buffer } = {}): string {
  if (typeof plaintext !== 'string' || plaintext.trim().length === 0) {
    throw providerError('CREDENTIAL_INVALID', 'Enter the supplier’s API key before saving.', 422);
  }

  const key = options.key ?? readEncryptionKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    CREDENTIAL_FORMAT_VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

/** True when a stored value looks like ours — a cheap guard before attempting decryption. */
export function isEncryptedCredential(value: unknown): boolean {
  const parts = String(value ?? '').split('.');
  return parts.length === 4 && parts[0] === CREDENTIAL_FORMAT_VERSION;
}

/**
 * Decrypts a stored credential.
 *
 * A missing key, a missing value, a malformed envelope, a wrong key and a tampered ciphertext all
 * end in the same two documented answers (CREDENTIAL_ENCRYPTION_UNAVAILABLE / CREDENTIAL_UNREADABLE)
 * — never an exception from OpenSSL and never a partially decrypted value.
 */
export function decryptCredential(payload: string, options: { key?: Buffer } = {}): string {
  const key = options.key ?? readEncryptionKey(); // throws its own 503; must stay outside the try

  const unreadable = (): never => {
    throw providerError(
      'CREDENTIAL_UNREADABLE',
      'The API key saved for this supplier can no longer be read, so we did not contact the supplier. Please save the supplier’s API key again.',
      500,
    );
  };

  try {
    const parts = String(payload ?? '').split('.');
    if (parts.length !== 4 || parts[0] !== CREDENTIAL_FORMAT_VERSION) unreadable();

    const [, ivPart = '', tagPart = '', dataPart = ''] = parts;
    const iv = Buffer.from(ivPart, 'base64url');
    const tag = Buffer.from(tagPart, 'base64url');
    const data = Buffer.from(dataPart, 'base64url');
    if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES || data.length === 0) unreadable();

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag); // GCM: final() throws if the tag does not match
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch (error) {
    // our own 500 above must not be re-wrapped, but it already left this function
    if (typeof (error as { code?: unknown })?.code === 'string') throw error;
    return unreadable();
  }
}
