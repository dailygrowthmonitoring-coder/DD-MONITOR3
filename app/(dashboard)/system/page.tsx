'use client'
import { useDevices } from '@/lib/hooks/use-devices'
import { useSystemHealth } from '@/lib/hooks/use-system-health'
import { ErrorState } from '@/components/ui/ErrorState'

const PANEL: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }
const PANEL_HEAD: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--line)' }
const PANEL_TITLE: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--sub)', fontFamily: 'var(--font-geist-mono),monospace', textTransform: 'uppercase', letterSpacing: '.6px' }

function relTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    const diffMs = Date.now() - new Date(iso).getTime()
    const mins = Math.round(diffMs / 60_000)
    if (mins < 60) return `${mins}m ago`
    return `${Math.round(mins / 60)}h ago`
  } catch { return '—' }
}

export default function SystemPage() {
  const { devices, isLoading: devLoading } = useDevices()
  const { data, isLoading, error, mutate } = useSystemHealth()

  return (
    <div className="anim-fadein">
      <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-.5px', color: 'var(--text)' }}>Replication</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', marginTop: 3 }}>
            cross-domain sync status · system health
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden', margin: '0 24px 14px' }}>
        {[
          { label: 'Total Devices',   val: String(devices.length),                                       color: 'var(--text)' },
          { label: 'Reporting (24h)', val: data ? String(data.devices_reporting_24h) : '—',              color: 'var(--green)' },
          { label: 'Errors (24h)',    val: data ? String(data.errors_last_24h) : '—',                    color: data?.errors_last_24h ? 'var(--red)' : 'var(--green)' },
          { label: 'Total Reports',   val: data ? data.db_stats.total_reports.toLocaleString() : '—',   color: 'var(--accent2)' },
        ].map((s, i, arr) => (
          <div key={s.label} style={{ padding: '16px 18px', borderRight: i < arr.length - 1 ? '1px solid var(--line)' : 'none', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,var(--line2),transparent)' }} />
            <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-1.5px', fontFamily: 'var(--font-geist-mono),monospace', lineHeight: 1, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {error && <div style={{ padding: '0 24px 14px' }}><ErrorState message="Failed to load system health" onRetry={() => void mutate()} /></div>}

      <div style={{ padding: '0 24px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Device status pairs */}
        <div style={PANEL}>
          <div style={PANEL_HEAD}><div style={PANEL_TITLE}>device_status</div></div>
          <div style={{ padding: '12px 14px' }}>
            {(devLoading || isLoading) && <div style={{ color: 'var(--muted)', fontSize: 12 }}>Loading…</div>}
            {data?.device_statuses.map(dev => (
              <div key={dev.device_id} style={{ background: 'var(--bg3)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '12px 14px', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-geist-mono),monospace', fontSize: 11 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: dev.status === 'today' ? 'var(--green)' : 'var(--amber)' }} />
                    {dev.hostname}
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 6px', borderRadius: 2, fontSize: 10, fontFamily: 'var(--font-geist-mono),monospace', fontWeight: 500, border: '1px solid', background: dev.status === 'today' ? 'var(--green-bg)' : 'var(--amber-bg)', color: dev.status === 'today' ? 'var(--green)' : 'var(--amber)', borderColor: dev.status === 'today' ? 'rgba(34,197,94,.2)' : 'rgba(245,158,11,.2)' }}>
                    {dev.status === 'today' ? 'in_sync' : 'stale'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                  {[
                    { k: 'location', v: dev.location ?? 'unknown' },
                    { k: 'last_report', v: dev.last_report_date ?? '—' },
                    { k: 'lag', v: dev.status === 'today' ? '0m' : '> 24h' },
                    { k: 'last_seen', v: relTime(dev.last_report_date) },
                  ].map(kv => (
                    <div key={kv.k}>
                      <div style={{ fontSize: 9.5, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>{kv.k}</div>
                      <div style={{ fontSize: 12, fontFamily: 'var(--font-geist-mono),monospace', fontWeight: 500, color: 'var(--text2)' }}>{kv.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {!isLoading && !data?.device_statuses.length && (
              <div style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>No device status data</div>
            )}
          </div>
        </div>

        {/* Recent logs */}
        {data?.recent_logs && data.recent_logs.length > 0 && (
          <div style={PANEL}>
            <div style={PANEL_HEAD}><div style={PANEL_TITLE}>recent_logs</div></div>
            <div style={{ padding: '12px 14px' }}>
              {data.recent_logs.slice(0, 6).map(log => (
                <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 6px', borderRadius: 2, fontSize: 10, fontFamily: 'var(--font-geist-mono),monospace', fontWeight: 500, border: '1px solid', flexShrink: 0, background: log.severity === 'ERROR' ? 'var(--red-bg)' : log.severity === 'WARNING' ? 'var(--amber-bg)' : 'var(--blue-bg)', color: log.severity === 'ERROR' ? 'var(--red)' : log.severity === 'WARNING' ? 'var(--amber)' : 'var(--blue)', borderColor: log.severity === 'ERROR' ? 'rgba(239,68,68,.2)' : log.severity === 'WARNING' ? 'rgba(245,158,11,.2)' : 'rgba(59,130,246,.2)' }}>
                    {log.severity.toLowerCase()}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.message}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', marginTop: 2 }}>{log.event_type}</div>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', flexShrink: 0 }}>{relTime(log.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
