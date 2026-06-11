/**
 * AnalyticsService — aggregations and projections for dashboard charts.
 *
 * Provides:
 *   - Per-device storage and compression trend data (History page charts).
 *   - Storage runway estimate via linear regression on recent growth.
 *   - Fleet-wide comparison data (Comparison page table).
 *   - Paginated system log queries (Logs page).
 *
 * Expensive, slow-changing reads are cached via the singleton analyticsCache
 * (TTL = config.CACHE_TTL_SECONDS, default 5 minutes). Cache keys incorporate
 * deviceId and parameter hashes so different callers get independent entries.
 *
 * When Layer 2 (materialized views) is built, the heavy aggregations here
 * should switch from per-query joins to view reads — the service signatures
 * stay the same, only the repository calls change.
 */

import { type SystemLog, type Report, DeviceStatus, AlertSeverity } from '@/lib/domain';
import {
  createServiceClient,
  DeviceRepository,
  ReportRepository,
  AlertRepository,
  LogRepository,
  type AlertFilters,
  type LogFilters,
} from '@/lib/repositories';
import { ok, err, type AsyncResult } from '@/lib/infrastructure/errors/result';
import { analyticsCache, deviceListCache, getOrSet } from '@/lib/infrastructure/cache/cache';
import type {
  StorageTrendPoint,
  CompressionTrendPoint,
  RunwayEstimate,
  DeviceComparisonRow,
  FleetStorageTrendRow,
  FleetDailySummaryRow,
  AlertTrendRow,
  FleetHealthSummary,
  IngestionStatusPerDevice,
} from './types';
import { config } from '@/lib/infrastructure/config/config';

// ---------------------------------------------------------------------------
// Storage trend
// ---------------------------------------------------------------------------

/**
 * Returns daily storage utilisation data points for a device, oldest-first.
 *
 * @param deviceId - Device UUID.
 * @param days     - How many most-recent daily reports to include (default 40).
 */
export async function getStorageTrend(
  deviceId: string,
  days = 40,
): AsyncResult<StorageTrendPoint[]> {
  const cacheKey = `storage-trend:${deviceId}:${days}`;

  const points = await getOrSet(
    analyticsCache as typeof analyticsCache & { get: (k: string) => StorageTrendPoint[] | null },
    cacheKey,
    async () => {
      const db = createServiceClient();
      const result = await new ReportRepository(db).findRecentByDevice(deviceId, days);
      if (!result.ok) return [];
      // Reverse so oldest-first for chart rendering
      return [...result.value]
        .reverse()
        .map(r => ({
          date:         r.reportDate.toISOString().substring(0, 10),
          totalGib:     r.storage.totalGib.value,
          usedGib:      r.storage.usedGib.value,
          usedPercent:  r.storage.usedPercent.value,
          cleanableGib: r.storage.cleanableGib?.value ?? null,
        } satisfies StorageTrendPoint));
    },
  ) as StorageTrendPoint[];

  return ok(points);
}

// ---------------------------------------------------------------------------
// Compression trend
// ---------------------------------------------------------------------------

/**
 * Returns daily compression data points for a device, oldest-first.
 *
 * @param deviceId - Device UUID.
 * @param days     - How many most-recent daily reports to include (default 40).
 */
export async function getCompressionTrend(
  deviceId: string,
  days = 40,
): AsyncResult<CompressionTrendPoint[]> {
  const cacheKey = `compression-trend:${deviceId}:${days}`;

  const points = await getOrSet(
    analyticsCache as typeof analyticsCache & { get: (k: string) => CompressionTrendPoint[] | null },
    cacheKey,
    async () => {
      const db = createServiceClient();
      const result = await new ReportRepository(db).findRecentByDevice(deviceId, days);
      if (!result.ok) return [];
      return [...result.value]
        .reverse()
        .map(r => ({
          date:              r.reportDate.toISOString().substring(0, 10),
          totalFactor:       r.compression.currentlyUsed.totalFactor?.value ?? null,
          reductionPercent:  r.compression.currentlyUsed.reductionPercent,
          last7DaysFactor:   r.compression.last7Days.totalFactor?.value ?? null,
        } satisfies CompressionTrendPoint));
    },
  ) as CompressionTrendPoint[];

  return ok(points);
}

