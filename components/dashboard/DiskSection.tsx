import { Card } from '@/components/ui/Card'
import type { DiskData } from '@/types/dd-report'

interface DiskSectionProps {
  disks: DiskData
}

interface DiskStatProps {
  label: string
  value: number | string | null
}

function DiskStat({ label, value }: DiskStatProps) {
  return (
    <div className="bg-app-bg rounded-lg p-3 text-center">
      <div className="text-xs text-txt-muted mb-1">{label}</div>
      <div className="font-mono text-xl font-bold text-txt-primary">
        {value ?? '—'}
      </div>
    </div>
  )
}

export function DiskSection({ disks }: DiskSectionProps) {
  const { summary, proactive_check } = disks
  const isNormal = summary.overall_status.toLowerCase() === 'normal'

  return (
    <Card title="Disk Summary">
      <div className="p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <DiskStat label="Active In Use"  value={summary.active_tier_in_use}    />
          <DiskStat label="Active Spare"   value={summary.active_tier_spare}     />
          <DiskStat label="Active Total"   value={summary.active_tier_total}     />
          <DiskStat label="Cache In Use"   value={summary.cache_tier_in_use}     />
        </div>

        <div className="flex items-center gap-2 text-sm mb-3">
          <span className="text-txt-muted text-xs">Overall Status:</span>
          <span
            className="text-sm font-semibold font-mono"
            style={{ color: isNormal ? '#00C853' : '#FF4444' }}
            aria-label={`Overall disk status: ${summary.overall_status}`}
          >
            {summary.overall_status}
          </span>
        </div>

        {proactive_check && (
          <div className="text-xs text-txt-muted bg-app-bg rounded-md px-3 py-2 font-mono">
            {proactive_check}
          </div>
        )}
      </div>
    </Card>
  )
}
