-- =============================================================================
-- DD Monitor — Migration 001: Initial Schema
-- DD Monitor Enterprise System — NOVIX SYSTEMS
-- =============================================================================
-- Creates all 9 application tables with constraints, foreign keys, and comments.
-- Every column is documented; every constraint is intentional.
-- NEVER edit this file after it has been applied — create a new migration instead.
-- =============================================================================

-- Supabase enables pgcrypto and uuid-ossp by default; gen_random_uuid() is
-- a PostgreSQL 13+ built-in requiring no extension.


-- =============================================================================
-- TABLE 1: dd_devices
-- One row per physical Data Domain appliance in the fleet.
-- Used by every page for device identification and fast overview reads.
-- Snapshot columns are refreshed automatically by the refresh_device_snapshot()
-- trigger after every dd_reports insert/update — never query dd_reports
-- for these values on list/overview pages.
-- =============================================================================

CREATE TABLE dd_devices (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hostname                  TEXT        NOT NULL,
  short_name                TEXT        NOT NULL,
  model                     TEXT,
  serial_number             TEXT,
  chassis_serial            TEXT,
  location                  TEXT,
  os_version                TEXT,
  admin_email               TEXT,
  data_encryption_enabled   BOOLEAN,
  ha_enabled                BOOLEAN,
  total_capacity_gib        NUMERIC(12,3),

  -- ── Snapshot columns — denormalized from the most-recent dd_reports row ──
  -- Kept on dd_devices so Overview/sidebar reads touch only one row per device.
  last_report_date          DATE,
  last_seen_at              TIMESTAMPTZ,
  last_storage_used_gib     NUMERIC(12,3),
  last_storage_total_gib    NUMERIC(12,3),
  last_storage_used_percent NUMERIC(5,2),
  last_compression_factor   NUMERIC(8,2),
  last_active_alerts        INTEGER     DEFAULT 0,
  last_critical_alerts      INTEGER     DEFAULT 0,
  last_warning_alerts       INTEGER     DEFAULT 0,
  last_disk_status          TEXT,
  last_failed_disks         INTEGER     DEFAULT 0,
  last_network_ports_down   INTEGER     DEFAULT 0,
  last_uptime_days          INTEGER,
  last_status               TEXT        NOT NULL DEFAULT 'unknown'
    CONSTRAINT chk_devices_status
      CHECK (last_status IN ('healthy','warning','critical','unknown')),

  is_active                 BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_devices_hostname UNIQUE (hostname)
);

COMMENT ON TABLE  dd_devices IS
  'One row per physical Data Domain appliance. Snapshot columns hold the latest '
  'report values so Overview/sidebar reads never join to dd_reports.';

COMMENT ON COLUMN dd_devices.id                      IS 'Surrogate UUID primary key.';
COMMENT ON COLUMN dd_devices.hostname                IS 'Fully-qualified domain name. e.g. DD6300BSR.iq.zain.com. Unique identifier used by the ingest pipeline to find-or-create the device.';
COMMENT ON COLUMN dd_devices.short_name              IS 'Human-readable site code derived from hostname. e.g. BSR. Used in compact tiles and chart labels where the full FQDN does not fit.';
COMMENT ON COLUMN dd_devices.model                   IS 'Hardware model. e.g. DD6300. From protocol.gui.ddem.inventory.1.model in the autosupport file.';
COMMENT ON COLUMN dd_devices.serial_number           IS 'Product serial. e.g. CKM00193901494. From Product Serial field in HARDWARE CONFIGURATION.';
COMMENT ON COLUMN dd_devices.chassis_serial          IS 'Chassis serial. e.g. FCNCS190702089. From Chassis Serial field in HARDWARE CONFIGURATION.';
COMMENT ON COLUMN dd_devices.location                IS 'Physical site. e.g. Basra. From config.snmp.sys_location in the autosupport file.';
COMMENT ON COLUMN dd_devices.os_version              IS 'Data Domain OS version string. e.g. Data Domain OS 6.2.0.30-629757.';
COMMENT ON COLUMN dd_devices.admin_email             IS 'Alert recipient email address for this device. Configured in Settings, not derived from autosupport.';
COMMENT ON COLUMN dd_devices.data_encryption_enabled IS 'Whether inline data encryption is active on this appliance.';
COMMENT ON COLUMN dd_devices.ha_enabled              IS 'Whether HA (high-availability) pairing is active.';
COMMENT ON COLUMN dd_devices.total_capacity_gib      IS 'Physical disk capacity in GiB (from storage_total_gib of latest report). Used for runway calculation.';

