/**
 * Layer 1 — Parser public types.
 *
 * All types are pure TypeScript primitives. The parser sits BELOW the domain layer
 * and MUST NOT import from lib/domain. The ingestion service (Layer 5) maps
 * ParsedReport → domain entities.
 */

// ---------------------------------------------------------------------------
// Result container
// ---------------------------------------------------------------------------

export interface ParseError {
  readonly section: string;
  readonly message: string;
}

export interface ParseResult {
  readonly success: boolean;
  readonly data: ParsedReport;
  readonly parse_errors: readonly ParseError[];
  readonly sections_found: readonly string[];
}

/** Internal return type for each section parser. */
export interface SectionResult<T> {
  readonly value: T | null;
  readonly error: string | null;
}

// ---------------------------------------------------------------------------
// ParsedReport — complete structured output of one autosupport file
// ---------------------------------------------------------------------------

export interface ParsedReport {
  readonly meta: ReportMeta;
  readonly storage: StorageData | null;
  readonly compression: CompressionData | null;
  readonly system_health: SystemHealthData | null;
  readonly disks: DisksData;
  readonly enclosures: readonly EnclosureData[];
  readonly network: NetworkData;
  readonly alerts: AlertsData;
  readonly mtrees: readonly MTreeData[];
  readonly licenses: LicensesData | null;
  readonly replication: ReplicationData | null;
  readonly hardware: HardwareData | null;
}

// ---------------------------------------------------------------------------
// Section types — ordered by dependency / parser file
// ---------------------------------------------------------------------------

/** Extracted from GENERAL INFO section (KEY=VALUE format). */
export interface ReportMeta {
  readonly generated_on: string;               // ISO 8601, no Z suffix
  readonly generated_epoch: number | null;
  readonly timezone: string;                   // IANA, e.g. 'Asia/Baghdad'
  readonly hostname: string;
  readonly location: string | null;
  readonly model: string | null;
  readonly os_version: string | null;          // e.g. 'Data Domain OS 6.2.0.30-629757'
  readonly serial_number: string | null;
  readonly chassis_serial: string | null;
  readonly hw_revision: string | null;
  readonly admin_email: string | null;
  readonly uptime_days: number | null;
  readonly data_encryption_enabled: boolean;
  readonly ssd_shelf_present: boolean;
  readonly ha_enabled: boolean;
}

/** Extracted from SERVER USAGE → Active Tier table. */
export interface StorageData {
  readonly total_gib: number | null;
  readonly used_gib: number | null;
  readonly available_gib: number | null;
  readonly used_percent: number | null;
  readonly cleanable_gib: number | null;
  readonly pre_comp_gib: number | null;
  readonly last_cleaning: string | null;        // ISO 8601
}

/** Currently Used row from Filesys Compression table. */
export interface CompressionCurrentlyUsed {
  readonly pre_comp_gib: number;
  readonly post_comp_gib: number;
  readonly total_factor: number;
  readonly reduction_percent: number;
}

/** One time-window row (Last 7 days / Last 24 hrs) from Filesys Compression. */
export interface CompressionPeriod {
  readonly pre_comp_gib: number;
  readonly post_comp_gib: number;
  readonly global_factor: number | null;
  readonly local_factor: number | null;
  readonly total_factor: number;
  readonly reduction_percent: number;
}

/** Extracted from SERVER USAGE → Filesys Compression table. */
export interface CompressionData {
  readonly period_from: string;               // ISO 8601
  readonly period_to: string;                 // ISO 8601
  readonly currently_used: CompressionCurrentlyUsed;
  readonly last_7_days: CompressionPeriod;
  readonly last_24_hours: CompressionPeriod;
}

/** Extracted from GENERAL STATUS — availability, memory, NFS/CIFS. */
export interface SystemHealthData {
  readonly availability_since: string | null;
  readonly system_availability_percent: number | null;
  readonly system_availability_excl_controlled: number | null;
  readonly filesystem_availability_percent: number | null;
  readonly filesystem_availability_excl_controlled: number | null;
  readonly memory_total_mib: number | null;
  readonly memory_free_mib: number | null;
  readonly memory_inactive_mib: number | null;
  readonly swap_total_mib: number | null;
  readonly swap_free_mib: number | null;
  readonly filesystem_verify_status: string | null;
  readonly nfs_status: string | null;
  readonly cifs_status: string | null;
}

/** One physical disk drive from Disk Show Hardware. */
export interface DiskDrive {
  readonly enclosure: number;
  readonly disk_number: number;
  readonly slot: number;
  readonly manufacturer_model: string;
  readonly firmware: string;
  readonly serial: string;
  readonly capacity_gib: number;
  readonly type: string;
}

