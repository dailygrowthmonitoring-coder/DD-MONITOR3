/**
 * ReportRepository — data access for dd_reports.
 *
 * dd_reports is the largest table and the most critical for performance. Every
 * read here uses the indexed columns defined in 002_indexes_performance.sql.
 * The `parsed_data` JSONB column is selected ONLY for Device Detail queries
 * (findDetailById), never for list or chart queries.
 *
 * Upsert semantics: UNIQUE(device_id, report_date) enforces idempotency.
 * Re-ingesting the same device+date updates the existing row.
 */

import type { ReportRow, ReportInsert } from '@/lib/supabase/types';
import {
  type Report,
  type CreateReport,
  type StorageSnapshot,
  type CompressionSnapshot,
  type CompressionWindow,
  type DiskSummary,
  type SystemHealthSnapshot,
  type ReplicationState,
  DeviceStatus,
} from '@/lib/domain';
import { Gib } from '@/lib/domain/value-objects/gib.vo';
import { StoragePercent } from '@/lib/domain/value-objects/storage-percent.vo';
import { CompressionFactor } from '@/lib/domain/value-objects/compression-factor.vo';
import { NotFoundError } from '@/lib/infrastructure/errors/app-error';
import { ok, err, type AsyncResult } from '@/lib/infrastructure/errors/result';
import { type DDSupabaseClient, supabaseErr } from './base.repository';

// ---------------------------------------------------------------------------
// Supporting input type for upsert
// ---------------------------------------------------------------------------

/**
 * All parameters needed to upsert a report row.
 * The ingest service builds this from the ParsedReport + AlertEngine output.
 */
export interface ReportUpsertParams {
  readonly report:         CreateReport;
  readonly parsedData:     Record<string, unknown>;
  readonly fileName?:      string;
  readonly fileSizeBytes?: number;
  readonly rawTextHash?:   string;
}

// ---------------------------------------------------------------------------
// Repository class
// ---------------------------------------------------------------------------

export class ReportRepository {
  constructor(private readonly db: DDSupabaseClient) {}

  // ── Reads ──────────────────────────────────────────────────────────────────

  /**
   * Checks whether a report already exists for a device + date combination.
   * Used by IngestionService as the idempotency check before re-parsing.
   *
   * @returns Ok(Report) if exists (WITHOUT parsed_data), Ok(null) if not.
   */
  async findByDeviceAndDate(deviceId: string, date: string): AsyncResult<Report | null> {
    const { data, error } = await this.db
      .from('dd_reports')
      .select('*, parsed_data')
      .eq('device_id', deviceId)
      .eq('report_date', date)
      .maybeSingle();

    if (error !== null) return supabaseErr(error);
    if (data === null) return ok(null);
    return ok(this.rowToEntity(data, false));
  }

  /**
   * Checks whether a report with a given raw-text hash already exists.
   * Returns the existing report id if found, null otherwise.
   * Used by IngestionService to skip re-parsing of identical files.
   *
   * @param hash - SHA-256 hex of the raw autosupport text.
   * @returns Ok(reportId) if found, Ok(null) if not found.
   */
  async findIdByHash(hash: string): AsyncResult<string | null> {
    const { data, error } = await this.db
      .from('dd_reports')
      .select('id')
      .eq('raw_text_hash', hash)
      .maybeSingle();

    if (error !== null) return supabaseErr(error);
    return ok(data?.id ?? null);
  }

  /**
   * Returns the N most recent reports for a device, ordered newest first.
   * Used by the History page and the analytics service.
   * Does NOT include parsed_data.
   *
   * @param deviceId - Device UUID.
   * @param limit    - Maximum number of rows (default 40 = max retention days).
   */
  async findRecentByDevice(deviceId: string, limit = 40): AsyncResult<Report[]> {
    const { data, error } = await this.db
      .from('dd_reports')
      .select('*')
      .eq('device_id', deviceId)
      .eq('is_valid', true)
      .order('report_date', { ascending: false })
      .limit(limit);

    if (error !== null) return supabaseErr(error);
    return ok((data ?? []).map(r => this.rowToEntity(r, false)));
  }

