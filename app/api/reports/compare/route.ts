/**
 * GET /api/reports/compare
 *
 * Returns the full reports for 2–7 devices on the same date, side-by-side.
 * Used by the Comparison dashboard page.
 *
 * Query params (compareQuerySchema):
 *   device_ids: repeated UUID query params (e.g. ?device_ids=x&device_ids=y)
 *               minimum 2, maximum 7
 *   date:       ISO date (optional — defaults to today when not provided)
 *
 * Devices with no report on the requested date are silently omitted from the
 * response. The client handles partial results gracefully.
 *
 * Auth: Supabase session required.
 */

import { parseSchema, compareQuerySchema } from '@/lib/validation';
import { compareDevices } from '@/lib/services';
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
  const path          = '/api/reports/compare';

  const authResult = await requireSession(request);
  if (!authResult.ok) {
    logRequest('GET', path, 401, Date.now() - start, correlationId);
    return jsonErr(authResult.error);
  }

  const url = new URL(request.url);

  // device_ids is sent as repeated query params — collect all values
  const rawParams: Record<string, string | string[]> = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (key === 'device_ids') {
      const existing = rawParams['device_ids'];
      if (existing === undefined) {
        rawParams['device_ids'] = value;
      } else if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        rawParams['device_ids'] = [existing, value];
      }
    } else {
      rawParams[key] = value;
    }
  }

  const queryResult = parseSchema(compareQuerySchema, rawParams);
  if (!queryResult.ok) {
    logRequest('GET', path, 400, Date.now() - start, correlationId);
    return jsonErr(queryResult.error);
  }

  const { device_ids, date } = queryResult.value;
  const result = await compareDevices(device_ids as readonly string[], date);

  const status = result.ok ? 200 : result.error.httpStatus;
  logRequest('GET', path, status, Date.now() - start, correlationId);

  if (!result.ok) return jsonErr(result.error);
  return jsonOk(result.value);
}
