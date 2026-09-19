/**
 * Minimal structured logger — no dependency, one JSON line per event.
 *
 * Secret safety is enforced here, not by convention: any metadata key that looks like a
 * credential, plus any value that carries one, is replaced before the line is written. That
 * covers API keys, tokens, signatures, authorization headers and connection strings.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SECRET_KEY_PATTERN = /(api[_-]?key|secret|token|password|passwd|authorization|signature|private[_-]?key|service[_-]?role|connection[_-]?string|database[_-]?url)/i;
const SECRET_VALUE_PATTERN = /\b(?:bearer\s+[a-z0-9._-]{8,}|eyJ[a-z0-9._-]{20,}|sk_[a-z0-9]{8,}|postgres(?:ql)?:\/\/[^\s"']+)/gi;
const REDACTED = '[redacted]';

function redactValue(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return value.replace(SECRET_VALUE_PATTERN, REDACTED);
  if (value === null || typeof value !== 'object') return value;
  if (depth > 4) return '[deep]';
  if (Array.isArray(value)) return value.map((item) => redactValue(item, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SECRET_KEY_PATTERN.test(key) ? REDACTED : redactValue(item, depth + 1);
  }
  return out;
}

function write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    message,
    ...(meta ? { meta: redactValue(meta) } : {}),
  });
  if (level === 'error' || level === 'warn') process.stderr.write(`${line}\n`);
  else process.stdout.write(`${line}\n`);
}

export const log = (level: LogLevel, message: string, meta?: Record<string, unknown>): void =>
  write(level, message, meta);

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => write('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => write('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write('error', message, meta),
};
