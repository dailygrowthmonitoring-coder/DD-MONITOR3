/**
 * GET /api/logs
 *
 * Returns paginated system event logs. Used by the Logs dashboard page.
 *
 * Query params (logsQuerySchema):
 *   device_id:  UUID     (optional)
 *   event_type: enum     (ingestion | parse | alert_evaluation | alert_sent | cleanup | auth | export)
 *   severity:   enum     (INFO | WARNING | ERROR)
 *   from:       ISO date (optional)
 *   to:         ISO date (optional)
 *   limit:      number   (default 50, max 200)
 *   offset:     number   (default 0)
 *
 * Auth: Supabase session required.
 */

import { parseSchema, logsQuerySchema } from '@/lib/validation';
import { getLogs } from '@/lib/services';
import type { LogFilters } from '@/lib/services';
import { EventType, LogSeverity } from '@/lib/domain';
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
  const path          = '/api/logs';

  const authResult = await requireSession(request);
  if (!authResult.ok) {
    logRequest('GET', path, 401, Date.now() - start, correlationId);
    return jsonErr(authResult.error);
  }

  const url         = new URL(request.url);
  const queryResult = parseSchema(logsQuerySchema, Object.fromEntries(url.searchParams));
  if (!queryResult.ok) {
    logRequest('GET', path, 400, Date.now() - start, correlationId);
    return jsonErr(queryResult.error);
  }

  const { device_id, event_type, severity, from, to, limit, offset } = queryResult.value;

  const filters: LogFilters = {
    ...(device_id   !== undefined ? { deviceId:   device_id            } : {}),
    ...(event_type  !== undefined ? { eventType:  event_type as EventType   } : {}),
    ...(severity    !== undefined ? { severity:   severity  as LogSeverity  } : {}),
    ...(from        !== undefined ? { fromDate:   from  } : {}),
    ...(to          !== undefined ? { toDate:     to    } : {}),
  };

  const result = await getLogs(filters, limit, offset);

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
