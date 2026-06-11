/**
 * Supabase database types for DD Monitor.
 *
 * Every type is hand-authored to match the schema in supabase/migrations/ exactly.
 * Column type mapping rules:
 *   UUID         → string
 *   TEXT         → string
 *   NUMERIC(x,y) → number
 *   INTEGER      → number
 *   BIGINT       → number
 *   BOOLEAN      → boolean
 *   TIMESTAMPTZ  → string  (ISO 8601 with timezone)
 *   DATE         → string  (ISO 8601 date, e.g. "2025-03-10")
 *   TEXT[]       → string[]
 *   JSONB        → Record<string, unknown>
 *   Nullable     → T | null
 *   NOT NULL with DEFAULT → still typed as T (database guarantees a value)
 *
 * NOTE: All row/insert/update types are `type` aliases (not `interface`).
 * TypeScript with noUncheckedIndexedAccess:true treats interfaces differently
 * from type aliases when evaluating `T extends Record<string, unknown>`.
 * Interfaces fail this check; type aliases pass it. Supabase's internal
 * GenericTable/GenericSchema constraints require Record<string, unknown>.
 *
 * Usage with Supabase client:
 *   const supabase = createClient<Database>(url, key)
 */

// =============================================================================
// Row types — shape of a SELECT * row for each table
// =============================================================================

/** Row returned by SELECT * FROM dd_devices */
export type DeviceRow = {
  readonly id:                        string;
  readonly hostname:                  string;
  readonly short_name:                string;
  readonly model:                     string | null;
  readonly serial_number:             string | null;
  readonly chassis_serial:            string | null;
  readonly location:                  string | null;
  readonly os_version:                string | null;
  readonly admin_email:               string | null;
  readonly data_encryption_enabled:   boolean | null;
  readonly ha_enabled:                boolean | null;
  readonly total_capacity_gib:        number | null;
  // Snapshot columns
  readonly last_report_date:          string | null;
  readonly last_seen_at:              string | null;
  readonly last_storage_used_gib:     number | null;
  readonly last_storage_total_gib:    number | null;
  readonly last_storage_used_percent: number | null;
  readonly last_compression_factor:   number | null;
  readonly last_active_alerts:        number | null;
  readonly last_critical_alerts:      number | null;
  readonly last_warning_alerts:       number | null;
  readonly last_disk_status:          string | null;
  readonly last_failed_disks:         number | null;
  readonly last_network_ports_down:   number | null;
  readonly last_uptime_days:          number | null;
  readonly last_status:               'healthy' | 'warning' | 'critical' | 'unknown';
  readonly is_active:                 boolean;
  readonly created_at:                string;
  readonly updated_at:                string;
};

/** Shape for INSERT INTO dd_devices (auto-generated fields omitted or optional) */
export type DeviceInsert = {
  readonly id?:                        string;
  readonly hostname:                   string;
  readonly short_name:                 string;
  readonly model?:                     string | null;
  readonly serial_number?:             string | null;
  readonly chassis_serial?:            string | null;
  readonly location?:                  string | null;
  readonly os_version?:                string | null;
  readonly admin_email?:               string | null;
  readonly data_encryption_enabled?:   boolean | null;
  readonly ha_enabled?:                boolean | null;
  readonly total_capacity_gib?:        number | null;
  readonly last_report_date?:          string | null;
  readonly last_seen_at?:              string | null;
  readonly last_storage_used_gib?:     number | null;
  readonly last_storage_total_gib?:    number | null;
  readonly last_storage_used_percent?: number | null;
  readonly last_compression_factor?:   number | null;
  readonly last_active_alerts?:        number | null;
  readonly last_critical_alerts?:      number | null;
  readonly last_warning_alerts?:       number | null;
  readonly last_disk_status?:          string | null;
  readonly last_failed_disks?:         number | null;
  readonly last_network_ports_down?:   number | null;
  readonly last_uptime_days?:          number | null;
  readonly last_status?:               'healthy' | 'warning' | 'critical' | 'unknown';
  readonly is_active?:                 boolean;
  readonly created_at?:                string;
  readonly updated_at?:                string;
};

