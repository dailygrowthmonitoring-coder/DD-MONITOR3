/**
 * PATCH /api/alerts/rules/[id]
 *
 * Updates a single alert rule's threshold, enabled state, or severity.
 * Only authenticated dashboard users can modify alert rules (enforced via
 * session auth here and RLS in migration 005).
 *
 * Path params:
 *   id: alert rule UUID
 *
 * Body (updateAlertRuleBodySchema):
 *   threshold?:  number   (positive, metric-dependent meaning)
 *   is_enabled?: boolean
 *   severity?:   CRITICAL|WARNING|INFO
 *
 * Returns 404 when the rule does not exist.
 * Auth: Supabase session required.
 */

import {
  parseSchema,
  alertRuleIdParamSchema,
  updateAlertRuleBodySchema,
} from '@/lib/validation';
import { updateAlertRule } from '@/lib/services';
import { ValidationError } from '@/lib/infrastructure/errors/app-error';
import type { UpdateAlertRule } from '@/lib/domain';
import { AlertSeverity } from '@/lib/domain';
import {
  requireSession,
  jsonOk,
  jsonErr,
  logRequest,
} from '../../../_lib/route-helpers';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const start         = Date.now();
  const correlationId = crypto.randomUUID();
  const path          = '/api/alerts/rules/[id]';

  const authResult = await requireSession(request);
  if (!authResult.ok) {
    logRequest('PATCH', path, 401, Date.now() - start, correlationId);
    return jsonErr(authResult.error);
  }

  const { id } = await params;
  const idResult = parseSchema(alertRuleIdParamSchema, { id });
  if (!idResult.ok) {
    logRequest('PATCH', path, 400, Date.now() - start, correlationId);
    return jsonErr(idResult.error);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const err = new ValidationError([{ field: '_root', message: 'Request body must be valid JSON.' }]);
    logRequest('PATCH', path, 400, Date.now() - start, correlationId);
    return jsonErr(err);
  }

  const bodyResult = parseSchema(updateAlertRuleBodySchema, body);
  if (!bodyResult.ok) {
    logRequest('PATCH', path, 400, Date.now() - start, correlationId);
    return jsonErr(bodyResult.error);
  }

  const { threshold, is_enabled, severity } = bodyResult.value;
  const update: UpdateAlertRule = {
    ...(threshold  !== undefined ? { threshold }             : {}),
    ...(is_enabled !== undefined ? { isEnabled: is_enabled } : {}),
    ...(severity   !== undefined ? { severity: severity as AlertSeverity } : {}),
  };

  const result = await updateAlertRule(idResult.value.id, update);

  const status = result.ok ? 200 : result.error.httpStatus;
  logRequest('PATCH', path, status, Date.now() - start, correlationId);

  if (!result.ok) return jsonErr(result.error);
  return jsonOk(result.value);
}
