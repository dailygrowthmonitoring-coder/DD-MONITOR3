import { getAdminClient } from '../admin'
import type { DDMtreeRow, DDMtreeInsert } from '../types'

export async function queryDeleteMtreesByReportId(reportId: string): Promise<void> {
  const { error } = await getAdminClient()
    .from('dd_mtrees')
    .delete()
    .eq('report_id', reportId)
  if (error) throw new Error(`queryDeleteMtreesByReportId: ${error.message}`)
}

export async function queryInsertMtrees(inserts: DDMtreeInsert[]): Promise<void> {
  if (inserts.length === 0) return
  const { error } = await getAdminClient().from('dd_mtrees').insert(inserts)
  if (error) throw new Error(`queryInsertMtrees: ${error.message}`)
}

export async function querySelectMtreesByReportId(reportId: string): Promise<DDMtreeRow[]> {
  const { data, error } = await getAdminClient()
    .from('dd_mtrees')
    .select('id, report_id, device_id, report_date, name, mtree_id, status, pre_comp_gib, post_comp_gib')
    .eq('report_id', reportId)
    .order('name')
  if (error) throw new Error(`querySelectMtreesByReportId: ${error.message}`)
  return data ?? []
}
