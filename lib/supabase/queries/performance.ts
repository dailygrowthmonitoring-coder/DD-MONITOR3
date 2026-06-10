import { getAdminClient } from '../admin'
import type { DDPerformanceInsert } from '../types'

const BATCH_SIZE = 500

export async function queryDeletePerformanceByReportId(reportId: string): Promise<void> {
  const { error } = await getAdminClient()
    .from('dd_performance_metrics')
    .delete()
    .eq('report_id', reportId)
  if (error) throw new Error(`queryDeletePerformanceByReportId: ${error.message}`)
}

export async function queryInsertPerformance(inserts: DDPerformanceInsert[]): Promise<void> {
  if (inserts.length === 0) return
  // Batch inserts to avoid request size limits
  for (let i = 0; i < inserts.length; i += BATCH_SIZE) {
    const batch = inserts.slice(i, i + BATCH_SIZE)
    const { error } = await getAdminClient()
      .from('dd_performance_metrics')
      .upsert(batch, { onConflict: 'device_id,metric_time' })
    if (error) throw new Error(`queryInsertPerformance batch ${i}: ${error.message}`)
  }
}
