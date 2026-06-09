'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonBlock } from '@/components/ui/SkeletonCard'
import HistoryLineChart from '@/components/charts/HistoryLineChart'
import HistoryBarChart from '@/components/charts/HistoryBarChart'
import { useDevices } from '@/lib/hooks/use-devices'
import { useDeviceHistory } from '@/lib/hooks/use-device-history'
import { COLORS, DATA_RETENTION_DAYS } from '@/lib/constants/ui'

const RANGE_OPTIONS = [
  { label: '7d',   value: 7 },
  { label: '14d',  value: 14 },
  { label: '30d',  value: 30 },
  { label: `${DATA_RETENTION_DAYS}d`, value: DATA_RETENTION_DAYS },
]

export default function HistoryPage() {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)
  const [rangeDays, setRangeDays]           = useState(7)

  const { devices, isLoading: devicesLoading } = useDevices()
  const { data, isLoading, error } = useDeviceHistory(selectedDevice, rangeDays)

  const device = devices.find(d => d.id === selectedDevice)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-txt-primary">Historical Trends</h1>
        <p className="text-sm text-txt-muted">Storage, compression, and write activity over time</p>
      </div>

      {/* Controls */}
      <Card>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-txt-muted font-medium">Device</label>
            {devicesLoading ? (
              <SkeletonBlock className="h-9 w-48 rounded" />
            ) : (
              <select
                value={selectedDevice ?? ''}
                onChange={e => setSelectedDevice(e.target.value || null)}
                className="h-9 rounded border border-app-border bg-app-card text-txt-primary text-sm px-3 focus:outline-none focus:border-accent"
              >
                <option value="">Select a device…</option>
                {devices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.hostname}{d.location ? ` (${d.location})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-txt-muted font-medium">Range</label>
            <div className="flex gap-1">
              {RANGE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setRangeDays(opt.value)}
                  className={[
                    'px-3 py-1.5 rounded text-sm transition-colors',
                    rangeDays === opt.value
                      ? 'bg-accent text-app-bg font-semibold'
                      : 'bg-app-border text-txt-muted hover:text-txt-primary',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Charts */}
      {!selectedDevice && (
        <Card>
          <p className="text-center text-txt-muted py-12">Select a device to view history</p>
        </Card>
      )}

      {selectedDevice && isLoading && (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <SkeletonBlock className="h-[220px] rounded" />
            </Card>
          ))}
        </div>
      )}

      {selectedDevice && error && (
        <ErrorState message="Failed to load history data" />
      )}

      {selectedDevice && !isLoading && !error && data && (
        <>
          <Card title={`Storage Used % — ${device?.hostname ?? ''}`}>
            <HistoryLineChart
              data={data}
              dataKey="storage_used_percent"
              label="Storage Used %"
              color={COLORS.ACCENT}
              unit="%"
              yDomain={[0, 100]}
            />
          </Card>

          <Card title={`Compression Factor — ${device?.hostname ?? ''}`}>
            <HistoryLineChart
              data={data}
              dataKey="compression_factor"
              label="Compression Factor"
              color={COLORS.INFO}
              tickFormatter={v => `${v}x`}
              unit="x"
            />
          </Card>

          <Card title={`Daily Write (GiB) — ${device?.hostname ?? ''}`}>
            <HistoryBarChart
              data={data}
              dataKey="daily_write_gib"
              label="Daily Write (GiB)"
              color={COLORS.WARNING}
              unit=" GiB"
            />
          </Card>
        </>
      )}
    </div>
  )
}
