'use client';

/**
 * Backup Health page — /backup
 *
 * Fleet backup success rate, device-level status table, and 14-day trend.
 */

import { useEffect, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { StatCard } from '@/components/ui/StatCard';
import { StatRow } from '@/components/ui/StatRow';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { BackupRateChart } from '@/components/charts/BackupRateChart';
import { StatusDot } from '@/components/ui/StatusDot';
import { fetchDevices, fetchFleetSummary } from '@/lib/frontend/api';
import { statusToClass, formatRelative } from '@/lib/frontend/format';
import type { DeviceDTO, FleetDailySummaryRowDTO } from '@/lib/frontend/api';

export default function BackupPage() {
  const [devices, setDevices]     = useState<DeviceDTO[]>([]);
  const [summary, setSummary]     = useState<FleetDailySummaryRowDTO[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [devRes, sumRes] = await Promise.all([
        fetchDevices(),
        fetchFleetSummary(14),
      ]);
      if (devRes.success) setDevices(devRes.data);
      if (sumRes.success) setSummary(sumRes.data);
      setLoading(false);
    }
    void load();
  }, []);

  const today     = new Date().toISOString().substring(0, 10);
  const active    = devices.filter(d => d.isActive);
  const reported  = devices.filter(d => d.lastReportDate === today);
  const failures  = devices.filter(d => d.lastStatus === 'critical');

  // Compute success rate from last summary entry
  const latest = summary.at(-1);
  const successRate = latest && latest.totalDevices > 0
    ? Math.round(((latest.totalDevices - (latest.criticalCount)) / latest.totalDevices) * 100)
    : null;

  const sorted = [...active].sort((a, b) => {
    const w = (d: DeviceDTO) =>
      d.lastStatus === 'critical' ? 3 : d.lastStatus === 'warning' ? 2 : 1;
    return w(b) - w(a);
  });

  return (
    <>
      <div className="page-hd">
        <div className="page-hd-left">
          <h1 className="page-title">Backup Health</h1>
          <div className="page-sub">{active.length} device{active.length !== 1 ? 's' : ''} · based on device status</div>
        </div>
      </div>

      <StatRow>
        <StatCard
          label="Success Rate"
          value={successRate !== null ? `${successRate}%` : '—'}
          badge={
            successRate !== null && successRate < 80
              ? { text: 'LOW', variant: 'cr' }
              : successRate !== null && successRate < 95
              ? { text: 'WATCH', variant: 'wa' }
              : { text: 'GOOD', variant: 'ok' }
          }
        />
        <StatCard
          label="Failures"
          value={String(failures.length)}
          valueClass={failures.length > 0 ? 'text-cr' : ''}
          sub="critical alert devices"
        />
        <StatCard
          label="Reporting Today"
          value={`${reported.length}/${active.length}`}
          sub={`as of ${today}`}
        />
        <StatCard
          label="Active Devices"
          value={String(active.length)}
          sub="in monitoring fleet"
        />
      </StatRow>

      <div className="cols-2">
        <Panel title="14-Day Health Trend" noPadding>
          <div style={{ padding: '12px 14px' }}>
            {loading ? <EmptyState loading /> : summary.length > 0
              ? <BackupRateChart rows={summary} />
              : <EmptyState title="No trend data" />}
          </div>
        </Panel>

        <Panel title="By Domain" noPadding>
          <table className="tbl">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Status</th>
                <th>Alerts</th>
                <th>Last Report</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(d => {
                const cls = statusToClass(d.lastStatus);
                return (
                  <tr key={d.id}>
                    <td style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <StatusDot status={d.lastStatus} />
                      <span className="mono" style={{ fontSize: 11 }}>{d.shortName}</span>
                    </td>
                    <td>
                      <Badge variant={cls}>
                        {d.lastStatus === 'healthy' ? 'OK' : d.lastStatus.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="mono">
                      {d.lastActiveAlerts > 0
                        ? <span className="text-cr">{d.lastActiveAlerts}</span>
                        : <span className="text-muted">0</span>}
                    </td>
                    <td className="mono" style={{ fontSize: 11 }}>
                      {d.lastReportDate ?? '—'}
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)' }}>No devices</td>
                </tr>
              )}
            </tbody>
          </table>
        </Panel>
      </div>
    </>
  );
}
