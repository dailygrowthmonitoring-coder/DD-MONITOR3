import { STORAGE_WARNING_THRESHOLD, STORAGE_CRITICAL_THRESHOLD } from '@/lib/constants/ui'

interface StorageBarProps {
  percent: number | null
  showLabel?: boolean
}

function getBarColor(pct: number): string {
  if (pct >= STORAGE_CRITICAL_THRESHOLD) return '#FF4444'
  if (pct >= STORAGE_WARNING_THRESHOLD)  return '#F5A623'
  return '#AADD00'
}

export function StorageBar({ percent, showLabel = true }: StorageBarProps) {
  if (percent === null) {
    return (
      <div className="space-y-1">
        {showLabel && (
          <div className="flex justify-between text-xs">
            <span className="text-txt-muted">Storage</span>
            <span className="font-mono text-txt-muted">—</span>
          </div>
        )}
        <div className="h-1.5 bg-app-border rounded-full" />
      </div>
    )
  }

  const color = getBarColor(percent)
  const capped = Math.min(percent, 100)

  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex justify-between text-xs">
          <span className="text-txt-muted">Storage</span>
          <span className="font-mono font-semibold" style={{ color }}>
            {percent}%
          </span>
        </div>
      )}
      <div className="h-1.5 bg-app-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${capped}%`, backgroundColor: color }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Storage ${percent}% used`}
        />
      </div>
    </div>
  )
}
