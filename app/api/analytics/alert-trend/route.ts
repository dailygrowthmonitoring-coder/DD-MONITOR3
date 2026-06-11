/**
 * GET /api/analytics/alert-trend
 *
 * Returns daily alert counts per severity for the Alerts page chart.
 * Provides a continuous date series (zero-filled) for clean chart rendering.
 *
 * Query params:
 *   days:      number (default 14, max 40)
 *   device_id: UUID   (optional — restrict to one device)
 *
 * Auth: Supabase session required.
 */

import { parseSchema, uuidSchema, intParam } from '@/lib/validation';
import { getAlertTrend } from '@/lib/services';
import { z } from 'zod';
import {
  requireSession,
  jsonOk,
  jsonErr,
  logRequest,
} from '../../_lib/route-helpers';

export const dynamic = 'force-dynamic';

const alertTrendQuerySchema = z.object({
  days:      intParam({ min: 1, max: 40, default: 14 }),
  device_id: uuidSchema.optional(),
});

export async function GET(request: Request): Promise<Response> {
  const start         = Date.now();
  const correlationId = crypto.randomUUID();
  const path          = '/api/analytics/alert-trend';

  const authResult = await requireSession(request);
  if (!authResult.ok) {
    logRequest('GET', path, 401, Date.now() - start, correlationId);
    return jsonErr(authResult.error);
  }

  const url         = new URL(request.url);
  const queryResult = parseSchema(alertTrendQuerySchema, Object.fromEntries(url.searchParams));
  if (!queryResult.ok) {
    logRequest('GET', path, 400, Date.now() - start, correlationId);
    return jsonErr(queryResult.error);
  }

  const { days, device_id } = queryResult.value;
  const result = await getAlertTrend(days, device_id);

  const status = result.ok ? 200 : result.error.httpStatus;
  logRequest('GET', path, status, Date.now() - start, correlationId);

  if (!result.ok) return jsonErr(result.error);
  return jsonOk(result.value);
}
