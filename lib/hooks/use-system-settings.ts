'use client'

import useSWR from 'swr'
import type { SystemSetting } from '@/types/dashboard'

const fetcher = (url: string) =>
  fetch(url).then(async r => {
    if (r.status === 403) return []
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json() as Promise<SystemSetting[]>
  })

export function useSystemSettings() {
  const { data, error, isLoading, mutate } = useSWR<SystemSetting[]>(
    '/api/settings/system',
    fetcher
  )
  return { settings: data ?? [], error, isLoading, mutate }
}
