'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { COLORS } from '@/lib/constants/ui'
import type { HistoryChartPoint } from '@/types/dashboard'

interface Props {
  data: HistoryChartPoint[]
  dataKey: keyof Pick<HistoryChartPoint, 'storage_used_percent' | 'compression_factor' | 'daily_write_gib' | 'storage_used_gib'>
  label: string
  color?: string
  unit?: string
}

export default function HistoryBarChart({
  data,
  dataKey,
  label,
  color = COLORS.INFO,
  unit = '',
}: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.BORDER} vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: COLORS.MUTED, fontSize: 11, fontFamily: 'var(--font-mono)' }}
          tickFormatter={v => {
            try { return format(parseISO(v as string), 'MM/dd') } catch { return v as string }
          }}
          axisLine={{ stroke: COLORS.BORDER }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: COLORS.MUTED, fontSize: 11, fontFamily: 'var(--font-mono)' }}
          tickFormatter={v => `${v}${unit}`}
          axisLine={false}
          tickLine={false}
          width={50}
        />
        <Tooltip
          contentStyle={{
            background: COLORS.CARD,
            border: `1px solid ${COLORS.BORDER}`,
            borderRadius: 8,
            color: COLORS.TEXT,
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
          }}
          labelFormatter={v => {
            try { return format(parseISO(v as string), 'MMM dd, yyyy') } catch { return v as string }
          }}
          formatter={(v) => [`${Number(v).toFixed(1)}${unit}`, label]}
          cursor={{ fill: `${COLORS.BORDER}60` }}
        />
        <Bar
          dataKey={dataKey as string}
          name={label}
          fill={color}
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
