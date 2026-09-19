import { z } from 'zod';

/**
 * Environment contract for the API.
 *
 * Only the variables the server actually uses are required here. Everything that later phases
 * (database, Firebase, payments, providers) will need is declared as optional so that the
 * process boots in development without them, while still being documented in one place.
 *
 * Secrets never get a default value — a missing secret must fail loudly in production, and it
 * never appears in logs (see src/lib/logger.ts).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  PUBLIC_APP_URL: z.string().min(1).default('http://localhost:3000'),

  // Phase 2 — Supabase PostgreSQL
  DATABASE_URL: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Phase 3 — Firebase Admin SDK
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  // Phase 7 — provider credential encryption
  PROVIDER_ENCRYPTION_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export class EnvValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid environment configuration:\n- ${issues.join('\n- ')}`);
    this.name = 'EnvValidationError';
    this.issues = issues;
  }
}

/** Parses and validates the environment. Throws with a readable list of problems. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => {
      const path = issue.path.join('.') || '(root)';
      return `${path}: ${issue.message}`;
    });
    throw new EnvValidationError(issues);
  }
  return parsed.data;
}

export const env: Env = loadEnv();

export const isProduction = (): boolean => env.NODE_ENV === 'production';
