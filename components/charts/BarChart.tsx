'use client'
import { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  BarController,
  BarElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  type ChartOptions,
  type TooltipOptions,
} from 'chart.js'

ChartJS.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip)

const GRID_COLOR   = '#27272A'
const TICK_COLOR   = '#52525B'
const TOOLTIP_OPTS: Partial<TooltipOptions<'bar'>> = {
  backgroundColor: '#111113',
  titleColor:      '#71717A',
  bodyColor:       '#D4D4D8',
  borderColor:     '#3F3F46',
  borderWidth:     1,
  padding:         10,
  cornerRadius:    3,
}

interface BarChartProps {
  labels:  string[]
  data:    number[]
  height?: number
  yMin?:   number
  yMax?:   number
  unit?:   string
  colorFn?: (value: number) => string
}

function defaultColorFn(v: number): string {
  if (v >= 99) return 'rgba(34,197,94,.5)'
  if (v >= 97) return 'rgba(245,158,11,.5)'
  return 'rgba(239,68,68,.5)'
}

function defaultBorderFn(v: number): string {
  if (v >= 99) return '#22C55E'
  if (v >= 97) return '#F59E0B'
  return '#EF4444'
}

export function BarChart({ labels, data, height = 160, yMin, yMax, unit, colorFn }: BarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<ChartJS | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    chartRef.current?.destroy()

    const fn = colorFn ?? defaultColorFn

    const options: ChartOptions<'bar'> = {
      responsive:          true,
      maintainAspectRatio: false,
      interaction:         { mode: 'index', intersect: false },
      plugins: {
        legend:  { display: false },
        tooltip: TOOLTIP_OPTS,
      },
      scales: {
        x: {
          grid:   { color: GRID_COLOR },
          border: { display: false },
          ticks:  { maxTicksLimit: 8, color: TICK_COLOR },
        },
        y: {
          grid:   { color: GRID_COLOR },
          border: { display: false },
          ticks:  {
            color:    TICK_COLOR,
            callback: unit ? (v) => `${v}${unit}` : undefined,
          },
          min: yMin,
          max: yMax,
        },
      },
    }

    chartRef.current = new ChartJS(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: data.map(v => fn(v)),
          borderColor:     data.map(v => defaultBorderFn(v)),
          borderWidth:     1,
          borderRadius:    2,
          borderSkipped:   false,
          label:           '',
        }],
      },
      options,
    })

    return () => { chartRef.current?.destroy() }
  }, [labels, data, yMin, yMax, unit, colorFn])

  return (
    <div style={{ position: 'relative', height }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
