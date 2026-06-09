import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/validate-session'
import { getSystemSettings, updateSystemSetting } from '@/lib/services/settings'
import { logEvent } from '@/lib/services/log'

const PatchSchema = z.array(
  z.object({
    key:   z.string().min(1).max(64),
    value: z.string().max(1024),
  })
).min(1)

export async function GET(): Promise<Response> {
  const auth = await requireAdmin()
  if (auth instanceof Response) return auth

  try {
    const settings = await getSystemSettings()
    return Response.json(settings)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await logEvent({ event_type: 'API_ERROR', message: `GET /api/settings/system: ${message}`, severity: 'ERROR' })
    return Response.json({ error: 'Failed to fetch settings', code: 'DB_ERROR' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest): Promise<Response> {
  const auth = await requireAdmin()
  if (auth instanceof Response) return auth

  let body: z.infer<typeof PatchSchema>
  try {
    body = PatchSchema.parse(await request.json())
  } catch {
    return Response.json({ error: 'Invalid request body', code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  try {
    const updatedBy = auth.userId
    await Promise.all(body.map(({ key, value }) => updateSystemSetting(key, value, updatedBy)))
    return Response.json({ message: 'Settings updated' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await logEvent({ event_type: 'API_ERROR', message: `PATCH /api/settings/system: ${message}`, severity: 'ERROR' })
    return Response.json({ error: 'Failed to update settings', code: 'DB_ERROR' }, { status: 500 })
  }
}
