/**
 * Server-side Supabase client factory for use in API route handlers.
 *
 * Uses the anon key (not the service-role key) so the session-bearing JWT
 * from the browser cookie is forwarded to Supabase, keeping RLS active for
 * dashboard reads. The repositories (which bypass RLS for writes) use their
 * own service-role client via createServiceClient() from lib/repositories.
 *
 * In Next.js 15, cookies() is async. Call createApiClient() with await.
 *
 * Dependency: @supabase/ssr (cookie-based Supabase client for Next.js App Router).
 */

import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/supabase/types';

/**
 * Creates a session-aware Supabase client for use in API route handlers.
 *
 * Reads the authentication session from HTTP cookies set by the browser
 * (placed there during the Supabase auth flow). Must be called inside an
 * async route handler — not at module scope.
 *
 * @returns A typed SupabaseClient<Database> using the session from cookies.
 */
export async function createApiClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '',
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll is called from Server Components where cookie mutation is
            // not permitted. The middleware handles session refreshes; this
            // try/catch is safe to suppress.
          }
        },
      },
    },
  );
}
