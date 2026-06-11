-- =============================================================================
-- DD Monitor — Migration 004: Functions & Triggers
-- DD Monitor Enterprise System — NOVIX SYSTEMS
-- =============================================================================
-- Database-side automation: snapshot refresh trigger, updated_at trigger,
-- data retention cleanup, email de-duplication check, and fleet health summary.
-- All functions are SECURITY DEFINER so they run with table-owner privileges
-- regardless of the calling role.
-- =============================================================================


-- =============================================================================
-- TRIGGER FUNCTION 1: refresh_device_snapshot
-- Fires AFTER INSERT OR UPDATE on dd_reports.
-- Updates the snapshot columns on dd_devices so that Overview tiles and the
-- sidebar always show the latest values without querying dd_reports.
-- Only updates when the incoming report is >= the device's current last_report_date
-- (protects against out-of-order late ingests overwriting fresher data).
-- =============================================================================

CREATE OR REPLACE FUNCTION refresh_device_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only overwrite snapshot if this report is as recent as or newer than the
  -- current snapshot. An old report re-ingested must not roll back live metrics.
  IF NEW.report_date >= COALESCE(
      (SELECT last_report_date FROM dd_devices WHERE id = NEW.device_id),
      '1970-01-01'::DATE
    )
  THEN
    UPDATE dd_devices SET
      last_report_date          = NEW.report_date,
      last_seen_at              = NEW.ingested_at,
      last_storage_used_gib     = NEW.storage_used_gib,
      last_storage_total_gib    = NEW.storage_total_gib,
      last_storage_used_percent = NEW.storage_used_percent,
      last_compression_factor   = NEW.comp_total_factor,
      last_active_alerts        = COALESCE(NEW.active_alerts_total, 0),
      last_critical_alerts      = COALESCE(NEW.active_alerts_critical, 0),
      last_warning_alerts       = COALESCE(NEW.active_alerts_warning, 0),
      last_disk_status          = NEW.disk_overall_status,
      last_failed_disks         = COALESCE(NEW.disks_failed, 0),
      last_network_ports_down   = COALESCE(NEW.network_ports_down, 0),
      last_uptime_days          = NEW.uptime_days,
      last_status               = NEW.device_status,
      total_capacity_gib        = COALESCE(NEW.storage_total_gib, total_capacity_gib),
      updated_at                = NOW()
    WHERE id = NEW.device_id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION refresh_device_snapshot() IS
  'Trigger function: keeps dd_devices snapshot columns in sync with the latest '
  'dd_reports row. Only updates when the new report_date >= current snapshot date, '
  'preventing out-of-order late ingests from rolling back live metrics.';

CREATE TRIGGER trg_refresh_device_snapshot
  AFTER INSERT OR UPDATE ON dd_reports
  FOR EACH ROW
  EXECUTE FUNCTION refresh_device_snapshot();

COMMENT ON TRIGGER trg_refresh_device_snapshot ON dd_reports IS
  'After every dd_reports insert or update, refreshes the parent dd_devices snapshot '
  'columns (last_storage_used_percent, last_status, etc.) so Overview reads stay fast.';


-- =============================================================================
-- TRIGGER FUNCTION 2: set_updated_at
-- Generic trigger that keeps updated_at current on any table that has it.
-- Applied to dd_devices and alert_rules.
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_updated_at() IS
  'Generic BEFORE UPDATE trigger that sets updated_at = NOW(). '
  'Attached to dd_devices and alert_rules.';

CREATE TRIGGER trg_devices_updated_at
  BEFORE UPDATE ON dd_devices
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TRIGGER trg_devices_updated_at ON dd_devices IS
  'Automatically maintains dd_devices.updated_at on every UPDATE.';

CREATE TRIGGER trg_alert_rules_updated_at
  BEFORE UPDATE ON alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TRIGGER trg_alert_rules_updated_at ON alert_rules IS
  'Automatically maintains alert_rules.updated_at on every UPDATE.';


