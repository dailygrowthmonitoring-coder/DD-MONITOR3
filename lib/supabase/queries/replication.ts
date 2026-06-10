import { getAdminClient } from '../admin'
import type { DDReplicationRow, DDReplicationInsert } from '../types'

const COLS = 'id, report_id, device_id, report_date, is_configured, destination, status, lag_seconds, last_sync_at, bytes_remaining, throughput_mbps, sync_percent' as const

export async function queryUpsertReplication(insert: DDReplicationInsert): Promise<void> {
  const { error } = await getAdminClient()
    .from('dd_replication')
    .upsert(insert, { onConflict: 'device_id,report_date' })
  if (error) throw new Error(`queryUpsertReplication: ${error.message}`)
}

export async function querySelectReplicationByReportId(reportId: string): Promise<DDReplicationRow | null> {
  const { data, error } = await getAdminClient()
    .from('dd_replication')
    .select(COLS)
    .eq('report_id', reportId)
    .maybeSingle()
  if (error) throw new Error(`querySelectReplicationByReportId: ${error.message}`)
  return data
}
