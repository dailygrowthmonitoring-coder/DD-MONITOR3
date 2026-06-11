-- =============================================================================
-- DD Monitor — Migration 003: Materialized Views & Aggregations
-- DD Monitor Enterprise System — NOVIX SYSTEMS
-- =============================================================================
-- Materialized views for expensive fleet-wide aggregations.
-- Dashboard chart endpoints read FROM THESE VIEWS — never from raw dd_reports
-- rows for list/chart queries. (ARCHITECTURE.md §8: Performance by design)
--
-- All views are refreshed CONCURRENTLY by refresh_materialized_views() after
-- every successful ingest. CONCURRENTLY requires a UNIQUE index on each view.
-- =============================================================================


-- =============================================================================
-- VIEW 1: fleet_storage_trend
-- Powers: Overview storage chart, History storage chart.
-- Shows: storage_used_percent per device per day for last 40 days.
-- One row per (report_date, device_id) — the chart plots lines by device.
-- =============================================================================

CREATE MATERIALIZED VIEW fleet_storage_trend AS
SELECT
  r.report_date,
  r.device_id,
  d.short_name,
  d.hostname,
  d.location,
  r.storage_used_gib,
  r.storage_total_gib,
  r.storage_used_percent,
  r.storage_pre_comp_gib,
  r.comp_total_factor,
  r.comp_reduction_percent,
  r.comp_7day_total_factor,
  r.comp_24h_total_factor,
  r.device_status
FROM dd_reports r
JOIN dd_devices d ON d.id = r.device_id
WHERE r.is_valid = TRUE
  AND r.report_date >= CURRENT_DATE - INTERVAL '40 days'
ORDER BY r.report_date DESC, d.short_name;

-- Required for REFRESH CONCURRENTLY.
CREATE UNIQUE INDEX idx_fleet_storage_trend_pk
  ON fleet_storage_trend(report_date, device_id);

-- Supports device-specific history queries.
CREATE INDEX idx_fleet_storage_trend_device
  ON fleet_storage_trend(device_id, report_date DESC);

COMMENT ON MATERIALIZED VIEW fleet_storage_trend IS
  'Pre-aggregated storage metrics per device per day for last 40 days. '
  'Read by Overview storage chart and History page. Refreshed after every ingest.';


-- =============================================================================
-- VIEW 2: fleet_daily_summary
-- Powers: Overview KPI cards (fleet-wide totals for today and trend).
-- Shows: one row per day with fleet-wide aggregates.
-- =============================================================================

CREATE MATERIALIZED VIEW fleet_daily_summary AS
SELECT
  r.report_date,
  COUNT(DISTINCT r.device_id)                                         AS devices_reporting,
  SUM(r.storage_total_gib)                                            AS fleet_total_gib,
  SUM(r.storage_used_gib)                                             AS fleet_used_gib,
  ROUND(AVG(r.storage_used_percent)::NUMERIC, 2)                      AS avg_used_percent,
  SUM(r.storage_pre_comp_gib)                                         AS fleet_pre_comp_gib,
  ROUND(AVG(r.comp_total_factor)::NUMERIC, 2)                         AS avg_compression_factor,
  SUM(r.active_alerts_total)                                          AS fleet_active_alerts,
  SUM(r.active_alerts_critical)                                       AS fleet_critical_alerts,
  SUM(r.active_alerts_warning)                                        AS fleet_warning_alerts,
  COUNT(*) FILTER (WHERE r.device_status = 'critical')                AS devices_critical,
  COUNT(*) FILTER (WHERE r.device_status = 'warning')                 AS devices_warning,
  COUNT(*) FILTER (WHERE r.device_status = 'healthy')                 AS devices_healthy,
  COALESCE(SUM(r.disks_failed), 0)                                    AS fleet_failed_disks,
  COALESCE(SUM(r.network_ports_down), 0)                              AS fleet_ports_down
FROM dd_reports r
WHERE r.is_valid = TRUE
  AND r.report_date >= CURRENT_DATE - INTERVAL '40 days'
GROUP BY r.report_date
ORDER BY r.report_date DESC;

-- Required for REFRESH CONCURRENTLY.
CREATE UNIQUE INDEX idx_fleet_daily_summary_pk
  ON fleet_daily_summary(report_date);

COMMENT ON MATERIALIZED VIEW fleet_daily_summary IS
  'Fleet-wide daily aggregates for last 40 days. Powers Overview KPI cards '
  '(total GiB, avg utilization, alert counts, device health breakdown). '
  'Refreshed after every ingest.';


