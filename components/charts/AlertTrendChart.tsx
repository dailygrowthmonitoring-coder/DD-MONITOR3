'use client';

/**
 * AlertTrendChart — bar chart of alert counts by severity per day.
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
import type { AlertTrendRowDTO } from '@/lib/frontend/api';
import { formatDateShort } from '@/lib/frontend/format';

interface AlertTrendChartProps {
  readonly rows: AlertTrendRowDTO[];
}

/** Renders a stacked alert-count bar chart by severity over the given days. */
export function AlertTrendChart({ rows }: AlertTrendChartProps) {
  const data = [...rows]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(r => ({
      date:     r.date,
      critical: r.criticalCount,
      warning:  r.warningCount,
      info:     r.infoCount,
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
        <Bar dataKey="critical" stackId="a" fill="#EF4444" radius={0} />
        <Bar dataKey="warning"  stackId="a" fill="#F59E0B" radius={0} />
        <Bar dataKey="info"     stackId="a" fill="#3B82F6" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
