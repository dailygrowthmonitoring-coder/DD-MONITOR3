/**
 * Validation schemas for report-related endpoints.
 *
 * Covers:
 *   GET /api/devices/[id]/reports           — list reports for a device
 *   GET /api/devices/[id]/reports/[date]    — fetch a single report by date
 */

import { z } from 'zod';
import { isoDateSchema, paginationSchema, dateRangeFields, isValidDateRange } from './common.schema';

// ---------------------------------------------------------------------------
// GET /api/devices/[id]/reports
// ---------------------------------------------------------------------------

export const reportsQuerySchema = paginationSchema.merge(dateRangeFields).refine(
  ({ from, to }) => isValidDateRange(from, to),
  { message: '`from` must not be after `to`.', path: ['from'] },
);

export type ReportsQuery = z.infer<typeof reportsQuerySchema>;

// ---------------------------------------------------------------------------
// Path params: [date] segment in /api/devices/[id]/reports/[date]
// ---------------------------------------------------------------------------

/** Validates the [date] path segment. Must be an ISO calendar date. */
export const reportDateParamSchema = z.object({
  date: isoDateSchema,
});

export type ReportDateParam = z.infer<typeof reportDateParamSchema>;
