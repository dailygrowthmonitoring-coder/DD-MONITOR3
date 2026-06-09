'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { SkeletonBlock } from '@/components/ui/SkeletonCard'
import { ErrorState } from '@/components/ui/ErrorState'
import { useSystemSettings } from '@/lib/hooks/use-system-settings'

const MIN_HOUR            = 0
const MAX_HOUR            = 23
const MIN_RETENTION_DAYS  = 1
const MAX_RETENTION_DAYS  = 40

interface SettingRowProps {
  label:       string
  settingKey:  string
  value:       string
  description?: string
  inputType?:  'text' | 'number'
  min?:        number
  max?:        number
  onSave:      (key: string, value: string) => Promise<void>
}

function SettingRow({ label, settingKey, value: initialValue, description, inputType = 'text', min, max, onSave }: SettingRowProps) {
  const [value,   setValue]   = useState(initialValue)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => { setValue(initialValue) }, [initialValue])

  async function handleSave() {
    setSaving(true)
    setMsg(null)
    try {
      await onSave(settingKey, value)
      setMsg({ text: 'Saved', ok: true })
      setTimeout(() => setMsg(null), 3000)
    } catch {
      setMsg({ text: 'Failed to save', ok: false })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 py-4 border-b border-app-border/50 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5 flex-1">
          <label className="text-sm font-medium text-txt-primary">{label}</label>
          {description && (
            <p className="text-xs text-txt-muted">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <input
            type={inputType}
            value={value}
            min={min}
            max={max}
            onChange={e => setValue(e.target.value)}
            className={`h-9 rounded border border-app-border bg-app-bg text-txt-primary text-sm px-3 font-mono focus:outline-none focus:border-accent ${
              inputType === 'number' ? 'w-24' : 'w-64'
            }`}
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 rounded bg-accent text-app-bg text-sm font-semibold hover:bg-accent/90 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      {msg && (
        <p className={`text-xs ${msg.ok ? 'text-st-healthy' : 'text-st-critical'}`}>{msg.text}</p>
      )}
    </div>
  )
}

export default function SystemTab() {
  const { settings, isLoading, error, mutate } = useSystemSettings()

  async function saveSetting(key: string, value: string) {
    const res = await fetch('/api/settings/system', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify([{ key, value }]),
    })
    if (!res.ok) throw new Error('Save failed')
    await mutate()
  }

  function getValue(key: string): string {
    return settings.find(s => s.key === key)?.value ?? ''
  }

  if (isLoading) {
    return (
      <Card>
        <SkeletonBlock className="h-48 rounded" />
      </Card>
    )
  }

  if (error) {
    return <ErrorState message="Failed to load settings" onRetry={() => mutate()} />
  }

  return (
    <Card title="System Configuration">
      <div className="flex flex-col">
        <SettingRow
          label="Alert Recipients"
          settingKey="alert_emails"
          value={getValue('alert_emails')}
          description="Comma-separated email addresses that receive alert notifications"
          inputType="text"
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
        <SettingRow
          label="Data Retention Period"
          settingKey="data_retention_days"
          value={getValue('data_retention_days')}
          description={`Reports older than this will be automatically deleted (${MIN_RETENTION_DAYS}–${MAX_RETENTION_DAYS} days)`}
          inputType="number"
          min={MIN_RETENTION_DAYS}
          max={MAX_RETENTION_DAYS}
          onSave={saveSetting}
        />
      </div>
    </Card>
  )
}
