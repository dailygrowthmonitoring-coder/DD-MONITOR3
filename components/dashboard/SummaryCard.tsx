interface SummaryCardProps {
  label: string
  value: number | string
  variant?: 'default' | 'critical' | 'warning' | 'muted'
  mono?: boolean
}

const COLORS: Record<string, string> = {
  default:  '#AADD00',
  critical: '#FF4444',
  warning:  '#F5A623',
  muted:    '#6B6B80',
}

export function SummaryCard({
  label,
  value,
  variant = 'default',
  mono = true,
}: SummaryCardProps) {
  const color = COLORS[variant] ?? COLORS.default

  return (
    <div className="bg-app-card border border-app-border rounded-lg p-5">
      <div className="text-xs font-medium text-txt-muted uppercase tracking-widest mb-3">
        {label}
      </div>
      <div
        className={`font-bold leading-none ${
          typeof value === 'number' ? 'text-3xl' : 'text-base'
        } ${mono ? 'font-mono' : ''}`}
        style={{ color }}
      >
        {value}
      </div>
    </div>
  )
}
