'use client'

import { useRouter } from 'next/navigation'
import { useDevices } from '@/lib/hooks/use-devices'
import { ErrorState } from '@/components/ui/ErrorState'
import type { DeviceOverviewItem } from '@/types/dashboard'

type StatusCls = 'ok' | 'wa' | 'cr'

function getStatus(d: DeviceOverviewItem): StatusCls {
  if (d.device_status === 'critical') return 'cr'
  if (d.device_status === 'warning')  return 'wa'
  return 'ok'
}

const BADGE_STYLE: Record<StatusCls, React.CSSProperties> = {
  ok: { background: 'var(--green-bg)', color: 'var(--green)', borderColor: 'rgba(34,197,94,.2)' },
  wa: { background: 'var(--amber-bg)', color: 'var(--amber)', borderColor: 'rgba(245,158,11,.2)' },
  cr: { background: 'var(--red-bg)',   color: 'var(--red)',   borderColor: 'rgba(239,68,68,.2)' },
}
const BADGE_LABEL: Record<StatusCls, string> = { ok: 'online', wa: 'warning', cr: 'critical' }

const DOT_COLOR: Record<StatusCls, string> = {
  ok: 'var(--green)', wa: 'var(--amber)', cr: 'var(--red)',
}
const FILL_COLOR: Record<StatusCls, string> = {
  ok: 'var(--blue)', wa: 'var(--amber)', cr: 'var(--red)',
}
const LEFT_BORDER: Record<StatusCls, string> = {
  ok: 'transparent', wa: 'var(--amber)', cr: 'var(--red)',
}

function DomainCard({ device }: { device: DeviceOverviewItem }) {
  const router  = useRouter()
  const cls     = getStatus(device)
  const pct     = device.storage_used_percent ?? 0
  const animCls = cls === 'cr' ? 'anim-cr-pulse' : cls === 'wa' ? 'anim-wa-pulse' : ''

  function handleClick() {
    router.push(cls === 'cr' ? '/alerts' : '/compare')
  }

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
      style={{
        background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 'var(--r)',
        padding: 14, cursor: 'pointer', borderLeft: `2px solid ${LEFT_BORDER[cls]}`,
        transition: 'border-color .15s,background .15s',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-geist-mono),monospace', color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className={animCls} style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: DOT_COLOR[cls] }} />
            {device.hostname}
          </div>
          <div style={{ fontSize: 9.5, fontFamily: 'var(--font-geist-mono),monospace', color: 'var(--muted)', marginTop: 2 }}>
            {device.location ?? 'unknown location'}
          </div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 2, fontSize: 10, fontFamily: 'var(--font-geist-mono),monospace', fontWeight: 500, border: '1px solid', ...BADGE_STYLE[cls] }}>
          {BADGE_LABEL[cls]}
        </span>
      </div>

      {/* Storage bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', marginBottom: 5 }}>
        <span>storage</span>
        <span>{pct}%</span>
      </div>
      <div style={{ height: 3, background: 'var(--bg4)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ height: 3, borderRadius: 2, width: `${Math.min(pct, 100)}%`, background: FILL_COLOR[cls] }} />
      </div>

      {/* Backup stat boxes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--line)', borderRadius: 2, padding: '8px 10px' }}>
          <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-geist-mono),monospace', letterSpacing: '-1px', color: 'var(--green)' }}>
            {device.jobs_ok ?? '—'}
          </div>
          <div style={{ fontSize: 9, fontFamily: 'var(--font-geist-mono),monospace', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 2 }}>
            backups ok
          </div>
        </div>
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--line)', borderRadius: 2, padding: '8px 10px' }}>
          <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-geist-mono),monospace', letterSpacing: '-1px', color: (device.jobs_failed ?? 0) > 0 ? 'var(--red)' : 'var(--text2)' }}>
            {device.jobs_failed ?? '—'}
          </div>
          <div style={{ fontSize: 9, fontFamily: 'var(--font-geist-mono),monospace', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 2 }}>
            failures
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DomainsPage() {
  const { devices, error, isLoading, refresh } = useDevices()

  return (
    <div className="anim-fadein">
      <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-.5px', color: 'var(--text)' }}>Domains</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', marginTop: 3 }}>
            {devices.length} {devices.length === 1 ? 'system' : 'systems'} · all reachable
          </div>
        </div>
        <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 'var(--r)', fontSize: 11.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--bg2)', color: 'var(--sub)' }}>
          Filter
        </button>
      </div>

      {error && (
        <div style={{ padding: '0 24px 20px' }}>
          <ErrorState message="Failed to load devices" onRetry={() => void refresh()} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, padding: '0 24px 20px' }}>
        {isLoading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: 14, height: 148 }} />
        ))}
        {!isLoading && devices.map(d => <DomainCard key={d.id} device={d} />)}
        {!isLoading && devices.length === 0 && !error && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 13 }}>
            No domains registered yet.
          </div>
        )}
      </div>
    </div>
  )
}
