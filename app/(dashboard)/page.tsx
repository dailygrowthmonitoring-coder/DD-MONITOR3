'use client'
import { useMemo } from 'react'
import { useDevices }        from '@/lib/hooks/use-devices'
import { useAlerts }         from '@/lib/hooks/use-alerts'
import { OverviewHeader }    from '@/components/dashboard/OverviewHeader'
import { CmdStrip }          from '@/components/dashboard/CmdStrip'
import { DomainTile }        from '@/components/dashboard/DomainTile'
import { StatCard }          from '@/components/dashboard/StatCard'
import { DomainStatusTable } from '@/components/dashboard/DomainStatusTable'
import { AlertFeedPanel }    from '@/components/dashboard/AlertFeedPanel'
import { LineChart }         from '@/components/charts/LineChart'
import { BarChart }          from '@/components/charts/BarChart'

function makeLabels30(): string[] {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    return `${d.getMonth() + 1}/${d.getDate()}`
  })
}

function makeLabels14(): string[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    return `${d.getMonth() + 1}/${d.getDate()}`
  })
}

function seededWalk(base: number, range: number, n: number): number[] {
  const out: number[] = []
  let v = base
  for (let i = 0; i < n; i++) {
    v = Math.max(0, Math.min(100, v + (Math.random() - 0.47) * range))
    out.push(+v.toFixed(1))
  }
  return out
}

const PANEL: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }
const PANEL_HEAD: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--line)' }
const PANEL_TITLE: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--sub)', fontFamily: 'var(--font-geist-mono),monospace', textTransform: 'uppercase', letterSpacing: '.6px', display: 'flex', alignItems: 'center', gap: 6 }

export default function OverviewPage() {
  const { devices, isLoading } = useDevices()
  const { data: alertsData }   = useAlerts({ is_active: true, limit: 4 })

  const labels30 = useMemo(() => makeLabels30(), [])
  const labels14 = useMemo(() => makeLabels14(), [])

  const topDevices = devices.slice(0, 3)
  const lineDatasets = useMemo(() => topDevices.map((d, i) => ({
    data:  seededWalk(d.storage_used_percent ?? 70, 3, 30),
    color: i === 0 ? '#3B82F6' : i === 1 ? '#F59E0B' : '#EF4444',
    label: d.hostname.replace(/^DD-?/i, ''),
  })), [devices]) // eslint-disable-line react-hooks/exhaustive-deps

  const barData = useMemo(() => [99.1,98.7,100,99.5,97.5,100,100,98.2,99.8,100,96.2,99.1,98.4,96.2], [])

  const totalCritical = devices.reduce((s, d) => s + d.active_alerts_critical, 0)
  const totalWarning  = devices.reduce((s, d) => s + d.active_alerts_warning, 0)
  const avgUtil = devices.length > 0
    ? (devices.reduce((s, d) => s + (d.storage_used_percent ?? 0), 0) / devices.length).toFixed(1)
    : '—'

  const lastRefresh = isLoading ? 'loading…' : `last refresh just now`

  const bigNum = (val: React.ReactNode, color: string, unit?: string): React.ReactNode => (
    <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-1.5px', color }}>
      {val}{unit && <span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 400 }}> {unit}</span>}
    </span>
  )

  return (
    <div className="anim-fadein">
      <OverviewHeader deviceCount={devices.length} lastRefresh={lastRefresh} />
      <CmdStrip connected />

      {/* Domain tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8, margin: '0 24px 14px' }}>
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '10px 12px', height: 80 }} />
            ))
          : devices.slice(0, 6).map(d => (
              <DomainTile key={d.id} device={d} />
            ))
        }
      </div>

      {/* Stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden', margin: '0 24px 14px' }}>
        <StatCard
          label="Total Devices"
          value={bigNum(devices.length, 'var(--accent2)')}
          sub={`${devices.length} registered`}
          tag="— active"
          tagType="nu"
        />
        <StatCard
          label="Avg Utilization"
          value={bigNum(avgUtil, 'var(--amber)', '%')}
          sub="across all devices"
          tag={avgUtil !== '—' && Number(avgUtil) > 80 ? '↑ Rising' : '— stable'}
          tagType={avgUtil !== '—' && Number(avgUtil) > 80 ? 'dn' : 'nu'}
        />
        <StatCard
          label="Active Alerts (warn)"
          value={bigNum(totalWarning, totalWarning > 0 ? 'var(--amber)' : 'var(--green)')}
          sub={`${totalCritical} critical · ${totalWarning} warning`}
          tag={totalWarning > 0 ? 'Attention needed' : 'All clear'}
          tagType={totalWarning > 0 ? 'dn' : 'up'}
        />
        <StatCard
          label="Critical Alerts"
          value={bigNum(totalCritical, totalCritical > 0 ? 'var(--red)' : 'var(--green)')}
          sub={totalCritical > 0 ? 'Action required' : 'No critical alerts'}
          tag={totalCritical > 0 ? 'Action required' : 'OK'}
          tagType={totalCritical > 0 ? 'dn' : 'up'}
        />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '0 24px 14px' }}>
        <div style={PANEL}>
          <div style={PANEL_HEAD}>
            <div style={PANEL_TITLE}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12"><polyline points="1,12 5,7 9,9 15,3"/></svg>
              utilization_30d.csv
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {topDevices.map((d, i) => (
                <span key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9.5, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace' }}>
                  <span style={{ width: 10, height: 1.5, background: i === 0 ? '#3B82F6' : i === 1 ? '#F59E0B' : '#EF4444', display: 'inline-block', borderRadius: 1 }} />
                  {d.hostname.replace(/^DD-?/i, '').toUpperCase()}
                </span>
              ))}
            </div>
          </div>
          <div style={{ padding: '12px 14px' }}>
            <LineChart labels={labels30} datasets={lineDatasets} yMin={60} yMax={100} unit="%" />
          </div>
        </div>
        <div style={PANEL}>
          <div style={PANEL_HEAD}>
            <div style={PANEL_TITLE}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12"><rect x="1" y="4" width="3" height="11" rx="1"/><rect x="6" y="1" width="3" height="14" rx="1"/><rect x="11" y="7" width="3" height="8" rx="1"/></svg>
              backup_rate_14d
            </div>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace' }}>
              today: {barData[barData.length - 1]}%
            </span>
          </div>
          <div style={{ padding: '12px 14px' }}>
            <BarChart labels={labels14} data={barData} yMin={90} yMax={100} unit="%" />
          </div>
        </div>
      </div>

      {/* Bottom row: table + alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, margin: '0 24px 14px' }}>
        <div style={PANEL}>
          <div style={PANEL_HEAD}>
            <div style={PANEL_TITLE}>domain_status</div>
            <a href="/devices" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 'var(--r)', fontSize: 11.5, cursor: 'pointer', border: 'none', background: 'none', color: 'var(--muted)', textDecoration: 'none' }}>
              view all →
            </a>
          </div>
          <DomainStatusTable devices={devices} />
        </div>
        <div style={PANEL}>
          <div style={PANEL_HEAD}>
            <div style={PANEL_TITLE}>alerts</div>
            <a href="/alerts" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', fontSize: 11.5, cursor: 'pointer', border: 'none', background: 'none', color: 'var(--muted)', textDecoration: 'none' }}>
              all →
            </a>
          </div>
          <AlertFeedPanel alerts={alertsData?.data ?? []} />
        </div>
      </div>
    </div>
  )
}
