import Link from 'next/link'
import type { DeviceOverviewItem } from '@/types/dashboard'

type StatusCls = 'ok' | 'wa' | 'cr'

function getStatus(d: DeviceOverviewItem): StatusCls {
  if (d.device_status === 'critical') return 'cr'
  if (d.device_status === 'warning')  return 'wa'
  return 'ok'
}

const BADGE_STYLES: Record<StatusCls, React.CSSProperties> = {
  ok: { background: 'var(--green-bg)', color: 'var(--green)', borderColor: 'rgba(34,197,94,.2)' },
  wa: { background: 'var(--amber-bg)', color: 'var(--amber)', borderColor: 'rgba(245,158,11,.2)' },
  cr: { background: 'var(--red-bg)',   color: 'var(--red)',   borderColor: 'rgba(239,68,68,.2)' },
}

const BADGE_LABEL: Record<StatusCls, string> = { ok: 'online', wa: 'warning', cr: 'critical' }

const DOT_COLOR: Record<StatusCls, string> = {
  ok: 'var(--green)',
  wa: 'var(--amber)',
  cr: 'var(--red)',
}

const IBAR_COLOR: Record<StatusCls, string> = {
  ok: 'var(--green)',
  wa: 'var(--amber)',
  cr: 'var(--red)',
}

function relTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime()
    const mins = Math.round(diffMs / 60_000)
    if (mins < 60) return `${mins}m`
    return `${Math.round(mins / 60)}h`
  } catch { return '—' }
}

interface DomainStatusTableProps {
  devices: DeviceOverviewItem[]
}

export function DomainStatusTable({ devices }: DomainStatusTableProps) {
  const th: React.CSSProperties = { fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', padding: '8px 12px', borderBottom: '1px solid var(--line)', textAlign: 'left' }
  const td: React.CSSProperties = { padding: '9px 12px', borderBottom: '1px solid var(--line)', fontSize: 11.5 }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={th}>domain</th>
          <th style={th}>status</th>
          <th style={th}>used</th>
          <th style={th}>util</th>
          <th style={th}>seen</th>
        </tr>
      </thead>
      <tbody>
        {devices.map(d => {
          const cls = getStatus(d)
          const pct = d.storage_used_percent ?? 0
          const animCls = cls === 'cr' ? 'anim-cr-pulse' : cls === 'wa' ? 'anim-wa-pulse' : ''
          return (
            <tr key={d.id} style={{ cursor: 'pointer' }}>
              <td style={td}>
                <Link href={`/devices/${d.id}`} style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 500, fontFamily: 'var(--font-geist-mono),monospace', fontSize: 11, textDecoration: 'none', color: 'inherit' }}>
                  <span className={animCls} style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: DOT_COLOR[cls] }} />
                  {d.hostname}
                </Link>
              </td>
              <td style={td}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 2, fontSize: 10, fontFamily: 'var(--font-geist-mono),monospace', fontWeight: 500, border: '1px solid', ...BADGE_STYLES[cls] }}>
                  {BADGE_LABEL[cls]}
                </span>
              </td>
              <td style={{ ...td, fontFamily: 'var(--font-geist-mono),monospace', fontSize: 10.5, color: 'var(--sub)' }}>
                {d.storage_used_percent != null ? `${d.storage_used_percent}%` : '—'}
              </td>
              <td style={td}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 70, height: 3, background: 'var(--bg4)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: 3, borderRadius: 2, width: `${pct}%`, background: IBAR_COLOR[cls] }} />
                  </div>
                  <span style={{ fontSize: 10.5, fontFamily: 'var(--font-geist-mono),monospace', fontWeight: 500, color: IBAR_COLOR[cls] }}>{pct}%</span>
                </div>
              </td>
              <td style={{ ...td, fontFamily: 'var(--font-geist-mono),monospace', fontSize: 10, color: 'var(--muted)' }}>
                {relTime(d.latest_report_date)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