COMMENT ON COLUMN dd_devices.last_report_date          IS '[SNAPSHOT] Date of the most recently ingested report. Used by System Health page to detect missing reports.';
COMMENT ON COLUMN dd_devices.last_seen_at              IS '[SNAPSHOT] Timestamp when the last ingestion completed.';
COMMENT ON COLUMN dd_devices.last_storage_used_gib     IS '[SNAPSHOT] Storage used in GiB from the latest report. e.g. 18941.900.';
COMMENT ON COLUMN dd_devices.last_storage_total_gib    IS '[SNAPSHOT] Total capacity in GiB from the latest report.';
COMMENT ON COLUMN dd_devices.last_storage_used_percent IS '[SNAPSHOT] Storage utilization percent. Drives the tile color on Overview (green < 90, amber 90-95, red > 95).';
COMMENT ON COLUMN dd_devices.last_compression_factor   IS '[SNAPSHOT] Current compression factor. e.g. 22.40. Used on Compare page.';
COMMENT ON COLUMN dd_devices.last_active_alerts        IS '[SNAPSHOT] Count of all active alerts. Drives alert badge on device tile.';
COMMENT ON COLUMN dd_devices.last_critical_alerts      IS '[SNAPSHOT] Count of active CRITICAL alerts.';
COMMENT ON COLUMN dd_devices.last_warning_alerts       IS '[SNAPSHOT] Count of active WARNING alerts.';
COMMENT ON COLUMN dd_devices.last_disk_status          IS '[SNAPSHOT] Disk health summary. Normal | Degraded | Critical.';
COMMENT ON COLUMN dd_devices.last_failed_disks         IS '[SNAPSHOT] Count of failed disk slots.';
COMMENT ON COLUMN dd_devices.last_network_ports_down   IS '[SNAPSHOT] Count of network ports not in running state.';
COMMENT ON COLUMN dd_devices.last_uptime_days          IS '[SNAPSHOT] System uptime in days. e.g. 1754.';
COMMENT ON COLUMN dd_devices.last_status               IS '[SNAPSHOT] Overall device health status derived by AlertEngine. One of: healthy | warning | critical | unknown. Drives tile color.';

COMMENT ON COLUMN dd_devices.is_active   IS 'Soft-delete flag. FALSE = device decommissioned; excluded from all active queries.';
COMMENT ON COLUMN dd_devices.created_at  IS 'Row creation timestamp.';
COMMENT ON COLUMN dd_devices.updated_at  IS 'Auto-updated by trg_devices_updated_at trigger.';


-- =============================================================================
-- TABLE 2: dd_reports
-- One row per device per day. The heart of the system.
-- UNIQUE(device_id, report_date) enforces idempotency — re-ingesting the same
-- device+date is an upsert, never a duplicate.
-- Hybrid storage: indexed columns for fast list/chart reads, full ParsedReport
-- JSON in parsed_data for the Device Detail deep-dive page only.
-- =============================================================================

CREATE TABLE dd_reports (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id       UUID        NOT NULL REFERENCES dd_devices(id) ON DELETE CASCADE,
  report_date     DATE        NOT NULL,
  generated_on    TIMESTAMPTZ,
  ingested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  file_name       TEXT,
  file_size_bytes BIGINT,

  -- ── Storage ──────────────────────────────────────────────────────────────
  storage_total_gib          NUMERIC(12,3),
  storage_used_gib           NUMERIC(12,3),
  storage_available_gib      NUMERIC(12,3),
  storage_used_percent       NUMERIC(5,2),
  storage_cleanable_gib      NUMERIC(12,3),
  storage_pre_comp_gib       NUMERIC(12,3),
  storage_last_cleaning      TIMESTAMPTZ,

  -- ── Compression — Currently Used ─────────────────────────────────────────
  comp_period_from           TIMESTAMPTZ,
  comp_period_to             TIMESTAMPTZ,
  comp_total_factor          NUMERIC(8,2),
  comp_reduction_percent     NUMERIC(5,2),
  comp_global_factor         NUMERIC(8,2),
  comp_local_factor          NUMERIC(8,2),

  -- ── Compression — Last 7 Days ────────────────────────────────────────────
  comp_7day_pre_comp_gib     NUMERIC(12,3),
  comp_7day_post_comp_gib    NUMERIC(12,3),
  comp_7day_global_factor    NUMERIC(8,2),
  comp_7day_local_factor     NUMERIC(8,2),
  comp_7day_total_factor     NUMERIC(8,2),
  comp_7day_reduction_pct    NUMERIC(5,2),

  -- ── Compression — Last 24 Hours ──────────────────────────────────────────
  comp_24h_pre_comp_gib      NUMERIC(12,3),
  comp_24h_post_comp_gib     NUMERIC(12,3),
  comp_24h_global_factor     NUMERIC(8,2),
  comp_24h_local_factor      NUMERIC(8,2),
  comp_24h_total_factor      NUMERIC(8,2),
  comp_24h_reduction_pct     NUMERIC(5,2),

  -- ── Disks ─────────────────────────────────────────────────────────────────
  disks_active_total         INTEGER,
  disks_active_in_use        INTEGER,
  disks_active_spare         INTEGER,
  disks_cache_total          INTEGER,
  disks_cache_in_use         INTEGER,
  disks_failed               INTEGER     DEFAULT 0,
  disk_overall_status        TEXT,
  disk_proactive_check_msg   TEXT,

  -- ── System Health ─────────────────────────────────────────────────────────
  sys_availability_since         TIMESTAMPTZ,
  sys_availability_percent       NUMERIC(5,2),
  sys_availability_excl_ctrld    NUMERIC(5,2),
  fs_availability_percent        NUMERIC(5,2),
  fs_availability_excl_ctrld     NUMERIC(5,2),
  memory_total_mib               INTEGER,
  memory_free_mib                INTEGER,
  memory_inactive_mib            INTEGER,
  swap_total_mib                 INTEGER,
  swap_free_mib                  INTEGER,
  uptime_days                    INTEGER,
  filesystem_verify_status       TEXT,
  nfs_status                     TEXT,
  cifs_status                    TEXT,
  data_encryption_enabled        BOOLEAN,
  ha_enabled                     BOOLEAN,

  -- ── Network Summary ───────────────────────────────────────────────────────
  network_ports_total            INTEGER,
  network_ports_running          INTEGER,
  network_ports_down             INTEGER     DEFAULT 0,

  -- ── Replication ───────────────────────────────────────────────────────────
  replication_configured         BOOLEAN     DEFAULT FALSE,
  replication_status             TEXT,

  -- ── Alert Counts (derived from dd_alerts at ingest time) ─────────────────
  active_alerts_total            INTEGER     DEFAULT 0,
  active_alerts_critical         INTEGER     DEFAULT 0,
  active_alerts_warning          INTEGER     DEFAULT 0,
  active_alerts_info             INTEGER     DEFAULT 0,

  -- ── Derived Device Status (set by AlertEngine) ────────────────────────────
  device_status   TEXT NOT NULL DEFAULT 'unknown'
    CONSTRAINT chk_reports_device_status
      CHECK (device_status IN ('healthy','warning','critical','unknown')),

  -- ── Parse Quality Metadata ────────────────────────────────────────────────
  is_valid        BOOLEAN     NOT NULL DEFAULT TRUE,
  parse_errors    TEXT[],
  sections_found  TEXT[],

  -- ── Full Detail (Device Detail deep-dive page only) ──────────────────────
  parsed_data     JSONB       NOT NULL,
  raw_text_hash   TEXT,

  CONSTRAINT uq_reports_device_date UNIQUE (device_id, report_date),
  CONSTRAINT chk_reports_storage_percent
    CHECK (storage_used_percent IS NULL
      OR (storage_used_percent >= 0 AND storage_used_percent <= 100)),
  CONSTRAINT chk_reports_disks_positive
    CHECK (disks_failed IS NULL OR disks_failed >= 0),
  CONSTRAINT chk_reports_availability
    CHECK (sys_availability_percent IS NULL
      OR (sys_availability_percent >= 0 AND sys_availability_percent <= 100))
);

