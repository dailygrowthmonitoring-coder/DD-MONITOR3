import { Info, GitBranch } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { ReplicationData } from '@/types/dd-report'

interface ReplicationSectionProps {
  replication: ReplicationData | null
}

export function ReplicationSection({ replication }: ReplicationSectionProps) {
  const configured = replication?.is_configured === true

  return (
    <Card title="Replication">
      <div className="p-5">
        {!configured ? (
          <div className="flex items-center gap-2 text-sm text-txt-muted">
            <Info className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>Not configured</span>
          </div>
        ) : (
          <div className="flex items-start gap-2 text-sm text-txt-primary">
            <GitBranch className="w-4 h-4 flex-shrink-0 mt-0.5 text-accent" aria-hidden="true" />
            <span className="font-mono">{replication?.status ?? '—'}</span>
          </div>
        )}
      </div>
    </Card>
  )
}
