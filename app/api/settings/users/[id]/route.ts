import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/validate-session'
import { updateUser, deleteUser } from '@/lib/services/settings'
import { logEvent } from '@/lib/services/log'

const PatchSchema = z.object({
  full_name: z.string().max(120).nullable().optional(),
  role:      z.enum(['admin', 'viewer']).optional(),
  is_active: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const auth = await requireAdmin()
  if (auth instanceof Response) return auth

  const { id } = await params
  if (!id) {
    return Response.json({ error: 'Missing user id', code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  let body: z.infer<typeof PatchSchema>
  try {
    body = PatchSchema.parse(await request.json())
  } catch {
    return Response.json({ error: 'Invalid request body', code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  try {
    await updateUser(id, body)
    return Response.json({ message: 'User updated' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await logEvent({ event_type: 'API_ERROR', message: `PATCH /api/settings/users/${id}: ${message}`, severity: 'ERROR' })
    return Response.json({ error: 'Failed to update user', code: 'UPDATE_FAILED' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const auth = await requireAdmin()
  if (auth instanceof Response) return auth

  const { id } = await params
  if (!id) {
    return Response.json({ error: 'Missing user id', code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  if (id === auth.userId) {
    return Response.json({ error: 'Cannot delete your own account', code: 'SELF_DELETE' }, { status: 400 })
  }

  try {
    await deleteUser(id)
    return Response.json({ message: 'User deleted' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await logEvent({ event_type: 'API_ERROR', message: `DELETE /api/settings/users/${id}: ${message}`, severity: 'ERROR' })
    return Response.json({ error: 'Failed to delete user', code: 'DELETE_FAILED' }, { status: 500 })
  }
}
