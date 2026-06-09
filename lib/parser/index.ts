import type { DDReport } from '../../types/dd-report'
import type { ParseResult } from './types'
import { parseGeneralInfo } from './sections/general-info'
import { parseStorage } from './sections/storage'
import { parseCompression } from './sections/compression'
import { parseMtrees } from './sections/mtrees'
import { parseDisks } from './sections/disks'
import { parseAlerts } from './sections/alerts'
import { parseNetwork } from './sections/network'
import { parseSystemHealth } from './sections/system-health'
import { parseReplication } from './sections/replication'

export function parseReport(rawText: string): ParseResult {
  const parse_errors: string[] = []

  // --- meta ---
  const metaResult = parseGeneralInfo(rawText)
  if (metaResult.error || !metaResult.value) {
    parse_errors.push(`meta: ${metaResult.error ?? 'unknown error'}`)
  }

  const meta = metaResult.value ?? {
    generated_on: new Date().toISOString(),
    timezone: 'UTC',
    hostname: 'unknown',
    model: null,
    serial_number: null,
    chassis_serial: null,
    os_version: null,
    location: null,
    uptime_days: null,
    data_encryption_enabled: false,
    ha_enabled: false,
  }

  // --- storage ---
  const storageResult = parseStorage(rawText)
  if (storageResult.error) {
    parse_errors.push(`storage: ${storageResult.error}`)
  }

  // --- compression ---
  const compressionResult = parseCompression(rawText)
  if (compressionResult.error) {
    parse_errors.push(`compression: ${compressionResult.error}`)
  }

  // --- mtrees ---
  const mtreesResult = parseMtrees(rawText)
  if (mtreesResult.error) {
    parse_errors.push(`mtrees: ${mtreesResult.error}`)
  }

  // --- disks ---
  const disksResult = parseDisks(rawText)
  if (disksResult.error) {
    parse_errors.push(`disks: ${disksResult.error}`)
  }

  // --- alerts ---
  const alertsResult = parseAlerts(rawText)
  if (alertsResult.error) {
    parse_errors.push(`alerts: ${alertsResult.error}`)
  }

  // --- network ---
  const networkResult = parseNetwork(rawText)
  if (networkResult.error) {
    parse_errors.push(`network: ${networkResult.error}`)
  }

  // --- system health ---
  const systemHealthResult = parseSystemHealth(rawText)
  if (systemHealthResult.error) {
    parse_errors.push(`system_health: ${systemHealthResult.error}`)
  }

  // --- replication ---
  const replicationResult = parseReplication(rawText)
  if (replicationResult.error) {
    parse_errors.push(`replication: ${replicationResult.error}`)
  }

  const data: DDReport = {
    meta,
    storage: storageResult.value,
    compression: compressionResult.value,
    mtrees: mtreesResult.value ?? [],
    disks: disksResult.value,
    alerts: alertsResult.value ?? { active_count: 0, active: [], history: [] },
    network: networkResult.value ?? { ports: [] },
    system_health: systemHealthResult.value,
    replication: replicationResult.value,
  }

  return { data, parse_errors }
}
