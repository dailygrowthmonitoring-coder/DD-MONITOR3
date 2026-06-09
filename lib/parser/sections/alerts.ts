import type { AlertEntry, AlertHistoryEntry, AlertsData } from '../../../types/dd-report'
import type { SectionResult } from '../types'
import { parseDDAlertDate } from '../utils/date-helpers'

// Alert table row — delimited by 3+ spaces between columns
// Format: "p0-273   Mon Mar 10 04:38:22 2025   CRITICAL   Network   Interface Index=20   EVT-NETM-..."
// We use a split on "   " (3 spaces) to handle variable-width columns
const RE_ALERT_COUNT = /There (?:is|are)\s+(\d+)\s+active alert/

// History-specific count
const RE_HISTORY_COUNT = /There (?:is|are)\s+(\d+)\s+historic alert/

const VALID_SEVERITIES = new Set(['CRITICAL', 'WARNING', 'INFO'])

function parseSeverity(val: string): 'CRITICAL' | 'WARNING' | 'INFO' {
  const upper = val.toUpperCase().trim()
  if (VALID_SEVERITIES.has(upper)) return upper as 'CRITICAL' | 'WARNING' | 'INFO'
  return 'INFO'
}

function parseAlertRow(line: string): AlertEntry | null {
  // Split on 3+ spaces to handle fixed-width columns
  const cols = line.split(/\s{3,}/).map(s => s.trim()).filter(Boolean)
  // Expected: [id, post_time, severity, class, object, message]
  if (cols.length < 6) return null

  const id = cols[0]
  if (!id.match(/^[a-z]\d+-\d+$/)) return null

  const post_time_raw = cols[1]
  const post_time = parseDDAlertDate(post_time_raw)
  if (!post_time) return null

  const severity = parseSeverity(cols[2])
  const alertClass = cols[3]
  const object = cols[4]
  const message = cols.slice(5).join('   ').trim()

  return { id, post_time, severity, class: alertClass, object, message, is_active: true }
}

function parseHistoryRow(line: string): AlertHistoryEntry | null {
  // Format: "p0-273   Mon Mar 10 04:38:22 2025   (active)   CRITICAL   Network   Interface Index=20   EVT..."
  const cols = line.split(/\s{3,}/).map(s => s.trim()).filter(Boolean)
  if (cols.length < 7) return null

  const id = cols[0]
  if (!id.match(/^[a-z]\d+-\d+$/)) return null

  const post_time_raw = cols[1]
  const post_time = parseDDAlertDate(post_time_raw)
  if (!post_time) return null

  const clearRaw = cols[2]
  const is_active_entry = clearRaw.toLowerCase().includes('active')
  const clear_time = is_active_entry ? null : (parseDDAlertDate(clearRaw) ?? null)
  const status: 'active' | 'cleared' = is_active_entry ? 'active' : 'cleared'

  const severity = parseSeverity(cols[3])
  const alertClass = cols[4]
  const object = cols[5]
  const message = cols.slice(6).join('   ').trim()

  return { id, post_time, clear_time, severity, class: alertClass, object, message, status }
}

function extractSection(text: string, header: string, stopBefore?: string): string {
  const idx = text.indexOf(header)
  if (idx === -1) return ''
  const after = text.slice(idx)
  // Stop before a known next section header if provided
  if (stopBefore) {
    const stopIdx = after.indexOf(stopBefore)
    if (stopIdx > 0) return after.slice(0, stopIdx)
  }
  const endIdx = after.search(/\n\n\n/)
  return endIdx > 0 ? after.slice(0, endIdx) : after.slice(0, 3000)
}

export function parseAlerts(text: string): SectionResult<AlertsData> {
  try {
    // Stop "Current Alerts" window before "Alerts History" to avoid cross-contamination
    const currentSection = extractSection(text, 'Current Alerts', 'Alerts History')
    const historySection = extractSection(text, 'Alerts History', 'Recent Alerts')

    const countMatch = RE_ALERT_COUNT.exec(currentSection)
    const active_count = countMatch ? parseInt(countMatch[1], 10) : 0

    const active: AlertEntry[] = []
    if (active_count > 0) {
      const lines = currentSection.split('\n')
      for (const line of lines) {
        if (!line.trim() || line.startsWith('-') || line.startsWith('Id') || line.startsWith('There')) continue
        const entry = parseAlertRow(line)
        if (entry) active.push(entry)
      }
    }

    const history: AlertHistoryEntry[] = []
    if (historySection) {
      const lines = historySection.split('\n')
      for (const line of lines) {
        if (!line.trim() || line.startsWith('-') || line.startsWith('Id') || line.startsWith('There')) continue
        const entry = parseHistoryRow(line)
        if (entry) history.push(entry)
      }
    }

    return {
      value: { active_count, active, history },
      error: null,
    }
  } catch (err) {
    return {
      value: { active_count: 0, active: [], history: [] },
      error: `alerts parse failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}
