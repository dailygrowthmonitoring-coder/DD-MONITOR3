/**
 * Base repository utilities — Supabase client factory and shared helpers.
 *
 * All repositories use the service-role Supabase client (bypasses RLS) because
 * repositories are server-side only and called exclusively by services running
 * in API route handlers. Dashboard reads go through the same path; auth is
 * enforced at the API layer, not at the DB query layer.
 *
 * Import `createServiceClient` in repository constructors; never call it at
 * module scope so each request gets a fresh client instance.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { DatabaseError } from '@/lib/infrastructure/errors/app-error';
import { type AppError } from '@/lib/infrastructure/errors/app-error';
import { err, type ErrResult } from '@/lib/infrastructure/errors/result';

// ---------------------------------------------------------------------------
// Typed client alias
// ---------------------------------------------------------------------------

/** Supabase client typed against the DD Monitor database schema. */
export type DDSupabaseClient = SupabaseClient<Database>;

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

/**
 * Creates a service-role Supabase client for server-side repository use.
 *
 * Reads env vars directly (not via config module) so this can be called from
 * middleware and edge contexts as well as API routes.
 *
 * Call once per request — do not cache across requests as Auth context may differ.
 */
export function createServiceClient(): DDSupabaseClient {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];

  if (url === undefined || url === '' || key === undefined || key === '') {
    throw new Error(
      '[DD Monitor] createServiceClient: NEXT_PUBLIC_SUPABASE_URL or ' +
      'SUPABASE_SERVICE_ROLE_KEY is missing. Check your environment variables.',
    );
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------------------------------------------------------------------------
// Shared error helper
// ---------------------------------------------------------------------------

/**
 * Converts a Supabase `error` response object into a typed `ErrResult<AppError>`.
 * Supabase never throws; instead it returns `{ data: null, error: PostgrestError }`.
 *
 * @param error - The `error` property from a Supabase query response.
 * @returns An ErrResult wrapping a DatabaseError.
 */
export function supabaseErr(
  error: { message: string; details?: string; hint?: string; code?: string },
): ErrResult<AppError> {
  return err(
    DatabaseError.fromUnknown(
      new Error(`[Supabase] ${error.code ?? 'UNKNOWN'}: ${error.message}. ${error.details ?? ''}`),
    ),
  );
}
