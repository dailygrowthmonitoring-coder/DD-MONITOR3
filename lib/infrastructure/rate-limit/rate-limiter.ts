/**
 * Fixed-window rate limiter for /api/ingest.
 *
 * Per PRD §9.3: maximum 20 requests per hour per IP.
 *
 * Implementation notes:
 * - In-memory Map is correct for single-instance Vercel deployments.
 *   Each Vercel serverless function instance has its own in-process Map.
 *   Across cold starts the window resets, which is acceptable given the low
 *   volume of the ingest endpoint (7 devices × 1 report/day).
 *   If the deployment ever becomes multi-instance, replace this with a
 *   Redis-backed limiter using a sliding window in a Supabase Edge Function.
 * - Cleanup of stale entries runs on every call (O(n) over the store size).
 *   At the expected scale (≤100 distinct IPs/day) this is negligible.
 *
 * Dependency: app-error.ts (RateLimitError), config.ts. No other internal deps.
 */

import { RateLimitError } from '../errors/app-error';
import { config } from '../config/config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** State for a single IP/identifier within a rate-limit window. */
interface WindowEntry {
  /** Number of requests made in the current window. */
  count: number;
  /** Epoch ms when the current window started. */
  windowStart: number;
}

/**
 * The result of a rate-limit check.
 * Callers inspect `allowed`; if false, use `retryAfterSeconds` for the
 * Retry-After HTTP header.
 */
export interface RateLimitResult {
  /** Whether the request is within the allowed rate. */
  readonly allowed: boolean;
  /** How many more requests are allowed in the current window. */
  readonly remaining: number;
  /** Seconds until the current window resets and the counter clears. */
  readonly resetInSeconds: number;
  /**
   * Seconds the caller should wait before retrying.
   * Only present when `allowed` is false.
   */
  readonly retryAfterSeconds?: number;
}

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

/**
 * The backing store for rate-limit windows.
 * Module-level singleton — shared across all calls within the same process.
 */
const rateLimitStore = new Map<string, WindowEntry>();

// ---------------------------------------------------------------------------
// Core function
// ---------------------------------------------------------------------------

/**
 * Checks whether an identifier (IP address or API key) is within its
 * allowed request rate for the current window.
 *
 * Also purges stale entries older than 2× the window to bound Map growth.
 *
 * @param identifier - The IP address or identifier to limit (used as the Map key).
 * @param limitPerHour - Max allowed requests per window. Defaults to config value.
 * @param windowMs - Window duration in ms. Defaults to 1 hour (3 600 000 ms).
 * @returns A RateLimitResult describing whether the request is allowed.
 */
export function checkRateLimit(
  identifier: string,
  limitPerHour?: number,
  windowMs?: number,
): RateLimitResult {
  const limit = limitPerHour ?? config.RATE_LIMIT_REQUESTS_PER_HOUR;
  const window = windowMs ?? 3_600_000;
  const now = Date.now();

  // Purge entries older than 2× the window to prevent unbounded Map growth.
  // This is O(n) but the store is tiny at expected scale.
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > 2 * window) {
      rateLimitStore.delete(key);
    }
  }

  const existing = rateLimitStore.get(identifier);

  // If no entry exists, or the window has expired, start a fresh window.
  if (existing === undefined || now - existing.windowStart >= window) {
    rateLimitStore.set(identifier, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: limit - 1,
      resetInSeconds: Math.ceil(window / 1000),
    };
  }

  const elapsed = now - existing.windowStart;
  const resetInSeconds = Math.ceil((window - elapsed) / 1000);

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds,
      retryAfterSeconds: resetInSeconds,
    };
  }

  // Increment within the existing window.
  existing.count += 1;
  return {
    allowed: true,
    remaining: limit - existing.count,
    resetInSeconds,
  };
}

// ---------------------------------------------------------------------------
// IP extraction helper
// ---------------------------------------------------------------------------

/**
 * Extracts the best available client IP from a Next.js/Web API Request.
 *
 * Priority: x-forwarded-for (first hop) → x-real-ip → 'unknown'.
 * 'unknown' is a valid rate-limit key — it means all unknown-IP callers
 * share one bucket, which is acceptable for our threat model.
 */
function extractIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded !== null && forwarded.trim() !== '') {
    // x-forwarded-for may be a comma-separated list; take the leftmost (client) IP.
    const parts = forwarded.split(',');
    const first = parts[0];
    if (first !== undefined) {
      const trimmed = first.trim();
      if (trimmed !== '') return trimmed;
    }
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp !== null && realIp.trim() !== '') return realIp.trim();

  return 'unknown';
}

// ---------------------------------------------------------------------------
// Higher-order helper for Next.js route handlers
// ---------------------------------------------------------------------------

/**
 * Wraps a Next.js App Router route handler with rate limiting.
 *
 * The wrapper:
 * 1. Extracts the client IP from the request headers.
 * 2. Calls checkRateLimit for that IP.
 * 3. If denied: returns a 429 JSON response with Retry-After headers.
 * 4. If allowed: calls through to the wrapped handler.
 *
 * @param handler - The Next.js route handler to protect.
 * @param options - Optional overrides for the rate-limit parameters.
 * @returns A new route handler with rate limiting applied.
 *
 * @example
 * export const POST = withRateLimit(async (req) => {
 *   // ... handler body
 * }, { limitPerHour: 20 });
 */
export function withRateLimit(
  handler: (req: Request) => Promise<Response>,
  options?: { readonly limitPerHour?: number },
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const ip = extractIp(req);
    const result = checkRateLimit(ip, options?.limitPerHour);

    if (!result.allowed) {
      const rateLimitError = new RateLimitError(result.retryAfterSeconds ?? 3600);
      return new Response(
        JSON.stringify(rateLimitError.toClientSafeObject()),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(result.retryAfterSeconds ?? 3600),
            'X-RateLimit-Limit': String(config.RATE_LIMIT_REQUESTS_PER_HOUR),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(
              Math.floor(Date.now() / 1000) + (result.resetInSeconds),
            ),
          },
        },
      );
    }

    return handler(req);
  };
}
