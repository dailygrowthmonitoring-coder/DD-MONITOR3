/**
 * Business-rule date validators used by API route handlers and services.
 *
 * These go beyond schema shape (Zod handles format); they enforce domain
 * invariants like "report_date must not be in the future".
 *
 * All functions accept already-validated ISO date strings (YYYY-MM-DD).
 */

/**
 * Returns true if the given ISO date is today or in the past.
 *
 * Report dates in the future would indicate a clock-skew problem on the
 * sending appliance or a mis-formed request. The ingest pipeline rejects them.
 *
 * @param dateStr - ISO 8601 date string, e.g. "2025-03-10".
 */
export function isNotFutureDate(dateStr: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return dateStr <= today;
}

/**
 * Returns true if the given ISO date is within the last `maxAgeDays` days
 * (inclusive), counting from today.
 *
 * Used to reject stale ingest payloads that are so old they indicate
 * a replay or a configuration error.
 *
 * @param dateStr  - ISO 8601 date string.
 * @param maxAgeDays - Maximum allowed age in days (default: 90).
 */
export function isWithinRetentionWindow(dateStr: string, maxAgeDays = 90): boolean {
  const reportMs = new Date(dateStr).getTime();
  const cutoffMs  = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  return reportMs >= cutoffMs;
}

/**
 * Returns the current date in YYYY-MM-DD format, using the server's local clock.
 * Used by services that need a "today" value without external dependencies.
 */
export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
