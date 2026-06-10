-- ============================================================
-- DD Monitor — Complete Schema v2.0
-- Migration: 002_new_schema.sql
-- ============================================================
-- Drop old tables first (order matters due to FK constraints)
-- ============================================================

DROP TABLE IF EXISTS email_notifications CASCADE;
DROP TABLE IF EXISTS system_logs CASCADE;
DROP TABLE IF EXISTS dd_alerts CASCADE;
DROP TABLE IF EXISTS dd_replication CASCADE;
DROP TABLE IF EXISTS dd_system_health CASCADE;
DROP TABLE IF EXISTS dd_network_ports CASCADE;
DROP TABLE IF EXISTS dd_disk_groups CASCADE;
DROP TABLE IF EXISTS dd_performance_metrics CASCADE;
DROP TABLE IF EXISTS dd_backup_summary CASCADE;
DROP TABLE IF EXISTS dd_mtrees CASCADE;
DROP TABLE IF EXISTS dd_compression CASCADE;
DROP TABLE IF EXISTS dd_storage CASCADE;
DROP TABLE IF EXISTS dd_reports CASCADE;
DROP TABLE IF EXISTS dd_devices CASCADE;
DROP TABLE IF EXISTS alert_rules CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;

-- ============================================================
-- SECTION 1 — CORE TABLES
-- ============================================================

