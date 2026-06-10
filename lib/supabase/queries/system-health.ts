import { getAdminClient } from '../admin'
import type { DDSystemHealthRow, DDSystemHealthInsert } from '../types'

const COLS = 'id, report_id, device_id, report_date, availability_since, system_avail_pct, system_avail_excl_pct, filesystem_avail_pct, filesystem_avail_excl_pct, memory_total_mib, memory_free_mib, memory_inactive_mib, swap_total_mib, swap_free_mib, nfs_status, cifs_status, filesystem_verify_status' as const

export async function queryUpsertSystemHealth(insert: DDSystemHealthInsert): Promise<void> {
  const { error } = await getAdminClient()
    .from('dd_system_health')
    .upsert(insert, { onConflict: 'device_id,report_date' })
  if (error) throw new Error(`queryUpsertSystemHealth: ${error.message}`)
}

export async function querySelectSystemHealthByReportId(reportId: string): Promise<DDSystemHealthRow | null> {
  const { data, error } = await getAdminClient()
    .from('dd_system_health')
    .select(COLS)
    .eq('report_id', reportId)
    .maybeSingle()
  if (error) throw new Error(`querySelectSystemHealthByReportId: ${error.message}`)
  return data
}
