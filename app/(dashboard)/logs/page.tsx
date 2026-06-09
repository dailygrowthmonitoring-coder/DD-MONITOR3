'use client'

import { useState } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { Card } from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonBlock } from '@/components/ui/SkeletonCard'
import { SeverityBadge } from '@/components/ui/SeverityBadge'
import { useLogs } from '@/lib/hooks/use-logs'
import type { LogItem } from '@/types/dashboard'

const SEVERITY_OPTIONS = [
  { label: 'All',     value: '' },
  { label: 'Error',   value: 'ERROR' },
  { label: 'Warning', value: 'WARNING' },
  { label: 'Info',    value: 'INFO' },
]

const PAGE_SIZE = 40

function relativeTime(iso: string): string {
  try { return formatDistanceToNow(parseISO(iso), { addSuffix: true }) }
  catch { return iso }
}

function LogRow({ log }: { log: LogItem }) {
  return (
    <tr className="border-b border-app-border/50 hover:bg-app-card/60 transition-colors">
      <td className="px-4 py-3">
        <SeverityBadge severity={log.severity} />
      </td>
      <td className="px-4 py-3 font-mono text-xs text-txt-muted">{log.event_type}</td>
      <td className="px-4 py-3 text-txt-primary text-sm max-w-xs truncate" title={log.message}>
        {log.message}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-txt-muted whitespace-nowrap">
        {relativeTime(log.created_at)}
      </td>
    </tr>
  )
}

export default function LogsPage() {
  const [severity,   setSeverity]  = useState('')
  const [eventType,  setEventType] = useState('')
  const [page,       setPage]      = useState(1)

  const { data, isLoading, error } = useLogs({
    severity:   severity   || undefined,
    event_type: eventType  || undefined,
    page,
    limit: PAGE_SIZE,
  })

  function handleFilterChange(cb: () => void) {
    cb()
    setPage(1)
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-txt-primary">System Logs</h1>
        <p className="text-sm text-txt-muted">Ingestion, error, and audit events</p>
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
            <label className="text-xs text-txt-muted font-medium">Event Type</label>
            <input
              type="text"
              value={eventType}
              onChange={e => handleFilterChange(() => setEventType(e.target.value))}
              placeholder="e.g. INGEST_SUCCESS"
              className="h-9 rounded border border-app-border bg-app-card text-txt-primary text-sm px-3 font-mono placeholder:text-txt-muted/50 focus:outline-none focus:border-accent w-48"
            />
          </div>

          {data && (
            <p className="ml-auto text-sm text-txt-muted">
              {data.total.toLocaleString()} event{data.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card>
        {isLoading && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-10 rounded" />
            ))}
          </div>
        )}
        {error && <ErrorState message="Failed to load logs" onRetry={() => setPage(1)} />}
        {!isLoading && !error && data && (
          <div className="flex flex-col gap-4">
            <div className="overflow-x-auto rounded-lg border border-app-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-app-border bg-app-card">
                    <th className="px-4 py-3 text-left font-medium text-txt-muted">Severity</th>
                    <th className="px-4 py-3 text-left font-medium text-txt-muted">Event</th>
                    <th className="px-4 py-3 text-left font-medium text-txt-muted">Message</th>
                    <th className="px-4 py-3 text-left font-medium text-txt-muted">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-txt-muted">
                        No logs found
                      </td>
                    </tr>
                  )}
                  {data.data.map(log => (
                    <LogRow key={log.id} log={log} />
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-txt-muted">
                  Page {page} of {totalPages} · {data.total.toLocaleString()} total
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => p - 1)}
                    disabled={page <= 1}
                    className="px-3 py-1 rounded border border-app-border text-sm text-txt-muted hover:text-txt-primary hover:border-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages}
                    className="px-3 py-1 rounded border border-app-border text-sm text-txt-muted hover:text-txt-primary hover:border-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
