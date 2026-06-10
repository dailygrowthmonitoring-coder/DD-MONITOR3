import { getAdminClient } from '../admin'
import type { DDReportInsert, DDReportListRow, DDReportDetailRow } from '../types'

const LIST_COLS   = 'id, device_id, report_date, ingested_at, is_valid, parse_errors' as const
const DETAIL_COLS = 'id, device_id, report_date, generated_on, timezone, uptime_days, ingested_at, is_valid, parse_errors' as const

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

  const seen   = new Set<string>()
  const result: { device_id: string; report_date: string; is_valid: boolean }[] = []
  for (const row of data ?? []) {
    if (!seen.has(row.device_id)) {
      seen.add(row.device_id)
      result.push(row)
    }
  }
  return result
}

// ── Compare — base report rows enriched with storage/compression/alerts ─────────

export interface CompareRow {
  id: string
  device_id: string
  report_date: string
  ingested_at: string
  is_valid: boolean
  storage_used_percent: number | null
  compression_factor: number | null
  active_alerts: number
}

export async function querySelectReportsForComparison(
  deviceIds: string[],
  date: string
): Promise<CompareRow[]> {
  const { data: reports, error: rErr } = await getAdminClient()
    .from('dd_reports')
    .select(LIST_COLS)
    .in('device_id', deviceIds)
    .eq('report_date', date)
  if (rErr) throw new Error(`querySelectReportsForComparison: ${rErr.message}`)
  if (!reports || reports.length === 0) return []

  const reportIds = reports.map(r => r.id)

  const [{ data: storageData, error: sErr }, { data: comprData, error: cErr }, { data: alertData, error: aErr }] =
    await Promise.all([
      getAdminClient()
        .from('dd_storage')
        .select('report_id, used_percent')
        .in('report_id', reportIds),
      getAdminClient()
        .from('dd_compression')
        .select('report_id, cur_total_factor')
        .in('report_id', reportIds),
      getAdminClient()
        .from('dd_alerts')
        .select('report_id')
        .in('report_id', reportIds)
        .eq('is_active', true),
    ])
  if (sErr) throw new Error(`querySelectReportsForComparison storage: ${sErr.message}`)
  if (cErr) throw new Error(`querySelectReportsForComparison compression: ${cErr.message}`)
  if (aErr) throw new Error(`querySelectReportsForComparison alerts: ${aErr.message}`)

  const storageByReport = new Map((storageData ?? []).map(r => [r.report_id, r]))
  const comprByReport   = new Map((comprData ?? []).map(r => [r.report_id, r]))
  const alertsByReport  = new Map<string, number>()
  for (const a of alertData ?? []) {
    alertsByReport.set(a.report_id, (alertsByReport.get(a.report_id) ?? 0) + 1)
  }

  return reports.map(r => ({
    id:          r.id,
    device_id:   r.device_id,
    report_date: r.report_date,
    ingested_at: r.ingested_at,
    is_valid:    r.is_valid,
    storage_used_percent: storageByReport.get(r.id)?.used_percent ?? null,
    compression_factor:   comprByReport.get(r.id)?.cur_total_factor ?? null,
    active_alerts:        alertsByReport.get(r.id) ?? 0,
  }))
}

// ── Chart data (History page) — joins dd_storage and dd_compression ────────────

export interface HistoryChartRow {
  report_date: string
  storage_used_gib: number | null
  storage_used_percent: number | null
  compression_factor: number | null
  daily_write_gib: number | null
}

export async function querySelectReportChartData(
  deviceId: string,
  fromDate: string
): Promise<HistoryChartRow[]> {
  const { data: reports, error: rErr } = await getAdminClient()
    .from('dd_reports')
    .select('id, report_date')
    .eq('device_id', deviceId)
    .gte('report_date', fromDate)
    .eq('is_valid', true)
    .order('report_date', { ascending: true })
  if (rErr) throw new Error(`querySelectReportChartData reports: ${rErr.message}`)
  if (!reports || reports.length === 0) return []

  const reportIds = reports.map(r => r.id)

  const [{ data: storageData, error: sErr }, { data: comprData, error: cErr }] =
    await Promise.all([
      getAdminClient()
        .from('dd_storage')
        .select('report_id, used_gib, used_percent')
        .in('report_id', reportIds),
      getAdminClient()
        .from('dd_compression')
        .select('report_id, cur_total_factor, w24_pre_gib')
        .in('report_id', reportIds),
    ])
  if (sErr) throw new Error(`querySelectReportChartData storage: ${sErr.message}`)
  if (cErr) throw new Error(`querySelectReportChartData compression: ${cErr.message}`)

  const storageByReport = new Map(
    (storageData ?? []).map(r => [r.report_id, r])
  )
  const comprByReport = new Map(
    (comprData ?? []).map(r => [r.report_id, r])
  )

  return reports.map(r => {
    const s = storageByReport.get(r.id)
    const c = comprByReport.get(r.id)
    return {
      report_date:          r.report_date,
      storage_used_gib:     s?.used_gib ?? null,
      storage_used_percent: s?.used_percent ?? null,
      compression_factor:   c?.cur_total_factor ?? null,
      daily_write_gib:      c?.w24_pre_gib ?? null,
    }
  })
}

// ── Aggregate stats ───────────────────────────────────────────────────────────

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