// ---------------------------------------------------------------------------
// Runway estimate
// ---------------------------------------------------------------------------

/**
 * Estimates how many days until the device's storage reaches 100% capacity.
 *
 * Uses ordinary least-squares (OLS) linear regression on the last 30 days of
 * usedGib vs. day-index data. Returns null projections when the slope ≤ 0.
 *
 * @param deviceId - Device UUID.
 * @param days     - Number of historical reports to include in regression (default 30).
 */
export async function getRunwayEstimate(
  deviceId: string,
  days = 30,
): AsyncResult<RunwayEstimate> {
  const cacheKey = `runway:${deviceId}:${days}`;

  const estimate = await getOrSet(
    analyticsCache as typeof analyticsCache & { get: (k: string) => RunwayEstimate | null },
    cacheKey,
    async () => {
      const db = createServiceClient();

      const [deviceResult, reportsResult] = await Promise.all([
        new DeviceRepository(db).findById(deviceId),
        new ReportRepository(db).findRecentByDevice(deviceId, days),
      ]);

      // Fallback values if device or reports are not found
      const hostname = deviceResult.ok ? deviceResult.value.hostname : deviceId;
      const totalCapGib = deviceResult.ok
        ? (deviceResult.value.totalCapacity?.value ?? null)
        : null;

      if (!reportsResult.ok || reportsResult.value.length < 2) {
        // With exactly 1 report we can still surface current values even though
        // OLS regression requires ≥ 2 points.
        const singleRpt = reportsResult.ok && reportsResult.value.length === 1
          ? reportsResult.value[0]
          : undefined;
        return {
          deviceId,
          hostname,
          currentUsedPercent:     singleRpt?.storage.usedPercent.value ?? 0,
          avgDailyGrowthGib:      0,
          estimatedDaysRemaining: null,
          projectedFillDate:      null,
          dataPointsUsed:         reportsResult.ok ? reportsResult.value.length : 0,
          totalCapacityGib:       singleRpt?.storage.totalGib.value ?? totalCapGib,
          usedGib:                singleRpt != null ? singleRpt.storage.usedGib.value : null,
        } satisfies RunwayEstimate;
      }

      // Oldest-first for regression
      const reports = [...reportsResult.value].reverse();
      return computeRunway(deviceId, hostname, reports, totalCapGib);
    },
  ) as RunwayEstimate;

  return ok(estimate);
}

/** Performs OLS regression on usedGib vs day-index and projects the fill date. */
function computeRunway(
  deviceId: string,
  hostname: string,
  reports: readonly Report[],
  totalCapGib: number | null,
): RunwayEstimate {
  const n = reports.length;
  const xs = reports.map((_, i) => i);                   // day index
  const ys = reports.map(r => r.storage.usedGib.value);

  const xMean = xs.reduce((s, x) => s + x, 0) / n;
  const yMean = ys.reduce((s, y) => s + y, 0) / n;

  let ssXY = 0;
  let ssXX = 0;
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] ?? 0) - xMean;
    const dy = (ys[i] ?? 0) - yMean;
    ssXY += dx * dy;
    ssXX += dx * dx;
  }

  const slope = ssXX > 0 ? ssXY / ssXX : 0;   // GiB/day

  const lastReport = reports[n - 1];
  const currentUsedGib = lastReport?.storage.usedGib.value ?? 0;
  const currentUsedPct = lastReport?.storage.usedPercent.value ?? 0;

  const capacityGib = totalCapGib ?? lastReport?.storage.totalGib.value ?? null;

  let estimatedDaysRemaining: number | null = null;
  let projectedFillDate: string | null = null;

  if (slope > 0 && capacityGib !== null && currentUsedGib < capacityGib) {
    const remainingGib = capacityGib - currentUsedGib;
    const days = Math.ceil(remainingGib / slope);
    estimatedDaysRemaining = days;

    const fillDate = new Date();
    fillDate.setDate(fillDate.getDate() + days);
    projectedFillDate = fillDate.toISOString().substring(0, 10);
  }

  return {
    deviceId,
    hostname,
    currentUsedPercent:     currentUsedPct,
    avgDailyGrowthGib:      parseFloat(slope.toFixed(3)),
    estimatedDaysRemaining,
    projectedFillDate,
    dataPointsUsed:         n,
    totalCapacityGib:       capacityGib,
    usedGib:                parseFloat(currentUsedGib.toFixed(3)),
  };
}

