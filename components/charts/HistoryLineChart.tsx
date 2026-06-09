'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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
  tickFormatter?: (v: number) => string
  yDomain?: [number | 'auto', number | 'auto']
}

export default function HistoryLineChart({
  data,
  dataKey,
  label,
  color = COLORS.ACCENT,
  unit = '',
  tickFormatter,
  yDomain = ['auto', 'auto'],
}: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.BORDER} />
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
          tickFormatter={tickFormatter ?? (v => `${v}${unit}`)}
          axisLine={false}
          tickLine={false}
          domain={yDomain}
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
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: COLORS.MUTED }}
        />
        <Line
          type="monotone"
          dataKey={dataKey as string}
          name={label}
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: color }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
