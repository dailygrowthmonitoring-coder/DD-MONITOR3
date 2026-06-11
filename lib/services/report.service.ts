/**
 * ReportService — read-side orchestration for reports.
 *
 * Provides query methods for the History page (list of reports per device),
 * the Device Detail page (single report with full parsed_data), and the
 * Comparison page (reports for two devices on a given date).
 *
 * All methods are thin wrappers over ReportRepository and AlertRepository —
 * no business logic lives here.
 */

import { type Report, type Alert } from '@/lib/domain';
import {
  createServiceClient,
  ReportRepository,
  AlertRepository,
  type AlertFilters,
} from '@/lib/repositories';
import { ok, type AsyncResult } from '@/lib/infrastructure/errors/result';

// ---------------------------------------------------------------------------
// Report queries
// ---------------------------------------------------------------------------

/**
 * Returns the most recent N reports for a device, newest first.
 * Does NOT include parsed_data (list endpoint — hybrid storage rule).
 *
 * @param deviceId - Device UUID.
 * @param limit    - Max reports to return (default 40 = max retention days).
 */
export async function getRecentReports(
  deviceId: string,
  limit = 40,
): AsyncResult<Report[]> {
  const db = createServiceClient();
  return new ReportRepository(db).findRecentByDevice(deviceId, limit);
}

/**
 * Returns the full report for a device on a specific date, including parsed_data.
 * Used by the Device Detail deep-dive view.
 *
 * @param deviceId - Device UUID.
 * @param date     - ISO date string, e.g. "2026-06-10".
 * @returns Ok(Report) with parsedData populated, Err(NotFoundError) if absent.
 */
export async function getReportByDeviceAndDate(
  deviceId: string,
  date: string,
): AsyncResult<Report> {
  const db = createServiceClient();
  const repo = new ReportRepository(db);

  const findResult = await repo.findByDeviceAndDate(deviceId, date);
  if (!findResult.ok) return findResult;
  if (findResult.value === null) {
    // Import lazily to avoid circular dep with error-catalog
    const { NotFoundError } = await import('@/lib/infrastructure/errors/app-error');
    const { err } = await import('@/lib/infrastructure/errors/result');
    return err(new NotFoundError('Report', `${deviceId}/${date}`));
  }

  // Re-fetch with full parsed_data for the detail view
  return repo.findDetailById(findResult.value.id);
}

/**
 * Returns the full report by its UUID, including parsed_data.
 *
 * @param id - Report UUID.
 * @returns Ok(Report) with parsedData, Err(NotFoundError) if absent.
 */
export async function getReportDetail(id: string): AsyncResult<Report> {
  const db = createServiceClient();
  return new ReportRepository(db).findDetailById(id);
}

// ---------------------------------------------------------------------------
// Alert queries for report detail
// ---------------------------------------------------------------------------

/**
 * Returns all alerts linked to a specific report.
 * Used by the Device Detail alert tab.
 *
 * @param reportId - Report UUID.
 */
export async function getAlertsForReport(reportId: string): AsyncResult<Alert[]> {
  const db = createServiceClient();
  return new AlertRepository(db).findByReport(reportId);
}

/**
 * Returns paginated alerts across the fleet with optional filters.
 * Used by the Alerts dashboard page.
 *
 * @param filters - Optional criteria (device, severity, active, date range).
 * @param limit   - Max rows per page (default 50, max 500).
 * @param offset  - Row offset for pagination.
 */
export async function getAlerts(
  filters: AlertFilters,
  limit = 50,
  offset = 0,
): AsyncResult<Alert[]> {
  const db = createServiceClient();
  return new AlertRepository(db).findByFilters(filters, limit, offset);
}

/**
 * Returns active alerts for one device.
 * Used by device-tile badge counts on the Overview page.
 *
 * @param deviceId - Device UUID.
 */
export async function getActiveAlertsForDevice(deviceId: string): AsyncResult<Alert[]> {
  const db = createServiceClient();
  return new AlertRepository(db).findActiveByDevice(deviceId);
}

// ---------------------------------------------------------------------------
// Multi-device comparison
// ---------------------------------------------------------------------------

/**
 * Returns full reports (with parsedData) for multiple devices on the same date.
 * Used by the Comparison page side-by-side view.
 *
 * Devices with no report for the requested date are silently omitted —
 * the response may contain fewer entries than deviceIds requested.
 *
 * @param deviceIds  - Array of 2–7 device UUIDs.
 * @param reportDate - ISO date to compare (defaults to today).
 */
export async function compareDevices(
  deviceIds: readonly string[],
  reportDate?: string,
): AsyncResult<Report[]> {
  const db   = createServiceClient();
  const repo  = new ReportRepository(db);
  const date  = reportDate ?? new Date().toISOString().substring(0, 10);

  const settled = await Promise.all(
    deviceIds.map(async (deviceId): Promise<Report | null> => {
      const findResult = await repo.findByDeviceAndDate(deviceId, date);
      if (!findResult.ok || findResult.value === null) return null;
      const detailResult = await repo.findDetailById(findResult.value.id);
      return detailResult.ok ? detailResult.value : null;
    }),
  );

  const reports: Report[] = settled.filter((r): r is Report => r !== null);
  return ok(reports);
}
