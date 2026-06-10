'use client'

import { useState, useEffect } from 'react'
import { useSystemSettings } from '@/lib/hooks/use-system-settings'
import { ErrorState } from '@/components/ui/ErrorState'

const PANEL: React.CSSProperties = {
  background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden', marginBottom: 10,
}
const PANEL_HEAD: React.CSSProperties = {
  padding: '10px 14px', borderBottom: '1px solid var(--line)',
  fontSize: 11, fontWeight: 600, color: 'var(--sub)',
  fontFamily: 'var(--font-geist-mono),monospace', textTransform: 'uppercase', letterSpacing: '.6px',
}
const SECTION_TITLE: React.CSSProperties = {
  fontSize: 10, fontFamily: 'var(--font-geist-mono),monospace', textTransform: 'uppercase',
  letterSpacing: '.8px', color: 'var(--muted)', marginBottom: 10,
}
const FIELD_LABEL: React.CSSProperties = {
  display: 'block', fontSize: 10.5, fontWeight: 500, color: 'var(--sub)',
  marginBottom: 4, fontFamily: 'var(--font-geist-mono),monospace',
}
const INPUT_STYLE: React.CSSProperties = {
  width: '100%', padding: '6px 9px', border: '1px solid var(--line)', borderRadius: 'var(--r)',
  fontSize: 12, fontFamily: 'var(--font-geist),sans-serif', color: 'var(--text)',
  background: 'var(--bg3)', outline: 'none',
}
const SELECT_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
}

interface ToggleRowProps {
  label:       string
  description: string
  checked:     boolean
  onChange:    (val: boolean) => void
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{description}</div>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 32, height: 18, borderRadius: 9, flexShrink: 0,
          background: checked ? 'var(--accent)' : 'var(--bg3)',
          border: `1px solid ${checked ? 'var(--accent)' : 'var(--line2)'}`,
          position: 'relative', cursor: 'pointer', transition: 'background .2s,border .2s',
        }}
      >
        <span style={{
          position: 'absolute', width: 12, height: 12, borderRadius: '50%', background: '#fff',
          top: 2, left: checked ? 16 : 2, transition: 'left .15s',
          boxShadow: '0 1px 2px rgba(0,0,0,.3)',
        }} />
      </button>
    </div>
  )
}

