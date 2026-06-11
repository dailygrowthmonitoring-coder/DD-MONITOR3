/**
 * GET /api/devices/[id]
 *
 * Returns a single device by UUID with its latest snapshot fields.
 *
 * Auth: Supabase session required.
 * Returns 404 when the device does not exist.
 */

import { parseSchema, deviceIdParamSchema } from '@/lib/validation';
import { getDeviceById } from '@/lib/services';
import {
  requireSession,
  jsonOk,
  jsonErr,
  logRequest,
} from '../../_lib/route-helpers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const start         = Date.now();
  const correlationId = crypto.randomUUID();
  const path          = '/api/devices/[id]';

  const authResult = await requireSession(request);
  if (!authResult.ok) {
    logRequest('GET', path, 401, Date.now() - start, correlationId);
    return jsonErr(authResult.error);
  }

  const { id } = await params;
  const paramsResult = parseSchema(deviceIdParamSchema, { id });
  if (!paramsResult.ok) {
    logRequest('GET', path, 400, Date.now() - start, correlationId);
    return jsonErr(paramsResult.error);
  }

  const result = await getDeviceById(paramsResult.value.id);

  const status = result.ok ? 200 : result.error.httpStatus;
  logRequest('GET', path, status, Date.now() - start, correlationId);

  if (!result.ok) return jsonErr(result.error);
  return jsonOk(result.value);
}
