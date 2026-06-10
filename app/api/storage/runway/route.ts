import { requireAuth } from '@/lib/auth/validate-session'
import { getStorageRunway } from '@/lib/services/storage-runway'
import { logEvent } from '@/lib/services/log'

export async function GET(): Promise<Response> {
  const auth = await requireAuth()
  if (auth instanceof Response) return auth

  try {
    const result = await getStorageRunway()
    return Response.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await logEvent({ event_type: 'API_ERROR', message: `GET /api/storage/runway: ${message}`, severity: 'ERROR' })
    return Response.json({ error: 'Failed to calculate runway', code: 'DB_ERROR' }, { status: 500 })
  }
}