export default function SftpTab() {
  const { settings, isLoading, error, mutate } = useSystemSettings()

  const [host,         setHost]         = useState('')
  const [port,         setPort]         = useState('22')
  const [username,     setUsername]     = useState('')
  const [authType,     setAuthType]     = useState('ssh_key')
  const [cron,         setCron]         = useState('0 */1 * * *')
  const [timezone,     setTimezone]     = useState('Asia/Baghdad')
  const [autoIngest,   setAutoIngest]   = useState(true)
  const [dedupDetect,  setDedupDetect]  = useState(true)
  const [emailAlerts,  setEmailAlerts]  = useState(true)
  const [telegramBot,  setTelegramBot]  = useState(false)

  const [saving, setSaving] = useState(false)
  const [msg,    setMsg]    = useState<{ text: string; ok: boolean } | null>(null)

  function getValue(key: string): string {
    return settings.find(s => s.key === key)?.value ?? ''
  }

  useEffect(() => {
    if (!settings.length) return
    setHost(getValue('sftp_host'))
    setPort(getValue('sftp_port') || '22')
    setUsername(getValue('sftp_username'))
    setAuthType(getValue('sftp_auth_type') || 'ssh_key')
    setCron(getValue('ingest_cron') || '0 */1 * * *')
    setTimezone(getValue('ingest_timezone') || 'Asia/Baghdad')
    setAutoIngest((getValue('auto_ingestion') || 'true') === 'true')
    setDedupDetect((getValue('dedup_detection') || 'true') === 'true')
    setEmailAlerts((getValue('email_alerts') || 'true') === 'true')
    setTelegramBot(getValue('telegram_bot_enabled') === 'true')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings])

  async function handleSave() {
    setSaving(true); setMsg(null)
    try {
      const pairs = [
        { key: 'sftp_host',          value: host },
        { key: 'sftp_port',          value: port },
        { key: 'sftp_username',      value: username },
        { key: 'sftp_auth_type',     value: authType },
        { key: 'ingest_cron',        value: cron },
        { key: 'ingest_timezone',    value: timezone },
        { key: 'auto_ingestion',     value: String(autoIngest) },
        { key: 'dedup_detection',    value: String(dedupDetect) },
        { key: 'email_alerts',       value: String(emailAlerts) },
        { key: 'telegram_bot_enabled', value: String(telegramBot) },
      ]
      const res = await fetch('/api/settings/system', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(pairs),
      })
      if (!res.ok) throw new Error('Save failed')
      await mutate()
      setMsg({ text: 'Settings saved', ok: true })
      setTimeout(() => setMsg(null), 4000)
    } catch { setMsg({ text: 'Failed to save', ok: false }) }
    finally { setSaving(false) }
  }

  if (isLoading) return <div style={{ color: 'var(--muted)', fontSize: 12, padding: '24px 0' }}>Loading…</div>
  if (error) return <ErrorState message="Failed to load settings" onRetry={() => void mutate()} />

  return (
    <div>
      {/* SFTP Server */}
      <div style={{ ...PANEL }}>
        <div style={PANEL_HEAD}>sftp_server</div>
        <div style={{ padding: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={FIELD_LABEL}>host</label>
              <input value={host} onChange={e => setHost(e.target.value)} style={INPUT_STYLE} placeholder="sftp.corp.internal" />
            </div>
            <div>
              <label style={FIELD_LABEL}>port</label>
              <input type="number" value={port} onChange={e => setPort(e.target.value)} style={INPUT_STYLE} placeholder="22" />
            </div>
            <div>
              <label style={FIELD_LABEL}>username</label>
              <input value={username} onChange={e => setUsername(e.target.value)} style={INPUT_STYLE} placeholder="dd_monitor_svc" />
            </div>
            <div>
              <label style={FIELD_LABEL}>auth_type</label>
              <select value={authType} onChange={e => setAuthType(e.target.value)} style={{ ...SELECT_STYLE }}>
                <option value="ssh_key">SSH Key</option>
                <option value="password">Password</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div style={{ ...PANEL }}>
        <div style={PANEL_HEAD}>schedule</div>
        <div style={{ padding: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={FIELD_LABEL}>cron</label>
              <input value={cron} onChange={e => setCron(e.target.value)} style={INPUT_STYLE} placeholder="0 */1 * * *" />
            </div>
            <div>
              <label style={FIELD_LABEL}>timezone</label>
              <select value={timezone} onChange={e => setTimezone(e.target.value)} style={{ ...SELECT_STYLE }}>
                <option value="Asia/Baghdad">Asia/Baghdad</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Toggles */}
      <div style={{ ...PANEL }}>
        <div style={PANEL_HEAD}>features</div>
        <div style={{ padding: '0 14px' }}>
          <ToggleRow label="auto_ingestion"  description="Process new SFTP files automatically"   checked={autoIngest}  onChange={setAutoIngest} />
          <ToggleRow label="dedup_detection" description="Skip already-processed files"            checked={dedupDetect} onChange={setDedupDetect} />
          <ToggleRow label="email_alerts"    description="Send alerts to configured addresses"     checked={emailAlerts} onChange={setEmailAlerts} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)' }}>telegram_bot</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Push critical alerts via Telegram</div>
            </div>
            <button
              role="switch"
              aria-checked={telegramBot}
              onClick={() => setTelegramBot(v => !v)}
              style={{ width: 32, height: 18, borderRadius: 9, flexShrink: 0, background: telegramBot ? 'var(--accent)' : 'var(--bg3)', border: `1px solid ${telegramBot ? 'var(--accent)' : 'var(--line2)'}`, position: 'relative', cursor: 'pointer', transition: 'background .2s,border .2s' }}
            >
              <span style={{ position: 'absolute', width: 12, height: 12, borderRadius: '50%', background: '#fff', top: 2, left: telegramBot ? 16 : 2, transition: 'left .15s', boxShadow: '0 1px 2px rgba(0,0,0,.3)' }} />
            </button>
          </div>
        </div>
      </div>

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 16px', borderRadius: 'var(--r)', fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .6 : 1, background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)' }}
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {msg && <span style={{ fontSize: 12, color: msg.ok ? 'var(--green)' : 'var(--red)' }}>{msg.text}</span>}
      </div>
    </div>
  )
}
