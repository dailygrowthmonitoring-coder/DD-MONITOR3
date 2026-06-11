/**
 * Validation schema for POST /api/export/pdf.
 *
 * Generates a PDF report for a specific device and date. The report
 * is streamed back as application/pdf.
 */

import { z } from 'zod';
import { uuidSchema, isoDateSchema } from './common.schema';

export const exportBodySchema = z.object({
  /** UUID of the device whose report to export. */
  device_id: uuidSchema,

  /** Date of the report to export (YYYY-MM-DD). */
  report_date: isoDateSchema,
});

export type ExportBody = z.infer<typeof exportBodySchema>;
