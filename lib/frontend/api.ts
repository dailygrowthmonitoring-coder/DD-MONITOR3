/**
 * lib/frontend/api.ts
 *
 * Typed fetch wrappers for every DD Monitor API endpoint.
 * All functions return Promise<ApiResult<T>>.
 *
 * Dates from the API are ISO strings (domain entities serialized via JSON).
 * Value objects (Gib, StoragePercent, CompressionFactor) serialize to their
 * raw number value via toJSON().
 */

// ---------------------------------------------------------------------------
// Shared response envelope
// ---------------------------------------------------------------------------

export interface ApiSuccess<T> {
  readonly success: true;
  readonly data: T;
  readonly meta?: PaginationMeta;
}

export interface ApiFailure {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly status: number;
  };
}

export interface PaginationMeta {
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

// ---------------------------------------------------------------------------
// Domain DTO types — JSON-serialized shapes returned by the API
// ---------------------------------------------------------------------------

export interface DeviceDTO {
  readonly id:               string;
  readonly hostname:         string;
  readonly shortName:        string;
  readonly model:            string | null;
  readonly serialNumber:     string | null;
  readonly chassisSerial:    string | null;
  readonly location:         string | null;
  readonly osVersion:        string | null;
  readonly totalCapacity:    number | null;
  readonly isActive:         boolean;
  readonly lastReportDate:   string | null;
  readonly lastSeenAt:       string | null;
  readonly lastUsedPercent:  number | null;
  readonly lastStatus:       'healthy' | 'warning' | 'critical' | 'unknown';
  readonly lastActiveAlerts: number;
  readonly createdAt:        string;
  readonly updatedAt:        string;
}

export interface AlertDTO {
  readonly id:         string;
  readonly deviceId:   string;
  readonly reportId:   string;
  readonly reportDate: string;
  readonly alertId:    string | null;
  readonly severity:   'CRITICAL' | 'WARNING' | 'INFO';
  readonly class:      string | null;
  readonly object:     string | null;
  readonly message:    string;
  readonly postTime:   string | null;
  readonly clearTime:  string | null;
  readonly isActive:   boolean;
  readonly source:     'appliance' | 'rule_engine';
  readonly createdAt:  string;
}

export interface AlertRuleDTO {
  readonly id:          string;
  readonly ruleKey:     string;
  readonly description: string;
  readonly metric:      string;
  readonly operator:    '>' | '>=' | '<' | '<=' | '=';
  readonly threshold:   number;
  readonly severity:    'CRITICAL' | 'WARNING' | 'INFO';
  readonly isEnabled:   boolean;
  readonly createdAt:   string;
  readonly updatedAt:   string;
}

export interface SystemLogDTO {
  readonly id:             string;
  readonly eventType:      'ingestion' | 'parse' | 'alert_evaluation' | 'alert_sent' | 'cleanup' | 'auth' | 'export';
  readonly severity:       'INFO' | 'WARNING' | 'ERROR';
  readonly deviceId:       string | null;
  readonly message:        string;
  readonly details:        Record<string, unknown> | null;
  readonly correlationId:  string | null;
  readonly createdAt:      string;
}

export interface FleetStorageTrendRowDTO {
  readonly deviceId:    string;
  readonly hostname:    string;
  readonly date:        string;
  readonly totalGib:    number;
  readonly usedGib:     number;
  readonly usedPercent: number;
}

export interface FleetDailySummaryRowDTO {
  readonly date:             string;
  readonly totalDevices:     number;
  readonly healthyCount:     number;
  readonly warningCount:     number;
  readonly criticalCount:    number;
  readonly unknownCount:     number;
  readonly totalCapacityGib: number;
  readonly totalUsedGib:     number;
  readonly totalActiveAlerts: number;
}

export interface AlertTrendRowDTO {
  readonly date:          string;
  readonly criticalCount: number;
  readonly warningCount:  number;
  readonly infoCount:     number;
}

export interface RunwayEstimateDTO {
  readonly deviceId:               string;
  readonly hostname:                string;
  readonly currentUsedPercent:      number;
  readonly avgDailyGrowthGib:       number;
  readonly estimatedDaysRemaining:  number | null;
  readonly projectedFillDate:       string | null;
  readonly dataPointsUsed:          number;
  readonly totalCapacityGib:        number | null;
  readonly usedGib:                 number | null;
}

export interface FleetHealthSummaryDTO {
  readonly totalDevices:     number;
  readonly healthyCount:     number;
  readonly warningCount:     number;
  readonly criticalCount:    number;
  readonly unknownCount:     number;
  readonly totalCapacityGib: number;
  readonly totalUsedGib:     number;
  readonly avgUsedPercent:   number;
  readonly totalActiveAlerts: number;
}

export interface IngestionStatusDTO {
  readonly deviceId:           string;
  readonly hostname:           string;
  readonly shortName:          string;
  readonly lastReportDate:     string | null;
  readonly lastReportAgeHours: number | null;
  readonly isOverdue:          boolean;
  readonly lastStatus:         'healthy' | 'warning' | 'critical' | 'unknown';
}

export interface SystemHealthDTO {
  readonly fleetSummary:    FleetHealthSummaryDTO;
  readonly ingestionStatus: IngestionStatusDTO[];
  readonly systemTime:      string;
}

export interface DeviceComparisonRowDTO {
  readonly deviceId:     string;
  readonly hostname:     string;
  readonly shortName:    string;
  readonly reportDate:   string | null;
  readonly totalGib:     number | null;
  readonly usedGib:      number | null;
  readonly usedPercent:  number | null;
  readonly totalFactor:  number | null;
  readonly deviceStatus: 'healthy' | 'warning' | 'critical' | 'unknown';
  readonly failedDisks:  number;
  readonly activeAlerts: number;
}

// ---------------------------------------------------------------------------
// Report DTO — simplified flat structure mirroring what the API serializes
// ---------------------------------------------------------------------------

export interface ReportDTO {
  readonly id:           string;
  readonly deviceId:     string;
  readonly reportDate:   string;
  readonly fileName:     string | null;
  readonly isValid:      boolean;
  readonly parseErrors:  readonly string[] | null;
  readonly deviceStatus: 'healthy' | 'warning' | 'critical' | 'unknown';
  readonly ingested_at:  string;
  // Indexed flat columns the API exposes
  readonly storageUsedPercent:  number | null;
  readonly storageUsedGib:      number | null;
  readonly storageTotalGib:     number | null;
  readonly storageAvailableGib: number | null;
  readonly storagePreCompGib:   number | null;
  readonly compTotalFactor:     number | null;
  readonly comp7dayTotalFactor: number | null;
  readonly comp24hTotalFactor:  number | null;
  readonly disksActive:         number | null;
  readonly disksInUse:          number | null;
  readonly disksSpare:          number | null;
  readonly disksFailed:         number | null;
  readonly activeAlertsTotal:   number | null;
  readonly uptimeDays:          number | null;
  readonly replicationConfigured: boolean | null;
  readonly replicationStatus:   string | null;
  readonly networkPortsTotal:   number | null;
  readonly networkPortsDown:    number | null;
  readonly nfsStatus:           string | null;
  readonly cifsStatus:          string | null;
  readonly sysAvailabilityPct:  number | null;
  readonly memoryTotalMib:      number | null;
  readonly memoryFreeMib:       number | null;
  // Full parsed detail — only present on /api/devices/[id]/reports/[date]
  readonly parsedData:          Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Core fetch helper
// ---------------------------------------------------------------------------

const BASE_URL = process.env['NEXT_PUBLIC_APP_URL'] ?? '';

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const json = (await response.json()) as ApiResult<T>;
    return json;
  } catch (error) {
    return {
      success: false,
      error: {
        code:    'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed',
        status:  0,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Device endpoints
// ---------------------------------------------------------------------------

/** GET /api/devices — all active devices with snapshot data. */
export function fetchDevices(): Promise<ApiResult<DeviceDTO[]>> {
  return apiFetch<DeviceDTO[]>('/api/devices', { cache: 'no-store' });
}

/** GET /api/devices/[id] — single device. */
export function fetchDevice(id: string): Promise<ApiResult<DeviceDTO>> {
  return apiFetch<DeviceDTO>(`/api/devices/${id}`, { cache: 'no-store' });
}

/** GET /api/devices/[id]/reports — report history list (no parsedData). */
export function fetchDeviceReports(
  id: string,
  limit = 40,
): Promise<ApiResult<ReportDTO[]>> {
  return apiFetch<ReportDTO[]>(`/api/devices/${id}/reports?limit=${limit}`, {
    cache: 'no-store',
  });
}

/** GET /api/devices/[id]/reports/[date] — single report with full parsedData. */
export function fetchDeviceReport(
  id: string,
  date: string,
): Promise<ApiResult<ReportDTO>> {
  return apiFetch<ReportDTO>(`/api/devices/${id}/reports/${date}`, {
    cache: 'no-store',
  });
}

// ---------------------------------------------------------------------------
// Alert endpoints
// ---------------------------------------------------------------------------

/** GET /api/alerts — paginated alerts. */
export function fetchAlerts(params?: {
  deviceId?: string;
  severity?: string;
  active?: boolean;
  limit?: number;
  offset?: number;
}): Promise<ApiResult<AlertDTO[]>> {
  const p = new URLSearchParams();
  if (params?.deviceId)              p.set('device_id', params.deviceId);
  if (params?.severity)              p.set('severity',  params.severity);
  if (params?.active !== undefined)  p.set('active',    String(params.active));
  if (params?.limit !== undefined)   p.set('limit',     String(params.limit));
  if (params?.offset !== undefined)  p.set('offset',    String(params.offset));
  const qs = p.toString();
  return apiFetch<AlertDTO[]>(`/api/alerts${qs ? `?${qs}` : ''}`, {
    cache: 'no-store',
  });
}

/** GET /api/alerts/rules — all alert rules. */
export function fetchAlertRules(): Promise<ApiResult<AlertRuleDTO[]>> {
  return apiFetch<AlertRuleDTO[]>('/api/alerts/rules', { cache: 'no-store' });
}

/** PATCH /api/alerts/rules/[id] — update an alert rule. */
export function updateAlertRule(
  id: string,
  update: { threshold?: number; isEnabled?: boolean; severity?: string },
): Promise<ApiResult<AlertRuleDTO>> {
  return apiFetch<AlertRuleDTO>(`/api/alerts/rules/${id}`, {
    method:  'PATCH',
    body:    JSON.stringify(update),
    cache:   'no-store',
  });
}

// ---------------------------------------------------------------------------
// Analytics endpoints
// ---------------------------------------------------------------------------

/** GET /api/analytics/fleet-summary — daily fleet-wide KPI summaries. */
export function fetchFleetSummary(days = 30): Promise<ApiResult<FleetDailySummaryRowDTO[]>> {
  return apiFetch<FleetDailySummaryRowDTO[]>(`/api/analytics/fleet-summary?days=${days}`, {
    cache: 'no-store',
  });
}

/** GET /api/analytics/storage-trend — per-device storage trend. */
export function fetchStorageTrend(
  days = 30,
  deviceId?: string,
): Promise<ApiResult<FleetStorageTrendRowDTO[]>> {
  const p = new URLSearchParams({ days: String(days) });
  if (deviceId) p.set('device_id', deviceId);
  return apiFetch<FleetStorageTrendRowDTO[]>(`/api/analytics/storage-trend?${p.toString()}`, {
    cache: 'no-store',
  });
}

/** GET /api/analytics/alert-trend — daily alert counts per severity. */
export function fetchAlertTrend(
  days = 14,
  deviceId?: string,
): Promise<ApiResult<AlertTrendRowDTO[]>> {
  const p = new URLSearchParams({ days: String(days) });
  if (deviceId) p.set('device_id', deviceId);
  return apiFetch<AlertTrendRowDTO[]>(`/api/analytics/alert-trend?${p.toString()}`, {
    cache: 'no-store',
  });
}

/** GET /api/analytics/capacity — storage runway estimates per device. */
export function fetchCapacity(): Promise<ApiResult<RunwayEstimateDTO[]>> {
  return apiFetch<RunwayEstimateDTO[]>('/api/analytics/capacity', { cache: 'no-store' });
}

// ---------------------------------------------------------------------------
// System + logs
// ---------------------------------------------------------------------------

/** GET /api/system/health — fleet health summary and ingestion status. */
export function fetchSystemHealth(): Promise<ApiResult<SystemHealthDTO>> {
  return apiFetch<SystemHealthDTO>('/api/system/health', { cache: 'no-store' });
}

/** GET /api/logs — paginated system event logs. */
export function fetchLogs(params?: {
  deviceId?:  string;
  eventType?: string;
  severity?:  string;
  limit?:     number;
  offset?:    number;
}): Promise<ApiResult<SystemLogDTO[]>> {
  const p = new URLSearchParams();
  if (params?.deviceId)  p.set('device_id',  params.deviceId);
  if (params?.eventType) p.set('event_type', params.eventType);
  if (params?.severity)  p.set('severity',   params.severity);
  if (params?.limit !== undefined)  p.set('limit',  String(params.limit));
  if (params?.offset !== undefined) p.set('offset', String(params.offset));
  const qs = p.toString();
  return apiFetch<SystemLogDTO[]>(`/api/logs${qs ? `?${qs}` : ''}`, {
    cache: 'no-store',
  });
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

/** GET /api/reports/compare — multi-device comparison on a given date. */
export function fetchComparison(
  deviceIds: string[],
  date?: string,
): Promise<ApiResult<DeviceComparisonRowDTO[]>> {
  const p = new URLSearchParams();
  for (const id of deviceIds) p.append('device_ids', id);
  if (date) p.set('date', date);
  return apiFetch<DeviceComparisonRowDTO[]>(`/api/reports/compare?${p.toString()}`, {
    cache: 'no-store',
  });
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/**
 * POST /api/export/report — generates and downloads an HTML report.
 * Returns the blob URL for download, or an error.
 */
export async function exportReport(
  deviceId: string,
  reportDate: string,
): Promise<{ ok: true; blobUrl: string; fileName: string } | { ok: false; message: string }> {
  try {
    const response = await fetch('/api/export/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ device_id: deviceId, report_date: reportDate, format: 'html' }),
    });

    if (!response.ok) {
      const err = (await response.json()) as { error?: { message?: string } };
      return { ok: false, message: err.error?.message ?? 'Export failed' };
    }

    const disposition = response.headers.get('Content-Disposition') ?? '';
    const nameMatch   = /filename="([^"]+)"/.exec(disposition);
    const fileName    = nameMatch?.[1] ?? `report-${reportDate}.html`;

    const blob    = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    return { ok: true, blobUrl, fileName };
  } catch (error) {
    return {
      ok:      false,
      message: error instanceof Error ? error.message : 'Network error',
    };
  }
}
