'use client'

import { useState } from 'react'
import { format, subDays } from 'date-fns'
import { Card } from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonBlock } from '@/components/ui/SkeletonCard'
import DeviceCheckboxes from '@/components/dashboard/DeviceCheckboxes'
import ComparisonTable from '@/components/dashboard/ComparisonTable'
import { useDevices } from '@/lib/hooks/use-devices'
import { useCompare } from '@/lib/hooks/use-compare'
import { DATA_RETENTION_DAYS } from '@/lib/constants/ui'

const today     = format(new Date(), 'yyyy-MM-dd')
const minDate   = format(subDays(new Date(), DATA_RETENTION_DAYS), 'yyyy-MM-dd')

export default function ComparePage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [date, setDate]               = useState<string>(today)

  const { devices, isLoading: devicesLoading } = useDevices()
  const { data, isLoading, error } = useCompare(selectedIds, selectedIds.length > 0 ? date : null)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-txt-primary">Compare Devices</h1>
        <p className="text-sm text-txt-muted">Side-by-side metrics for up to 5 devices on a selected date</p>
      </div>

      {/* Controls */}
      <Card title="Select Devices & Date">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-txt-muted font-medium">
              Devices <span className="text-txt-muted">(select up to 5)</span>
            </label>
            {devicesLoading ? (
              <SkeletonBlock className="h-10 w-full rounded" />
            ) : (
              <DeviceCheckboxes
                devices={devices}
                selected={selectedIds}
                onChange={setSelectedIds}
                max={5}
              />
            )}
          </div>

          <div className="flex items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-txt-muted font-medium">Date</label>
              <input
                type="date"
                value={date}
                min={minDate}
                max={today}
                onChange={e => setDate(e.target.value)}
                className="h-9 rounded border border-app-border bg-app-card text-txt-primary text-sm px-3 font-mono focus:outline-none focus:border-accent"
              />
            </div>

            {selectedIds.length > 0 && (
              <button
                onClick={() => setSelectedIds([])}
                className="h-9 px-3 rounded border border-app-border text-txt-muted text-sm hover:text-txt-primary hover:border-accent/50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Results */}
      <Card title="Comparison">
        {selectedIds.length === 0 && (
          <p className="text-center text-txt-muted py-8">
            Select at least one device above to begin comparison
          </p>
        )}
        {selectedIds.length > 0 && isLoading && (
          <SkeletonBlock className="h-48 rounded" />
        )}
        {selectedIds.length > 0 && error && (
          <ErrorState message="Failed to load comparison data" />
        )}
        {selectedIds.length > 0 && !isLoading && !error && data && (
          <ComparisonTable reports={data} />
        )}
      </Card>
    </div>
  )
}
