import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/validate-session'
import { getReportsByDevice } from '@/lib/services/reports'
import { logEvent } from '@/lib/services/log'

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(40),
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
      page: url.searchParams.get('page') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    })
  } catch {
    return Response.json(
      { error: 'Invalid query parameters', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const result = await getReportsByDevice(id, query.page, query.limit)
    return Response.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await logEvent({
      event_type: 'API_ERROR',
      message: `GET /api/devices/${id}/reports: ${message}`,
      severity: 'ERROR',
    })
    return Response.json(
      { error: 'Failed to fetch reports', code: 'DB_ERROR' },
      { status: 500 }
    )
  }
}
