import type { StorageData } from '../../../types/dd-report'
import type { SectionResult } from '../types'
import { parseSlashDate } from '../utils/date-helpers'

const RE_PRE_COMP  = /\/data:\s+pre-comp\s+[-\d.]+\s+([\d.]+)/
const RE_POST_COMP = /\/data:\s+post-comp\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(\d+)%\s+([\d.]+)/
const RE_LAST_CLEANING = /last cleaning of\s+(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})/

// From DETAILED STORAGE LAYER section
const RE_ACTIVE_SIZE = /Current active tier size:\s+([\d.]+)\s+TiB/
const RE_ACTIVE_MAX  = /Active tier maximum capacity:\s+([\d.]+)\s+TiB/
const RE_CACHE_SIZE  = /Current cache tier size:\s+([\d.]+)\s+TiB/

// Disk Show State legend: ". = In Use Disks 26; s = Spare Disks 2; - = Not Installed Disks 1; c = Cache In Use Disks 1"
const RE_IN_USE_DISKS    = /\.\s*=\s*In Use Disks\s+(\d+)/
const RE_SPARE_DISKS     = /s\s*=\s*Spare Disks\s+(\d+)/
const RE_NOT_INST_DISKS  = /-\s*=\s*Not Installed Disks\s+(\d+)/
const RE_CACHE_IN_USE    = /c\s*=\s*Cache In Use Disks\s+(\d+)/

function safeFloat(val: string): number | null {
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

function safeInt(val: string): number | null {
  const n = parseInt(val, 10)
  return isNaN(n) ? null : n
}

export function parseStorage(text: string): SectionResult<StorageData> {
  try {
    const activeTierIdx = text.indexOf('Active Tier:')
    if (activeTierIdx === -1) {
      return { value: null, error: 'Active Tier section not found' }
    }

    const window = text.slice(activeTierIdx, activeTierIdx + 4000)

    const preCompMatch  = RE_PRE_COMP.exec(window)
    if (!preCompMatch) {
      return { value: null, error: 'Could not parse /data: pre-comp row' }
    }

    const postCompMatch = RE_POST_COMP.exec(window)
    if (!postCompMatch) {
      return { value: null, error: 'Could not parse /data: post-comp row' }
    }

    const pre_comp_gib   = safeFloat(preCompMatch[1])
    const total_gib      = safeFloat(postCompMatch[1])
    const used_gib       = safeFloat(postCompMatch[2])
    const available_gib  = safeFloat(postCompMatch[3])
    const used_percent   = parseInt(postCompMatch[4], 10)
    const cleanable_gib  = safeFloat(postCompMatch[5])

    if (
      pre_comp_gib === null || total_gib === null ||
      used_gib === null || available_gib === null || isNaN(used_percent)
    ) {
      return { value: null, error: 'Storage numeric parse failed' }
    }

    const cleaningMatch  = RE_LAST_CLEANING.exec(window)
    const last_cleaning_at = cleaningMatch ? parseSlashDate(cleaningMatch[1]) : null

    // DETAILED STORAGE LAYER tier sizes
    const detailedIdx = text.indexOf('DETAILED STORAGE LAYER')
    const detailedWindow = detailedIdx !== -1
      ? text.slice(detailedIdx, detailedIdx + 3000)
      : window

    const activeSizeMatch = RE_ACTIVE_SIZE.exec(detailedWindow)
    const activeMaxMatch  = RE_ACTIVE_MAX.exec(detailedWindow)
    const cacheSizeMatch  = RE_CACHE_SIZE.exec(detailedWindow)

    // Disk counts from Disk Show State legend
    const diskShowIdx = text.indexOf('Disk Show State')
    const diskLegendWindow = diskShowIdx !== -1
      ? text.slice(diskShowIdx, diskShowIdx + 600)
      : ''

    const inUseMatch   = RE_IN_USE_DISKS.exec(diskLegendWindow)
    const spareMatch   = RE_SPARE_DISKS.exec(diskLegendWindow)
    const notInstMatch = RE_NOT_INST_DISKS.exec(diskLegendWindow)
    const cacheInUse   = RE_CACHE_IN_USE.exec(diskLegendWindow)

    const in_use_disks       = inUseMatch   ? safeInt(inUseMatch[1])   : null
    const spare_disks        = spareMatch   ? safeInt(spareMatch[1])   : null
    const not_installed_disks = notInstMatch ? safeInt(notInstMatch[1]) : null
    const cache_in_use_disks  = cacheInUse  ? safeInt(cacheInUse[1])  : null

    const total_disks =
      in_use_disks !== null && spare_disks !== null && not_installed_disks !== null
        ? in_use_disks + spare_disks + not_installed_disks + (cache_in_use_disks ?? 0)
        : null

    return {
      value: {
        total_gib,
        used_gib,
        available_gib,
        used_percent,
        cleanable_gib,
        pre_comp_gib,
        last_cleaning_at,
        active_tier_size_tib: activeSizeMatch ? safeFloat(activeSizeMatch[1]) : null,
        active_tier_max_tib:  activeMaxMatch  ? safeFloat(activeMaxMatch[1])  : null,
        cache_tier_size_tib:  cacheSizeMatch  ? safeFloat(cacheSizeMatch[1])  : null,
        total_disks,
        in_use_disks,
        spare_disks,
        not_installed_disks,
        cache_in_use_disks,
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
