/**
 * Validation schemas for alert-related endpoints.
 *
 * Covers:
 *   GET  /api/alerts             — paginated alert list with filters
 *   GET  /api/alerts/rules       — list alert rules
 *   PATCH /api/alerts/rules/[id] — update an alert rule's threshold / enabled state
 */

import { z } from 'zod';
import {
  uuidSchema,
  alertSeverityDbSchema,
  booleanParam,
  paginationSchema,
  dateRangeFields,
  isValidDateRange,
} from './common.schema';

// ---------------------------------------------------------------------------
// GET /api/alerts
// ---------------------------------------------------------------------------

export const alertsQuerySchema = paginationSchema
  .merge(dateRangeFields)
  .extend({
    /** Filter to a single device's alerts. */
    device_id: uuidSchema.optional(),

    /** Filter by severity level. */
    severity: alertSeverityDbSchema.optional(),

    /** When true, only active (not-yet-cleared) alerts are returned. */
    active: booleanParam(false),
  })
  .refine(
    ({ from, to }) => isValidDateRange(from, to),
    { message: '`from` must not be after `to`.', path: ['from'] },
  );

export type AlertsQuery = z.infer<typeof alertsQuerySchema>;

// ---------------------------------------------------------------------------
// PATCH /api/alerts/rules/[id]
// ---------------------------------------------------------------------------

export const updateAlertRuleBodySchema = z
  .object({
    /** Numeric threshold value — meaning is metric-specific (e.g. percent used). */
    threshold: z
      .number({ invalid_type_error: 'threshold must be a number.' })
      .finite({ message: 'threshold must be a finite number.' })
      .min(0, { message: 'threshold must be ≥ 0.' })
      .max(1_000_000, { message: 'threshold must be ≤ 1,000,000.' })
      .optional(),

    /** Enable or disable the rule. Disabled rules are not evaluated at ingest time. */
    is_enabled: z
      .boolean({ invalid_type_error: 'is_enabled must be a boolean.' })
      .optional(),

    /** Override the default severity for this rule. */
    severity: alertSeverityDbSchema.optional(),
  })
  .refine(
    ({ threshold, is_enabled, severity }) =>
      threshold !== undefined || is_enabled !== undefined || severity !== undefined,
    { message: 'At least one of threshold, is_enabled, or severity must be provided.' },
  );

export type UpdateAlertRuleBody = z.infer<typeof updateAlertRuleBodySchema>;

/** Validates the [id] path param for /api/alerts/rules/[id]. */
export const alertRuleIdParamSchema = z.object({
  id: uuidSchema,
});

export type AlertRuleIdParam = z.infer<typeof alertRuleIdParamSchema>;
