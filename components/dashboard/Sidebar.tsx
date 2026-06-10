'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useDevices } from '@/lib/hooks/use-devices'
import { useProfile } from '@/lib/hooks/use-profile'
import type { DeviceOverviewItem } from '@/types/dashboard'

type StatusCls = 'ok' | 'wa' | 'cr'

function statusCls(d: DeviceOverviewItem): StatusCls {
  if (d.device_status === 'critical') return 'cr'
  if (d.device_status === 'warning')  return 'wa'
  return 'ok'
}

const DOT_STYLES: Record<StatusCls, React.CSSProperties> = {
  ok: { background: 'var(--green)' },
  wa: { background: 'var(--amber)' },
  cr: { background: 'var(--red)' },
}

const PCT_STYLES: Record<StatusCls, React.CSSProperties> = {
  ok: { color: 'var(--green-dim)' },
  wa: { color: 'var(--amber)' },
  cr: { color: 'var(--red)' },
}

function getInitials(name: string | null): string {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const ROUTE_MAP: Record<string, string> = {
  '/': 'overview', '/domains': 'domains', '/devices': 'domains', '/alerts': 'alerts',
  '/history': 'storage', '/compare': 'backup', '/system': 'replication',
  '/logs': 'reports', '/settings': 'settings',
}

interface NavItemDef {
  href: string
  label: string
  icon: React.ReactNode
  badgeType?: 'red' | 'amber'
  badgeCount?: number
}

export function Sidebar() {
  const pathname = usePathname()
  const { devices } = useDevices()
  const { profile } = useProfile()

  const critCount = devices.reduce((s, d) => s + d.active_alerts_critical, 0)

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  function NavItem({ href, label, icon, badgeType, badgeCount }: NavItemDef) {
    const active = isActive(href)
    return (
      <Link href={href} style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px',
        color: active ? 'var(--text)' : 'var(--sub)',
        background: active ? 'var(--bg3)' : 'transparent',
        fontWeight: 400, letterSpacing: '.1px', position: 'relative',
        textDecoration: 'none', fontSize: 12.5, transition: 'color .1s,background .1s',
      }}>
        {active && (
          <span style={{
            position: 'absolute', left: 0, top: 2, bottom: 2,
            width: 2, background: 'var(--accent)', borderRadius: '0 2px 2px 0',
          }} />
        )}
        <span style={{ width: 13, height: 13, flexShrink: 0, opacity: active ? 1 : 0.6 }}>
          {icon}
        </span>
        <span style={{ flex: 1 }}>{label}</span>
        {badgeType && (badgeCount ?? 0) > 0 && (
          <span style={{
            marginLeft: 'auto', fontFamily: 'var(--font-geist-mono),monospace', fontSize: 9,
            padding: '1px 5px', borderRadius: 2, fontWeight: 500,
            background: badgeType === 'red' ? 'rgba(239,68,68,.2)' : 'rgba(245,158,11,.15)',
            color: badgeType === 'red' ? 'var(--red)' : 'var(--amber)',
          }}>
            {badgeCount}
          </span>
        )}
      </Link>
    )
  }

  return (
    <nav style={{
      width: 'var(--sw)', position: 'fixed', top: 0, left: 0, height: '100vh',
      background: 'var(--bg)', borderRight: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column', zIndex: 200, fontSize: 12.5,
    }}>
      {/* Logo */}
      <div style={{ height: 'var(--th)', padding: '0 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--line)' }}>
        <div style={{ width: 22, height: 22, background: 'var(--accent)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-geist-mono),monospace', fontSize: 10, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
          DD
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.2px', color: 'var(--text2)' }}>
          monitor<span style={{ color: 'var(--line2)', margin: '0 2px' }}>/</span>
          <span style={{ color: 'var(--sub)' }}>prod</span>
        </div>
      </div>

      {/* Main nav */}
      <div style={{ marginTop: 16 }}>
        <NavItem href="/" label="Overview" icon={<IcoOverview />} />
        <NavItem href="/domains" label="Domains" icon={<IcoDomains />} />
        <NavItem href="/alerts" label="Alerts" icon={<IcoAlerts />} badgeType="red" badgeCount={critCount} />
      </div>

      {/* Analysis group */}
      <div style={{ marginTop: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '.8px', textTransform: 'uppercase', color: 'var(--muted)', padding: '0 14px', marginBottom: 4, fontFamily: 'var(--font-geist-mono),monospace' }}>
          Analysis
        </div>
        <NavItem href="/history"  label="Storage"       icon={<IcoStorage />} />
        <NavItem href="/compare"  label="Backup Health" icon={<IcoBackup />} />
        <NavItem href="/system"   label="Replication"   icon={<IcoReplication />} />
      </div>

      {/* System group */}
      <div style={{ marginTop: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '.8px', textTransform: 'uppercase', color: 'var(--muted)', padding: '0 14px', marginBottom: 4, fontFamily: 'var(--font-geist-mono),monospace' }}>
          System
        </div>
        <NavItem href="/logs"     label="Reports"  icon={<IcoReports />} />
        <NavItem href="/settings" label="Settings" icon={<IcoSettings />} />
      </div>

      {/* Live Status */}
      {devices.length > 0 && (
        <div style={{ padding: '12px 14px', marginTop: 8 }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>
            Live Status
          </div>
          {devices.slice(0, 6).map(d => {
            const cls = statusCls(d)
            const animClass = cls === 'cr' ? 'anim-cr-pulse' : cls === 'wa' ? 'anim-wa-pulse' : ''
            return (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, cursor: 'pointer' }}>
                <span className={animClass} style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, ...DOT_STYLES[cls] }} />
                <span style={{ fontSize: 11, color: 'var(--sub)', flex: 1, fontFamily: 'var(--font-geist-mono),monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.hostname.toLowerCase().replace(/^dd-?/i, '')}
                </span>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-geist-mono),monospace', fontWeight: 500, ...PCT_STYLES[cls] }}>
                  {d.storage_used_percent != null ? `${d.storage_used_percent}%` : '—'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* User footer */}
      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--line)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-geist-mono),monospace' }}>
          {getInitials(profile?.full_name ?? null)}
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text2)' }}>
            {profile?.full_name?.split(' ')[0] ?? 'User'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace' }}>
            {profile?.role ?? 'viewer'}
          </div>
        </div>
      </div>
    </nav>
  )
}

function IcoOverview() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
}
function IcoDomains() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13"><rect x="2" y="2" width="12" height="4" rx="1"/><rect x="2" y="8" width="12" height="4" rx="1"/></svg>
}
function IcoAlerts() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13"><path d="M8 1.5a4.5 4.5 0 0 1 4.5 4.5v2l1 2H2.5l1-2V6A4.5 4.5 0 0 1 8 1.5z"/><path d="M6.5 12.5a1.5 1.5 0 0 0 3 0"/></svg>
}
function IcoStorage() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13"><polyline points="1,12 5,7 9,9 15,3"/><polyline points="11,3 15,3 15,7"/></svg>
}
function IcoBackup() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13"><path d="M8 1.5l1.5 3h3l-2.4 1.8.9 3L8 7.5l-3 1.8.9-3L3.5 4.5h3z"/></svg>
}
function IcoReplication() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13"><path d="M2 8h12M10 5l3 3-3 3M6 5L3 8l3 3"/></svg>
}
function IcoReports() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13"><rect x="3" y="1" width="10" height="14" rx="1"/><line x1="6" y1="5" x2="10" y2="5"/><line x1="6" y1="8" x2="10" y2="8"/><line x1="6" y1="11" x2="8" y2="11"/></svg>
}
function IcoSettings() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13"><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M3 13l1.4-1.4M11.6 4.4 13 3"/></svg>
}
