import {
  querySelectAlerts,
  queryInsertAlerts,
  queryDeleteAlertsByReportId,
  type AlertFilters,
} from '@/lib/supabase/queries/alerts'
import type { DDAlertRow, DDAlertInsert } from '@/lib/supabase/types'
import type { AlertEntry } from '@/types/dd-report'

export type { AlertFilters }

export interface PaginatedAlerts {
  data: DDAlertRow[]
  total: number
  limit: number
  offset: number
}

export async function getAlerts(filters: AlertFilters): Promise<PaginatedAlerts> {
  const { data, count } = await querySelectAlerts(filters)
  return {
    data,
    total: count,
    limit: filters.limit ?? 50,
    offset: filters.offset ?? 0,
  }
}

export async function replaceAlertsForReport(
  deviceId: string,
  reportId: string,
  alerts: AlertEntry[]
): Promise<void> {
  await queryDeleteAlertsByReportId(reportId)
  if (alerts.length === 0) return

  const inserts: DDAlertInsert[] = alerts.map(a => ({
    device_id: deviceId,
    report_id: reportId,
    alert_id: a.id,
    severity: a.severity,
    class: a.class ?? null,
    object: a.object ?? null,
    message: a.message,
    post_time: a.post_time,
    is_active: a.is_active,
  }))

  await queryInsertAlerts(inserts)
}