/** Disk summary from GENERAL STATUS → Disk States table. */
export interface DisksSummary {
  readonly active_tier_total: number | null;
  readonly active_tier_in_use: number | null;
  readonly active_tier_spare: number | null;
  readonly cache_tier_total: number | null;
  readonly cache_tier_in_use: number | null;
  readonly failed_disks: number;
  readonly overall_status: string | null;
  readonly proactive_check: string | null;
}

export interface DisksData {
  readonly summary: DisksSummary;
  readonly drives: readonly DiskDrive[];
}

/** One fan entry from Enclosure Show All. */
export interface FanEntry {
  readonly description: string;
  readonly level: string;
  readonly status: string;
}

/** One temperature sensor from Enclosure Show All. */
export interface TemperatureEntry {
  readonly description: string;
  readonly celsius: string;                    // raw "16/61" value from file
  readonly status: string;
}

/** One power supply from Enclosure Show All. */
export interface PowerSupplyEntry {
  readonly description: string;
  readonly status: string;
}

/** One enclosure from Enclosure Show Summary + Enclosure Show All. */
export interface EnclosureData {
  readonly id: number;
  readonly model: string;
  readonly serial: string;
  readonly state: string;
  readonly slots: number;
  readonly fans: readonly FanEntry[];
  readonly temperatures: readonly TemperatureEntry[];
  readonly power_supplies: readonly PowerSupplyEntry[];
}

/** One port from Net Show Hardware. */
export interface NetworkPort {
  readonly name: string;
  readonly speed: string;
  readonly duplex: string;
  readonly physical: string;
  readonly hardware_address: string | null;
  readonly link_status: string;
  readonly state: string;
}

export interface NetworkData {
  readonly ports: readonly NetworkPort[];
}

/** One active alert from Current Alerts section. */
export interface AlertEntry {
  readonly id: string;
  readonly post_time: string;                  // ISO 8601
  readonly severity: 'CRITICAL' | 'WARNING' | 'INFO';
  readonly class: string;
  readonly object: string;
  readonly message: string;
}

/** One entry from Alerts History section. */
export interface AlertHistoryEntry {
  readonly id: string;
  readonly post_time: string;
  readonly clear_time: string | null;          // null when alert is still active
  readonly severity: 'CRITICAL' | 'WARNING' | 'INFO';
  readonly class: string;
  readonly object: string;
  readonly message: string;
  readonly status: 'active' | 'cleared';
}

export interface AlertsData {
  readonly active_count: number;
  readonly active: readonly AlertEntry[];
  readonly history: readonly AlertHistoryEntry[];
}

/** Per-mtree compression for one time window. */
export interface MTreeCompressionPeriod {
  readonly pre_comp_gib: number;
  readonly post_comp_gib: number;
  readonly global_factor: number | null;
  readonly local_factor: number | null;
  readonly total_factor: number;
  readonly reduction_percent: number;
}

export interface MTreeCompression {
  readonly last_24h: MTreeCompressionPeriod;
  readonly last_7d: MTreeCompressionPeriod;
}

/** One mtree from Mtree List + DM ASTATS id map + Mtree Show Compression. */
export interface MTreeData {
  readonly name: string;                       // full path, e.g. /data/col1/backup
  readonly mtree_id: string | null;
  readonly status: string;
  readonly pre_comp_gib: number;
  readonly compression: MTreeCompression | null;
}

/** One capacity license entry. */
export interface CapacityLicense {
  readonly feature: string;
  readonly shelf_model: string;
  readonly capacity_tib: number;
  readonly type: string;
  readonly state: string;
}

/** One feature license entry. */
export interface FeatureLicense {
  readonly feature: string;
  readonly count: number;
  readonly type: string;
  readonly state: string;
}

/** Extracted from SOFTWARE CONFIGURATION section. */
export interface LicensesData {
  readonly locking_id: string | null;
  readonly capacity: readonly CapacityLicense[];
  readonly features: readonly FeatureLicense[];
  readonly licensed_active_tier_tib: number | null;
}

/** Extracted from Replication Status section. */
export interface ReplicationData {
  readonly configured: boolean;
  readonly status: string | null;
}

/** Extracted from HARDWARE CONFIGURATION section. */
export interface HardwareData {
  readonly bios_version: string | null;
  readonly bmc_firmware: string | null;
  readonly cpu_model: string | null;
  readonly memory_dimms: number | null;
  readonly memory_dimm_size_mb: number | null;
}
