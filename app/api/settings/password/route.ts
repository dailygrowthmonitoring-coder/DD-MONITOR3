import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/validate-session'
import { verifyAndChangePassword } from '@/lib/services/settings'
import { logEvent } from '@/lib/services/log'

const MIN_PASSWORD_LENGTH = 8

const BodySchema = z.object({
  current_password: z.string().min(1),
  new_password:     z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
})

export async function POST(request: NextRequest): Promise<Response> {
  const auth = await requireAuth()
  if (auth instanceof Response) return auth

  let body: z.infer<typeof BodySchema>
  try {
    body = BodySchema.parse(await request.json())
  } catch (err) {
    const message = err instanceof z.ZodError ? err.errors[0]?.message : 'Invalid request body'
    return Response.json({ error: message, code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  try {
    await verifyAndChangePassword(auth.userId, body.current_password, body.new_password)
    return Response.json({ message: 'Password updated successfully' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message === 'WRONG_PASSWORD') {
      return Response.json({ error: 'Current password is incorrect', code: 'WRONG_PASSWORD' }, { status: 400 })
    }
    if (message === 'USER_NOT_FOUND') {
      return Response.json({ error: 'User not found', code: 'NOT_FOUND' }, { status: 404 })
    }
    await logEvent({ event_type: 'API_ERROR', message: `POST /api/settings/password: ${message}`, severity: 'ERROR' })
    return Response.json({ error: 'Failed to update password', code: 'UPDATE_FAILED' }, { status: 500 })
  }
}