COMMENT ON TABLE  dd_reports IS
  'One row per device per day. UNIQUE(device_id, report_date) enforces idempotent '
  'ingest. Indexed columns cover all list/chart reads; parsed_data JSONB covers '
  'the Device Detail deep-dive only.';

COMMENT ON COLUMN dd_reports.id              IS 'Surrogate UUID primary key.';
COMMENT ON COLUMN dd_reports.device_id       IS 'FK → dd_devices. Cascade deletes all reports when a device is removed.';
COMMENT ON COLUMN dd_reports.report_date     IS 'The calendar date this autosupport was generated. Part of the idempotency UNIQUE key.';
COMMENT ON COLUMN dd_reports.generated_on    IS 'Exact timestamp from the GENERATED: line in the autosupport file. e.g. 2025-03-10T06:48:06.';
COMMENT ON COLUMN dd_reports.ingested_at     IS 'Timestamp when this row was written by the ingest pipeline.';
COMMENT ON COLUMN dd_reports.file_name       IS 'Original filename of the autosupport attachment. e.g. scheduled_autosupport_DD6300BSR.txt.';
COMMENT ON COLUMN dd_reports.file_size_bytes IS 'Byte size of the raw autosupport file. Displayed on the Reports page.';

COMMENT ON COLUMN dd_reports.storage_total_gib      IS 'Total storage capacity in GiB from Active Tier post-comp row. Used by History chart, Compare.';
COMMENT ON COLUMN dd_reports.storage_used_gib       IS 'Used storage in GiB. Used by History trend chart.';
COMMENT ON COLUMN dd_reports.storage_available_gib  IS 'Available storage in GiB.';
COMMENT ON COLUMN dd_reports.storage_used_percent   IS 'Used %. MOST QUERIED COLUMN. Used by Overview tiles, History chart, Compare sort. Indexed.';
COMMENT ON COLUMN dd_reports.storage_cleanable_gib  IS 'Cleanable (reclaimable) storage in GiB.';
COMMENT ON COLUMN dd_reports.storage_pre_comp_gib   IS 'Pre-compression logical data size in GiB. e.g. 423971.700. Used by compression analytics.';
COMMENT ON COLUMN dd_reports.storage_last_cleaning  IS 'Timestamp of last filesystem cleaning operation.';

COMMENT ON COLUMN dd_reports.comp_period_from       IS 'Start of the compression measurement window.';
COMMENT ON COLUMN dd_reports.comp_period_to         IS 'End of the compression measurement window.';
COMMENT ON COLUMN dd_reports.comp_total_factor      IS 'Overall compression factor (currently-used). e.g. 22.40. Used by History compression chart, Compare.';
COMMENT ON COLUMN dd_reports.comp_reduction_percent IS 'Data reduction percent. e.g. 95.50. = (1 - 1/factor) * 100.';
COMMENT ON COLUMN dd_reports.comp_global_factor     IS 'Global (dedup) compression component for currently-used window.';
COMMENT ON COLUMN dd_reports.comp_local_factor      IS 'Local (compression) component for currently-used window.';