// ---------------------------------------------------------------------------
// Fleet comparison
// ---------------------------------------------------------------------------

/**
 * Returns one comparison row per active device, populated from each device's
 * most recent report. Uses the device's snapshot columns for status and alerts.
 *
 * Results are cached — invalidated when a device snapshot changes.
 */
export async function getFleetComparison(): AsyncResult<DeviceComparisonRow[]> {
  const rows = await getOrSet(
    deviceListCache as typeof deviceListCache & { get: (k: string) => DeviceComparisonRow[] | null },
    'fleet:comparison',
    async () => {
      const db = createServiceClient();
      const devicesResult = await new DeviceRepository(db).findAllActive();
      if (!devicesResult.ok) return [];

      const reportRepo = new ReportRepository(db);
      const rows: DeviceComparisonRow[] = [];

      for (const device of devicesResult.value) {
        const reportsResult = await reportRepo.findRecentByDevice(device.id, 1);
        const latestReport = reportsResult.ok ? (reportsResult.value[0] ?? null) : null;

        rows.push({
          deviceId:    device.id,
          hostname:    device.hostname,
          shortName:   device.shortName,
          reportDate:  latestReport?.reportDate.toISOString().substring(0, 10) ?? null,
          totalGib:    latestReport?.storage.totalGib.value   ?? null,
          usedGib:     latestReport?.storage.usedGib.value    ?? null,
          usedPercent: latestReport?.storage.usedPercent.value ?? null,
          totalFactor: latestReport?.compression.currentlyUsed.totalFactor?.value ?? null,
          deviceStatus: device.lastStatus,
          failedDisks:  latestReport?.disks.failedDisks ?? 0,
          activeAlerts: device.lastActiveAlerts,
        });
      }

      return rows;
    },
  ) as DeviceComparisonRow[];

  return ok(rows);
}

// ---------------------------------------------------------------------------
// System logs
// ---------------------------------------------------------------------------

/**
 * Returns paginated system log entries matching the supplied filters.
 * Used by the Logs dashboard page.
 *
 * @param filters - Optional criteria (device, event type, severity, date range).
 * @param limit   - Max rows per page (default 100).
 * @param offset  - Row offset for pagination.
 */
export async function getLogs(
  filters: LogFilters,
  limit = 100,
  offset = 0,
): AsyncResult<SystemLog[]> {
  const db = createServiceClient();
  return new LogRepository(db).findByFilters(filters, limit, offset);
}

/**
 * Invalidates cached data that depends on device snapshots.
 * Must be called by IngestionService after a successful ingest so the
 * Overview and Comparison pages serve fresh data.
 */
export function invalidateFleetCache(deviceId: string): void {
  deviceListCache.delete('fleet:comparison');
  deviceListCache.delete('fleet:storage-trend');
  deviceListCache.delete('fleet:daily-summary');
  deviceListCache.delete('fleet:capacity');
  deviceListCache.delete('fleet:health-summary');
  deviceListCache.delete('fleet:ingestion-status');
  analyticsCache.delete(`storage-trend:${deviceId}:40`);
  analyticsCache.delete(`compression-trend:${deviceId}:40`);
  analyticsCache.delete(`runway:${deviceId}:30`);
}

// ---------------------------------------------------------------------------
// Fleet-wide analytics — storage trend
// ---------------------------------------------------------------------------

