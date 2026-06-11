'use client';

/**
 * Storage page — /storage
 *
 * Fleet-wide storage trend + capacity comparison with time-range selector.
 */

import { useState, useEffect } from 'react';
import { Panel } from '@/components/ui/Panel';
import { StatCard } from '@/components/ui/StatCard';
import { StatRow } from '@/components/ui/StatRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { ComparisonBar } from '@/components/dashboard/ComparisonBar';
import { StorageTrendChart } from '@/components/charts/StorageTrendChart';
import { fetchStorageTrend, fetchCapacity } from '@/lib/frontend/api';
import { formatGib, formatRunway } from '@/lib/frontend/format';
import type { FleetStorageTrendRowDTO, RunwayEstimateDTO } from '@/lib/frontend/api';

const DAYS_OPTIONS = [7, 30, 90] as const;
type Days = typeof DAYS_OPTIONS[number];

export default function StoragePage() {
  const [days, setDays]         = useState<Days>(30);
  const [trendRows, setTrend]   = useState<FleetStorageTrendRowDTO[]>([]);
  const [capacity, setCapacity] = useState<RunwayEstimateDTO[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [trendRes, capRes] = await Promise.all([
        fetchStorageTrend(days),
        fetchCapacity(),
      ]);
      if (trendRes.success)  setTrend(trendRes.data);
      if (capRes.success)    setCapacity(capRes.data);
      setLoading(false);
    }
    void load();
  }, [days]);

  // KPI aggregations
  const totalProvGib = capacity.reduce((s, d) => s + (d.totalCapacityGib ?? 0), 0);
  const totalUsedGib = capacity.reduce((s, d) => {
    // usedGib may be null when there is insufficient report history for regression;
    // fall back to computing from currentUsedPercent × totalCapacityGib.
    const used = d.usedGib ??
      (d.totalCapacityGib !== null
        ? (d.currentUsedPercent / 100) * d.totalCapacityGib
        : 0);
    return s + used;
  }, 0);
  const totalFreeGib = totalProvGib - totalUsedGib;
  const minRunway    = capacity.length > 0
    ? Math.min(...capacity.map(d => d.estimatedDaysRemaining ?? Infinity))
    : null;
  const runwayDays   = minRunway === Infinity || minRunway === null ? null : minRunway;

  // Sorted by usage % descending
  const sorted = [...capacity].sort((a, b) => (b.currentUsedPercent) - (a.currentUsedPercent));

  return (
    <>
      <div className="page-hd">
        <div className="page-hd-left">
          <h1 className="page-title">Storage</h1>
          <div className="page-sub">{capacity.length} device{capacity.length !== 1 ? 's' : ''} · fleet capacity overview</div>
        </div>
        <div className="page-hd-actions">
          <div className="time-range-btns">
            {DAYS_OPTIONS.map(d => (
              <button
                key={d}
                className={`time-range-btn${days === d ? ' active' : ''}`}
                onClick={() => setDays(d)}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      <StatRow>
        <StatCard label="Provisioned"   value={formatGib(totalProvGib)} sub="total fleet capacity" />
        <StatCard label="Used"          value={formatGib(totalUsedGib)} sub="post-deduplication" />
        <StatCard label="Free"          value={formatGib(totalFreeGib)} sub="available across fleet" />
        <StatCard
          label="Min Runway"
          value={formatRunway(runwayDays)}
          sub={runwayDays !== null ? `${runwayDays} days` : 'not growing'}
          {...(runwayDays !== null && runwayDays < 60
            ? { badge: { text: 'LOW', variant: 'cr' as const } }
            : runwayDays !== null && runwayDays < 120
            ? { badge: { text: 'WATCH', variant: 'wa' as const } }
            : {})}
        />
      </StatRow>

      <div className="cols-2">
        {/* Storage trend chart */}
        <Panel title="Storage Trend" meta={`${days} days · TiB`} noPadding>
          <div style={{ padding: '12px 14px' }}>
            {loading ? (
              <EmptyState loading />
            ) : trendRows.length > 0 ? (
              <StorageTrendChart rows={trendRows} />
            ) : (
              <EmptyState title="No trend data" />
            )}
          </div>
        </Panel>

        {/* Capacity comparison bars */}
        <Panel title="Capacity Comparison" meta="sorted by utilization" noPadding>
          <div style={{ padding: '12px 14px' }}>
            {loading ? (
              <EmptyState loading />
            ) : sorted.length > 0 ? (
              sorted.map(d => (
                <ComparisonBar
                  key={d.deviceId}
                  label={d.hostname.split('.')[0] ?? d.hostname}
                  usedPct={d.currentUsedPercent}
                  usedGib={d.usedGib}
                  totalGib={d.totalCapacityGib}
                />
              ))
            ) : (
              <EmptyState title="No capacity data" />
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
