import type { DDReport } from './dd-report'

export type DeviceStatus = 'healthy' | 'warning' | 'critical' | 'unknown'

export interface DeviceOverviewItem {
  id: string
  hostname: string
  model: string | null
  serial_number: string | null
  location: string | null
  is_active: boolean
  created_at: string
  latest_report_date: string | null
  latest_report_valid: boolean | null
  storage_used_percent: number | null
  compression_ratio: string | null
  active_alerts_critical: number
  active_alerts_warning: number
  device_status: DeviceStatus
}

export interface DeviceReportDetail {
  id: string
  device_id: string
  report_date: string
  parsed_data: DDReport
  ingested_at: string
  is_valid: boolean
  parse_errors: string | null
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export interface AlertListItem {
  id: string
  device_id: string
  report_id: string
  alert_id: string | null
  severity: string
  class: string | null
  object: string | null
  message: string
  post_time: string | null
  is_active: boolean
  created_at: string
}

export interface PaginatedAlertsResponse {
  data: AlertListItem[]
  total: number
  limit: number
  offset: number
}

// ── History / Charts ──────────────────────────────────────────────────────────

export interface HistoryChartPoint {
  date: string
  storage_used_gib: number | null
  storage_used_percent: number | null
  compression_factor: number | null
  daily_write_gib: number | null
}

// ── Compare ───────────────────────────────────────────────────────────────────

export interface CompareReportItem {
  id: string
  device_id: string
  report_date: string
  parsed_data: DDReport
  ingested_at: string
  is_valid: boolean
}

// ── System Health (extended) ──────────────────────────────────────────────────

export type DeviceReportStatusKind = 'today' | 'stale' | 'none'

export interface DeviceReportStatus {
  device_id: string
  hostname: string
  location: string | null
  last_report_date: string | null
  status: DeviceReportStatusKind
}

export interface DatabaseStats {
  total_reports: number
  total_alerts: number
  oldest_report_date: string | null
  newest_report_date: string | null
}

export interface LogItem {
  id: string
  event_type: string
  device_id: string | null
  message: string
  severity: string
  created_at: string
}

export interface SystemHealthFull {
  status: 'ok' | 'degraded'
  total_devices: number
  devices_reporting_24h: number
  last_ingest_at: string | null
  errors_last_24h: number
  recent_logs: LogItem[]
  device_statuses: DeviceReportStatus[]
  db_stats: DatabaseStats
}

// ── Logs (paginated) ──────────────────────────────────────────────────────────

export interface PaginatedLogsResponse {
  data: LogItem[]
  total: number
  page: number
  limit: number
}

// ── Settings ──────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'viewer'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface SystemSetting {
  key: string
  value: string
  description: string | null
  updated_at: string
}
