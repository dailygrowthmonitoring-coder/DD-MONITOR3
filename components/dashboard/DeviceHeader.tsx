import { StatusDot } from '@/components/ui/StatusDot'
import type { ReportMeta } from '@/types/dd-report'
import type { DeviceStatus } from '@/types/dashboard'
import { DATA_RETENTION_DAYS } from '@/lib/constants/ui'
import { subDays, format } from 'date-fns'

interface DeviceHeaderProps {
  meta: ReportMeta
  deviceStatus: DeviceStatus
  reportDate: string
  onDateChange: (date: string) => void
}

export function DeviceHeader({
  meta,
  deviceStatus,
  reportDate,
  onDateChange,
}: DeviceHeaderProps) {
  const today   = format(new Date(), 'yyyy-MM-dd')
  const minDate = format(subDays(new Date(), DATA_RETENTION_DAYS), 'yyyy-MM-dd')

  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
      <div className="min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <StatusDot status={deviceStatus} />
          <h1 className="text-xl font-bold text-txt-primary font-mono truncate">
            {meta.hostname}
          </h1>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-txt-muted">
          {meta.model        && <span>Model: <span className="text-txt-primary font-mono">{meta.model}</span></span>}
          {meta.serial_number && <span>S/N: <span className="text-txt-primary font-mono">{meta.serial_number}</span></span>}
          {meta.location     && <span>Location: <span className="text-txt-primary">{meta.location}</span></span>}
          {meta.uptime_days !== null && <span>Uptime: <span className="text-txt-primary font-mono">{meta.uptime_days}d</span></span>}
          {meta.os_version   && <span className="truncate max-w-xs"><span className="text-txt-primary font-mono">{meta.os_version}</span></span>}
        </div>
      </div>

      {/* Date picker */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <label htmlFor="report-date" className="text-xs text-txt-muted">
          Report Date
        </label>
        <input
          id="report-date"
          type="date"
          value={reportDate}
          min={minDate}
          max={today}
          onChange={e => onDateChange(e.target.value)}
          className="bg-app-card border border-app-border text-txt-primary text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-accent/50 font-mono"
        />
      </div>
    </div>
  )
}
