/**
 * DeviceStatus — health state of a Data Domain appliance.
 *
 * Derived by the AlertEngine after evaluating all alert rules against a freshly
 * ingested report. Stored on dd_devices.last_status and dd_reports.device_status.
 * Drives every tile colour, badge, and chart indicator in the dashboard.
 *
 * Severity ordering (worst → best): Critical > Warning > Unknown > Healthy
 */
export enum DeviceStatus {
  /** All metrics within thresholds. No active CRITICAL or WARNING alerts. */
  Healthy = 'healthy',
  /** One or more WARNING-level alert rules triggered (e.g. storage > 90%). */
  Warning = 'warning',
  /**
   * One or more CRITICAL-level alert rules triggered (e.g. storage > 95%,
   * failed disks, link down). Requires immediate operator attention.
   */
  Critical = 'critical',
  /**
   * No report received yet, or the last ingest failed completely.
   * Displayed as a grey tile in the dashboard.
   */
  Unknown = 'unknown',
}

/**
 * All DeviceStatus values, ordered worst-first, for iteration and sorting.
 * Critical > Warning > Unknown > Healthy
 */
export const DEVICE_STATUS_VALUES: readonly DeviceStatus[] = [
  DeviceStatus.Critical,
  DeviceStatus.Warning,
  DeviceStatus.Unknown,
  DeviceStatus.Healthy,
];

/** Numeric severity weight for each status (higher = more severe). */
const STATUS_WEIGHT: Record<DeviceStatus, number> = {
  [DeviceStatus.Critical]: 4,
  [DeviceStatus.Warning]:  3,
  [DeviceStatus.Unknown]:  2,
  [DeviceStatus.Healthy]:  1,
};

/**
 * Type guard: narrows an unknown value to DeviceStatus.
 *
 * @param value - The unknown value to test.
 * @returns True if value is a valid DeviceStatus string.
 */
export function isDeviceStatus(value: unknown): value is DeviceStatus {
  return (
    typeof value === 'string' &&
    (Object.values(DeviceStatus) as string[]).includes(value)
  );
}

/**
 * Returns the most severe status in the array.
 * Critical > Warning > Unknown > Healthy.
 * Returns Healthy if the array is empty (no statuses = all healthy).
 *
 * @param statuses - An array of DeviceStatus values to evaluate.
 * @returns The worst (highest severity) status present.
 */
export function worstStatus(statuses: readonly DeviceStatus[]): DeviceStatus {
  if (statuses.length === 0) return DeviceStatus.Healthy;
  let worst = DeviceStatus.Healthy;
  for (const status of statuses) {
    if (STATUS_WEIGHT[status] > STATUS_WEIGHT[worst]) {
      worst = status;
    }
  }
  return worst;
}

/**
 * Maps a DeviceStatus to the dashboard tile border / indicator colour.
 *
 * @param status - The device status to convert.
 * @returns A colour token used by the frontend design system.
 */
export function deviceStatusToHttpIndicator(
  status: DeviceStatus,
): 'red' | 'amber' | 'grey' | 'green' {
  switch (status) {
    case DeviceStatus.Critical: return 'red';
    case DeviceStatus.Warning:  return 'amber';
    case DeviceStatus.Unknown:  return 'grey';
    case DeviceStatus.Healthy:  return 'green';
  }
}