// ---------------------------------------------------------------------------

/** Row returned by SELECT * FROM dd_reports */
export type ReportRow = {
  readonly id:              string;
  readonly device_id:       string;
  readonly report_date:     string;
  readonly generated_on:    string | null;
  readonly ingested_at:     string;
  readonly file_name:       string | null;
  readonly file_size_bytes: number | null;
  // Storage
  readonly storage_total_gib:         number | null;
  readonly storage_used_gib:          number | null;
  readonly storage_available_gib:     number | null;
  readonly storage_used_percent:      number | null;
  readonly storage_cleanable_gib:     number | null;
  readonly storage_pre_comp_gib:      number | null;
  readonly storage_last_cleaning:     string | null;
  // Compression — currently used
  readonly comp_period_from:          string | null;
  readonly comp_period_to:            string | null;
  readonly comp_total_factor:         number | null;
  readonly comp_reduction_percent:    number | null;
  readonly comp_global_factor:        number | null;
  readonly comp_local_factor:         number | null;
  // Compression — last 7 days
  readonly comp_7day_pre_comp_gib:    number | null;
  readonly comp_7day_post_comp_gib:   number | null;
  readonly comp_7day_global_factor:   number | null;
  readonly comp_7day_local_factor:    number | null;
  readonly comp_7day_total_factor:    number | null;
  readonly comp_7day_reduction_pct:   number | null;
  // Compression — last 24 hours
  readonly comp_24h_pre_comp_gib:     number | null;
  readonly comp_24h_post_comp_gib:    number | null;
  readonly comp_24h_global_factor:    number | null;
  readonly comp_24h_local_factor:     number | null;
  readonly comp_24h_total_factor:     number | null;
  readonly comp_24h_reduction_pct:    number | null;
  // Disks
  readonly disks_active_total:        number | null;
  readonly disks_active_in_use:       number | null;
  readonly disks_active_spare:        number | null;
  readonly disks_cache_total:         number | null;
  readonly disks_cache_in_use:        number | null;
  readonly disks_failed:              number | null;
  readonly disk_overall_status:       string | null;
  readonly disk_proactive_check_msg:  string | null;
  // System health
  readonly sys_availability_since:       string | null;
  readonly sys_availability_percent:     number | null;
  readonly sys_availability_excl_ctrld:  number | null;
  readonly fs_availability_percent:      number | null;
  readonly fs_availability_excl_ctrld:   number | null;
  readonly memory_total_mib:             number | null;
  readonly memory_free_mib:              number | null;
  readonly memory_inactive_mib:          number | null;
  readonly swap_total_mib:               number | null;
  readonly swap_free_mib:                number | null;
  readonly uptime_days:                  number | null;
  readonly filesystem_verify_status:     string | null;
  readonly nfs_status:                   string | null;
  readonly cifs_status:                  string | null;
  readonly data_encryption_enabled:      boolean | null;
  readonly ha_enabled:                   boolean | null;
  // Network summary
  readonly network_ports_total:          number | null;
  readonly network_ports_running:        number | null;
  readonly network_ports_down:           number | null;
  // Replication
  readonly replication_configured:       boolean | null;
  readonly replication_status:           string | null;
  // Alert counts
  readonly active_alerts_total:          number | null;
  readonly active_alerts_critical:       number | null;
  readonly active_alerts_warning:        number | null;
  readonly active_alerts_info:           number | null;
  // Derived status
  readonly device_status:  'healthy' | 'warning' | 'critical' | 'unknown';
  // Parse metadata
  readonly is_valid:        boolean;
  readonly parse_errors:    string[] | null;
  readonly sections_found:  string[] | null;
  // Full detail
  readonly parsed_data:     Record<string, unknown>;
  readonly raw_text_hash:   string | null;
};

/** Shape for INSERT INTO dd_reports */
export type ReportInsert = Omit<ReportRow, 'id' | 'ingested_at'> & {
  readonly id?:          string;
  readonly ingested_at?: string;
};

