'use client';

/**
 * Settings page — /settings
 *
 * 2-column nav + content. Sections: sftp_connection, alert_rules,
 * notifications, retention, access_control.
 */

import { useEffect, useState, useCallback } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { EmptyState } from '@/components/ui/EmptyState';
import { fetchAlertRules, updateAlertRule } from '@/lib/frontend/api';
import type { AlertRuleDTO } from '@/lib/frontend/api';

type Section = 'sftp_connection' | 'alert_rules' | 'notifications' | 'retention' | 'access_control';

const NAV_ITEMS: { id: Section; label: string }[] = [
  { id: 'sftp_connection',  label: 'SFTP Connection' },
  { id: 'alert_rules',      label: 'Alert Rules' },
  { id: 'notifications',    label: 'Notifications' },
  { id: 'retention',        label: 'Retention' },
  { id: 'access_control',   label: 'Access Control' },
];

export default function SettingsPage() {
  const [section, setSection] = useState<Section>('sftp_connection');
  const [rules, setRules]     = useState<AlertRuleDTO[]>([]);
  const [changes, setChanges] = useState<Map<string, Partial<AlertRuleDTO>>>(new Map());
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [rulesLoading, setRulesLoading] = useState(false);

  const loadRules = useCallback(async () => {
    setRulesLoading(true);
    const res = await fetchAlertRules();
    if (res.success) setRules(res.data);
    setRulesLoading(false);
  }, []);

  useEffect(() => {
    if (section === 'alert_rules') void loadRules();
  }, [section, loadRules]);

  function applyChange(id: string, patch: Partial<AlertRuleDTO>) {
    setChanges(prev => {
      const next = new Map(prev);
      next.set(id, { ...(next.get(id) ?? {}), ...patch });
      return next;
    });
  }

  async function saveRules() {
    setSaving(true);
    for (const [id, patch] of changes.entries()) {
      const update: { threshold?: number; isEnabled?: boolean; severity?: string } = {};
      if (patch.threshold !== undefined) update.threshold = patch.threshold;
      if (patch.isEnabled !== undefined) update.isEnabled = patch.isEnabled;
      if (patch.severity  !== undefined) update.severity  = patch.severity;
      await updateAlertRule(id, update);
    }
    setChanges(new Map());
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    void loadRules();
  }

  return (
    <>
      <div className="page-hd">
        <div className="page-hd-left">
          <h1 className="page-title">Settings</h1>
          <div className="page-sub">System configuration</div>
        </div>
      </div>

      <div className="set-grid">
        {/* Left nav */}
        <div className="set-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`set-nav-item${section === item.id ? ' active' : ''}`}
              onClick={() => setSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Right content */}
        <div className="set-content">
          {/* SFTP Connection */}
          {section === 'sftp_connection' && (
            <>
              <div className="set-section-title">SFTP Connection</div>
              {[
                { label: 'Host',     sub: 'SFTP server hostname',    val: 'sftp.corp.internal' },
                { label: 'Port',     sub: 'Connection port',         val: '22' },
                { label: 'Auth',     sub: 'Authentication method',   val: 'SSH Key / x-api-key' },
                { label: 'Schedule', sub: 'Ingestion cron schedule', val: '0 */1 * * * · Asia/Baghdad' },
              ].map(row => (
                <div className="set-row" key={row.label}>
                  <div>
                    <div className="set-row-label">{row.label}</div>
                    <div className="set-row-sub">{row.sub}</div>
                  </div>
                  <div className="set-row-val">{row.val}</div>
                </div>
              ))}
              <div style={{ marginTop: 12, padding: '8px 10px', background: 'var(--blue-bg)', borderRadius: 'var(--r)', border: '1px solid rgba(59,130,246,.3)' }}>
                <div style={{ fontSize: 11.5, color: 'var(--blue)' }}>
                  SFTP credentials are configured via environment variables and cannot be changed here.
                </div>
              </div>
            </>
          )}

          {/* Alert Rules */}
          {section === 'alert_rules' && (
            <>
              <div className="set-section-title">Alert Rules</div>
              {rulesLoading ? (
                <EmptyState loading />
              ) : (
                <>
                  <table className="tbl" style={{ marginBottom: 14 }}>
                    <thead>
                      <tr>
                        <th>Rule</th>
                        <th>Operator</th>
                        <th>Threshold</th>
                        <th>Severity</th>
                        <th>Enabled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rules.map(r => {
                        const pending = changes.get(r.id) ?? {};
                        const current = { ...r, ...pending };
                        return (
                          <tr key={r.id}>
                            <td style={{ fontSize: 11.5 }}>{r.description}</td>
                            <td className="mono">{r.operator}</td>
                            <td>
                              <input
                                className="threshold-input"
                                type="number"
                                defaultValue={current.threshold}
                                onChange={e => applyChange(r.id, { threshold: parseFloat(e.target.value) })}
                              />
                            </td>
                            <td>
                              <Badge variant={
                                current.severity === 'CRITICAL' ? 'cr' :
                                current.severity === 'WARNING'  ? 'wa' : 'in'
                              }>
                                {current.severity}
                              </Badge>
                            </td>
                            <td>
                              <Toggle
                                checked={current.isEnabled}
                                onChange={v => applyChange(r.id, { isEnabled: v })}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Button
                      variant="primary"
                      disabled={changes.size === 0 || saving}
                      onClick={() => void saveRules()}
                    >
                      {saving ? 'Saving…' : 'Save Changes'}
                    </Button>
                    {saved && <Badge variant="ok">Saved</Badge>}
                    {changes.size > 0 && !saving && (
                      <span style={{ fontSize: 11, color: 'var(--amber)' }}>
                        {changes.size} unsaved change{changes.size !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* Notifications */}
          {section === 'notifications' && (
            <>
              <div className="set-section-title">Notifications</div>
              {[
                { label: 'Auto Ingestion',  sub: 'Run ingestion on schedule',  on: true  },
                { label: 'Dedup Detection', sub: 'Skip duplicate raw files',   on: true  },
                { label: 'Email Alerts',    sub: 'Send alert email via Brevo', on: true  },
                { label: 'Telegram Bot',    sub: 'Bot notification channel',   on: false },
              ].map(row => (
                <div className="set-row" key={row.label}>
                  <div>
                    <div className="set-row-label">{row.label}</div>
                    <div className="set-row-sub">{row.sub}</div>
                  </div>
                  <Toggle checked={row.on} onChange={() => {}} disabled />
                </div>
              ))}
              <div className="set-row">
                <div>
                  <div className="set-row-label">Alert Email</div>
                  <div className="set-row-sub">Recipient for alert emails</div>
                </div>
                <div className="set-row-val mono">
                  {process.env['NEXT_PUBLIC_ALERT_EMAIL'] ?? '***@zain.iq'}
                </div>
              </div>
            </>
          )}

          {/* Retention */}
          {section === 'retention' && (
            <>
              <div className="set-section-title">Retention</div>
              <div className="set-row">
                <div>
                  <div className="set-row-label">Retention Period</div>
                  <div className="set-row-sub">Days of report history kept</div>
                </div>
                <div className="set-row-val mono">40 days</div>
              </div>
              <div className="set-row">
                <div>
                  <div className="set-row-label">Data Range</div>
                  <div className="set-row-sub">Oldest and newest report dates</div>
                </div>
                <div className="set-row-val mono" style={{ fontSize: 11 }}>
                  stored in database
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--muted)' }}>
                Reports older than the retention period are automatically purged by the cleanup job.
                Retention is configured via the DATA_RETENTION_DAYS environment variable.
              </div>
            </>
          )}

          {/* Access Control */}
          {section === 'access_control' && (
            <>
              <div className="set-section-title">Access Control</div>
              <div className="set-row">
                <div>
                  <div className="set-row-label">Authentication</div>
                  <div className="set-row-sub">Method</div>
                </div>
                <div className="set-row-val">Supabase Auth</div>
              </div>
              <div className="set-row">
                <div>
                  <div className="set-row-label">2FA</div>
                  <div className="set-row-sub">Two-factor authentication</div>
                </div>
                <Badge variant="ok">Required</Badge>
              </div>
              <div className="set-row">
                <div>
                  <div className="set-row-label">User Management</div>
                  <div className="set-row-sub">Add / remove dashboard users</div>
                </div>
                <Badge variant="gr">Via Supabase Dashboard</Badge>
              </div>
              <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--muted)' }}>
                Full user management (invite, roles, disable) is handled via the Supabase project dashboard.
                RLS policies enforce authenticated read-only access for all dd_* tables.
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
