'use client'
import { useState } from 'react'
import { useLogs } from '@/lib/hooks/use-logs'
import { ErrorState } from '@/components/ui/ErrorState'
import type { LogItem } from '@/types/dashboard'

const PAGE_SIZE = 40
const SEV_OPTS = [
  { label: 'All',     val: '' },
  { label: 'Error',   val: 'ERROR' },
  { label: 'Warning', val: 'WARNING' },
  { label: 'Info',    val: 'INFO' },
]

const PANEL: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }
const PANEL_HEAD: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--line)' }
const PANEL_TITLE: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--sub)', fontFamily: 'var(--font-geist-mono),monospace', textTransform: 'uppercase', letterSpacing: '.6px' }
const TH: React.CSSProperties = { fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', padding: '8px 12px', borderBottom: '1px solid var(--line)', textAlign: 'left', whiteSpace: 'nowrap' }
const TD: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid var(--line)', fontSize: 11.5, verticalAlign: 'top' }

function relTime(iso: string): string {
  try {
    const diffMs = Date.now() - new Date(iso).getTime()
    const mins = Math.round(diffMs / 60_000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.round(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.round(hrs / 24)}d ago`
  } catch { return iso }
}

const SEV_STYLES: Record<string, React.CSSProperties> = {
  ERROR:   { background: 'var(--red-bg)',   color: 'var(--red)',   borderColor: 'rgba(239,68,68,.2)' },
  WARNING: { background: 'var(--amber-bg)', color: 'var(--amber)', borderColor: 'rgba(245,158,11,.2)' },
  INFO:    { background: 'var(--blue-bg)',  color: 'var(--blue)',  borderColor: 'rgba(59,130,246,.2)' },
}

function SevBadge({ severity }: { severity: string }) {
  const s = SEV_STYLES[severity] ?? { background: 'var(--bg3)', color: 'var(--sub)', borderColor: 'var(--line)' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 6px', borderRadius: 2, fontSize: 10, fontFamily: 'var(--font-geist-mono),monospace', fontWeight: 500, border: '1px solid', ...s }}>
      {severity.toLowerCase()}
    </span>
  )
}

function LogRow({ log }: { log: LogItem }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--line)' }}>
      <td style={TD}><SevBadge severity={log.severity} /></td>
      <td style={{ ...TD, fontFamily: 'var(--font-geist-mono),monospace', color: 'var(--muted)', fontSize: 11 }}>{log.event_type}</td>
      <td style={{ ...TD, color: 'var(--text2)', maxWidth: 420 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.message}>{log.message}</div>
      </td>
      <td style={{ ...TD, fontFamily: 'var(--font-geist-mono),monospace', color: 'var(--muted)', fontSize: 10, whiteSpace: 'nowrap' }}>{relTime(log.created_at)}</td>
    </tr>
  )
}

export default function LogsPage() {
  const [severity,  setSeverity]  = useState('')
  const [eventType, setEventType] = useState('')
  const [page,      setPage]      = useState(1)

  const { data, isLoading, error, mutate } = useLogs({
    severity:   severity || undefined,
    event_type: eventType || undefined,
    page,
    limit: PAGE_SIZE,
  })

  function changeFilter(cb: () => void) { cb(); setPage(1) }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <div className="anim-fadein">
      <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-.5px', color: 'var(--text)' }}>Reports</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', marginTop: 3 }}>
            {data ? `${data.total.toLocaleString()} events` : 'ingestion · errors · audit'}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 24px 12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {SEV_OPTS.map(o => (
            <button key={o.val} onClick={() => changeFilter(() => setSeverity(o.val))} style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 'var(--r)', fontSize: 11.5, fontWeight: 500, cursor: 'pointer', border: `1px solid ${severity === o.val ? 'var(--accent)' : 'var(--line)'}`, background: severity === o.val ? 'var(--accent)' : 'var(--bg2)', color: severity === o.val ? '#fff' : 'var(--sub)' }}>
              {o.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={eventType}
          onChange={e => changeFilter(() => setEventType(e.target.value))}
          placeholder="event_type…"
          style={{ height: 28, borderRadius: 'var(--r)', border: '1px solid var(--line)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 11, padding: '0 10px', fontFamily: 'var(--font-geist-mono),monospace', outline: 'none', width: 160 }}
        />
      </div>

      {error && <div style={{ padding: '0 24px 14px' }}><ErrorState message="Failed to load logs" onRetry={() => void mutate()} /></div>}

      {/* Table */}
      <div style={{ padding: '0 24px 20px' }}>
        <div style={PANEL}>
          <div style={PANEL_HEAD}>
            <div style={PANEL_TITLE}>event_log</div>
            {data && <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace' }}>{data.total.toLocaleString()} total</span>}
          </div>
          {isLoading && (
            <div style={{ padding: '40px 14px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Loading…</div>
          )}
          {!isLoading && !error && data && (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg3)' }}>
                      <th style={TH}>sev</th>
                      <th style={TH}>event_type</th>
                      <th style={TH}>message</th>
                      <th style={TH}>time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ ...TD, textAlign: 'center', color: 'var(--muted)', padding: '32px 12px' }}>No logs found</td>
                      </tr>
                    )}
                    {data.data.map(log => <LogRow key={log.id} log={log} />)}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-geist-mono),monospace', color: 'var(--muted)' }}>page {page} / {totalPages}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => setPage(p => p - 1)} disabled={page <= 1} style={{ padding: '3px 10px', borderRadius: 'var(--r)', fontSize: 11, border: '1px solid var(--line)', background: 'var(--bg3)', color: 'var(--sub)', cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? .4 : 1 }}>← prev</button>
                    <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} style={{ padding: '3px 10px', borderRadius: 'var(--r)', fontSize: 11, border: '1px solid var(--line)', background: 'var(--bg3)', color: 'var(--sub)', cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? .4 : 1 }}>next →</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
