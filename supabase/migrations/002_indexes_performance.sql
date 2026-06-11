-- =============================================================================
-- DD Monitor — Migration 002: Indexes for Dashboard Performance
-- DD Monitor Enterprise System — NOVIX SYSTEMS
-- =============================================================================
-- Every index is justified by a named dashboard query or ingest pipeline path.
-- STANDARDS.md §8.4: "Index every column used in a WHERE, ORDER BY, or JOIN
-- on hot paths. Each index is justified by a real query."
-- =============================================================================


-- =============================================================================
-- dd_devices indexes
-- =============================================================================

-- Filters the device list to active devices only on every page load.
CREATE INDEX idx_devices_active
  ON dd_devices(is_active)
  WHERE is_active = TRUE;

-- Overview page: filter tiles by status color (red/amber/green fleet health).
CREATE INDEX idx_devices_status
  ON dd_devices(last_status)
  WHERE is_active = TRUE;

-- Ingest pipeline findOrCreateDevice(): looks up device by FQDN before every ingest.
CREATE INDEX idx_devices_hostname
  ON dd_devices(hostname);

-- Compare page / System Health: joins devices with storage percent for ranking.
CREATE INDEX idx_devices_used_percent
  ON dd_devices(last_storage_used_percent DESC NULLS LAST)
  WHERE is_active = TRUE;


-- =============================================================================
-- dd_reports indexes
-- =============================================================================

-- MOST CRITICAL INDEX. History page: fetch last N days for one device.
-- Also used by ingest pipeline idempotency check (device_id + report_date lookup).
CREATE INDEX idx_reports_device_date
  ON dd_reports(device_id, report_date DESC);

-- System Health page: "did all devices report today?" — scans by date across all devices.
CREATE INDEX idx_reports_date
  ON dd_reports(report_date DESC);

-- Overview fleet status aggregation: count of devices per status for today's date.
CREATE INDEX idx_reports_status
  ON dd_reports(device_status, report_date DESC);

-- Compare page: sort devices by storage utilization for a given date range.
CREATE INDEX idx_reports_used_percent
  ON dd_reports(storage_used_percent DESC, report_date DESC)
  WHERE is_valid = TRUE;

-- History page compression trend chart: plot comp_total_factor over time per device.
CREATE INDEX idx_reports_compression
  ON dd_reports(device_id, comp_total_factor, report_date DESC)
  WHERE is_valid = TRUE;

-- Reports page: most recently ingested files, sorted by ingest time.
CREATE INDEX idx_reports_ingested
  ON dd_reports(ingested_at DESC);

-- Ingest pipeline deduplication: check raw_text_hash before re-parsing same file.
CREATE INDEX idx_reports_hash
  ON dd_reports(raw_text_hash)
  WHERE raw_text_hash IS NOT NULL;

-- Pre-comp storage trend used by History analytics service.
CREATE INDEX idx_reports_device_pre_comp
  ON dd_reports(device_id, storage_pre_comp_gib, report_date DESC)
  WHERE is_valid = TRUE;

-- Fleet daily summary aggregation (backs the fleet_daily_summary materialized view refresh).
CREATE INDEX idx_reports_date_valid
  ON dd_reports(report_date DESC, device_status)
  WHERE is_valid = TRUE;

-- GIN index for JSONB queries on the Device Detail page (deep-dive into parsed_data).
-- Used ONLY by the detail page; never by list/chart queries.
CREATE INDEX idx_reports_parsed_gin
  ON dd_reports USING GIN (parsed_data);


-- =============================================================================
-- dd_alerts indexes
-- =============================================================================

-- Alerts page filtered by device: fetch all alerts for one device, newest first.
CREATE INDEX idx_alerts_device_date
  ON dd_alerts(device_id, report_date DESC);

-- Alerts page severity filter + active-only filter combination.
CREATE INDEX idx_alerts_severity_active
  ON dd_alerts(severity, is_active, report_date DESC);

-- Overview alerts panel: active alerts only, fleet-wide, newest first.
CREATE INDEX idx_alerts_active
  ON dd_alerts(is_active, report_date DESC)
  WHERE is_active = TRUE;

-- Ingest pipeline: replace all child alert rows for a report (WHERE report_id = ?).
CREATE INDEX idx_alerts_report
  ON dd_alerts(report_id);

-- Alerts page timeline: sort active alerts by when they fired on the appliance.
CREATE INDEX idx_alerts_post_time
  ON dd_alerts(post_time DESC)
  WHERE is_active = TRUE;

-- Alert trend chart: count alerts by severity per device per day.
CREATE INDEX idx_alerts_device_severity_date
  ON dd_alerts(device_id, severity, report_date DESC);


-- =============================================================================
-- dd_mtrees indexes
-- =============================================================================

-- Ingest pipeline: delete + replace all mtrees for a report.
CREATE INDEX idx_mtrees_report
  ON dd_mtrees(report_id);

-- Device Detail MTree tab: fetch mtrees for one device on a specific date.
CREATE INDEX idx_mtrees_device
  ON dd_mtrees(device_id, report_date DESC);


-- =============================================================================
-- dd_disks indexes
-- =============================================================================

-- Ingest pipeline: delete + replace all disks for a report.
CREATE INDEX idx_disks_report
  ON dd_disks(report_id);

-- Failed disk alert: query for any failed disks across fleet for today.
CREATE INDEX idx_disks_state_failed
  ON dd_disks(state, report_date DESC)
  WHERE state = 'failed';

-- Device Detail disk grid: fetch all disks for one device on a specific date.
CREATE INDEX idx_disks_device_date
  ON dd_disks(device_id, report_date DESC);


-- =============================================================================
-- dd_network_ports indexes
-- =============================================================================

-- Ingest pipeline: delete + replace all ports for a report.
CREATE INDEX idx_ports_report
  ON dd_network_ports(report_id);

-- Network port down alert: query down ports across fleet for today.
CREATE INDEX idx_ports_down
  ON dd_network_ports(device_id, report_date DESC)
  WHERE is_down = TRUE;

-- Device Detail network tab: fetch all ports for one device on a specific date.
CREATE INDEX idx_ports_device_date
  ON dd_network_ports(device_id, report_date DESC);


-- =============================================================================
-- system_logs indexes
-- =============================================================================

-- Logs page default view: all events, newest first.
CREATE INDEX idx_logs_created
  ON system_logs(created_at DESC);

-- Logs page filtered by type and severity.
CREATE INDEX idx_logs_type_sev
  ON system_logs(event_type, severity, created_at DESC);

-- Logs page filtered by device.
CREATE INDEX idx_logs_device
  ON system_logs(device_id, created_at DESC)
  WHERE device_id IS NOT NULL;

-- Logs page "trace operation": fetch all log entries sharing a correlation_id.
CREATE INDEX idx_logs_correlation
  ON system_logs(correlation_id)
  WHERE correlation_id IS NOT NULL;


-- =============================================================================
-- email_notifications indexes
-- =============================================================================

-- De-duplication check before sending: has_email_been_sent_today() uses this.
-- Composite covers the full de-dup key: (email_type, device_id, report_date).
CREATE INDEX idx_email_type_device_date
  ON email_notifications(email_type, device_id, report_date);

-- System Health email history panel: latest emails first.
CREATE INDEX idx_email_sent
  ON email_notifications(sent_at DESC);


-- =============================================================================
-- alert_rules indexes
-- =============================================================================

-- AlertEngine loads enabled rules at ingest time.
CREATE INDEX idx_alert_rules_enabled
  ON alert_rules(is_enabled)
  WHERE is_enabled = TRUE;
