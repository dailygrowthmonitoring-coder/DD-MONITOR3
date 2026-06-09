import { queryInsertLog } from '@/lib/supabase/queries/logs'
import type { Json } from '@/lib/supabase/types'

export interface LogEventParams {
  event_type: string
  device_id?: string
  message: string
  details?: Record<string, unknown>
  severity: 'INFO' | 'WARNING' | 'ERROR'
}

export async function logEvent(params: LogEventParams): Promise<void> {
  await queryInsertLog({
    event_type: params.event_type,
    device_id: params.device_id ?? null,
    message: params.message,
    details: (params.details ?? null) as Json | null,
    severity: params.severity,
  })
}
