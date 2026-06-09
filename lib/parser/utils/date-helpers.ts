const MONTH_MAP: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04',
  May: '05', Jun: '06', Jul: '07', Aug: '08',
  Sep: '09', Oct: '10', Nov: '11', Dec: '12',
}

// Converts "2025-03-10 06:48:06" or "2025-03-10T06:48:06" → "2025-03-10T06:48:06"
export function parseIsoDate(raw: string): string {
  const trimmed = raw.trim().replace(' ', 'T')
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    return trimmed.length === 16 ? `${trimmed}:00` : trimmed
  }
  return trimmed
}

// Converts "2025/03/04 08:25:28" → "2025-03-04T08:25:28"
export function parseSlashDate(raw: string): string {
  return raw.trim().replace(/\//g, '-').replace(' ', 'T')
}

// Converts "Mon Mar 10 04:38:22 2025" → "2025-03-10T04:38:22"
export function parseDDAlertDate(raw: string): string | null {
  // Format: DayOfWeek Mon DD HH:MM:SS YYYY
  const match = /(\w{3})\s+(\w{3})\s+(\d{1,2})\s+(\d{2}:\d{2}:\d{2})\s+(\d{4})/.exec(raw.trim())
  if (!match) return null
  const month = MONTH_MAP[match[2]]
  if (!month) return null
  const day = match[3].padStart(2, '0')
  return `${match[5]}-${month}-${day}T${match[4]}`
}

// Converts "May 21 03:00:00 AST 2020" → "2020-05-21T03:00:00"
export function parseAvailabilitySinceDate(raw: string): string | null {
  const match = /(\w{3})\s+(\d{1,2})\s+(\d{2}:\d{2}:\d{2})\s+\w+\s+(\d{4})/.exec(raw.trim())
  if (!match) return null
  const month = MONTH_MAP[match[1]]
  if (!month) return null
  const day = match[2].padStart(2, '0')
  return `${match[4]}-${month}-${day}T${match[3]}`
}

// Converts "2025-03-03 06:00" → "2025-03-03T06:00:00"
export function parseShortDateTime(raw: string): string {
  const trimmed = raw.trim()
  const withT = trimmed.replace(' ', 'T')
  return withT.length === 16 ? `${withT}:00` : withT
}
