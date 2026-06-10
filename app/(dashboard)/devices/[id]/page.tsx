'use client'
import { use, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useDevices } from '@/lib/hooks/use-devices'
import { useDeviceReport } from '@/lib/hooks/use-device-report'
import { DeviceHeader } from '@/components/dashboard/DeviceHeader'
import { StorageSection } from '@/components/dashboard/StorageSection'
import { CompressionSection } from '@/components/dashboard/CompressionSection'
import { MTreeTable } from '@/components/dashboard/MTreeTable'
import { NetworkTable } from '@/components/dashboard/NetworkTable'
import { AlertsSection } from '@/components/dashboard/AlertsSection'
import { SystemHealthSection } from '@/components/dashboard/SystemHealthSection'
import { ReplicationSection } from '@/components/dashboard/ReplicationSection'
import { SkeletonBlock } from '@/components/ui/SkeletonCard'
import { ErrorState } from '@/components/ui/ErrorState'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function DeviceDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const { devices } = useDevices()
  const device = devices.find(d => d.id === id)
  const defaultDate = device?.latest_report_date ?? null
  const activeDate  = selectedDate ?? defaultDate

  const { report, isLoading, error } = useDeviceReport(id, activeDate)

  return (
    <div>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-txt-muted hover:text-txt-primary text-sm mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        All Devices
      </Link>

      {isLoading && !report && (
        <div className="space-y-4">
          <SkeletonBlock className="h-20 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <SkeletonBlock className="h-48" />
            <SkeletonBlock className="h-48" />
          </div>
          <SkeletonBlock className="h-40" />
          <SkeletonBlock className="h-32" />
        </div>
      )}

      {error && !isLoading && (
        <ErrorState
          message={
            activeDate
              ? `No report found for ${activeDate}. Try selecting a different date.`
              : 'Failed to load report data.'
          }
        />
      )}

      {!activeDate && !isLoading && !error && (
        <div className="flex flex-col items-center justify-center py-24 text-txt-muted">
          <p className="text-lg">No reports available for this device.</p>
        </div>
      )}

      {report && (
        <>
          <DeviceHeader
            meta={report.meta}
            deviceStatus={device?.device_status ?? 'unknown'}
            reportDate={activeDate ?? ''}
            onDateChange={setSelectedDate}
          />

          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {report.storage ? (
                <StorageSection storage={report.storage} />
              ) : (
                <SectionPlaceholder title="Storage" />
              )}
              {report.compression ? (
                <CompressionSection compression={report.compression} />
              ) : (
                <SectionPlaceholder title="Compression" />
              )}
            </div>

            <AlertsSection alerts={report.alerts} />

            <MTreeTable mtrees={report.mtrees} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SectionPlaceholder title="Disk Summary" />
              <NetworkTable ports={report.network.ports} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {report.system_health ? (
                <SystemHealthSection health={report.system_health} />
              ) : (
                <SectionPlaceholder title="System Health" />
              )}
              <ReplicationSection replication={report.replication} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function SectionPlaceholder({ title }: { title: string }) {
  return (
    <div className="bg-app-card border border-app-border rounded-lg p-5 text-txt-muted text-sm">
      {title}: data not available
    </div>
  )
}
