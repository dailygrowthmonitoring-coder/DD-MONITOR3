import { format, subDays } from 'date-fns'
import {
  querySelectReportsByDevice,
  querySelectReportByDeviceAndDate,
  querySelectReportsForComparison,
  queryUpsertReport,
  querySelectReportChartData,
} from '@/lib/supabase/queries/reports'
import { querySelectDeviceById } from '@/lib/supabase/queries/devices'
import { querySelectStorageByReportId } from '@/lib/supabase/queries/storage'
import { querySelectCompressionByReportId } from '@/lib/supabase/queries/compression'
import { querySelectMtreesByReportId } from '@/lib/supabase/queries/mtrees'
import { querySelectNetworkPortsByReportId } from '@/lib/supabase/queries/network-ports'
import { querySelectSystemHealthByReportId } from '@/lib/supabase/queries/system-health'
import { querySelectReplicationByReportId } from '@/lib/supabase/queries/replication'
import { querySelectAlertsByReportId } from '@/lib/supabase/queries/alerts'
import type { DDReportInsert, DDReportListRow, DDReportDetailRow } from '@/lib/supabase/types'
import type { HistoryChartPoint, CompareReportItem, DeviceReportDetail } from '@/types/dashboard'
import type { ReportMeta, StorageData, CompressionData, MTreeData, NetworkPort, SystemHealthData, ReplicationData, AlertsData, AlertEntry, AlertHistoryEntry } from '@/types/dd-report'

const MAX_PAGE_SIZE = 100

export interface PaginatedReports {
  data: DDReportListRow[]
  total: number
  page: number
  limit: number
}

export async function getReportsByDevice(
  deviceId: string,
  page: number,
  limit: number
): Promise<PaginatedReports> {
  const safeLimit = Math.min(limit, MAX_PAGE_SIZE)
  const from = (page - 1) * safeLimit
  const to   = from + safeLimit - 1
  const { data, count } = await querySelectReportsByDevice(deviceId, from, to)
  return { data, total: count, page, limit: safeLimit }
}

export async function getReportByDeviceAndDate(
  deviceId: string,
  date: string
): Promise<DDReportDetailRow | null> {
  return querySelectReportByDeviceAndDate(deviceId, date)
}

export async function getReportsForComparison(
  deviceIds: string[],
  date: string
): Promise<CompareReportItem[]> {
  return querySelectReportsForComparison(deviceIds, date)
}

export async function upsertReport(insert: DDReportInsert): Promise<DDReportListRow> {
  return queryUpsertReport(insert)
}

// ── Full report (all sections joined) ────────────────────────────────────────