/**
 * Returns daily storage data for the fleet, one row per device per day.
 * When deviceId is provided, returns only that device's trend (single-device view).
 * Results are oldest-first within each device.
 *
 * @param days     - Number of most recent days to include (default 30).
 * @param deviceId - Optional UUID to restrict to one device.
 */
export async function getFleetStorageTrend(
  days = 30,
  deviceId?: string,
): AsyncResult<FleetStorageTrendRow[]> {
  const cacheKey = `fleet-storage-trend:${deviceId ?? 'all'}:${days}`;

  const rows = await getOrSet(
    deviceListCache as typeof deviceListCache & { get: (k: string) => FleetStorageTrendRow[] | null },
    cacheKey,
    async () => {
      const db = createServiceClient();
      const deviceRepo = new DeviceRepository(db);
      const reportRepo  = new ReportRepository(db);

      // Resolve the device list — one or all active
      const devicesResult = deviceId !== undefined
        ? await deviceRepo.findById(deviceId).then(r => r.ok ? ok([r.value]) : r)
        : await deviceRepo.findAllActive();

      if (!devicesResult.ok) return [];

      const allRows: FleetStorageTrendRow[] = [];
      for (const device of devicesResult.value) {
        const reportsResult = await reportRepo.findRecentByDevice(device.id, days);
        if (!reportsResult.ok) continue;
        for (const report of [...reportsResult.value].reverse()) {
          allRows.push({
            deviceId:    device.id,
            hostname:    device.hostname,
            date:        report.reportDate.toISOString().substring(0, 10),
            totalGib:    report.storage.totalGib.value,
            usedGib:     report.storage.usedGib.value,
            usedPercent: report.storage.usedPercent.value,
          } satisfies FleetStorageTrendRow);
        }
      }
      return allRows;
    },
  ) as FleetStorageTrendRow[];

  return ok(rows);
}

// ---------------------------------------------------------------------------
// Fleet-wide analytics — daily summary
// ---------------------------------------------------------------------------

/**
 * Returns fleet-wide daily aggregate metrics, oldest-first.
 * Each row represents one date with all devices' combined storage and health.
 * Dates where no device has a report are omitted.
 *
 * @param days - Number of most recent days to include (default 30).
 */
export async function getFleetDailySummary(days = 30): AsyncResult<FleetDailySummaryRow[]> {
  const cacheKey = `fleet-daily-summary:${days}`;

  const rows = await getOrSet(
    deviceListCache as typeof deviceListCache & { get: (k: string) => FleetDailySummaryRow[] | null },
    cacheKey,
    async () => {
      const db = createServiceClient();
      const deviceRepo = new DeviceRepository(db);
      const reportRepo  = new ReportRepository(db);

      const devicesResult = await deviceRepo.findAllActive();
      if (!devicesResult.ok) return [];

      // date → accumulator
      const byDate = new Map<string, {
        totalDevices: number;
        healthyCount: number;
        warningCount: number;
        criticalCount: number;
        unknownCount: number;
        totalCapacityGib: number;
        totalUsedGib: number;
        totalActiveAlerts: number;
      }>();

      for (const device of devicesResult.value) {
        const reportsResult = await reportRepo.findRecentByDevice(device.id, days);
        if (!reportsResult.ok) continue;
        for (const report of reportsResult.value) {
          const date = report.reportDate.toISOString().substring(0, 10);
          const existing = byDate.get(date) ?? {
            totalDevices: 0,
            healthyCount: 0,
            warningCount: 0,
            criticalCount: 0,
            unknownCount: 0,
            totalCapacityGib: 0,
            totalUsedGib: 0,
            totalActiveAlerts: 0,
          };
          existing.totalDevices += 1;
          if      (report.deviceStatus === DeviceStatus.Healthy)  existing.healthyCount  += 1;
          else if (report.deviceStatus === DeviceStatus.Warning)  existing.warningCount  += 1;
          else if (report.deviceStatus === DeviceStatus.Critical) existing.criticalCount += 1;
          else                                                     existing.unknownCount  += 1;
          existing.totalCapacityGib  += report.storage.totalGib.value;
          existing.totalUsedGib      += report.storage.usedGib.value;
          existing.totalActiveAlerts += report.activeTotalAlerts;
          byDate.set(date, existing);
        }
      }

      // Sort oldest-first
      return [...byDate.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, acc]): FleetDailySummaryRow => ({ date, ...acc }));
    },
  ) as FleetDailySummaryRow[];

  return ok(rows);
}

