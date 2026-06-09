export interface ReportMeta {
  generated_on: string
  timezone: string
  hostname: string
  model: string | null
  serial_number: string | null
  chassis_serial: string | null
  os_version: string | null
  location: string | null
  uptime_days: number | null
  data_encryption_enabled: boolean
  ha_enabled: boolean
}

export interface StorageData {
  total_gib: number
  used_gib: number
  available_gib: number
  used_percent: number
  cleanable_gib: number | null
  pre_comp_gib: number
  last_cleaning: string | null
}

export interface CompressionPeriod {
  pre_comp_gib: number
  post_comp_gib: number
  global_factor: string | null
  local_factor: string | null
  total_factor: string
  reduction_percent: number
}

export interface CompressionCurrentlyUsed {
  pre_comp_gib: number
  post_comp_gib: number
  total_factor: string
  reduction_percent: number
}

export interface CompressionData {
  period_from: string
  period_to: string
  currently_used: CompressionCurrentlyUsed
  last_7_days: CompressionPeriod
  last_24_hours: CompressionPeriod
}

export interface MTreeData {
  name: string
  id: string
  status: string
  pre_comp_gib: number
  post_comp_gib: number | null
}

export interface DiskSummary {
  active_tier_in_use: number
  active_tier_spare: number | null
  active_tier_total: number
  cache_tier_in_use: number | null
  overall_status: string
}

export interface DiskData {
  summary: DiskSummary
  proactive_check: string
}

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

export interface NetworkPort {
  name: string
  speed: string
  duplex: string
  link: string
}

export interface NetworkData {
  ports: NetworkPort[]
}

export interface SystemHealthData {
  availability_since: string | null
  system_availability_percent: number | null
  filesystem_availability_percent: number | null
  memory_total_mib: number | null
  memory_free_mib: number | null
  swap_total_mib: number | null
  swap_free_mib: number | null
  filesystem_verify_status: string | null
  nfs_status: string | null
  cifs_status: string | null
}

export interface ReplicationData {
  configured: boolean
  status: string
}

export interface DDReport {
  meta: ReportMeta
  storage: StorageData | null
  compression: CompressionData | null
  mtrees: MTreeData[]
  disks: DiskData | null
  alerts: AlertsData
  network: NetworkData
  replication: ReplicationData | null
  system_health: SystemHealthData | null
}
