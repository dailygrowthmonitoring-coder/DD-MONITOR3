/**
 * GET /api/analytics/capacity
 *
 * Returns storage capacity + runway estimates for all active devices.
 * Used by the Capacity / Storage Runway section of the dashboard.
 *
 * Results are cached after each ingest and invalidated by invalidateFleetCache().
 *
 * Auth: Supabase session required.
 */

import { getFleetCapacity } from '@/lib/services';
import {
  requireSession,
  jsonOk,
  jsonErr,
  logRequest,
} from '../../_lib/route-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const start         = Date.now();
  const correlationId = crypto.randomUUID();
  const path          = '/api/analytics/capacity';

  const authResult = await requireSession(request);
  if (!authResult.ok) {
    logRequest('GET', path, 401, Date.now() - start, correlationId);
    return jsonErr(authResult.error);
  }

  const result = await getFleetCapacity();

  const status = result.ok ? 200 : result.error.httpStatus;
  logRequest('GET', path, status, Date.now() - start, correlationId);

  if (!result.ok) return jsonErr(result.error);
  return jsonOk(result.value);
}
