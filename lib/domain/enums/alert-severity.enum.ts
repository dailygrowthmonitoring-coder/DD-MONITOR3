/**
 * AlertSeverity — severity level of a Data Domain alert.
 *
 * Values match EXACTLY the strings that appear in the autosupport file's
 * "Current Alerts" and "Alerts History" sections, so no mapping is needed
 * during parsing. They are also used by the internal alert rule engine.
 *
 * Real autosupport example:
 *   Severity  Class    Object                   Message
 *   CRITICAL  Network  Interface Index=20       EVT-NETM-00001 ...
 *   WARNING   Hardware ...                      ...
 */
export enum AlertSeverity {
  /** Requires immediate operator attention. Maps to DeviceStatus.Critical. */
  Critical = 'CRITICAL',
  /** Degraded condition; monitor and plan remediation. Maps to DeviceStatus.Warning. */
  Warning  = 'WARNING',
  /** Informational only; no immediate action required. */
  Info     = 'INFO',
}

/**
 * All AlertSeverity values, ordered worst-first.
 * Critical > Warning > Info
 */
export const ALERT_SEVERITY_VALUES: readonly AlertSeverity[] = [
  AlertSeverity.Critical,
  AlertSeverity.Warning,
  AlertSeverity.Info,
];

/** Numeric weight per severity level. Used for sorting and comparison. */
const SEVERITY_WEIGHT: Record<AlertSeverity, number> = {
  [AlertSeverity.Critical]: 3,
  [AlertSeverity.Warning]:  2,
  [AlertSeverity.Info]:     1,
};

/**
 * Type guard: narrows an unknown value to AlertSeverity.
 *
 * @param value - The unknown value to test.
 * @returns True if value is one of the valid AlertSeverity strings.
 */
export function isAlertSeverity(value: unknown): value is AlertSeverity {
  return (
    typeof value === 'string' &&
    (Object.values(AlertSeverity) as string[]).includes(value)
  );
}

/**
 * Returns the numeric weight of an AlertSeverity for sorting or comparison.
 * Critical = 3, Warning = 2, Info = 1.
 *
 * @param severity - The AlertSeverity to weight.
 * @returns A number representing relative severity (higher = more severe).
 */
export function alertSeverityWeight(severity: AlertSeverity): number {
  return SEVERITY_WEIGHT[severity];
}

/**
 * Returns the most severe AlertSeverity in the array, or null if the array
 * is empty.
 *
 * @param severities - An array of alert severities to evaluate.
 * @returns The highest-severity value present, or null.
 */
export function worstSeverity(severities: readonly AlertSeverity[]): AlertSeverity | null {
  if (severities.length === 0) return null;
  let worst: AlertSeverity = AlertSeverity.Info;
  for (const severity of severities) {
    if (SEVERITY_WEIGHT[severity] > SEVERITY_WEIGHT[worst]) {
      worst = severity;
    }
  }
  return worst;
}
