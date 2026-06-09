'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Card } from '@/components/ui/Card'
import { SkeletonBlock, SkeletonText } from '@/components/ui/SkeletonCard'
import { useProfile } from '@/lib/hooks/use-profile'
import type { UserRole } from '@/types/dashboard'

const MIN_PASSWORD_LENGTH = 8

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
        role === 'admin'
          ? 'bg-accent/20 text-accent'
          : 'bg-app-border text-txt-muted'
      }`}
    >
      {role === 'admin' ? 'Admin' : 'Viewer'}
    </span>
  )
}

function initials(name: string | null, email: string): string {
  if (name) {
    return name.split(' ').map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

export default function ProfileTab() {
  const { profile, isLoading, mutate } = useProfile()

  const [editName,     setEditName]     = useState('')
  const [nameEditing,  setNameEditing]  = useState(false)
  const [nameSaving,   setNameSaving]   = useState(false)
  const [nameMsg,      setNameMsg]      = useState<{ text: string; ok: boolean } | null>(null)

  const [curPwd,   setCurPwd]   = useState('')
  const [newPwd,   setNewPwd]   = useState('')
  const [confPwd,  setConfPwd]  = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdMsg,    setPwdMsg]    = useState<{ text: string; ok: boolean } | null>(null)

  function startEdit() {
    setEditName(profile?.full_name ?? '')
    setNameEditing(true)
    setNameMsg(null)
  }

  async function saveName() {
    setNameSaving(true)
    setNameMsg(null)
    try {
      const res = await fetch('/api/settings/profile', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ full_name: editName || null }),
      })
      if (!res.ok) throw new Error('Failed')
      await mutate()
      setNameEditing(false)
      setNameMsg({ text: 'Name updated', ok: true })
    } catch {
      setNameMsg({ text: 'Failed to update name', ok: false })
    } finally {
      setNameSaving(false)
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwdMsg(null)
    if (newPwd.length < MIN_PASSWORD_LENGTH) {
      setPwdMsg({ text: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`, ok: false })
      return
    }
    if (newPwd !== confPwd) {
      setPwdMsg({ text: 'Passwords do not match', ok: false })
      return
    }
    setPwdSaving(true)
    try {
      const res = await fetch('/api/settings/password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ current_password: curPwd, new_password: newPwd }),
      })
      const json = (await res.json()) as { error?: string; message?: string }
      if (!res.ok) {
        setPwdMsg({ text: json.error ?? 'Failed to change password', ok: false })
      } else {
        setPwdMsg({ text: 'Password changed successfully', ok: true })
        setCurPwd(''); setNewPwd(''); setConfPwd('')
      }
    } catch {
      setPwdMsg({ text: 'Network error', ok: false })
    } finally {
      setPwdSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Card><SkeletonBlock className="h-24 rounded" /></Card>
        <Card><SkeletonBlock className="h-48 rounded" /></Card>
      </div>
    )
  }

  if (!profile) {
    return <p className="text-txt-muted text-sm">Could not load profile.</p>
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Identity */}
      <Card title="Profile">
        <div className="flex items-start gap-5">
          <div className="flex-shrink-0 w-14 h-14 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent font-bold text-lg font-mono select-none">
            {initials(profile.full_name, profile.email)}
          </div>

          <div className="flex-1 flex flex-col gap-3">
            {/* Full name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-txt-muted font-medium">Full Name</label>
              {nameEditing ? (
                <div className="flex gap-2">
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="h-9 flex-1 rounded border border-app-border bg-app-bg text-txt-primary text-sm px-3 focus:outline-none focus:border-accent"
                    autoFocus
                  />
                  <button
                    onClick={saveName}
                    disabled={nameSaving}
                    className="px-3 py-1 rounded bg-accent text-app-bg text-sm font-semibold hover:bg-accent/90 disabled:opacity-50"
                  >
                    {nameSaving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => setNameEditing(false)}
                    className="px-3 py-1 rounded border border-app-border text-txt-muted text-sm hover:text-txt-primary"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-txt-primary text-sm">
                    {profile.full_name ?? <span className="text-txt-muted italic">Not set</span>}
                  </span>
                  <button
                    onClick={startEdit}
                    className="text-xs text-accent hover:text-accent/80 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              )}
              {nameMsg && (
                <p className={`text-xs ${nameMsg.ok ? 'text-st-healthy' : 'text-st-critical'}`}>
                  {nameMsg.text}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-txt-muted font-medium">Email</label>
              <span className="text-txt-primary font-mono text-sm">{profile.email}</span>
            </div>

            {/* Role + joined */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-txt-muted font-medium">Role</label>
                <RoleBadge role={profile.role} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-txt-muted font-medium">Member since</label>
                <span className="text-txt-primary text-sm font-mono">
                  {format(parseISO(profile.created_at), 'MMM dd, yyyy')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Change password */}
      <Card title="Change Password">
        <form onSubmit={changePassword} className="flex flex-col gap-4 max-w-sm">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-txt-muted font-medium" htmlFor="cur-pwd">Current Password</label>
            <input
              id="cur-pwd"
              type="password"
              value={curPwd}
              onChange={e => setCurPwd(e.target.value)}
              required
              autoComplete="current-password"
              className="h-9 rounded border border-app-border bg-app-bg text-txt-primary text-sm px-3 focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-txt-muted font-medium" htmlFor="new-pwd">New Password</label>
            <input
              id="new-pwd"
              type="password"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              className="h-9 rounded border border-app-border bg-app-bg text-txt-primary text-sm px-3 focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-txt-muted font-medium" htmlFor="conf-pwd">Confirm New Password</label>
            <input
              id="conf-pwd"
              type="password"
              value={confPwd}
              onChange={e => setConfPwd(e.target.value)}
              required
              autoComplete="new-password"
              className="h-9 rounded border border-app-border bg-app-bg text-txt-primary text-sm px-3 focus:outline-none focus:border-accent"
            />
          </div>
          {pwdMsg && (
            <p className={`text-sm ${pwdMsg.ok ? 'text-st-healthy' : 'text-st-critical'}`}>
              {pwdMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={pwdSaving}
            className="self-start px-4 py-2 rounded bg-accent text-app-bg text-sm font-semibold hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {pwdSaving ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      </Card>
    </div>
  )
}
