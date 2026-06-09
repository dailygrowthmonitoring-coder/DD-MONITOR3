import { getAdminClient } from '../admin'
import type { DDDeviceRow, DDDeviceInsert, DDDeviceUpdate } from '../types'

const COLS = 'id, hostname, model, serial_number, location, is_active, created_at' as const

export async function querySelectActiveDevices(): Promise<DDDeviceRow[]> {
  const { data, error } = await getAdminClient()
    .from('dd_devices')
    .select(COLS)
    .eq('is_active', true)
    .order('hostname')
  if (error) throw new Error(`querySelectActiveDevices: ${error.message}`)
  return data
}

export async function querySelectDeviceByHostname(hostname: string): Promise<DDDeviceRow | null> {
  const { data, error } = await getAdminClient()
    .from('dd_devices')
    .select(COLS)
    .eq('hostname', hostname)
    .maybeSingle()
  if (error) throw new Error(`querySelectDeviceByHostname: ${error.message}`)
  return data
}

export async function queryInsertDevice(insert: DDDeviceInsert): Promise<DDDeviceRow> {
  const { data, error } = await getAdminClient()
    .from('dd_devices')
    .insert(insert)
    .select(COLS)
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
