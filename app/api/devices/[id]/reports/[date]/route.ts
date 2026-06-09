import type { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/validate-session'
import { getReportByDeviceAndDate } from '@/lib/services/reports'
import { logEvent } from '@/lib/services/log'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; date: string }> }
): Promise<Response> {
  const auth = await requireAuth()
  if (auth instanceof Response) return auth

  const { id, date } = await params
  if (!id || !date || !DATE_RE.test(date)) {
    return Response.json(
      { error: 'Invalid device id or date (expected YYYY-MM-DD)', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const report = await getReportByDeviceAndDate(id, date)
    if (!report) {
      return Response.json(
        { error: 'Report not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }
    return Response.json(report)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await logEvent({
      event_type: 'API_ERROR',
      message: `GET /api/devices/${id}/reports/${date}: ${message}`,
      severity: 'ERROR',
    })
    return Response.json(
      { error: 'Failed to fetch report', code: 'DB_ERROR' },
      { status: 500 }
    )
  }
}
