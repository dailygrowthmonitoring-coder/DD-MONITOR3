'use client'

import useSWR from 'swr'
import type { CompareReportItem } from '@/types/dashboard'

const fetcher = (url: string) =>
  fetch(url).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json() as Promise<CompareReportItem[]>
  })

export function useCompare(deviceIds: string[], date: string | null) {
  const ready = deviceIds.length > 0 && date != null

  const params = new URLSearchParams()
  if (ready) {
    params.set('devices', deviceIds.join(','))
    params.set('date', date!)
  }

  const key = ready ? `/api/reports/compare?${params.toString()}` : null

  const { data, error, isLoading, mutate } = useSWR<CompareReportItem[]>(key, fetcher)

  return { data, error, isLoading, mutate }
}
