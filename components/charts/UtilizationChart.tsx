'use client';

/**
 * UtilizationChart — multi-device storage utilisation % line chart, 30 days.
 * Matches the Chart.js color palette from the design reference.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { FleetStorageTrendRowDTO } from '@/lib/frontend/api';
import { formatDateShort } from '@/lib/frontend/format';

const DEVICE_COLORS = [
  '#3B82F6',
  '#F59E0B',
  '#22C55E',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
];

interface UtilizationChartProps {
  readonly rows: FleetStorageTrendRowDTO[];
}

/** Renders a per-device storage utilisation (%) line chart over the given rows. */
export function UtilizationChart({ rows }: UtilizationChartProps) {
  // Build date-keyed records with one entry per device
  const dateMap = new Map<string, Record<string, number>>();
  const deviceMap = new Map<string, string>(); // id → hostname

  for (const row of rows) {
    deviceMap.set(row.deviceId, row.hostname);
    const existing = dateMap.get(row.date) ?? {};
    existing[row.deviceId] = row.usedPercent;
    dateMap.set(row.date, existing);
  }

  const deviceIds   = [...deviceMap.keys()];
  const chartData   = [...dateMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }));

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
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
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
          domain={[60, 100]}
          tick={{ fill: '#52525B', fontSize: 10, fontFamily: 'var(--font-geist-mono), monospace' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v}%`}
          width={36}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: 'var(--sub)', marginBottom: 4 }}
          formatter={(val, name) => {
            const v = typeof val === 'number' ? val : 0;
            const n = String(name ?? '');
            return [`${v.toFixed(1)}%`, deviceMap.get(n) ?? n] as [string, string];
          }}
          labelFormatter={(label) => String(label ?? '')}
        />
        <Legend
          wrapperStyle={{ fontSize: 10, fontFamily: 'var(--font-geist-mono), monospace', color: 'var(--sub)' }}
          formatter={(value: string) => deviceMap.get(value) ?? value}
        />
        {deviceIds.map((id, i) => (
          <Line
            key={id}
            type="monotone"
            dataKey={id}
            stroke={DEVICE_COLORS[i % DEVICE_COLORS.length] ?? '#888'}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