// ---------------------------------------------------------------------------

/** Row returned by SELECT * FROM dd_alerts */
export type AlertRow = {
  readonly id:          string;
  readonly device_id:   string;
  readonly report_id:   string;
  readonly report_date: string;
  readonly alert_id:    string | null;
  readonly severity:    'CRITICAL' | 'WARNING' | 'INFO';
  readonly class:       string | null;
  readonly object:      string | null;
  readonly message:     string;
  readonly post_time:   string | null;
  readonly clear_time:  string | null;
  readonly is_active:   boolean;
  readonly source:      'appliance' | 'rule_engine';
  readonly created_at:  string;
};

/** Shape for INSERT INTO dd_alerts */
export type AlertInsert = Omit<AlertRow, 'id' | 'created_at'> & {
  readonly id?:         string;
  readonly created_at?: string;
};

// ---------------------------------------------------------------------------

/** Row returned by SELECT * FROM dd_mtrees */
export type MTreeRow = {
  readonly id:            string;
  readonly device_id:     string;
  readonly report_id:     string;
  readonly report_date:   string;
  readonly name:          string;
  readonly mtree_id:      string | null;
  readonly status:        'RW' | 'RO' | 'unknown' | null;
  readonly pre_comp_gib:  number | null;
  readonly post_comp_gib: number | null;
  readonly created_at:    string;
};

/** Shape for INSERT INTO dd_mtrees */
export type MTreeInsert = Omit<MTreeRow, 'id' | 'created_at'> & {
  readonly id?:         string;
  readonly created_at?: string;
};

// ---------------------------------------------------------------------------

/** Row returned by SELECT * FROM dd_disks */
export type DiskRow = {
  readonly id:               string;
  readonly device_id:        string;
  readonly report_id:        string;
  readonly report_date:      string;
  readonly enclosure_id:     number | null;
  readonly enclosure_model:  string | null;
  readonly enclosure_serial: string | null;
  readonly slot_number:      number | null;
  readonly label:            string | null;
  readonly tier:             'active' | 'cache' | 'unknown' | null;
  readonly state:            'in_use' | 'spare' | 'failed' | 'absent' | 'unknown' | null;
  readonly model:            string | null;
  readonly serial_number:    string | null;
  readonly firmware_version: string | null;
  readonly capacity_gib:     number | null;
  readonly created_at:       string;
};

/** Shape for INSERT INTO dd_disks */
export type DiskInsert = Omit<DiskRow, 'id' | 'created_at'> & {
  readonly id?:         string;
  readonly created_at?: string;
};

// ---------------------------------------------------------------------------

/** Row returned by SELECT * FROM dd_network_ports */
export type NetworkPortRow = {
  readonly id:               string;
  readonly device_id:        string;
  readonly report_id:        string;
  readonly report_date:      string;
  readonly name:             string;
  readonly speed:            string | null;
  readonly duplex:           string | null;
  readonly physical_type:    string | null;
  readonly hardware_address: string | null;
  readonly link_status:      string | null;
  readonly state:            string | null;
  readonly is_down:          boolean;
  readonly created_at:       string;
};

/** Shape for INSERT INTO dd_network_ports */
export type NetworkPortInsert = Omit<NetworkPortRow, 'id' | 'created_at'> & {
  readonly id?:         string;
  readonly created_at?: string;
};

// ---------------------------------------------------------------------------

/** Row returned by SELECT * FROM system_logs */
export type SystemLogRow = {
  readonly id:             string;
  readonly event_type:     'ingestion' | 'parse' | 'alert_evaluation' | 'alert_sent' | 'cleanup' | 'auth' | 'export';
  readonly severity:       'INFO' | 'WARNING' | 'ERROR';
  readonly device_id:      string | null;
  readonly report_id:      string | null;
  readonly message:        string;
  readonly details:        Record<string, unknown> | null;
  readonly correlation_id: string | null;
  readonly created_at:     string;
};

/** Shape for INSERT INTO system_logs */
export type SystemLogInsert = Omit<SystemLogRow, 'id' | 'created_at'> & {
  readonly id?:         string;
  readonly created_at?: string;
};

