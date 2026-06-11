/**
 * Overview page — /
 *
 * Fleet device tiles, KPI stat row, utilisation chart, backup-rate chart,
 * domain status table, and active alerts feed.
 */

import Link from 'next/link';
import { cookies } from 'next/headers';
import { StatusDot } from '@/components/ui/StatusDot';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { StatRow } from '@/components/ui/StatRow';
import { Panel } from '@/components/ui/Panel';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { DeviceTile } from '@/components/dashboard/DeviceTile';
import { AlertFeedItem } from '@/components/dashboard/AlertFeedItem';
import { OverviewCharts } from './OverviewCharts';
import {
  formatGib,
  formatPercent,
  formatRelative,
  statusToClass,
  percentToClass,
} from '@/lib/frontend/format';
import type {
  DeviceDTO,
  AlertDTO,
  FleetDailySummaryRowDTO,
  FleetStorageTrendRowDTO,
} from '@/lib/frontend/api';

async function serverFetch<T>(path: string): Promise<T | null> {
  try {
    const baseUrl     = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';
    const cookieStore = await cookies();
    const cookieHdr   = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');
    const res = await fetch(`${baseUrl}${path}`, {
      cache:   'no-store',
      headers: { Cookie: cookieHdr },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { success: boolean; data: T };
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export default async function OverviewPage() {
  const [devices, summaryRows, trendRows, alerts] = await Promise.all([
    serverFetch<DeviceDTO[]>('/api/devices'),
    serverFetch<FleetDailySummaryRowDTO[]>('/api/analytics/fleet-summary?days=30'),
    serverFetch<FleetStorageTrendRowDTO[]>('/api/analytics/storage-trend?days=30'),
    serverFetch<AlertDTO[]>('/api/alerts?active=true&limit=4'),
  ]);

  const deviceList    = devices    ?? [];
  const summaryList   = summaryRows ?? [];
  const trendList     = trendRows   ?? [];
  const alertList     = alerts      ?? [];

  // KPI calculations from latest summary row
  const latest = summaryList.at(-1);
  const totalUsedGib   = deviceList.reduce((s, d) => {
    const used = d.lastUsedPercent !== null && d.totalCapacity !== null
      ? (d.lastUsedPercent / 100) * d.totalCapacity
      : 0;
    return s + used;
  }, 0);
  const avgPct         = deviceList.length > 0
    ? deviceList.reduce((s, d) => s + (d.lastUsedPercent ?? 0), 0) / deviceList.length
    : 0;
  const totalAlerts    = deviceList.reduce((s, d) => s + d.lastActiveAlerts, 0);
  const lastRefresh    = deviceList[0]?.lastSeenAt;

  // Count how many devices reported today
  const today = new Date().toISOString().substring(0, 10);
  const reportedToday = deviceList.filter(d => d.lastReportDate === today).length;

  return (
    <>
      {/* Page header */}
      <div className="page-hd">
        <div className="page-hd-left">
          <h1 className="page-title">Overview</h1>
          <div className="page-sub">
            {deviceList.length} domain{deviceList.length !== 1 ? 's' : ''} · ingestion active
            {lastRefresh ? ` · last refresh ${formatRelative(lastRefresh)}` : ''}
          </div>
        </div>
        <div className="page-hd-actions">
          <Button variant="default">Export</Button>
          <Button variant="primary">+ Add Domain</Button>
        </div>
      </div>

      {/* CMD strip */}
      <div className="cmd-strip">
        <div className="cmd-text">
          <span className="cmd-prompt">$</span>
          dd-monitor --status all --format compact --refresh 60s
          <span className="cmd-cursor" />
        </div>
        <div className="cmd-meta">✓ connected · sftp.corp.internal</div>
      </div>

      {/* Device tiles */}
      {deviceList.length > 0 ? (
        <div className="dom-strip">
          {deviceList.map(d => (
            <Link key={d.id} href={`/devices/${d.id}`} style={{ textDecoration: 'none' }}>
              <DeviceTile device={d} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="mb-16">
          <EmptyState title="No devices" message="No active devices found" />
        </div>
      )}

      {/* Stat row */}
      <StatRow>
        <StatCard
          label="Capacity Used"
          value={formatGib(totalUsedGib)}
          sub={`across ${deviceList.length} device${deviceList.length !== 1 ? 's' : ''}`}
        />
        <StatCard
          label="Avg Utilization"
          value={formatPercent(avgPct)}
          badge={
            avgPct >= 95
              ? { text: 'CRITICAL', variant: 'cr' }
              : avgPct >= 90
              ? { text: 'WARNING', variant: 'wa' }
              : { text: 'HEALTHY', variant: 'ok' }
          }
        />
        <StatCard
          label="Devices Reporting"
          value={`${reportedToday}/${deviceList.length}`}
          sub={`as of ${today}`}
          {...(reportedToday < deviceList.length ? { badge: { text: 'MISSING', variant: 'wa' as const } } : {})}
        />
        <StatCard
          label="Active Alerts"
          value={String(totalAlerts)}
          valueClass={totalAlerts > 0 ? 'text-cr' : ''}
          badge={
            totalAlerts > 0
              ? { text: `${totalAlerts} active`, variant: 'cr' }
              : { text: 'CLEAR', variant: 'ok' }
          }
        />
      </StatRow>

      {/* Charts row */}
      <OverviewCharts trendRows={trendList} summaryRows={summaryList} />

      {/* Domain status table + alerts feed */}
      <div className="cols-2-wide" style={{ marginTop: 16 }}>
        {/* Domain table */}
        <Panel title="Domain Status" noPadding>
          <table className="tbl">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Status</th>
                <th>Used</th>
                <th>Util</th>
                <th>Alerts</th>
                <th>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {deviceList.map(d => {
                const cls     = statusToClass(d.lastStatus);
                const pct     = d.lastUsedPercent ?? 0;
                const usedGib = d.lastUsedPercent !== null && d.totalCapacity !== null
                  ? (d.lastUsedPercent / 100) * d.totalCapacity
                  : null;
                return (
                  <tr key={d.id}>
                    <td>
                      <Link
                        href={`/devices/${d.id}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: 'inherit' }}
                      >
                        <StatusDot status={d.lastStatus} />
                        <span className="mono" style={{ fontSize: 11.5 }}>{d.hostname}</span>
                      </Link>
                    </td>
                    <td>
                      <Badge variant={cls}>
                        {d.lastStatus === 'healthy' ? 'OK' : d.lastStatus === 'warning' ? 'WARNING' : d.lastStatus === 'critical' ? 'CRITICAL' : 'UNKNOWN'}
                      </Badge>
                    </td>
                    <td className="mono">{usedGib !== null ? formatGib(usedGib) : '—'}</td>
                    <td style={{ minWidth: 120 }}>
                      <ProgressBar value={pct} showLabel />
                    </td>
                    <td>
                      {d.lastActiveAlerts > 0 ? (
                        <span style={{ color: 'var(--red)', fontFamily: 'var(--font-geist-mono)' }}>
                          {d.lastActiveAlerts}
                        </span>
                      ) : (
                        <span className="text-muted">0</span>
                      )}
                    </td>
                    <td className="mono" style={{ fontSize: 11 }}>
                      {d.lastSeenAt ? formatRelative(d.lastSeenAt) : '—'}
                    </td>
                  </tr>
                );
              })}
              {deviceList.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                    No devices
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Panel>

        {/* Alerts feed */}
        <Panel
          title="Active Alerts"
          meta={`${alertList.length} shown`}
          actions={
            <Link href="/alerts" style={{ textDecoration: 'none' }}>
              <Button variant="ghost" size="sm">all →</Button>
            </Link>
          }
          noPadding
        >
          <div style={{ padding: '0 14px' }}>
            {alertList.length > 0 ? (
              alertList.map(a => <AlertFeedItem key={a.id} alert={a} />)
            ) : (
              <EmptyState title="No active alerts" message="All systems clear" />
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
