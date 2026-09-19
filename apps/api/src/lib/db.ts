import dns from 'node:dns';
// Render resolves the Supabase pooler over IPv6 first on some images; the IPv4 address answers
// faster and avoids a stalled first connection.
dns.setDefaultResultOrder('ipv4first');

import { Pool } from 'pg';
import type { PoolClient, QueryResultRow } from 'pg';
import { env } from '../config/env.js';
import { logger } from './logger.js';

/** Thrown when the API is asked to touch the database before DATABASE_URL is configured. */
export class DatabaseNotConfiguredError extends Error {
  /** Stable marker so the error maps to a 503 even across separate bundle instances. */
  readonly code = 'DB_NOT_CONFIGURED';

  constructor() {
    super('DATABASE_URL is not configured');
    this.name = 'DatabaseNotConfiguredError';
  }
}

let pool: Pool | null = null;

export const isDbConfigured = (): boolean => Boolean(env.DATABASE_URL && env.DATABASE_URL.trim());

/**
 * Lazily created, shared connection pool.
 *
 * Supabase is reached through the transaction pooler (port 6543), so the pool stays small and
 * hands connections back quickly; SSL is required and the pooler's certificate chain is not
 * always verifiable from a container, hence rejectUnauthorized: false (traffic is still TLS).
 */
export function getPool(): Pool {
  if (!isDbConfigured()) throw new DatabaseNotConfiguredError();
  if (!pool) {
    const url = String(env.DATABASE_URL);
    // Supabase always requires TLS; a local test cluster (localhost / unix socket) does not.
    // `sslmode=disable` in the URL is honoured as the explicit opt-out.
    const local = /localhost|127\.0\.0\.1|::1|@\/|host=\//.test(url);
    const useSsl = !/sslmode=disable/i.test(url) && !local;

    pool = new Pool({
      connectionString: url,
      max: 8,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    });
    pool.on('error', (err: Error) => logger.error('database pool error', { error: err.message }));
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(sql, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/** Runs `fn` inside a transaction, rolling back on any error. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      /* the connection is already unusable — the pool will discard it */
    }
    throw error;
  } finally {
    client.release();
  }
}

/** Startup probe: never fatal, but the deploy log should say whether the database answers. */
export async function pingDatabase(): Promise<{ ok: boolean; error?: string }> {
  if (!isDbConfigured()) return { ok: false, error: 'DATABASE_URL is not set' };
  try {
    await query('select 1');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
