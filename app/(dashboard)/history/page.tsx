'use client'
import { useState } from 'react'
import { useDevices }        from '@/lib/hooks/use-devices'
import { useDeviceHistory }  from '@/lib/hooks/use-device-history'
import { useStorageRunway }  from '@/lib/hooks/use-storage-runway'
import { ErrorState }        from '@/components/ui/ErrorState'
import { LineChart }         from '@/components/charts/LineChart'
import type { HistoryChartPoint } from '@/types/dashboard'

const RANGE_OPTS = [
  { label: '7d',  value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 40 },
]

const PANEL: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }
const PANEL_HEAD: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--line)' }
const PANEL_TITLE: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--sub)', fontFamily: 'var(--font-geist-mono),monospace', textTransform: 'uppercase', letterSpacing: '.6px' }

function toChartData(points: HistoryChartPoint[], key: keyof HistoryChartPoint): { labels: string[]; data: number[] } {
  return {
    labels: points.map(p => p.date.slice(5)),
    data:   points.map(p => (p[key] as number | null) ?? 0),
  }
}

export default function HistoryPage() {
  const [rangeDays, setRangeDays] = useState(30)
  const [deviceId, setDeviceId]  = useState<string | null>(null)

  const { devices, isLoading: devLoading } = useDevices()
  const { data, isLoading, error }         = useDeviceHistory(deviceId, rangeDays)
  const { runway }                         = useStorageRunway()

  const totalUsed = devices.reduce((s, d) => s + (d.storage_used_percent ?? 0), 0)
  const avgUtil   = devices.length ? (totalUsed / devices.length).toFixed(1) : '—'
  const totalPct  = devices.length ? ((totalUsed / devices.length)).toFixed(1) : '—'

  const statStyle: React.CSSProperties = { padding: '16px 18px', borderRight: '1px solid var(--line)', position: 'relative', overflow: 'hidden' }
  const bigNum = (val: string, color: string, unit?: string) => (
    <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-1.5px', fontFamily: 'var(--font-geist-mono),monospace', lineHeight: 1, color }}>
      {val}{unit && <span style={{ fontSize: 13, color: 'var(--muted)' }}> {unit}</span>}
    </div>
  )

  const cmpItems = devices.map(d => ({
    name:  d.hostname.replace(/^DD-?/i, ''),
    pct:   d.storage_used_percent ?? 0,
    color: d.device_status === 'critical' ? 'var(--red)' : d.device_status === 'warning' ? 'var(--amber)' : 'var(--green)',
  }))

  return (
    <div className="anim-fadein">
      <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-.5px', color: 'var(--text)' }}>Storage</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', marginTop: 3 }}>
            historical utilization · {rangeDays}d window
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {RANGE_OPTS.map(o => (
            <button key={o.value} onClick={() => setRangeDays(o.value)} style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 10px', borderRadius: 'var(--r)', fontSize: 11.5, fontWeight: 500, cursor: 'pointer', border: `1px solid ${rangeDays === o.value ? 'var(--accent)' : 'var(--line)'}`, background: rangeDays === o.value ? 'var(--accent)' : 'var(--bg2)', color: rangeDays === o.value ? '#fff' : 'var(--sub)' }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {(() => {
        const rm = runway?.runway_months
        const runwayColor = rm == null ? 'var(--muted)' : rm < 3 ? 'var(--red)' : rm < 6 ? 'var(--amber)' : 'var(--green)'
        const runwayLabel = rm == null ? '—' : `~${rm}`
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden', margin: '0 24px 14px' }}>
            <div style={statStyle}><div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>Devices</div>{bigNum(String(devices.length), 'var(--text)')}</div>
            <div style={statStyle}><div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>Avg Used</div>{bigNum(avgUtil, 'var(--accent2)', '%')}</div>
            <div style={statStyle}><div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>Critical</div>{bigNum(String(devices.filter(d => d.device_status === 'critical').length), 'var(--red)')}</div>
            <div style={{ ...statStyle, borderRight: 'none' }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>Est. Runway</div>
              {bigNum(runwayLabel, runwayColor, rm != null ? ' mo' : undefined)}
              <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 6, fontFamily: 'var(--font-geist-mono),monospace' }}>at current growth</div>
              {rm != null && rm < 6 && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontFamily: 'var(--font-geist-mono),monospace', padding: '2px 6px', borderRadius: 2, marginTop: 6, fontWeight: 500, background: rm < 3 ? 'var(--red-bg)' : 'var(--amber-bg)', color: rm < 3 ? 'var(--red)' : 'var(--amber)' }}>
                  {rm < 3 ? '↑ act now' : '↑ rising'}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '0 24px 14px' }}>
        {/* Line chart for selected device */}
        <div style={PANEL}>
          <div style={PANEL_HEAD}>
            <div style={PANEL_TITLE}>used_%_trend</div>
            <select
              value={deviceId ?? ''}
              onChange={e => setDeviceId(e.target.value || null)}
              style={{ fontSize: 10.5, color: 'var(--sub)', fontFamily: 'var(--font-geist-mono),monospace', background: 'var(--bg3)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '2px 6px', cursor: 'pointer' }}
            >
              <option value="">Select device…</option>
              {!devLoading && devices.map(d => <option key={d.id} value={d.id}>{d.hostname}</option>)}
            </select>
          </div>
          <div style={{ padding: '12px 14px' }}>
            {!deviceId && <div style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: '40px 0' }}>Select a device above</div>}
            {deviceId && isLoading && <div style={{ color: 'var(--muted)', fontSize: 12, padding: '40px 0', textAlign: 'center' }}>Loading…</div>}
            {deviceId && error && <ErrorState message="Failed to load history" />}
            {deviceId && !isLoading && !error && data && (() => {
              const { labels, data: vals } = toChartData(data, 'storage_used_percent')
              return <LineChart labels={labels} datasets={[{ data: vals, color: '#3B82F6' }]} yMin={0} yMax={100} unit="%" height={200} />
            })()}
          </div>
        </div>

        {/* Capacity comparison bars */}
        <div style={PANEL}>
          <div style={PANEL_HEAD}><div style={PANEL_TITLE}>capacity_cmp</div></div>
          <div style={{ padding: '12px 14px' }}>
            {cmpItems.map(item => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 10.5, fontFamily: 'var(--font-geist-mono),monospace', color: 'var(--sub)', width: 78, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                <div style={{ flex: 1, height: 18, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden', border: '1px solid var(--line)' }}>
                  <div style={{ height: '100%', width: `${item.pct}%`, background: item.color, display: 'flex', alignItems: 'center', paddingLeft: 6 }}>
                    <span style={{ fontSize: 9.5, fontFamily: 'var(--font-geist-mono),monospace', color: '#fff', fontWeight: 600 }}>{item.pct}%</span>
                  </div>
                </div>
                <span style={{ fontSize: 9.5, fontFamily: 'var(--font-geist-mono),monospace', color: 'var(--muted)', width: 40, textAlign: 'right', flexShrink: 0 }}>{item.pct}%</span>
              </div>
            ))}
            {cmpItems.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: '40px 0' }}>No devices</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
