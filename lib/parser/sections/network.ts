import type { NetworkData, NetworkPort } from '../../../types/dd-report'
import type { SectionResult } from '../types'

// Matches a network hardware table data row starting with an eth port name:
// "eth1a   1000Mb/s   full      100/1000/10000   00:60:16:a8:df:34   Copper     yes           running"
// "eth1b   unknown    unknown   100/1000/10000   00:60:16:a8:df:35   Copper     unknown       down"
// We target eth* ports and extract: name, speed, duplex, link_status (last column)
const RE_PORT_ROW = /^(eth\w+)\s+([\w/]+)\s+(\w+)\s+[\w/]+\s+[\w:]+\s+\w+\s+\w+\s+(\w+)/gm

export function parseNetwork(text: string): SectionResult<NetworkData> {
  try {
    const sectionIdx = text.indexOf('Net Show Hardware')
    if (sectionIdx === -1) {
      return { value: { ports: [] }, error: 'Net Show Hardware section not found' }
    }

    // Bound to section — ends at next blank line triple
    const after = text.slice(sectionIdx)
    const endIdx = after.search(/\n\n\n/)
    const window = endIdx > 0 ? after.slice(0, endIdx) : after.slice(0, 2000)

    const ports: NetworkPort[] = []
    const re = RE_PORT_ROW
    re.lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = re.exec(window)) !== null) {
      ports.push({
        name: match[1],
        speed: match[2],
        duplex: match[3],
        link: match[4],
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
