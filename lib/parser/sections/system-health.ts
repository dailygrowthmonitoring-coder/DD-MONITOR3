import type { SystemHealthData } from '../../../types/dd-report'
import type { SectionResult } from '../types'
import { parseAvailabilitySinceDate } from '../utils/date-helpers'

const RE_AVAIL_SINCE   = /Since\s{2,}((?:\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\w+\s+\d{4}))/
const RE_SYSTEM_AVAIL  = /^System availability\s+(\d+)%/m
const RE_SYSTEM_AVAIL_EXCL = /^System availability\s+excluding controlled downtime\s+(\d+)%/m
const RE_FS_AVAIL      = /^Filesystem availability\s+(\d+)%/m
const RE_FS_AVAIL_EXCL = /^Filesystem availability\s+excluding controlled downtime\s+(\d+)%/m
const RE_MEM_TOTAL     = /Total memory:\s+(\d+)\s+MiB/
const RE_MEM_FREE      = /Free memory:\s+(\d+)\s+MiB/
const RE_MEM_INACTIVE  = /Inactive memory:\s+(\d+)\s+MiB/
const RE_SWAP_TOTAL    = /Total swap:\s+(\d+)\s+MiB/
const RE_SWAP_FREE     = /Free swap:\s+(\d+)\s+MiB/
const RE_FS_VERIFY     = /Data verification is (\w[\w\s]+)/
const RE_NFS           = /The NFS system is currently (\w[\w\s]+)/
const RE_CIFS          = /^CIFS is (\w+)/m

function safeInt(val: string): number | null {
  const n = parseInt(val, 10)
  return isNaN(n) ? null : n
}

export function parseSystemHealth(text: string): SectionResult<SystemHealthData> {
  try {
    const availIdx = text.indexOf('System Availability Metric')
    const memIdx   = text.indexOf('System Memory Summary')

    if (availIdx === -1 && memIdx === -1) {
      return { value: null, error: 'System health sections not found' }
    }

    const availWindow = availIdx !== -1 ? text.slice(availIdx, availIdx + 1000) : ''

    const sinceMatch = RE_AVAIL_SINCE.exec(availWindow)
    const availability_since = sinceMatch
      ? parseAvailabilitySinceDate(sinceMatch[1])
      : null

    const sysAvailMatch    = RE_SYSTEM_AVAIL.exec(availWindow)
    const sysAvailExclMatch = RE_SYSTEM_AVAIL_EXCL.exec(availWindow)
    const fsAvailMatch     = RE_FS_AVAIL.exec(availWindow)
    const fsAvailExclMatch = RE_FS_AVAIL_EXCL.exec(availWindow)

    const memWindow = memIdx !== -1 ? text.slice(memIdx, memIdx + 600) : ''

    const memTotalMatch    = RE_MEM_TOTAL.exec(memWindow)
    const memFreeMatch     = RE_MEM_FREE.exec(memWindow)
    const memInactiveMatch = RE_MEM_INACTIVE.exec(memWindow)
    const swapTotalMatch   = RE_SWAP_TOTAL.exec(memWindow)
    const swapFreeMatch    = RE_SWAP_FREE.exec(memWindow)

    const fsVerifyIdx    = text.indexOf('Filesys Verify Status')
    const fsVerifyWindow = fsVerifyIdx !== -1 ? text.slice(fsVerifyIdx, fsVerifyIdx + 300) : ''
    const fsVerifyMatch  = RE_FS_VERIFY.exec(fsVerifyWindow)

    const nfsIdx    = text.indexOf('NFS Status')
    const nfsWindow = nfsIdx !== -1 ? text.slice(nfsIdx, nfsIdx + 300) : ''
    const nfsMatch  = RE_NFS.exec(nfsWindow)

    const cifsIdx    = text.indexOf('CIFS Status')
    const cifsWindow = cifsIdx !== -1 ? text.slice(cifsIdx, cifsIdx + 200) : ''
    const cifsMatch  = RE_CIFS.exec(cifsWindow)

    return {
      value: {
        availability_since,
        system_avail_pct:        sysAvailMatch     ? safeInt(sysAvailMatch[1])     : null,
        system_avail_excl_pct:   sysAvailExclMatch ? safeInt(sysAvailExclMatch[1]) : null,
        filesystem_avail_pct:    fsAvailMatch      ? safeInt(fsAvailMatch[1])      : null,
        filesystem_avail_excl_pct: fsAvailExclMatch ? safeInt(fsAvailExclMatch[1]) : null,
        memory_total_mib:    memTotalMatch    ? safeInt(memTotalMatch[1])    : null,
        memory_free_mib:     memFreeMatch     ? safeInt(memFreeMatch[1])     : null,
        memory_inactive_mib: memInactiveMatch ? safeInt(memInactiveMatch[1]) : null,
        swap_total_mib:      swapTotalMatch   ? safeInt(swapTotalMatch[1])   : null,
        swap_free_mib:       swapFreeMatch    ? safeInt(swapFreeMatch[1])    : null,
        filesystem_verify_status: fsVerifyMatch
          ? fsVerifyMatch[1].trim().replace(/\.$/, '')
          : null,
        nfs_status: nfsMatch
          ? nfsMatch[1].trim().replace(/\.$/, '').split(/\s+and\s+/)[0]
          : null,
        cifs_status: cifsMatch ? cifsMatch[1].trim().replace(/\.$/, '') : null,
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
