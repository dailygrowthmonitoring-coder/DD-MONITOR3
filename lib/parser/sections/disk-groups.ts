import type { DiskGroupData } from '../../../types/dd-report'
import type { SectionResult } from '../types'

// dg0       1.1-1.5, 1.7-1.12   11      3.6 TiB
// dg2       2.1-2.14            14      2.7 TiB
// (spare)   1.6                  1      3.6 TiB
// dg1       1.13                 1    745.2 GiB
const RE_DG_ROW = /^(\(spare\)|dg\d+)\s+([\d.,\s-]+?)\s{2,}(\d+)\s+([\d.]+)\s*(TiB|GiB)/gm

function gibToTib(value: number, unit: string): number {
  return unit === 'GiB' ? value / 1024 : value
}

function safeFloat(val: string): number | null {
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

export function parseDiskGroups(text: string): SectionResult<DiskGroupData[]> {
  try {
    const storageShowIdx = text.indexOf('Storage Show All')
    if (storageShowIdx === -1) {
      return { value: [], error: 'Storage Show All section not found' }
    }

    // Bound window to next major section header
    const after    = text.slice(storageShowIdx)
    const endIdx   = after.search(/\n={5,}/)
    const window   = endIdx > 0 ? after.slice(0, endIdx) : after.slice(0, 3000)

    const groups: DiskGroupData[] = []
    let currentTier: 'active' | 'cache' = 'active'

    const re = RE_DG_ROW
    re.lastIndex = 0

    // Track context tier by scanning headers
    const lines = window.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (/^Active Tier/i.test(trimmed)) { currentTier = 'active'; continue }
      if (/^Cache Tier/i.test(trimmed))  { currentTier = 'cache';  continue }

      const m = RE_DG_ROW.exec(line)
      if (!m) continue

      const group_name  = m[1]
      const disk_slots  = m[2].replace(/\s+/g, ' ').trim()
      const disk_count  = parseInt(m[3], 10)
      const rawSize     = safeFloat(m[4])
      const unit        = m[5]

      const tier_type: 'active' | 'cache' | 'spare' =
        group_name === '(spare)' ? 'spare' : currentTier

      groups.push({
        group_name: group_name === '(spare)' ? `spare_${groups.length}` : group_name,
        disk_slots: disk_slots || null,
        disk_count: isNaN(disk_count) ? null : disk_count,
        disk_size_tib: rawSize !== null ? gibToTib(rawSize, unit) : null,
        tier_type,
      })
    }

    // Reset static regex lastIndex
    RE_DG_ROW.lastIndex = 0

    if (groups.length === 0) {
      return { value: [], error: 'No disk group rows found in Storage Show All section' }
    }

    return { value: groups, error: null }
  } catch (err) {
    return {
      value: [],
      error: `disk-groups parse failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}