// ---------------------------------------------------------------------------
// Fleet-wide analytics — alert trend
// ---------------------------------------------------------------------------

/**
 * Returns per-day alert counts grouped by severity, oldest-first.
 * Spans the requested number of days ending today. Days with zero alerts
 * are included so charts have continuous X axes.
 *
 * @param days     - Number of trailing days to include (default 14).
 * @param deviceId - Optional UUID to restrict to one device.
 */
export async function getAlertTrend(
  days = 14,
  deviceId?: string,
): AsyncResult<AlertTrendRow[]> {
  const db = createServiceClient();
  const alertRepo = new AlertRepository(db);

  const today = new Date();
  const from  = new Date(today);
  from.setDate(from.getDate() - (days - 1));
  const fromStr = from.toISOString().substring(0, 10);
  const toStr   = today.toISOString().substring(0, 10);

  const filters: AlertFilters = {
    ...(deviceId !== undefined ? { deviceId } : {}),
    fromDate: fromStr,
    toDate:   toStr,
  };

  // Upper bound: 200 alerts/day × days is generous for a 7-device fleet
  const result = await alertRepo.findByFilters(filters, days * 200, 0);
  if (!result.ok) return result;

  const byDate = new Map<string, { criticalCount: number; warningCount: number; infoCount: number }>();

  for (const alert of result.value) {
    const date = alert.reportDate.toISOString().substring(0, 10);
    const entry = byDate.get(date) ?? { criticalCount: 0, warningCount: 0, infoCount: 0 };
    if      (alert.severity === AlertSeverity.Critical) entry.criticalCount += 1;
    else if (alert.severity === AlertSeverity.Warning)  entry.warningCount  += 1;
    else                                                entry.infoCount     += 1;
    byDate.set(date, entry);
  }

  // Build a continuous date series with zero-fill for missing days
  const rows: AlertTrendRow[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date    = d.toISOString().substring(0, 10);
    const counts  = byDate.get(date) ?? { criticalCount: 0, warningCount: 0, infoCount: 0 };
    rows.push({ date, ...counts });
  }

  return ok(rows);
}

// ---------------------------------------------------------------------------
// Fleet-wide analytics — capacity / runway (all devices)
// ---------------------------------------------------------------------------

/**
 * Returns a runway estimate for every active device.
 * Results are cached; invalidated by invalidateFleetCache() on each ingest.
 */
export async function getFleetCapacity(): AsyncResult<RunwayEstimate[]> {
  const estimates = await getOrSet(
    deviceListCache as typeof deviceListCache & { get: (k: string) => RunwayEstimate[] | null },
    'fleet:capacity',
    async () => {
      const db = createServiceClient();
      const devicesResult = await new DeviceRepository(db).findAllActive();
      if (!devicesResult.ok) return [];

      const results: RunwayEstimate[] = [];
      for (const device of devicesResult.value) {
        const r = await getRunwayEstimate(device.id, 30);
        if (r.ok) results.push(r.value);
      }
      return results;
    },
  ) as RunwayEstimate[];

  return ok(estimates);
}

// ---------------------------------------------------------------------------
// Fleet-wide analytics — health summary
// ---------------------------------------------------------------------------

/**
 * Returns the fleet-wide health summary aggregated from active device snapshots.
 * Used by the System Health page stat cards.
 */
