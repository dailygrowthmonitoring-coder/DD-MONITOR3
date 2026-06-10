import {
  querySelectDeviceOverview,
  querySelectActiveDevices,
  querySelectDeviceByHostname,
  queryInsertDevice,
  queryUpdateDevice,
} from '@/lib/supabase/queries/devices'
import { querySelectLatestReportDatePerDevice } from '@/lib/supabase/queries/reports'
import type { DDDeviceRow, DDDeviceInsert, DDDeviceUpdate } from '@/lib/supabase/types'
import type { DeviceOverviewItem, DeviceStatus } from '@/types/dashboard'

export async function getDevicesOverview(): Promise<DeviceOverviewItem[]> {
  const rows = await querySelectDeviceOverview()
  return rows.map(r => ({
    id: r.id,
    hostname: r.hostname,
    model: r.model,
    serial_number: null,
    location: r.location,
    is_active: r.is_active,
    created_at: new Date().toISOString(),
    latest_report_date:  r.last_report_date,
    latest_report_valid: r.last_report_date !== null,
    storage_used_percent: r.storage_used_pct,
    compression_ratio:
      r.compression_ratio !== null ? `${r.compression_ratio}x` : null,
    active_alerts_critical: r.critical_alerts,
    active_alerts_warning:  r.warning_alerts,
    device_status: (r.device_status ?? 'unknown') as DeviceStatus,
    jobs_ok:     r.jobs_ok,
    jobs_failed: r.jobs_failed,
  }))
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
      latest_report_date:  latest?.report_date ?? null,
      latest_report_valid: latest?.is_valid ?? null,
    }
  })
}

export interface FindOrCreateDeviceParams {
  hostname: string
  model?: string
  serial_number?: string
  chassis_serial?: string
  os_version?: string
  hw_revision?: string
  location?: string
  data_encryption_enabled?: boolean
  ha_enabled?: boolean
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
    if (params.chassis_serial && params.chassis_serial !== existing.chassis_serial)
      update.chassis_serial = params.chassis_serial
    if (params.os_version && params.os_version !== existing.os_version)
      update.os_version = params.os_version
    if (params.hw_revision && params.hw_revision !== existing.hw_revision)
      update.hw_revision = params.hw_revision
    if (params.location && params.location !== existing.location)
      update.location = params.location
    if (
      params.data_encryption_enabled !== undefined &&
      params.data_encryption_enabled !== existing.data_encryption_enabled
    ) update.data_encryption_enabled = params.data_encryption_enabled
    if (
      params.ha_enabled !== undefined &&
      params.ha_enabled !== existing.ha_enabled
    ) update.ha_enabled = params.ha_enabled

    if (Object.keys(update).length > 0) {
      await queryUpdateDevice(existing.id, update)
      return { ...existing, ...update }
    }
    return existing
  }

  const insert: DDDeviceInsert = {
    hostname:                 params.hostname,
    model:                    params.model ?? null,
    serial_number:            params.serial_number ?? null,
    chassis_serial:           params.chassis_serial ?? null,
    os_version:               params.os_version ?? null,
    hw_revision:              params.hw_revision ?? null,
    location:                 params.location ?? null,
    data_encryption_enabled:  params.data_encryption_enabled ?? false,
    ha_enabled:               params.ha_enabled ?? false,
  }
  return queryInsertDevice(insert)
}
