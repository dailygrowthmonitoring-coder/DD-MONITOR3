import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/validate-session'
import { getReportsForComparison } from '@/lib/services/reports'
import { logEvent } from '@/lib/services/log'

const QuerySchema = z.object({
  devices: z
    .string()
    .min(1, 'At least one device id required')
    .transform(s => s.split(',').map(v => v.trim()).filter(Boolean)),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
})

export async function GET(request: NextRequest): Promise<Response> {
  const auth = await requireAuth()
  if (auth instanceof Response) return auth

  const url = new URL(request.url)
  let query: z.infer<typeof QuerySchema>
  try {
    query = QuerySchema.parse({
      devices: url.searchParams.get('devices') ?? '',
      date: url.searchParams.get('date') ?? '',
    })
  } catch {
    return Response.json(
      { error: 'Invalid query parameters', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  if (query.devices.length === 0) {
    return Response.json(
      { error: 'At least one device id required', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const reports = await getReportsForComparison(query.devices, query.date)
    return Response.json(reports)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await logEvent({
      event_type: 'API_ERROR',
      message: `GET /api/reports/compare: ${message}`,
      severity: 'ERROR',
    })
    return Response.json(
      { error: 'Failed to fetch comparison reports', code: 'DB_ERROR' },
      { status: 500 }
    )
  }
}
