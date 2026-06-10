'use client'

import { useState } from 'react'
import { useProfile } from '@/lib/hooks/use-profile'
import SftpTab       from '@/components/settings/SftpTab'
import AlertRulesTab from '@/components/settings/AlertRulesTab'
import ProfileTab    from '@/components/settings/ProfileTab'
import UsersTab      from '@/components/settings/UsersTab'
import SystemTab     from '@/components/settings/SystemTab'

type Tab = 'sftp_connection' | 'alert_rules' | 'profile' | 'users' | 'system'

interface TabDef {
  id:        Tab
  label:     string
  adminOnly: boolean
}

const TABS: TabDef[] = [
  { id: 'sftp_connection', label: 'sftp_connection', adminOnly: true  },
  { id: 'alert_rules',     label: 'alert_rules',     adminOnly: true  },
  { id: 'profile',         label: 'profile',          adminOnly: false },
  { id: 'users',           label: 'users',            adminOnly: true  },
  { id: 'system',          label: 'system',           adminOnly: true  },
]

export default function SettingsPage() {
  const { profile, isLoading } = useProfile()
  const [active, setActive] = useState<Tab>('sftp_connection')

  const isAdmin = profile?.role === 'admin'
  const visible = TABS.filter(t => !t.adminOnly || isAdmin)

  return (
    <div className="anim-fadein">
      <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-.5px', color: 'var(--text)' }}>Settings</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', marginTop: 3 }}>
            {isLoading ? '…' : profile?.email ?? ''}
            {isAdmin && !isLoading && (
              <span style={{ marginLeft: 8, padding: '1px 6px', borderRadius: 2, fontSize: 10, background: 'var(--accent-glow)', color: 'var(--accent2)', fontWeight: 600, border: '1px solid rgba(124,58,237,.2)' }}>admin</span>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', padding: '0 24px', marginBottom: 20, overflowX: 'auto' }}>
        {visible.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            style={{ padding: '8px 14px', fontSize: 11.5, fontWeight: 500, fontFamily: 'var(--font-geist-mono),monospace', cursor: 'pointer', border: 'none', borderBottom: `2px solid ${active === tab.id ? 'var(--accent)' : 'transparent'}`, marginBottom: -1, background: 'none', color: active === tab.id ? 'var(--accent2)' : 'var(--muted)', transition: 'color .15s', whiteSpace: 'nowrap' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 24px 24px' }}>
        {active === 'sftp_connection' && isAdmin && <SftpTab />}
        {active === 'alert_rules'     && isAdmin && <AlertRulesTab />}
        {active === 'profile'                     && <ProfileTab />}
        {active === 'users'           && isAdmin  && <UsersTab />}
        {active === 'system'          && isAdmin  && <SystemTab />}
      </div>
    </div>
  )
}
