import {
  querySelectActiveDevices,
  querySelectDeviceByHostname,
  queryInsertDevice,
  queryUpdateDevice,
} from '@/lib/supabase/queries/devices'
import {
  querySelectLatestReportDatePerDevice,
  querySelectReportByDeviceAndDate,
} from '@/lib/supabase/queries/reports'
import { querySelectActiveAlertsSummary } from '@/lib/supabase/queries/alerts'
import type { DDDeviceRow, DDDeviceInsert, DDDeviceUpdate } from '@/lib/supabase/types'
import type { DDReport } from '@/types/dd-report'
import type { DeviceOverviewItem, DeviceStatus } from '@/types/dashboard'
import {
  STORAGE_WARNING_THRESHOLD,
  STORAGE_CRITICAL_THRESHOLD,
} from '@/lib/constants/ui'

function computeDeviceStatus(
  hasReport: boolean,
  storagePct: number | null,
  criticalAlerts: number,
  warningAlerts: number
): DeviceStatus {
  if (!hasReport) return 'unknown'
  if (
    criticalAlerts > 0 ||
    (storagePct !== null && storagePct >= STORAGE_CRITICAL_THRESHOLD)
  )
    return 'critical'
  if (
    warningAlerts > 0 ||
    (storagePct !== null && storagePct >= STORAGE_WARNING_THRESHOLD)
  )
    return 'warning'
  return 'healthy'
}

export async function getDevicesOverview(): Promise<DeviceOverviewItem[]> {
  const [devices, latestDates, activeAlerts] = await Promise.all([
    querySelectActiveDevices(),
    querySelectLatestReportDatePerDevice(),
    querySelectActiveAlertsSummary(),
  ])

  const latestByDevice = new Map(latestDates.map(r => [r.device_id, r]))

  const alertCounts = new Map<string, { critical: number; warning: number }>()
  for (const alert of activeAlerts) {
    const counts = alertCounts.get(alert.device_id) ?? { critical: 0, warning: 0 }
    if (alert.severity === 'CRITICAL') counts.critical++
    else if (alert.severity === 'WARNING') counts.warning++
    alertCounts.set(alert.device_id, counts)
  }

  const withDates = devices.map(d => ({
    device: d,
    latest: latestByDevice.get(d.id) ?? null,
  }))

  const reportPromises = withDates.map(({ device, latest }) =>
    latest
      ? querySelectReportByDeviceAndDate(device.id, latest.report_date)
      : Promise.resolve(null)
  )
  const reports = await Promise.all(reportPromises)

  return withDates.map(({ device, latest }, i) => {
    const report = reports[i]
    const parsedData = report?.parsed_data as unknown as DDReport | null
    const alerts = alertCounts.get(device.id) ?? { critical: 0, warning: 0 }
    const storagePct = parsedData?.storage?.used_percent ?? null
    const compressionRatio =
      parsedData?.compression?.currently_used?.total_factor ?? null

    return {
      id: device.id,
      hostname: device.hostname,
      model: device.model,
      serial_number: device.serial_number,
      location: device.location,
      is_active: device.is_active,
      created_at: device.created_at,
      latest_report_date: latest?.report_date ?? null,
      latest_report_valid: latest?.is_valid ?? null,
      storage_used_percent: storagePct,
      compression_ratio: compressionRatio,
      active_alerts_critical: alerts.critical,
      active_alerts_warning: alerts.warning,
      device_status: computeDeviceStatus(
        latest !== null,
        storagePct,
        alerts.critical,
        alerts.warning
      ),
    }
  })
}

export interface DeviceWithLatestReport extends DDDeviceRow {
  latest_report_date: string | null
  latest_report_valid: boolean | null
}

export async function getDevices(): Promise<DeviceWithLatestReport[]> {
  const [devices, latestReports] = await Promise.all([
    querySelectActiveDevices(),
    querySelectLatestReportDatePerDevice(),
  ])
  const latestByDevice = new Map(latestReports.map(r => [r.device_id, r]))
  return devices.map(d => {
    const latest = latestByDevice.get(d.id)
    return {
      ...d,
      latest_report_date: latest?.report_date ?? null,
      latest_report_valid: latest?.is_valid ?? null,
    }
  })
}

export interface FindOrCreateDeviceParams {
  hostname: string
  model?: string
  serial_number?: string
  location?: string
}

export async function findOrCreateDevice(
  params: FindOrCreateDeviceParams
): Promise<DDDeviceRow> {
  const existing = await querySelectDeviceByHostname(params.hostname)

  if (existing) {
    const update: DDDeviceUpdate = {}
    if (params.model && params.model !== existing.model) update.model = params.model
    if (params.serial_number && params.serial_number !== existing.serial_number)
      update.serial_number = params.serial_number
    if (params.location && params.location !== existing.location)
      update.location = params.location

    if (Object.keys(update).length > 0) {
      await queryUpdateDevice(existing.id, update)
      return { ...existing, ...update }
    }
    return existing
  }

  const insert: DDDeviceInsert = {
    hostname: params.hostname,
    model: params.model ?? null,
    serial_number: params.serial_number ?? null,
    location: params.location ?? null,
  }
  return queryInsertDevice(insert)
}
