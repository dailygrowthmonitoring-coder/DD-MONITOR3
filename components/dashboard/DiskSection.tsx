'use client'
import { Card } from '@/components/ui/Card'
import type { DiskGroupData } from '@/types/dd-report'

interface DiskSectionProps {
  diskGroups: DiskGroupData[]
}

export function DiskSection({ diskGroups }: DiskSectionProps) {
  if (diskGroups.length === 0) {
    return (
      <Card title="Disk Groups">
        <div className="p-5 text-sm text-txt-muted">No disk group data available.</div>
      </Card>
    )
  }

  return (
    <Card title="Disk Groups">
      <div className="p-5 overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-app-border text-txt-muted">
              <th className="text-left pb-2 pr-4">Group</th>
              <th className="text-left pb-2 pr-4">Tier</th>
              <th className="text-right pb-2 pr-4">Disks</th>
              <th className="text-right pb-2">Size (TiB)</th>
            </tr>
          </thead>
          <tbody>
            {diskGroups.map((dg, i) => (
              <tr key={i} className="border-b border-app-border/40">
                <td className="py-1.5 pr-4 text-txt-primary">{dg.group_name}</td>
                <td className="py-1.5 pr-4 text-txt-muted">{dg.tier_type}</td>
                <td className="py-1.5 pr-4 text-right text-txt-primary">{dg.disk_count ?? '—'}</td>
                <td className="py-1.5 text-right text-txt-muted">
                  {dg.disk_size_tib != null ? dg.disk_size_tib.toFixed(1) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
