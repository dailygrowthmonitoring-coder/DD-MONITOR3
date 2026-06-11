/**
 * EventType — category of an event recorded in the system_logs table.
 *
 * Drives the filter chip options on the Logs page of the dashboard and is
 * included in every structured log entry for server-side correlation.
 */
export enum EventType {
  /** A new autosupport file was received and processed through the ingest pipeline. */
  Ingestion       = 'ingestion',
  /** Parser ran on a raw autosupport file (a section-level parse attempt). */
  Parse           = 'parse',
  /** Alert rules were evaluated against a freshly ingested report. */
  AlertEvaluation = 'alert_evaluation',
  /** An alert email was dispatched (or an attempt was made). */
  AlertSent       = 'alert_sent',
  /** Scheduled data-retention cleanup ran and removed old reports. */
  Cleanup         = 'cleanup',
  /** A user authenticated or an API key was validated. */
  Auth            = 'auth',
  /** A report export (PDF or HTML) was generated and served. */
  Export          = 'export',
}

/** All EventType values, for use in filters and iteration. */
export const EVENT_TYPE_VALUES: readonly EventType[] = [
  EventType.Ingestion,
  EventType.Parse,
  EventType.AlertEvaluation,
  EventType.AlertSent,
  EventType.Cleanup,
  EventType.Auth,
  EventType.Export,
];

/**
 * Type guard: narrows an unknown value to EventType.
 *
 * @param value - The unknown value to test.
 * @returns True if value is a valid EventType string.
 */
export function isEventType(value: unknown): value is EventType {
  return (
    typeof value === 'string' &&
    (Object.values(EventType) as string[]).includes(value)
  );
}
