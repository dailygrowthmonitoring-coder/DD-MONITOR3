import { Card } from '@/components/ui/Card'
import { StorageDonutChart } from '@/components/charts/StorageDonutChart'
import { formatGib } from '@/lib/utils/format'
import type { StorageData } from '@/types/dd-report'

interface StorageSectionProps {
  storage: StorageData
}

interface StatRowProps {
  label: string
  value: string
}

function StatRow({ label, value }: StatRowProps) {
  return (
    <div>
      <div className="text-xs text-txt-muted mb-0.5">{label}</div>
      <div className="font-mono text-sm text-txt-primary">{value}</div>
    </div>
  )
}

export function StorageSection({ storage }: StorageSectionProps) {
  return (
    <Card title="Storage">
      <div className="p-5 flex flex-col sm:flex-row items-center gap-8">
        <StorageDonutChart
          usedGib={storage.used_gib ?? 0}
          totalGib={storage.total_gib ?? 0}
          usedPercent={storage.used_percent ?? 0}
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 flex-1">
          <StatRow label="Total"     value={formatGib(storage.total_gib)}     />
          <StatRow label="Used"      value={formatGib(storage.used_gib)}      />
          <StatRow label="Available" value={formatGib(storage.available_gib)} />
          <StatRow
            label="Cleanable"
            value={storage.cleanable_gib !== null ? formatGib(storage.cleanable_gib) : '—'}
          />
          <StatRow label="Pre-Comp"  value={formatGib(storage.pre_comp_gib)}  />
          {storage.last_cleaning_at && (
            <StatRow label="Last Cleaned" value={storage.last_cleaning_at.substring(0, 10)} />
          )}
        </div>
      </div>
    </Card>
  )
}
