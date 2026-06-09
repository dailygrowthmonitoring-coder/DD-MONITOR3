'use client'

import useSWR from 'swr'
import type { PaginatedAlertsResponse } from '@/types/dashboard'

const fetcher = (url: string) =>
  fetch(url).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json() as Promise<PaginatedAlertsResponse>
  })

export interface AlertsFilters {
  severity?: string
  is_active?: boolean
  device_id?: string
  page?: number
  limit?: number
}

export function useAlerts(filters: AlertsFilters = {}) {
  const limit  = filters.limit ?? 25
  const page   = filters.page  ?? 1
  const offset = (page - 1) * limit

  const params = new URLSearchParams()
  if (filters.severity)                params.set('severity',  filters.severity)
  if (filters.is_active !== undefined) params.set('is_active', String(filters.is_active))
  if (filters.device_id)              params.set('device_id', filters.device_id)
  params.set('limit',  String(limit))
  params.set('offset', String(offset))

  const key = `/api/alerts?${params.toString()}`

  const { data, error, isLoading, mutate } = useSWR<PaginatedAlertsResponse>(key, fetcher)

  return { data, error, isLoading, mutate }
}
