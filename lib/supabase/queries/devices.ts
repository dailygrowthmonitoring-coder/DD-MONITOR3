import { getAdminClient } from '../admin'
import type { DDDeviceRow, DDDeviceInsert, DDDeviceUpdate, DeviceOverviewRow } from '../types'

const DEVICE_COLS =
  'id, hostname, model, serial_number, chassis_serial, os_version, hw_revision, location, admin_email, data_encryption_enabled, ha_enabled, is_active, created_at, updated_at' as const

const OVERVIEW_COLS =
  'id, hostname, location, model, is_active, last_report_date, storage_used_pct, total_gib, used_gib, available_gib, compression_ratio, cur_reduction_pct, critical_alerts, warning_alerts, total_alerts, jobs_ok, jobs_failed, backup_success_pct, device_status' as const

export async function querySelectDeviceOverview(): Promise<DeviceOverviewRow[]> {
  const { data, error } = await getAdminClient()
    .from('v_device_overview')
    .select(OVERVIEW_COLS)
    .order('hostname')
  if (error) throw new Error(`querySelectDeviceOverview: ${error.message}`)
  return (data ?? []) as unknown as DeviceOverviewRow[]
}

export async function querySelectActiveDevices(): Promise<DDDeviceRow[]> {
  const { data, error } = await getAdminClient()
    .from('dd_devices')
    .select(DEVICE_COLS)
    .eq('is_active', true)
    .order('hostname')
  if (error) throw new Error(`querySelectActiveDevices: ${error.message}`)
  return data ?? []
}

export async function querySelectDeviceById(id: string): Promise<DDDeviceRow | null> {
  const { data, error } = await getAdminClient()
    .from('dd_devices')
    .select(DEVICE_COLS)
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`querySelectDeviceById: ${error.message}`)
  return data
}

export async function querySelectDeviceByHostname(hostname: string): Promise<DDDeviceRow | null> {
  const { data, error } = await getAdminClient()
    .from('dd_devices')
    .select(DEVICE_COLS)
    .eq('hostname', hostname)
    .maybeSingle()
  if (error) throw new Error(`querySelectDeviceByHostname: ${error.message}`)
  return data
}

export async function queryInsertDevice(insert: DDDeviceInsert): Promise<DDDeviceRow> {
  const { data, error } = await getAdminClient()
    .from('dd_devices')
    .insert(insert)
    .select(DEVICE_COLS)
    .single()
  if (error) throw new Error(`queryInsertDevice: ${error.message}`)
  return data
}

export async function queryUpdateDevice(id: string, update: DDDeviceUpdate): Promise<void> {
  const { error } = await getAdminClient()
    .from('dd_devices')
    .update(update)
    .eq('id', id)
  if (error) throw new Error(`queryUpdateDevice: ${error.message}`)
}
