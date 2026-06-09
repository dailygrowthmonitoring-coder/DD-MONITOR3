import { getAdminClient } from '../admin'
import type {
  DDReportInsert,
  DDReportListRow,
  DDReportDetailRow,
  Json,
} from '../types'

const LIST_COLS =
  'id, device_id, report_date, ingested_at, is_valid, parse_errors' as const
const DETAIL_COLS =
  'id, device_id, report_date, parsed_data, ingested_at, is_valid, parse_errors' as const

export async function querySelectReportsByDevice(
  deviceId: string,
  from: number,
  to: number
): Promise<{ data: DDReportListRow[]; count: number }> {
  const { data, error, count } = await getAdminClient()
    .from('dd_reports')
    .select(LIST_COLS, { count: 'exact' })
    .eq('device_id', deviceId)
    .order('report_date', { ascending: false })
    .range(from, to)
  if (error) throw new Error(`querySelectReportsByDevice: ${error.message}`)
  return { data: (data ?? []) as DDReportListRow[], count: count ?? 0 }
}

export async function querySelectReportByDeviceAndDate(
  deviceId: string,
  date: string
): Promise<DDReportDetailRow | null> {
  const { data, error } = await getAdminClient()
    .from('dd_reports')
    .select(DETAIL_COLS)
    .eq('device_id', deviceId)
    .eq('report_date', date)
    .maybeSingle()
  if (error) throw new Error(`querySelectReportByDeviceAndDate: ${error.message}`)
  return data as DDReportDetailRow | null
}

export async function querySelectReportsByDevicesAndDate(
  deviceIds: string[],
  date: string
): Promise<DDReportDetailRow[]> {
  const { data, error } = await getAdminClient()
    .from('dd_reports')
    .select(DETAIL_COLS)
    .in('device_id', deviceIds)
    .eq('report_date', date)
  if (error) throw new Error(`querySelectReportsByDevicesAndDate: ${error.message}`)
  return (data ?? []) as DDReportDetailRow[]
}

export async function queryUpsertReport(insert: DDReportInsert): Promise<DDReportListRow> {
  const { data, error } = await getAdminClient()
    .from('dd_reports')
    .upsert(insert, { onConflict: 'device_id,report_date' })
    .select(LIST_COLS)
    .single()
  if (error) throw new Error(`queryUpsertReport: ${error.message}`)
  return data as DDReportListRow
}

export async function querySelectLatestReportDatePerDevice(): Promise<
  { device_id: string; report_date: string; is_valid: boolean }[]
> {
  const { data, error } = await getAdminClient()
    .from('dd_reports')
    .select('device_id, report_date, is_valid')
    .order('report_date', { ascending: false })
  if (error) throw new Error(`querySelectLatestReportDatePerDevice: ${error.message}`)

  const seen = new Set<string>()
  const result: { device_id: string; report_date: string; is_valid: boolean }[] = []
  for (const row of data ?? []) {
    if (!seen.has(row.device_id)) {
      seen.add(row.device_id)
      result.push(row)
    }
  }
  return result
}

// ── Chart data (History page) ─────────────────────────────────────────────────

export interface ReportChartRow {
  report_date: string
  parsed_data: Json
}

export async function querySelectReportChartData(
  deviceId: string,
  fromDate: string
): Promise<ReportChartRow[]> {
  const { data, error } = await getAdminClient()
    .from('dd_reports')
    .select('report_date, parsed_data')
    .eq('device_id', deviceId)
    .gte('report_date', fromDate)
    .eq('is_valid', true)
    .order('report_date', { ascending: true })
  if (error) throw new Error(`querySelectReportChartData: ${error.message}`)
  return (data ?? []) as ReportChartRow[]
}

// ── Aggregate stats (System Health page) ─────────────────────────────────────

export async function queryCountReports(): Promise<number> {
  const { count, error } = await getAdminClient()
    .from('dd_reports')
    .select('id', { count: 'exact', head: true })
  if (error) throw new Error(`queryCountReports: ${error.message}`)
  return count ?? 0
}

export async function querySelectReportDateRange(): Promise<{
  oldest: string | null
  newest: string | null
}> {
  const [oldestRes, newestRes] = await Promise.all([
    getAdminClient()
      .from('dd_reports')
      .select('report_date')
      .order('report_date', { ascending: true })
      .limit(1)
      .maybeSingle(),
    getAdminClient()
      .from('dd_reports')
      .select('report_date')
      .order('report_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  if (oldestRes.error) throw new Error(`querySelectReportDateRange: ${oldestRes.error.message}`)
  if (newestRes.error) throw new Error(`querySelectReportDateRange: ${newestRes.error.message}`)
  return {
    oldest: oldestRes.data?.report_date ?? null,
    newest: newestRes.data?.report_date ?? null,
  }
}
