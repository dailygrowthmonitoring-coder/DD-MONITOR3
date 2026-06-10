import type { ReplicationData } from '../../../types/dd-report'
import type { SectionResult } from '../types'

const RE_NOT_CONFIGURED = /This restorer is not configured for replication/

// "Destination: dd6300abc.example.com"
const RE_DESTINATION    = /Destination:\s+(\S+)/
// "Status: Replication: Running"
const RE_STATUS         = /Status:\s+(.+)/
// "Lag Time: 00:02:30"
const RE_LAG            = /Lag Time:\s+(\d+):(\d+):(\d+)/
// "Completion: 95%"
const RE_SYNC_PCT       = /Completion:\s+([\d.]+)%/
// "Network Throughput: 12.5 MB/s"
const RE_THROUGHPUT     = /Network Throughput:\s+([\d.]+)\s*MB\/s/
// "Last Sync: Mon Mar 10 08:00:00 2025"
const RE_LAST_SYNC      = /Last Sync:\s+(.+)/

function lagToSeconds(h: string, m: string, s: string): number {
  return parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseInt(s, 10)
}

export function parseReplication(text: string): SectionResult<ReplicationData> {
  try {
    const sectionIdx = text.indexOf('Replication Status')
    if (sectionIdx === -1) {
      return { value: null, error: 'Replication Status section not found' }
    }

    const window = text.slice(sectionIdx, sectionIdx + 1500)

    if (RE_NOT_CONFIGURED.test(window)) {
      return {
        value: {
          is_configured:   false,
          destination:     null,
          status:          'not configured',
          lag_seconds:     null,
          last_sync_at:    null,
          bytes_remaining: null,
          throughput_mbps: null,
          sync_percent:    null,
        },
        error: null,
      }
    }

    const destMatch      = RE_DESTINATION.exec(window)
    const statusMatch    = RE_STATUS.exec(window)
    const lagMatch       = RE_LAG.exec(window)
    const syncPctMatch   = RE_SYNC_PCT.exec(window)
    const throughputMatch = RE_THROUGHPUT.exec(window)
    const lastSyncMatch  = RE_LAST_SYNC.exec(window)

    return {
      value: {
        is_configured:   true,
        destination:     destMatch   ? destMatch[1].trim()   : null,
        status:          statusMatch ? statusMatch[1].trim() : 'configured',
        lag_seconds:     lagMatch ? lagToSeconds(lagMatch[1], lagMatch[2], lagMatch[3]) : null,
        last_sync_at:    lastSyncMatch ? lastSyncMatch[1].trim() : null,
        bytes_remaining: null,
        throughput_mbps: throughputMatch ? parseFloat(throughputMatch[1]) : null,
        sync_percent:    syncPctMatch ? parseFloat(syncPctMatch[1]) : null,
      },
      error: null,
    }
  } catch (err) {
    return {
      value: null,
      error: `replication parse failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}
