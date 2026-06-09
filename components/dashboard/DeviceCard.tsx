import Link from 'next/link'
import { StatusDot } from '@/components/ui/StatusDot'
import { StorageBar } from '@/components/ui/StorageBar'
import { formatDate } from '@/lib/utils/format'
import type { DeviceOverviewItem } from '@/types/dashboard'

interface DeviceCardProps {
  device: DeviceOverviewItem
}

export function DeviceCard({ device }: DeviceCardProps) {
  const hasAlerts = device.active_alerts_critical > 0 || device.active_alerts_warning > 0

  return (
    <Link
      href={`/devices/${device.id}`}
      className="block bg-app-card border border-app-border rounded-lg p-5 hover:border-accent/30 transition-colors group"
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot status={device.device_status} />
          <span className="font-semibold text-txt-primary text-sm truncate font-mono">
            {device.hostname}
          </span>
        </div>
        {hasAlerts && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {device.active_alerts_critical > 0 && (
              <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-st-critical/15 text-st-critical">
                {device.active_alerts_critical}C
              </span>
            )}
            {device.active_alerts_warning > 0 && (
              <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-st-warning/15 text-st-warning">
                {device.active_alerts_warning}W
              </span>
            )}
          </div>
        )}
      </div>

      {/* Storage bar */}
      <StorageBar percent={device.storage_used_percent} />

      {/* Meta row */}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <div className="text-txt-muted mb-0.5">Compression</div>
          <div className="font-mono text-txt-primary">
            {device.compression_ratio ?? '—'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-txt-muted mb-0.5">Last Report</div>
          <div className="font-mono text-txt-primary">
            {formatDate(device.latest_report_date)}
          </div>
        </div>
        {device.location && (
          <div className="col-span-2">
            <span className="text-txt-muted">Location: </span>
            <span className="text-txt-primary">{device.location}</span>
          </div>
        )}
      </div>
    </Link>
  )
}
