import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/validate-session'
import { getAlerts } from '@/lib/services/alerts'
import { logEvent } from '@/lib/services/log'

const QuerySchema = z.object({
  device_id: z.string().uuid().optional(),
  severity: z.enum(['CRITICAL', 'WARNING', 'INFO']).optional(),
  is_active: z
    .enum(['true', 'false'])
    .transform(v => v === 'true')
    .optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export async function GET(request: NextRequest): Promise<Response> {
  const auth = await requireAuth()
  if (auth instanceof Response) return auth

  const url = new URL(request.url)
  let query: z.infer<typeof QuerySchema>
  try {
    query = QuerySchema.parse(Object.fromEntries(url.searchParams.entries()))
  } catch {
    return Response.json(
      { error: 'Invalid query parameters', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const result = await getAlerts({
      device_id: query.device_id,
      severity: query.severity,
      is_active: query.is_active,
      from: query.from,
      to: query.to,
      limit: query.limit,
      offset: query.offset,
    })
    return Response.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await logEvent({
      event_type: 'API_ERROR',
      message: `GET /api/alerts: ${message}`,
      severity: 'ERROR',
    })
    return Response.json(
      { error: 'Failed to fetch alerts', code: 'DB_ERROR' },
      { status: 500 }
    )
  }
}
