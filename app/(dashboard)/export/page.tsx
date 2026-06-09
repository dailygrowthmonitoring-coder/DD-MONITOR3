'use client'

import { useState } from 'react'
import { format, subDays } from 'date-fns'
import { Card } from '@/components/ui/Card'
import { useDevices } from '@/lib/hooks/use-devices'
import { SkeletonBlock } from '@/components/ui/SkeletonCard'
import { DATA_RETENTION_DAYS } from '@/lib/constants/ui'

const today   = format(new Date(), 'yyyy-MM-dd')
const minDate = format(subDays(new Date(), DATA_RETENTION_DAYS), 'yyyy-MM-dd')

const FORMAT_OPTIONS = [
  { label: 'CSV',  value: 'csv',  description: 'Comma-separated, opens in Excel' },
  { label: 'JSON', value: 'json', description: 'Structured data for integrations' },
  { label: 'PDF',  value: 'pdf',  description: 'Formatted report for printing' },
]

const DATA_OPTIONS = [
  { label: 'Storage Snapshots', value: 'storage' },
  { label: 'Compression Stats', value: 'compression' },
  { label: 'Alerts',            value: 'alerts' },
  { label: 'System Logs',       value: 'logs' },
  { label: 'Full Report',       value: 'full' },
]

export default function ExportPage() {
  const [selectedDevice, setSelectedDevice] = useState<string>('all')
  const [fromDate, setFromDate]             = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'))
  const [toDate, setToDate]                 = useState(today)
  const [exportFormat, setExportFormat]     = useState('csv')
  const [dataType, setDataType]             = useState('storage')

  const { devices, isLoading: devicesLoading } = useDevices()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-txt-primary">Export Data</h1>
        <p className="text-sm text-txt-muted">Download device reports and metrics</p>
      </div>

      {/* Phase note */}
      <div className="rounded-lg border border-st-info/30 bg-st-info/10 px-4 py-3 flex items-start gap-3">
        <span className="text-st-info text-lg leading-none mt-0.5">ℹ</span>
        <div>
          <p className="text-sm text-txt-primary font-medium">Export Coming in Phase 8</p>
          <p className="text-sm text-txt-muted mt-0.5">
            Export functionality will be implemented in Phase 8. Configure your export parameters
            below — the download endpoint will be wired up in the next release.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scope */}
        <Card title="Scope">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-txt-muted font-medium">Device</label>
              {devicesLoading ? (
                <SkeletonBlock className="h-9 w-full rounded" />
              ) : (
                <select
                  value={selectedDevice}
                  onChange={e => setSelectedDevice(e.target.value)}
                  className="h-9 rounded border border-app-border bg-app-card text-txt-primary text-sm px-3 focus:outline-none focus:border-accent"
                >
                  <option value="all">All Devices</option>
                  {devices.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.hostname}{d.location ? ` (${d.location})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-txt-muted font-medium">From</label>
                <input
                  type="date"
                  value={fromDate}
                  min={minDate}
                  max={toDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="h-9 rounded border border-app-border bg-app-card text-txt-primary text-sm px-3 font-mono focus:outline-none focus:border-accent"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-txt-muted font-medium">To</label>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate}
                  max={today}
                  onChange={e => setToDate(e.target.value)}
                  className="h-9 rounded border border-app-border bg-app-card text-txt-primary text-sm px-3 font-mono focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Format */}
        <Card title="Format & Data">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-txt-muted font-medium">Export Format</label>
              <div className="flex flex-col gap-2">
                {FORMAT_OPTIONS.map(opt => (
                  <label
                    key={opt.value}
                    className={[
                      'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      exportFormat === opt.value
                        ? 'border-accent bg-accent/10'
                        : 'border-app-border hover:border-accent/50',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="format"
                      value={opt.value}
                      checked={exportFormat === opt.value}
                      onChange={e => setExportFormat(e.target.value)}
                      className="accent-accent"
                    />
                    <div>
                      <span className="text-sm text-txt-primary font-medium">{opt.label}</span>
                      <span className="text-xs text-txt-muted ml-2">{opt.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-txt-muted font-medium">Data Type</label>
              <select
                value={dataType}
                onChange={e => setDataType(e.target.value)}
                className="h-9 rounded border border-app-border bg-app-card text-txt-primary text-sm px-3 focus:outline-none focus:border-accent"
              >
                {DATA_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      </div>

      {/* Preview & Download */}
      <Card title="Summary">
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <dt className="text-xs text-txt-muted mb-1">Device</dt>
              <dd className="text-sm text-txt-primary font-mono">
                {selectedDevice === 'all'
                  ? `All (${devices.length})`
                  : devices.find(d => d.id === selectedDevice)?.hostname ?? selectedDevice.slice(0, 8)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-txt-muted mb-1">Date Range</dt>
              <dd className="text-sm text-txt-primary font-mono">{fromDate} → {toDate}</dd>
            </div>
            <div>
              <dt className="text-xs text-txt-muted mb-1">Format</dt>
              <dd className="text-sm text-txt-primary">{exportFormat.toUpperCase()}</dd>
            </div>
            <div>
              <dt className="text-xs text-txt-muted mb-1">Data</dt>
              <dd className="text-sm text-txt-primary">
                {DATA_OPTIONS.find(o => o.value === dataType)?.label ?? dataType}
              </dd>
            </div>
          </dl>

          <button
            disabled
            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-app-border text-txt-muted cursor-not-allowed text-sm font-medium"
            title="Available in Phase 8"
          >
            <span>↓</span>
            Download Export
            <span className="ml-1 text-xs opacity-60">(Phase 8)</span>
          </button>
        </div>
      </Card>
    </div>
  )
}
