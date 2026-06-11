/**
 * Report entity — a single daily autosupport report from one Data Domain appliance.
 *
 * One Report corresponds to one row in dd_reports (unique per device + date).
 * It is the richest entity in the system: a single report captures the complete
 * operational snapshot of a device on a specific day, extracted from a ~111,000-line
 * autosupport file.
 *
 * Storage strategy (hybrid):
 *   - All dashboard-rendered values are promoted to indexed columns (the typed
 *     fields below) so list and chart queries never need to parse JSONB.
 *   - The full parsed object is also stored as dd_reports.parsed_data (JSONB)
 *     and mapped into `parsedData` here for the Device Detail page's deep view.
 *   - When a report is retrieved via a list endpoint, parsedData is null.
 */

import { type Gib } from '../value-objects/gib.vo';
import { type StoragePercent } from '../value-objects/storage-percent.vo';
import { type CompressionFactor } from '../value-objects/compression-factor.vo';
import { DeviceStatus } from '../enums/device-status.enum';

// ---------------------------------------------------------------------------
// Composite sub-types (building blocks of Report)
// ---------------------------------------------------------------------------

/**
 * Daily storage utilisation snapshot extracted from the SERVER USAGE section.
 * All GiB values use the Gib value object to prevent unit confusion.
 */
export interface StorageSnapshot {
  /** Total usable capacity of the filesystem after RAID overhead. */
  readonly totalGib: Gib;
  /** Space currently occupied by stored data (post-deduplication, post-compression). */
  readonly usedGib: Gib;
  /** Remaining free space (total − used). */
  readonly availableGib: Gib;
  /** Percent of total capacity in use. Triggers WARNING at 90%, CRITICAL at 95%. */
  readonly usedPercent: StoragePercent;
  /** Space that could be reclaimed by running a cleaning cycle. Null if not reported. */
  readonly cleanableGib: Gib | null;
  /** Pre-compression (logical) size of all stored data. Null if not reported. */
  readonly preCompGib: Gib | null;
  /** Timestamp of the last completed cleaning cycle. Null if not reported. */
  readonly lastCleaning: Date | null;
}

/**
 * Compression statistics for a single time window (current, last-7-days, last-24h).
 * All factors use CompressionFactor to enforce the ≥ 1.0 invariant.
 */
export interface CompressionWindow {
  /** Pre-compression logical bytes written during the window. Null if not reported. */
  readonly preCompGib: Gib | null;
  /** Post-compression physical bytes written during the window. Null if not reported. */
  readonly postCompGib: Gib | null;
  /** Overall (global + local) deduplication factor. Null if not reported. */
  readonly globalFactor: CompressionFactor | null;
  /** Lempel-Ziv compression factor applied after deduplication. Null if not reported. */
  readonly localFactor: CompressionFactor | null;
  /** Combined total compression factor (global × local). Null if not reported. */
  readonly totalFactor: CompressionFactor | null;
  /** Percentage of storage saved (1 − 1/totalFactor) × 100. Null if not reported. */
  readonly reductionPercent: number | null;
}

/**
 * Full compression report for a device on a given day, from the Filesys Compression
 * section. Presents three time windows for trend analysis.
 */
export interface CompressionSnapshot {
  /** Start of the measurement period. Null if not reported. */
  readonly periodFrom: Date | null;
  /** End of the measurement period. Null if not reported. */
  readonly periodTo: Date | null;
  /** Compression metrics for the entire dataset (all-time cumulative). */
  readonly currentlyUsed: CompressionWindow;
  /** Compression metrics for the last 7 days. */
  readonly last7Days: CompressionWindow;
  /** Compression metrics for the last 24 hours. */
  readonly last24Hours: CompressionWindow;
}

/**
 * Disk health summary extracted from the GENERAL STATUS section.
 * Provides a fleet-level overview without per-disk detail (that is in Disk entities).
 */
export interface DiskSummary {
  /** Total number of active-tier disk slots (including in-use and spares). */
  readonly activeTierTotal: number;
  /** Number of active-tier disks actively serving storage. */
  readonly activeTierInUse: number;
  /** Number of active-tier disks designated as hot spares. */
  readonly activeTierSpare: number;
  /** Total number of cache-tier (SSD/NVMe) slots. Null if no cache tier. */
  readonly cacheTierTotal: number | null;
  /** Number of cache-tier disks in use. Null if no cache tier. */
  readonly cacheTierInUse: number | null;
  /**
   * Number of failed or missing disks (activeTierTotal − inUse − spare).
   * Any value > 0 triggers a CRITICAL alert.
   */
  readonly failedDisks: number;
  /** Overall RAID status as reported by the appliance, e.g. "Normal", "Degraded". */
  readonly overallStatus: string | null;
  /** Message from the appliance's proactive disk health check. Null if not present. */
  readonly proactiveCheckMessage: string | null;
}

/**
 * System health metrics from the GENERAL STATUS section.
 * Covers availability statistics, memory utilisation, and filesystem status.
 */