COMMENT ON COLUMN dd_reports.comp_7day_pre_comp_gib  IS 'Last 7 days: pre-compression GiB.';
COMMENT ON COLUMN dd_reports.comp_7day_post_comp_gib IS 'Last 7 days: post-compression GiB.';
COMMENT ON COLUMN dd_reports.comp_7day_global_factor IS 'Last 7 days: global (dedup) factor. e.g. 7.60.';
COMMENT ON COLUMN dd_reports.comp_7day_local_factor  IS 'Last 7 days: local (compression) factor. e.g. 1.10.';
COMMENT ON COLUMN dd_reports.comp_7day_total_factor  IS 'Last 7 days: total factor. e.g. 8.10.';
COMMENT ON COLUMN dd_reports.comp_7day_reduction_pct IS 'Last 7 days: reduction percent. e.g. 87.70.';

COMMENT ON COLUMN dd_reports.comp_24h_pre_comp_gib  IS 'Last 24 hrs: pre-compression GiB.';
COMMENT ON COLUMN dd_reports.comp_24h_post_comp_gib IS 'Last 24 hrs: post-compression GiB.';
COMMENT ON COLUMN dd_reports.comp_24h_global_factor IS 'Last 24 hrs: global factor. e.g. 5.00.';
COMMENT ON COLUMN dd_reports.comp_24h_local_factor  IS 'Last 24 hrs: local factor. e.g. 1.00.';
COMMENT ON COLUMN dd_reports.comp_24h_total_factor  IS 'Last 24 hrs: total factor. e.g. 5.10.';
COMMENT ON COLUMN dd_reports.comp_24h_reduction_pct IS 'Last 24 hrs: reduction percent. e.g. 80.30.';

COMMENT ON COLUMN dd_reports.disks_active_total  IS 'Total active-tier disk slots. e.g. 27 (25 in_use + 2 spare).';
COMMENT ON COLUMN dd_reports.disks_active_in_use IS 'Active-tier disks currently in use.';
COMMENT ON COLUMN dd_reports.disks_active_spare  IS 'Active-tier hot spare disks.';
COMMENT ON COLUMN dd_reports.disks_cache_total   IS 'Cache-tier disk count.';
COMMENT ON COLUMN dd_reports.disks_cache_in_use  IS 'Cache-tier disks in use.';
COMMENT ON COLUMN dd_reports.disks_failed        IS 'Count of failed/missing disks. > 0 triggers CRITICAL alert via alert_rules.';
COMMENT ON COLUMN dd_reports.disk_overall_status IS 'Human-readable disk health summary. Normal | Degraded | Critical.';
COMMENT ON COLUMN dd_reports.disk_proactive_check_msg IS 'Proactive disk health message from GENERAL STATUS section.';

COMMENT ON COLUMN dd_reports.sys_availability_since       IS 'Date from which uptime is measured. e.g. 2020-05-21T03:00:00.';
COMMENT ON COLUMN dd_reports.sys_availability_percent     IS 'System availability % since availability_since. e.g. 100.00.';
COMMENT ON COLUMN dd_reports.sys_availability_excl_ctrld  IS 'System availability % excluding controlled downtime.';
COMMENT ON COLUMN dd_reports.fs_availability_percent      IS 'Filesystem availability %.';
COMMENT ON COLUMN dd_reports.fs_availability_excl_ctrld   IS 'Filesystem availability % excluding controlled downtime.';
COMMENT ON COLUMN dd_reports.memory_total_mib             IS 'Total RAM in MiB. e.g. 48137.';
COMMENT ON COLUMN dd_reports.memory_free_mib              IS 'Free RAM in MiB.';
COMMENT ON COLUMN dd_reports.memory_inactive_mib          IS 'Inactive (reclaimable) RAM in MiB.';
COMMENT ON COLUMN dd_reports.swap_total_mib               IS 'Total swap in MiB.';
COMMENT ON COLUMN dd_reports.swap_free_mib                IS 'Free swap in MiB.';
COMMENT ON COLUMN dd_reports.uptime_days                  IS 'System uptime in days. e.g. 1754.';
COMMENT ON COLUMN dd_reports.filesystem_verify_status     IS 'Data verification status string from Filesys Verify Status section.';
COMMENT ON COLUMN dd_reports.nfs_status                   IS 'NFS status. active | inactive.';
COMMENT ON COLUMN dd_reports.cifs_status                  IS 'CIFS status. enabled | disabled.';
COMMENT ON COLUMN dd_reports.data_encryption_enabled      IS 'Data encryption flag from this report (may update dd_devices.data_encryption_enabled).';
COMMENT ON COLUMN dd_reports.ha_enabled                   IS 'HA flag from this report.';

COMMENT ON COLUMN dd_reports.network_ports_total   IS 'Total network ports found. e.g. 9 (ethMa + eth1a-d + eth3a-d).';
COMMENT ON COLUMN dd_reports.network_ports_running IS 'Ports in running state.';
COMMENT ON COLUMN dd_reports.network_ports_down    IS 'Ports not in running state. > 0 triggers WARNING via alert_rules.';

