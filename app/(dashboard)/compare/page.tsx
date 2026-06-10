'use client'
import { useState } from 'react'
import { format, subDays } from 'date-fns'
import { useDevices } from '@/lib/hooks/use-devices'
import { useCompare } from '@/lib/hooks/use-compare'
import { ErrorState }  from '@/components/ui/ErrorState'
import { DATA_RETENTION_DAYS } from '@/lib/constants/ui'

const today   = format(new Date(), 'yyyy-MM-dd')
const minDate = format(subDays(new Date(), DATA_RETENTION_DAYS), 'yyyy-MM-dd')

const PANEL: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }
const PANEL_HEAD: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--line)' }
const PANEL_TITLE: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--sub)', fontFamily: 'var(--font-geist-mono),monospace', textTransform: 'uppercase', letterSpacing: '.6px' }
const TH: React.CSSProperties = { fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', padding: '8px 12px', borderBottom: '1px solid var(--line)', textAlign: 'left' }
const TD: React.CSSProperties = { padding: '9px 12px', borderBottom: '1px solid var(--line)', fontSize: 11.5 }

export default function ComparePage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [date, setDate]               = useState(today)

  const { devices, isLoading: devLoading } = useDevices()
  const { data, isLoading, error }          = useCompare(selectedIds, selectedIds.length > 0 ? date : null)

  function toggleDevice(id: string) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 5 ? [...prev, id] : prev
    )
  }

  return (
    <div className="anim-fadein">
      <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-.5px', color: 'var(--text)' }}>Backup Health</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', marginTop: 3 }}>
            job success rates · daily performance
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden', margin: '0 24px 14px' }}>
        {[
          { label: 'Total Devices',  val: String(devices.length), color: 'var(--text)' },
          { label: 'Critical',       val: String(devices.filter(d => d.device_status === 'critical').length), color: 'var(--red)' },
          { label: 'Warning',        val: String(devices.filter(d => d.device_status === 'warning').length), color: 'var(--amber)' },
          { label: 'Healthy',        val: String(devices.filter(d => d.device_status === 'healthy').length), color: 'var(--green)' },
        ].map((s, i, arr) => (
          <div key={s.label} style={{ padding: '16px 18px', borderRight: i < arr.length - 1 ? '1px solid var(--line)' : 'none', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,var(--line2),transparent)' }} />
            <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-1.5px', fontFamily: 'var(--font-geist-mono),monospace', lineHeight: 1, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 24px 14px' }}>
        {/* Device selector */}
        <div style={PANEL}>
          <div style={PANEL_HEAD}>
            <div style={PANEL_TITLE}>select_devices</div>
            <input type="date" value={date} min={minDate} max={today} onChange={e => setDate(e.target.value)}
              style={{ fontSize: 10.5, color: 'var(--sub)', fontFamily: 'var(--font-geist-mono),monospace', background: 'var(--bg3)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '2px 6px' }}
            />
          </div>
          <div style={{ padding: '12px 14px' }}>
            {devLoading && <div style={{ color: 'var(--muted)', fontSize: 12 }}>Loading…</div>}
            {!devLoading && devices.map(d => {
              const checked = selectedIds.includes(d.id)
              return (
                <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleDevice(d.id)} style={{ accentColor: 'var(--accent)' }} />
                  <span style={{ fontSize: 11.5, fontFamily: 'var(--font-geist-mono),monospace', color: checked ? 'var(--text)' : 'var(--sub)' }}>
                    {d.hostname}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'var(--font-geist-mono),monospace', color: 'var(--muted)' }}>
                    {d.storage_used_percent != null ? `${d.storage_used_percent}%` : '—'}
                  </span>
                </label>
              )
            })}
            {!devLoading && devices.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 12 }}>No devices</div>}
          </div>
        </div>

        {/* Comparison table */}
        <div style={PANEL}>
          <div style={PANEL_HEAD}><div style={PANEL_TITLE}>by_domain · {date}</div></div>
          {selectedIds.length === 0 && (
            <div style={{ padding: '40px 14px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Select devices to compare</div>
          )}
          {selectedIds.length > 0 && isLoading && (
            <div style={{ padding: '40px 14px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Loading…</div>
          )}
          {selectedIds.length > 0 && error && <div style={{ padding: '12px 14px' }}><ErrorState message="Failed to load comparison" /></div>}
          {selectedIds.length > 0 && !isLoading && !error && data && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr><th style={TH}>domain</th><th style={TH}>storage</th><th style={TH}>compression</th><th style={TH}>alerts</th></tr>
              </thead>
              <tbody>
                {data.map(r => {
                  const dev = devices.find(d => d.id === r.device_id)
                  const pct    = r.storage_used_percent ?? 0
                  const comp   = r.compression_factor !== null ? `${r.compression_factor}x` : '—'
                  const alerts = r.active_alerts
                  return (
                    <tr key={r.id}>
                      <td style={TD}><span style={{ fontFamily: 'var(--font-geist-mono),monospace', fontSize: 11, color: 'var(--text2)' }}>{dev?.hostname ?? r.device_id.slice(0, 8)}</span></td>
                      <td style={TD}><span style={{ fontFamily: 'var(--font-geist-mono),monospace', fontSize: 11, color: pct > 90 ? 'var(--red)' : pct > 80 ? 'var(--amber)' : 'var(--text2)' }}>{pct}%</span></td>
                      <td style={TD}><span style={{ fontFamily: 'var(--font-geist-mono),monospace', fontSize: 11, color: 'var(--sub)' }}>{String(comp)}</span></td>
                      <td style={TD}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 2, fontSize: 10, fontFamily: 'var(--font-geist-mono),monospace', fontWeight: 500, border: '1px solid', background: alerts > 0 ? 'var(--red-bg)' : 'var(--green-bg)', color: alerts > 0 ? 'var(--red)' : 'var(--green)', borderColor: alerts > 0 ? 'rgba(239,68,68,.2)' : 'rgba(34,197,94,.2)' }}>{alerts}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
