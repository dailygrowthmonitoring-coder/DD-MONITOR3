// Service layer barrel export.
// API routes and scheduled jobs import exclusively from this file.

export type {
  IngestionOutcome,
  AlertEvaluationResult,
  StorageTrendPoint,
  CompressionTrendPoint,
  RunwayEstimate,
  DeviceComparisonRow,
  ExportReport,
  FleetStorageTrendRow,
  FleetDailySummaryRow,
  AlertTrendRow,
  FleetHealthSummary,
  IngestionStatusPerDevice,
} from './types';

// Ingestion (write-path)
export { ingest } from './ingestion.service';

// Alert engine (pure, no I/O — also used internally by ingestion service)
export { AlertEngineService } from './alert-engine.service';

// Device reads + alert rule management
export {
  listActiveDevices,
  getDeviceById,
  listAlertRules,
  updateAlertRule,
} from './device.service';

// Report reads + alert queries + multi-device comparison
export {
  getRecentReports,
  getReportByDeviceAndDate,
  getReportDetail,
  getAlertsForReport,
  getAlerts,
  getActiveAlertsForDevice,
  compareDevices,
} from './report.service';

// Analytics: trends, runway, fleet comparison, logs, fleet analytics
export {
  getStorageTrend,
  getCompressionTrend,
  getRunwayEstimate,
  getFleetComparison,
  getLogs,
  invalidateFleetCache,
  getFleetStorageTrend,
  getFleetDailySummary,
  getAlertTrend,
  getFleetCapacity,
  getFleetHealthSummary,
  getIngestionStatus,
} from './analytics.service';

// Notifications (Brevo email, de-duplicated)
export {
  sendAlertNotification,
  sendParseErrorNotification,
} from './notification.service';

// HTML report generation (Export page + weekly fleet report)
export { generateReport, generateWeeklyReport } from './export.service';

// Filter types re-exported so routes never import from lib/repositories directly
export type { AlertFilters } from '@/lib/repositories';
export type { LogFilters } from '@/lib/repositories';
