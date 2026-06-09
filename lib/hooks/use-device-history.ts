'use client'

import useSWR from 'swr'
import type { HistoryChartPoint } from '@/types/dashboard'

const fetcher = (url: string) =>
  fetch(url).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json() as Promise<HistoryChartPoint[]>
  })

export function useDeviceHistory(deviceId: string | null, rangeDays: number) {
  const key = deviceId ? `/api/devices/${deviceId}/history?range=${rangeDays}` : null

  const { data, error, isLoading, mutate } = useSWR<HistoryChartPoint[]>(key, fetcher)

  return { data, error, isLoading, mutate }
}
