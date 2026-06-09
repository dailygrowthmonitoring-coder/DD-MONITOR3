import type { ReplicationData } from '../../../types/dd-report'
import type { SectionResult } from '../types'

// Matches the "not configured" message
const RE_NOT_CONFIGURED = /This restorer is not configured for replication/

export function parseReplication(text: string): SectionResult<ReplicationData> {
  try {
    const sectionIdx = text.indexOf('Replication Status')
    if (sectionIdx === -1) {
      return { value: null, error: 'Replication Status section not found' }
    }

    const window = text.slice(sectionIdx, sectionIdx + 1000)

    if (RE_NOT_CONFIGURED.test(window)) {
      return {
        value: {
          configured: false,
          status: 'This restorer is not configured for replication.',
        },
        error: null,
      }
    }

    // Replication IS configured — extract basic status line
    // Look for any non-empty status line after the header
    const lines = window.split('\n')
    const statusLines: string[] = []
    let pastHeader = false

    for (const line of lines) {
      if (line.includes('Replication Status')) {
        pastHeader = true
        continue
      }
      if (pastHeader && line.trim() && !line.startsWith('-')) {
        statusLines.push(line.trim())
        if (statusLines.length >= 3) break
      }
    }

    return {
      value: {
        configured: true,
        status: statusLines.join(' ').trim() || 'Replication configured',
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
