'use client'
import { useState, useEffect } from 'react'
import { ErrorState } from '@/components/ui/ErrorState'
import { useSystemSettings } from '@/lib/hooks/use-system-settings'

const MIN_HOUR           = 0
const MAX_HOUR           = 23
const MIN_RETENTION_DAYS = 1
const MAX_RETENTION_DAYS = 40

const PANEL: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden', marginBottom: 10 }
const PANEL_HEAD: React.CSSProperties = { padding: '10px 14px', borderBottom: '1px solid var(--line)', fontSize: 11, fontWeight: 600, color: 'var(--sub)', fontFamily: 'var(--font-geist-mono),monospace', textTransform: 'uppercase', letterSpacing: '.6px' }
const FIELD_LABEL: React.CSSProperties = { fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }

interface SettingRowProps {
  label:       string
  description?: string
  settingKey:  string
  value:       string
  inputType?:  'text' | 'number'
  min?:        number
  max?:        number
  onSave:      (key: string, value: string) => Promise<void>
}

function SettingRow({ label, description, settingKey, value: initialValue, inputType = 'text', min, max, onSave }: SettingRowProps) {
  const [val,    setVal]    = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [msg,    setMsg]    = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => { setVal(initialValue) }, [initialValue])

  async function handleSave() {
    setSaving(true); setMsg(null)
    try {
      await onSave(settingKey, val)
      setMsg({ text: 'Saved', ok: true })
      setTimeout(() => setMsg(null), 3000)
    } catch { setMsg({ text: 'Failed to save', ok: false }) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text2)', marginBottom: 3 }}>{label}</div>
          {description && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{description}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <input type={inputType} value={val} min={min} max={max} onChange={e => setVal(e.target.value)} style={{ height: 30, borderRadius: 'var(--r)', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12, padding: '0 8px', fontFamily: 'var(--font-geist-mono),monospace', outline: 'none', width: inputType === 'number' ? 80 : 240 }} />
          <button onClick={handleSave} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: 'var(--r)', fontSize: 11.5, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .6 : 1, background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)', whiteSpace: 'nowrap' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      {msg && <div style={{ fontSize: 11, marginTop: 5, color: msg.ok ? 'var(--green)' : 'var(--red)' }}>{msg.text}</div>}
    </div>
  )
}

export default function SystemTab() {
  const { settings, isLoading, error, mutate } = useSystemSettings()

  async function saveSetting(key: string, value: string) {
    const res = await fetch('/api/settings/system', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify([{ key, value }]) })
    if (!res.ok) throw new Error('Save failed')
    await mutate()
  }

  function getValue(key: string): string {
    return settings.find(s => s.key === key)?.value ?? ''
  }

  if (isLoading) return <div style={{ color: 'var(--muted)', fontSize: 12, padding: '24px 0' }}>Loading…</div>
  if (error) return <ErrorState message="Failed to load settings" onRetry={() => void mutate()} />

  return (
    <div style={PANEL}>
      <div style={PANEL_HEAD}>system_configuration</div>
      <div>
        <SettingRow
          label="Alert Recipients"
          settingKey="alert_emails"
          value={getValue('alert_emails')}
          description="Comma-separated email addresses that receive alert notifications"
          onSave={saveSetting}
        />
        <SettingRow
          label="Daily Report Deadline"
          settingKey="report_deadline_hour"
          value={getValue('report_deadline_hour')}
          description={`Alert sent if report not received by this hour (Baghdad time, 0–${MAX_HOUR})`}
          inputType="number"
          min={MIN_HOUR}
          max={MAX_HOUR}
          onSave={saveSetting}
        />
        <div style={{ borderBottom: 'none' }}>
          <SettingRow
            label="Data Retention Period"
            settingKey="data_retention_days"
            value={getValue('data_retention_days')}
            description={`Reports older than this are auto-deleted (${MIN_RETENTION_DAYS}–${MAX_RETENTION_DAYS} days)`}
            inputType="number"
            min={MIN_RETENTION_DAYS}
            max={MAX_RETENTION_DAYS}
            onSave={saveSetting}
          />
        </div>
      </div>
    </div>
  )
}
