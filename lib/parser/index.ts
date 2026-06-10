import type { DDReport } from '../../types/dd-report'
import type { ParseResult } from './types'
import { parseGeneralInfo }   from './sections/general-info'
import { parseStorage }       from './sections/storage'
import { parseCompression }   from './sections/compression'
import { parseMtrees }        from './sections/mtrees'
import { parseDiskGroups }    from './sections/disk-groups'
import { parsePerformance }   from './sections/performance'
import { parseBackupSummary } from './sections/backup-summary'
import { parseAlerts }        from './sections/alerts'
import { parseNetwork }       from './sections/network'
import { parseSystemHealth }  from './sections/system-health'
import { parseReplication }   from './sections/replication'

export function parseReport(rawText: string): ParseResult {
  const parse_errors: string[] = []

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
    hw_revision: null,
    location: null,
    uptime_days: null,
    data_encryption_enabled: false,
    ha_enabled: false,
  }

  const storageResult = parseStorage(rawText)
  if (storageResult.error) parse_errors.push(`storage: ${storageResult.error}`)

  const compressionResult = parseCompression(rawText)
  if (compressionResult.error) parse_errors.push(`compression: ${compressionResult.error}`)

  const mtreesResult = parseMtrees(rawText)
  if (mtreesResult.error) parse_errors.push(`mtrees: ${mtreesResult.error}`)

  const diskGroupsResult = parseDiskGroups(rawText)
  if (diskGroupsResult.error) parse_errors.push(`disk_groups: ${diskGroupsResult.error}`)

  const performanceResult = parsePerformance(rawText)
  if (performanceResult.error) parse_errors.push(`performance: ${performanceResult.error}`)

  const backupResult = parseBackupSummary(rawText)
  // backup_summary is optional — not a fatal error if missing

  const alertsResult = parseAlerts(rawText)
  if (alertsResult.error) parse_errors.push(`alerts: ${alertsResult.error}`)

  const networkResult = parseNetwork(rawText)
  if (networkResult.error) parse_errors.push(`network: ${networkResult.error}`)

  const systemHealthResult = parseSystemHealth(rawText)
  if (systemHealthResult.error) parse_errors.push(`system_health: ${systemHealthResult.error}`)

  const replicationResult = parseReplication(rawText)
  if (replicationResult.error) parse_errors.push(`replication: ${replicationResult.error}`)

  const data: DDReport = {
    meta,
    storage:            storageResult.value,
    compression:        compressionResult.value,
    mtrees:             mtreesResult.value ?? [],
    disk_groups:        diskGroupsResult.value ?? [],
    performance_metrics: performanceResult.value ?? [],
    backup_summary:     backupResult.value,
    alerts:             alertsResult.value ?? { active_count: 0, active: [], history: [] },
    network:            networkResult.value ?? { ports: [] },
    system_health:      systemHealthResult.value,
    replication:        replicationResult.value,
  }

  return { data, parse_errors }
}
