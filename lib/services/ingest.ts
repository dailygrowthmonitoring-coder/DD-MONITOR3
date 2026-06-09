import { parseReport } from '@/lib/parser/index'
import { findOrCreateDevice } from './devices'
import { upsertReport } from './reports'
import { replaceAlertsForReport } from './alerts'
import { logEvent } from './log'
import type { DDReportInsert, Json } from '@/lib/supabase/types'

function extractHostnameFromFilename(filename: string): string {
  return filename.replace(/\.txt$/i, '').split('_').pop() ?? filename
}

export interface IngestResult {
  success: boolean
  device_id: string
  hostname: string
  report_date: string
  parse_errors: string[]
}

export async function processIngest(
  rawText: string,
  filename: string
): Promise<IngestResult> {
  const { data: parsed, parse_errors } = parseReport(rawText)

  const hostname = parsed.meta.hostname || extractHostnameFromFilename(filename)
  const reportDate = parsed.meta.generated_on.slice(0, 10)

  const device = await findOrCreateDevice({
    hostname,
    model: parsed.meta.model ?? undefined,
    serial_number: parsed.meta.serial_number ?? undefined,
    location: parsed.meta.location ?? undefined,
  })

  const reportInsert: DDReportInsert = {
    device_id: device.id,
    report_date: reportDate,
    raw_text: rawText,
    parsed_data: parsed as unknown as Json,
    is_valid: parse_errors.length === 0,
    parse_errors: parse_errors.length > 0 ? parse_errors.join('\n') : null,
  }

  const report = await upsertReport(reportInsert)
  await replaceAlertsForReport(device.id, report.id, parsed.alerts.active)

  await logEvent({
    event_type: 'INGEST_SUCCESS',
    device_id: device.id,
    message: `Report ingested: ${hostname} on ${reportDate}`,
    details: { filename, parse_error_count: parse_errors.length },
    severity: parse_errors.length > 0 ? 'WARNING' : 'INFO',
  })

  return {
    success: true,
    device_id: device.id,
    hostname,
    report_date: reportDate,
    parse_errors,
  }
}
