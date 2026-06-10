import type { DeviceOverviewItem } from '@/types/dashboard'

type StatusCls = 'ok' | 'wa' | 'cr'

function getStatus(d: DeviceOverviewItem): StatusCls {
  if (d.device_status === 'critical') return 'cr'
  if (d.device_status === 'warning')  return 'wa'
  return 'ok'
}

const PCT_COLOR: Record<StatusCls, string> = {
  ok: 'var(--text2)',
  wa: 'var(--amber)',
  cr: 'var(--red)',
}

const FILL_COLOR: Record<StatusCls, string> = {
  ok: 'var(--green)',
  wa: 'var(--amber)',
  cr: 'var(--red)',
}

const BORDER_COLOR: Record<StatusCls, string> = {
  ok: 'var(--green)',
  wa: 'var(--amber)',
  cr: 'var(--red)',
}

const BK_COLOR: Record<StatusCls, string> = {
  ok: 'var(--green-dim)',
  wa: 'var(--amber-dim)',
  cr: 'var(--red-dim)',
}

interface DomainTileProps {
  device: DeviceOverviewItem
  onClick?: () => void
}

export function DomainTile({ device, onClick }: DomainTileProps) {
  const cls     = getStatus(device)
  const pct     = device.storage_used_percent ?? 0
  const shortName = device.hostname.replace(/^DD-?/i, '')

  const totalOk  = device.active_alerts_critical === 0 && device.active_alerts_warning === 0
  const backupLabel = totalOk
    ? `${shortName} ✓`
    : `${device.active_alerts_critical}cr · ${device.active_alerts_warning}wa`

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 'var(--r)',
        padding: '10px 12px', cursor: 'pointer', position: 'relative', overflow: 'hidden',
        borderTop: `2px solid ${BORDER_COLOR[cls]}`,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-geist-mono),monospace', color: 'var(--sub)', marginBottom: 7, letterSpacing: '.3px' }}>
        {shortName}
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--font-geist-mono),monospace', letterSpacing: '-1px', lineHeight: 1, marginBottom: 6, color: PCT_COLOR[cls] }}>
        {pct}%
      </div>
      <div style={{ height: 2, background: 'var(--bg4)', borderRadius: 1, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ height: 2, borderRadius: 1, width: `${pct}%`, background: FILL_COLOR[cls] }} />
      </div>
      <div style={{ fontSize: 9.5, fontFamily: 'var(--font-geist-mono),monospace', color: BK_COLOR[cls] }}>
        {backupLabel}
      </div>
    </div>
  )
}
