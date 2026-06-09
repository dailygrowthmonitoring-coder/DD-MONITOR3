interface SeverityBadgeProps {
  severity: string
}

const STYLES: Record<string, { bg: string; color: string }> = {
  CRITICAL: { bg: 'rgba(255,68,68,0.15)',    color: '#FF4444' },
  WARNING:  { bg: 'rgba(245,166,35,0.15)',   color: '#F5A623' },
  INFO:     { bg: 'rgba(41,121,255,0.15)',   color: '#2979FF' },
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const s = STYLES[severity] ?? { bg: 'rgba(107,107,128,0.15)', color: '#6B6B80' }
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-semibold font-mono whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {severity}
    </span>
  )
}
