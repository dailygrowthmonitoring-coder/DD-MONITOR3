'use client'
import { useAlerts } from '@/lib/hooks/use-alerts'
import { useAlertRules } from '@/lib/hooks/use-alert-rules'
import { ErrorState } from '@/components/ui/ErrorState'

type SevCls = 'cr' | 'wa' | 'ok' | 'in'

function getSevCls(sev: string): SevCls {
  if (sev === 'CRITICAL') return 'cr'
  if (sev === 'WARNING')  return 'wa'
  if (sev === 'INFO')     return 'in'
  return 'ok'
}

const DOT_STYLE: Record<SevCls, React.CSSProperties> = {
  cr: { borderColor: 'var(--red)',   background: 'var(--red)' },
  wa: { borderColor: 'var(--amber)', background: 'transparent' },
  ok: { borderColor: 'var(--green)', background: 'var(--green)' },
  in: { borderColor: 'var(--blue)',  background: 'transparent' },
}

const BADGE_STYLE: Record<SevCls, React.CSSProperties> = {
  cr: { background: 'var(--red-bg)',   color: 'var(--red)',   borderColor: 'rgba(239,68,68,.2)' },
  wa: { background: 'var(--amber-bg)', color: 'var(--amber)', borderColor: 'rgba(245,158,11,.2)' },
  ok: { background: 'var(--green-bg)', color: 'var(--green)', borderColor: 'rgba(34,197,94,.2)' },
  in: { background: 'var(--blue-bg)',  color: 'var(--blue)',  borderColor: 'rgba(59,130,246,.2)' },
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toISOString().slice(0, 10) + ' · ' + d.toTimeString().slice(0, 8)
  } catch { return iso }
}

const PANEL: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }
const PANEL_HEAD: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--line)' }
const PANEL_TITLE: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--sub)', fontFamily: 'var(--font-geist-mono),monospace', textTransform: 'uppercase', letterSpacing: '.6px' }
const BD: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 2, fontSize: 10, fontFamily: 'var(--font-geist-mono),monospace', fontWeight: 500, border: '1px solid' }

export default function AlertsPage() {
  const { data: allAlerts, isLoading, error, mutate } = useAlerts({ limit: 50 })
  const { data: activeAlerts } = useAlerts({ is_active: true, limit: 100 })
  const { rules, isLoading: rulesLoading } = useAlertRules()

  const alerts   = allAlerts?.data ?? []
  const active   = activeAlerts?.data ?? []
  const critical = active.filter(a => a.severity === 'CRITICAL').length
  const warning  = active.filter(a => a.severity === 'WARNING').length
  const info     = active.filter(a => a.severity === 'INFO').length

  return (
    <div className="anim-fadein">
      <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-.5px', color: 'var(--text)' }}>Alerts</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', marginTop: 3 }}>
            {active.length} active · {critical} critical
          </div>
        </div>
        <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 'var(--r)', fontSize: 11.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--bg2)', color: 'var(--sub)' }}>
          Mark all read
        </button>
      </div>

      {error && <div style={{ padding: '0 24px 20px' }}><ErrorState message="Failed to load alerts" onRetry={() => void mutate()} /></div>}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, padding: '0 24px 20px' }}>
        {/* Timeline */}
        <div style={PANEL}>
          <div style={PANEL_HEAD}>
            <div style={PANEL_TITLE}>event_log</div>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace' }}>sorted by time desc</span>
          </div>
          <div style={{ padding: '12px 14px' }}>
            {isLoading && <div style={{ color: 'var(--muted)', fontSize: 12 }}>Loading…</div>}
            {!isLoading && alerts.length === 0 && (
              <div style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>No alerts found</div>
            )}
            {/* Timeline */}
            <div style={{ paddingLeft: 18, position: 'relative' }}>
              <div style={{ position: 'absolute', left: 5, top: 6, bottom: 0, width: 1, background: 'var(--line)' }} />
              {alerts.map(alert => {
                const cls = getSevCls(alert.severity)
                return (
                  <div key={alert.id} style={{ position: 'relative', marginBottom: 16 }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', position: 'absolute', left: -18, top: 3, border: '1.5px solid', ...DOT_STYLE[cls] }} />
                    <div style={{ fontSize: 9.5, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', marginBottom: 3 }}>
                      {fmtTime(alert.post_time ?? alert.created_at)}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 3 }}>
                      {alert.message}
                    </div>
                    {alert.object && (
                      <div style={{ fontSize: 11, color: 'var(--sub)', lineHeight: 1.6 }}>{alert.object}</div>
                    )}
                    <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
                      <span style={{ ...BD, ...BADGE_STYLE[cls] }}>{alert.severity.toLowerCase()}</span>
                      {alert.class && <span style={{ ...BD, background: 'var(--bg3)', color: 'var(--muted)', borderColor: 'var(--line)' }}>{alert.class.toLowerCase()}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Severity summary */}
          <div style={PANEL}>
            <div style={PANEL_HEAD}><div style={PANEL_TITLE}>severity</div></div>
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'critical', count: critical, bg: 'var(--red-bg)', color: 'var(--red)', border: 'rgba(239,68,68,.15)' },
                { label: 'warning',  count: warning,  bg: 'var(--amber-bg)', color: 'var(--amber)', border: 'rgba(245,158,11,.15)' },
                { label: 'info',     count: info,     bg: 'var(--blue-bg)', color: 'var(--blue)', border: 'rgba(59,130,246,.15)' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: row.bg, border: `1px solid ${row.border}`, borderRadius: 'var(--r)' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 500, color: row.color, fontFamily: 'var(--font-geist-mono),monospace' }}>{row.label}</span>
                  <span style={{ fontSize: 22, fontWeight: 600, color: row.color, fontFamily: 'var(--font-geist-mono),monospace', letterSpacing: '-1px' }}>{row.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Alert rules */}
          <div style={PANEL}>
            <div style={PANEL_HEAD}>
              <div style={PANEL_TITLE}>rules</div>
              <a href="/settings" style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px', fontSize: 11.5, cursor: 'pointer', border: 'none', background: 'none', color: 'var(--muted)', textDecoration: 'none' }}>edit →</a>
            </div>
            {rulesLoading ? (
              <div style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: 11 }}>Loading…</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {rules.length === 0 ? (
                    <tr><td colSpan={2} style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: 11 }}>No rules configured</td></tr>
                  ) : rules.map(r => {
                    const cls: SevCls = r.severity === 'CRITICAL' ? 'cr' : r.severity === 'WARNING' ? 'wa' : 'in'
                    return (
                      <tr key={r.id}>
                        <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--line)', fontFamily: 'var(--font-geist-mono),monospace', color: 'var(--muted)', fontSize: 11 }}>
                          {r.metric} {r.operator} {r.threshold}
                        </td>
                        <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--line)' }}>
                          <span style={{ ...BD, ...BADGE_STYLE[cls] }}>{r.severity === 'CRITICAL' ? 'crit' : r.severity === 'WARNING' ? 'warn' : 'info'}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
