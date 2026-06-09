'use client'

import useSWR from 'swr'
import type { PaginatedLogsResponse } from '@/types/dashboard'

const fetcher = (url: string) =>
  fetch(url).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json() as Promise<PaginatedLogsResponse>
  })

export interface LogsFilters {
  severity?: string
  event_type?: string
  page?: number
  limit?: number
}

export function useLogs(filters: LogsFilters = {}) {
  const params = new URLSearchParams()
  if (filters.severity)   params.set('severity',   filters.severity)
  if (filters.event_type) params.set('event_type', filters.event_type)
  if (filters.page  != null) params.set('page',  String(filters.page))
  if (filters.limit != null) params.set('limit', String(filters.limit))

  const key = `/api/logs?${params.toString()}`

  const { data, error, isLoading, mutate } = useSWR<PaginatedLogsResponse>(key, fetcher)

  return { data, error, isLoading, mutate }
}
