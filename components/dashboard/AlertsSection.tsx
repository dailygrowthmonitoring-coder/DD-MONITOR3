import { CheckCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { SeverityBadge } from '@/components/ui/SeverityBadge'
import { formatDatetime } from '@/lib/utils/format'
import type { AlertsData } from '@/types/dd-report'

interface AlertsSectionProps {
  alerts: AlertsData
}

export function AlertsSection({ alerts }: AlertsSectionProps) {
  const title = `Active Alerts${alerts.active_count > 0 ? ` (${alerts.active_count})` : ''}`

  if (alerts.active_count === 0) {
    return (
      <Card title={title}>
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <CheckCircle className="w-8 h-8 text-st-healthy" aria-hidden="true" />
          <span className="text-sm text-txt-muted">No active alerts</span>
        </div>
      </Card>
    )
  }

  return (
    <Card title={title}>
      <div className="divide-y divide-app-border">
        {alerts.active.map(alert => (
          <div key={alert.id} className="p-4 hover:bg-app-bg/50 transition-colors">
            <div className="flex items-start gap-3">
              <SeverityBadge severity={alert.severity} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-txt-primary leading-snug break-words">
                  {alert.message}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-txt-muted font-mono">
                  <span>{formatDatetime(alert.post_time)}</span>
                  {alert.class  && <span>Class: {alert.class}</span>}
                  {alert.object && <span>Object: {alert.object}</span>}
                  <span className="text-txt-muted/60">ID: {alert.id}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
