-- =============================================================================
-- DD Monitor — Initial Schema
-- Migration:  001_initial_schema.sql
-- =============================================================================


-- =============================================================================
-- SECTION 1 — TABLES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1.1  dd_devices
--      Stores the list of registered Dell Data Domain devices.
-- ---------------------------------------------------------------------------
CREATE TABLE dd_devices (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hostname      TEXT        NOT NULL UNIQUE,
  model         TEXT,
  serial_number TEXT,
  location      TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 1.2  dd_reports
--      One row per device per day. Stores the full parsed autosupport report.
-- ---------------------------------------------------------------------------
CREATE TABLE dd_reports (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id    UUID        NOT NULL REFERENCES dd_devices(id) ON DELETE CASCADE,
  report_date  DATE        NOT NULL,
  raw_text     TEXT,
  parsed_data  JSONB       NOT NULL,
  ingested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_valid     BOOLEAN     NOT NULL DEFAULT TRUE,
  parse_errors TEXT,
  UNIQUE (device_id, report_date)
);

-- ---------------------------------------------------------------------------
-- 1.3  dd_alerts
--      Stores all alerts extracted from parsed reports.
-- ---------------------------------------------------------------------------
CREATE TABLE dd_alerts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id  UUID        NOT NULL REFERENCES dd_devices(id) ON DELETE CASCADE,
  report_id  UUID        NOT NULL REFERENCES dd_reports(id) ON DELETE CASCADE,
  alert_id   TEXT,
  severity   TEXT        NOT NULL CHECK (severity IN ('CRITICAL', 'WARNING', 'INFO')),
  class      TEXT,
  object     TEXT,
  message    TEXT        NOT NULL,
  post_time  TIMESTAMPTZ,
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 1.4  system_logs
--      Tracks all system events: ingestion, parsing, alerts sent, cleanup.
-- ---------------------------------------------------------------------------
CREATE TABLE system_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT        NOT NULL,
  device_id  UUID        REFERENCES dd_devices(id) ON DELETE SET NULL,
  message    TEXT        NOT NULL,
  details    JSONB,
  severity   TEXT        NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'ERROR')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 1.5  email_notifications
--      Tracks all outgoing alert emails sent by the system.
-- ---------------------------------------------------------------------------
CREATE TABLE email_notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type       TEXT        NOT NULL,
  device_id  UUID        REFERENCES dd_devices(id) ON DELETE SET NULL,
  recipients TEXT[],
  subject    TEXT,
  body       TEXT,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status     TEXT        NOT NULL CHECK (status IN ('sent', 'failed'))
);


-- =============================================================================
-- SECTION 2 — INDEXES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 2.1  Indexes defined in PRD.md Section 4
-- ---------------------------------------------------------------------------

-- dd_reports: primary access pattern is by device + date descending
CREATE INDEX idx_dd_reports_device_date ON dd_reports (device_id, report_date DESC);

-- dd_reports: cross-device date queries (overview, history pages)
CREATE INDEX idx_dd_reports_date ON dd_reports (report_date DESC);

-- dd_alerts: filter by device
CREATE INDEX idx_dd_alerts_device ON dd_alerts (device_id);

-- dd_alerts: filter by severity (CRITICAL / WARNING / INFO)
CREATE INDEX idx_dd_alerts_severity ON dd_alerts (severity);

-- dd_alerts: filter active-only alerts
CREATE INDEX idx_dd_alerts_active ON dd_alerts (is_active);

-- system_logs: ordered audit trail (most recent first)
CREATE INDEX idx_system_logs_created ON system_logs (created_at DESC);

-- system_logs: filter by event type
CREATE INDEX idx_system_logs_type ON system_logs (event_type);

-- ---------------------------------------------------------------------------
-- 2.2  Indexes required by STANDARDS.md Section 4.3
--      Every FK column and every filter/order column must be indexed.
-- ---------------------------------------------------------------------------

-- dd_alerts.report_id is a FK with no PRD-defined index
CREATE INDEX idx_dd_alerts_report ON dd_alerts (report_id);

-- system_logs.device_id is a FK — filtered in device-scoped log queries
CREATE INDEX idx_system_logs_device ON system_logs (device_id);

-- email_notifications.device_id is a FK — filtered in notification history
CREATE INDEX idx_email_notifications_device ON email_notifications (device_id);

-- email_notifications.sent_at — ordered in notification history queries
CREATE INDEX idx_email_notifications_sent ON email_notifications (sent_at DESC);

-- dd_devices.is_active — filtered in every device list query
CREATE INDEX idx_dd_devices_active ON dd_devices (is_active);


-- =============================================================================
-- SECTION 3 — ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE dd_devices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE dd_reports          ENABLE ROW LEVEL SECURITY;
ALTER TABLE dd_alerts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- SECTION 4 — RLS POLICIES
-- =============================================================================
-- Pattern (from PRD Section 4.6):
--   SELECT  → authenticated users (dashboard, all tables)
--   INSERT  → service_role only (ingest API)
--   UPDATE  → service_role only (device sync, alert resolution)
--   DELETE  → service_role only (cleanup function)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 4.1  dd_devices
-- ---------------------------------------------------------------------------
CREATE POLICY "dd_devices authenticated select"
  ON dd_devices
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "dd_devices service insert"
  ON dd_devices
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- UPDATE needed: ingest API syncs location, model, serial_number on each report
CREATE POLICY "dd_devices service update"
  ON dd_devices
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 4.2  dd_reports
-- ---------------------------------------------------------------------------
CREATE POLICY "dd_reports authenticated select"
  ON dd_reports
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "dd_reports service insert"
  ON dd_reports
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- DELETE needed: cleanup_old_reports() removes reports older than 40 days
CREATE POLICY "dd_reports service delete"
  ON dd_reports
  FOR DELETE
  USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 4.3  dd_alerts
-- ---------------------------------------------------------------------------
CREATE POLICY "dd_alerts authenticated select"
  ON dd_alerts
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "dd_alerts service insert"
  ON dd_alerts
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- UPDATE needed: alert engine marks alerts as resolved (is_active = false)
CREATE POLICY "dd_alerts service update"
  ON dd_alerts
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- DELETE needed: cleanup_old_reports() removes alerts older than 40 days
CREATE POLICY "dd_alerts service delete"
  ON dd_alerts
  FOR DELETE
  USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 4.4  system_logs
-- ---------------------------------------------------------------------------
CREATE POLICY "system_logs authenticated select"
  ON system_logs
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "system_logs service insert"
  ON system_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- DELETE needed: cleanup_old_reports() removes logs older than 40 days
CREATE POLICY "system_logs service delete"
  ON system_logs
  FOR DELETE
  USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 4.5  email_notifications
-- ---------------------------------------------------------------------------
CREATE POLICY "email_notifications authenticated select"
  ON email_notifications
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "email_notifications service insert"
  ON email_notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');


-- =============================================================================
-- SECTION 5 — CLEANUP FUNCTION  (PRD Section 4.7)
-- =============================================================================
-- SECURITY DEFINER: function runs with owner (postgres) privileges, bypassing
-- RLS. This allows the scheduler to call it without holding a service_role JWT.
-- search_path = public prevents privilege-escalation via schema injection.
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM dd_reports  WHERE report_date < NOW() - INTERVAL '40 days';
  DELETE FROM system_logs WHERE created_at  < NOW() - INTERVAL '40 days';
  DELETE FROM dd_alerts   WHERE created_at  < NOW() - INTERVAL '40 days';
END;
$$;
