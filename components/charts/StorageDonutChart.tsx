'use client'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { COLORS, STORAGE_WARNING_THRESHOLD, STORAGE_CRITICAL_THRESHOLD } from '@/lib/constants/ui'

interface StorageDonutChartProps {
  usedGib: number
  totalGib: number
  usedPercent: number
}

function chartColor(pct: number): string {
  if (pct >= STORAGE_CRITICAL_THRESHOLD) return COLORS.CRITICAL
  if (pct >= STORAGE_WARNING_THRESHOLD)  return COLORS.WARNING
  return COLORS.ACCENT
}

export function StorageDonutChart({
  usedGib,
  totalGib,
  usedPercent,
}: StorageDonutChartProps) {
  const available = Math.max(0, totalGib - usedGib)
  const data = [
    { name: 'Used',      value: usedGib    },
    { name: 'Available', value: available  },
  ]
  const fill = chartColor(usedPercent)

  return (
    <div className="relative flex-shrink-0 w-44 h-44">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={72}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            strokeWidth={0}
          >
            <Cell fill={fill} />
            <Cell fill={COLORS.BORDER} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="font-mono text-3xl font-bold leading-none" style={{ color: fill }}>
          {usedPercent}%
        </span>
        <span className="text-xs text-txt-muted mt-1">Used</span>
      </div>
    </div>
  )
}
