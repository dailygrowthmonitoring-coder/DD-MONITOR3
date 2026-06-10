export interface ReportMeta {
  generated_on: string
  timezone: string
  hostname: string
  model: string | null
  serial_number: string | null
  chassis_serial: string | null
  os_version: string | null
  hw_revision: string | null
  location: string | null
  uptime_days: number | null
  data_encryption_enabled: boolean
  ha_enabled: boolean
}

// Maps to dd_storage
export interface StorageData {
  total_gib: number | null
  used_gib: number | null
  available_gib: number | null
  used_percent: number | null
  cleanable_gib: number | null
  pre_comp_gib: number | null
  last_cleaning_at: string | null
  // From DETAILED STORAGE LAYER
  active_tier_size_tib: number | null
  active_tier_max_tib: number | null
  cache_tier_size_tib: number | null
  // Disk counts (from Disk Status + Disk Show State)
  total_disks: number | null
  in_use_disks: number | null
  spare_disks: number | null
  not_installed_disks: number | null
  cache_in_use_disks: number | null
}

// Maps to dd_compression
export interface CompressionCurrentlyUsed {
  pre_comp_gib: number
  post_comp_gib: number
  total_factor: number
  reduction_percent: number
}

export interface CompressionPeriod {
  pre_comp_gib: number
  post_comp_gib: number
  global_factor: number | null
  local_factor: number | null
  total_factor: number
  reduction_percent: number
}

export interface CompressionData {
  period_from: string
  period_to: string
  currently_used: CompressionCurrentlyUsed
  last_7_days: CompressionPeriod
  last_24_hours: CompressionPeriod
}

// Maps to dd_mtrees
export interface MTreeData {
  name: string
  mtree_id: string
  status: string
  pre_comp_gib: number
  post_comp_gib: number | null
}

// Maps to dd_disk_groups
export interface DiskGroupData {
  group_name: string
  disk_slots: string | null
  disk_count: number | null
  disk_size_tib: number | null
  tier_type: 'active' | 'cache' | 'spare'
}

// Maps to dd_performance_metrics
export interface PerformanceMetricData {
  metric_time: string
  read_mbps: number | null
  write_mbps: number | null
  repl_in_mbps: number | null
  repl_out_mbps: number | null
  repl_precomp_in_mbps: number | null
  repl_precomp_out_mbps: number | null
  compression_ops: number | null
  pre_comp_used_pct: number | null
  cache_miss_data_in: number | null
  cache_miss_data_out: number | null
  cache_miss_wait_in: number | null
  cache_miss_wait_out: number | null
  cpu_avg_pct: number | null
  cpu_max_pct: number | null
  disk_util_pct: number | null
  util_thra_pct: number | null
  util_unus_pct: number | null
  util_ovhd_pct: number | null
  util_data_pct: number | null
  util_meta_pct: number | null
  streams_read: number | null
  streams_write: number | null
  streams_repl_in: number | null
  streams_repl_out: number | null
  latency_avg_ms: number | null
  latency_max_ms: number | null
  gcomp_pct: number | null
  lcomp_pct: number | null
}

// Maps to dd_backup_summary
export interface BackupSummaryData {
  jobs_total: number
  jobs_ok: number
  jobs_failed: number
  jobs_scheduled: number
  success_rate_pct: number | null
  avg_duration_min: number | null
  total_data_written_gib: number | null
  status: 'ok' | 'warning' | 'critical' | 'scheduled' | 'unknown'
}

// Maps to dd_network_ports
export interface NetworkPort {
  port_name: string
  speed: string
  duplex: string
  link_status: string
  mac_address: string | null
  port_type: string | null
  autoneg: string | null
}

export interface NetworkData {
  ports: NetworkPort[]
}

// Maps to dd_system_health
export interface SystemHealthData {
  availability_since: string | null
  system_avail_pct: number | null
  system_avail_excl_pct: number | null
  filesystem_avail_pct: number | null
  filesystem_avail_excl_pct: number | null
  memory_total_mib: number | null
  memory_free_mib: number | null
  memory_inactive_mib: number | null
  swap_total_mib: number | null
  swap_free_mib: number | null
  nfs_status: string | null
  cifs_status: string | null
  filesystem_verify_status: string | null
}

// Maps to dd_replication
export interface ReplicationData {
  is_configured: boolean
  destination: string | null
  status: string | null
  lag_seconds: number | null
  last_sync_at: string | null
  bytes_remaining: number | null
  throughput_mbps: number | null
  sync_percent: number | null
}

// Alerts (maps to dd_alerts)
export interface AlertEntry {
  id: string
  post_time: string
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  class: string
  object: string
  message: string
  is_active: boolean
}

export interface AlertHistoryEntry {
  id: string
  post_time: string
  clear_time: string | null
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  class: string
  object: string
  message: string
  status: 'active' | 'cleared'
}

export interface AlertsData {
  active_count: number
  active: AlertEntry[]
  history: AlertHistoryEntry[]
}

// Full parsed report returned by the parser
export interface DDReport {
  meta: ReportMeta
  storage: StorageData | null
  compression: CompressionData | null
  mtrees: MTreeData[]
  disk_groups: DiskGroupData[]
  performance_metrics: PerformanceMetricData[]
  backup_summary: BackupSummaryData | null
  network: NetworkData
  system_health: SystemHealthData | null
  replication: ReplicationData | null
  alerts: AlertsData
}
