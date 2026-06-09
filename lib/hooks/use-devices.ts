'use client'
import useSWR from 'swr'
import type { DeviceOverviewItem } from '@/types/dashboard'

const fetcher = (url: string): Promise<DeviceOverviewItem[]> =>
  fetch(url).then(r => {
    if (!r.ok) throw new Error(`Request failed: ${r.status}`)
    return r.json() as Promise<DeviceOverviewItem[]>
  })

export function useDevices() {
  const { data, error, isLoading, mutate } = useSWR<DeviceOverviewItem[]>(
    '/api/devices',
    fetcher,
    { refreshInterval: 60_000 }
  )
  return {
    devices: data ?? [],
    error: error as Error | undefined,
    isLoading,
    refresh: mutate,
  }
}
