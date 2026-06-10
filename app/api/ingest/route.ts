import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { processIngest } from '@/lib/services/ingest'
import { logEvent } from '@/lib/services/log'
import { checkRateLimit } from '@/lib/rate-limit/index'

const BodySchema = z.object({
  raw_text: z.string().min(100).max(10_000_000),
  filename: z.string().regex(/^[\w\-. ()]+\.txt$/i),
})

export async function POST(request: NextRequest): Promise<Response> {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.INGEST_SECRET) {
    return Response.json(
      { error: 'Unauthorized', code: 'INVALID_API_KEY' },
      { status: 401 }
    )
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rl = checkRateLimit(ip)
  if (!rl.allowed) {
    return Response.json(
      { error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 3600) } }
    )
  }

  let body: z.infer<typeof BodySchema>
  try {
    const raw = await request.json()
    body = BodySchema.parse(raw)
  } catch {
    return Response.json(
      { error: 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const result = await processIngest(body.raw_text, body.filename)
    return Response.json(result, { status: 200 })
  } catch (err) {
    console.error('[ingest] Full error:', err)
    const message = err instanceof Error ? err.message : String(err)
    await logEvent({
      event_type: 'INGEST_ERROR',
      message: `Ingest failed for ${body.filename}: ${message}`,
      details: { filename: body.filename },
      severity: 'ERROR',
    })
    return Response.json(
      { error: message, code: 'INGEST_ERROR' },
      { status: 500 }
    )
  }
}