export interface SystemHealthSnapshot {
  /** Timestamp since which the current uptime period started. Null if not reported. */
  readonly availabilitySince: Date | null;
  /**
   * Percentage of time the system has been available since availabilitySince.
   * Typically 99.9xx% for healthy appliances.
   */
  readonly systemAvailabilityPercent: number | null;
  /** Filesystem availability percentage (excludes scheduled maintenance windows). */
  readonly filesystemAvailabilityPercent: number | null;
  /** Total physical RAM in MiB. */
  readonly memoryTotalMib: number | null;
  /** Free physical RAM in MiB. */
  readonly memoryFreeMib: number | null;
  /** Total swap space in MiB. */
  readonly swapTotalMib: number | null;
  /** Free swap space in MiB. */
  readonly swapFreeMib: number | null;
  /**
   * Status of the periodic filesystem integrity verification job.
   * E.g. "Verify not running", "Verify Running at 5%".
   */
  readonly filesystemVerifyStatus: string | null;
  /** NFS service status, e.g. "enabled", "disabled". */
  readonly nfsStatus: string | null;
  /** CIFS/SMB service status, e.g. "enabled", "disabled". */
  readonly cifsStatus: string | null;
}

/**
 * Replication state for a device, from the Replication Status section.
 * Indicates whether replication is configured and its current state.
 */
export interface ReplicationState {
  /** True if at least one replication context is configured on this appliance. */
  readonly configured: boolean;
  /**
   * Human-readable replication status, e.g. "Replicating", "Idle", "Initializing".
   * Null if replication is not configured or the section was absent.
   */
  readonly status: string | null;
}

// ---------------------------------------------------------------------------
// Main entity
// ---------------------------------------------------------------------------

/**
 * A single daily autosupport report from one Data Domain appliance.
 * Unique per device + report_date (enforced by UNIQUE constraint in dd_reports).
 */
export interface Report {
  /** Supabase-generated UUID, primary key in dd_reports. */
  readonly id: string;

  /** Foreign key to dd_devices.id. */
  readonly deviceId: string;

  /**
   * The date this report covers, normalized to midnight UTC.
   * The unique constraint is on (device_id, report_date).
   */
  readonly reportDate: Date;

  /**
   * The exact timestamp embedded in the autosupport file's GENERATED_ON field.
   * May differ slightly from reportDate (e.g. timezone offsets).
   * Null if the field was absent or could not be parsed.
   */
  readonly generatedOn: Date | null;

  // --- Core metrics (indexed columns in dd_reports) ---

  /** Daily storage utilisation snapshot. */
  readonly storage: StorageSnapshot;

  /** Full compression statistics across three time windows. */
  readonly compression: CompressionSnapshot;

  /** Disk health summary for this day. */
  readonly disks: DiskSummary;

  /** System availability, memory, and service status. */
  readonly systemHealth: SystemHealthSnapshot;

  /** Replication configuration and state. */
  readonly replication: ReplicationState;

  // --- Alert summary (derived by AlertEngine at ingest time) ---

  /**
   * Overall device health status derived from alert-rule evaluation.
   * Stored as a column so list queries can filter/sort by health without
   * re-evaluating rules.
   */
  readonly deviceStatus: DeviceStatus;

  /** Count of active CRITICAL alerts in this report. */
  readonly activeCriticalAlerts: number;

  /** Count of active WARNING alerts in this report. */
  readonly activeWarningAlerts: number;

  /** Count of active INFO alerts in this report. */
  readonly activeInfoAlerts: number;

  /** Total active alert count (critical + warning + info). */
  readonly activeTotalAlerts: number;

  // --- Network summary ---

  /** Total number of network ports reported in this autosupport. */
  readonly networkPortsTotal: number | null;

  /** Number of network ports with isDown = true in this report. */
  readonly networkPortsDown: number | null;

  // --- Ingest metadata ---

  /**
   * Whether the autosupport file was fully and successfully parsed.
   * False if critical sections were missing or all field parsers failed.
   */
  readonly isValid: boolean;

  /**
   * List of non-fatal parse errors encountered during ingestion.
   * Populated even when isValid is true (partial section failures are tolerated).
   */
  readonly parseErrors: readonly string[];

  /** Original filename of the autosupport attachment, e.g. "DD6300BSR-2026-06-10.txt". */
  readonly fileName: string | null;

  /** Size of the raw autosupport file in bytes. */
  readonly fileSizeBytes: number | null;

  /** Timestamp when this report was ingested into DD Monitor. */
  readonly ingestedAt: Date;

  /**
   * Full structured data from the parser, stored in dd_reports.parsed_data (JSONB).
   * Available only on device-detail requests; null on list/chart endpoints where
   * JSONB is omitted for performance (per the hybrid storage rule).
   */
  readonly parsedData: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Construction type
// ---------------------------------------------------------------------------

/**
 * Data required to insert a new Report record.
 * id and ingestedAt are generated by the system at ingest time.
 */
export type CreateReport = Omit<Report, 'id' | 'ingestedAt'>;
