import { format } from 'date-fns'
import { querySelectActiveDevices } from '@/lib/supabase/queries/devices'
import {
  querySelectRecentLogs,
  queryCountErrorsSince,
} from '@/lib/supabase/queries/logs'
import {
  querySelectLatestReportDatePerDevice,
  queryCountReports,
  querySelectReportDateRange,
} from '@/lib/supabase/queries/reports'
import { queryCountAlerts } from '@/lib/supabase/queries/alerts'
import type { SystemLogRow } from '@/lib/supabase/types'
import type {
  SystemHealthFull,
  DeviceReportStatus,
  DeviceReportStatusKind,
  DatabaseStats,
  LogItem,
} from '@/types/dashboard'

function toLogItem(row: SystemLogRow): LogItem {
  return {
    id:         row.id,
    event_type: row.event_type,
    device_id:  row.device_id,
    message:    row.message,
    severity:   row.severity,
    created_at: row.created_at,
  }
}

export async function getSystemHealth(): Promise<SystemHealthFull> {
  const since24h  = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const todayStr  = format(new Date(), 'yyyy-MM-dd')

  const [devices, latestDates, errors24h, recentLogs, reportCount, alertCount, dateRange] =
    await Promise.all([
      querySelectActiveDevices(),
      querySelectLatestReportDatePerDevice(),
      queryCountErrorsSince(since24h),
      querySelectRecentLogs(10),
      queryCountReports(),
      queryCountAlerts(),
      querySelectReportDateRange(),
    ])

  const latestByDevice = new Map(latestDates.map(r => [r.device_id, r]))

  const devicesReporting24h = latestDates.filter(
    r => r.report_date >= todayStr
  ).length

  const lastIngestAt =
    recentLogs.find(l => l.event_type === 'INGEST_SUCCESS')?.created_at ?? null

  const deviceStatuses: DeviceReportStatus[] = devices.map(d => {
    const latest = latestByDevice.get(d.id)
    let status: DeviceReportStatusKind = 'none'
    if (latest) {
      status = latest.report_date >= todayStr ? 'today' : 'stale'
    }
    return {
      device_id:        d.id,
      hostname:         d.hostname,
      location:         d.location,
      last_report_date: latest?.report_date ?? null,
      status,
    }
  })

  const db_stats: DatabaseStats = {
    total_reports:      reportCount,
    total_alerts:       alertCount,
    oldest_report_date: dateRange.oldest,
    newest_report_date: dateRange.newest,
  }

  const overallStatus: 'ok' | 'degraded' =
    errors24h > 0 || devicesReporting24h < devices.length ? 'degraded' : 'ok'

  return {
    status:               overallStatus,
    total_devices:        devices.length,
    devices_reporting_24h: devicesReporting24h,
    last_ingest_at:       lastIngestAt,
    errors_last_24h:      errors24h,
    recent_logs:          recentLogs.map(toLogItem),
    device_statuses:      deviceStatuses,
    db_stats,
  }
}
