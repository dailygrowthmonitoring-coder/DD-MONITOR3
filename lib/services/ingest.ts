import { parseReport }          from '@/lib/parser/index'
import { findOrCreateDevice }   from './devices'
import { upsertReport }         from './reports'
import { replaceAlertsForReport } from './alerts'
import { logEvent }             from './log'
import { queryUpsertStorage }   from '@/lib/supabase/queries/storage'
import { queryUpsertCompression } from '@/lib/supabase/queries/compression'
import {
  queryDeleteMtreesByReportId,
  queryInsertMtrees,
} from '@/lib/supabase/queries/mtrees'
import {
  queryDeleteDiskGroupsByReportId,
  queryInsertDiskGroups,
} from '@/lib/supabase/queries/disk-groups'
import {
  queryDeletePerformanceByReportId,
  queryInsertPerformance,
} from '@/lib/supabase/queries/performance'
import { queryUpsertBackupSummary }   from '@/lib/supabase/queries/backup'
import {
  queryDeleteNetworkPortsByReportId,
  queryInsertNetworkPorts,
} from '@/lib/supabase/queries/network-ports'
import { queryUpsertSystemHealth } from '@/lib/supabase/queries/system-health'
import { queryUpsertReplication }  from '@/lib/supabase/queries/replication'
import type { DDReportInsert } from '@/lib/supabase/types'

function extractHostnameFromFilename(filename: string): string {
  const parenMatch = filename.match(/\(([^)]+)\)/)
  if (parenMatch) return parenMatch[1]
  return filename.replace(/\.txt$/i, '').split('_').pop() ?? filename
}

export interface IngestResult {
  success: boolean
  device_id: string
  hostname: string
  report_date: string
  parse_errors: string[]
}

