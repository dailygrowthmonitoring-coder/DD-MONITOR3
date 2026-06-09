import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/validate-session'
import { listUsers, createUser } from '@/lib/services/settings'
import { logEvent } from '@/lib/services/log'

const CreateSchema = z.object({
  email:     z.string().email(),
  password:  z.string().min(8),
  full_name: z.string().max(120),
  role:      z.enum(['admin', 'viewer']),
})

export async function GET(): Promise<Response> {
  const auth = await requireAdmin()
  if (auth instanceof Response) return auth

  try {
    const users = await listUsers()
    return Response.json(users)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await logEvent({ event_type: 'API_ERROR', message: `GET /api/settings/users: ${message}`, severity: 'ERROR' })
    return Response.json({ error: 'Failed to fetch users', code: 'DB_ERROR' }, { status: 500 })
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const auth = await requireAdmin()
  if (auth instanceof Response) return auth

  let body: z.infer<typeof CreateSchema>
  try {
    body = CreateSchema.parse(await request.json())
  } catch {
    return Response.json({ error: 'Invalid request body', code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  try {
    const user = await createUser(body)
    return Response.json(user, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.includes('already registered') || message.includes('duplicate') || message.includes('already exists')) {
      return Response.json({ error: 'Email already in use', code: 'DUPLICATE_EMAIL' }, { status: 409 })
    }
    await logEvent({ event_type: 'API_ERROR', message: `POST /api/settings/users: ${message}`, severity: 'ERROR' })
    return Response.json({ error: 'Failed to create user', code: 'CREATE_FAILED' }, { status: 500 })
  }
}
