-- =============================================================================
-- DD Monitor — Migration 005: Row Level Security Policies
-- DD Monitor Enterprise System — NOVIX SYSTEMS
-- =============================================================================
-- Every table is protected. No data is accessible to unauthenticated callers.
-- (STANDARDS.md §9.2 + §5.6: "RLS on every table. No table is left unprotected.")
--
-- Policy model:
--   authenticated role  → SELECT only (dashboard users with a valid Supabase session)
--   service_role        → ALL operations (used exclusively by /api/ingest server-side)
--   alert_rules         → additional UPDATE for authenticated (Settings page editor)
--   unauthenticated     → no access whatsoever
-- =============================================================================


-- =============================================================================
-- Enable RLS on all 9 application tables
-- =============================================================================

ALTER TABLE dd_devices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE dd_reports          ENABLE ROW LEVEL SECURITY;
ALTER TABLE dd_alerts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE dd_mtrees           ENABLE ROW LEVEL SECURITY;
ALTER TABLE dd_disks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE dd_network_ports    ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules         ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- READ policies — authenticated dashboard users can SELECT from all tables
-- Required for all 8 dashboard pages to function.
-- =============================================================================

CREATE POLICY "authenticated_read_devices"
  ON dd_devices
  FOR SELECT
  USING (auth.role() = 'authenticated');

COMMENT ON POLICY "authenticated_read_devices" ON dd_devices IS
  'Any authenticated Supabase session can read all device rows. '
  'Used by every dashboard page that displays device data.';

CREATE POLICY "authenticated_read_reports"
  ON dd_reports
  FOR SELECT
  USING (auth.role() = 'authenticated');

COMMENT ON POLICY "authenticated_read_reports" ON dd_reports IS
  'Any authenticated session can read all report rows. '
  'Used by History, Device Detail, Compare, and System Health pages.';

CREATE POLICY "authenticated_read_alerts"
  ON dd_alerts
  FOR SELECT
  USING (auth.role() = 'authenticated');

COMMENT ON POLICY "authenticated_read_alerts" ON dd_alerts IS
  'Any authenticated session can read all alert records. '
  'Used by the Alerts page timeline and severity chart.';

CREATE POLICY "authenticated_read_mtrees"
  ON dd_mtrees
  FOR SELECT
  USING (auth.role() = 'authenticated');

COMMENT ON POLICY "authenticated_read_mtrees" ON dd_mtrees IS
  'Any authenticated session can read all MTree records. '
  'Used by the Device Detail MTree section.';

CREATE POLICY "authenticated_read_disks"
  ON dd_disks
  FOR SELECT
  USING (auth.role() = 'authenticated');

COMMENT ON POLICY "authenticated_read_disks" ON dd_disks IS
  'Any authenticated session can read all disk records. '
  'Used by the Device Detail disk grid.';

CREATE POLICY "authenticated_read_network_ports"
  ON dd_network_ports
  FOR SELECT
  USING (auth.role() = 'authenticated');

COMMENT ON POLICY "authenticated_read_network_ports" ON dd_network_ports IS
  'Any authenticated session can read all network port records. '
  'Used by the Device Detail network section.';

CREATE POLICY "authenticated_read_system_logs"
  ON system_logs
  FOR SELECT
  USING (auth.role() = 'authenticated');

COMMENT ON POLICY "authenticated_read_system_logs" ON system_logs IS
  'Any authenticated session can read all system log entries. '
  'Used by the Logs dashboard page.';

CREATE POLICY "authenticated_read_email_notifications"
  ON email_notifications
  FOR SELECT
  USING (auth.role() = 'authenticated');

COMMENT ON POLICY "authenticated_read_email_notifications" ON email_notifications IS
  'Any authenticated session can read all email notification records. '
  'Used by the System Health email history panel.';

CREATE POLICY "authenticated_read_alert_rules"
  ON alert_rules
  FOR SELECT
  USING (auth.role() = 'authenticated');

COMMENT ON POLICY "authenticated_read_alert_rules" ON alert_rules IS
  'Any authenticated session can read all alert rules. '
  'Used by the Alerts page rules panel and Settings page.';


-- =============================================================================
-- WRITE policies — service_role only (server-side /api/ingest and cron jobs)
-- Dashboard users CANNOT write any data directly.
-- =============================================================================

CREATE POLICY "service_role_write_devices"
  ON dd_devices
  FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON POLICY "service_role_write_devices" ON dd_devices IS
  'Only the service_role (used by /api/ingest on the server) may INSERT, UPDATE, or DELETE device rows.';

CREATE POLICY "service_role_write_reports"
  ON dd_reports
  FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON POLICY "service_role_write_reports" ON dd_reports IS
  'Only the service_role may write report rows. Ensures idempotency logic runs in the ingest pipeline only.';

CREATE POLICY "service_role_write_alerts"
  ON dd_alerts
  FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON POLICY "service_role_write_alerts" ON dd_alerts IS
  'Only the service_role may write alert records.';

CREATE POLICY "service_role_write_mtrees"
  ON dd_mtrees
  FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON POLICY "service_role_write_mtrees" ON dd_mtrees IS
  'Only the service_role may write MTree records.';

CREATE POLICY "service_role_write_disks"
  ON dd_disks
  FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON POLICY "service_role_write_disks" ON dd_disks IS
  'Only the service_role may write disk records.';

CREATE POLICY "service_role_write_network_ports"
  ON dd_network_ports
  FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON POLICY "service_role_write_network_ports" ON dd_network_ports IS
  'Only the service_role may write network port records.';

CREATE POLICY "service_role_write_system_logs"
  ON system_logs
  FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON POLICY "service_role_write_system_logs" ON system_logs IS
  'Only the service_role may write system log entries.';

CREATE POLICY "service_role_write_email_notifications"
  ON email_notifications
  FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON POLICY "service_role_write_email_notifications" ON email_notifications IS
  'Only the service_role may write email notification records.';

CREATE POLICY "service_role_write_alert_rules"
  ON alert_rules
  FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON POLICY "service_role_write_alert_rules" ON alert_rules IS
  'service_role may write alert rules (used by seed/migrations and programmatic updates).';


-- =============================================================================
-- SPECIAL: authenticated users may UPDATE alert_rules (Settings page editor)
-- Allows dashboard admins to enable/disable rules and change thresholds without
-- needing a separate service_role call. INSERT and DELETE still require service_role.
-- =============================================================================

CREATE POLICY "authenticated_update_alert_rules"
  ON alert_rules
  FOR UPDATE
  USING     (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

COMMENT ON POLICY "authenticated_update_alert_rules" ON alert_rules IS
  'Authenticated dashboard users may UPDATE alert_rules rows (enable/disable rules, '
  'change thresholds). INSERT and DELETE remain restricted to service_role.';
