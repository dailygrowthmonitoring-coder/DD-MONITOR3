import { requireAuth } from '@/lib/auth/validate-session'
import { getDevicesOverview } from '@/lib/services/devices'
import { logEvent } from '@/lib/services/log'

export async function GET(): Promise<Response> {
  const auth = await requireAuth()
  if (auth instanceof Response) return auth

  try {
    const devices = await getDevicesOverview()
    return Response.json(devices)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await logEvent({
      event_type: 'API_ERROR',
      message: `GET /api/devices: ${message}`,
      severity: 'ERROR',
    })
    return Response.json(
      { error: 'Failed to fetch devices', code: 'DB_ERROR' },
      { status: 500 }
    )
  }
}
