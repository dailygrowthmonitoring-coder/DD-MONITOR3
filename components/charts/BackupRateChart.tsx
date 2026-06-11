'use client';

/**
 * BackupRateChart — 14-day backup success/health bar chart derived from fleet summary.
 * Uses fleet healthy/warning/critical counts to show daily health distribution.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { FleetDailySummaryRowDTO } from '@/lib/frontend/api';
import { formatDateShort } from '@/lib/frontend/format';

interface BackupRateChartProps {
  readonly rows: FleetDailySummaryRowDTO[];
}

/** Renders a stacked bar chart of device health distribution per day. */
export function BackupRateChart({ rows }: BackupRateChartProps) {
  const data = [...rows]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map(r => ({
      date:     r.date,
      healthy:  r.healthyCount,
      warning:  r.warningCount,
      critical: r.criticalCount,
    }));

  const tooltipStyle = {
    background:   'var(--bg2)',
    border:       '1px solid var(--line)',
    borderRadius: 3,
    padding:      10,
    fontSize:     11,
    fontFamily:   'var(--font-geist-mono), monospace',
    color:        'var(--text2)',
  };

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid stroke="#27272A" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#52525B', fontSize: 10, fontFamily: 'var(--font-geist-mono), monospace' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatDateShort}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#52525B', fontSize: 10, fontFamily: 'var(--font-geist-mono), monospace' }}
          tickLine={false}
          axisLine={false}
          width={24}
        />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--sub)', marginBottom: 4 }} />
        <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'var(--font-geist-mono), monospace', color: 'var(--sub)' }} />
        <Bar dataKey="healthy"  stackId="a" fill="#22C55E" radius={0} />
        <Bar dataKey="warning"  stackId="a" fill="#F59E0B" radius={0} />
        <Bar dataKey="critical" stackId="a" fill="#EF4444" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
