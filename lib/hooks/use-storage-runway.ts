'use client'

import useSWR from 'swr'
import type { RunwayResult } from '@/types/dashboard'

const fetcher = (url: string) =>
  fetch(url).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json() as Promise<RunwayResult>
  })

export function useStorageRunway() {
  const { data, error, isLoading, mutate } = useSWR<RunwayResult>(
    '/api/storage/runway',
    fetcher
  )
  return { runway: data ?? null, error, isLoading, mutate }
}
