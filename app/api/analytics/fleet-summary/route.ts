/**
 * GET /api/analytics/fleet-summary
 *
 * Returns fleet-wide daily KPI summaries for the Overview page stat cards
 * and trend charts. Each row covers one day with aggregated storage and
 * health counts across all active devices.
 *
 * Query params:
 *   days: number (default 30, max 40)
 *
 * Auth: Supabase session required.
 */

import { parseSchema, intParam } from '@/lib/validation';
import { getFleetDailySummary } from '@/lib/services';
import { z } from 'zod';
import {
  requireSession,
  jsonOk,
  jsonErr,
  logRequest,
} from '../../_lib/route-helpers';

export const dynamic = 'force-dynamic';

const fleetSummaryQuerySchema = z.object({
  days: intParam({ min: 1, max: 40, default: 30 }),
});

export async function GET(request: Request): Promise<Response> {
  const start         = Date.now();
  const correlationId = crypto.randomUUID();
  const path          = '/api/analytics/fleet-summary';

  const authResult = await requireSession(request);
  if (!authResult.ok) {
    logRequest('GET', path, 401, Date.now() - start, correlationId);
    return jsonErr(authResult.error);
  }

  const url         = new URL(request.url);
  const queryResult = parseSchema(fleetSummaryQuerySchema, Object.fromEntries(url.searchParams));
  if (!queryResult.ok) {
    logRequest('GET', path, 400, Date.now() - start, correlationId);
    return jsonErr(queryResult.error);
  }

  const result = await getFleetDailySummary(queryResult.value.days);

  const status = result.ok ? 200 : result.error.httpStatus;
  logRequest('GET', path, status, Date.now() - start, correlationId);

  if (!result.ok) return jsonErr(result.error);
  return jsonOk(result.value);
}