COMMENT ON COLUMN dd_reports.replication_configured IS 'Whether replication is configured on this appliance.';
COMMENT ON COLUMN dd_reports.replication_status     IS 'Replication run status. running | idle | null.';

COMMENT ON COLUMN dd_reports.active_alerts_total    IS 'Total active alert count at report time. Denormalized from dd_alerts for fast Overview reads.';
COMMENT ON COLUMN dd_reports.active_alerts_critical IS 'CRITICAL active alerts count.';
COMMENT ON COLUMN dd_reports.active_alerts_warning  IS 'WARNING active alerts count.';
COMMENT ON COLUMN dd_reports.active_alerts_info     IS 'INFO active alerts count.';

COMMENT ON COLUMN dd_reports.device_status   IS 'Overall device health derived by AlertEngine at ingest. One of: healthy | warning | critical | unknown. Indexed for fleet-wide status queries.';
COMMENT ON COLUMN dd_reports.is_valid        IS 'FALSE if the parser failed to extract critical sections. Invalid reports are excluded from analytics.';
COMMENT ON COLUMN dd_reports.parse_errors    IS 'Array of per-section error messages from the parser. Empty on clean parse.';
COMMENT ON COLUMN dd_reports.sections_found  IS 'Array of section names successfully extracted. e.g. {meta,storage,compression,...}.';
COMMENT ON COLUMN dd_reports.parsed_data     IS 'Complete ParsedReport JSON object. Read ONLY by the Device Detail page. Never queried for list/chart views.';
COMMENT ON COLUMN dd_reports.raw_text_hash   IS 'SHA-256 of the raw autosupport text. Used for deduplication: if hash matches an existing row, skip re-parsing.';


-- =============================================================================
-- TABLE 3: dd_alerts
-- Individual alert records from every report (appliance-sourced and rule-engine).
-- Used by: Alerts page timeline, severity chart, alert trend.
-- =============================================================================

