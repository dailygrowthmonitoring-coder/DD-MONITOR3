/**
 * Application configuration — single source of truth for all env vars.
 *
 * Validated at module load time via Zod. A missing or invalid variable causes
 * a ConfigError and process.exit(1) — never discovered mid-request in production.
 *
 * Rules:
 * - Import `config` only in server-side code (API routes, services, repositories).
 *   Never import it into client components — it holds server secrets.
 * - Do NOT read process.env elsewhere in the codebase. Always use `config`.
 * - The returned object is deeply frozen; mutation throws at runtime.
 *
 * Dependency: zod (external), ConfigError from errors/app-error. No other deps.
 */

import { z, ZodError } from 'zod';
import { ConfigError } from '../errors/app-error';

// ---------------------------------------------------------------------------
// Guard: server-side only
// ---------------------------------------------------------------------------

// Prevent this module from being bundled into the client. If it is accidentally
// imported in a client component, the check below will throw before any secrets
// are accessed.
if (typeof window !== 'undefined') {
  throw new Error(
    '[DD Monitor] config.ts was imported in a browser context. ' +
    'This file is server-side only. Check your import tree.',
  );
}

// ---------------------------------------------------------------------------
// Environment schema
// ---------------------------------------------------------------------------

/**
 * Zod schema for all required environment variables.
 * Numeric vars use z.coerce.number() so string values from process.env are
 * automatically converted. Defaults apply when a variable is absent.
 */
const envSchema = z.object({
  /** Supabase project URL — safe to expose to the client bundle. */
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL (e.g. https://xxx.supabase.co)',
  }),

  /** Supabase anon (public) key — safe to expose to the client bundle. */
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, {
    message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY must be at least 20 characters',
  }),

  /** Supabase service-role key — server-only, never sent to the client. */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, {
    message: 'SUPABASE_SERVICE_ROLE_KEY must be at least 20 characters',
  }),

  /**
   * Secret used to authenticate POST /api/ingest requests from Google Apps Script.
   * Minimum 32 chars to ensure sufficient entropy.
   */
  INGEST_SECRET: z.string().min(32, {
    message: 'INGEST_SECRET must be at least 32 characters',
  }),

  /** Runtime environment. Controls log level, pretty-print, and cache behaviour. */
  NODE_ENV: z.enum(['development', 'test', 'production']),

  /**
   * Email address that receives alert notifications.
   * Must be a valid email format.
   */
  ALERT_EMAIL: z.string().email({
    message: 'ALERT_EMAIL must be a valid email address',
  }),

  /**
   * Hour of day (0–23) by which daily autosupport reports are expected.
   * Reports not received by this hour trigger a missing-report alert.
   * Default: 10 (10:00 local time).
   */
  REPORT_DEADLINE_HOUR: z.coerce
    .number()
    .int()
    .min(0, { message: 'REPORT_DEADLINE_HOUR must be 0–23' })
    .max(23, { message: 'REPORT_DEADLINE_HOUR must be 0–23' })
    .default(10),

  /**
   * Maximum allowed autosupport file size in megabytes.
   * Files exceeding this are rejected before parsing.
   * Default: 10 MB. Range: 1–50 MB.
   */
  MAX_FILE_SIZE_MB: z.coerce
    .number()
    .min(1, { message: 'MAX_FILE_SIZE_MB must be 1–50' })
    .max(50, { message: 'MAX_FILE_SIZE_MB must be 1–50' })
    .default(10),

  /**
   * Maximum ingest requests allowed per hour per IP address.
   * Default: 20. Range: 1–100.
   */
  RATE_LIMIT_REQUESTS_PER_HOUR: z.coerce
    .number()
    .int()
    .min(1, { message: 'RATE_LIMIT_REQUESTS_PER_HOUR must be 1–100' })
    .max(100, { message: 'RATE_LIMIT_REQUESTS_PER_HOUR must be 1–100' })
    .default(20),

  /**
   * TTL in seconds for the in-memory analytics cache.
   * Default: 300 s (5 minutes). Minimum: 30 s.
   */
  CACHE_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(30, { message: 'CACHE_TTL_SECONDS must be at least 30' })
    .default(300),

  /**
   * How many days of reports to retain before the cleanup function purges them.
   * Default: 40 days. Range: 7–365 days.
   */
  DATA_RETENTION_DAYS: z.coerce
    .number()
    .int()
    .min(7,   { message: 'DATA_RETENTION_DAYS must be 7–365' })
    .max(365, { message: 'DATA_RETENTION_DAYS must be 7–365' })
    .default(40),

  /**
   * Brevo (formerly Sendinblue) transactional email API key.
   * Used by NotificationService to dispatch alert and report emails.
   * When empty, emails are silently skipped and recorded as failed.
   */
  BREVO_API_KEY: z.string().default(''),

  /**
   * Verified sender email address registered in the Brevo account.
   * Must match a verified sender or domain in the Brevo dashboard.
   * When empty, emails are silently skipped.
   */
  BREVO_SENDER_EMAIL: z.string().default(''),

  /**
   * Display name shown in the From field of outbound alert emails.
   * Default: "DD Monitor".
   */
  BREVO_SENDER_NAME: z.string().default('DD Monitor'),
});