export async function getDeviceReportFull(
  deviceId: string,
  date: string
): Promise<DeviceReportDetail | null> {
  const baseReport = await querySelectReportByDeviceAndDate(deviceId, date)
  if (!baseReport) return null

  const [device, storage, compression, mtrees, ports, health, replication, alertRows] =
    await Promise.all([
      querySelectDeviceById(deviceId),
      querySelectStorageByReportId(baseReport.id),
      querySelectCompressionByReportId(baseReport.id),
      querySelectMtreesByReportId(baseReport.id),
      querySelectNetworkPortsByReportId(baseReport.id),
      querySelectSystemHealthByReportId(baseReport.id),
      querySelectReplicationByReportId(baseReport.id),
      querySelectAlertsByReportId(baseReport.id),
    ])

  const meta: ReportMeta = {
    generated_on:            baseReport.generated_on ?? new Date().toISOString(),
    timezone:                baseReport.timezone ?? 'UTC',
    hostname:                device?.hostname ?? deviceId,
    model:                   device?.model ?? null,
    serial_number:           device?.serial_number ?? null,
    chassis_serial:          device?.chassis_serial ?? null,
    os_version:              device?.os_version ?? null,
    hw_revision:             device?.hw_revision ?? null,
    location:                device?.location ?? null,
    uptime_days:             baseReport.uptime_days,
    data_encryption_enabled: device?.data_encryption_enabled ?? false,
    ha_enabled:              device?.ha_enabled ?? false,
  }

  const storageData: StorageData | null = storage
    ? {
        total_gib:            storage.total_gib,
        used_gib:             storage.used_gib,
        available_gib:        storage.available_gib,
        used_percent:         storage.used_percent,
        cleanable_gib:        storage.cleanable_gib,
        pre_comp_gib:         storage.pre_comp_gib,
        last_cleaning_at:     storage.last_cleaning_at,
        active_tier_size_tib: storage.active_tier_size_tib,
        active_tier_max_tib:  storage.active_tier_max_tib,
        cache_tier_size_tib:  storage.cache_tier_size_tib,
        total_disks:          storage.total_disks,
        in_use_disks:         storage.in_use_disks,
        spare_disks:          storage.spare_disks,
        not_installed_disks:  storage.not_installed_disks,
        cache_in_use_disks:   storage.cache_in_use_disks,
      }
    : null

  const compressionData: CompressionData | null = compression
    ? {
        period_from: compression.period_from ?? '',
        period_to:   compression.period_to ?? '',
        currently_used: {
          pre_comp_gib:     compression.cur_pre_comp_gib ?? 0,
          post_comp_gib:    compression.cur_post_comp_gib ?? 0,
          total_factor:     compression.cur_total_factor ?? 0,
          reduction_percent: compression.cur_reduction_pct ?? 0,
        },
        last_7_days: {
          pre_comp_gib:     compression.w7_pre_gib ?? 0,
          post_comp_gib:    compression.w7_post_gib ?? 0,
          global_factor:    compression.w7_global_factor,
          local_factor:     compression.w7_local_factor,
          total_factor:     compression.w7_total_factor ?? 0,
          reduction_percent: compression.w7_reduction_pct ?? 0,
        },
        last_24_hours: {
          pre_comp_gib:     compression.w24_pre_gib ?? 0,
          post_comp_gib:    compression.w24_post_gib ?? 0,
          global_factor:    compression.w24_global_factor,
          local_factor:     compression.w24_local_factor,
          total_factor:     compression.w24_total_factor ?? 0,
          reduction_percent: compression.w24_reduction_pct ?? 0,
        },
      }
    : null

  const mtreesData: MTreeData[] = mtrees.map(m => ({
    name:          m.name,
    mtree_id:      m.mtree_id ?? '',
    status:        m.status ?? 'unknown',
    pre_comp_gib:  m.pre_comp_gib ?? 0,
    post_comp_gib: m.post_comp_gib,
  }))

  const networkPorts: NetworkPort[] = ports.map(p => ({
    port_name:   p.port_name,
    speed:       p.speed ?? 'unknown',
    duplex:      p.duplex ?? 'unknown',
    link_status: p.link_status ?? 'unknown',
    mac_address: p.mac_address,
    port_type:   p.port_type,
    autoneg:     p.autoneg,
  }))

  const healthData: SystemHealthData | null = health
    ? {
        availability_since:         health.availability_since,
        system_avail_pct:           health.system_avail_pct,
        system_avail_excl_pct:      health.system_avail_excl_pct,
        filesystem_avail_pct:       health.filesystem_avail_pct,
        filesystem_avail_excl_pct:  health.filesystem_avail_excl_pct,
        memory_total_mib:           health.memory_total_mib,
        memory_free_mib:            health.memory_free_mib,
        memory_inactive_mib:        health.memory_inactive_mib,
        swap_total_mib:             health.swap_total_mib,
        swap_free_mib:              health.swap_free_mib,
        nfs_status:                 health.nfs_status,
        cifs_status:                health.cifs_status,
        filesystem_verify_status:   health.filesystem_verify_status,
      }
    : null

  const replData: ReplicationData | null = replication
    ? {
        is_configured:   replication.is_configured,
        destination:     replication.destination,
        status:          replication.status,
        lag_seconds:     replication.lag_seconds,
        last_sync_at:    replication.last_sync_at,
        bytes_remaining: replication.bytes_remaining,
        throughput_mbps: replication.throughput_mbps,
        sync_percent:    replication.sync_percent,
      }
    : null

  const activeAlerts: AlertEntry[] = alertRows
    .filter(a => a.is_active)
    .map(a => ({
      id:        a.alert_id ?? a.id,
      post_time: a.post_time ?? '',
      severity:  (a.severity as AlertEntry['severity']),
      class:     a.class ?? '',
      object:    a.object ?? '',
      message:   a.message,
      is_active: a.is_active,
    }))

  const historyAlerts: AlertHistoryEntry[] = alertRows.map(a => ({
    id:         a.alert_id ?? a.id,
    post_time:  a.post_time ?? '',
    clear_time: a.clear_time ?? null,
    severity:   (a.severity as AlertHistoryEntry['severity']),
    class:      a.class ?? '',
    object:     a.object ?? '',
    message:    a.message,
    status:     (a.status ?? 'active') as AlertHistoryEntry['status'],
  }))

  const alertsData: AlertsData = {
    active_count: activeAlerts.length,
    active:       activeAlerts,
    history:      historyAlerts,
  }

  return {
    id:           baseReport.id,
    device_id:    baseReport.device_id,
    report_date:  baseReport.report_date,
    generated_on: baseReport.generated_on,
    timezone:     baseReport.timezone,
    uptime_days:  baseReport.uptime_days,
    ingested_at:  baseReport.ingested_at,
    is_valid:     baseReport.is_valid,
    parse_errors: baseReport.parse_errors,
    meta,
    storage:       storageData,
    compression:   compressionData,
    mtrees:        mtreesData,
    network:       { ports: networkPorts },
    system_health: healthData,
    replication:   replData,
    alerts:        alertsData,
  }
}

// ── History chart data ────────────────────────────────────────────────────────

export async function getDeviceHistoryData(
  deviceId: string,
  rangeDays: number
): Promise<HistoryChartPoint[]> {
  const fromDate = format(subDays(new Date(), rangeDays), 'yyyy-MM-dd')
  const rows = await querySelectReportChartData(deviceId, fromDate)
  return rows.map(row => ({
    date:                 row.report_date,
    storage_used_gib:     row.storage_used_gib,
    storage_used_percent: row.storage_used_percent,
    compression_factor:   row.compression_factor,
    daily_write_gib:      row.daily_write_gib,
  }))
}
