import { getAdminClient } from '../admin'
import type { DDStorageRow, DDStorageInsert } from '../types'

const COLS = 'id, report_id, device_id, report_date, total_gib, used_gib, available_gib, used_percent, cleanable_gib, pre_comp_gib, last_cleaning_at, active_tier_size_tib, active_tier_max_tib, cache_tier_size_tib, total_disks, in_use_disks, spare_disks, not_installed_disks, cache_in_use_disks' as const

export async function queryUpsertStorage(insert: DDStorageInsert): Promise<void> {
  const { error } = await getAdminClient()
    .from('dd_storage')
    .upsert(insert, { onConflict: 'device_id,report_date' })
  if (error) throw new Error(`queryUpsertStorage: ${error.message}`)
}

export async function querySelectStorageByReportId(reportId: string): Promise<DDStorageRow | null> {
  const { data, error } = await getAdminClient()
    .from('dd_storage')
    .select(COLS)
    .eq('report_id', reportId)
    .maybeSingle()
  if (error) throw new Error(`querySelectStorageByReportId: ${error.message}`)
  return data
}