CREATE TABLE dd_alerts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id   UUID        NOT NULL REFERENCES dd_devices(id) ON DELETE CASCADE,
  report_id   UUID        NOT NULL REFERENCES dd_reports(id) ON DELETE CASCADE,
  report_date DATE        NOT NULL,
  alert_id    TEXT,
  severity    TEXT        NOT NULL
    CONSTRAINT chk_alerts_severity
      CHECK (severity IN ('CRITICAL','WARNING','INFO')),
  class       TEXT,
  object      TEXT,
  message     TEXT        NOT NULL,
  post_time   TIMESTAMPTZ,
  clear_time  TIMESTAMPTZ,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  source      TEXT        NOT NULL DEFAULT 'appliance'
    CONSTRAINT chk_alerts_source
      CHECK (source IN ('appliance','rule_engine')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  dd_alerts IS
  'Individual alert records. Sourced from the autosupport Current Alerts section '
  '(source=appliance) or evaluated by AlertEngine against alert_rules (source=rule_engine). '
  'Replaced in full on every re-ingest of the same device+date.';

COMMENT ON COLUMN dd_alerts.id          IS 'Surrogate UUID primary key.';
COMMENT ON COLUMN dd_alerts.device_id   IS 'FK → dd_devices. Cascade deletes all alerts when device is removed.';
COMMENT ON COLUMN dd_alerts.report_id   IS 'FK → dd_reports. Cascade deletes alerts when the parent report is deleted.';
COMMENT ON COLUMN dd_alerts.report_date IS 'Denormalized date for fast date-range filtering without joining dd_reports.';
COMMENT ON COLUMN dd_alerts.alert_id    IS 'DD appliance alert ID. e.g. p0-273. NULL for rule_engine alerts.';
COMMENT ON COLUMN dd_alerts.severity    IS 'Alert severity: CRITICAL | WARNING | INFO. Must match exact strings from the autosupport file.';
COMMENT ON COLUMN dd_alerts.class       IS 'Alert class from the appliance. e.g. Network | Storage | Hardware.';
COMMENT ON COLUMN dd_alerts.object      IS 'Alert object descriptor. e.g. Interface Index=20.';
COMMENT ON COLUMN dd_alerts.message     IS 'Full alert message. e.g. EVT-NETM-00001: Network interface connectivity is down on eth1d.';
COMMENT ON COLUMN dd_alerts.post_time   IS 'When the alert fired on the appliance. e.g. 2025-03-10T04:38:22.';
COMMENT ON COLUMN dd_alerts.clear_time  IS 'When the alert was cleared. NULL = still active.';
COMMENT ON COLUMN dd_alerts.is_active   IS 'TRUE = alert is currently active; FALSE = cleared. Indexed for fast active-only queries.';
COMMENT ON COLUMN dd_alerts.source      IS 'appliance = from the autosupport file; rule_engine = generated by AlertEngine threshold evaluation.';
COMMENT ON COLUMN dd_alerts.created_at  IS 'Row creation timestamp.';


-- =============================================================================
-- TABLE 4: dd_mtrees
-- Per-MTree (virtual filesystem) sizes per report.
-- Used by: Device Detail page MTree section.
-- Real data: 2 mtrees — backup (0.0 GiB RW), ntrkbsr_new (423971.7 GiB RW).
-- =============================================================================

CREATE TABLE dd_mtrees (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id     UUID        NOT NULL REFERENCES dd_devices(id) ON DELETE CASCADE,
  report_id     UUID        NOT NULL REFERENCES dd_reports(id) ON DELETE CASCADE,
  report_date   DATE        NOT NULL,
  name          TEXT        NOT NULL,
  mtree_id      TEXT,
  status        TEXT
    CONSTRAINT chk_mtrees_status
      CHECK (status IN ('RW','RO','unknown')),
  pre_comp_gib  NUMERIC(14,3),
  post_comp_gib NUMERIC(14,3),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  dd_mtrees IS
  'Per-MTree sizes per report. Replaced in full on every re-ingest of the same '
  'device+date. Used by Device Detail page MTree tab.';

COMMENT ON COLUMN dd_mtrees.id            IS 'Surrogate UUID primary key.';
COMMENT ON COLUMN dd_mtrees.device_id     IS 'FK → dd_devices.';
COMMENT ON COLUMN dd_mtrees.report_id     IS 'FK → dd_reports. Cascade deletes mtrees when the parent report is deleted.';
COMMENT ON COLUMN dd_mtrees.report_date   IS 'Denormalized date for partitioned queries.';
COMMENT ON COLUMN dd_mtrees.name          IS 'MTree logical name (without /data/col1/ prefix). e.g. backup | ntrkbsr_new.';
COMMENT ON COLUMN dd_mtrees.mtree_id      IS 'DD internal numeric MTree ID. e.g. 1574169456.';
COMMENT ON COLUMN dd_mtrees.status        IS 'MTree access mode: RW (read-write) | RO (read-only) | unknown.';
COMMENT ON COLUMN dd_mtrees.pre_comp_gib  IS 'Pre-compression logical data size in GiB. e.g. 423971.700.';
COMMENT ON COLUMN dd_mtrees.post_comp_gib IS 'Post-compression physical size in GiB. NULL when not reported by the autosupport file.';
COMMENT ON COLUMN dd_mtrees.created_at    IS 'Row creation timestamp.';


-- =============================================================================
-- TABLE 5: dd_disks
-- Per-disk slot detail per report.
-- Used by: Device Detail disk grid (27 disks, color-coded by state).
-- Real layout: Enclosure 1 (DD6300, 14 slots) + Enclosure 2 (ES30, 15 slots).
-- =============================================================================

CREATE TABLE dd_disks (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id        UUID        NOT NULL REFERENCES dd_devices(id) ON DELETE CASCADE,
  report_id        UUID        NOT NULL REFERENCES dd_reports(id) ON DELETE CASCADE,
  report_date      DATE        NOT NULL,
  enclosure_id     INTEGER,
  enclosure_model  TEXT,
  enclosure_serial TEXT,
  slot_number      INTEGER,
  label            TEXT,
  tier             TEXT
    CONSTRAINT chk_disks_tier
      CHECK (tier IN ('active','cache','unknown')),
  state            TEXT
    CONSTRAINT chk_disks_state
      CHECK (state IN ('in_use','spare','failed','absent','unknown')),
  model            TEXT,
  serial_number    TEXT,
  firmware_version TEXT,
  capacity_gib     NUMERIC(10,3),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  dd_disks IS
  'Per-disk slot detail per report. Replaced in full on every re-ingest of the '
  'same device+date. Used by Device Detail disk grid and failed-disk alerts.';

COMMENT ON COLUMN dd_disks.id               IS 'Surrogate UUID primary key.';
COMMENT ON COLUMN dd_disks.device_id        IS 'FK → dd_devices.';
COMMENT ON COLUMN dd_disks.report_id        IS 'FK → dd_reports. Cascade deletes on report deletion.';
COMMENT ON COLUMN dd_disks.report_date      IS 'Denormalized date for partitioned queries.';
COMMENT ON COLUMN dd_disks.enclosure_id     IS 'Enclosure number. 1 = main DD6300 shelf; 2 = ES30 expansion shelf.';
COMMENT ON COLUMN dd_disks.enclosure_model  IS 'Enclosure model. e.g. DD6300 | ES30.';
COMMENT ON COLUMN dd_disks.enclosure_serial IS 'Enclosure serial number.';
COMMENT ON COLUMN dd_disks.slot_number      IS 'Disk slot index within the enclosure (0-indexed).';
COMMENT ON COLUMN dd_disks.label            IS 'Human-readable slot label. e.g. Enc1-Slot3. Shown in the disk grid UI.';
COMMENT ON COLUMN dd_disks.tier             IS 'Storage tier: active | cache | unknown.';
COMMENT ON COLUMN dd_disks.state            IS 'Disk state: in_use | spare | failed | absent | unknown. failed triggers CRITICAL alert.';
COMMENT ON COLUMN dd_disks.model            IS 'Disk hardware model number.';
COMMENT ON COLUMN dd_disks.serial_number    IS 'Disk serial number.';
COMMENT ON COLUMN dd_disks.firmware_version IS 'Disk firmware revision.';
COMMENT ON COLUMN dd_disks.capacity_gib     IS 'Individual disk capacity in GiB. e.g. 3686.400 (3.6 TiB disk).';
COMMENT ON COLUMN dd_disks.created_at       IS 'Row creation timestamp.';


-- =============================================================================
-- TABLE 6: dd_network_ports
-- Network port hardware status per report.
-- Used by: Device Detail network section.
-- Real data: 9 ports — ethMa(down), eth1a(running), eth1b-d(down/up), eth3a-d.
-- =============================================================================

CREATE TABLE dd_network_ports (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id        UUID        NOT NULL REFERENCES dd_devices(id) ON DELETE CASCADE,
  report_id        UUID        NOT NULL REFERENCES dd_reports(id) ON DELETE CASCADE,
  report_date      DATE        NOT NULL,
  name             TEXT        NOT NULL,
  speed            TEXT,
  duplex           TEXT,
  physical_type    TEXT,
  hardware_address TEXT,
  link_status      TEXT,
  state            TEXT,
  is_down          BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  dd_network_ports IS
  'Network port hardware state per report. Replaced in full on re-ingest. '
  'is_down = TRUE on any port not in running state; drives network_ports_down '
  'summary column on dd_reports and WARNING alert_rule.';

COMMENT ON COLUMN dd_network_ports.id               IS 'Surrogate UUID primary key.';
COMMENT ON COLUMN dd_network_ports.device_id        IS 'FK → dd_devices.';
COMMENT ON COLUMN dd_network_ports.report_id        IS 'FK → dd_reports. Cascade deletes on report deletion.';
COMMENT ON COLUMN dd_network_ports.report_date      IS 'Denormalized date for partitioned queries.';
COMMENT ON COLUMN dd_network_ports.name             IS 'Port name. e.g. eth1a | eth1d | ethMa.';
COMMENT ON COLUMN dd_network_ports.speed            IS 'Link speed. e.g. 1000Mb/s.';
COMMENT ON COLUMN dd_network_ports.duplex           IS 'Duplex mode. full | half | unknown.';
COMMENT ON COLUMN dd_network_ports.physical_type    IS 'Physical media. e.g. Copper | Fiber.';
COMMENT ON COLUMN dd_network_ports.hardware_address IS 'MAC address. e.g. 00:60:16:a8:df:34.';
COMMENT ON COLUMN dd_network_ports.link_status      IS 'Link Status column from Net Show Hardware. yes | no | unknown.';
COMMENT ON COLUMN dd_network_ports.state            IS 'State column from Net Show Hardware. running | down | up.';
COMMENT ON COLUMN dd_network_ports.is_down          IS 'TRUE when state != running. Indexed for fast down-port queries. Drives network_ports_down on dd_reports.';
COMMENT ON COLUMN dd_network_ports.created_at       IS 'Row creation timestamp.';


-- =============================================================================
-- TABLE 7: system_logs
-- Structured audit trail of all system events.
-- Used by: Logs page (filterable by type, severity, device, date range).
-- =============================================================================

CREATE TABLE system_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type     TEXT        NOT NULL
    CONSTRAINT chk_logs_event_type
      CHECK (event_type IN ('ingestion','parse','alert_evaluation','alert_sent',
                            'cleanup','auth','export')),
  severity       TEXT        NOT NULL
    CONSTRAINT chk_logs_severity
      CHECK (severity IN ('INFO','WARNING','ERROR')),
  device_id      UUID        REFERENCES dd_devices(id) ON DELETE SET NULL,
  report_id      UUID        REFERENCES dd_reports(id) ON DELETE SET NULL,
  message        TEXT        NOT NULL,
  details        JSONB,
  correlation_id TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  system_logs IS
  'Structured audit trail of all significant system events. Written by the '
  'ingestion pipeline, alert engine, auth, cleanup, and export flows. '
  'Read by the Logs dashboard page.';

COMMENT ON COLUMN system_logs.id             IS 'Surrogate UUID primary key.';
COMMENT ON COLUMN system_logs.event_type     IS 'Event category: ingestion | parse | alert_evaluation | alert_sent | cleanup | auth | export.';
COMMENT ON COLUMN system_logs.severity       IS 'Log level: INFO | WARNING | ERROR.';
COMMENT ON COLUMN system_logs.device_id      IS 'FK → dd_devices. NULL for non-device events (auth, system cleanup). SET NULL on device deletion to preserve audit trail.';
COMMENT ON COLUMN system_logs.report_id      IS 'FK → dd_reports. NULL for events not tied to a specific report. SET NULL on report deletion.';
COMMENT ON COLUMN system_logs.message        IS 'Human-readable event description. e.g. Ingestion completed: DD6300BSR 2025-03-10.';
COMMENT ON COLUMN system_logs.details        IS 'Structured event context as JSONB. e.g. {duration_ms: 450, sections_found: [...], alerts_created: 4}.';
COMMENT ON COLUMN system_logs.correlation_id IS 'UUID linking all log entries from one operation (one ingest = one correlation_id). Used by Logs page to trace a single ingestion end-to-end.';
COMMENT ON COLUMN system_logs.created_at     IS 'Event timestamp. Indexed DESC for latest-first queries.';


-- =============================================================================
-- TABLE 8: email_notifications
-- Record of every outbound alert email.
-- De-duplication: has_email_been_sent_today() checks this table before sending.
-- Used by: System Health page email history log.
-- =============================================================================

CREATE TABLE email_notifications (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type    TEXT        NOT NULL
    CONSTRAINT chk_email_type
      CHECK (email_type IN ('report_received','missing_report','parse_error',
                            'storage_cleanup','weekly_report')),
  device_id     UUID        REFERENCES dd_devices(id) ON DELETE SET NULL,
  report_date   DATE,
  recipients    TEXT[]      NOT NULL,
  subject       TEXT        NOT NULL,
  body_preview  TEXT,
  status        TEXT        NOT NULL
    CONSTRAINT chk_email_status
      CHECK (status IN ('sent','failed')),
  error_message TEXT,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  email_notifications IS
  'Record of every outbound email. Used for de-duplication (never send the same '
  'email_type for the same device+date twice) and for the System Health audit log.';

COMMENT ON COLUMN email_notifications.id            IS 'Surrogate UUID primary key.';
COMMENT ON COLUMN email_notifications.email_type    IS 'Email category: report_received | missing_report | parse_error | storage_cleanup | weekly_report.';
COMMENT ON COLUMN email_notifications.device_id     IS 'FK → dd_devices. SET NULL on device deletion to preserve notification history.';
COMMENT ON COLUMN email_notifications.report_date   IS 'The calendar date this notification is for. Part of the de-duplication key (email_type + device_id + report_date).';
COMMENT ON COLUMN email_notifications.recipients    IS 'Array of recipient email addresses.';
COMMENT ON COLUMN email_notifications.subject       IS 'Email subject line as sent.';
COMMENT ON COLUMN email_notifications.body_preview  IS 'First ~500 characters of the email body. Shown in the System Health email history panel.';
COMMENT ON COLUMN email_notifications.status        IS 'Delivery outcome: sent | failed.';
COMMENT ON COLUMN email_notifications.error_message IS 'Error detail if status=failed. NULL on success.';
COMMENT ON COLUMN email_notifications.sent_at       IS 'When the send was attempted (success or failure).';


-- =============================================================================
-- TABLE 9: alert_rules
-- Configurable thresholds evaluated by AlertEngine on every ingest.
-- Used by: Alerts page rules panel, Settings page threshold editor.
-- =============================================================================

CREATE TABLE alert_rules (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key    TEXT        NOT NULL,
  description TEXT        NOT NULL,
  metric      TEXT        NOT NULL,
  operator    TEXT        NOT NULL
    CONSTRAINT chk_rules_operator
      CHECK (operator IN ('>','>=','<','<=','=')),
  threshold   NUMERIC     NOT NULL,
  severity    TEXT        NOT NULL
    CONSTRAINT chk_rules_severity
      CHECK (severity IN ('CRITICAL','WARNING','INFO')),
  is_enabled  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_alert_rules_key UNIQUE (rule_key)
);

COMMENT ON TABLE  alert_rules IS
  'Configurable alert threshold rules evaluated by AlertEngine after every '
  'ingest. Each rule maps a metric column name in dd_reports to a threshold '
  'and severity. Seeded with PRD defaults below.';

COMMENT ON COLUMN alert_rules.id          IS 'Surrogate UUID primary key.';
COMMENT ON COLUMN alert_rules.rule_key    IS 'Stable programmatic key. e.g. storage_warning. Used by AlertEngine and UI.';
COMMENT ON COLUMN alert_rules.description IS 'Human-readable rule description shown in the Alerts rules table. e.g. storage > 90%.';
COMMENT ON COLUMN alert_rules.metric      IS 'Column name in dd_reports to evaluate. e.g. storage_used_percent.';
COMMENT ON COLUMN alert_rules.operator    IS 'Comparison operator: > | >= | < | <= | =.';
COMMENT ON COLUMN alert_rules.threshold   IS 'Numeric threshold value. e.g. 90 (for storage_used_percent > 90).';
COMMENT ON COLUMN alert_rules.severity    IS 'Alert severity produced when this rule fires: CRITICAL | WARNING | INFO.';
COMMENT ON COLUMN alert_rules.is_enabled  IS 'FALSE = rule is disabled; AlertEngine skips it.';
COMMENT ON COLUMN alert_rules.created_at  IS 'Row creation timestamp.';
COMMENT ON COLUMN alert_rules.updated_at  IS 'Auto-updated by trg_alert_rules_updated_at trigger.';


-- =============================================================================
-- Seed: Default alert rules (per PRD §6 thresholds)
-- =============================================================================

INSERT INTO alert_rules (rule_key, description, metric, operator, threshold, severity) VALUES
  ('storage_warning',
   'storage > 90%',
   'storage_used_percent', '>', 90, 'WARNING'),
  ('storage_critical',
   'storage > 95%',
   'storage_used_percent', '>', 95, 'CRITICAL'),
  ('disk_failed',
   'failed disks > 0',
   'disks_failed', '>', 0, 'CRITICAL'),
  ('network_port_down',
   'network ports down > 0',
   'network_ports_down', '>', 0, 'WARNING'),
  ('low_compression',
   'compression < 3x',
   'comp_total_factor', '<', 3.0, 'WARNING'),
  ('availability_drop',
   'availability < 99.9%',
   'sys_availability_percent', '<', 99.9, 'WARNING');
