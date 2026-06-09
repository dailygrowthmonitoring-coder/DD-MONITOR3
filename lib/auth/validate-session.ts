import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'

const TWO_FA_COOKIE = 'dd_2fa_verified'

// ── Full auth (session + 2FA cookie) — used by all protected API routes ────────

export async function requireAuth(): Promise<{ userId: string } | Response> {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cookieStore = await cookies()
  const verified = cookieStore.get(TWO_FA_COOKIE)?.value

  if (verified !== 'true') {
    return Response.json(
      { error: 'Two-factor authentication required', code: '2FA_REQUIRED' },
      { status: 403 }
    )
  }

  return { userId: session.user.id }
}

// ── Session only (no 2FA cookie) — used by 2FA send/verify routes ──────────────

export async function requireSessionOnly(): Promise<
  { userId: string; email: string } | Response
> {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return { userId: session.user.id, email: session.user.email ?? '' }
}

// ── Admin only — full auth + role check ────────────────────────────────────────

export async function requireAdmin(): Promise<{ userId: string } | Response> {
  const auth = await requireAuth()
  if (auth instanceof Response) return auth

  const { data, error } = await getAdminClient()
    .from('user_profiles')
    .select('role')
    .eq('id', auth.userId)
    .maybeSingle()

  if (error || !data || data.role !== 'admin') {
    return Response.json(
      { error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' },
      { status: 403 }
    )
  }

  return { userId: auth.userId }
}

// ── Dashboard layout helper — returns redirect target, never throws ────────────

export async function getAuthForLayout(): Promise<
  | { ok: true;  userId: string }
  | { ok: false; redirect: '/login' | '/2fa' }
> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) return { ok: false, redirect: '/login' }

    const cookieStore = await cookies()
    const verified = cookieStore.get(TWO_FA_COOKIE)?.value

    if (verified !== 'true') return { ok: false, redirect: '/2fa' }

    return { ok: true, userId: session.user.id }
  } catch {
    return { ok: false, redirect: '/login' }
  }
}
