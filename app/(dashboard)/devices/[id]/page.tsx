/**
 * Device Detail page — /devices/[id]
 *
 * Full device report view: storage gauge, compression, disks, network,
 * MTrees, alerts, and system health. Date-picker for historical reports.
 */

import { cookies } from 'next/headers';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { AlertFeedItem } from '@/components/dashboard/AlertFeedItem';
import { DeviceReportPicker } from './DeviceReportPicker';
import {
  formatGib,
  formatFactor,
  statusToClass,
  percentToClass,
} from '@/lib/frontend/format';
import type { DeviceDTO, ReportDTO, AlertDTO } from '@/lib/frontend/api';

async function serverFetch<T>(path: string, cookieHdr: string): Promise<T | null> {
  try {
    const base = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';
    const res  = await fetch(`${base}${path}`, {
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

interface PageProps {
  readonly params: Promise<{ id: string }>;
  readonly searchParams: Promise<{ date?: string }>;
}

export default async function DeviceDetailPage({ params, searchParams }: PageProps) {
  const { id }              = await params;
  const { date: dateParam } = await searchParams;

  const cookieStore = await cookies();
  const cookieHdr   = cookieStore.toString();

  const today = new Date().toISOString().substring(0, 10);
  const date  = dateParam ?? today;

  const [device, report, activeAlerts] = await Promise.all([
    serverFetch<DeviceDTO>(`/api/devices/${id}`, cookieHdr),
    serverFetch<ReportDTO>(`/api/devices/${id}/reports/${date}`, cookieHdr),
    serverFetch<AlertDTO[]>(`/api/alerts?device_id=${id}&active=true&limit=20`, cookieHdr),
  ]);

  if (!device) {
    return <EmptyState title="Device not found" message={`No device with ID ${id}`} />;
  }

  const alertList = activeAlerts ?? [];

  // Full parsed JSONB from the report detail endpoint.
  // The API serialises the Report domain entity directly, so deep data lives in
  // parsedData (ParsedReport shape, snake_case field names from lib/parser/types.ts).
  const pd = report?.parsedData as Record<string, unknown> | null | undefined;

  // Pull sub-sections out of parsedData
  const pdStorage   = pd?.storage       as Record<string, unknown> | undefined;
  const pdComp      = pd?.compression   as Record<string, unknown> | undefined;
  const pdCompCurr  = pdComp?.currently_used as Record<string, unknown> | undefined;
  const pdComp7d    = pdComp?.last_7_days    as Record<string, unknown> | undefined;
  const pdComp24h   = pdComp?.last_24_hours  as Record<string, unknown> | undefined;
  const pdDisksSumm = (pd?.disks as Record<string, unknown> | undefined)?.summary as Record<string, unknown> | undefined;
  const pdSysHealth = pd?.system_health as Record<string, unknown> | undefined;
  const pdNetObj    = pd?.network       as Record<string, unknown> | undefined;
  const pdMeta      = pd?.meta          as Record<string, unknown> | undefined;

  // Storage values — ParsedReport.storage snake_case field names
  const storageUsedGib  = typeof pdStorage?.used_gib      === 'number' ? pdStorage.used_gib      as number : null;
  const storageTotalGib = typeof pdStorage?.total_gib     === 'number' ? pdStorage.total_gib     as number : null;
  const storageAvailGib = typeof pdStorage?.available_gib === 'number' ? pdStorage.available_gib as number : null;
  const storagePreComp  = typeof pdStorage?.pre_comp_gib  === 'number' ? pdStorage.pre_comp_gib  as number : null;
  const storageUsedPct  = typeof pdStorage?.used_percent  === 'number' ? pdStorage.used_percent  as number : device.lastUsedPercent ?? 0;
  const storageClass    = percentToClass(storageUsedPct);

  // Compression — ParsedReport.compression snake_case field names
  const compTotal = typeof pdCompCurr?.total_factor === 'number' ? pdCompCurr.total_factor as number : null;
  const comp7day  = typeof pdComp7d?.total_factor   === 'number' ? pdComp7d.total_factor   as number : null;
  const comp24h   = typeof pdComp24h?.total_factor  === 'number' ? pdComp24h.total_factor  as number : null;

  // Disks — ParsedReport.disks.summary snake_case field names
  const disksTotal  = typeof pdDisksSumm?.active_tier_total  === 'number' ? pdDisksSumm.active_tier_total  as number : null;
  const disksInUse  = typeof pdDisksSumm?.active_tier_in_use === 'number' ? pdDisksSumm.active_tier_in_use as number : null;
  const disksSpare  = typeof pdDisksSumm?.active_tier_spare  === 'number' ? pdDisksSumm.active_tier_spare  as number : null;
  const disksFailed = typeof pdDisksSumm?.failed_disks       === 'number' ? pdDisksSumm.failed_disks       as number : 0;

  // System health — ParsedReport.system_health snake_case field names
  const avail    = typeof pdSysHealth?.system_availability_percent === 'number' ? pdSysHealth.system_availability_percent as number : null;
  const memTotal = typeof pdSysHealth?.memory_total_mib            === 'number' ? pdSysHealth.memory_total_mib            as number : null;
  const memFree  = typeof pdSysHealth?.memory_free_mib             === 'number' ? pdSysHealth.memory_free_mib             as number : null;
  const nfs      = typeof pdSysHealth?.nfs_status  === 'string' ? pdSysHealth.nfs_status  as string : '—';
  const cifs     = typeof pdSysHealth?.cifs_status === 'string' ? pdSysHealth.cifs_status as string : '—';

  // Network ports — ParsedReport.network.ports
  const networkPorts = pdNetObj?.ports as Array<Record<string, unknown>> | undefined;
  // MTrees — ParsedReport.mtrees
  const mtrees       = pd?.mtrees      as Array<Record<string, unknown>> | undefined;

  // Uptime from ParsedReport.meta.uptime_days
  const uptimeDays = typeof pdMeta?.uptime_days === 'number' ? pdMeta.uptime_days as number : null;

  const statusCls = statusToClass(device.lastStatus);

  return (
    <>
      {/* Header */}
      <div className="page-hd">
        <div className="page-hd-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Link href="/domains" style={{ color: 'var(--muted)', display: 'flex' }}>
              <ArrowLeft size={14} />
            </Link>
            <h1 className="page-title" style={{ margin: 0 }}>
              {device.hostname}
            </h1>
            <Badge variant={statusCls}>
              {device.lastStatus.toUpperCase()}
            </Badge>
          </div>
          <div className="page-sub mono">
            {device.model ?? '—'} · {device.serialNumber ?? '—'} · {device.location ?? '—'}
            {uptimeDays !== null ? ` · ${uptimeDays}d uptime` : ''}
          </div>
        </div>
        <div className="page-hd-actions">
          {/* Client-side date picker for historical navigation */}
          <DeviceReportPicker deviceId={id} currentDate={date} />
        </div>
      </div>

      {!report ? (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            background: 'var(--amber-bg)',
            border: '1px solid var(--amber-dim)',
            borderRadius: 'var(--r)',
            padding: '8px 12px',
            fontSize: 12,
            color: 'var(--amber)',
            fontFamily: 'var(--font-geist-mono)',
          }}>
            No report found for {date}. Showing latest device snapshot data only.
          </div>
        </div>
      ) : null}

      {/* Storage + Compression */}
      <div className="cols-2" style={{ marginBottom: 16 }}>
        {/* Storage gauge */}
        <Panel title="Storage" noPadding>
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 16 }}>
              {/* Big gauge */}
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{
                  width: 90,
                  height: 90,
                  borderRadius: '50%',
                  background: `conic-gradient(
                    ${storageClass === 'cr' ? 'var(--red)' : storageClass === 'wa' ? 'var(--amber)' : 'var(--green)'}
                    ${storageUsedPct * 3.6}deg,
                    var(--bg4) 0deg
                  )`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 0 0 4px var(--bg2)`,
                }}>
                  <div style={{
                    width: 66,
                    height: 66,
                    borderRadius: '50%',
                    background: 'var(--bg2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-geist-mono)',
                      fontSize: 16,
                      fontWeight: 700,
                      color: storageClass === 'cr' ? 'var(--red)' : storageClass === 'wa' ? 'var(--amber)' : 'var(--green)',
                      lineHeight: 1,
                    }}>
                      {storageUsedPct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
              {/* Storage metrics */}
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Used',       val: storageUsedGib  !== null ? formatGib(storageUsedGib)  : '—' },
                  { label: 'Total',      val: storageTotalGib !== null ? formatGib(storageTotalGib) : '—' },
                  { label: 'Available',  val: storageAvailGib !== null ? formatGib(storageAvailGib) : '—' },
                  { label: 'Pre-Comp',   val: storagePreComp  !== null ? formatGib(storagePreComp)  : '—' },
                ].map(m => (
                  <div key={m.label}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                      {m.label}
                    </div>
                    <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 13, color: 'var(--text2)' }}>
                      {m.val}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <ProgressBar value={storageUsedPct} />
          </div>
        </Panel>

        {/* Compression */}
        <Panel title="Compression" noPadding>
          <div style={{ padding: 16 }}>
            <div className="cols-3" style={{ marginBottom: 12 }}>
              <div className="stat">
                <div className="stat-label">Overall</div>
                <div className="stat-value">{compTotal !== null ? formatFactor(compTotal) : '—'}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Last 7d</div>
                <div className="stat-value">{comp7day !== null ? formatFactor(comp7day) : '—'}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Last 24h</div>
                <div className="stat-value">{comp24h !== null ? formatFactor(comp24h) : '—'}</div>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Disks + Network */}
      <div className="cols-2" style={{ marginBottom: 16 }}>
        {/* Disk health */}
        <Panel title="Disk Health" noPadding>
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
              {[
                { label: 'Active Total', val: disksTotal  !== null ? String(disksTotal)  : '—', color: 'var(--text)' },
                { label: 'In Use',       val: disksInUse  !== null ? String(disksInUse)  : '—', color: 'var(--text)' },
                { label: 'Spare',        val: disksSpare  !== null ? String(disksSpare)  : '—', color: 'var(--text)' },
                { label: 'Failed',       val: disksFailed > 0 ? String(disksFailed) : '0',       color: disksFailed > 0 ? 'var(--red)' : 'var(--green)' },
              ].map(m => (
                <div key={m.label} className="stat" style={{ flex: 1, minWidth: 80 }}>
                  <div className="stat-label">{m.label}</div>
                  <div className="stat-value" style={{ fontSize: 20, color: m.color }}>{m.val}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: disksFailed > 0 ? 'var(--red)' : 'var(--green)' }}>
              {disksFailed > 0
                ? `⚠ ${disksFailed} disk failure${disksFailed !== 1 ? 's' : ''} detected`
                : '✓ Normal — Storage operational'}
            </div>
          </div>
        </Panel>

        {/* System health */}
        <Panel title="System Health" noPadding>
          <div style={{ padding: 16 }}>
            {[
              { label: 'Availability',  val: avail    !== null ? `${avail.toFixed(2)}%`     : '—' },
              { label: 'Memory Total',  val: memTotal !== null ? `${memTotal} MiB`           : '—' },
              { label: 'Memory Free',   val: memFree  !== null ? `${memFree} MiB`            : '—' },
              { label: 'NFS Status',    val: nfs },
              { label: 'CIFS Status',   val: cifs },
            ].map(r => (
              <div key={r.label} className="set-row" style={{ paddingTop: 6, paddingBottom: 6 }}>
                <div className="set-row-label" style={{ fontSize: 12 }}>{r.label}</div>
                <div className="set-row-val mono">{r.val}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Network ports */}
      {networkPorts && networkPorts.length > 0 && (
        <Panel title="Network Ports" noPadding style={{ marginBottom: 16 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Port</th>
                <th>Speed</th>
                <th>Duplex</th>
                <th>Link</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {networkPorts.map((p, i) => {
                const name   = String(p['name'] ?? p['port'] ?? `port${i}`);
                const speed  = String(p['speed']       ?? '—');
                const duplex = String(p['duplex']      ?? '—');
                const link   = String(p['link_status'] ?? p['linkStatus'] ?? '—');
                const state  = String(p['state']       ?? '—');
                const isDown = Boolean(p['is_down'] ?? p['isDown']);
                const rowColor = isDown
                  ? 'var(--red-bg)'
                  : link.toLowerCase() === 'up' && state.toLowerCase() === 'running'
                  ? ''
                  : '';
                return (
                  <tr key={name} style={{ background: rowColor }}>
                    <td className="mono">{name}</td>
                    <td className="mono">{speed}</td>
                    <td className="mono">{duplex}</td>
                    <td>
                      <Badge variant={link.toLowerCase() === 'up' ? 'ok' : 'cr'}>
                        {link}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={state.toLowerCase() === 'running' ? 'ok' : state.toLowerCase() === 'down' ? 'cr' : 'wa'}>
                        {state}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}

      {/* MTrees */}
      {mtrees && mtrees.length > 0 && (
        <Panel title="MTrees" noPadding style={{ marginBottom: 16 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Pre-Comp Size</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {mtrees.map((m, i) => {
                const name    = String(m['name'] ?? `mtree${i}`);
                const preComp = typeof m['preCompGib'] === 'number'
                  ? formatGib(m['preCompGib'] as number)
                  : typeof m['pre_comp_gib'] === 'number'
                  ? formatGib(m['pre_comp_gib'] as number)
                  : '—';
                const status  = String(m['status'] ?? 'RW');
                return (
                  <tr key={name}>
                    <td className="mono">{name}</td>
                    <td className="mono">{preComp}</td>
                    <td>
                      <Badge variant={status === 'RW' ? 'ok' : status === 'RO' ? 'wa' : 'gr'}>
                        {status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}

      {/* Active Alerts */}
      <Panel
        title="Active Alerts"
        meta={`${alertList.length}`}
        noPadding
      >
        <div style={{ padding: '0 14px' }}>
          {alertList.length > 0 ? (
            alertList.map(a => <AlertFeedItem key={a.id} alert={a} />)
          ) : (
            <EmptyState title="No active alerts" message="All clear on this device" />
          )}
        </div>
      </Panel>
    </>
  );
}
