'use client'

import useSWR from 'swr'
import type { SystemHealthFull } from '@/types/dashboard'

const fetcher = (url: string) =>
  fetch(url).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json() as Promise<SystemHealthFull>
  })

export function useSystemHealth() {
  const { data, error, isLoading, mutate } = useSWR<SystemHealthFull>(
    '/api/system/health',
    fetcher,
    { refreshInterval: 60_000 }
  )

  return { data, error, isLoading, mutate }
}
