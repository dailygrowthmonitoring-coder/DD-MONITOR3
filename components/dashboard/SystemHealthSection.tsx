import { Card } from '@/components/ui/Card'
import { formatDate, formatMib } from '@/lib/utils/format'
import type { SystemHealthData } from '@/types/dd-report'

interface SystemHealthSectionProps {
  health: SystemHealthData
}

interface MetricProps {
  label: string
  value: string
  valueColor?: string
}

function Metric({ label, value, valueColor }: MetricProps) {
  return (
    <div>
      <div className="text-xs text-txt-muted mb-0.5">{label}</div>
      <div
        className="font-mono text-sm"
        style={{ color: valueColor ?? '#F0F0F5' }}
      >
        {value}
      </div>
    </div>
  )
}

function serviceColor(val: string | null, activeWord: string): string {
  if (!val) return '#6B6B80'
  return val.toLowerCase() === activeWord ? '#00C853' : '#6B6B80'
}

export function SystemHealthSection({ health }: SystemHealthSectionProps) {
  return (
    <Card title="System Health">
      <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4">
        <Metric
          label="Available Since"
          value={formatDate(health.availability_since)}
        />
        <Metric
          label="System Availability"
          value={health.system_avail_pct !== null ? `${health.system_avail_pct}%` : '—'}
          valueColor={
            health.system_avail_pct === 100 ? '#00C853' :
            health.system_avail_pct !== null && health.system_avail_pct < 99 ? '#FF4444' :
            '#F0F0F5'
          }
        />
        <Metric
          label="FS Availability"
          value={health.filesystem_avail_pct !== null ? `${health.filesystem_avail_pct}%` : '—'}
          valueColor={health.filesystem_avail_pct === 100 ? '#00C853' : '#F0F0F5'}
        />
        <Metric
          label="Memory Total"
          value={formatMib(health.memory_total_mib)}
        />
        <Metric
          label="Memory Free"
          value={formatMib(health.memory_free_mib)}
        />
        <Metric
          label="Swap Total"
          value={formatMib(health.swap_total_mib)}
        />
        <Metric
          label="Swap Free"
          value={formatMib(health.swap_free_mib)}
        />
        <Metric
          label="NFS Status"
          value={health.nfs_status ?? '—'}
          valueColor={serviceColor(health.nfs_status, 'active')}
        />
        <Metric
          label="CIFS Status"
          value={health.cifs_status ?? '—'}
          valueColor={serviceColor(health.cifs_status, 'enabled')}
        />
      </div>
    </Card>
  )
}
