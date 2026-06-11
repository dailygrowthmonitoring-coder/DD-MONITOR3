'use client';

/**
 * Compare page — /compare
 *
 * Multi-device comparison on a selected date with color-coded metric table.
 */

import { useEffect, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { fetchDevices, fetchComparison } from '@/lib/frontend/api';
import { formatGib, percentToClass, todayIso } from '@/lib/frontend/format';
import type { DeviceDTO, DeviceComparisonRowDTO } from '@/lib/frontend/api';

interface MetricRow {
  readonly key:      keyof DeviceComparisonRowDTO;
  readonly label:    string;
  readonly format:   (v: number | string | null) => string;
  readonly color?:   (v: number | null) => 'ok' | 'wa' | 'cr' | 'gr';
}

const METRICS: MetricRow[] = [
  {
    key:    'usedPercent',
    label:  'Storage Util %',
    format: v => v !== null ? `${(v as number).toFixed(1)}%` : '—',
    color:  v => v !== null ? percentToClass(v) : 'gr',
  },
  {
    key:    'usedGib',
    label:  'Used Storage',
    format: v => v !== null ? formatGib(v as number) : '—',
  },
  {
    key:    'totalGib',
    label:  'Total Capacity',
    format: v => v !== null ? formatGib(v as number) : '—',
  },
  {
    key:    'totalFactor',
    label:  'Compression',
    format: v => v !== null ? `${(v as number).toFixed(1)}x` : '—',
  },
  {
    key:    'failedDisks',
    label:  'Failed Disks',
    format: v => String(v ?? 0),
    color:  v => (v ?? 0) > 0 ? 'cr' : 'ok',
  },
  {
    key:    'activeAlerts',
    label:  'Active Alerts',
    format: v => String(v ?? 0),
    color:  v => (v ?? 0) > 0 ? 'wa' : 'ok',
  },
  {
    key:    'deviceStatus',
    label:  'Device Status',
    format: v => String(v ?? '—').toUpperCase(),
    color:  v => 'gr',
  },
];

export default function ComparePage() {
  const [devices, setDevices]     = useState<DeviceDTO[]>([]);
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [date, setDate]           = useState(todayIso());
  const [results, setResults]     = useState<DeviceComparisonRowDTO[]>([]);
  const [loading, setLoading]     = useState(false);
  const [compared, setCompared]   = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetchDevices();
      if (res.success) setDevices(res.data);
    }
    void load();
  }, []);

  function toggleDevice(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 7) {
        next.add(id);
      }
      return next;
    });
  }

  async function runComparison() {
    if (selected.size < 2) return;
    setLoading(true);
    const res = await fetchComparison([...selected], date);
    if (res.success) setResults(res.data);
    setCompared(true);
    setLoading(false);
  }

  function statusBadge(status: string) {
    const v = status === 'healthy' ? 'ok' : status === 'warning' ? 'wa' : status === 'critical' ? 'cr' : 'gr';
    return <Badge variant={v}>{status.toUpperCase()}</Badge>;
  }

  return (
    <>
      <div className="page-hd">
        <div className="page-hd-left">
          <h1 className="page-title">Compare</h1>
          <div className="page-sub">Side-by-side device comparison · select 2–7 devices</div>
        </div>
      </div>

      {/* Device selector */}
      <Panel title="Device Selection" noPadding>
        <div style={{ padding: 14 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {devices.map(d => (
              <button
                key={d.id}
                onClick={() => toggleDevice(d.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--r)',
                  border: `1px solid ${selected.has(d.id) ? 'var(--accent)' : 'var(--line)'}`,
                  background: selected.has(d.id) ? 'var(--accent-glow)' : 'var(--bg3)',
                  color: selected.has(d.id) ? 'var(--accent2)' : 'var(--sub)',
                  fontFamily: 'var(--font-geist-mono), monospace',
                  fontSize: 11.5,
                  cursor: 'pointer',
                  transition: 'all 0.1s',
                }}
              >
                {d.shortName}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{
                background: 'var(--bg3)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r)',
                padding: '5px 10px',
                color: 'var(--text2)',
                fontSize: 12,
                fontFamily: 'var(--font-geist-mono)',
                outline: 'none',
              }}
            />
            <Button
              variant="primary"
              disabled={selected.size < 2 || loading}
              onClick={() => void runComparison()}
            >
              {loading ? 'Comparing…' : 'Compare'}
            </Button>
            {selected.size < 2 && (
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                Select at least 2 devices
              </span>
            )}
          </div>
        </div>
      </Panel>

      {/* Results table */}
      {compared && (
        <div style={{ marginTop: 16 }}>
          {results.length > 0 ? (
            <Panel title="Comparison Results" meta={`${results.length} devices · ${date}`} noPadding>
              <div style={{ overflowX: 'auto' }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      {results.map(r => (
                        <th key={r.deviceId} className="mono">{r.shortName}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {METRICS.map(m => (
                      <tr key={m.key}>
                        <td style={{ color: 'var(--sub)', fontSize: 11.5 }}>{m.label}</td>
                        {results.map(r => {
                          const raw = r[m.key as keyof DeviceComparisonRowDTO];
                          const val = typeof raw === 'number' ? raw : null;
                          const cls = m.color ? m.color(val) : 'gr';
                          const formatted = m.key === 'deviceStatus'
                            ? statusBadge(String(raw ?? ''))
                            : <span className={`mono text-${cls === 'gr' ? 'sub' : cls}`}>{m.format(raw as number | null)}</span>;
                          return (
                            <td key={r.deviceId}>{formatted}</td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          ) : (
            <EmptyState
              title="No data for selected date"
              message={`No reports found for ${date} — try a different date`}
            />
          )}
        </div>
      )}
    </>
  );
}
