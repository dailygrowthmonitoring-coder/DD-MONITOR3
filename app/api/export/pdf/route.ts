import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/validate-session'

const BodySchema = z.object({
  device_id: z.string().uuid(),
  report_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function POST(request: NextRequest): Promise<Response> {
  const auth = await requireAuth()
  if (auth instanceof Response) return auth

  try {
    const raw = await request.json()
    BodySchema.parse(raw)
  } catch {
    return Response.json(
      { error: 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  // Phase 10 stub — PDF generation not yet implemented
  return Response.json(
    { error: 'PDF export not yet implemented', code: 'NOT_IMPLEMENTED' },
    { status: 501 }
  )
}
