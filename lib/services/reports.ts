import { format, subDays } from 'date-fns'
import {
  querySelectReportsByDevice,
  querySelectReportByDeviceAndDate,
  querySelectReportsByDevicesAndDate,
  queryUpsertReport,
  querySelectReportChartData,
} from '@/lib/supabase/queries/reports'
import type {
  DDReportInsert,
  DDReportListRow,
  DDReportDetailRow,
} from '@/lib/supabase/types'
import type { DDReport } from '@/types/dd-report'
import type { HistoryChartPoint } from '@/types/dashboard'

const MAX_PAGE_SIZE = 100

export interface PaginatedReports {
  data: DDReportListRow[]
  total: number
  page: number
  limit: number
}

export async function getReportsByDevice(
  deviceId: string,
  page: number,
  limit: number
): Promise<PaginatedReports> {
  const safeLimit = Math.min(limit, MAX_PAGE_SIZE)
  const from = (page - 1) * safeLimit
  const to = from + safeLimit - 1
  const { data, count } = await querySelectReportsByDevice(deviceId, from, to)
  return { data, total: count, page, limit: safeLimit }
}

export async function getReportByDeviceAndDate(
  deviceId: string,
  date: string
): Promise<DDReportDetailRow | null> {
  return querySelectReportByDeviceAndDate(deviceId, date)
}

export async function getReportsForComparison(
  deviceIds: string[],
  date: string
): Promise<DDReportDetailRow[]> {
  return querySelectReportsByDevicesAndDate(deviceIds, date)
}

export async function upsertReport(insert: DDReportInsert): Promise<DDReportListRow> {
  return queryUpsertReport(insert)
}

// ── History chart data ────────────────────────────────────────────────────────

function parseCompressionFactor(factor: string | null | undefined): number | null {
  if (!factor) return null
  const num = parseFloat(factor) // parseFloat stops at 'x': "22.4x" → 22.4
  return isNaN(num) ? null : num
}

export async function getDeviceHistoryData(
  deviceId: string,
  rangeDays: number
): Promise<HistoryChartPoint[]> {
  const fromDate = format(subDays(new Date(), rangeDays), 'yyyy-MM-dd')
  const rows = await querySelectReportChartData(deviceId, fromDate)

  return rows.map(row => {
    const parsed = row.parsed_data as unknown as DDReport
    return {
      date: row.report_date,
      storage_used_gib:     parsed.storage?.used_gib ?? null,
      storage_used_percent: parsed.storage?.used_percent ?? null,
      compression_factor:   parseCompressionFactor(
        parsed.compression?.currently_used?.total_factor
      ),
      daily_write_gib: parsed.compression?.last_24_hours?.pre_comp_gib ?? null,
    }
  })
}
