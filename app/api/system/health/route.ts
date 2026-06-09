import { requireAuth } from '@/lib/auth/validate-session'
import { getSystemHealth } from '@/lib/services/system'
import { logEvent } from '@/lib/services/log'

export async function GET(): Promise<Response> {
  const auth = await requireAuth()
  if (auth instanceof Response) return auth

  try {
    const health = await getSystemHealth()
    return Response.json(health)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await logEvent({
      event_type: 'API_ERROR',
      message: `GET /api/system/health: ${message}`,
      severity: 'ERROR',
    })
    return Response.json(
      { error: 'Failed to fetch system health', code: 'DB_ERROR' },
      { status: 500 }
    )
  }
}
