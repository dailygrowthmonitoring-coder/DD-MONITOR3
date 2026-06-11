/**
 * Layer 6 — Validation public API.
 *
 * All consumer code (API routes, services) imports from this barrel.
 * Do not import individual schema or validator files directly.
 */

// Core parse helper
export { parseSchema } from './parse';

// Common building blocks
export {
  uuidSchema,
  isoDateSchema,
  alertSeverityDbSchema,
  logSeverityDbSchema,
  logEventTypeDbSchema,
  booleanParam,
  intParam,
  paginationSchema,
  dateRangeFields,
  dateRangeSchema,
  isValidDateRange,
  type Pagination,
  type DateRange,
} from './schemas/common.schema';

// Ingest
export { ingestBodySchema, type IngestBody } from './schemas/ingest.schema';

// Devices
export {
  devicesQuerySchema,
  deviceIdParamSchema,
  type DevicesQuery,
  type DeviceIdParam,
} from './schemas/devices.schema';

// Reports
export {
  reportsQuerySchema,
  reportDateParamSchema,
  type ReportsQuery,
  type ReportDateParam,
} from './schemas/reports.schema';

// Alerts
export {
  alertsQuerySchema,
  updateAlertRuleBodySchema,
  alertRuleIdParamSchema,
  type AlertsQuery,
  type UpdateAlertRuleBody,
  type AlertRuleIdParam,
} from './schemas/alerts.schema';

// Compare
export { compareQuerySchema, type CompareQuery } from './schemas/compare.schema';

// Export
export { exportBodySchema, type ExportBody } from './schemas/export.schema';

// Logs
export { logsQuerySchema, type LogsQuery } from './schemas/logs.schema';

// Settings
export {
  updateProfileBodySchema,
  updatePasswordBodySchema,
  updateSystemSettingsBodySchema,
  createUserBodySchema,
  updateUserBodySchema,
  userIdParamSchema,
  type UpdateProfileBody,
  type UpdatePasswordBody,
  type UpdateSystemSettingsBody,
  type CreateUserBody,
  type UpdateUserBody,
  type UserIdParam,
  type UserRole,
} from './schemas/settings.schema';

// Validators
export {
  isNotFutureDate,
  isWithinRetentionWindow,
  todayIsoDate,
} from './validators/date.validator';

export {
  isValidHostname,
  isKnownDdHostname,
  extractDdSiteCode,
} from './validators/hostname.validator';
