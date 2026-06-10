import type { NetworkData, NetworkPort } from '../../../types/dd-report'
import type { SectionResult } from '../types'

// eth1a   1000Mb/s   full      100/1000/10000   00:60:16:a8:df:34   Copper     yes           running
// Groups: 1=port_name 2=speed 3=duplex (skip supported speeds) 4=mac 5=port_type 6=autoneg 7=link_status
const RE_PORT_ROW =
  /^(eth\w+)\s+([\w/]+)\s+(\w+)\s+[\w/]+\s+([\w:]+)\s+(\w+)\s+(\w+)\s+(\w+)/gm

export function parseNetwork(text: string): SectionResult<NetworkData> {
  try {
    const sectionIdx = text.indexOf('Net Show Hardware')
    if (sectionIdx === -1) {
      return { value: { ports: [] }, error: 'Net Show Hardware section not found' }
    }

    const after  = text.slice(sectionIdx)
    const endIdx = after.search(/\n\n\n/)
    const window = endIdx > 0 ? after.slice(0, endIdx) : after.slice(0, 2000)

    const ports: NetworkPort[] = []
    const re = RE_PORT_ROW
    re.lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = re.exec(window)) !== null) {
      ports.push({
        port_name:   match[1],
        speed:       match[2],
        duplex:      match[3],
        mac_address: match[4],
        port_type:   match[5],
        autoneg:     match[6],
        link_status: match[7],
      })
    }

    return { value: { ports }, error: null }
  } catch (err) {
    return {
      value: { ports: [] },
      error: `network parse failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}