// ---------------------------------------------------------------------------

/** Row returned by SELECT * FROM email_notifications */
export type EmailNotificationRow = {
  readonly id:            string;
  readonly email_type:    'report_received' | 'missing_report' | 'parse_error' | 'storage_cleanup' | 'weekly_report';
  readonly device_id:     string | null;
  readonly report_date:   string | null;
  readonly recipients:    string[];
  readonly subject:       string;
  readonly body_preview:  string | null;
  readonly status:        'sent' | 'failed';
  readonly error_message: string | null;
  readonly sent_at:       string;
};

/** Shape for INSERT INTO email_notifications */
export type EmailNotificationInsert = Omit<EmailNotificationRow, 'id' | 'sent_at'> & {
  readonly id?:      string;
  readonly sent_at?: string;
};

// ---------------------------------------------------------------------------

/** Row returned by SELECT * FROM alert_rules */
export type AlertRuleRow = {
  readonly id:          string;
  readonly rule_key:    string;
  readonly description: string;
  readonly metric:      string;
  readonly operator:    '>' | '>=' | '<' | '<=' | '=';
  readonly threshold:   number;
  readonly severity:    'CRITICAL' | 'WARNING' | 'INFO';
  readonly is_enabled:  boolean;
  readonly created_at:  string;
  readonly updated_at:  string;
};

/** Shape for INSERT INTO alert_rules */
export type AlertRuleInsert = Omit<AlertRuleRow, 'id' | 'created_at' | 'updated_at'> & {
  readonly id?:         string;
  readonly created_at?: string;
  readonly updated_at?: string;
};

/** Shape for UPDATE on alert_rules (all fields optional except id) */
export type AlertRuleUpdate = Partial<AlertRuleInsert>;


// =============================================================================
// Materialized view row types
// =============================================================================

/** Row from the fleet_storage_trend materialized view */
export type FleetStorageTrendRow = {
  readonly report_date:           string;
  readonly device_id:             string;
  readonly short_name:            string;
  readonly hostname:              string;
  readonly location:              string | null;
  readonly storage_used_gib:      number | null;
  readonly storage_total_gib:     number | null;
  readonly storage_used_percent:  number | null;
  readonly storage_pre_comp_gib:  number | null;
  readonly comp_total_factor:     number | null;
  readonly comp_reduction_percent: number | null;
  readonly comp_7day_total_factor: number | null;
  readonly comp_24h_total_factor:  number | null;
  readonly device_status:         'healthy' | 'warning' | 'critical' | 'unknown';
};

/** Row from the fleet_daily_summary materialized view */
export type FleetDailySummaryRow = {
  readonly report_date:           string;
  readonly devices_reporting:     number | null;
  readonly fleet_total_gib:       number | null;
  readonly fleet_used_gib:        number | null;
  readonly avg_used_percent:      number | null;
  readonly fleet_pre_comp_gib:    number | null;
  readonly avg_compression_factor: number | null;
  readonly fleet_active_alerts:   number | null;
  readonly fleet_critical_alerts: number | null;
  readonly fleet_warning_alerts:  number | null;
  readonly devices_critical:      number | null;
  readonly devices_warning:       number | null;
  readonly devices_healthy:       number | null;
  readonly fleet_failed_disks:    number | null;
  readonly fleet_ports_down:      number | null;
};

/** Row from the device_capacity_comparison materialized view */
export type DeviceCapacityComparisonRow = {
  readonly device_id:                  string;
  readonly short_name:                 string;
  readonly hostname:                   string;
  readonly location:                   string | null;
  readonly model:                      string | null;
  readonly last_status:                'healthy' | 'warning' | 'critical' | 'unknown';
  readonly total_capacity_gib:         number | null;
  readonly last_storage_used_gib:      number | null;
  readonly last_storage_total_gib:     number | null;
  readonly last_storage_used_percent:  number | null;
  readonly last_compression_factor:    number | null;
  readonly last_active_alerts:         number | null;
  readonly last_critical_alerts:       number | null;
  readonly last_warning_alerts:        number | null;
  readonly last_failed_disks:          number | null;
  readonly last_network_ports_down:    number | null;
  readonly last_report_date:           string | null;
  readonly last_uptime_days:           number | null;
  readonly estimated_runway_days:      number | null;
};

