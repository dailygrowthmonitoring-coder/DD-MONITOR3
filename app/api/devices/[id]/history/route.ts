import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/validate-session'
import { getDeviceHistoryData } from '@/lib/services/reports'
import { logEvent } from '@/lib/services/log'
import { DATA_RETENTION_DAYS } from '@/lib/constants/ui'

const QuerySchema = z.object({
  range: z.coerce
    .number()
    .int()
    .min(1)
    .max(DATA_RETENTION_DAYS)
    .default(7),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const auth = await requireAuth()
  if (auth instanceof Response) return auth

  const { id } = await params
  if (!id) {
    return Response.json(
      { error: 'Missing device id', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const url = new URL(request.url)
  let query: z.infer<typeof QuerySchema>
  try {
    query = QuerySchema.parse({
      range: url.searchParams.get('range') ?? undefined,
    })
  } catch {
    return Response.json(
      { error: 'Invalid range parameter (1–40)', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const data = await getDeviceHistoryData(id, query.range)
    return Response.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await logEvent({
      event_type: 'API_ERROR',
      message:    `GET /api/devices/${id}/history: ${message}`,
      severity:   'ERROR',
    })
    return Response.json(
      { error: 'Failed to fetch history data', code: 'DB_ERROR' },
      { status: 500 }
    )
  }
}