export async function processIngest(
  rawText: string,
  filename: string
): Promise<IngestResult> {
  const { data: parsed, parse_errors } = parseReport(rawText)

  const fromFilename = extractHostnameFromFilename(filename)
  const hostname =
    !fromFilename || fromFilename.toLowerCase() === 'unknown'
      ? (parsed.meta?.hostname ?? 'unknown')
      : fromFilename

  const reportDate = parsed.meta.generated_on.slice(0, 10)

  const device = await findOrCreateDevice({
    hostname,
    model:                   parsed.meta.model ?? undefined,
    serial_number:           parsed.meta.serial_number ?? undefined,
    chassis_serial:          parsed.meta.chassis_serial ?? undefined,
    os_version:              parsed.meta.os_version ?? undefined,
    hw_revision:             parsed.meta.hw_revision ?? undefined,
    location:                parsed.meta.location ?? undefined,
    data_encryption_enabled: parsed.meta.data_encryption_enabled,
    ha_enabled:              parsed.meta.ha_enabled,
  })

  const reportInsert: DDReportInsert = {
    device_id:    device.id,
    report_date:  reportDate,
    generated_on: parsed.meta.generated_on,
    timezone:     parsed.meta.timezone,
    uptime_days:  parsed.meta.uptime_days,
    is_valid:     parse_errors.length === 0,
    parse_errors: parse_errors.length > 0 ? parse_errors.join('\n') : null,
  }

  const report = await upsertReport(reportInsert)
  const reportId = report.id

  async function tryInsert(table: string, fn: () => Promise<unknown>) {
    try {
      await fn()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[ingest] Failed insert into ${table}:`, message, err)
      throw new Error(`${table}: ${message}`)
    }
  }

  // Save detail tables in parallel where possible
  await Promise.all([
    parsed.storage
      ? tryInsert('dd_storage', () => queryUpsertStorage({
          report_id:           reportId,
          device_id:           device.id,
          report_date:         reportDate,
          total_gib:           parsed.storage!.total_gib,
          used_gib:            parsed.storage!.used_gib,
          available_gib:       parsed.storage!.available_gib,
          used_percent:        parsed.storage!.used_percent,
          cleanable_gib:       parsed.storage!.cleanable_gib,
          pre_comp_gib:        parsed.storage!.pre_comp_gib,
          last_cleaning_at:    parsed.storage!.last_cleaning_at,
          active_tier_size_tib: parsed.storage!.active_tier_size_tib,
          active_tier_max_tib:  parsed.storage!.active_tier_max_tib,
          cache_tier_size_tib:  parsed.storage!.cache_tier_size_tib,
          total_disks:         parsed.storage!.total_disks,
          in_use_disks:        parsed.storage!.in_use_disks,
          spare_disks:         parsed.storage!.spare_disks,
          not_installed_disks: parsed.storage!.not_installed_disks,
          cache_in_use_disks:  parsed.storage!.cache_in_use_disks,
        }))
      : Promise.resolve(),

    parsed.compression
      ? tryInsert('dd_compression', () => queryUpsertCompression({
          report_id:         reportId,
          device_id:         device.id,
          report_date:       reportDate,
          period_from:       parsed.compression!.period_from,
          period_to:         parsed.compression!.period_to,
          cur_pre_comp_gib:  parsed.compression!.currently_used.pre_comp_gib,
          cur_post_comp_gib: parsed.compression!.currently_used.post_comp_gib,
          cur_total_factor:  parsed.compression!.currently_used.total_factor,
          cur_reduction_pct: parsed.compression!.currently_used.reduction_percent,
          w7_pre_gib:        parsed.compression!.last_7_days.pre_comp_gib,
          w7_post_gib:       parsed.compression!.last_7_days.post_comp_gib,
          w7_global_factor:  parsed.compression!.last_7_days.global_factor,
          w7_local_factor:   parsed.compression!.last_7_days.local_factor,
          w7_total_factor:   parsed.compression!.last_7_days.total_factor,
          w7_reduction_pct:  parsed.compression!.last_7_days.reduction_percent,
          w24_pre_gib:       parsed.compression!.last_24_hours.pre_comp_gib,
          w24_post_gib:      parsed.compression!.last_24_hours.post_comp_gib,
          w24_global_factor: parsed.compression!.last_24_hours.global_factor,
          w24_local_factor:  parsed.compression!.last_24_hours.local_factor,
          w24_total_factor:  parsed.compression!.last_24_hours.total_factor,
          w24_reduction_pct: parsed.compression!.last_24_hours.reduction_percent,
        }))
      : Promise.resolve(),

    parsed.system_health
      ? tryInsert('dd_system_health', () => queryUpsertSystemHealth({
          report_id:                  reportId,
          device_id:                  device.id,
          report_date:                reportDate,
          availability_since:         parsed.system_health!.availability_since,
          system_avail_pct:           parsed.system_health!.system_avail_pct,
          system_avail_excl_pct:      parsed.system_health!.system_avail_excl_pct,
          filesystem_avail_pct:       parsed.system_health!.filesystem_avail_pct,
          filesystem_avail_excl_pct:  parsed.system_health!.filesystem_avail_excl_pct,
          memory_total_mib:           parsed.system_health!.memory_total_mib,
          memory_free_mib:            parsed.system_health!.memory_free_mib,
          memory_inactive_mib:        parsed.system_health!.memory_inactive_mib,
          swap_total_mib:             parsed.system_health!.swap_total_mib,
          swap_free_mib:              parsed.system_health!.swap_free_mib,
          nfs_status:                 parsed.system_health!.nfs_status,
          cifs_status:                parsed.system_health!.cifs_status,
          filesystem_verify_status:   parsed.system_health!.filesystem_verify_status,
        }))
      : Promise.resolve(),

    parsed.replication
      ? tryInsert('dd_replication', () => queryUpsertReplication({
          report_id:       reportId,
          device_id:       device.id,
          report_date:     reportDate,
          is_configured:   parsed.replication!.is_configured,
          destination:     parsed.replication!.destination,
          status:          parsed.replication!.status,
          lag_seconds:     parsed.replication!.lag_seconds,
          last_sync_at:    parsed.replication!.last_sync_at,
          bytes_remaining: parsed.replication!.bytes_remaining,
          throughput_mbps: parsed.replication!.throughput_mbps,
          sync_percent:    parsed.replication!.sync_percent,
        }))
      : Promise.resolve(),

    parsed.backup_summary
      ? tryInsert('dd_backup_summary', () => queryUpsertBackupSummary({
          report_id:             reportId,
          device_id:             device.id,
          report_date:           reportDate,
          jobs_total:            parsed.backup_summary!.jobs_total,
          jobs_ok:               parsed.backup_summary!.jobs_ok,
          jobs_failed:           parsed.backup_summary!.jobs_failed,
          jobs_scheduled:        parsed.backup_summary!.jobs_scheduled,
          success_rate_pct:      parsed.backup_summary!.success_rate_pct,
          avg_duration_min:      parsed.backup_summary!.avg_duration_min,
          total_data_written_gib: parsed.backup_summary!.total_data_written_gib,
          status:                parsed.backup_summary!.status,
        }))
      : Promise.resolve(),
  ])

  // Sequential inserts (delete-then-insert)
  await tryInsert('dd_mtrees (delete)', () => queryDeleteMtreesByReportId(reportId))
  if (parsed.mtrees.length > 0) {
    await tryInsert('dd_mtrees (insert)', () => queryInsertMtrees(
      parsed.mtrees.map(m => ({
        report_id:     reportId,
        device_id:     device.id,
        report_date:   reportDate,
        name:          m.name,
        mtree_id:      m.mtree_id || null,
        status:        m.status,
        pre_comp_gib:  m.pre_comp_gib,
        post_comp_gib: m.post_comp_gib,
      }))
    ))
  }

  await tryInsert('dd_disk_groups (delete)', () => queryDeleteDiskGroupsByReportId(reportId))
  if (parsed.disk_groups.length > 0) {
    await tryInsert('dd_disk_groups (insert)', () => queryInsertDiskGroups(
      parsed.disk_groups.map(dg => ({
        report_id:    reportId,
        device_id:    device.id,
        report_date:  reportDate,
        group_name:   dg.group_name,
        disk_slots:   dg.disk_slots,
        disk_count:   dg.disk_count,
        disk_size_tib: dg.disk_size_tib,
        tier_type:    dg.tier_type,
      }))
    ))
  }

  await tryInsert('dd_network_ports (delete)', () => queryDeleteNetworkPortsByReportId(reportId))
  if (parsed.network.ports.length > 0) {
    await tryInsert('dd_network_ports (insert)', () => queryInsertNetworkPorts(
      parsed.network.ports.map(p => ({
        report_id:   reportId,
        device_id:   device.id,
        report_date: reportDate,
        port_name:   p.port_name,
        speed:       p.speed,
        duplex:      p.duplex,
        link_status: p.link_status,
        mac_address: p.mac_address,
        port_type:   p.port_type,
        autoneg:     p.autoneg,
      }))
    ))
  }

  // Performance metrics — large batch, delete old first
  await tryInsert('dd_performance (delete)', () => queryDeletePerformanceByReportId(reportId))
  if (parsed.performance_metrics.length > 0) {
    await tryInsert('dd_performance (insert)', () => queryInsertPerformance(
      parsed.performance_metrics.map(pm => ({
        report_id:             reportId,
        device_id:             device.id,
        metric_time:           pm.metric_time,
        read_mbps:             pm.read_mbps,
        write_mbps:            pm.write_mbps,
        repl_in_mbps:          pm.repl_in_mbps,
        repl_out_mbps:         pm.repl_out_mbps,
        repl_precomp_in_mbps:  pm.repl_precomp_in_mbps,
        repl_precomp_out_mbps: pm.repl_precomp_out_mbps,
        compression_ops:       pm.compression_ops,
        pre_comp_used_pct:     pm.pre_comp_used_pct,
        cache_miss_data_in:    pm.cache_miss_data_in,
        cache_miss_data_out:   pm.cache_miss_data_out,
        cache_miss_wait_in:    pm.cache_miss_wait_in,
        cache_miss_wait_out:   pm.cache_miss_wait_out,
        cpu_avg_pct:           pm.cpu_avg_pct,
        cpu_max_pct:           pm.cpu_max_pct,
        disk_util_pct:         pm.disk_util_pct,
        util_thra_pct:         pm.util_thra_pct,
        util_unus_pct:         pm.util_unus_pct,
        util_ovhd_pct:         pm.util_ovhd_pct,
        util_data_pct:         pm.util_data_pct,
        util_meta_pct:         pm.util_meta_pct,
        streams_read:          pm.streams_read,
        streams_write:         pm.streams_write,
        streams_repl_in:       pm.streams_repl_in,
        streams_repl_out:      pm.streams_repl_out,
        latency_avg_ms:        pm.latency_avg_ms,
        latency_max_ms:        pm.latency_max_ms,
        gcomp_pct:             pm.gcomp_pct,
        lcomp_pct:             pm.lcomp_pct,
      }))
    ))
  }

  await replaceAlertsForReport(
    device.id,
    reportId,
    reportDate,
    parsed.alerts.active
  )

  await logEvent({
    event_type: 'INGEST_SUCCESS',
    device_id: device.id,
    message: `Report ingested: ${hostname} on ${reportDate}`,
    details: { filename, parse_error_count: parse_errors.length } as unknown as Record<string, unknown>,
    severity: parse_errors.length > 0 ? 'WARNING' : 'INFO',
  })

  return {
    success: true,
    device_id: device.id,
    hostname,
    report_date: reportDate,
    parse_errors,
  }
}
