/**
 * GET /api/health
 *
 * Public uptime endpoint — no authentication required.
 * Returns a minimal liveness response used by Vercel, uptime monitors,
 * and the Google Apps Script ingest client for connectivity checks.
 *
 * Never exposes internal state, version details, or environment values.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: true,
      data: {
        status:    'ok',
        timestamp: new Date().toISOString(),
        version:   '1.0.0',
      },
    },
    { status: 200 },
  );
}
