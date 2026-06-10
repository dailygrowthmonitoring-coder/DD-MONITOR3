import { getAdminClient } from '../admin'
import type { AlertRuleRow } from '../types'

const COLS = 'id, metric, operator, threshold, severity, description, is_active, created_at' as const

export async function querySelectAlertRules(): Promise<AlertRuleRow[]> {
  const { data, error } = await getAdminClient()
    .from('alert_rules')
    .select(COLS)
    .order('metric')
  if (error) throw new Error(`querySelectAlertRules: ${error.message}`)
  return data ?? []
}

export async function queryUpdateAlertRule(
  id: string,
  update: { threshold?: number; is_active?: boolean }
): Promise<AlertRuleRow> {
  const { data, error } = await getAdminClient()
    .from('alert_rules')
    .update(update)
    .eq('id', id)
    .select(COLS)
    .single()
  if (error) throw new Error(`queryUpdateAlertRule: ${error.message}`)
  return data
}