// ---------------------------------------------------------------------------
// Config type
// ---------------------------------------------------------------------------

/**
 * The fully validated, typed application configuration.
 * Derived from the Zod schema — never duplicate field types manually.
 */
export type AppConfig = z.infer<typeof envSchema>;

// ---------------------------------------------------------------------------
// Validation and export
// ---------------------------------------------------------------------------

/**
 * Parses and validates all environment variables at module load time.
 * Exits the process immediately if any variable is missing or invalid.
 */
function loadConfig(): Readonly<AppConfig> {
  let parsed: AppConfig;

  try {
    parsed = envSchema.parse(process.env);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const failingVars = error.issues.map((issue) => {
        const path = issue.path.map(String).join('.');
        return `${path} (${issue.message})`;
      });

      const configError = new ConfigError(failingVars);

      // Log only var names and messages — never log the values of secret vars.
      console.error('[DD Monitor] FATAL: Configuration validation failed.');
      console.error('[DD Monitor] Missing or invalid variables:');
      failingVars.forEach((v) => console.error(`  - ${v}`));
      console.error('[DD Monitor] Fix the above variables and restart the server.');

      // Exit immediately in server context so the process does not start in a
      // misconfigured state. This is intentional: a misconfigured server should
      // fail loudly at boot, not silently serve broken responses.
      process.exit(1);

      // Unreachable in Node.js — kept for edge-runtime compatibility where
      // process.exit may not exist, and for TypeScript control-flow analysis.
      throw configError;
    }

    // Re-throw unexpected errors (not ZodErrors) so they are visible.
    throw error;
  }

  return Object.freeze(parsed);
}

/**
 * The validated, frozen application configuration.
 *
 * Import this wherever you need an env var — never read process.env directly.
 *
 * @example
 * import { config } from '@/lib/infrastructure/config/config';
 * const maxBytes = config.MAX_FILE_SIZE_MB * 1024 * 1024;
 */
export const config: Readonly<AppConfig> = loadConfig();

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when running in production (Vercel / NODE_ENV=production).
 * Use this to gate production-only behaviours (JSON-only logs, strict limits).
 */
export function isProduction(): boolean {
  return config.NODE_ENV === 'production';
}

/**
 * Returns true when running in development (local dev server / NODE_ENV=development).
 * Use this to gate dev-only features (pretty logs, relaxed timeouts).
 */
export function isDevelopment(): boolean {
  return config.NODE_ENV === 'development';
}

/**
 * Returns true when running in the test environment (NODE_ENV=test).
 * Use this to disable side effects (email, DB writes) during automated tests.
 */
export function isTest(): boolean {
  return config.NODE_ENV === 'test';
}
