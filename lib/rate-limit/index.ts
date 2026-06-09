// In-memory rate limiter — single-instance / development only.
// For production Vercel deployments replace with @upstash/ratelimit + Redis.
const store = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60 * 60 * 1000
const MAX_REQUESTS = 20

export function checkRateLimit(ip: string): {
  allowed: boolean
  remaining: number
  retryAfter?: number
} {
  const now = Date.now()
  const existing = store.get(ip)

  if (!existing || now > existing.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: MAX_REQUESTS - 1 }
  }

  if (existing.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((existing.resetAt - now) / 1000),
    }
  }

  existing.count++
  return { allowed: true, remaining: MAX_REQUESTS - existing.count }
}
