/**
 * Validation schema for GET /api/logs.
 *
 * Returns paginated system_logs rows. Supports filtering by event type,
 * severity, device, and date range.
 */

import { z } from 'zod';
import {
  uuidSchema,
  logSeverityDbSchema,
  logEventTypeDbSchema,
  paginationSchema,
  dateRangeFields,
  isValidDateRange,
} from './common.schema';

export const logsQuerySchema = paginationSchema
  .merge(dateRangeFields)
  .extend({
    /** Filter to logs produced by (or related to) a specific device. */
    device_id: uuidSchema.optional(),

    /** Filter by the type of system event that generated the log entry. */
    event_type: logEventTypeDbSchema.optional(),

    /** Filter by log severity level. */
    severity: logSeverityDbSchema.optional(),
  })
  .refine(
    ({ from, to }) => isValidDateRange(from, to),
    { message: '`from` must not be after `to`.', path: ['from'] },
  );

export type LogsQuery = z.infer<typeof logsQuerySchema>;
