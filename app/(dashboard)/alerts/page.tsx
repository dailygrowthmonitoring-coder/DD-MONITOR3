'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonBlock } from '@/components/ui/SkeletonCard'
import AlertsTable from '@/components/dashboard/AlertsTable'
import { useAlerts } from '@/lib/hooks/use-alerts'
import { useDevices } from '@/lib/hooks/use-devices'

const SEVERITY_OPTIONS = [
  { label: 'All',      value: '' },
  { label: 'Critical', value: 'CRITICAL' },
  { label: 'Warning',  value: 'WARNING' },
  { label: 'Info',     value: 'INFO' },
]

const STATUS_OPTIONS = [
  { label: 'Active',   value: 'true' },
  { label: 'All',      value: '' },
]

const PAGE_SIZE = 25

export default function AlertsPage() {
  const [severity, setSeverity] = useState('')
  const [isActive, setIsActive] = useState('true')
  const [page, setPage]         = useState(1)

  const { devices, isLoading: devicesLoading } = useDevices()

  const { data, isLoading, error } = useAlerts({
    severity:  severity || undefined,
    is_active: isActive !== '' ? isActive === 'true' : undefined,
    page,
    limit: PAGE_SIZE,
  })

  function handleFilterChange(cb: () => void) {
    cb()
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-txt-primary">Alerts</h1>
        <p className="text-sm text-txt-muted">Active and historical device alerts</p>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-txt-muted font-medium">Severity</label>
            <div className="flex gap-1">
              {SEVERITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleFilterChange(() => setSeverity(opt.value))}
                  className={[
                    'px-3 py-1.5 rounded text-sm transition-colors',
                    severity === opt.value
                      ? 'bg-accent text-app-bg font-semibold'
                      : 'bg-app-border text-txt-muted hover:text-txt-primary',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-txt-muted font-medium">Status</label>
            <div className="flex gap-1">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleFilterChange(() => setIsActive(opt.value))}
                  className={[
                    'px-3 py-1.5 rounded text-sm transition-colors',
                    isActive === opt.value
                      ? 'bg-accent text-app-bg font-semibold'
                      : 'bg-app-border text-txt-muted hover:text-txt-primary',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {data && (
            <p className="ml-auto text-sm text-txt-muted">
              {data.total} alert{data.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card>
        {(isLoading || devicesLoading) && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-10 rounded" />
            ))}
          </div>
        )}
        {error && (
          <ErrorState
            message="Failed to load alerts"
            onRetry={() => setPage(1)}
          />
        )}
        {!isLoading && !error && data && (
          <AlertsTable
            alerts={data.data}
            devices={devices}
            total={data.total}
            page={page}
            limit={PAGE_SIZE}
            onPageChange={setPage}
          />
        )}
      </Card>
    </div>
  )
}
