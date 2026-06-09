import { Card } from '@/components/ui/Card'
import type { NetworkPort } from '@/types/dd-report'

interface NetworkTableProps {
  ports: NetworkPort[]
}

function linkColor(link: string): string {
  if (link === 'running') return '#00C853'
  if (link === 'down')    return '#FF4444'
  return '#F5A623'
}

export function NetworkTable({ ports }: NetworkTableProps) {
  const running = ports.filter(p => p.link === 'running').length

  return (
    <Card title={`Network Ports — ${running}/${ports.length} running`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-app-border">
              {['Port', 'Speed', 'Duplex', 'Link Status'].map(h => (
                <th
                  key={h}
                  className="px-5 py-2.5 text-left text-xs text-txt-muted font-normal"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ports.map(port => (
              <tr
                key={port.name}
                className="border-b border-app-border/50 hover:bg-app-bg/50 transition-colors"
              >
                <td className="px-5 py-2.5 font-mono text-txt-primary">{port.name}</td>
                <td className="px-5 py-2.5 font-mono text-txt-muted text-xs">{port.speed}</td>
                <td className="px-5 py-2.5 font-mono text-txt-muted text-xs">{port.duplex}</td>
                <td className="px-5 py-2.5">
                  <span
                    className="text-xs font-mono font-semibold"
                    style={{ color: linkColor(port.link) }}
                    aria-label={`Link status: ${port.link}`}
                  >
                    {port.link}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
