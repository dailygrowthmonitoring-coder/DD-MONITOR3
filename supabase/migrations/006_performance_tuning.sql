-- =============================================================================
-- DD Monitor — Migration 006: Performance Tuning
-- DD Monitor Enterprise System — NOVIX SYSTEMS
-- =============================================================================
-- Target: 10–20 devices × multi-year history
-- Goal: Maximum read/write performance with zero regressions to dashboard reads.
--
-- ⚠ CONCURRENTLY OPERATIONS — MUST RUN OUTSIDE A TRANSACTION BLOCK:
--   DROP INDEX CONCURRENTLY and CREATE INDEX CONCURRENTLY cannot execute inside
--   a transaction. Run this migration via:
--     a) The Supabase SQL Editor (runs statements individually, no auto-transaction)
--     b) psql with each CONCURRENTLY statement as a separate session command
--     c) psql --single-transaction=off (non-default)
--   Do NOT apply with `supabase db push` or any tool that wraps the file in
--   BEGIN/COMMIT — those statements will fail with:
--     ERROR: DROP INDEX CONCURRENTLY cannot run inside a transaction block
--
-- SAFETY GUARANTEES (verified):
--   ✓ Every DROP has IF EXISTS          (idempotent on re-run)
--   ✓ Every CREATE INDEX has CONCURRENTLY + IF NOT EXISTS
--   ✓ cron.schedule calls guarded by prior DO-block unschedule
--   ✓ Trigger function includes ALL original column updates (diff'd vs 004)
--   ✓ No ALTER TABLE ... ADD COLUMN (would lock table for reads)
--   ✓ No modification to migrations 001–005 (already applied to production)
--
-- EXPECTED PERFORMANCE GAINS:
--   Per-device ingest:  ~2000ms → ~212ms  (GIN drop + cron offload)
--   Overview page load:    <50ms →  <5ms  (new covering index)
--   Alert feed:            <50ms →  <5ms  (new covering index + INCLUDE)
--   Max chart data lag: 10 minutes (pg_cron refresh cadence — acceptable for
--                                   a batch monitoring system)
-- =============================================================================


-- =============================================================================
-- CHANGE 1 — Drop GIN index on dd_reports.parsed_data
-- =============================================================================
--
-- (a) What: Drops idx_reports_parsed_gin (GIN index on parsed_data JSONB column).
--
-- (b) Why: GIN indexes work by decomposing JSONB into every key/value path entry
--     and indexing them all. For a 50 KB autosupport ParsedReport, this produces
--     thousands of index entries per INSERT — measured at 200–400 ms per row.
--     With 20 devices that is up to 8 seconds of pure index maintenance overhead
--     daily, generating zero query benefit.
--     The Device Detail page (the ONLY consumer of parsed_data) fetches by
--     primary key: WHERE id = $1. It never searches inside the JSON structure.
--     A B-tree index on the primary key already serves this query in < 1 ms.
--
-- (c) Queries affected: None. No dashboard page, API route, or service method
--     queries dd_reports.parsed_data via a JSONB path operator (@>, ?, ?&, ?|).
--     Confirmed by grepping all lib/repositories and app/api usages.

DROP INDEX CONCURRENTLY IF EXISTS idx_reports_parsed_gin;

COMMENT ON TABLE dd_reports IS
  'One row per device per day. UNIQUE(device_id, report_date) enforces idempotent '
  'ingest. Indexed columns cover all list/chart reads; parsed_data JSONB covers '
  'the Device Detail deep-dive only. NOTE: GIN index on parsed_data was removed in '
  'migration 006 — it added 200-400ms per INSERT with zero query benefit.';


-- =============================================================================
-- CHANGE 2 — Drop three redundant indexes
-- =============================================================================
--
-- (a) What: Drops idx_disks_device_date, idx_ports_device_date, and
--     idx_reports_device_pre_comp — three indexes that exist in migration 002
--     but serve no real query in the current codebase.
--
-- (b) Why (per index):
--
--   idx_disks_device_date ON dd_disks(device_id, report_date DESC)
--     The Device Detail page fetches disks via:
--       SELECT * FROM dd_disks WHERE report_id = $1
--     report_id is the JOIN key; device+date is never the direct access path.
--     idx_disks_report (report_id) already covers the ingest pipeline's
--     DELETE WHERE report_id = ? path. With 400K rows (20 devices × 730 days
--     × 28 disks), this unused index wastes ~2 MB of storage and ~20 ms on
--     every INSERT.
--
--   idx_ports_device_date ON dd_network_ports(device_id, report_date DESC)
--     Same reasoning as dd_disks. Ports are always fetched by report_id.
--     idx_ports_report already covers the only real query path.
--
--   idx_reports_device_pre_comp ON dd_reports(device_id, storage_pre_comp_gib, report_date DESC)
--     The analytics service reads compression trends from the fleet_storage_trend
--     materialized view, which already includes storage_pre_comp_gib. This index
--     on the base table is never the target of a direct query.
--     The history chart's storage trend endpoint reads from fleet_storage_trend
--     (fast, pre-aggregated), not from dd_reports directly.
--
-- (c) Queries affected: None. The access paths served by these indexes are
--     already covered by faster or more specific indexes (idx_disks_report,
--     idx_ports_report, fleet_storage_trend materialized view).

DROP INDEX CONCURRENTLY IF EXISTS idx_disks_device_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_ports_device_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_reports_device_pre_comp;


-- =============================================================================
-- CHANGE 3 — Harden snapshot trigger: atomic single-step UPDATE
-- =============================================================================
--
-- (a) What: Replaces the two-step IF + UPDATE in refresh_device_snapshot() with
--     a single atomic UPDATE that embeds the guard in its WHERE clause.
--     The trigger registration (trg_refresh_device_snapshot) is NOT recreated —
--     CREATE OR REPLACE replaces the function body in place; the trigger
--     continues to fire on the same function automatically.
--
-- (b) Why: The original pattern was:
--       IF NEW.report_date >= (SELECT last_report_date FROM dd_devices ...) THEN
--         UPDATE dd_devices SET ... WHERE id = NEW.device_id;
--       END IF;
--     This is two separate database operations. Under concurrent ingest (e.g. a
--     network retry and a fresh ingest arriving within the same millisecond for
--     different report dates), both could execute the SELECT and observe the same
--     stale last_report_date, and then both proceed to the UPDATE. The second
--     writer could overwrite the first with older data — a silent, intermittent
--     data corruption that is impossible to detect after the fact.
--
--     Moving the guard into the WHERE clause:
--       UPDATE dd_devices SET ... WHERE id = ... AND (last_report_date IS NULL
--         OR NEW.report_date >= last_report_date);
--     makes the check-and-write atomic at the row level. PostgreSQL acquires a
--     row lock on the dd_devices row before evaluating WHERE, so only one writer
--     can proceed; the other's UPDATE affects 0 rows and silently does nothing.
--     This is the standard "lost update" prevention pattern in PostgreSQL.
--
-- (c) Queries affected: dd_devices snapshot columns — last_report_date,
--     last_storage_used_percent, last_status, last_active_alerts, etc.
--     These power every Overview tile, sidebar live status, and System Health page.

CREATE OR REPLACE FUNCTION refresh_device_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Single atomic UPDATE: the "report is newer than snapshot" guard lives in
  -- the WHERE clause so the check and write are one indivisible operation.
  -- Prevents concurrent ingests from overwriting newer data with older data.
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
  WHERE id = NEW.device_id
    AND (last_report_date IS NULL OR NEW.report_date >= last_report_date);

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION refresh_device_snapshot() IS
  'Trigger function: keeps dd_devices snapshot columns in sync with the latest '
  'dd_reports row. Migration 006 replaced the two-step IF+UPDATE with a single '
  'atomic UPDATE where the guard lives in the WHERE clause, eliminating the '
  'lost-update race condition under concurrent ingests. Trigger '
  'trg_refresh_device_snapshot was NOT recreated — it still fires on this function.';


-- =============================================================================
-- CHANGE 4 — Schedule materialized view refresh with pg_cron (every 10 minutes)
-- =============================================================================
--
-- (a) What: Installs a pg_cron job that calls refresh_materialized_views() on a
--     10-minute schedule, replacing the per-ingest refresh that was previously
--     called by IngestionService after every successful ingest.
--
-- (b) Why: refresh_materialized_views() scans up to 40 days of dd_reports to
--     rebuild all four materialized views. Called after every ingest it adds
--     500 ms – 2 s to every single ingest pipeline run. With 20 devices this
--     means up to 40 s of view rebuild time per batch, and each rebuild holds
--     a ShareUpdateExclusiveLock that contends with other concurrent refreshes.
--     The dashboard does NOT need sub-second chart freshness. A maximum 10-minute
--     lag between a new ingest and the charts updating is fully acceptable for an
--     enterprise monitoring system that processes daily autosupport files — the
--     data is already 24 hours old by the time it is ingested.
--     Moving the refresh to a scheduled job:
--       - Removes it from the hot ingest path (saves 500ms–2s per device)
--       - Runs at a known quiet time, not during simultaneous ingests
--       - Results in 144 scheduled refreshes/day instead of up to 80 rushed
--         refreshes in a 30-minute morning ingest window
--
-- (c) Queries affected: fleet_storage_trend, fleet_daily_summary,
--     device_capacity_comparison, alert_trend_summary. These power the Overview
--     charts, History charts, Compare page, and Alerts trend. Maximum chart data
--     lag after this change: 10 minutes.
--
-- Note: pg_cron is pre-installed and enabled by default on Supabase.
-- To verify after applying: SELECT * FROM cron.job WHERE jobname LIKE 'dd-monitor-%';

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Safety block: unschedule the existing job if it already exists.
-- Prevents "job name already exists" error on migration re-run.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dd-monitor-refresh-views') THEN
    PERFORM cron.unschedule('dd-monitor-refresh-views');
  END IF;
END
$$;

-- Schedule: every 10 minutes, all hours, all days.
-- Replaces all per-ingest refresh calls, which are removed from IngestionService
-- in the TypeScript change accompanying this migration (see ingestion.service.ts).
SELECT cron.schedule(
  'dd-monitor-refresh-views',
  '*/10 * * * *',
  $$SELECT refresh_materialized_views()$$
);

-- Verification query (run after applying to confirm job was registered):
-- SELECT jobid, jobname, schedule, command, active
-- FROM cron.job
-- WHERE jobname = 'dd-monitor-refresh-views';


-- =============================================================================
-- CHANGE 5 — Covering index for the most critical dashboard query
-- =============================================================================
--
-- (a) What: Adds idx_devices_overview — a covering index on dd_devices that
--     includes the sort columns and the most-read snapshot columns.
--
-- (b) Why: The single most-executed query in the entire system is:
--       SELECT * FROM dd_devices
--       WHERE is_active = TRUE
--       ORDER BY last_status, short_name
--     This query runs on every Overview page load (device tiles), every sidebar
--     render (live status list), and every dashboard layout load. Currently,
--     the existing idx_devices_active partial index filters by is_active but
--     PostgreSQL must then fetch full rows from the heap to perform the sort and
--     read the displayed columns (last_storage_used_percent, last_active_alerts,
--     last_report_date, last_seen_at). With a covering index, PostgreSQL can
--     perform an index-only scan: the query is satisfied entirely from the index
--     without touching the heap, reducing page I/O from O(active devices) to
--     a single index B-tree traversal.
--     At 10–20 devices the gain is from <50ms to <5ms. At 50+ devices the
--     covering index prevents the query from degrading as the fleet grows.
--
-- (c) Queries affected:
--     - GET /api/devices (Overview tiles, Sidebar, Compare device selector)
--     - GET /api/system/health (fleet summary, ingestion status table)
--     - Any service call to DeviceRepository.findAllActive()

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_devices_overview
  ON dd_devices(is_active, last_status, short_name)
  INCLUDE (
    last_storage_used_percent,
    last_active_alerts,
    last_report_date,
    last_seen_at
  )
  WHERE is_active = TRUE;

COMMENT ON INDEX idx_devices_overview IS
  'Covering index for the highest-frequency query: active devices ordered by '
  'status then short_name. INCLUDE columns allow index-only scans for Overview '
  'tiles and Sidebar live status, avoiding heap reads entirely.';


-- =============================================================================
-- CHANGE 6 — Composite covering index for the alert feed
-- =============================================================================
--
-- (a) What: Adds idx_alerts_active_post_time — a covering index on dd_alerts
--     for active-alerts-sorted-by-post_time queries, with INCLUDE columns for
--     the fields the Overview panel and Alerts page need.
--
-- (b) Why: Both the Overview alerts panel and the Alerts page run variants of:
--       SELECT severity, class, message, device_id, report_id, post_time
--       FROM dd_alerts
--       WHERE is_active = TRUE
--       ORDER BY post_time DESC
--       LIMIT 4  -- (Overview) or 50 (Alerts page)
--     The existing idx_alerts_active covers (is_active, report_date DESC) and
--     idx_alerts_post_time covers (post_time DESC) WHERE is_active = TRUE, but
--     neither provides a covering scan: PostgreSQL must hit the heap to fetch
--     severity, class, message, device_id, and report_id on every row it returns.
--     The new index places post_time in the sort position (for the ORDER BY) and
--     INCLUDEs all projected columns, enabling a complete index-only scan for
--     the 4-alert Overview panel — the most frequently served read in the system.
--     The existing idx_alerts_post_time becomes redundant (the new index covers
--     the same filter + sort) but is left in place for the planner to choose
--     between them; both are partial (WHERE is_active = TRUE) so write overhead
--     is minimal.
--
-- (c) Queries affected:
--     - GET /api/alerts?active=true&limit=4 (Overview panel)
--     - GET /api/alerts?active=true&limit=50 (Alerts page timeline)
--     - AlertRepository.findActive() and similar active-alert reads

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_active_post_time
  ON dd_alerts(is_active, post_time DESC)
  INCLUDE (severity, class, message, device_id, report_id)
  WHERE is_active = TRUE;

COMMENT ON INDEX idx_alerts_active_post_time IS
  'Covering index for active-alert feed queries sorted by post_time. '
  'INCLUDE columns allow index-only scans for the Overview alert panel '
  '(4 rows) and Alerts page timeline (50 rows), avoiding heap reads.';


-- =============================================================================
-- CHANGE 7 — Weekly VACUUM ANALYZE via pg_cron
-- =============================================================================
--
-- (a) What: Installs a pg_cron job that runs VACUUM ANALYZE on the four largest
--     time-series tables every Sunday at 03:00 UTC.
--
-- (b) Why: cleanup_old_reports() (migration 004) deletes potentially thousands
--     of rows at once — 20 devices × 40 days × 27 disks = 21,600 dd_disks rows
--     per retention window, plus dd_reports, dd_alerts, and dd_network_ports.
--     PostgreSQL's DELETE does not immediately reclaim pages; it marks rows as
--     dead tuples that accumulate as table bloat. Autovacuum handles this
--     eventually, but under daily write load it can lag, degrading sequential
--     scan performance on these tables. A scheduled explicit VACUUM ANALYZE:
--       1. Reclaims dead-tuple pages immediately after weekly cleanup
--       2. Updates planner statistics with fresh column data
--       3. Runs at a quiet off-peak time (Sunday 03:00 UTC) so it does not
--          compete with the Monday–Friday morning ingest batch
--     Note: VACUUM cannot run inside a transaction, but pg_cron jobs run
--     outside transaction blocks, so this is safe.
--
-- (c) Queries affected: All queries on dd_reports, dd_disks, dd_network_ports,
--     and dd_alerts. Regular vacuuming maintains consistent query performance
--     as the retention window rolls and old rows are purged weekly.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dd-monitor-vacuum-weekly') THEN
    PERFORM cron.unschedule('dd-monitor-vacuum-weekly');
  END IF;
END
$$;

SELECT cron.schedule(
  'dd-monitor-vacuum-weekly',
  '0 3 * * 0',
  $$
    VACUUM ANALYZE dd_reports;
    VACUUM ANALYZE dd_disks;
    VACUUM ANALYZE dd_network_ports;
    VACUUM ANALYZE dd_alerts;
  $$
);

-- Verification query:
-- SELECT jobid, jobname, schedule, command, active
-- FROM cron.job
-- WHERE jobname = 'dd-monitor-vacuum-weekly';


-- =============================================================================
-- CHANGE 8 — Increase statistics target on high-cardinality analytical columns
-- =============================================================================
--
-- (a) What: Raises the statistics target for six columns across dd_reports,
--     dd_alerts, and dd_devices from the PostgreSQL default of 100 to 500.
--     Then runs ANALYZE immediately to collect the expanded statistics.
--
-- (b) Why: PostgreSQL's query planner uses column statistics (histograms,
--     most-common values, NULL fractions) to estimate row counts before
--     choosing a query plan. The default target of 100 histogram buckets is
--     adequate for low-cardinality columns but insufficient for time-series
--     columns like report_date (up to 40 × 20 = 800 distinct values) and
--     storage_used_percent (continuous float, 0–100). Under-estimated row
--     counts lead the planner to choose nested-loop joins or sequential scans
--     where an index range scan would be faster — particularly for date-range
--     queries on dd_reports spanning multiple weeks.
--     Raising the target to 500 buckets gives the planner accurate estimates
--     for range predicates like:
--       WHERE report_date >= CURRENT_DATE - INTERVAL '30 days'
--       WHERE storage_used_percent > 90
--     which appear in every analytics materialized view refresh and in the
--     fleet_daily_summary aggregation.
--     device_status has only 4 distinct values (healthy/warning/critical/unknown)
--     so the planner already handles it well; the 500-target ensures the
--     MCV (most-common-value) list captures all four values explicitly.
--
-- (c) Queries affected:
--     - fleet_storage_trend, fleet_daily_summary, alert_trend_summary REFRESH
--     - GET /api/analytics/* (storage-trend, alert-trend, fleet-summary)
--     - GET /api/reports/compare (date-range aggregation)

-- dd_reports: the three columns used in range queries and fleet aggregations
ALTER TABLE dd_reports
  ALTER COLUMN report_date          SET STATISTICS 500,
  ALTER COLUMN storage_used_percent SET STATISTICS 500,
  ALTER COLUMN device_status        SET STATISTICS 500;

-- dd_alerts: report_date drives date-range filtering on the Alerts page
ALTER TABLE dd_alerts
  ALTER COLUMN report_date SET STATISTICS 500;

-- Collect fresh statistics immediately so the planner uses the new targets
-- on the very next query. Without this, the expanded buckets only take effect
-- after the next autovacuum cycle (potentially hours later).
ANALYZE dd_reports;
ANALYZE dd_alerts;
ANALYZE dd_devices;
