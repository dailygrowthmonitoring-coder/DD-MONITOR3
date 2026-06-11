/**
 * System Health page — /system
 *
 * Fleet health summary + per-device ingestion status grid.
 */

import { cookies } from 'next/headers';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { StatRow } from '@/components/ui/StatRow';
import { Panel } from '@/components/ui/Panel';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatGib, formatPercent } from '@/lib/frontend/format';
import type { SystemHealthDTO } from '@/lib/frontend/api';

async function getSystemHealth(cookieHdr: string): Promise<SystemHealthDTO | null> {
  try {
    const base = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';
    const res  = await fetch(`${base}/api/system/health`, {
      cache:   'no-store',
      headers: { Cookie: cookieHdr },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { success: boolean; data: SystemHealthDTO };
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export default async function SystemPage() {
  const cookieStore = await cookies();
  const cookieHdr   = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');
  const health      = await getSystemHealth(cookieHdr);

  if (!health) {
    return <EmptyState title="System health unavailable" message="Could not load system health data" />;
  }

  const { fleetSummary: s, ingestionStatus, systemTime } = health;

  // Sort: missing/overdue first, then by status severity
  const sorted = [...ingestionStatus].sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    const w = (x: typeof a) =>
      x.lastStatus === 'critical' ? 3 : x.lastStatus === 'warning' ? 2 : 1;
    return w(b) - w(a);
  });

  const reportedToday = ingestionStatus.filter(d => !d.isOverdue).length;
  const missing       = ingestionStatus.filter(d => d.isOverdue).length;

  const sysTimeLocal = new Date(systemTime).toLocaleString('en-US', {
    timeZone: 'Asia/Baghdad',
    hour12:   false,
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  return (
    <>
      <div className="page-hd">
        <div className="page-hd-left">
          <h1 className="page-title">System Health</h1>
          <div className="page-sub mono">{sysTimeLocal} · UTC+3 Baghdad</div>
        </div>
      </div>

      <StatRow>
        <StatCard
          label="Total Devices"
          value={String(s.totalDevices)}
          sub="registered in fleet"
        />
        <StatCard
          label="Reported Today"
          value={`${reportedToday}/${s.totalDevices}`}
          badge={missing > 0 ? { text: `${missing} MISSING`, variant: 'wa' } : { text: 'ALL REPORTING', variant: 'ok' }}
        />
        <StatCard
          label="Fleet Used"
          value={formatGib(s.totalUsedGib)}
          sub={`of ${formatGib(s.totalCapacityGib)}`}
        />
        <StatCard
          label="Avg Utilization"
          value={formatPercent(s.avgUsedPercent)}
          badge={
            s.avgUsedPercent >= 95
              ? { text: 'CRITICAL', variant: 'cr' }
              : s.avgUsedPercent >= 90
              ? { text: 'WARNING', variant: 'wa' }
              : { text: 'OK', variant: 'ok' }
          }
        />
      </StatRow>

      {/* Fleet summary cards */}
      <div className="cols-2" style={{ marginBottom: 16 }}>
        <Panel title="Device Health Distribution" noPadding>
          <div style={{ padding: 14, display: 'flex', gap: 16 }}>
            <div className="stat">
              <div className="stat-label">Healthy</div>
              <div className="stat-value text-ok">{s.healthyCount}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Warning</div>
              <div className="stat-value text-wa">{s.warningCount}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Critical</div>
              <div className="stat-value text-cr">{s.criticalCount}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Unknown</div>
              <div className="stat-value text-muted">{s.unknownCount}</div>
            </div>
          </div>
        </Panel>
        <Panel title="Active Alerts" noPadding>
          <div style={{ padding: 14 }}>
            <div className="stat-value" style={{ fontSize: 28, color: s.totalActiveAlerts > 0 ? 'var(--red)' : 'var(--green)' }}>
              {s.totalActiveAlerts}
            </div>
            <div className="stat-sub">across all devices</div>
          </div>
        </Panel>
      </div>

      {/* Per-device ingestion status */}
      <Panel title="Ingestion Pipeline Status" meta={`${ingestionStatus.length} devices`} noPadding>
        <table className="tbl">
          <thead>
            <tr>
              <th>Device</th>
              <th>Reported Today</th>
              <th>Last Report</th>
              <th>Age (hrs)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(d => (
              <tr key={d.deviceId}>
                <td>
                  <span className="mono" style={{ fontSize: 11.5 }}>{d.shortName}</span>
                  <br />
                  <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono)' }}>
                    {d.hostname}
                  </span>
                </td>
                <td>
                  {d.isOverdue
                    ? <span style={{ fontSize: 18 }}>❌</span>
                    : <span style={{ fontSize: 18 }}>✅</span>}
                </td>
                <td className="mono" style={{ fontSize: 11 }}>
                  {d.lastReportDate ?? '—'}
                </td>
                <td className="mono" style={{ fontSize: 11 }}>
                  {d.lastReportAgeHours !== null
                    ? `${d.lastReportAgeHours.toFixed(0)}h`
                    : '—'}
                </td>
                <td>
                  <Badge variant={
                    d.lastStatus === 'healthy'  ? 'ok' :
                    d.lastStatus === 'warning'  ? 'wa' :
                    d.lastStatus === 'critical' ? 'cr' : 'gr'
                  }>
                    {d.lastStatus.toUpperCase()}
                  </Badge>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)' }}>No devices</td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
