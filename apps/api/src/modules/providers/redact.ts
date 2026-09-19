/**
 * Redaction for everything that leaves the process: log lines and error bodies.
 *
 * The logger already masks credential-shaped *keys*, which is not enough here, because supplier
 * traffic is form-urlencoded and its secrets sit in values (`key=abc123`) or are echoed back
 * inside an error message or a raw response body. Two rules follow from that:
 *
 *  1. A known secret (the decrypted credential) is stripped literally from any text it appears in.
 *  2. A credential *shape* (query/body parameter, JSON field, long opaque token) is masked even
 *     when the secret was not passed in — so a helper called without the secret still cannot leak.
 *
 * Nothing in this module throws: redaction failing loudly would itself become an information leak.
 */
export const REDACTED = '[redacted]';

/** Field names that always describe a credential, wherever they appear in an object. */
const SECRET_KEY_PATTERN =
  /(api[_-]?key|apikey|secret|token|password|passwd|authorization|signature|credential|private[_-]?key|ciphertext|encrypted)/i;

/** `key=value` in a form body or query string. */
const PARAM_SECRET_PATTERN =
  /\b(api[_-]?key|apikey|key|token|password|passwd|secret|auth|authorization|signature)(\s*=\s*)([^&\s"'<>]*)/gi;

/** `"key": "value"` in a JSON payload. */
const JSON_SECRET_PATTERN =
  /("(?:api[_-]?key|apikey|key|token|password|secret|auth|authorization|signature|credential)"\s*:\s*)("[^"]*"|[^,}\s]+)/gi;

/** Backstop: an opaque token-shaped run (32+ chars, no URL punctuation) is never safe to log. */
const TOKEN_PATTERN = /\b[A-Za-z0-9+=_-]{32,}\b/g;

/** A UUID is an identifier, not a secret: masking it would make the log useless. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DEFAULT_LIMIT = 400;

export type RedactOptions = {
  /** Exact secret values to strip verbatim (the decrypted credential, an auth header, …). */
  secrets?: readonly (string | null | undefined)[];
  /** Hard cap on the returned text, so a stray HTML page can never flood the log. */
  limit?: number;
};

/** Cuts text to `limit` characters with an explicit marker — no silent truncation. */
export function truncate(text: string, limit: number = DEFAULT_LIMIT): string {
  if (limit <= 0 || text.length <= limit) return text;
  return `${text.slice(0, limit)}…[${text.length - limit} more characters]`;
}

/**
 * Masks secrets and credential shapes in a single string.
 *
 * Order matters: the exact secret is removed first (it may contain `=` or quotes that would
 * confuse the shape patterns), then the shape rules, then the length cap.
 */
export function redactText(input: string, options: RedactOptions = {}): string {
  let text = typeof input === 'string' ? input : String(input ?? '');

  for (const secret of options.secrets ?? []) {
    // Short values are not treated as secrets: replacing "abc" everywhere would mangle real text.
    if (typeof secret !== 'string' || secret.length < 4) continue;
    text = text.split(secret).join(REDACTED);
  }

  text = text
    .replace(PARAM_SECRET_PATTERN, (_match, name: string, equals: string) => `${name}${equals}${REDACTED}`)
    .replace(JSON_SECRET_PATTERN, (_match, prefix: string) => `${prefix}"${REDACTED}"`)
    .replace(TOKEN_PATTERN, (match: string) => (UUID_PATTERN.test(match) ? match : REDACTED));

  return truncate(text, options.limit ?? DEFAULT_LIMIT);
}

/**
 * Renders an upstream response (an object or a raw body string) as one bounded, redacted log value.
 * Everything a supplier returned must pass through here before it reaches a log line or an error.
 */
export function redactUpstream(value: unknown, options: RedactOptions = {}): string {
  const text =
    typeof value === 'string'
      ? value
      : (() => {
          try {
            return JSON.stringify(value ?? null);
          } catch {
            return '[unserialisable value]';
          }
        })();

  return redactText(String(text ?? '').replace(/\s+/g, ' ').trim(), options);
}

function walk(value: unknown, options: RedactOptions, depth: number): unknown {
  if (typeof value === 'string') return redactText(value, options);
  if (value === null || typeof value !== 'object') return value;
  if (depth > 4) return REDACTED;
  if (Array.isArray(value)) return value.map((item) => walk(item, options, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SECRET_KEY_PATTERN.test(key) ? REDACTED : walk(item, options, depth + 1);
  }
  return out;
}

/**
 * Deep-redacts a log payload: secret-named keys are blanked, every string value is masked and
 * capped. Use it for any metadata derived from a provider connection or an upstream response.
 */
export function redactMeta(
  meta: Record<string, unknown>,
  options: RedactOptions = {},
): Record<string, unknown> {
  return walk(meta, options, 0) as Record<string, unknown>;
}
