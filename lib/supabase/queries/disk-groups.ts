import { getAdminClient } from '../admin'
import type { DDDiskGroupInsert } from '../types'

export async function queryDeleteDiskGroupsByReportId(reportId: string): Promise<void> {
  const { error } = await getAdminClient()
    .from('dd_disk_groups')
    .delete()
    .eq('report_id', reportId)
  if (error) throw new Error(`queryDeleteDiskGroupsByReportId: ${error.message}`)
}

export async function queryInsertDiskGroups(inserts: DDDiskGroupInsert[]): Promise<void> {
  if (inserts.length === 0) return
  const { error } = await getAdminClient().from('dd_disk_groups').insert(inserts)
  if (error) throw new Error(`queryInsertDiskGroups: ${error.message}`)
}
