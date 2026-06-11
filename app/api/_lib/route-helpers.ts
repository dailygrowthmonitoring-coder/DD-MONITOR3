/**
 * Shared helpers for all API route handlers.
 *
 * Every route handler imports from this file instead of touching infrastructure
 * directly. This keeps route files thin by centralising:
 *   - Typed response builders (jsonOk, jsonErr)
 *   - Auth guards (requireSession, requireApiKey)
 *   - Pagination extraction
 *   - Structured request logging
 *
 * Import rules: this file is part of Layer 8 (app/api/). It may import from
 * lib/infrastructure and lib/supabase only. Never from lib/repositories or
 * lib/services directly.
 */

import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import type { User } from '@supabase/supabase-js';

import { type AppError, AuthError } from '@/lib/infrastructure/errors/app-error';
import { ok, err, type Result } from '@/lib/infrastructure/errors/result';
import { logger } from '@/lib/infrastructure/logger/logger';
import { config } from '@/lib/infrastructure/config/config';
import { createApiClient } from './supabase-server';

// ---------------------------------------------------------------------------
// API response shape
// ---------------------------------------------------------------------------

export interface PaginationMeta {
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
}

export interface ApiSuccess<T> {
  readonly success: true;
  readonly data: T;
  readonly meta?: PaginationMeta;
}

export interface ApiError {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly status: number;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ---------------------------------------------------------------------------
// Response builders
// ---------------------------------------------------------------------------

/**
 * Builds a successful JSON response with the standard { success: true, data } shape.
 *
 * @param data   - The payload to include under `data`.
 * @param meta   - Optional pagination metadata (include for paginated endpoints).
 * @param status - HTTP status code (default 200).
 */
export function jsonOk<T>(
  data: T,
  meta?: PaginationMeta,
  status = 200,
): NextResponse<ApiSuccess<T>> {
  const body: ApiSuccess<T> =
    meta !== undefined ? { success: true, data, meta } : { success: true, data };
  return NextResponse.json(body, { status });
}

/**
 * Builds an error JSON response from a typed AppError.
 *
 * Maps the error to its correct HTTP status via `error.httpStatus`.
 * Uses `error.toClientSafeObject()` so no stack trace, SQL, or internal
 * context ever reaches the client.
 *
 * @param error - The typed AppError to map.
 */
export function jsonErr(error: AppError): NextResponse<ApiError> {
  const safeObj = error.toClientSafeObject();
  return NextResponse.json(
    { success: false, error: safeObj },
    { status: error.httpStatus },
  );
}

// ---------------------------------------------------------------------------
// Auth guards
// ---------------------------------------------------------------------------

/**
 * Validates the Supabase session cookie present in the request.
 *
 * Reads cookies via next/headers (available in App Router route handlers).
 * The `request` parameter is accepted for interface consistency but the session
 * is resolved from the Next.js cookie context, not the raw request.
 *
 * @param _request - The incoming Request (unused; session comes from cookies).
 * @returns Ok(User) if a valid session exists, Err(AuthError) otherwise.
 */
export async function requireSession(
  _request: Request,
): Promise<Result<User, AuthError>> {
  try {
    const supabase = await createApiClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error !== null || user === null) {
      return err(AuthError.sessionRequired());
    }
    return ok(user);
  } catch {
    return err(AuthError.sessionRequired());
  }
}

/**
 * Validates the `x-api-key` header against config.INGEST_SECRET.
 *
 * Comparison is done via HMAC-SHA256 hashes to prevent timing-oracle attacks.
 * Returns Err(AuthError) if the header is absent or the key does not match.
 *
 * @param request - The incoming Request to read the header from.
 */
export function requireApiKey(request: Request): Result<true, AuthError> {
  const provided = request.headers.get('x-api-key');
  if (provided === null || provided.trim() === '') {
    return err(AuthError.invalidApiKey());
  }

  // Hash both keys so the comparison is constant-time regardless of content.
  const hashProvided  = createHash('sha256').update(provided).digest();
  const hashExpected  = createHash('sha256').update(config.INGEST_SECRET).digest();

  if (!timingSafeEqual(hashProvided, hashExpected)) {
    return err(AuthError.invalidApiKey());
  }
  return ok(true);
}

// ---------------------------------------------------------------------------
// Pagination helper
// ---------------------------------------------------------------------------

/**
 * Reads `limit` and `offset` query params from a URLSearchParams instance.
 *
 * Applies safe defaults and clamps to the allowed range so routes do not need
 * to repeat this logic.
 *
 * @param searchParams - The URLSearchParams from the request URL.
 * @param maxLimit     - Absolute ceiling for limit (default 200).
 * @param defaultLimit - Fallback limit when the param is absent (default 50).
 */
export function extractPagination(
  searchParams: URLSearchParams,
  maxLimit = 200,
  defaultLimit = 50,
): { limit: number; offset: number } {
  const rawLimit  = searchParams.get('limit');
  const rawOffset = searchParams.get('offset');

  const limit  = Math.min(maxLimit, Math.max(1, rawLimit  !== null ? (parseInt(rawLimit,  10) || defaultLimit) : defaultLimit));
  const offset = Math.max(0,                  rawOffset !== null ? (parseInt(rawOffset, 10) || 0)             : 0);
  return { limit, offset };
}

// ---------------------------------------------------------------------------
// Request logging
// ---------------------------------------------------------------------------

/**
 * Logs a completed API request at INFO level with structured fields.
 *
 * @param method        - HTTP method (GET, POST, PATCH, …).
 * @param path          - Request pathname (e.g. /api/devices).
 * @param status        - HTTP status code returned.
 * @param durationMs    - Wall-clock time from handler entry to response, in ms.
 * @param correlationId - Per-request correlation ID for end-to-end tracing.
 */
export function logRequest(
  method: string,
  path: string,
  status: number,
  durationMs: number,
  correlationId: string,
): void {
  logger.info('API request completed', {
    method,
    path,
    status,
    durationMs,
    correlationId,
  });
}
