/**
 * GET /api/devices/[id]/reports/[date]
 *
 * Returns the complete report for a device on a specific date, including the
 * full parsed_data JSONB. This is the heavy endpoint, only called from the
 * Device Detail page deep-dive view.
 *
 * Path params:
 *   id:   device UUID
 *   date: ISO date string YYYY-MM-DD
 *
 * Returns 404 when no report exists for that device+date combination.
 * Auth: Supabase session required.
 */

import {
  parseSchema,
  deviceIdParamSchema,
  reportDateParamSchema,
  isNotFutureDate,
  isWithinRetentionWindow,
} from '@/lib/validation';
import { getReportByDeviceAndDate } from '@/lib/services';
import { ValidationError } from '@/lib/infrastructure/errors/app-error';
import {
  requireSession,
  jsonOk,
  jsonErr,
  logRequest,
} from '../../../../_lib/route-helpers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; date: string }> },
): Promise<Response> {
  const start         = Date.now();
  const correlationId = crypto.randomUUID();
  const path          = '/api/devices/[id]/reports/[date]';

  const authResult = await requireSession(request);
  if (!authResult.ok) {
    logRequest('GET', path, 401, Date.now() - start, correlationId);
    return jsonErr(authResult.error);
  }

  const { id, date } = await params;

  const idResult = parseSchema(deviceIdParamSchema, { id });
  if (!idResult.ok) {
    logRequest('GET', path, 400, Date.now() - start, correlationId);
    return jsonErr(idResult.error);
  }

  const dateResult = parseSchema(reportDateParamSchema, { date });
  if (!dateResult.ok) {
    logRequest('GET', path, 400, Date.now() - start, correlationId);
    return jsonErr(dateResult.error);
  }

  const { date: reportDate } = dateResult.value;

  if (!isNotFutureDate(reportDate)) {
    const err = new ValidationError([{ field: 'date', message: 'Report date cannot be in the future.' }]);
    logRequest('GET', path, 400, Date.now() - start, correlationId);
    return jsonErr(err);
  }

  if (!isWithinRetentionWindow(reportDate)) {
    const err = new ValidationError([{ field: 'date', message: 'Report date is outside the retention window (40 days).' }]);
    logRequest('GET', path, 400, Date.now() - start, correlationId);
    return jsonErr(err);
  }

  const result = await getReportByDeviceAndDate(idResult.value.id, reportDate);

  const status = result.ok ? 200 : result.error.httpStatus;
  logRequest('GET', path, status, Date.now() - start, correlationId);

  if (!result.ok) return jsonErr(result.error);
  return jsonOk(result.value);
}