-- =============================================================================
-- FUNCTION: cleanup_old_reports
-- Deletes reports (and their cascade children), system logs, and email records
-- older than retention_days (default: 40 days, matching PRD §12 retention target).
-- Returns row counts for the System Health audit log.
-- Called by: scheduled job or Google Apps Script weekly cleanup trigger.
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_reports(retention_days INTEGER DEFAULT 40)
RETURNS TABLE(
  reports_deleted INTEGER,
  logs_deleted    INTEGER,
  emails_deleted  INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reports_deleted INTEGER;
  v_logs_deleted    INTEGER;
  v_emails_deleted  INTEGER;
  v_cutoff_date     DATE        := CURRENT_DATE - retention_days;
  v_cutoff_ts       TIMESTAMPTZ := NOW() - (retention_days || ' days')::INTERVAL;
BEGIN
  -- Delete old reports. Cascades to: dd_alerts, dd_mtrees, dd_disks, dd_network_ports.
  DELETE FROM dd_reports
  WHERE report_date < v_cutoff_date;
  GET DIAGNOSTICS v_reports_deleted = ROW_COUNT;

  -- Delete old system logs (time-based, not date-based).
  DELETE FROM system_logs
  WHERE created_at < v_cutoff_ts;
  GET DIAGNOSTICS v_logs_deleted = ROW_COUNT;

  -- Delete old email notification records.
  DELETE FROM email_notifications
  WHERE sent_at < v_cutoff_ts;
  GET DIAGNOSTICS v_emails_deleted = ROW_COUNT;

  -- Write a cleanup audit log entry so the Logs page shows cleanup history.
  INSERT INTO system_logs (event_type, severity, message, details)
  VALUES (
    'cleanup',
    'INFO',
    format(
      'Retention cleanup completed: %s reports, %s logs, %s emails deleted (cutoff: %s)',
      v_reports_deleted, v_logs_deleted, v_emails_deleted, v_cutoff_date
    ),
    jsonb_build_object(
      'cutoff_date',      v_cutoff_date,
      'retention_days',   retention_days,
      'reports_deleted',  v_reports_deleted,
      'logs_deleted',     v_logs_deleted,
      'emails_deleted',   v_emails_deleted
    )
  );

  RETURN QUERY SELECT v_reports_deleted, v_logs_deleted, v_emails_deleted;
END;
$$;

COMMENT ON FUNCTION cleanup_old_reports(INTEGER) IS
  'Deletes dd_reports (+ cascaded children), system_logs, and email_notifications '
  'older than retention_days (default 40). Writes an audit log entry on completion. '
  'Called by scheduled job or Google Apps Script weekly trigger.';


-- =============================================================================
-- FUNCTION: has_email_been_sent_today
-- De-duplication guard for the NotificationService.
-- Returns TRUE if an email of this type has already been sent for this
-- device+date with status=sent. Prevents double-sends on re-ingest.
-- =============================================================================

CREATE OR REPLACE FUNCTION has_email_been_sent_today(
  p_email_type  TEXT,
  p_device_id   UUID,
  p_report_date DATE
) RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM email_notifications
    WHERE email_type  = p_email_type
      AND device_id   = p_device_id
      AND report_date = p_report_date
      AND status      = 'sent'
  );
END;
$$;

COMMENT ON FUNCTION has_email_been_sent_today(TEXT, UUID, DATE) IS
  'Returns TRUE if an email of the given type was successfully sent for this '
  'device and date. Used by NotificationService to prevent duplicate alerts '
  'on re-ingest of the same device+date.';


-- =============================================================================
-- FUNCTION: get_fleet_health_summary
-- Returns a single-row fleet health snapshot for the System Health page.
-- STABLE because it only reads data and returns the same result within a transaction.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_fleet_health_summary()
RETURNS TABLE(
  total_devices          BIGINT,
  devices_reported_today BIGINT,
  devices_missing_today  BIGINT,
  reports_stored_total   BIGINT,
  oldest_report_date     DATE,
  newest_report_date     DATE,
  devices_critical       BIGINT,
  devices_warning        BIGINT,
  devices_healthy        BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)
     FROM dd_devices
     WHERE is_active = TRUE)                                           AS total_devices,

    (SELECT COUNT(DISTINCT device_id)
     FROM dd_reports
     WHERE report_date = CURRENT_DATE
       AND is_valid    = TRUE)                                         AS devices_reported_today,

    (SELECT COUNT(*)
     FROM dd_devices d
     WHERE d.is_active = TRUE
       AND NOT EXISTS (
         SELECT 1 FROM dd_reports r
         WHERE r.device_id   = d.id
           AND r.report_date = CURRENT_DATE
           AND r.is_valid    = TRUE
       ))                                                              AS devices_missing_today,

    (SELECT COUNT(*)
     FROM dd_reports
     WHERE is_valid = TRUE)                                            AS reports_stored_total,

    (SELECT MIN(report_date)
     FROM dd_reports
     WHERE is_valid = TRUE)                                            AS oldest_report_date,

    (SELECT MAX(report_date)
     FROM dd_reports
     WHERE is_valid = TRUE)                                            AS newest_report_date,

    (SELECT COUNT(*)
     FROM dd_devices
     WHERE last_status = 'critical'
       AND is_active   = TRUE)                                         AS devices_critical,

    (SELECT COUNT(*)
     FROM dd_devices
     WHERE last_status = 'warning'
       AND is_active   = TRUE)                                         AS devices_warning,

    (SELECT COUNT(*)
     FROM dd_devices
     WHERE last_status = 'healthy'
       AND is_active   = TRUE)                                         AS devices_healthy;
END;
$$;

COMMENT ON FUNCTION get_fleet_health_summary() IS
  'Returns fleet health snapshot used by the System Health dashboard page: '
  'device counts, report coverage, oldest/newest report dates, status breakdown.';
