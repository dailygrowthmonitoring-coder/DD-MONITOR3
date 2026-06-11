/**
 * AlertRepository — data access for dd_alerts.
 *
 * Alerts are replaced in full on every re-ingest of the same device+date.
 * The replaceForReport method deletes all existing alerts for the report then
 * bulk-inserts the new set. This is idempotent: re-ingesting the same report
 * produces the same alert rows (modulo new rule-engine evaluations).
 */

import type { AlertRow } from '@/lib/supabase/types';
import {
  type Alert,
  type CreateAlert,
  AlertSource,
  AlertSeverity,
} from '@/lib/domain';
import { ok, type AsyncResult } from '@/lib/infrastructure/errors/result';
import { type DDSupabaseClient, supabaseErr } from './base.repository';

// ---------------------------------------------------------------------------
// Filter type for the Alerts page
// ---------------------------------------------------------------------------

export interface AlertFilters {
  readonly deviceId?:  string;
  readonly severity?:  AlertSeverity;
  readonly isActive?:  boolean;
  readonly fromDate?:  string;   // ISO date, inclusive
  readonly toDate?:    string;   // ISO date, inclusive
}

// ---------------------------------------------------------------------------
// Repository class
// ---------------------------------------------------------------------------

export class AlertRepository {
  constructor(private readonly db: DDSupabaseClient) {}

  // ── Reads ──────────────────────────────────────────────────────────────────

  /**
   * Returns all active (not cleared) alerts for one device, newest post_time first.
   * Used by the Overview alerts panel and the device tile badge count.
   *
   * @param deviceId - Device UUID.
   */
  async findActiveByDevice(deviceId: string): AsyncResult<Alert[]> {
    const { data, error } = await this.db
      .from('dd_alerts')
      .select('*')
      .eq('device_id', deviceId)
      .eq('is_active', true)
      .order('post_time', { ascending: false });

    if (error !== null) return supabaseErr(error);
    return ok((data ?? []).map(r => this.rowToEntity(r)));
  }

  /**
   * Returns alerts matching the supplied filters, ordered newest first.
   * Used by the Alerts page with optional severity, active, and date filters.
   *
   * @param filters   - Optional filter criteria.
   * @param limit     - Max rows per page (default 50).
   * @param offset    - Row offset for pagination.
   */
  async findByFilters(
    filters: AlertFilters,
    limit = 50,
    offset = 0,
  ): AsyncResult<Alert[]> {
    let query = this.db.from('dd_alerts').select('*');

    if (filters.deviceId !== undefined)
      query = query.eq('device_id', filters.deviceId);
    if (filters.severity !== undefined)
      query = query.eq('severity', filters.severity);
    if (filters.isActive !== undefined)
      query = query.eq('is_active', filters.isActive);
    if (filters.fromDate !== undefined)
      query = query.gte('report_date', filters.fromDate);
    if (filters.toDate !== undefined)
      query = query.lte('report_date', filters.toDate);

    const { data, error } = await query
      .order('post_time', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error !== null) return supabaseErr(error);
    return ok((data ?? []).map(r => this.rowToEntity(r)));
  }

  /**
   * Returns all alerts linked to a specific report.
   * Used by the Device Detail page alert section.
   *
   * @param reportId - Report UUID.
   */
  async findByReport(reportId: string): AsyncResult<Alert[]> {
    const { data, error } = await this.db
      .from('dd_alerts')
      .select('*')
      .eq('report_id', reportId)
      .order('post_time', { ascending: false });

    if (error !== null) return supabaseErr(error);
    return ok((data ?? []).map(r => this.rowToEntity(r)));
  }

  // ── Writes ─────────────────────────────────────────────────────────────────

  /**
   * Replaces all alert rows for a report: deletes existing, bulk-inserts new.
   * Called by IngestionService after AlertEngine evaluation.
   *
   * Not atomic at the DB level (Supabase JS client has no client-side tx).
   * Safe because ingestion is idempotent: a retry will re-run this step cleanly.
   *
   * @param reportId   - Parent report UUID.
   * @param deviceId   - Parent device UUID (denormalized).
   * @param reportDate - ISO date string (denormalized).
   * @param alerts     - Alert entities to insert.
   * @returns Ok(Alert[]) — inserted rows mapped to entities.
   */
  async replaceForReport(
    reportId: string,
    deviceId: string,
    reportDate: string,
    alerts: readonly CreateAlert[],
  ): AsyncResult<Alert[]> {
    // Step 1: delete existing alerts for this report
    const { error: delError } = await this.db
      .from('dd_alerts')
      .delete()
      .eq('report_id', reportId);

    if (delError !== null) return supabaseErr(delError);

    if (alerts.length === 0) return ok([]);

    // Step 2: bulk insert new alerts
    const inserts = alerts.map(a => ({
      device_id:   deviceId,
      report_id:   reportId,
      report_date: reportDate,
      alert_id:    a.alertId,
      severity:    a.severity as AlertRow['severity'],
      class:       a.class,
      object:      a.object,
      message:     a.message,
      post_time:   a.postTime?.toISOString() ?? null,
      clear_time:  a.clearTime?.toISOString() ?? null,
      is_active:   a.isActive,
      source:      a.source as AlertRow['source'],
    }));

    const { data, error } = await this.db
      .from('dd_alerts')
      .insert(inserts)
      .select();

    if (error !== null) return supabaseErr(error);
    return ok((data ?? []).map(r => this.rowToEntity(r)));
  }

  // ── Row → Entity mapper ────────────────────────────────────────────────────

  private rowToEntity(row: AlertRow): Alert {
    return {
      id:         row.id,
      deviceId:   row.device_id,
      reportId:   row.report_id,
      reportDate: new Date(row.report_date),
      alertId:    row.alert_id,
      severity:   row.severity as AlertSeverity,
      class:      row.class,
      object:     row.object,
      message:    row.message,
      postTime:   row.post_time  !== null ? new Date(row.post_time)  : null,
      clearTime:  row.clear_time !== null ? new Date(row.clear_time) : null,
      isActive:   row.is_active,
      source:     row.source as AlertSource,
      createdAt:  new Date(row.created_at),
    };
  }
}
