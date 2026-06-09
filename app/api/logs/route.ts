import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/validate-session'
import { getLogs } from '@/lib/services/logs'
import { logEvent } from '@/lib/services/log'

const VALID_SEVERITIES = ['INFO', 'WARNING', 'ERROR'] as const

const QuerySchema = z.object({
  severity:   z.enum(VALID_SEVERITIES).optional(),
  event_type: z.string().max(64).optional(),
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(40),
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
    const result = await getLogs({
      severity:   query.severity,
      event_type: query.event_type,
      page:       query.page,
      limit:      query.limit,
    })
    return Response.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await logEvent({
      event_type: 'API_ERROR',
      message:    `GET /api/logs: ${message}`,
      severity:   'ERROR',
    })
    return Response.json(
      { error: 'Failed to fetch logs', code: 'DB_ERROR' },
      { status: 500 }
    )
  }
}
