'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { SkeletonBlock } from '@/components/ui/SkeletonCard'
import { ErrorState } from '@/components/ui/ErrorState'
import { useUsers } from '@/lib/hooks/use-users'
import { useProfile } from '@/lib/hooks/use-profile'
import type { UserProfile, UserRole } from '@/types/dashboard'

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
        role === 'admin' ? 'bg-accent/20 text-accent' : 'bg-app-border text-txt-muted'
      }`}
    >
      {role === 'admin' ? 'Admin' : 'Viewer'}
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
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/settings/users', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password, full_name: fullName, role }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        setMsg({ text: json.error ?? 'Failed to create user', ok: false })
      } else {
        onCreated()
      }
    } catch {
      setMsg({ text: 'Network error', ok: false })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="border border-app-border rounded-lg p-4 flex flex-col gap-4 bg-app-bg">
      <h3 className="text-sm font-semibold text-txt-primary">Add New User</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-txt-muted font-medium">Full Name</label>
          <input
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
            placeholder="Jane Smith"
            className="h-9 rounded border border-app-border bg-app-card text-txt-primary text-sm px-3 focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-txt-muted font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="jane@example.com"
            className="h-9 rounded border border-app-border bg-app-card text-txt-primary text-sm px-3 focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-txt-muted font-medium">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Min 8 characters"
            className="h-9 rounded border border-app-border bg-app-card text-txt-primary text-sm px-3 focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-txt-muted font-medium">Role</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value as UserRole)}
            className="h-9 rounded border border-app-border bg-app-card text-txt-primary text-sm px-3 focus:outline-none focus:border-accent"
          >
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      {msg && (
        <p className={`text-sm ${msg.ok ? 'text-st-healthy' : 'text-st-critical'}`}>{msg.text}</p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded bg-accent text-app-bg text-sm font-semibold hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Creating…' : 'Create User'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded border border-app-border text-txt-muted text-sm hover:text-txt-primary transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function UserRow({ user, isSelf, onMutate }: { user: UserProfile; isSelf: boolean; onMutate: () => void }) {
  const [toggling,  setToggling]  = useState(false)
  const [deleting,  setDeleting]  = useState(false)

  async function toggleActive() {
    setToggling(true)
    try {
      await fetch(`/api/settings/users/${user.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ is_active: !user.is_active }),
      })
      onMutate()
    } finally {
      setToggling(false)
    }
  }

  async function remove() {
    if (!confirm(`Delete user ${user.email}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await fetch(`/api/settings/users/${user.id}`, { method: 'DELETE' })
      onMutate()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <tr className="border-b border-app-border/50 hover:bg-app-card/60 transition-colors">
      <td className="px-4 py-3 text-txt-primary text-sm">{user.full_name ?? <span className="text-txt-muted italic">—</span>}</td>
      <td className="px-4 py-3 font-mono text-txt-muted text-xs">{user.email}</td>
      <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
      <td className="px-4 py-3">
        <span className={`text-xs font-semibold ${user.is_active ? 'text-st-healthy' : 'text-st-critical'}`}>
          {user.is_active ? 'Active' : 'Locked'}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleActive}
            disabled={isSelf || toggling}
            className="px-2 py-1 rounded text-xs border border-app-border text-txt-muted hover:text-txt-primary hover:border-accent/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title={isSelf ? 'Cannot lock your own account' : (user.is_active ? 'Lock user' : 'Unlock user')}
          >
            {toggling ? '…' : (user.is_active ? 'Lock' : 'Unlock')}
          </button>
          <button
            onClick={remove}
            disabled={isSelf || deleting}
            className="px-2 py-1 rounded text-xs border border-st-critical/30 text-st-critical hover:bg-st-critical/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title={isSelf ? 'Cannot delete your own account' : 'Delete user'}
          >
            {deleting ? '…' : 'Delete'}
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function UsersTab() {
  const { profile }                = useProfile()
  const { users, isLoading, error, mutate } = useUsers()
  const [showAdd, setShowAdd]      = useState(false)

  if (isLoading) {
    return (
      <Card>
        <SkeletonBlock className="h-48 rounded" />
      </Card>
    )
  }

  if (error) {
    return <ErrorState message="Failed to load users" onRetry={() => mutate()} />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-txt-muted">{users.length} user{users.length !== 1 ? 's' : ''}</p>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 rounded bg-accent text-app-bg text-sm font-semibold hover:bg-accent/90 transition-colors"
          >
            + Add User
          </button>
        )}
      </div>

      {showAdd && (
        <AddUserForm
          onCreated={() => { setShowAdd(false); void mutate() }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      <Card>
        <div className="overflow-x-auto rounded-lg border border-app-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-app-border bg-app-card">
                <th className="px-4 py-3 text-left font-medium text-txt-muted">Name</th>
                <th className="px-4 py-3 text-left font-medium text-txt-muted">Email</th>
                <th className="px-4 py-3 text-left font-medium text-txt-muted">Role</th>
                <th className="px-4 py-3 text-left font-medium text-txt-muted">Status</th>
                <th className="px-4 py-3 text-left font-medium text-txt-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-txt-muted">No users found</td>
                </tr>
              )}
              {users.map(user => (
                <UserRow
                  key={user.id}
                  user={user}
                  isSelf={user.id === profile?.id}
                  onMutate={() => void mutate()}
                />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
