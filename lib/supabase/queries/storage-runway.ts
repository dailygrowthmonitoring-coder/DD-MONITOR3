import { getAdminClient } from '../admin'

export interface StorageHistoryRow {
  device_id: string
  report_date: string
  used_gib: number | null
  available_gib: number | null
}

const COLS = 'device_id, report_date, used_gib, available_gib' as const

export async function querySelectStorageHistory30d(): Promise<StorageHistoryRow[]> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)

  const { data, error } = await getAdminClient()
    .from('dd_storage')
    .select(COLS)
    .gte('report_date', cutoff.toISOString().slice(0, 10))
    .order('device_id')
    .order('report_date', { ascending: true })
  if (error) throw new Error(`querySelectStorageHistory30d: ${error.message}`)
  return (data ?? []) as StorageHistoryRow[]
}
