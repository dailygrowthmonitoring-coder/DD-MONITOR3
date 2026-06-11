/**
 * GET /api/auth/callback
 *
 * Supabase PKCE OAuth callback handler.
 *
 * After a successful login the Supabase Auth server redirects here with an
 * authorization code (PKCE flow). This handler exchanges the code for a
 * session, sets the session cookies, and redirects to the dashboard.
 *
 * On error (expired code, missing params) it redirects to /login with an
 * error query param so the login page can surface a user-facing message.
 *
 * Reference: https://supabase.com/docs/guides/auth/pkce-flow
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl   = new URL(request.url);
  const code         = requestUrl.searchParams.get('code');
  const next         = requestUrl.searchParams.get('next') ?? '/';
  const origin       = requestUrl.origin;

  if (code === null) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(
    process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '',
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error !== null) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  // Redirect to the originally requested destination (or dashboard root).
  return NextResponse.redirect(`${origin}${next}`);
}
