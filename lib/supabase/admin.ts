// SERVER ONLY — never import from client components or 'use client' files.
// This client uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

let _client: SupabaseClient<Database> | null = null

export function getAdminClient(): SupabaseClient<Database> {
  if (!_client) {
    _client = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  }
  return _client
}