-- 1.1 dd_devices
-- Stores all registered Dell Data Domain devices.
-- One row per physical device, never duplicated.
CREATE TABLE dd_devices (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hostname                 TEXT        NOT NULL UNIQUE,
  model                    TEXT,
  serial_number            TEXT,
  chassis_serial           TEXT,
  os_version               TEXT,
  hw_revision              TEXT,
  location                 TEXT,
  admin_email              TEXT,
  data_encryption_enabled  BOOLEAN     DEFAULT FALSE,
  ha_enabled               BOOLEAN     DEFAULT FALSE,
  is_active                BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.2 dd_reports
-- One row per device per day. The "header" of each report.
-- All detail tables reference this via report_id.
CREATE TABLE dd_reports (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id      UUID        NOT NULL REFERENCES dd_devices(id) ON DELETE CASCADE,
  report_date    DATE        NOT NULL,
  generated_on   TIMESTAMPTZ,
  timezone       TEXT,
  uptime_days    INTEGER,
  is_valid       BOOLEAN     NOT NULL DEFAULT TRUE,
  parse_errors   TEXT,
  ingested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(device_id, report_date)
);

-- ============================================================
-- SECTION 2 — STORAGE & COMPRESSION
-- ============================================================

-- 2.1 dd_storage
-- Storage capacity snapshot per report.
-- Source: SERVER USAGE section + DETAILED STORAGE LAYER section.
CREATE TABLE dd_storage (
  id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id             UUID    NOT NULL REFERENCES dd_reports(id) ON DELETE CASCADE,
  device_id             UUID    NOT NULL REFERENCES dd_devices(id) ON DELETE CASCADE,
  report_date           DATE    NOT NULL,

  -- Filesystem space
  total_gib             NUMERIC(12,1),
  used_gib              NUMERIC(12,1),
  available_gib         NUMERIC(12,1),
  used_percent          NUMERIC(5,1),
  cleanable_gib         NUMERIC(12,1),
  pre_comp_gib          NUMERIC(16,1),
  last_cleaning_at      TIMESTAMPTZ,

  -- Storage hardware (from DETAILED STORAGE LAYER)
  active_tier_size_tib  NUMERIC(10,1),
  active_tier_max_tib   NUMERIC(10,1),
  cache_tier_size_tib   NUMERIC(10,1),

  -- Disk counts
  total_disks           INTEGER,
  in_use_disks          INTEGER,
  spare_disks           INTEGER,
  not_installed_disks   INTEGER,

  -- Cache tier disks
  cache_in_use_disks    INTEGER
);

-- 2.2 dd_compression
-- Compression ratios per report (current + 7d + 24h windows).
-- Source: Filesys Compression section.
CREATE TABLE dd_compression (
  id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id             UUID    NOT NULL REFERENCES dd_reports(id) ON DELETE CASCADE,
  device_id             UUID    NOT NULL REFERENCES dd_devices(id) ON DELETE CASCADE,
  report_date           DATE    NOT NULL,

  period_from           TIMESTAMPTZ,
  period_to             TIMESTAMPTZ,

  -- Currently Used
  cur_pre_comp_gib      NUMERIC(16,1),
  cur_post_comp_gib     NUMERIC(12,1),
  cur_total_factor      NUMERIC(6,1),
  cur_reduction_pct     NUMERIC(5,1),

  -- Last 7 days
  w7_pre_gib            NUMERIC(12,1),
  w7_post_gib           NUMERIC(12,1),
  w7_global_factor      NUMERIC(6,1),
  w7_local_factor       NUMERIC(6,1),
  w7_total_factor       NUMERIC(6,1),
  w7_reduction_pct      NUMERIC(5,1),

  -- Last 24 hours
  w24_pre_gib           NUMERIC(12,1),
  w24_post_gib          NUMERIC(12,1),
  w24_global_factor     NUMERIC(6,1),
  w24_local_factor      NUMERIC(6,1),
  w24_total_factor      NUMERIC(6,1),
  w24_reduction_pct     NUMERIC(5,1)
);

-- 2.3 dd_mtrees
-- One row per MTree per report.
-- Source: Mtree List section.
CREATE TABLE dd_mtrees (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id      UUID    NOT NULL REFERENCES dd_reports(id) ON DELETE CASCADE,
  device_id      UUID    NOT NULL REFERENCES dd_devices(id) ON DELETE CASCADE,
  report_date    DATE    NOT NULL,

  name           TEXT    NOT NULL,
  mtree_id       TEXT,
  status         TEXT,
  pre_comp_gib   NUMERIC(16,1),
  post_comp_gib  NUMERIC(12,1)
);

-- 2.4 dd_disk_groups
-- One row per disk group per report.
-- Source: Storage Show All section.
CREATE TABLE dd_disk_groups (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id     UUID    NOT NULL REFERENCES dd_reports(id) ON DELETE CASCADE,
  device_id     UUID    NOT NULL REFERENCES dd_devices(id) ON DELETE CASCADE,
  report_date   DATE    NOT NULL,

  group_name    TEXT    NOT NULL,
  disk_slots    TEXT,
  disk_count    INTEGER,
  disk_size_tib NUMERIC(8,1),
  tier_type     TEXT    CHECK (tier_type IN ('active', 'cache', 'spare'))
);

-- ============================================================
-- SECTION 3 — PERFORMANCE METRICS
-- ============================================================

-- 3.1 dd_performance_metrics
-- One row per 10-minute interval per device per report day.
-- Source: SYSTEM SHOW PERFORMANCE section (~144 rows per report).
-- This is the most granular table — powers all throughput charts.
CREATE TABLE dd_performance_metrics (
  id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id             UUID    NOT NULL REFERENCES dd_reports(id) ON DELETE CASCADE,
  device_id             UUID    NOT NULL REFERENCES dd_devices(id) ON DELETE CASCADE,
  metric_time           TIMESTAMPTZ NOT NULL,

  -- Throughput
  read_mbps             NUMERIC(10,2),
  write_mbps            NUMERIC(10,2),
  repl_in_mbps          NUMERIC(10,2),
  repl_out_mbps         NUMERIC(10,2),
  repl_precomp_in_mbps  NUMERIC(10,2),
  repl_precomp_out_mbps NUMERIC(10,2),

  -- Compression
  compression_ops       INTEGER,
  pre_comp_used_pct     NUMERIC(8,2),

  -- Cache
  cache_miss_data_in    NUMERIC(10,2),
  cache_miss_data_out   NUMERIC(10,2),
  cache_miss_wait_in    NUMERIC(10,2),
  cache_miss_wait_out   NUMERIC(10,2),

  -- CPU & Disk
  cpu_avg_pct           NUMERIC(5,1),
  cpu_max_pct           NUMERIC(5,1),
  disk_util_pct         NUMERIC(5,1),

  -- Utilization breakdown
  util_thra_pct         NUMERIC(5,1),
  util_unus_pct         NUMERIC(5,1),
  util_ovhd_pct         NUMERIC(5,1),
  util_data_pct         NUMERIC(5,1),
  util_meta_pct         NUMERIC(5,1),

  -- Streams
  streams_read          INTEGER,
  streams_write         INTEGER,
  streams_repl_in       INTEGER,
  streams_repl_out      INTEGER,

  -- Latency
  latency_avg_ms        NUMERIC(8,2),
  latency_max_ms        NUMERIC(8,2),

  -- Global/Local compression factors (10-min window)
  gcomp_pct             NUMERIC(5,1),
  lcomp_pct             NUMERIC(5,1),

  UNIQUE(device_id, metric_time)
);

-- 3.2 dd_backup_summary
-- Daily backup job summary per device.
-- Source: Extracted from DDBoost/MTree activity in the report.
-- Powers the Backup Health page.
CREATE TABLE dd_backup_summary (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       UUID    NOT NULL REFERENCES dd_reports(id) ON DELETE CASCADE,
  device_id       UUID    NOT NULL REFERENCES dd_devices(id) ON DELETE CASCADE,
  report_date     DATE    NOT NULL,

  -- Job counts
  jobs_total      INTEGER DEFAULT 0,
  jobs_ok         INTEGER DEFAULT 0,
  jobs_failed     INTEGER DEFAULT 0,
  jobs_scheduled  INTEGER DEFAULT 0,

  -- Success rate (computed: jobs_ok / jobs_total * 100)
  success_rate_pct NUMERIC(5,1),

  -- Duration stats
  avg_duration_min INTEGER,
  total_data_written_gib NUMERIC(12,1),

  -- Status
  status          TEXT    CHECK (status IN ('ok', 'warning', 'critical', 'scheduled', 'unknown'))
                  DEFAULT 'unknown',

  UNIQUE(device_id, report_date)
);

-- ============================================================
-- SECTION 4 — NETWORK & SYSTEM
-- ============================================================

-- 4.1 dd_network_ports
-- One row per network port per report.
-- Source: Net Show Hardware section.
CREATE TABLE dd_network_ports (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id    UUID    NOT NULL REFERENCES dd_reports(id) ON DELETE CASCADE,
  device_id    UUID    NOT NULL REFERENCES dd_devices(id) ON DELETE CASCADE,
  report_date  DATE    NOT NULL,

  port_name    TEXT    NOT NULL,
  speed        TEXT,
  duplex       TEXT,
  link_status  TEXT,
  mac_address  TEXT,
  port_type    TEXT,
  autoneg      TEXT
);

-- 4.2 dd_system_health
-- System availability, memory, and service status per report.
-- Source: GENERAL STATUS section.
CREATE TABLE dd_system_health (
  id                       UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id                UUID    NOT NULL REFERENCES dd_reports(id) ON DELETE CASCADE,
  device_id                UUID    NOT NULL REFERENCES dd_devices(id) ON DELETE CASCADE,
  report_date              DATE    NOT NULL,

  -- Availability
  availability_since       TIMESTAMPTZ,
  system_avail_pct         NUMERIC(5,1),
  system_avail_excl_pct    NUMERIC(5,1),
  filesystem_avail_pct     NUMERIC(5,1),
  filesystem_avail_excl_pct NUMERIC(5,1),

  -- Memory
  memory_total_mib         INTEGER,
  memory_free_mib          INTEGER,
  memory_inactive_mib      INTEGER,
  swap_total_mib           INTEGER,
  swap_free_mib            INTEGER,

  -- Services
  nfs_status               TEXT,
  cifs_status              TEXT,
  filesystem_verify_status TEXT
);

-- 4.3 dd_replication
-- Replication status per report.
-- Source: Replication Status section.
CREATE TABLE dd_replication (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id        UUID    NOT NULL REFERENCES dd_reports(id) ON DELETE CASCADE,
  device_id        UUID    NOT NULL REFERENCES dd_devices(id) ON DELETE CASCADE,
  report_date      DATE    NOT NULL,

  is_configured    BOOLEAN NOT NULL DEFAULT FALSE,
  destination      TEXT,
  status           TEXT,
  lag_seconds      INTEGER,
  last_sync_at     TIMESTAMPTZ,
  bytes_remaining  BIGINT,
  throughput_mbps  NUMERIC(10,2),
  sync_percent     NUMERIC(5,1)
);

-- ============================================================
-- SECTION 5 — ALERTS
-- ============================================================

-- 5.1 dd_alerts
-- One row per alert per report.
-- Source: Current Alerts + Alerts History sections.
CREATE TABLE dd_alerts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id    UUID        NOT NULL REFERENCES dd_reports(id) ON DELETE CASCADE,
  device_id    UUID        NOT NULL REFERENCES dd_devices(id) ON DELETE CASCADE,
  report_date  DATE        NOT NULL,

  alert_id     TEXT,
  severity     TEXT        NOT NULL CHECK (severity IN ('CRITICAL', 'WARNING', 'INFO')),
  class        TEXT,
  object       TEXT,
  message      TEXT        NOT NULL,
  post_time    TIMESTAMPTZ,
  clear_time   TIMESTAMPTZ,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  status       TEXT        CHECK (status IN ('active', 'cleared'))
               DEFAULT 'active',

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.2 alert_rules
-- Configurable alert thresholds (shown in Settings > alert_rules).
-- Editable by admin from the dashboard.
CREATE TABLE alert_rules (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  metric      TEXT    NOT NULL,
  operator    TEXT    NOT NULL CHECK (operator IN ('>', '<', '>=', '<=')),
  threshold   NUMERIC(10,2) NOT NULL,
  severity    TEXT    NOT NULL CHECK (severity IN ('CRITICAL', 'WARNING', 'INFO')),
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default alert rules (matching the UI)
INSERT INTO alert_rules (metric, operator, threshold, severity, description) VALUES
  ('storage_pct',  '>',  90, 'WARNING',  'Storage usage exceeds 90%'),
  ('storage_pct',  '>',  95, 'CRITICAL', 'Storage usage exceeds 95%'),
  ('backup_failed','>',   2, 'WARNING',  'More than 2 backup failures'),
  ('repl_lag_min', '>',  30, 'WARNING',  'Replication lag exceeds 30 minutes');

-- ============================================================
-- SECTION 6 — SYSTEM OPERATIONS
-- ============================================================

-- 6.1 system_logs
-- Internal system events: ingestion, parsing, errors, cleanup.
CREATE TABLE system_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT        NOT NULL,
  device_id   UUID        REFERENCES dd_devices(id) ON DELETE SET NULL,
  message     TEXT        NOT NULL,
  details     JSONB,
  severity    TEXT        NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'ERROR')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6.2 email_notifications
-- Record of every email sent by the system.
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

-- ============================================================
-- SECTION 7 — USERS & SETTINGS
-- ============================================================

-- 7.1 user_profiles
-- Extended profile for Supabase auth users.
CREATE TABLE user_profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  role        TEXT        NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7.2 system_settings
-- Key-value store for all configurable system parameters.
CREATE TABLE system_settings (
  key         TEXT        PRIMARY KEY,
  value       TEXT        NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID        REFERENCES auth.users(id)
);

INSERT INTO system_settings (key, value, description) VALUES
  ('alert_emails',          '',    'Comma-separated list of alert recipient emails'),
  ('report_deadline_hour',  '10',  'Hour (0-23) after which missing report alert is sent (Baghdad time)'),
  ('data_retention_days',   '40',  'Number of days to retain report data'),
  ('telegram_bot_enabled',  'false','Enable Telegram bot alerts'),
  ('telegram_chat_id',      '',    'Telegram chat ID for alerts'),
  ('auto_ingestion',        'true','Automatically process new reports'),
  ('dedup_detection',       'true','Skip already-processed files'),
  ('email_alerts',          'true','Send email alert notifications')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- SECTION 8 — INDEXES
-- ============================================================

-- dd_reports
CREATE INDEX idx_reports_device_date     ON dd_reports(device_id, report_date DESC);
CREATE INDEX idx_reports_date            ON dd_reports(report_date DESC);
CREATE INDEX idx_reports_valid           ON dd_reports(is_valid);

-- dd_storage
CREATE INDEX idx_storage_device_date     ON dd_storage(device_id, report_date DESC);
CREATE INDEX idx_storage_used_pct        ON dd_storage(used_percent DESC);

-- dd_compression
CREATE INDEX idx_compression_device_date ON dd_compression(device_id, report_date DESC);

-- dd_mtrees
CREATE INDEX idx_mtrees_device_date      ON dd_mtrees(device_id, report_date DESC);
CREATE INDEX idx_mtrees_name             ON dd_mtrees(name);

-- dd_performance_metrics (most queried table)
CREATE INDEX idx_perf_device_time        ON dd_performance_metrics(device_id, metric_time DESC);
CREATE INDEX idx_perf_time               ON dd_performance_metrics(metric_time DESC);
CREATE INDEX idx_perf_report             ON dd_performance_metrics(report_id);

-- dd_backup_summary
CREATE INDEX idx_backup_device_date      ON dd_backup_summary(device_id, report_date DESC);
CREATE INDEX idx_backup_status           ON dd_backup_summary(status);

-- dd_alerts
CREATE INDEX idx_alerts_device           ON dd_alerts(device_id);
CREATE INDEX idx_alerts_severity         ON dd_alerts(severity);
CREATE INDEX idx_alerts_active           ON dd_alerts(is_active);
CREATE INDEX idx_alerts_device_date      ON dd_alerts(device_id, report_date DESC);
CREATE INDEX idx_alerts_report           ON dd_alerts(report_id);

-- dd_network_ports
CREATE INDEX idx_ports_device_date       ON dd_network_ports(device_id, report_date DESC);

-- dd_system_health
CREATE INDEX idx_health_device_date      ON dd_system_health(device_id, report_date DESC);

-- dd_replication
CREATE INDEX idx_repl_device_date        ON dd_replication(device_id, report_date DESC);
CREATE INDEX idx_repl_configured         ON dd_replication(is_configured);

-- dd_disk_groups
CREATE INDEX idx_diskgroups_device_date  ON dd_disk_groups(device_id, report_date DESC);

-- system_logs
CREATE INDEX idx_logs_created            ON system_logs(created_at DESC);
CREATE INDEX idx_logs_type               ON system_logs(event_type);
CREATE INDEX idx_logs_device             ON system_logs(device_id);
CREATE INDEX idx_logs_severity           ON system_logs(severity);

-- email_notifications
CREATE INDEX idx_email_sent              ON email_notifications(sent_at DESC);
CREATE INDEX idx_email_device            ON email_notifications(device_id);

-- dd_devices
CREATE INDEX idx_devices_active          ON dd_devices(is_active);
CREATE INDEX idx_devices_hostname        ON dd_devices(hostname);

-- ============================================================
-- SECTION 9 — ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE dd_devices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE dd_reports          ENABLE ROW LEVEL SECURITY;
ALTER TABLE dd_storage          ENABLE ROW LEVEL SECURITY;
ALTER TABLE dd_compression      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dd_mtrees           ENABLE ROW LEVEL SECURITY;
ALTER TABLE dd_disk_groups      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dd_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE dd_backup_summary   ENABLE ROW LEVEL SECURITY;
ALTER TABLE dd_network_ports    ENABLE ROW LEVEL SECURITY;
ALTER TABLE dd_system_health    ENABLE ROW LEVEL SECURITY;
ALTER TABLE dd_replication      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dd_alerts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings     ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all monitoring data
CREATE POLICY "auth_read" ON dd_devices          FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read" ON dd_reports          FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read" ON dd_storage          FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read" ON dd_compression      FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read" ON dd_mtrees           FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read" ON dd_disk_groups      FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read" ON dd_performance_metrics FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read" ON dd_backup_summary   FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read" ON dd_network_ports    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read" ON dd_system_health    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read" ON dd_replication      FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read" ON dd_alerts           FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read" ON alert_rules         FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read" ON system_logs         FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read" ON email_notifications FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read" ON system_settings     FOR SELECT USING (auth.role() = 'authenticated');

-- User can read own profile
CREATE POLICY "user_read_own" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Service role manages everything (used by API)
CREATE POLICY "service_all" ON dd_devices          FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all" ON dd_reports          FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all" ON dd_storage          FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all" ON dd_compression      FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all" ON dd_mtrees           FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all" ON dd_disk_groups      FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all" ON dd_performance_metrics FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all" ON dd_backup_summary   FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all" ON dd_network_ports    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all" ON dd_system_health    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all" ON dd_replication      FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all" ON dd_alerts           FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all" ON alert_rules         FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all" ON system_logs         FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all" ON email_notifications FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all" ON user_profiles       FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all" ON system_settings     FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- SECTION 10 — CLEANUP FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  retention_days INTEGER;
  cutoff_date    DATE;
BEGIN
  SELECT value::INTEGER INTO retention_days
  FROM system_settings WHERE key = 'data_retention_days';

  IF retention_days IS NULL THEN
    retention_days := 40;
  END IF;

  cutoff_date := CURRENT_DATE - retention_days;

  -- Delete old reports (cascades to all detail tables)
  DELETE FROM dd_reports WHERE report_date < cutoff_date;

  -- Delete old performance metrics directly (high-volume table)
  DELETE FROM dd_performance_metrics WHERE metric_time < cutoff_date::TIMESTAMPTZ;

  -- Delete old system logs
  DELETE FROM system_logs WHERE created_at < (NOW() - (retention_days || ' days')::INTERVAL);

  RAISE NOTICE 'Cleanup complete. Removed data older than %', cutoff_date;
END;
$$;

-- ============================================================
-- SECTION 11 — USEFUL VIEWS
-- ============================================================

-- Latest storage per device (for Overview page)
CREATE OR REPLACE VIEW v_latest_storage AS
SELECT DISTINCT ON (s.device_id)
  s.device_id,
  d.hostname,
  d.location,
  s.report_date,
  s.total_gib,
  s.used_gib,
  s.available_gib,
  s.used_percent,
  s.pre_comp_gib,
  s.cleanable_gib
FROM dd_storage s
JOIN dd_devices d ON d.id = s.device_id
WHERE d.is_active = TRUE
ORDER BY s.device_id, s.report_date DESC;

-- Latest compression per device
CREATE OR REPLACE VIEW v_latest_compression AS
SELECT DISTINCT ON (c.device_id)
  c.device_id,
  d.hostname,
  c.report_date,
  c.cur_total_factor,
  c.cur_reduction_pct,
  c.w24_pre_gib,
  c.w24_post_gib,
  c.w24_total_factor,
  c.w7_total_factor
FROM dd_compression c
JOIN dd_devices d ON d.id = c.device_id
WHERE d.is_active = TRUE
ORDER BY c.device_id, c.report_date DESC;

-- Active alerts summary per device
CREATE OR REPLACE VIEW v_active_alerts_summary AS
SELECT
  device_id,
  COUNT(*) FILTER (WHERE severity = 'CRITICAL') AS critical_count,
  COUNT(*) FILTER (WHERE severity = 'WARNING')  AS warning_count,
  COUNT(*) FILTER (WHERE severity = 'INFO')     AS info_count,
  COUNT(*)                                       AS total_count
FROM dd_alerts
WHERE is_active = TRUE
GROUP BY device_id;

-- Device overview (combines all latest data — powers Overview page)
CREATE OR REPLACE VIEW v_device_overview AS
SELECT
  d.id,
  d.hostname,
  d.location,
  d.model,
  d.is_active,
  s.report_date      AS last_report_date,
  s.used_percent     AS storage_used_pct,
  s.total_gib,
  s.used_gib,
  s.available_gib,
  c.cur_total_factor AS compression_ratio,
  c.cur_reduction_pct,
  COALESCE(a.critical_count, 0) AS critical_alerts,
  COALESCE(a.warning_count,  0) AS warning_alerts,
  COALESCE(a.total_count,    0) AS total_alerts,
  b.jobs_ok,
  b.jobs_failed,
  b.success_rate_pct AS backup_success_pct,
  -- Device status: critical > warning > ok > unknown
  CASE
    WHEN a.critical_count > 0 OR s.used_percent >= 95 THEN 'critical'
    WHEN a.warning_count  > 0 OR s.used_percent >= 80 THEN 'warning'
    WHEN s.report_date IS NOT NULL                    THEN 'ok'
    ELSE 'unknown'
  END AS device_status
FROM dd_devices d
LEFT JOIN v_latest_storage      s ON s.device_id = d.id
LEFT JOIN v_latest_compression  c ON c.device_id = d.id
LEFT JOIN v_active_alerts_summary a ON a.device_id = d.id
LEFT JOIN (
  SELECT DISTINCT ON (device_id) *
  FROM dd_backup_summary
  ORDER BY device_id, report_date DESC
) b ON b.device_id = d.id
WHERE d.is_active = TRUE;
