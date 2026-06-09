'use client'
import useSWR from 'swr'
import type { DeviceReportDetail } from '@/types/dashboard'

const fetcher = (url: string): Promise<DeviceReportDetail> =>
  fetch(url).then(r => {
    if (!r.ok) throw new Error(`Request failed: ${r.status}`)
    return r.json() as Promise<DeviceReportDetail>
  })

export function useDeviceReport(deviceId: string, date: string | null) {
  const key =
    deviceId && date ? `/api/devices/${deviceId}/reports/${date}` : null
  const { data, error, isLoading } = useSWR<DeviceReportDetail>(key, fetcher)
  return {
    report: data,
    error: error as Error | undefined,
    isLoading,
  }
}
