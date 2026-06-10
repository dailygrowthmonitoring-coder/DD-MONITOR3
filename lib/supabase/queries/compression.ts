import { getAdminClient } from '../admin'
import type { DDCompressionRow, DDCompressionInsert } from '../types'

const COLS = 'id, report_id, device_id, report_date, period_from, period_to, cur_pre_comp_gib, cur_post_comp_gib, cur_total_factor, cur_reduction_pct, w7_pre_gib, w7_post_gib, w7_global_factor, w7_local_factor, w7_total_factor, w7_reduction_pct, w24_pre_gib, w24_post_gib, w24_global_factor, w24_local_factor, w24_total_factor, w24_reduction_pct' as const

export async function queryUpsertCompression(insert: DDCompressionInsert): Promise<void> {
  const { error } = await getAdminClient()
    .from('dd_compression')
    .upsert(insert, { onConflict: 'device_id,report_date' })
  if (error) throw new Error(`queryUpsertCompression: ${error.message}`)
}

export async function querySelectCompressionByReportId(reportId: string): Promise<DDCompressionRow | null> {
  const { data, error } = await getAdminClient()
    .from('dd_compression')
    .select(COLS)
    .eq('report_id', reportId)
    .maybeSingle()
  if (error) throw new Error(`querySelectCompressionByReportId: ${error.message}`)
  return data
}
