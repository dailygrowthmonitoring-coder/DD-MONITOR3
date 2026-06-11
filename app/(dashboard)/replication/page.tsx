'use client';

/**
 * Replication page — /replication
 *
 * Shows per-device replication pairs and status from device snapshots.
 */

import { useEffect, useState } from 'react';
import { StatCard } from '@/components/ui/StatCard';
import { StatRow } from '@/components/ui/StatRow';
import { Panel } from '@/components/ui/Panel';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReplicationPair } from '@/components/dashboard/ReplicationPair';
import { ReplicationChart } from '@/components/charts/ReplicationChart';
import { fetchDevices, fetchDeviceReport } from '@/lib/frontend/api';
import { todayIso } from '@/lib/frontend/format';
import type { DeviceDTO } from '@/lib/frontend/api';

interface DeviceWithRepl {
  readonly device: DeviceDTO;
  readonly status: string | null;
}

export default function ReplicationPage() {
  const [replDevices, setReplDevices] = useState<DeviceWithRepl[]>([]);
  const [totalDevices, setTotal]      = useState(0);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const devRes = await fetchDevices();
      if (!devRes.success) { setLoading(false); return; }

      setTotal(devRes.data.length);

      // Fetch today's report for devices with replication
      const today  = todayIso();
      const pairs: DeviceWithRepl[] = [];

      for (const device of devRes.data) {
        const repRes = await fetchDeviceReport(device.id, today);
        if (repRes.success && repRes.data.replicationConfigured) {
          pairs.push({ device, status: repRes.data.replicationStatus });
        }
      }

      setReplDevices(pairs);
      setLoading(false);
    }
    void load();
  }, []);

  const configured  = replDevices.length;
  const inSync      = replDevices.filter(p => p.status?.toLowerCase() === 'running').length;
  const lagging     = configured - inSync;

  return (
    <>
      <div className="page-hd">
        <div className="page-hd-left">
          <h1 className="page-title">Replication</h1>
          <div className="page-sub">{configured} configured pair{configured !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <StatRow>
        <StatCard label="Active Pairs"     value={String(configured)}  sub="replication configured" />
        <StatCard
          label="In Sync"
          value={String(inSync)}
          valueClass={inSync === configured && configured > 0 ? 'text-ok' : ''}
          {...(inSync === configured && configured > 0 ? { badge: { text: 'ALL SYNC', variant: 'ok' as const } } : {})}
        />
        <StatCard
          label="Lagging"
          value={String(lagging)}
          valueClass={lagging > 0 ? 'text-wa' : ''}
        />
        <StatCard label="Peak Throughput" value="—" sub="not tracked" />
      </StatRow>

      {loading ? (
        <EmptyState loading />
      ) : replDevices.length > 0 ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
            {replDevices.map(({ device, status }) => (
              <ReplicationPair key={device.id} source={device} status={status} />
            ))}
          </div>
          <Panel title="Throughput Chart" meta="not available from autosupport" noPadding>
            <div style={{ padding: '12px 14px' }}>
              <ReplicationChart />
            </div>
          </Panel>
        </>
      ) : (
        <EmptyState
          title="No replication configured"
          message="No devices have replication configured in today's reports"
        />
      )}
    </>
  );
}
