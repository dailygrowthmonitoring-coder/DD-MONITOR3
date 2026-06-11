/**
 * POST /api/ingest
 *
 * The primary data ingestion endpoint. Receives a raw autosupport file payload
 * from the Google Apps Script (runs hourly, processes daily email attachments)
 * and runs the full ingestion pipeline.
 *
 * Security layers (enforced in order — any failure returns before next step):
 *   1. Rate limit   — withRateLimit HOF (config.RATE_LIMIT_REQUESTS_PER_HOUR per IP)
 *   2. API key auth — x-api-key header must match config.INGEST_SECRET
 *   3. Zod schema   — ingestBodySchema validates raw_text length and file_name
 *
 * On success: 200 { success: true, data: IngestionOutcome }
 * On error:   appropriate 4xx/5xx { success: false, error: {...} }
 */

import { withRateLimit } from '@/lib/infrastructure/rate-limit/rate-limiter';
import { config } from '@/lib/infrastructure/config/config';
import { parseSchema, ingestBodySchema } from '@/lib/validation';
import { ingest } from '@/lib/services';
import { requireApiKey, jsonOk, jsonErr, logRequest } from '../_lib/route-helpers';

export const dynamic = 'force-dynamic';

async function handler(request: Request): Promise<Response> {
  const start         = Date.now();
  const correlationId = crypto.randomUUID();

  // Step 1: Authenticate via x-api-key
  const authResult = requireApiKey(request);
  if (!authResult.ok) {
    logRequest('POST', '/api/ingest', 401, Date.now() - start, correlationId);
    return jsonErr(authResult.error);
  }

  // Step 2: Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const { ValidationError } = await import('@/lib/infrastructure/errors/app-error');
    const parseErr = new ValidationError([{ field: '_root', message: 'Request body must be valid JSON.' }]);
    logRequest('POST', '/api/ingest', 400, Date.now() - start, correlationId);
    return jsonErr(parseErr);
  }

  const validationResult = parseSchema(ingestBodySchema, body);
  if (!validationResult.ok) {
    logRequest('POST', '/api/ingest', 400, Date.now() - start, correlationId);
    return jsonErr(validationResult.error);
  }

  const { raw_text, file_name } = validationResult.value;

  // Step 3: Run the ingestion pipeline
  const ingestionResult = await ingest(raw_text, file_name);

  const status = ingestionResult.ok ? 200 : ingestionResult.error.httpStatus;
  logRequest('POST', '/api/ingest', status, Date.now() - start, correlationId);

  if (!ingestionResult.ok) return jsonErr(ingestionResult.error);
  return jsonOk(ingestionResult.value);
}

// Wrap the handler with the rate limiter HOF — this is the exported route.
export const POST = withRateLimit(handler, {
  limitPerHour: config.RATE_LIMIT_REQUESTS_PER_HOUR,
});
