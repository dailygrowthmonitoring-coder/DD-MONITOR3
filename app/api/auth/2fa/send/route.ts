import { NextResponse } from 'next/server'
import { requireSessionOnly } from '@/lib/auth/validate-session'
import { generateAndStore2faCode } from '@/lib/services/auth'

export async function POST(): Promise<NextResponse> {
  const auth = await requireSessionOnly()
  if (auth instanceof Response) return NextResponse.json(await auth.json(), { status: auth.status })

  try {
    await generateAndStore2faCode(auth.userId, auth.email)
    return NextResponse.json({ ok: true, sent: true })
  } catch (err) {
    console.error('[2fa/send] Error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 })
  }
}
