'use client'
import { useDevices } from '@/lib/hooks/use-devices'
import { SummaryCard } from '@/components/dashboard/SummaryCard'
import { DeviceCard } from '@/components/dashboard/DeviceCard'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { ErrorState } from '@/components/ui/ErrorState'
import { formatDate } from '@/lib/utils/format'

export default function OverviewPage() {
  const { devices, error, isLoading, refresh } = useDevices()

  const totalDevices   = devices.length
  const totalCritical  = devices.reduce((s, d) => s + d.active_alerts_critical, 0)
  const totalWarning   = devices.reduce((s, d) => s + d.active_alerts_warning, 0)
  const lastReportDate = devices
    .map(d => d.latest_report_date)
    .filter((d): d is string => d !== null)
    .sort()
    .at(-1) ?? null

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-txt-primary">Overview</h1>
        <p className="text-txt-muted text-sm mt-1">All devices at a glance</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} lines={1} />
          ))
        ) : (
          <>
            <SummaryCard
              label="Total Devices"
              value={totalDevices}
              variant="default"
            />
            <SummaryCard
              label="Critical Alerts"
              value={totalCritical}
              variant="critical"
            />
            <SummaryCard
              label="Warning Alerts"
              value={totalWarning}
              variant="warning"
            />
            <SummaryCard
              label="Last Report"
              value={formatDate(lastReportDate)}
              variant={lastReportDate ? 'default' : 'muted'}
              mono
            />
          </>
        )}
      </div>

      {/* Device grid */}
      {error && (
        <ErrorState
          message="Failed to load devices. Check your connection."
          onRetry={() => void refresh()}
        />
      )}

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {!isLoading && !error && (
        <>
          {devices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-txt-muted">
              <p className="text-lg">No devices registered yet.</p>
              <p className="text-sm mt-1">Reports will appear here once ingested.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {devices.map(device => (
                <DeviceCard key={device.id} device={device} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
