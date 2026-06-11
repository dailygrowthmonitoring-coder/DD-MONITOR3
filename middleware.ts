/**
 * Next.js Edge Middleware — protects all dashboard API routes.
 *
 * Protection model:
 *   /api/health          — public, no auth required (uptime monitoring)
 *   /api/ingest          — x-api-key auth, handled by route handler
 *   /api/export/weekly   — x-api-key auth, handled by route handler
 *   /api/auth/*          — Supabase auth callbacks, no session yet
 *   /api/*               — all others require a valid Supabase session
 *
 * For protected routes, the middleware:
 *   1. Creates a Supabase client from the request cookies (standard @supabase/ssr pattern).
 *   2. Calls getUser() to validate the JWT with the Supabase Auth server.
 *   3. Returns 401 JSON if no valid session is found.
 *   4. Passes the request through (updating cookie headers) if authenticated.
 *
 * The middleware also refreshes expiring sessions by relaying Supabase's
 * Set-Cookie directives back to the browser.
 */

import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that bypass session authentication entirely
const PUBLIC_API_PREFIXES = [
  '/api/health',
  '/api/ingest',
  '/api/export/weekly',
  '/api/auth/',
] as const;

/**
 * Returns true when the given pathname is exempt from session-based auth.
 * These routes use their own auth mechanism (x-api-key or public).
 */
function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (isPublicApiRoute(pathname)) {
    return NextResponse.next({ request });
  }

  // Build a Supabase client that reads and refreshes cookies from the request.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '',
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? '',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // Forward any Set-Cookie directives onto both the request (for the
          // in-flight handler) and the response (for the browser).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Validate the session — this also refreshes the access token if needed.
  const { data: { user } } = await supabase.auth.getUser();

  if (user === null) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AUTH.SESSION_REQUIRED',
          message: 'Authentication is required to access this resource.',
          status: 401,
        },
      },
      { status: 401 },
    );
  }

  return response;
}

export const config = {
  /*
   * Match all /api/* routes. The isPublicApiRoute check above handles
   * the per-route exemptions inside the middleware body.
   */
  matcher: ['/api/:path*'],
};
