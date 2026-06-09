import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/validate-session'
import { getCurrentProfile, updateCurrentProfile } from '@/lib/services/settings'
import { logEvent } from '@/lib/services/log'

const PatchSchema = z.object({
  full_name: z.string().max(120).nullable(),
})

export async function GET(): Promise<Response> {
  const auth = await requireAuth()
  if (auth instanceof Response) return auth

  try {
    const profile = await getCurrentProfile(auth.userId)
    if (!profile) {
      return Response.json({ error: 'Profile not found', code: 'NOT_FOUND' }, { status: 404 })
    }
    return Response.json(profile)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await logEvent({ event_type: 'API_ERROR', message: `GET /api/settings/profile: ${message}`, severity: 'ERROR' })
    return Response.json({ error: 'Failed to fetch profile', code: 'DB_ERROR' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest): Promise<Response> {
  const auth = await requireAuth()
  if (auth instanceof Response) return auth

  let body: z.infer<typeof PatchSchema>
  try {
    body = PatchSchema.parse(await request.json())
  } catch {
    return Response.json({ error: 'Invalid request body', code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  try {
    await updateCurrentProfile(auth.userId, body.full_name ?? '')
    return Response.json({ message: 'Profile updated' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await logEvent({ event_type: 'API_ERROR', message: `PATCH /api/settings/profile: ${message}`, severity: 'ERROR' })
    return Response.json({ error: 'Failed to update profile', code: 'DB_ERROR' }, { status: 500 })
  }
}
