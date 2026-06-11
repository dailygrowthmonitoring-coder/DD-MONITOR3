/**
 * GET /api/devices/[id]/reports
 *
 * Returns the most recent reports for a device (indexed columns only — no JSONB).
 * Used by the History page and the device detail report timeline.
 *
 * Query params (reportsQuerySchema):
 *   from:   ISO date (optional) — lower bound for report_date
 *   to:     ISO date (optional) — upper bound for report_date
 *   limit:  number (default 40, max 40 — matches retention window)
 *   offset: number (default 0)
 *
 * Auth: Supabase session required.
 */

import { parseSchema, deviceIdParamSchema, reportsQuerySchema } from '@/lib/validation';
import { getRecentReports } from '@/lib/services';
import {
  requireSession,
  jsonOk,
  jsonErr,
  logRequest,
  type PaginationMeta,
} from '../../../_lib/route-helpers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const start         = Date.now();
  const correlationId = crypto.randomUUID();
  const path          = '/api/devices/[id]/reports';

  const authResult = await requireSession(request);
  if (!authResult.ok) {
    logRequest('GET', path, 401, Date.now() - start, correlationId);
    return jsonErr(authResult.error);
  }

  const { id } = await params;
  const idResult = parseSchema(deviceIdParamSchema, { id });
  if (!idResult.ok) {
    logRequest('GET', path, 400, Date.now() - start, correlationId);
    return jsonErr(idResult.error);
  }

  const url         = new URL(request.url);
  const queryResult = parseSchema(reportsQuerySchema, Object.fromEntries(url.searchParams));
  if (!queryResult.ok) {
    logRequest('GET', path, 400, Date.now() - start, correlationId);
    return jsonErr(queryResult.error);
  }

  const { limit, offset } = queryResult.value;
  const result = await getRecentReports(idResult.value.id, limit);

  const status = result.ok ? 200 : result.error.httpStatus;
  logRequest('GET', path, status, Date.now() - start, correlationId);

  if (!result.ok) return jsonErr(result.error);

  const data = result.value.slice(offset, offset + limit);
  const meta: PaginationMeta = {
    total:   result.value.length,
    limit,
    offset,
    hasMore: offset + data.length < result.value.length,
  };
  return jsonOk(data, meta);
}