export async function getFleetHealthSummary(): AsyncResult<FleetHealthSummary> {
  const summary = await getOrSet(
    deviceListCache as typeof deviceListCache & { get: (k: string) => FleetHealthSummary | null },
    'fleet:health-summary',
    async () => {
      const db = createServiceClient();
      const devicesResult = await new DeviceRepository(db).findAllActive();
      if (!devicesResult.ok) return null;

      let healthyCount = 0;
      let warningCount = 0;
      let criticalCount = 0;
      let unknownCount = 0;
      let totalCapacityGib = 0;
      let totalUsedGib = 0;
      let usedPercentSum = 0;
      let totalActiveAlerts = 0;

      for (const device of devicesResult.value) {
        if      (device.lastStatus === DeviceStatus.Healthy)  healthyCount  += 1;
        else if (device.lastStatus === DeviceStatus.Warning)  warningCount  += 1;
        else if (device.lastStatus === DeviceStatus.Critical) criticalCount += 1;
        else                                                   unknownCount  += 1;

        const pct = device.lastUsedPercent?.value ?? 0;
        usedPercentSum   += pct;
        totalCapacityGib += device.totalCapacity?.value ?? 0;
        totalActiveAlerts += device.lastActiveAlerts;
      }

      const n = devicesResult.value.length;
      // Approximate: estimate usedGib from capacity and avg percent
      totalUsedGib = n > 0 ? (totalCapacityGib * usedPercentSum) / (n * 100) : 0;

      return {
        totalDevices: n,
        healthyCount,
        warningCount,
        criticalCount,
        unknownCount,
        totalCapacityGib: parseFloat(totalCapacityGib.toFixed(2)),
        totalUsedGib:     parseFloat(totalUsedGib.toFixed(2)),
        avgUsedPercent:   n > 0 ? parseFloat((usedPercentSum / n).toFixed(1)) : 0,
        totalActiveAlerts,
      } satisfies FleetHealthSummary;
    },
  ) as FleetHealthSummary | null;

  if (summary === null) {
    return ok({
      totalDevices: 0, healthyCount: 0, warningCount: 0, criticalCount: 0, unknownCount: 0,
      totalCapacityGib: 0, totalUsedGib: 0, avgUsedPercent: 0, totalActiveAlerts: 0,
    });
  }
  return ok(summary);
}

// ---------------------------------------------------------------------------
// Fleet-wide analytics — ingestion status per device
// ---------------------------------------------------------------------------

/**
 * Returns per-device ingestion pipeline status, showing when each device last
 * reported and whether it is currently overdue.
 *
 * A device is overdue when:
 *   - today's report has not been received, AND
 *   - the current UTC hour is past config.REPORT_DEADLINE_HOUR.
 */
export async function getIngestionStatus(): AsyncResult<IngestionStatusPerDevice[]> {
  const statuses = await getOrSet(
    deviceListCache as typeof deviceListCache & { get: (k: string) => IngestionStatusPerDevice[] | null },
    'fleet:ingestion-status',
    async () => {
      const db = createServiceClient();
      const devicesResult = await new DeviceRepository(db).findAllActive();
      if (!devicesResult.ok) return [];

      const now           = new Date();
      const todayStr      = now.toISOString().substring(0, 10);
      const currentHour   = now.getUTCHours();
      const deadlineHour  = config.REPORT_DEADLINE_HOUR;

      return devicesResult.value.map((device): IngestionStatusPerDevice => {
        const lastReportDate = device.lastReportDate?.toISOString().substring(0, 10) ?? null;
        const lastSeenAt     = device.lastSeenAt;

        const lastReportAgeHours =
          lastSeenAt !== null
            ? parseFloat(((now.getTime() - lastSeenAt.getTime()) / 3_600_000).toFixed(1))
            : null;

        const hasReportToday = lastReportDate === todayStr;
        const isOverdue      = !hasReportToday && currentHour >= deadlineHour;

        return {
          deviceId:            device.id,
          hostname:            device.hostname,
          shortName:           device.shortName,
          lastReportDate,
          lastReportAgeHours,
          isOverdue,
          lastStatus:          device.lastStatus,
        };
      });
    },
  ) as IngestionStatusPerDevice[];

  return ok(statuses);
}