/** Row from the alert_trend_summary materialized view */
export type AlertTrendSummaryRow = {
  readonly report_date:    string;
  readonly device_id:      string;
  readonly short_name:     string;
  readonly critical_count: number | null;
  readonly warning_count:  number | null;
  readonly info_count:     number | null;
  readonly total_count:    number | null;
};


// =============================================================================
// Function return types
// =============================================================================

/** Return type of get_fleet_health_summary() */
export type FleetHealthSummaryRow = {
  readonly total_devices:           number;
  readonly devices_reported_today:  number;
  readonly devices_missing_today:   number;
  readonly reports_stored_total:    number;
  readonly oldest_report_date:      string | null;
  readonly newest_report_date:      string | null;
  readonly devices_critical:        number;
  readonly devices_warning:         number;
  readonly devices_healthy:         number;
};

/** Return type of cleanup_old_reports() */
export type CleanupResult = {
  readonly reports_deleted: number;
  readonly logs_deleted:    number;
  readonly emails_deleted:  number;
};


// =============================================================================
// Database interface — used as the generic parameter for createClient<Database>()
// =============================================================================

export type Database = {
  public: {
    Tables: {
      dd_devices: {
        Row:           DeviceRow;
        Insert:        DeviceInsert;
        Update:        Partial<DeviceInsert>;
        Relationships: [];
      };
      dd_reports: {
        Row:           ReportRow;
        Insert:        ReportInsert;
        Update:        Partial<ReportInsert>;
        Relationships: [];
      };
      dd_alerts: {
        Row:           AlertRow;
        Insert:        AlertInsert;
        Update:        Partial<AlertInsert>;
        Relationships: [];
      };
      dd_mtrees: {
        Row:           MTreeRow;
        Insert:        MTreeInsert;
        Update:        Partial<MTreeInsert>;
        Relationships: [];
      };
      dd_disks: {
        Row:           DiskRow;
        Insert:        DiskInsert;
        Update:        Partial<DiskInsert>;
        Relationships: [];
      };
      dd_network_ports: {
        Row:           NetworkPortRow;
        Insert:        NetworkPortInsert;
        Update:        Partial<NetworkPortInsert>;
        Relationships: [];
      };
      system_logs: {
        Row:           SystemLogRow;
        Insert:        SystemLogInsert;
        Update:        Partial<SystemLogInsert>;
        Relationships: [];
      };
      email_notifications: {
        Row:           EmailNotificationRow;
        Insert:        EmailNotificationInsert;
        Update:        Partial<EmailNotificationInsert>;
        Relationships: [];
      };
      alert_rules: {
        Row:           AlertRuleRow;
        Insert:        AlertRuleInsert;
        Update:        AlertRuleUpdate;
        Relationships: [];
      };
    };
    Views: {
      fleet_storage_trend: {
        Row:           FleetStorageTrendRow;
        Relationships: [];
      };
      fleet_daily_summary: {
        Row:           FleetDailySummaryRow;
        Relationships: [];
      };
      device_capacity_comparison: {
        Row:           DeviceCapacityComparisonRow;
        Relationships: [];
      };
      alert_trend_summary: {
        Row:           AlertTrendSummaryRow;
        Relationships: [];
      };
    };
    Functions: {
      refresh_materialized_views: {
        Args:    Record<string, never>;
        Returns: null;
      };
      cleanup_old_reports: {
        Args:    { retention_days?: number };
        Returns: CleanupResult[];
      };
      has_email_been_sent_today: {
        Args:    { p_email_type: string; p_device_id: string; p_report_date: string };
        Returns: boolean;
      };
      get_fleet_health_summary: {
        Args:    Record<string, never>;
        Returns: FleetHealthSummaryRow[];
      };
    };
  };
};
