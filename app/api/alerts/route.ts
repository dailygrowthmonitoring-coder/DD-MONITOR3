/**
 * GET /api/alerts
 *
 * Returns a paginated, filterable list of alerts across the fleet.
 * Used by the Alerts dashboard page.
 *
 * Query params (alertsQuerySchema):
 *   device_id: UUID           (optional)
 *   severity:  CRITICAL|WARNING|INFO  (optional)
 *   active:    boolean        (default false — true returns only uncleared alerts)
 *   from:      ISO date       (optional)
 *   to:        ISO date       (optional)
 *   limit:     number         (default 50, max 200)
 *   offset:    number         (default 0)
 *
 * Auth: Supabase session required.
 */

import { parseSchema, alertsQuerySchema } from '@/lib/validation';
import { getAlerts } from '@/lib/services';
import type { AlertFilters } from '@/lib/services';
import { AlertSeverity } from '@/lib/domain';
import {
  requireSession,
  jsonOk,
  jsonErr,
  logRequest,
  type PaginationMeta,
} from '../_lib/route-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const start         = Date.now();
  const correlationId = crypto.randomUUID();
  const path          = '/api/alerts';

  const authResult = await requireSession(request);
  if (!authResult.ok) {
    logRequest('GET', path, 401, Date.now() - start, correlationId);
    return jsonErr(authResult.error);
  }

  const url         = new URL(request.url);
  const queryResult = parseSchema(alertsQuerySchema, Object.fromEntries(url.searchParams));
  if (!queryResult.ok) {
    logRequest('GET', path, 400, Date.now() - start, correlationId);
    return jsonErr(queryResult.error);
  }

  const { device_id, severity, active, from, to, limit, offset } = queryResult.value;

  const filters: AlertFilters = {
    ...(device_id !== undefined ? { deviceId: device_id } : {}),
    ...(severity  !== undefined ? { severity: severity as AlertSeverity } : {}),
    ...(active                  ? { isActive: true } : {}),
    ...(from      !== undefined ? { fromDate: from } : {}),
    ...(to        !== undefined ? { toDate:   to   } : {}),
  };

  const result = await getAlerts(filters, limit, offset);

  const status = result.ok ? 200 : result.error.httpStatus;
  logRequest('GET', path, status, Date.now() - start, correlationId);

  if (!result.ok) return jsonErr(result.error);

  const meta: PaginationMeta = {
    total:   result.value.length + offset,
    limit,
    offset,
    hasMore: result.value.length === limit,
  };
  return jsonOk(result.value, meta);
}
