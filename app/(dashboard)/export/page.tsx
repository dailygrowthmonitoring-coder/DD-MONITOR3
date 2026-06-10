'use client'
import { useState } from 'react'
import { format, subDays } from 'date-fns'
import { useDevices } from '@/lib/hooks/use-devices'
import { DATA_RETENTION_DAYS } from '@/lib/constants/ui'

const today   = format(new Date(), 'yyyy-MM-dd')
const minDate = format(subDays(new Date(), DATA_RETENTION_DAYS), 'yyyy-MM-dd')

const FORMAT_OPTS = [
  { label: 'CSV',  val: 'csv',  desc: 'Comma-separated, opens in Excel' },
  { label: 'JSON', val: 'json', desc: 'Structured data for integrations' },
  { label: 'PDF',  val: 'pdf',  desc: 'Formatted report for printing' },
]
const DATA_OPTS = [
  { label: 'Storage Snapshots', val: 'storage' },
  { label: 'Compression Stats', val: 'compression' },
  { label: 'Alerts',            val: 'alerts' },
  { label: 'System Logs',       val: 'logs' },
  { label: 'Full Report',       val: 'full' },
]

const PANEL: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }
const PANEL_HEAD: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--line)' }
const PANEL_TITLE: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--sub)', fontFamily: 'var(--font-geist-mono),monospace', textTransform: 'uppercase', letterSpacing: '.6px' }
const FIELD_LABEL: React.CSSProperties = { fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }
const INPUT: React.CSSProperties = { height: 32, borderRadius: 'var(--r)', border: '1px solid var(--line)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 12, padding: '0 10px', fontFamily: 'var(--font-geist-mono),monospace', outline: 'none', width: '100%' }

export default function ExportPage() {
  const [device, setDevice]   = useState<string>('all')
  const [from,   setFrom]     = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'))
  const [to,     setTo]       = useState(today)
  const [fmt,    setFmt]      = useState('csv')
  const [dtype,  setDtype]    = useState('storage')

  const { devices, isLoading } = useDevices()

  const selectedDevice = device === 'all' ? `All (${devices.length})` : (devices.find(d => d.id === device)?.hostname ?? device.slice(0, 8))
  const selectedData   = DATA_OPTS.find(o => o.val === dtype)?.label ?? dtype

  return (
    <div className="anim-fadein">
      <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-.5px', color: 'var(--text)' }}>Export</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', marginTop: 3 }}>
            download device reports and metrics
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div style={{ margin: '0 24px 14px', padding: '10px 14px', background: 'var(--blue-bg)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 'var(--r)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ color: 'var(--blue)', fontSize: 14, lineHeight: '18px', flexShrink: 0 }}>ℹ</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 2 }}>Export coming in Phase 8</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Configure parameters below — the download endpoint will be wired up in the next release.</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 24px 14px' }}>
        {/* Scope */}
        <div style={PANEL}>
          <div style={PANEL_HEAD}><div style={PANEL_TITLE}>scope</div></div>
          <div style={{ padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={FIELD_LABEL}>device</div>
              <select value={device} onChange={e => setDevice(e.target.value)} style={{ ...INPUT }}>
                <option value="all">All Devices</option>
                {!isLoading && devices.map(d => (
                  <option key={d.id} value={d.id}>{d.hostname}{d.location ? ` (${d.location})` : ''}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={FIELD_LABEL}>from</div>
                <input type="date" value={from} min={minDate} max={to} onChange={e => setFrom(e.target.value)} style={{ ...INPUT }} />
              </div>
              <div>
                <div style={FIELD_LABEL}>to</div>
                <input type="date" value={to} min={from} max={today} onChange={e => setTo(e.target.value)} style={{ ...INPUT }} />
              </div>
            </div>
          </div>
        </div>

        {/* Format */}
        <div style={PANEL}>
          <div style={PANEL_HEAD}><div style={PANEL_TITLE}>format &amp; data</div></div>
          <div style={{ padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={FIELD_LABEL}>export format</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {FORMAT_OPTS.map(o => (
                  <label key={o.val} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 'var(--r)', border: `1px solid ${fmt === o.val ? 'var(--accent)' : 'var(--line)'}`, background: fmt === o.val ? 'var(--accent-glow)' : 'var(--bg3)', cursor: 'pointer' }}>
                    <input type="radio" name="fmt" value={o.val} checked={fmt === o.val} onChange={() => setFmt(o.val)} style={{ accentColor: 'var(--accent)', flexShrink: 0 }} />
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', fontFamily: 'var(--font-geist-mono),monospace' }}>{o.label}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--muted)', marginLeft: 8 }}>{o.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <div style={FIELD_LABEL}>data type</div>
              <select value={dtype} onChange={e => setDtype(e.target.value)} style={{ ...INPUT }}>
                {DATA_OPTS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={{ padding: '0 24px 20px' }}>
        <div style={PANEL}>
          <div style={PANEL_HEAD}><div style={PANEL_TITLE}>summary</div></div>
          <div style={{ padding: '14px 14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { k: 'device',     v: selectedDevice },
                { k: 'date_range', v: `${from} → ${to}` },
                { k: 'format',     v: fmt.toUpperCase() },
                { k: 'data',       v: selectedData },
              ].map(kv => (
                <div key={kv.k}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{kv.k}</div>
                  <div style={{ fontSize: 12, fontFamily: 'var(--font-geist-mono),monospace', color: 'var(--text2)' }}>{kv.v}</div>
                </div>
              ))}
            </div>
            <button disabled style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 'var(--r)', fontSize: 12, fontWeight: 500, border: '1px solid var(--line)', background: 'var(--bg3)', color: 'var(--muted)', cursor: 'not-allowed', opacity: .6 }}>
              ↓ Download Export <span style={{ fontSize: 10, opacity: .7 }}>(Phase 8)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
