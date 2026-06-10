import { Card } from '@/components/ui/Card'
import { formatDatetime } from '@/lib/utils/format'
import type { CompressionData } from '@/types/dd-report'

interface CompressionSectionProps {
  compression: CompressionData
}

interface RatioBlockProps {
  label: string
  ratio: number
  reduction: number
  accent?: boolean
}

function RatioBlock({ label, ratio, reduction, accent = false }: RatioBlockProps) {
  return (
    <div className="bg-app-bg rounded-lg p-4 text-center">
      <div className="text-xs text-txt-muted uppercase tracking-widest mb-2">{label}</div>
      <div
        className="font-mono text-2xl font-bold"
        style={{ color: accent ? '#AADD00' : '#F0F0F5' }}
      >
        {ratio}x
      </div>
      <div className="text-xs text-txt-muted mt-1">{reduction}% reduction</div>
    </div>
  )
}

export function CompressionSection({ compression }: CompressionSectionProps) {
  const { currently_used, last_7_days, last_24_hours, period_from, period_to } = compression

  return (
    <Card title="Compression">
      <div className="p-5">
        <div className="text-xs text-txt-muted mb-4 font-mono">
          Period: {formatDatetime(period_from)} → {formatDatetime(period_to)}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <RatioBlock
            label="Currently Used"
            ratio={currently_used.total_factor}
            reduction={currently_used.reduction_percent}
            accent
          />
          <RatioBlock
            label="Last 7 Days"
            ratio={last_7_days.total_factor}
            reduction={last_7_days.reduction_percent}
          />
          <RatioBlock
            label="Last 24 Hours"
            ratio={last_24_hours.total_factor}
            reduction={last_24_hours.reduction_percent}
          />
        </div>
      </div>
    </Card>
  )
}
