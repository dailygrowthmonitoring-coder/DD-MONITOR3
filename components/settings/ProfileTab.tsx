'use client'
import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useProfile } from '@/lib/hooks/use-profile'
import type { UserRole } from '@/types/dashboard'

const MIN_PASSWORD_LENGTH = 8

const PANEL: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden', marginBottom: 10 }
const PANEL_HEAD: React.CSSProperties = { padding: '10px 14px', borderBottom: '1px solid var(--line)', fontSize: 11, fontWeight: 600, color: 'var(--sub)', fontFamily: 'var(--font-geist-mono),monospace', textTransform: 'uppercase', letterSpacing: '.6px' }
const FIELD_LABEL: React.CSSProperties = { fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }
const INPUT: React.CSSProperties = { height: 32, borderRadius: 'var(--r)', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12, padding: '0 10px', fontFamily: 'inherit', outline: 'none' }

function initials(name: string | null, email: string): string {
  if (name) return name.split(' ').map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 6px', borderRadius: 2, fontSize: 10, fontFamily: 'var(--font-geist-mono),monospace', fontWeight: 600, border: '1px solid', background: role === 'admin' ? 'var(--accent-glow)' : 'var(--bg3)', color: role === 'admin' ? 'var(--accent2)' : 'var(--muted)', borderColor: role === 'admin' ? 'rgba(124,58,237,.2)' : 'var(--line)' }}>
      {role === 'admin' ? 'admin' : 'viewer'}
    </span>
  )
}

function Btn({ children, onClick, disabled, variant = 'primary' }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: 'primary' | 'ghost' }) {
  const base: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: 'var(--r)', fontSize: 11.5, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .5 : 1, border: '1px solid' }
  const styles = variant === 'primary'
    ? { ...base, background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
    : { ...base, background: 'var(--bg3)', color: 'var(--sub)', borderColor: 'var(--line)' }
  return <button style={styles} onClick={onClick} disabled={disabled}>{children}</button>
}

export default function ProfileTab() {
  const { profile, isLoading, mutate } = useProfile()

  const [editName,    setEditName]    = useState('')
  const [nameEditing, setNameEditing] = useState(false)
  const [nameSaving,  setNameSaving]  = useState(false)
  const [nameMsg,     setNameMsg]     = useState<{ text: string; ok: boolean } | null>(null)

  const [curPwd,    setCurPwd]    = useState('')
  const [newPwd,    setNewPwd]    = useState('')
  const [confPwd,   setConfPwd]   = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdMsg,    setPwdMsg]    = useState<{ text: string; ok: boolean } | null>(null)

  function startEdit() { setEditName(profile?.full_name ?? ''); setNameEditing(true); setNameMsg(null) }

  async function saveName() {
    setNameSaving(true); setNameMsg(null)
    try {
      const res = await fetch('/api/settings/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ full_name: editName || null }) })
      if (!res.ok) throw new Error('Failed')
      await mutate(); setNameEditing(false); setNameMsg({ text: 'Name updated', ok: true })
    } catch { setNameMsg({ text: 'Failed to update name', ok: false }) }
    finally { setNameSaving(false) }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault(); setPwdMsg(null)
    if (newPwd.length < MIN_PASSWORD_LENGTH) { setPwdMsg({ text: `Min ${MIN_PASSWORD_LENGTH} characters`, ok: false }); return }
    if (newPwd !== confPwd) { setPwdMsg({ text: 'Passwords do not match', ok: false }); return }
    setPwdSaving(true)
    try {
      const res = await fetch('/api/settings/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current_password: curPwd, new_password: newPwd }) })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) { setPwdMsg({ text: json.error ?? 'Failed', ok: false }) }
      else { setPwdMsg({ text: 'Password changed', ok: true }); setCurPwd(''); setNewPwd(''); setConfPwd('') }
    } catch { setPwdMsg({ text: 'Network error', ok: false }) }
    finally { setPwdSaving(false) }
  }

  if (isLoading) return <div style={{ color: 'var(--muted)', fontSize: 12, padding: '24px 0' }}>Loading…</div>
  if (!profile)  return <div style={{ color: 'var(--muted)', fontSize: 12 }}>Could not load profile.</div>

  return (
    <div>
      {/* Identity */}
      <div style={PANEL}>
        <div style={PANEL_HEAD}>profile</div>
        <div style={{ padding: '16px 14px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-glow)', border: '1px solid rgba(124,58,237,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-geist-mono),monospace', color: 'var(--accent2)', flexShrink: 0 }}>
            {initials(profile.full_name, profile.email)}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Name */}
            <div>
              <div style={FIELD_LABEL}>full_name</div>
              {nameEditing ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={editName} onChange={e => setEditName(e.target.value)} autoFocus style={{ ...INPUT, flex: 1 }} />
                  <Btn onClick={saveName} disabled={nameSaving}>{nameSaving ? 'Saving…' : 'Save'}</Btn>
                  <Btn variant="ghost" onClick={() => setNameEditing(false)}>Cancel</Btn>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, color: profile.full_name ? 'var(--text2)' : 'var(--muted)', fontStyle: profile.full_name ? 'normal' : 'italic' }}>
                    {profile.full_name ?? 'Not set'}
                  </span>
                  <button onClick={startEdit} style={{ fontSize: 11, color: 'var(--accent2)', cursor: 'pointer', border: 'none', background: 'none', padding: 0 }}>edit</button>
                </div>
              )}
              {nameMsg && <div style={{ fontSize: 11, marginTop: 4, color: nameMsg.ok ? 'var(--green)' : 'var(--red)' }}>{nameMsg.text}</div>}
            </div>
            {/* Email */}
            <div>
              <div style={FIELD_LABEL}>email</div>
              <div style={{ fontSize: 13, fontFamily: 'var(--font-geist-mono),monospace', color: 'var(--text2)' }}>{profile.email}</div>
            </div>
            {/* Role + joined */}
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <div>
                <div style={FIELD_LABEL}>role</div>
                <RoleBadge role={profile.role} />
              </div>
              <div>
                <div style={FIELD_LABEL}>member_since</div>
                <div style={{ fontSize: 12, fontFamily: 'var(--font-geist-mono),monospace', color: 'var(--sub)' }}>{format(parseISO(profile.created_at), 'MMM dd, yyyy')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password */}
      <div style={PANEL}>
        <div style={PANEL_HEAD}>change_password</div>
        <form onSubmit={changePassword} style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360 }}>
          {(['Current Password', 'New Password', 'Confirm New Password'] as const).map((lbl, i) => {
            const vals = [curPwd, newPwd, confPwd]
            const setters = [setCurPwd, setNewPwd, setConfPwd]
            const autos = ['current-password', 'new-password', 'new-password'] as const
            return (
              <div key={lbl}>
                <div style={FIELD_LABEL}>{lbl.toLowerCase().replace(/ /g, '_')}</div>
                <input type="password" value={vals[i]} onChange={e => setters[i](e.target.value)} required autoComplete={autos[i]} style={{ ...INPUT, width: '100%' }} />
              </div>
            )
          })}
          {pwdMsg && <div style={{ fontSize: 11, color: pwdMsg.ok ? 'var(--green)' : 'var(--red)' }}>{pwdMsg.text}</div>}
          <div><Btn disabled={pwdSaving}>{pwdSaving ? 'Changing…' : 'Change Password'}</Btn></div>
        </form>
      </div>
    </div>
  )
}
