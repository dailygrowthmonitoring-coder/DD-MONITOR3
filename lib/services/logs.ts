import { querySelectLogs } from '@/lib/supabase/queries/logs'
import type { SystemLogRow } from '@/lib/supabase/types'
import type { PaginatedLogsResponse, LogItem } from '@/types/dashboard'

const DEFAULT_LIMIT = 40
const MAX_LIMIT     = 100

export interface GetLogsParams {
  severity?:   string
  event_type?: string
  page?:       number
  limit?:      number
}

function toLogItem(row: SystemLogRow): LogItem {
  return {
    id:         row.id,
    event_type: row.event_type,
    device_id:  row.device_id,
    message:    row.message,
    severity:   row.severity,
    created_at: row.created_at,
  }
}

export async function getLogs(params: GetLogsParams): Promise<PaginatedLogsResponse> {
  const limit  = Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
  const page   = Math.max(params.page ?? 1, 1)
  const offset = (page - 1) * limit

  const { data, count } = await querySelectLogs({
    severity:   params.severity,
    event_type: params.event_type,
    limit,
    offset,
  })

  return {
    data:  data.map(toLogItem),
    total: count,
    page,
    limit,
  }
}
