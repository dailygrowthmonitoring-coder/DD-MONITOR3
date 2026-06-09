import type { StorageData } from '../../../types/dd-report'
import type { SectionResult } from '../types'
import { parseSlashDate } from '../utils/date-helpers'

// Matches the pre-comp row: "/data: pre-comp           -   423971.7           -      -                -"
const RE_PRE_COMP = /\/data:\s+pre-comp\s+[-\d.]+\s+([\d.]+)/

// Matches the post-comp row: "/data: post-comp    63988.6    18941.9     45046.7    30%            755.4"
const RE_POST_COMP = /\/data:\s+post-comp\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(\d+)%\s+([\d.]+)/

// Matches: "* Estimated based on last cleaning of 2025/03/04 08:25:28."
const RE_LAST_CLEANING = /last cleaning of\s+(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})/

function safeFloat(val: string): number | null {
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

export function parseStorage(text: string): SectionResult<StorageData> {
  try {
    const activeTierIdx = text.indexOf('Active Tier:')
    if (activeTierIdx === -1) {
      return { value: null, error: 'Active Tier section not found' }
    }

    // Limit search window to first ~200 lines after "Active Tier:"
    const window = text.slice(activeTierIdx, activeTierIdx + 4000)

    const preCompMatch = RE_PRE_COMP.exec(window)
    if (!preCompMatch) {
      return { value: null, error: 'Could not parse /data: pre-comp row' }
    }

    const postCompMatch = RE_POST_COMP.exec(window)
    if (!postCompMatch) {
      return { value: null, error: 'Could not parse /data: post-comp row' }
    }

    const pre_comp_gib = safeFloat(preCompMatch[1])
    const total_gib = safeFloat(postCompMatch[1])
    const used_gib = safeFloat(postCompMatch[2])
    const available_gib = safeFloat(postCompMatch[3])
    const used_percent_raw = parseInt(postCompMatch[4], 10)
    const cleanable_gib = safeFloat(postCompMatch[5])

    if (
      pre_comp_gib === null ||
      total_gib === null ||
      used_gib === null ||
      available_gib === null ||
      isNaN(used_percent_raw)
    ) {
      return { value: null, error: 'Storage numeric parse failed' }
    }

    const cleaningMatch = RE_LAST_CLEANING.exec(window)
    const last_cleaning = cleaningMatch ? parseSlashDate(cleaningMatch[1]) : null

    return {
      value: {
        total_gib,
        used_gib,
        available_gib,
        used_percent: used_percent_raw,
        cleanable_gib,
        pre_comp_gib,
        last_cleaning,
      },
      error: null,
    }
  } catch (err) {
    return {
      value: null,
      error: `storage parse failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}
