import type { DiskData } from '../../../types/dd-report'
import type { SectionResult } from '../types'

// Matches: "Normal - Storage operational"
const RE_OVERALL_STATUS = /Disk Status\s*\n[-]+\s*\n([^\n]+)/

// Matches the Disk States table rows:
// "In Use        25            1"
const RE_IN_USE = /In Use\s+(\d+)\s+(\d+|-)/

// "Spare         2             -"
const RE_SPARE = /Spare\s+(\d+)\s+(\d+|-)/

// "TOTAL DISKS   27            1"
const RE_TOTAL = /TOTAL DISKS\s+(\d+)\s+(\d+|-)/

// Matches proactive disk check result
const RE_PROACTIVE = /Proactive Disk Check\s*\n[-]+\s*\n([^\n]+)/

function parseIntOrNull(val: string): number | null {
  if (val === '-') return null
  const n = parseInt(val, 10)
  return isNaN(n) ? null : n
}

export function parseDisks(text: string): SectionResult<DiskData> {
  try {
    const sectionIdx = text.indexOf('Disk Status')
    if (sectionIdx === -1) {
      return { value: null, error: 'Disk Status section not found' }
    }

    const window = text.slice(sectionIdx, sectionIdx + 1500)

    const overallStatusMatch = RE_OVERALL_STATUS.exec(window)
    const overall_status = overallStatusMatch
      ? overallStatusMatch[1].trim()
      : 'Unknown'

    const inUseMatch = RE_IN_USE.exec(window)
    const spareMatch = RE_SPARE.exec(window)
    const totalMatch = RE_TOTAL.exec(window)

    if (!inUseMatch || !totalMatch) {
      return { value: null, error: 'Disk States table rows not found' }
    }

    const active_tier_in_use_val = parseInt(inUseMatch[1], 10)
    const cache_tier_in_use_raw = inUseMatch[2]
    const active_tier_spare_raw = spareMatch ? spareMatch[1] : '-'
    const active_tier_total_val = parseInt(totalMatch[1], 10)

    if (isNaN(active_tier_in_use_val) || isNaN(active_tier_total_val)) {
      return { value: null, error: 'Disk count numeric parse failed' }
    }

    // Extract proactive check message from beginning of file
    const proactiveIdx = text.indexOf('Proactive Disk Check')
    let proactive_check = 'No drives have exceeded reliability thresholds'
    if (proactiveIdx !== -1) {
      const proactiveWindow = text.slice(proactiveIdx, proactiveIdx + 300)
      const proactiveMatch = RE_PROACTIVE.exec(proactiveWindow)
      if (proactiveMatch) {
        proactive_check = proactiveMatch[1].trim()
      }
    }

    return {
      value: {
        summary: {
          active_tier_in_use: active_tier_in_use_val,
          active_tier_spare: parseIntOrNull(active_tier_spare_raw),
          active_tier_total: active_tier_total_val,
          cache_tier_in_use: parseIntOrNull(cache_tier_in_use_raw),
          overall_status,
        },
        proactive_check,
      },
      error: null,
    }
  } catch (err) {
    return {
      value: null,
      error: `disks parse failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}