  /**
   * Fetches the full report including parsed_data JSONB.
   * Used by the Device Detail page for the deep-dive view.
   *
   * @param id - Report UUID.
   * @returns Ok(Report) with parsedData populated, Err(NotFoundError) if absent.
   */
  async findDetailById(id: string): AsyncResult<Report> {
    const { data, error } = await this.db
      .from('dd_reports')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error !== null) return supabaseErr(error);
    if (data === null) return err(new NotFoundError('Report', id));
    return ok(this.rowToEntity(data, true));
  }

  /**
   * Returns IDs of reports for all devices that reported on a given date.
   * Used by System Health page to detect missing-report devices.
   *
   * @param date - ISO date string, e.g. "2025-03-10".
   */
  async findDeviceIdsByDate(date: string): AsyncResult<string[]> {
    const { data, error } = await this.db
      .from('dd_reports')
      .select('device_id')
      .eq('report_date', date)
      .eq('is_valid', true);

    if (error !== null) return supabaseErr(error);
    return ok((data ?? []).map(r => r.device_id));
  }

  // ── Writes ─────────────────────────────────────────────────────────────────

  /**
   * Upserts a report row. Matches on UNIQUE(device_id, report_date).
   * Re-ingesting the same device+date updates the existing row.
   *
   * @param params - All data needed to write the report row.
   * @returns Ok(Report) with the upserted row (without parsed_data).
   */
  async upsert(params: ReportUpsertParams): AsyncResult<Report> {
    const insert = this.entityToInsert(params);

    const { data, error } = await this.db
      .from('dd_reports')
      .upsert(insert, { onConflict: 'device_id,report_date' })
      .select('*')
      .single();

    if (error !== null) return supabaseErr(error);
    return ok(this.rowToEntity(data, false));
  }

  // ── Entity ↔ Row mappers ───────────────────────────────────────────────────

  private entityToInsert(params: ReportUpsertParams): ReportInsert {
    const { report: r, parsedData, fileName, fileSizeBytes, rawTextHash } = params;

    const toGib = (g: Gib | null): number | null => g?.value ?? null;
    const toPct = (p: StoragePercent | null): number | null => p?.value ?? null;
    const toCf  = (c: CompressionFactor | null): number | null => c?.value ?? null;

    return {
      device_id:          r.deviceId,
      report_date:        r.reportDate.toISOString().substring(0, 10),
      generated_on:       r.generatedOn?.toISOString() ?? null,
      file_name:          fileName ?? null,
      file_size_bytes:    fileSizeBytes ?? null,
      raw_text_hash:      rawTextHash ?? null,

      storage_total_gib:          toGib(r.storage.totalGib),
      storage_used_gib:           toGib(r.storage.usedGib),
      storage_available_gib:      toGib(r.storage.availableGib),
      storage_used_percent:       toPct(r.storage.usedPercent),
      storage_cleanable_gib:      toGib(r.storage.cleanableGib),
      storage_pre_comp_gib:       toGib(r.storage.preCompGib),
      storage_last_cleaning:      r.storage.lastCleaning?.toISOString() ?? null,

      comp_period_from:           r.compression.periodFrom?.toISOString() ?? null,
      comp_period_to:             r.compression.periodTo?.toISOString() ?? null,
      comp_total_factor:          toCf(r.compression.currentlyUsed.totalFactor),
      comp_reduction_percent:     r.compression.currentlyUsed.reductionPercent,
      comp_global_factor:         null,   // currently_used row has no global/local breakdown
      comp_local_factor:          null,

      comp_7day_pre_comp_gib:     toGib(r.compression.last7Days.preCompGib),
      comp_7day_post_comp_gib:    toGib(r.compression.last7Days.postCompGib),
      comp_7day_global_factor:    toCf(r.compression.last7Days.globalFactor),
      comp_7day_local_factor:     toCf(r.compression.last7Days.localFactor),
      comp_7day_total_factor:     toCf(r.compression.last7Days.totalFactor),
      comp_7day_reduction_pct:    r.compression.last7Days.reductionPercent,

      comp_24h_pre_comp_gib:      toGib(r.compression.last24Hours.preCompGib),
      comp_24h_post_comp_gib:     toGib(r.compression.last24Hours.postCompGib),
      comp_24h_global_factor:     toCf(r.compression.last24Hours.globalFactor),
      comp_24h_local_factor:      toCf(r.compression.last24Hours.localFactor),
      comp_24h_total_factor:      toCf(r.compression.last24Hours.totalFactor),
      comp_24h_reduction_pct:     r.compression.last24Hours.reductionPercent,

      disks_active_total:         r.disks.activeTierTotal,
      disks_active_in_use:        r.disks.activeTierInUse,
      disks_active_spare:         r.disks.activeTierSpare,
      disks_cache_total:          r.disks.cacheTierTotal,
      disks_cache_in_use:         r.disks.cacheTierInUse,
      disks_failed:               r.disks.failedDisks,
      disk_overall_status:        r.disks.overallStatus,
      disk_proactive_check_msg:   r.disks.proactiveCheckMessage,

      sys_availability_since:     r.systemHealth.availabilitySince?.toISOString() ?? null,
      sys_availability_percent:   r.systemHealth.systemAvailabilityPercent,
      sys_availability_excl_ctrld: null,   // not exposed in SystemHealthSnapshot
      fs_availability_percent:    r.systemHealth.filesystemAvailabilityPercent,
      fs_availability_excl_ctrld: null,    // not exposed in SystemHealthSnapshot
      memory_total_mib:           r.systemHealth.memoryTotalMib,
      memory_free_mib:            r.systemHealth.memoryFreeMib,
      memory_inactive_mib:        null,    // not in SystemHealthSnapshot
      swap_total_mib:             r.systemHealth.swapTotalMib,
      swap_free_mib:              r.systemHealth.swapFreeMib,
      uptime_days:                null,    // populated separately from meta
      filesystem_verify_status:   r.systemHealth.filesystemVerifyStatus,
      nfs_status:                 r.systemHealth.nfsStatus,
      cifs_status:                r.systemHealth.cifsStatus,
      data_encryption_enabled:    null,
      ha_enabled:                 null,

      network_ports_total:        r.networkPortsTotal,
      network_ports_running:      null,
      network_ports_down:         r.networkPortsDown,

      replication_configured:     r.replication.configured,
      replication_status:         r.replication.status,

      active_alerts_total:        r.activeTotalAlerts,
      active_alerts_critical:     r.activeCriticalAlerts,
      active_alerts_warning:      r.activeWarningAlerts,
      active_alerts_info:         r.activeInfoAlerts,

      device_status:              r.deviceStatus,
      is_valid:                   r.isValid,
      parse_errors:               r.parseErrors.length > 0 ? [...r.parseErrors] : null,
      sections_found:             null,

      parsed_data:                parsedData,
    };
  }

  private rowToEntity(row: ReportRow, includeParsedData: boolean): Report {
    const toGib = (v: number | null): Gib | null =>
      v !== null ? Gib.unsafe(v) : null;

    const toCf = (v: number | null): CompressionFactor | null =>
      v !== null && v >= 1.0 ? CompressionFactor.unsafe(v) : null;

    const mkWindow = (
      pre: number | null, post: number | null,
      global: number | null, local: number | null,
      total: number | null, reduction: number | null,
    ): CompressionWindow => ({
      preCompGib:       toGib(pre),
      postCompGib:      toGib(post),
      globalFactor:     toCf(global),
      localFactor:      toCf(local),
      totalFactor:      toCf(total),
      reductionPercent: reduction,
    });

    const storage: StorageSnapshot = {
      totalGib:      Gib.unsafe(row.storage_total_gib ?? 0),
      usedGib:       Gib.unsafe(row.storage_used_gib ?? 0),
      availableGib:  Gib.unsafe(row.storage_available_gib ?? 0),
      usedPercent:   StoragePercent.unsafe(row.storage_used_percent ?? 0),
      cleanableGib:  toGib(row.storage_cleanable_gib),
      preCompGib:    toGib(row.storage_pre_comp_gib),
      lastCleaning:  row.storage_last_cleaning !== null ? new Date(row.storage_last_cleaning) : null,
    };

    const compression: CompressionSnapshot = {
      periodFrom:    row.comp_period_from  !== null ? new Date(row.comp_period_from)  : null,
      periodTo:      row.comp_period_to    !== null ? new Date(row.comp_period_to)    : null,
      currentlyUsed: mkWindow(null, null, null, null, row.comp_total_factor, row.comp_reduction_percent),
      last7Days:     mkWindow(
        row.comp_7day_pre_comp_gib, row.comp_7day_post_comp_gib,
        row.comp_7day_global_factor, row.comp_7day_local_factor,
        row.comp_7day_total_factor, row.comp_7day_reduction_pct,
      ),
      last24Hours: mkWindow(
        row.comp_24h_pre_comp_gib, row.comp_24h_post_comp_gib,
        row.comp_24h_global_factor, row.comp_24h_local_factor,
        row.comp_24h_total_factor, row.comp_24h_reduction_pct,
      ),
    };

    const disks: DiskSummary = {
      activeTierTotal:        row.disks_active_total ?? 0,
      activeTierInUse:        row.disks_active_in_use ?? 0,
      activeTierSpare:        row.disks_active_spare ?? 0,
      cacheTierTotal:         row.disks_cache_total,
      cacheTierInUse:         row.disks_cache_in_use,
      failedDisks:            row.disks_failed ?? 0,
      overallStatus:          row.disk_overall_status,
      proactiveCheckMessage:  row.disk_proactive_check_msg,
    };

    const systemHealth: SystemHealthSnapshot = {
      availabilitySince:              row.sys_availability_since !== null
                                        ? new Date(row.sys_availability_since) : null,
      systemAvailabilityPercent:      row.sys_availability_percent,
      filesystemAvailabilityPercent:  row.fs_availability_percent,
      memoryTotalMib:                 row.memory_total_mib,
      memoryFreeMib:                  row.memory_free_mib,
      swapTotalMib:                   row.swap_total_mib,
      swapFreeMib:                    row.swap_free_mib,
      filesystemVerifyStatus:         row.filesystem_verify_status,
      nfsStatus:                      row.nfs_status,
      cifsStatus:                     row.cifs_status,
    };

    const replication: ReplicationState = {
      configured: row.replication_configured ?? false,
      status:     row.replication_status,
    };

    return {
      id:                   row.id,
      deviceId:             row.device_id,
      reportDate:           new Date(row.report_date),
      generatedOn:          row.generated_on !== null ? new Date(row.generated_on) : null,
      storage,
      compression,
      disks,
      systemHealth,
      replication,
      deviceStatus:         (row.device_status as DeviceStatus) ?? DeviceStatus.Unknown,
      activeCriticalAlerts: row.active_alerts_critical ?? 0,
      activeWarningAlerts:  row.active_alerts_warning  ?? 0,
      activeInfoAlerts:     row.active_alerts_info     ?? 0,
      activeTotalAlerts:    row.active_alerts_total    ?? 0,
      networkPortsTotal:    row.network_ports_total,
      networkPortsDown:     row.network_ports_down,
      isValid:              row.is_valid,
      parseErrors:          row.parse_errors ?? [],
      fileName:             row.file_name,
      fileSizeBytes:        row.file_size_bytes,
      ingestedAt:           new Date(row.ingested_at),
      parsedData:           includeParsedData ? (row.parsed_data as Record<string, unknown>) : null,
    };
  }
}
