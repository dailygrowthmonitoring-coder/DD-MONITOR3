'use client'

import { useState } from 'react'
import { useAlertRules } from '@/lib/hooks/use-alert-rules'
import { ErrorState } from '@/components/ui/ErrorState'
import type { AlertRuleItem } from '@/types/dashboard'

type SevCls = 'cr' | 'wa' | 'in'

function getSevCls(sev: string): SevCls {
  if (sev === 'CRITICAL') return 'cr'
  if (sev === 'WARNING')  return 'wa'
  return 'in'
}

const BADGE_STYLE: Record<SevCls, React.CSSProperties> = {
  cr: { background: 'var(--red-bg)',   color: 'var(--red)',   borderColor: 'rgba(239,68,68,.2)' },
  wa: { background: 'var(--amber-bg)', color: 'var(--amber)', borderColor: 'rgba(245,158,11,.2)' },
  in: { background: 'var(--blue-bg)',  color: 'var(--blue)',  borderColor: 'rgba(59,130,246,.2)' },
}

const BD: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px',
  borderRadius: 2, fontSize: 10, fontFamily: 'var(--font-geist-mono),monospace',
  fontWeight: 500, border: '1px solid',
}

const PANEL: React.CSSProperties = {
  background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden',
}
const PANEL_HEAD: React.CSSProperties = {
  padding: '10px 14px', borderBottom: '1px solid var(--line)',
  fontSize: 11, fontWeight: 600, color: 'var(--sub)',
  fontFamily: 'var(--font-geist-mono),monospace', textTransform: 'uppercase', letterSpacing: '.6px',
}

interface RuleRowProps {
  rule: AlertRuleItem
  onSave: (id: string, threshold: number) => Promise<void>
}

function RuleRow({ rule, onSave }: RuleRowProps) {
  const [value,  setValue]  = useState(String(rule.threshold))
  const [saving, setSaving] = useState(false)
  const [msg,    setMsg]    = useState<{ text: string; ok: boolean } | null>(null)
  const cls = getSevCls(rule.severity)
  const dirty = value !== String(rule.threshold)

  async function handleSave() {
    const num = parseFloat(value)
    if (isNaN(num) || num <= 0) { setMsg({ text: 'Invalid value', ok: false }); return }
    setSaving(true); setMsg(null)
    try {
      await onSave(rule.id, num)
      setMsg({ text: 'Saved', ok: true })
      setTimeout(() => setMsg(null), 3000)
    } catch { setMsg({ text: 'Failed', ok: false }) }
    finally { setSaving(false) }
  }

  return (
    <tr>
      <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', fontFamily: 'var(--font-geist-mono),monospace', color: 'var(--sub)', fontSize: 11.5 }}>
        {rule.metric}
      </td>
      <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', fontFamily: 'var(--font-geist-mono),monospace', color: 'var(--muted)', fontSize: 11 }}>
        {rule.operator}
      </td>
      <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
        <input
          type="number"
          value={value}
          onChange={e => setValue(e.target.value)}
          style={{ width: 80, height: 28, borderRadius: 'var(--r)', border: `1px solid ${dirty ? 'var(--accent)' : 'var(--line)'}`, background: 'var(--bg)', color: 'var(--text)', fontSize: 12, padding: '0 8px', fontFamily: 'var(--font-geist-mono),monospace', outline: 'none' }}
        />
      </td>
      <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
        <span style={{ ...BD, ...BADGE_STYLE[cls] }}>{rule.severity.toLowerCase()}</span>
      </td>
      <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => void handleSave()}
            disabled={saving || !dirty}
            style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 'var(--r)', fontSize: 11, fontWeight: 600, cursor: saving || !dirty ? 'not-allowed' : 'pointer', opacity: saving || !dirty ? .5 : 1, background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)' }}
          >
            {saving ? '…' : 'Save'}
          </button>
          {msg && <span style={{ fontSize: 11, color: msg.ok ? 'var(--green)' : 'var(--red)' }}>{msg.text}</span>}
        </div>
      </td>
    </tr>
  )
}

export default function AlertRulesTab() {
  const { rules, isLoading, error, mutate } = useAlertRules()

  async function handleSave(id: string, threshold: number) {
    const res = await fetch('/api/alerts/rules', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, threshold }),
    })
    if (!res.ok) throw new Error('Save failed')
    await mutate()
  }

  if (isLoading) return <div style={{ color: 'var(--muted)', fontSize: 12, padding: '24px 0' }}>Loading…</div>
  if (error) return <ErrorState message="Failed to load alert rules" onRetry={() => void mutate()} />

  return (
    <div style={PANEL}>
      <div style={PANEL_HEAD}>alert_rules</div>
      {rules.length === 0 ? (
        <div style={{ padding: '24px 14px', color: 'var(--muted)', fontSize: 12, textAlign: 'center' }}>
          No alert rules configured.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['metric', 'operator', 'threshold', 'severity', ''].map(h => (
                <th key={h} style={{ padding: '8px 14px', borderBottom: '1px solid var(--line)', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', textAlign: 'left' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rules.map(rule => (
              <RuleRow key={rule.id} rule={rule} onSave={handleSave} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
