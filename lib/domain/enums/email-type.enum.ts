/**
 * EmailType — category of an outbound email notification.
 *
 * Stored on email_notifications.type and used by NotificationService for
 * de-duplication logic (e.g. only send one MissingReport per device per day).
 */
export enum EmailType {
  /** Confirmation that an autosupport report was received and parsed successfully. */
  ReportReceived = 'report_received',
  /**
   * Alert fired when a device has not sent its daily autosupport report
   * by the configured REPORT_DEADLINE_HOUR.
   */
  MissingReport  = 'missing_report',
  /** Alert fired when the parser encounters a fatal error on a received file. */
  ParseError     = 'parse_error',
  /** Alert fired when the Gmail inbox storage cleanup threshold is approached. */
  StorageCleanup = 'storage_cleanup',
  /** Weekly summary email sent every Monday to sysadmins and the CTO. */
  WeeklyReport   = 'weekly_report',
}

/** All EmailType values, for iteration and filter UIs. */
export const EMAIL_TYPE_VALUES: readonly EmailType[] = [
  EmailType.ReportReceived,
  EmailType.MissingReport,
  EmailType.ParseError,
  EmailType.StorageCleanup,
  EmailType.WeeklyReport,
];

/**
 * Type guard: narrows an unknown value to EmailType.
 *
 * @param value - The unknown value to test.
 * @returns True if value is a valid EmailType string.
 */
export function isEmailType(value: unknown): value is EmailType {
  return (
    typeof value === 'string' &&
    (Object.values(EmailType) as string[]).includes(value)
  );
}
