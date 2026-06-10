'use client'
import { useState } from 'react'
import { ErrorState } from '@/components/ui/ErrorState'
import { useUsers } from '@/lib/hooks/use-users'
import { useProfile } from '@/lib/hooks/use-profile'
import type { UserProfile, UserRole } from '@/types/dashboard'

const PANEL: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden', marginBottom: 10 }
const PANEL_HEAD: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--line)' }
const PANEL_TITLE: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--sub)', fontFamily: 'var(--font-geist-mono),monospace', textTransform: 'uppercase', letterSpacing: '.6px' }
const TH: React.CSSProperties = { fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', padding: '8px 12px', borderBottom: '1px solid var(--line)', textAlign: 'left' }
const TD: React.CSSProperties = { padding: '9px 12px', borderBottom: '1px solid var(--line)', fontSize: 12 }
const INPUT: React.CSSProperties = { height: 30, borderRadius: 'var(--r)', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12, padding: '0 8px', fontFamily: 'inherit', outline: 'none', width: '100%' }

function Btn({ children, onClick, disabled, variant = 'primary', type = 'button' }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: 'primary' | 'ghost' | 'danger'; type?: 'button' | 'submit' }) {
  const base: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 'var(--r)', fontSize: 11, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .5 : 1, border: '1px solid' }
  const s = variant === 'primary' ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
    : variant === 'danger'   ? { background: 'var(--red-bg)', color: 'var(--red)', borderColor: 'rgba(239,68,68,.2)' }
    : { background: 'var(--bg3)', color: 'var(--sub)', borderColor: 'var(--line)' }
  return <button style={{ ...base, ...s }} onClick={onClick} disabled={disabled} type={type}>{children}</button>
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 6px', borderRadius: 2, fontSize: 10, fontFamily: 'var(--font-geist-mono),monospace', fontWeight: 600, border: '1px solid', background: role === 'admin' ? 'var(--accent-glow)' : 'var(--bg3)', color: role === 'admin' ? 'var(--accent2)' : 'var(--muted)', borderColor: role === 'admin' ? 'rgba(124,58,237,.2)' : 'var(--line)' }}>
      {role}
    </span>
  )
}

function AddUserForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role,     setRole]     = useState<UserRole>('viewer')
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState<{ text: string; ok: boolean } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null)
    try {
      const res = await fetch('/api/settings/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, full_name: fullName, role }) })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) { setMsg({ text: json.error ?? 'Failed to create user', ok: false }) }
      else { onCreated() }
    } catch { setMsg({ text: 'Network error', ok: false }) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: 16, marginBottom: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 12, fontFamily: 'var(--font-geist-mono),monospace' }}>add_user</div>
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          {[
            { label: 'full_name', val: fullName, set: setFullName, type: 'text',     ph: 'Jane Smith' },
            { label: 'email',     val: email,    set: setEmail,    type: 'email',    ph: 'jane@example.com' },
            { label: 'password',  val: password, set: setPassword, type: 'password', ph: 'min 8 chars' },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 9.5, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{f.label}</div>
              <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} required placeholder={f.ph} style={INPUT} />
            </div>
          ))}
          <div>
            <div style={{ fontSize: 9.5, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>role</div>
            <select value={role} onChange={e => setRole(e.target.value as UserRole)} style={{ ...INPUT, height: 30 }}>
              <option value="viewer">viewer</option>
              <option value="admin">admin</option>
            </select>
          </div>
        </div>
        {msg && <div style={{ fontSize: 11, marginBottom: 8, color: msg.ok ? 'var(--green)' : 'var(--red)' }}>{msg.text}</div>}
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create User'}</Btn>
          <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        </div>
      </form>
    </div>
  )
}

function UserRow({ user, isSelf, onMutate }: { user: UserProfile; isSelf: boolean; onMutate: () => void }) {
  const [toggling, setToggling] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function toggleActive() {
    setToggling(true)
    try { await fetch(`/api/settings/users/${user.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !user.is_active }) }); onMutate() }
    finally { setToggling(false) }
  }

  async function remove() {
    if (!confirm(`Delete user ${user.email}?`)) return
    setDeleting(true)
    try { await fetch(`/api/settings/users/${user.id}`, { method: 'DELETE' }); onMutate() }
    finally { setDeleting(false) }
  }

  return (
    <tr>
      <td style={TD}><span style={{ color: 'var(--text2)' }}>{user.full_name ?? <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>—</span>}</span></td>
      <td style={{ ...TD, fontFamily: 'var(--font-geist-mono),monospace', fontSize: 11, color: 'var(--muted)' }}>{user.email}</td>
      <td style={TD}><RoleBadge role={user.role} /></td>
      <td style={TD}><span style={{ fontSize: 11, fontFamily: 'var(--font-geist-mono),monospace', fontWeight: 600, color: user.is_active ? 'var(--green)' : 'var(--red)' }}>{user.is_active ? 'active' : 'locked'}</span></td>
      <td style={TD}>
        <div style={{ display: 'flex', gap: 5 }}>
          <Btn variant="ghost" onClick={toggleActive} disabled={isSelf || toggling}>{toggling ? '…' : user.is_active ? 'lock' : 'unlock'}</Btn>
          <Btn variant="danger" onClick={remove} disabled={isSelf || deleting}>{deleting ? '…' : 'delete'}</Btn>
        </div>
      </td>
    </tr>
  )
}

export default function UsersTab() {
  const { profile }                         = useProfile()
  const { users, isLoading, error, mutate } = useUsers()
  const [showAdd, setShowAdd]               = useState(false)

  return (
    <div>
      {isLoading && <div style={{ color: 'var(--muted)', fontSize: 12, padding: '24px 0' }}>Loading…</div>}
      {error && <ErrorState message="Failed to load users" onRetry={() => void mutate()} />}
      {!isLoading && !error && (
        <>
          {showAdd && (
            <AddUserForm onCreated={() => { setShowAdd(false); void mutate() }} onCancel={() => setShowAdd(false)} />
          )}
          <div style={PANEL}>
            <div style={PANEL_HEAD}>
              <div style={PANEL_TITLE}>{users.length} user{users.length !== 1 ? 's' : ''}</div>
              {!showAdd && (
                <Btn onClick={() => setShowAdd(true)}>+ Add User</Btn>
              )}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg3)' }}>
                  <th style={TH}>name</th><th style={TH}>email</th><th style={TH}>role</th><th style={TH}>status</th><th style={TH}>actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr><td colSpan={5} style={{ ...TD, textAlign: 'center', color: 'var(--muted)', padding: '24px 12px' }}>No users found</td></tr>
                )}
                {users.map(u => (
                  <UserRow key={u.id} user={u} isSelf={u.id === profile?.id} onMutate={() => void mutate()} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
