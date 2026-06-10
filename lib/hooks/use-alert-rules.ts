'use client'

import useSWR from 'swr'
import type { AlertRuleItem } from '@/types/dashboard'

const fetcher = (url: string) =>
  fetch(url).then(async r => {
    if (r.status === 403) return []
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json() as Promise<AlertRuleItem[]>
  })

export function useAlertRules() {
  const { data, error, isLoading, mutate } = useSWR<AlertRuleItem[]>(
    '/api/alerts/rules',
    fetcher
  )
  return { rules: data ?? [], error, isLoading, mutate }
}
