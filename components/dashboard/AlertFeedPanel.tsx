import Link from 'next/link'
import type { AlertListItem } from '@/types/dashboard'

type SevCls = 'cr' | 'wa' | 'in'

function getSevCls(severity: string): SevCls {
  if (severity === 'CRITICAL') return 'cr'
  if (severity === 'WARNING')  return 'wa'
  return 'in'
}

const BAR_COLOR: Record<SevCls, string> = {
  cr: 'var(--red)',
  wa: 'var(--amber)',
  in: 'var(--blue)',
}

function relTime(iso: string): string {
  try {
    const diffMs = Date.now() - new Date(iso).getTime()
    const mins = Math.round(diffMs / 60_000)
    if (mins < 60) return `${mins}m ago`
    return `${Math.round(mins / 60)}h ago`
  } catch { return '' }
}

interface AlertFeedPanelProps {
  alerts: AlertListItem[]
}

export function AlertFeedPanel({ alerts }: AlertFeedPanelProps) {
  const display = alerts.slice(0, 4)
  return (
    <div>
      {display.length === 0 && (
        <div style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: 12 }}>No active alerts</div>
      )}
      {display.map(alert => {
        const cls = getSevCls(alert.severity)
        return (
          <div key={alert.id} style={{ display: 'flex', gap: 10, padding: '9px 14px', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}>
            <div style={{ width: 2, borderRadius: 1, flexShrink: 0, alignSelf: 'stretch', background: BAR_COLOR[cls] }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 2 }}>
                {alert.message.length > 60 ? alert.message.slice(0, 60) + '…' : alert.message}
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace' }}>
                {relTime(alert.created_at)} · {alert.class ?? alert.severity}
              </div>
            </div>
          </div>
        )
      })}
      <div style={{ padding: '8px 14px', borderTop: '1px solid var(--line)' }}>
        <Link href="/alerts" style={{ fontSize: 11, color: 'var(--sub)', textDecoration: 'none' }}>
          all alerts →
        </Link>
      </div>
    </div>
  )
}
