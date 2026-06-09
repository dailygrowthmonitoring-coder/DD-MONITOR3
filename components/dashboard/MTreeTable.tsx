import { Card } from '@/components/ui/Card'
import type { MTreeData } from '@/types/dd-report'

interface MTreeTableProps {
  mtrees: MTreeData[]
}

export function MTreeTable({ mtrees }: MTreeTableProps) {
  if (mtrees.length === 0) {
    return (
      <Card title="MTrees">
        <div className="px-5 py-8 text-center text-txt-muted text-sm">No MTrees found</div>
      </Card>
    )
  }

  return (
    <Card title={`MTrees (${mtrees.length})`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-app-border">
              {['Name', 'ID', 'Status', 'Pre-Comp GiB'].map(h => (
                <th
                  key={h}
                  className="px-5 py-2.5 text-left text-xs text-txt-muted font-normal last:text-right"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mtrees.map(mt => (
              <tr
                key={mt.id}
                className="border-b border-app-border/50 hover:bg-app-bg/50 transition-colors"
              >
                <td className="px-5 py-2.5 font-mono text-txt-primary">{mt.name}</td>
                <td className="px-5 py-2.5 font-mono text-txt-muted text-xs">{mt.id}</td>
                <td className="px-5 py-2.5">
                  <span
                    className="text-xs font-mono font-semibold"
                    style={{ color: mt.status === 'RW' ? '#00C853' : '#6B6B80' }}
                  >
                    {mt.status}
                  </span>
                </td>
                <td className="px-5 py-2.5 text-right font-mono text-txt-primary">
                  {mt.pre_comp_gib > 0 ? mt.pre_comp_gib.toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
