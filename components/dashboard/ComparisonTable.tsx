'use client'

import { StorageBar } from '@/components/ui/StorageBar'
import type { CompareReportItem } from '@/types/dashboard'

interface Props {
  reports: CompareReportItem[]
}

interface Row {
  hostname: string
  date: string
  usedPct: number | null
  compressionFactor: string | null
  criticalAlerts: number
  warningAlerts: number
}

function toRow(item: CompareReportItem, deviceId: string): Row {
  return {
    hostname:          deviceId,
    date:              item.report_date,
    usedPct:           item.storage_used_percent,
    compressionFactor: item.compression_factor !== null ? `${item.compression_factor}x` : null,
    criticalAlerts:    0,
    warningAlerts:     item.active_alerts,
  }
}

export default function ComparisonTable({ reports }: Props) {
  const rows = reports.map(r => toRow(r, r.device_id.slice(0, 8)))

  const sortedByUsage = [...rows].sort((a, b) => (b.usedPct ?? 0) - (a.usedPct ?? 0))
  const rankByUsage = new Map(sortedByUsage.map((r, i) => [r.hostname, i + 1]))

  return (
    <div className="overflow-x-auto rounded-lg border border-app-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-app-border bg-app-card">
            <th className="px-4 py-3 text-left font-medium text-txt-muted">#</th>
            <th className="px-4 py-3 text-left font-medium text-txt-muted">Device</th>
            <th className="px-4 py-3 text-left font-medium text-txt-muted">Report Date</th>
            <th className="px-4 py-3 text-left font-medium text-txt-muted min-w-[180px]">Storage Used</th>
            <th className="px-4 py-3 text-right font-medium text-txt-muted">Compression</th>
            <th className="px-4 py-3 text-center font-medium text-txt-muted">Alerts</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-txt-muted">
                Select devices and a date to compare
              </td>
            </tr>
          )}
          {sortedByUsage.map(row => (
            <tr
              key={row.hostname}
              className="border-b border-app-border/50 hover:bg-app-card/60 transition-colors"
            >
              <td className="px-4 py-3 font-mono text-txt-muted text-xs">
                #{rankByUsage.get(row.hostname)}
              </td>
              <td className="px-4 py-3 font-mono text-txt-primary font-medium">
                {row.hostname}
              </td>
              <td className="px-4 py-3 font-mono text-txt-muted text-xs">{row.date}</td>
              <td className="px-4 py-3">
                {row.usedPct != null ? (
                  <div className="flex items-center gap-2">
                    <div className="w-32">
                      <StorageBar percent={row.usedPct} showLabel={false} />
                    </div>
                    <span className="font-mono text-xs text-txt-muted">{row.usedPct.toFixed(1)}%</span>
                  </div>
                ) : (
                  <span className="text-txt-muted">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-mono text-accent text-xs">
                {row.compressionFactor ?? '—'}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-center gap-2">
                  {row.criticalAlerts > 0 && (
                    <span className="rounded px-1.5 py-0.5 bg-st-critical/20 text-st-critical text-xs font-mono">
                      {row.criticalAlerts}C
                    </span>
                  )}
                  {row.warningAlerts > 0 && (
                    <span className="rounded px-1.5 py-0.5 bg-st-warning/20 text-st-warning text-xs font-mono">
                      {row.warningAlerts}W
                    </span>
                  )}
                  {row.criticalAlerts === 0 && row.warningAlerts === 0 && (
                    <span className="text-st-healthy text-xs">✓</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
