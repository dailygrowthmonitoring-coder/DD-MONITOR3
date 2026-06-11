/**
 * GET /api/system/health
 *
 * Returns the current system health: fleet-wide device status counts,
 * storage aggregates, and the per-device ingestion pipeline status.
 * Used by the System Health dashboard page.
 *
 * Auth: Supabase session required.
 */

import { getFleetHealthSummary, getIngestionStatus } from '@/lib/services';
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
  const path          = '/api/system/health';

  const authResult = await requireSession(request);
  if (!authResult.ok) {
    logRequest('GET', path, 401, Date.now() - start, correlationId);
    return jsonErr(authResult.error);
  }

  const [summaryResult, ingestionResult] = await Promise.all([
    getFleetHealthSummary(),
    getIngestionStatus(),
  ]);

  if (!summaryResult.ok) {
    logRequest('GET', path, summaryResult.error.httpStatus, Date.now() - start, correlationId);
    return jsonErr(summaryResult.error);
  }
  if (!ingestionResult.ok) {
    logRequest('GET', path, ingestionResult.error.httpStatus, Date.now() - start, correlationId);
    return jsonErr(ingestionResult.error);
  }

  logRequest('GET', path, 200, Date.now() - start, correlationId);
  return jsonOk({
    fleetSummary:     summaryResult.value,
    ingestionStatus:  ingestionResult.value,
    systemTime:       new Date().toISOString(),
  });
}
