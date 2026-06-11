/**
 * GET /api/devices
 *
 * Returns all active devices with their latest snapshot fields.
 * Used by the Overview page sidebar and the Comparison device selector.
 *
 * Query params (devicesQuerySchema):
 *   active: boolean (default true) — when false, include decommissioned devices
 *           (currently always returns active; decommission flow is not yet built)
 *
 * Auth: Supabase session required.
 */

import { parseSchema, devicesQuerySchema } from '@/lib/validation';
import { listActiveDevices } from '@/lib/services';
import {
  requireSession,
  jsonOk,
  jsonErr,
  logRequest,
} from '../_lib/route-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const start         = Date.now();
  const correlationId = crypto.randomUUID();

  const authResult = await requireSession(request);
  if (!authResult.ok) {
    logRequest('GET', '/api/devices', 401, Date.now() - start, correlationId);
    return jsonErr(authResult.error);
  }

  const url    = new URL(request.url);
  const params = parseSchema(devicesQuerySchema, Object.fromEntries(url.searchParams));
  if (!params.ok) {
    logRequest('GET', '/api/devices', 400, Date.now() - start, correlationId);
    return jsonErr(params.error);
  }

  // params.value.active is available but decommissioned-device queries are not
  // yet supported at the repository level — always return active devices.
  const result = await listActiveDevices();

  const status = result.ok ? 200 : result.error.httpStatus;
  logRequest('GET', '/api/devices', status, Date.now() - start, correlationId);

  if (!result.ok) return jsonErr(result.error);
  return jsonOk(result.value);
}
