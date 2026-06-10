import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth, requireAdmin } from '@/lib/auth/validate-session'
import { getAlertRules, updateAlertRule } from '@/lib/services/alert-rules'
import { logEvent } from '@/lib/services/log'

const PatchSchema = z.object({
  id:        z.string().uuid(),
  threshold: z.number().positive(),
})

export async function GET(): Promise<Response> {
  const auth = await requireAuth()
  if (auth instanceof Response) return auth

  try {
    const rules = await getAlertRules()
    return Response.json(rules)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await logEvent({ event_type: 'API_ERROR', message: `GET /api/alerts/rules: ${message}`, severity: 'ERROR' })
    return Response.json({ error: 'Failed to fetch alert rules', code: 'DB_ERROR' }, { status: 500 })
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
    const rule = await updateAlertRule(body.id, body.threshold)
    return Response.json(rule)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await logEvent({ event_type: 'API_ERROR', message: `PATCH /api/alerts/rules: ${message}`, severity: 'ERROR' })
    return Response.json({ error: 'Failed to update alert rule', code: 'DB_ERROR' }, { status: 500 })
  }
}
