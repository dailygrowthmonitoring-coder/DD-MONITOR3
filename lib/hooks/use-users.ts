'use client'

import useSWR from 'swr'
import type { UserProfile } from '@/types/dashboard'

const fetcher = (url: string) =>
  fetch(url).then(async r => {
    if (r.status === 403) return []
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json() as Promise<UserProfile[]>
  })

export function useUsers() {
  const { data, error, isLoading, mutate } = useSWR<UserProfile[]>(
    '/api/settings/users',
    fetcher
  )
  return { users: data ?? [], error, isLoading, mutate }
}
