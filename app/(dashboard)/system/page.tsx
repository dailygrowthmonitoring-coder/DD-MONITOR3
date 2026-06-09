'use client'

import { formatDistanceToNow, parseISO, format } from 'date-fns'
import { Card } from '@/components/ui/Card'
import { SeverityBadge } from '@/components/ui/SeverityBadge'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonBlock, SkeletonText } from '@/components/ui/SkeletonCard'
import { useSystemHealth } from '@/lib/hooks/use-system-health'
import { DATA_RETENTION_DAYS } from '@/lib/constants/ui'
import type { DeviceReportStatus, LogItem } from '@/types/dashboard'

function statusColor(status: DeviceReportStatus['status']): string {
  if (status === 'today')  return 'text-st-healthy'
  if (status === 'stale')  return 'text-st-warning'
  return 'text-txt-muted'
}

function statusLabel(status: DeviceReportStatus['status']): string {
  if (status === 'today')  return 'Today'
  if (status === 'stale')  return 'Stale'
  return 'No Data'
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  try { return formatDistanceToNow(parseISO(iso), { addSuffix: true }) }
  catch { return iso }
}

function formatDateStr(iso: string | null): string {
  if (!iso) return '—'
  try { return format(parseISO(iso), 'MMM dd, yyyy') }
  catch { return iso }
}

function LogRow({ log }: { log: LogItem }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-app-border/40 last:border-0">
      <SeverityBadge severity={log.severity} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-txt-primary truncate">{log.message}</p>
        <p className="text-xs text-txt-muted font-mono mt-0.5">{log.event_type}</p>
      </div>
      <span className="text-xs text-txt-muted whitespace-nowrap flex-shrink-0">
        {relativeTime(log.created_at)}
      </span>
    </div>
  )
}

export default function SystemPage() {
  const { data, isLoading, error, mutate } = useSystemHealth()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-txt-primary">System Health</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <SkeletonBlock className="h-32 rounded" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-txt-primary">System Health</h1>
        <ErrorState message="Failed to load system health" onRetry={() => mutate()} />
      </div>
    )
  }

  const overallColor = data.status === 'ok' ? 'text-st-healthy' : 'text-st-warning'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-txt-primary">System Health</h1>
          <p className="text-sm text-txt-muted">Refreshes every 60 seconds</p>
        </div>
        <span className={`text-sm font-semibold ${overallColor}`}>
          {data.status === 'ok' ? '● Operational' : '● Degraded'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ingestion Status */}
        <Card title="Ingestion Status">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <dt className="text-txt-muted text-sm">Total Devices</dt>
            <dd className="text-txt-primary font-mono text-sm">{data.total_devices}</dd>

            <dt className="text-txt-muted text-sm">Reporting (24h)</dt>
            <dd className={`font-mono text-sm ${data.devices_reporting_24h < data.total_devices ? 'text-st-warning' : 'text-st-healthy'}`}>
              {data.devices_reporting_24h} / {data.total_devices}
            </dd>

            <dt className="text-txt-muted text-sm">Last Ingest</dt>
            <dd className="text-txt-primary font-mono text-sm">{relativeTime(data.last_ingest_at)}</dd>

            <dt className="text-txt-muted text-sm">Errors (24h)</dt>
            <dd className={`font-mono text-sm ${data.errors_last_24h > 0 ? 'text-st-critical' : 'text-st-healthy'}`}>
              {data.errors_last_24h}
            </dd>
          </dl>
        </Card>

        {/* Database Stats */}
        <Card title="Database">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <dt className="text-txt-muted text-sm">Total Reports</dt>
            <dd className="text-txt-primary font-mono text-sm">
              {data.db_stats.total_reports.toLocaleString()}
            </dd>

            <dt className="text-txt-muted text-sm">Total Alerts</dt>
            <dd className="text-txt-primary font-mono text-sm">
              {data.db_stats.total_alerts.toLocaleString()}
            </dd>

            <dt className="text-txt-muted text-sm">Oldest Report</dt>
            <dd className="text-txt-primary font-mono text-sm">
              {formatDateStr(data.db_stats.oldest_report_date)}
            </dd>

            <dt className="text-txt-muted text-sm">Newest Report</dt>
            <dd className="text-txt-primary font-mono text-sm">
              {formatDateStr(data.db_stats.newest_report_date)}
            </dd>

            <dt className="text-txt-muted text-sm">Retention</dt>
            <dd className="text-txt-primary font-mono text-sm">{DATA_RETENTION_DAYS} days</dd>
          </dl>
        </Card>

        {/* Device Report Status */}
        <Card title="Device Report Status">
          <div className="flex flex-col divide-y divide-app-border/40">
            {data.device_statuses.length === 0 && (
              <p className="text-txt-muted text-sm py-2">No devices found</p>
            )}
            {data.device_statuses.map(dev => (
              <div key={dev.device_id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm text-txt-primary font-mono">{dev.hostname}</p>
                  {dev.location && (
                    <p className="text-xs text-txt-muted">{dev.location}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className={`text-xs font-semibold ${statusColor(dev.status)}`}>
                    {statusLabel(dev.status)}
                  </span>
                  {dev.last_report_date && (
                    <span className="text-xs text-txt-muted font-mono">
                      {dev.last_report_date}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Logs */}
        <Card title="Recent System Logs">
          <div>
            {data.recent_logs.length === 0 && (
              <p className="text-txt-muted text-sm py-2">No recent logs</p>
            )}
            {data.recent_logs.map(log => (
              <LogRow key={log.id} log={log} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
