import { NextRequest, NextResponse } from 'next/server'
import { requireSessionOnly } from '@/lib/auth/validate-session'
import { verify2faCode } from '@/lib/services/auth'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'dd_2fa_verified'
const COOKIE_MAX_AGE = 60 * 60 * 24  // 1 day

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireSessionOnly()
  if (auth instanceof Response) return NextResponse.json(await auth.json(), { status: auth.status })

  let code: string
  try {
    const body = await req.json() as { code?: unknown }
    if (typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) {
      return NextResponse.json({ error: 'Invalid code format' }, { status: 400 })
    }
    code = body.code
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const result = await verify2faCode(auth.userId, code)

  if (!result.ok) {
    const messages: Record<typeof result.reason, string> = {
      invalid:      'Incorrect code. Please try again.',
      expired:      'Code has expired. Please request a new one.',
      used:         'Code already used. Please request a new one.',
      max_attempts: 'Too many attempts. Please request a new code.',
      not_found:    'No active code found. Please request a new one.',
    }
    return NextResponse.json({ error: messages[result.reason] }, { status: 401 })
  }

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, 'true', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   COOKIE_MAX_AGE,
    path:     '/',
  })

  return NextResponse.json({ ok: true })
}
