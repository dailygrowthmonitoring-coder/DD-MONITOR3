'use client'

import useSWR from 'swr'
import type { UserProfile } from '@/types/dashboard'

const fetcher = (url: string) =>
  fetch(url).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json() as Promise<UserProfile>
  })

export function useProfile() {
  const { data, error, isLoading, mutate } = useSWR<UserProfile>(
    '/api/settings/profile',
    fetcher
  )
  return { profile: data, error, isLoading, mutate }
}
