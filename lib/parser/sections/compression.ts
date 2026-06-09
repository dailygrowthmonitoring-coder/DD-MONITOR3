import type { CompressionData } from '../../../types/dd-report'
import type { SectionResult } from '../types'
import { parseShortDateTime } from '../utils/date-helpers'

// Matches: "From: 2025-03-03 06:00 To: 2025-03-10 06:00"
const RE_PERIOD = /From:\s+(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\s+To:\s+(\d{4}-\d{2}-\d{2} \d{2}:\d{2})/

// Matches: "Currently Used:*   423971.7     18941.9             -            -    22.4x (95.5)"
const RE_CURRENTLY_USED = /Currently Used:\*?\s+([\d.]+)\s+([\d.]+)\s+[-\d.]+\s+[-\d.]+\s+([\d.]+)x\s+\(([\d.]+)\)/

// Matches: " Last 7 days        8585.1      1054.5          7.6x         1.1x     8.1x (87.7)"
const RE_LAST_7_DAYS = /Last 7 days\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)x\s+([\d.]+)x\s+([\d.]+)x\s+\(([\d.]+)\)/

// Matches: " Last 24 hrs         645.6       126.9          5.0x         1.0x     5.1x (80.3)"
const RE_LAST_24H = /Last 24 hrs?\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)x\s+([\d.]+)x\s+([\d.]+)x\s+\(([\d.]+)\)/

function safeFloat(val: string): number | null {
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

export function parseCompression(text: string): SectionResult<CompressionData> {
  try {
    // Use the first "Filesys Compression" section (SERVER USAGE section, not Mtree Show)
    const sectionIdx = text.indexOf('Filesys Compression')
    if (sectionIdx === -1) {
      return { value: null, error: 'Filesys Compression section not found' }
    }

    // Use a bounded window — the section ends before the next "====" header
    const afterSection = text.slice(sectionIdx)
    const nextHeaderIdx = afterSection.indexOf('==========')
    const window = nextHeaderIdx > 0
      ? afterSection.slice(0, nextHeaderIdx)
      : afterSection.slice(0, 3000)

    const periodMatch = RE_PERIOD.exec(window)
    if (!periodMatch) {
      return { value: null, error: 'Compression period From/To not found' }
    }

    const currentMatch = RE_CURRENTLY_USED.exec(window)
    if (!currentMatch) {
      return { value: null, error: 'Currently Used compression row not found' }
    }

    const last7Match = RE_LAST_7_DAYS.exec(window)
    if (!last7Match) {
      return { value: null, error: 'Last 7 days compression row not found' }
    }

    const last24Match = RE_LAST_24H.exec(window)
    if (!last24Match) {
      return { value: null, error: 'Last 24 hrs compression row not found' }
    }

    const period_from = parseShortDateTime(periodMatch[1])
    const period_to = parseShortDateTime(periodMatch[2])

    const cu_pre = safeFloat(currentMatch[1])
    const cu_post = safeFloat(currentMatch[2])
    const cu_total_factor = `${currentMatch[3]}x`
    const cu_reduction = safeFloat(currentMatch[4])

    const l7_pre = safeFloat(last7Match[1])
    const l7_post = safeFloat(last7Match[2])
    const l7_global = `${last7Match[3]}x`
    const l7_local = `${last7Match[4]}x`
    const l7_total = `${last7Match[5]}x`
    const l7_reduction = safeFloat(last7Match[6])

    const l24_pre = safeFloat(last24Match[1])
    const l24_post = safeFloat(last24Match[2])
    const l24_global = `${last24Match[3]}x`
    const l24_local = `${last24Match[4]}x`
    const l24_total = `${last24Match[5]}x`
    const l24_reduction = safeFloat(last24Match[6])

    if (
      cu_pre === null || cu_post === null || cu_reduction === null ||
      l7_pre === null || l7_post === null || l7_reduction === null ||
      l24_pre === null || l24_post === null || l24_reduction === null
    ) {
      return { value: null, error: 'Compression numeric parse failed' }
    }

    return {
      value: {
        period_from,
        period_to,
        currently_used: {
          pre_comp_gib: cu_pre,
          post_comp_gib: cu_post,
          total_factor: cu_total_factor,
          reduction_percent: cu_reduction,
        },
        last_7_days: {
          pre_comp_gib: l7_pre,
          post_comp_gib: l7_post,
          global_factor: l7_global,
          local_factor: l7_local,
          total_factor: l7_total,
          reduction_percent: l7_reduction,
        },
        last_24_hours: {
          pre_comp_gib: l24_pre,
          post_comp_gib: l24_post,
          global_factor: l24_global,
          local_factor: l24_local,
          total_factor: l24_total,
          reduction_percent: l24_reduction,
        },
      },
      error: null,
    }
  } catch (err) {
    return {
      value: null,
      error: `compression parse failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}
