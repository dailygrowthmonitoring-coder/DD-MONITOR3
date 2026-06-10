import {
  querySelectAlertRules,
  queryUpdateAlertRule,
} from '@/lib/supabase/queries/alert-rules'
import type { AlertRuleItem } from '@/types/dashboard'

function toItem(r: {
  id: string
  metric: string
  operator: string
  threshold: number
  severity: string
  description: string | null
  is_active: boolean
  created_at: string
}): AlertRuleItem {
  return {
    id:          r.id,
    metric:      r.metric,
    operator:    r.operator,
    threshold:   r.threshold,
    severity:    r.severity,
    description: r.description,
    is_active:   r.is_active,
    created_at:  r.created_at,
  }
}

export async function getAlertRules(): Promise<AlertRuleItem[]> {
  const rows = await querySelectAlertRules()
  return rows.map(toItem)
}

export async function updateAlertRule(
  id: string,
  threshold: number
): Promise<AlertRuleItem> {
  const row = await queryUpdateAlertRule(id, { threshold })
  return toItem(row)
}
