import type { SystemHealthData } from '../../../types/dd-report'
import type { SectionResult } from '../types'
import { parseAvailabilitySinceDate } from '../utils/date-helpers'

// Matches: "Since                                                   May 21 03:00:00 AST 2020"
const RE_AVAIL_SINCE = /Since\s{2,}((?:\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\w+\s+\d{4}))/

// Matches: "System availability                                     100%"
// (not the "excluding controlled downtime" variant)
const RE_SYSTEM_AVAIL = /^System availability\s+(\d+)%/m

// Matches: "Filesystem availability                                 100%"
const RE_FS_AVAIL = /^Filesystem availability\s+(\d+)%/m

// Matches: "Total memory:      48137 MiB"
const RE_MEM_TOTAL = /Total memory:\s+(\d+)\s+MiB/

// Matches: "Free memory:       790 MiB"
const RE_MEM_FREE = /Free memory:\s+(\d+)\s+MiB/

// Matches: "Total swap:        5119 MiB"
const RE_SWAP_TOTAL = /Total swap:\s+(\d+)\s+MiB/

// Matches: "Free swap:         1 MiB"
const RE_SWAP_FREE = /Free swap:\s+(\d+)\s+MiB/

// Matches: "Data verification is running normally."
const RE_FS_VERIFY = /Data verification is (\w[\w\s]+)/

// Matches: "The NFS system is currently active and running."
const RE_NFS = /The NFS system is currently (\w[\w\s]+)/

// Matches: "CIFS is enabled." or "CIFS is disabled."
const RE_CIFS = /^CIFS is (\w+)/m

function safeInt(val: string): number | null {
  const n = parseInt(val, 10)
  return isNaN(n) ? null : n
}

export function parseSystemHealth(text: string): SectionResult<SystemHealthData> {
  try {
    const availIdx = text.indexOf('System Availability Metric')
    const memIdx = text.indexOf('System Memory Summary')

    if (availIdx === -1 && memIdx === -1) {
      return { value: null, error: 'System health sections not found' }
    }

    // Availability window
    const availWindow = availIdx !== -1
      ? text.slice(availIdx, availIdx + 1000)
      : ''

    const sinceMatch = RE_AVAIL_SINCE.exec(availWindow)
    const availability_since = sinceMatch
      ? parseAvailabilitySinceDate(sinceMatch[1])
      : null

    const sysAvailMatch = RE_SYSTEM_AVAIL.exec(availWindow)
    const system_availability_percent = sysAvailMatch
      ? safeInt(sysAvailMatch[1])
      : null

    const fsAvailMatch = RE_FS_AVAIL.exec(availWindow)
    const filesystem_availability_percent = fsAvailMatch
      ? safeInt(fsAvailMatch[1])
      : null

    // Memory window
    const memWindow = memIdx !== -1
      ? text.slice(memIdx, memIdx + 600)
      : ''

    const memTotalMatch = RE_MEM_TOTAL.exec(memWindow)
    const memory_total_mib = memTotalMatch ? safeInt(memTotalMatch[1]) : null

    const memFreeMatch = RE_MEM_FREE.exec(memWindow)
    const memory_free_mib = memFreeMatch ? safeInt(memFreeMatch[1]) : null

    const swapTotalMatch = RE_SWAP_TOTAL.exec(memWindow)
    const swap_total_mib = swapTotalMatch ? safeInt(swapTotalMatch[1]) : null

    const swapFreeMatch = RE_SWAP_FREE.exec(memWindow)
    const swap_free_mib = swapFreeMatch ? safeInt(swapFreeMatch[1]) : null

    // Filesystem verify status
    const fsVerifyIdx = text.indexOf('Filesys Verify Status')
    const fsVerifyWindow = fsVerifyIdx !== -1
      ? text.slice(fsVerifyIdx, fsVerifyIdx + 300)
      : ''
    const fsVerifyMatch = RE_FS_VERIFY.exec(fsVerifyWindow)
    const filesystem_verify_status = fsVerifyMatch
      ? fsVerifyMatch[1].trim().replace(/\.$/, '')
      : null

    // NFS status
    const nfsIdx = text.indexOf('NFS Status')
    const nfsWindow = nfsIdx !== -1 ? text.slice(nfsIdx, nfsIdx + 300) : ''
    const nfsMatch = RE_NFS.exec(nfsWindow)
    const nfs_status = nfsMatch
      ? nfsMatch[1].trim().replace(/\.$/, '').split(/\s+and\s+/)[0]
      : null

    // CIFS status
    const cifsIdx = text.indexOf('CIFS Status')
    const cifsWindow = cifsIdx !== -1 ? text.slice(cifsIdx, cifsIdx + 200) : ''
    const cifsMatch = RE_CIFS.exec(cifsWindow)
    const cifs_status = cifsMatch ? cifsMatch[1].trim().replace(/\.$/, '') : null

    return {
      value: {
        availability_since,
        system_availability_percent,
        filesystem_availability_percent,
        memory_total_mib,
        memory_free_mib,
        swap_total_mib,
        swap_free_mib,
        filesystem_verify_status,
        nfs_status,
        cifs_status,
      },
      error: null,
    }
  } catch (err) {
    return {
      value: null,
      error: `system-health parse failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}
