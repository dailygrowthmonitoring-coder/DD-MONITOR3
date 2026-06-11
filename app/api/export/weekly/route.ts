/**
 * POST /api/export/weekly
 *
 * Generates and returns the weekly fleet HTML report.
 * Called by the Google Apps Script scheduler every Monday 08:00 Baghdad time.
 *
 * Security: x-api-key header (same shared secret as /api/ingest).
 * No session required — this is a machine-to-machine call.
 *
 * Returns:
 *   200 text/html — the complete fleet report document
 *   401 — invalid or missing x-api-key
 *   500 — generation failure
 */

import { NextResponse } from 'next/server';
import { generateWeeklyReport } from '@/lib/services';
import {
  requireApiKey,
  jsonErr,
  logRequest,
} from '../../_lib/route-helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const start         = Date.now();
  const correlationId = crypto.randomUUID();
  const path          = '/api/export/weekly';

  const authResult = requireApiKey(request);
  if (!authResult.ok) {
    logRequest('POST', path, 401, Date.now() - start, correlationId);
    return jsonErr(authResult.error);
  }

  const result = await generateWeeklyReport();

  const status = result.ok ? 200 : result.error.httpStatus;
  logRequest('POST', path, status, Date.now() - start, correlationId);

  if (!result.ok) return jsonErr(result.error);

  const weekStr = result.value.reportDate;

  return new NextResponse(result.value.htmlContent, {
    status: 200,
    headers: {
      'Content-Type':        'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="dd-monitor-weekly-${weekStr}.html"`,
      'Cache-Control':       'no-store',
    },
  });
}
