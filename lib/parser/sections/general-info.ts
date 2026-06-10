import type { ReportMeta } from '../../../types/dd-report'
import type { SectionResult } from '../types'
import { parseIsoDate } from '../utils/date-helpers'

// Matches: "GENERATED: 2025-03-10 06:48:06 AST"
const RE_GENERATED = /GENERATED:\s+(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s+(\w+)/

// Matches: "protocol.gui.ddem.inventory.1.host_name = DD6300BSR.iq.zain.com"
const RE_HOSTNAME = /protocol\.gui\.ddem\.inventory\.1\.host_name\s*=\s*(\S+)/

// Matches: "protocol.gui.ddem.inventory.1.model = DD6300"
const RE_MODEL = /protocol\.gui\.ddem\.inventory\.1\.model\s*=\s*(\S+)/

// Matches: "protocol.gui.ddem.inventory.1.os = 6.2.0.30-629757"
const RE_OS_VERSION = /protocol\.gui\.ddem\.inventory\.1\.os\s*=\s*(\S+)/

// Matches: " Product Serial        : CKM00193901494"
const RE_SERIAL = /Product Serial\s*:\s*(\S+)/

// Matches: " Chassis Serial : FCNCS190702089" (hardware config section)
const RE_CHASSIS_SERIAL = /Chassis Serial\s*:\s*(\S+)/

// Matches: "config.snmp.sys_location = Basra"
const RE_LOCATION = /config\.snmp\.sys_location\s*=\s*(.+)/

// Matches: "Server up time              1754 days, 16:03"
const RE_UPTIME = /Server up time\s+(\d+)\s+days/

// Matches: "Encryption enabled:  no" or "Encryption enabled:  yes"
const RE_ENCRYPTION = /Encryption enabled:\s*(\w+)/

// Matches: "ha.enabled = false" or "ha.enabled = true"
const RE_HA = /ha\.enabled\s*=\s*(\w+)/

// Maps 3-letter timezone abbreviations used in DD reports to IANA names
const TIMEZONE_MAP: Record<string, string> = {
  AST: 'Asia/Baghdad',
  UTC: 'UTC',
  GMT: 'GMT',
}

function parseUptimeDays(text: string): number | null {
  const match = RE_UPTIME.exec(text)
  if (!match) return null
  const days = parseInt(match[1], 10)
  return isNaN(days) ? null : days
}

function parseBoolean(value: string): boolean {
  return value.toLowerCase() === 'yes' || value.toLowerCase() === 'true'
}

export function parseGeneralInfo(text: string): SectionResult<ReportMeta> {
  try {
    const generatedMatch = RE_GENERATED.exec(text)
    if (!generatedMatch) {
      return { value: null, error: 'Could not find GENERATED timestamp in report' }
    }

    const rawTimestamp = generatedMatch[1]
    const tzAbbr = generatedMatch[2]
    const generated_on = parseIsoDate(rawTimestamp)
    const timezone = TIMEZONE_MAP[tzAbbr] ?? tzAbbr

    const hostnameMatch = RE_HOSTNAME.exec(text)
    const hostname = hostnameMatch ? hostnameMatch[1].trim() : ''

    if (!hostname) {
      return { value: null, error: 'Could not find hostname in report' }
    }

    const modelMatch = RE_MODEL.exec(text)
    const model = modelMatch ? modelMatch[1].trim() : null

    const osMatch = RE_OS_VERSION.exec(text)
    const os_version = osMatch ? `Data Domain OS ${osMatch[1].trim()}` : null

    const serialMatch = RE_SERIAL.exec(text)
    const serial_number = serialMatch ? serialMatch[1].trim() : null

    const chassisMatch = RE_CHASSIS_SERIAL.exec(text)
    const chassis_serial = chassisMatch ? chassisMatch[1].trim() : null

    const locationMatch = RE_LOCATION.exec(text)
    const location = locationMatch ? locationMatch[1].trim() : null

    const uptime_days = parseUptimeDays(text)

    const encryptionMatch = RE_ENCRYPTION.exec(text)
    const data_encryption_enabled = encryptionMatch
      ? parseBoolean(encryptionMatch[1])
      : false

    const haMatch = RE_HA.exec(text)
    const ha_enabled = haMatch ? parseBoolean(haMatch[1]) : false

    return {
      value: {
        generated_on,
        timezone,
        hostname,
        model,
        serial_number,
        chassis_serial,
        os_version,
        hw_revision: null,
        location,
        uptime_days,
        data_encryption_enabled,
        ha_enabled,
      },
      error: null,
    }
  } catch (err) {
    return {
      value: null,
      error: `general-info parse failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}
