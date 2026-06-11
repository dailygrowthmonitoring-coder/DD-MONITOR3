/**
 * POST /api/export/report
 *
 * Generates and returns a device report as a self-contained HTML document.
 * The response uses Content-Disposition: attachment so the browser triggers
 * a download. The user can open the file in a browser and print to PDF.
 *
 * Body (exportBodySchema):
 *   device_id:   UUID
 *   report_date: YYYY-MM-DD
 *
 * Returns:
 *   200 text/html — the complete report document
 *   404 — when no report exists for the given device + date
 *   400 — when input validation fails
 *
 * Auth: Supabase session required.
 */

import { NextResponse } from 'next/server';
import { parseSchema, exportBodySchema } from '@/lib/validation';
import { generateReport, getDeviceById } from '@/lib/services';
import {
  requireSession,
  jsonErr,
  logRequest,
} from '../../_lib/route-helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const start         = Date.now();
  const correlationId = crypto.randomUUID();
  const path          = '/api/export/report';

  const authResult = await requireSession(request);
  if (!authResult.ok) {
    logRequest('POST', path, 401, Date.now() - start, correlationId);
    return jsonErr(authResult.error);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const { ValidationError } = await import('@/lib/infrastructure/errors/app-error');
    const err = new ValidationError([{ field: '_root', message: 'Request body must be valid JSON.' }]);
    logRequest('POST', path, 400, Date.now() - start, correlationId);
    return jsonErr(err);
  }

  const bodyResult = parseSchema(exportBodySchema, body);
  if (!bodyResult.ok) {
    logRequest('POST', path, 400, Date.now() - start, correlationId);
    return jsonErr(bodyResult.error);
  }

  const { device_id, report_date } = bodyResult.value;

  // Look up short name for Content-Disposition file name
  const deviceResult = await getDeviceById(device_id);
  const shortName    = deviceResult.ok ? deviceResult.value.shortName : device_id.substring(0, 8);

  const exportResult = await generateReport(device_id, report_date);

  const status = exportResult.ok ? 200 : exportResult.error.httpStatus;
  logRequest('POST', path, status, Date.now() - start, correlationId);

  if (!exportResult.ok) return jsonErr(exportResult.error);

  return new NextResponse(exportResult.value.htmlContent, {
    status: 200,
    headers: {
      'Content-Type':        'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="dd-monitor-${shortName}-${report_date}.html"`,
      'Cache-Control':       'no-store',
    },
  });
}
