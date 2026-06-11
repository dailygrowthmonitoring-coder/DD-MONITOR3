/**
 * GET /api/analytics/storage-trend
 *
 * Returns storage utilisation trend data for dashboard charts.
 * When device_id is provided, returns trend for that device.
 * When omitted, returns trend rows for all active devices.
 *
 * Results are cached — fast for repeated dashboard loads.
 *
 * Query params:
 *   days:      7 | 14 | 30 | 40 (default 30)
 *   device_id: UUID             (optional)
 *
 * Auth: Supabase session required.
 */

import { parseSchema, uuidSchema, intParam } from '@/lib/validation';
import { getFleetStorageTrend } from '@/lib/services';
import { z } from 'zod';
import {
  requireSession,
  jsonOk,
  jsonErr,
  logRequest,
} from '../../_lib/route-helpers';

export const dynamic = 'force-dynamic';

const storageTrendQuerySchema = z.object({
  days:      intParam({ min: 7, max: 40, default: 30 }),
  device_id: uuidSchema.optional(),
});

export async function GET(request: Request): Promise<Response> {
  const start         = Date.now();
  const correlationId = crypto.randomUUID();
  const path          = '/api/analytics/storage-trend';

  const authResult = await requireSession(request);
  if (!authResult.ok) {
    logRequest('GET', path, 401, Date.now() - start, correlationId);
    return jsonErr(authResult.error);
  }

  const url         = new URL(request.url);
  const queryResult = parseSchema(storageTrendQuerySchema, Object.fromEntries(url.searchParams));
  if (!queryResult.ok) {
    logRequest('GET', path, 400, Date.now() - start, correlationId);
    return jsonErr(queryResult.error);
  }

  const { days, device_id } = queryResult.value;
  const result = await getFleetStorageTrend(days, device_id);

  const status = result.ok ? 200 : result.error.httpStatus;
  logRequest('GET', path, status, Date.now() - start, correlationId);

  if (!result.ok) return jsonErr(result.error);
  return jsonOk(result.value);
}
