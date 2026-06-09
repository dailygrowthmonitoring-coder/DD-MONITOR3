'use client'

import { useState } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { SeverityBadge } from '@/components/ui/SeverityBadge'
import type { AlertListItem, DeviceOverviewItem } from '@/types/dashboard'

interface Props {
  alerts: AlertListItem[]
  devices: DeviceOverviewItem[]
  total: number
  page: number
  limit: number
  onPageChange: (page: number) => void
}

function hostnameFor(deviceId: string, devices: DeviceOverviewItem[]): string {
  return devices.find(d => d.id === deviceId)?.hostname ?? deviceId.slice(0, 8)
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  try { return formatDistanceToNow(parseISO(iso), { addSuffix: true }) }
  catch { return iso }
}

export default function AlertsTable({ alerts, devices, total, page, limit, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-lg border border-app-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-app-border bg-app-card">
              <th className="px-4 py-3 text-left font-medium text-txt-muted">Severity</th>
              <th className="px-4 py-3 text-left font-medium text-txt-muted">Device</th>
              <th className="px-4 py-3 text-left font-medium text-txt-muted">Class</th>
              <th className="px-4 py-3 text-left font-medium text-txt-muted">Object</th>
              <th className="px-4 py-3 text-left font-medium text-txt-muted">Message</th>
              <th className="px-4 py-3 text-left font-medium text-txt-muted">Posted</th>
            </tr>
          </thead>
          <tbody>
            {alerts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-txt-muted">
                  No alerts found
                </td>
              </tr>
            )}
            {alerts.map(alert => (
              <tr
                key={alert.id}
                className="border-b border-app-border/50 hover:bg-app-card/60 transition-colors"
              >
                <td className="px-4 py-3">
                  <SeverityBadge severity={alert.severity} />
                </td>
                <td className="px-4 py-3 font-mono text-txt-primary text-xs">
                  {hostnameFor(alert.device_id, devices)}
                </td>
                <td className="px-4 py-3 text-txt-muted">{alert.class ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-txt-muted text-xs">{alert.object ?? '—'}</td>
                <td className="px-4 py-3 text-txt-primary max-w-xs truncate" title={alert.message}>
                  {alert.message}
                </td>
                <td className="px-4 py-3 text-txt-muted text-xs whitespace-nowrap">
                  {relativeTime(alert.post_time)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-txt-muted">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 rounded border border-app-border text-sm text-txt-muted hover:text-txt-primary hover:border-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <span className="px-3 py-1 text-sm text-txt-primary font-mono">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded border border-app-border text-sm text-txt-muted hover:text-txt-primary hover:border-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
