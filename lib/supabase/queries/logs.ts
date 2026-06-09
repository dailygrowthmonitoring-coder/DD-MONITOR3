import { getAdminClient } from '../admin'
import type { SystemLogRow, SystemLogInsert } from '../types'

const COLS = 'id, event_type, device_id, message, details, severity, created_at' as const

export async function queryInsertLog(insert: SystemLogInsert): Promise<void> {
  const { error } = await getAdminClient().from('system_logs').insert(insert)
  if (error) {
    // Must not throw — would cause infinite recursion if called from error handlers
    console.error('[system_logs] insert failed:', error.message)
  }
}

export async function querySelectRecentLogs(limit: number): Promise<SystemLogRow[]> {
  const { data, error } = await getAdminClient()
    .from('system_logs')
    .select(COLS)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`querySelectRecentLogs: ${error.message}`)
  return data ?? []
}

export async function queryCountErrorsSince(since: string): Promise<number> {
  const { count, error } = await getAdminClient()
    .from('system_logs')
    .select('id', { count: 'exact', head: true })
    .eq('severity', 'ERROR')
    .gte('created_at', since)
  if (error) throw new Error(`queryCountErrorsSince: ${error.message}`)
  return count ?? 0
}

// ── Paginated / filtered logs (Logs page) ────────────────────────────────────

export interface LogQueryFilters {
  severity?: string
  event_type?: string
  limit?: number
  offset?: number
}

export async function querySelectLogs(
  filters: LogQueryFilters
): Promise<{ data: SystemLogRow[]; count: number }> {
  let query = getAdminClient()
    .from('system_logs')
    .select(COLS, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filters.severity)   query = query.eq('severity', filters.severity)
  if (filters.event_type) query = query.eq('event_type', filters.event_type)

  const limit  = filters.limit  ?? 40
  const offset = filters.offset ?? 0
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query
  if (error) throw new Error(`querySelectLogs: ${error.message}`)
  return { data: (data ?? []) as SystemLogRow[], count: count ?? 0 }
}
