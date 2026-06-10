import { getAdminClient } from '../admin'
import type { DDAlertRow, DDAlertInsert } from '../types'

const COLS = 'id, device_id, report_id, report_date, alert_id, severity, class, object, message, post_time, clear_time, is_active, status, created_at' as const

export interface AlertFilters {
  device_id?: string
  severity?: string
  is_active?: boolean
  from?: string
  to?: string
  limit?: number
  offset?: number
}

export async function querySelectAlerts(
  filters: AlertFilters
): Promise<{ data: DDAlertRow[]; count: number }> {
  let query = getAdminClient()
    .from('dd_alerts')
    .select(COLS, { count: 'exact' })
    .order('post_time', { ascending: false })

  if (filters.device_id) query = query.eq('device_id', filters.device_id)
  if (filters.severity) query = query.eq('severity', filters.severity)
  if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active)
  if (filters.from) query = query.gte('post_time', filters.from)
  if (filters.to) query = query.lte('post_time', filters.to)

  const limit = filters.limit ?? 50
  const offset = filters.offset ?? 0
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query
  if (error) throw new Error(`querySelectAlerts: ${error.message}`)
  return { data: (data ?? []) as DDAlertRow[], count: count ?? 0 }
}

export async function queryInsertAlerts(inserts: DDAlertInsert[]): Promise<void> {
  if (inserts.length === 0) return
  const { error } = await getAdminClient().from('dd_alerts').insert(inserts)
  if (error) throw new Error(`queryInsertAlerts: ${error.message}`)
}

export async function queryDeleteAlertsByReportId(reportId: string): Promise<void> {
  const { error } = await getAdminClient()
    .from('dd_alerts')
    .delete()
    .eq('report_id', reportId)
  if (error) throw new Error(`queryDeleteAlertsByReportId: ${error.message}`)
}

export async function querySelectActiveAlertsSummary(): Promise<
  Array<{ device_id: string; severity: string }>
> {
  const { data, error } = await getAdminClient()
    .from('dd_alerts')
    .select('device_id, severity')
    .eq('is_active', true)
  if (error) throw new Error(`querySelectActiveAlertsSummary: ${error.message}`)
  return (data ?? []) as Array<{ device_id: string; severity: string }>
}

export async function querySelectAlertsByReportId(
  reportId: string
): Promise<DDAlertRow[]> {
  const { data, error } = await getAdminClient()
    .from('dd_alerts')
    .select(COLS)
    .eq('report_id', reportId)
    .order('post_time', { ascending: false })
  if (error) throw new Error(`querySelectAlertsByReportId: ${error.message}`)
  return (data ?? []) as DDAlertRow[]
}

export async function queryCountAlerts(): Promise<number> {
  const { count, error } = await getAdminClient()
    .from('dd_alerts')
    .select('id', { count: 'exact', head: true })
  if (error) throw new Error(`queryCountAlerts: ${error.message}`)
  return count ?? 0
}
