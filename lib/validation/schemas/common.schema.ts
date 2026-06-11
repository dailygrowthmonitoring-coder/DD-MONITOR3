/**
 * Common Zod building blocks reused across all API schemas.
 *
 * Nothing here imports from services or repositories — this file is pure Zod.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Scalar primitives
// ---------------------------------------------------------------------------

/** UUID v4 string, as required by all Supabase primary-key parameters. */
export const uuidSchema = z
  .string({ required_error: 'UUID is required.' })
  .uuid({ message: 'Must be a valid UUID (v4).' });

/**
 * ISO 8601 calendar date: YYYY-MM-DD.
 * Does not perform calendar-arithmetic validation (e.g. Feb 31) — the DB
 * enforces that. Validates format only.
 */
export const isoDateSchema = z
  .string({ required_error: 'Date is required.' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Must be a date in YYYY-MM-DD format.' });

/** Alert severity as stored in dd_alerts.severity. */
export const alertSeverityDbSchema = z.enum(['CRITICAL', 'WARNING', 'INFO'], {
  errorMap: () => ({ message: 'Must be one of: CRITICAL, WARNING, INFO.' }),
});

/** Log severity as stored in system_logs.severity. */
export const logSeverityDbSchema = z.enum(['INFO', 'WARNING', 'ERROR'], {
  errorMap: () => ({ message: 'Must be one of: INFO, WARNING, ERROR.' }),
});

/** Log event_type as stored in system_logs.event_type. */
export const logEventTypeDbSchema = z.enum(
  ['ingestion', 'parse', 'alert_evaluation', 'alert_sent', 'cleanup', 'auth', 'export'],
  { errorMap: () => ({ message: 'Invalid log event_type.' }) },
);

// ---------------------------------------------------------------------------
// Query-param helpers
// ---------------------------------------------------------------------------

/**
 * Parses a boolean query param that arrives as the string "true" or "false".
 * Rejects any other string. `undefined` input maps to `defaultValue`.
 *
 * @param defaultValue - What to return when the param is absent.
 */
export function booleanParam(defaultValue: boolean) {
  return z
    .string()
    .optional()
    .refine((v) => v === undefined || v === 'true' || v === 'false', {
      message: 'Must be the string "true" or "false".',
    })
    .transform((v) => (v === undefined ? defaultValue : v === 'true'));
}

/**
 * Parses a numeric query param that arrives as a string.
 * Coerces to integer and applies min/max bounds.
 */
export function intParam(opts: { min: number; max: number; default: number }) {
  return z
    .string()
    .optional()
    .transform((v) => (v === undefined ? String(opts.default) : v))
    .pipe(
      z.coerce
        .number({ invalid_type_error: 'Must be an integer.' })
        .int({ message: 'Must be an integer.' })
        .min(opts.min, { message: `Must be at least ${opts.min}.` })
        .max(opts.max, { message: `Must be at most ${opts.max}.` }),
    );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/** Standard list-endpoint pagination: limit (1–500, default 50), offset (≥0, default 0). */
export const paginationSchema = z.object({
  limit:  intParam({ min: 1, max: 500, default: 50 }),
  offset: intParam({ min: 0, max: Number.MAX_SAFE_INTEGER, default: 0 }),
});

export type Pagination = z.infer<typeof paginationSchema>;

// ---------------------------------------------------------------------------
// Date range (shared by multiple list endpoints)
// ---------------------------------------------------------------------------

/**
 * Plain (un-refined) date range fields.
 * Use this with `.merge()` to compose into other schemas.
 *
 * NOTE: The from ≤ to invariant is NOT enforced here because Zod's `.merge()`
 * only accepts `ZodObject`, not `ZodEffects` (which `.refine()` produces).
 * Each consuming schema should add its own `.refine()` or rely on the
 * `isValidDateRange` helper below.
 */
export const dateRangeFields = z.object({
  from: isoDateSchema.optional(),
  to:   isoDateSchema.optional(),
});

/**
 * Standalone date-range schema WITH the from ≤ to refinement.
 * Use this when you need to validate a date range in isolation.
 */
export const dateRangeSchema = dateRangeFields.refine(
  ({ from, to }) => {
    if (from === undefined || to === undefined) return true;
    return from <= to;
  },
  { message: '`from` must not be after `to`.', path: ['from'] },
);

/** Helper: returns true if `from ≤ to` (both optional; null-safe). */
export function isValidDateRange(from: string | undefined, to: string | undefined): boolean {
  if (from === undefined || to === undefined) return true;
  return from <= to;
}

export type DateRange = z.infer<typeof dateRangeFields>;