-- =============================================================================
-- VIEW 3: device_capacity_comparison
-- Powers: Compare page, capacity bars, runway projection.
-- Shows: latest snapshot per active device sorted by utilization.
-- =============================================================================

CREATE MATERIALIZED VIEW device_capacity_comparison AS
SELECT
  d.id                            AS device_id,
  d.short_name,
  d.hostname,
  d.location,
  d.model,
  d.last_status,
  d.total_capacity_gib,
  d.last_storage_used_gib,
  d.last_storage_total_gib,
  d.last_storage_used_percent,
  d.last_compression_factor,
  d.last_active_alerts,
  d.last_critical_alerts,
  d.last_warning_alerts,
  d.last_failed_disks,
  d.last_network_ports_down,
  d.last_report_date,
  d.last_uptime_days,
  -- Runway estimate: days until storage is full at the average daily growth rate
  -- over the last 30 days. NULL if data is insufficient or growth is zero/negative.
  CASE
    WHEN d.last_storage_used_percent IS NOT NULL
     AND d.last_storage_used_percent < 100
     AND d.last_storage_total_gib    IS NOT NULL
     AND d.last_storage_used_gib     IS NOT NULL
    THEN
      ROUND(
        (d.last_storage_total_gib - d.last_storage_used_gib) /
        NULLIF(
          (SELECT COALESCE(
            (MAX(r2.storage_used_gib) - MIN(r2.storage_used_gib)) /
            NULLIF((COUNT(r2.id) - 1)::NUMERIC, 0),
            0
          )
          FROM dd_reports r2
          WHERE r2.device_id = d.id
            AND r2.report_date >= CURRENT_DATE - INTERVAL '30 days'
            AND r2.is_valid    = TRUE
          ),
          0
        )::NUMERIC,
        1
      )
    ELSE NULL
  END AS estimated_runway_days
FROM dd_devices d
WHERE d.is_active = TRUE
ORDER BY d.last_storage_used_percent DESC NULLS LAST;

-- Required for REFRESH CONCURRENTLY.
CREATE UNIQUE INDEX idx_device_capacity_comparison_pk
  ON device_capacity_comparison(device_id);

COMMENT ON MATERIALIZED VIEW device_capacity_comparison IS
  'Latest capacity snapshot per active device with runway projection. '
  'Powers Compare page capacity bars and storage runway section. '
  'Refreshed after every ingest.';


-- =============================================================================
-- VIEW 4: alert_trend_summary
-- Powers: Alerts page trend chart (alert count over time per severity).
-- Shows: alert counts per severity per device per day for last 40 days.
-- =============================================================================

CREATE MATERIALIZED VIEW alert_trend_summary AS
SELECT
  a.report_date,
  a.device_id,
  d.short_name,
  COUNT(*) FILTER (WHERE a.severity = 'CRITICAL') AS critical_count,
  COUNT(*) FILTER (WHERE a.severity = 'WARNING')  AS warning_count,
  COUNT(*) FILTER (WHERE a.severity = 'INFO')     AS info_count,
  COUNT(*)                                         AS total_count
FROM dd_alerts a
JOIN dd_devices d ON d.id = a.device_id
WHERE a.report_date >= CURRENT_DATE - INTERVAL '40 days'
GROUP BY a.report_date, a.device_id, d.short_name
ORDER BY a.report_date DESC;

-- Required for REFRESH CONCURRENTLY.
CREATE UNIQUE INDEX idx_alert_trend_summary_pk
  ON alert_trend_summary(report_date, device_id);

-- Fleet-wide alert trend: all devices for a given date.
CREATE INDEX idx_alert_trend_date
  ON alert_trend_summary(report_date DESC);

COMMENT ON MATERIALIZED VIEW alert_trend_summary IS
  'Alert counts by severity per device per day for last 40 days. '
  'Powers Alerts page trend chart. Refreshed after every ingest.';


-- =============================================================================
-- FUNCTION: refresh_materialized_views
-- Called by IngestionService after every successful ingest.
-- CONCURRENTLY allows reads to continue during refresh (no exclusive lock).
-- =============================================================================

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY fleet_storage_trend;
  REFRESH MATERIALIZED VIEW CONCURRENTLY fleet_daily_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY device_capacity_comparison;
  REFRESH MATERIALIZED VIEW CONCURRENTLY alert_trend_summary;
END;
$$;

COMMENT ON FUNCTION refresh_materialized_views() IS
  'Refreshes all four dashboard materialized views concurrently. '
  'Called by IngestionService after every successful ingest. '
  'CONCURRENTLY: reads are not blocked during refresh.';
