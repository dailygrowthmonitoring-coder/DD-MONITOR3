/**
 * Layer 4 — Repositories public API.
 *
 * All consumer code (services) imports from this barrel.
 * Do not import individual repository files directly.
 */

export { createServiceClient, type DDSupabaseClient } from './base.repository';

export { DeviceRepository, deriveShortName } from './device.repository';
export { ReportRepository, type ReportUpsertParams } from './report.repository';
export { AlertRepository, type AlertFilters } from './alert.repository';
export { MTreeRepository } from './mtree.repository';
export { DiskRepository } from './disk.repository';
export { NetworkPortRepository } from './network-port.repository';
export { LogRepository, type LogFilters } from './log.repository';
export { EmailNotificationRepository } from './email-notification.repository';
export { AlertRuleRepository } from './alert-rule.repository';
