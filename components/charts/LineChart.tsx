'use client'
import { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  type ChartOptions,
  type TooltipOptions,
} from 'chart.js'

ChartJS.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)

const GRID_COLOR    = '#27272A'
const TICK_COLOR    = '#52525B'
const TOOLTIP_OPTS: Partial<TooltipOptions<'line'>> = {
  backgroundColor: '#111113',
  titleColor:      '#71717A',
  bodyColor:       '#D4D4D8',
  borderColor:     '#3F3F46',
  borderWidth:     1,
  padding:         10,
  cornerRadius:    3,
}

export interface LineDataset {
  data:   number[]
  color:  string
  label?: string
  fill?:  boolean
}

interface LineChartProps {
  labels:    string[]
  datasets:  LineDataset[]
  height?:   number
  yMin?:     number
  yMax?:     number
  unit?:     string
  showLegend?: boolean
}

export function LineChart({ labels, datasets, height = 160, yMin, yMax, unit, showLegend }: LineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<ChartJS | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    chartRef.current?.destroy()

    const options: ChartOptions<'line'> = {
      responsive:          true,
      maintainAspectRatio: false,
      interaction:         { mode: 'index', intersect: false },
      plugins: {
        legend:  showLegend
          ? { display: true, position: 'top', labels: { boxWidth: 8, padding: 12, color: TICK_COLOR, usePointStyle: true, pointStyle: 'circle' } }
          : { display: false },
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
      type: 'line',
      data: {
        labels,
        datasets: datasets.map(ds => ({
          data:            ds.data,
          borderColor:     ds.color,
          backgroundColor: ds.color + '0D',
          borderWidth:     1.5,
          tension:         0.4,
          pointRadius:     0,
          fill:            ds.fill ?? true,
          label:           ds.label ?? '',
        })),
      },
      options,
    })

    return () => { chartRef.current?.destroy() }
  }, [labels, datasets, yMin, yMax, unit, showLegend])

  return (
    <div style={{ position: 'relative', height }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
