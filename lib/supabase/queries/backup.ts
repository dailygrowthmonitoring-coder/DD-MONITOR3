import { getAdminClient } from '../admin'
import type { DDBackupSummaryInsert } from '../types'

export async function queryUpsertBackupSummary(insert: DDBackupSummaryInsert): Promise<void> {
  const { error } = await getAdminClient()
    .from('dd_backup_summary')
    .upsert(insert, { onConflict: 'device_id,report_date' })
  if (error) throw new Error(`queryUpsertBackupSummary: ${error.message}`)
}
