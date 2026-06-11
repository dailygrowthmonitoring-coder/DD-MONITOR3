'use client';

/**
 * StorageTrendChart — multi-line per-device storage usage in TiB over 30 days.
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

interface StorageTrendChartProps {
  readonly rows: FleetStorageTrendRowDTO[];
}

/** Renders multi-line per-device storage usage (TiB) trend chart. */
export function StorageTrendChart({ rows }: StorageTrendChartProps) {
  const dateMap  = new Map<string, Record<string, number>>();
  const deviceMap = new Map<string, string>();

  for (const row of rows) {
    deviceMap.set(row.deviceId, row.hostname);
    const existing = dateMap.get(row.date) ?? {};
    // Convert GiB → TiB for display
    existing[row.deviceId] = parseFloat((row.usedGib / 1024).toFixed(2));
    dateMap.set(row.date, existing);
  }

  const deviceIds = [...deviceMap.keys()];
  const chartData = [...dateMap.entries()]
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
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
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
          tickFormatter={(v: number) => `${v} TiB`}
          width={50}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: 'var(--sub)', marginBottom: 4 }}
          formatter={(val, name) => {
            const v = typeof val === 'number' ? val : 0;
            const n = String(name ?? '');
            return [`${v.toFixed(2)} TiB`, deviceMap.get(n) ?? n] as [string, string];
          }}
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
