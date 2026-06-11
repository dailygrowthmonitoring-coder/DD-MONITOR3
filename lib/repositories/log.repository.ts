/**
 * LogRepository — data access for system_logs.
 *
 * Written by every major pipeline operation (ingest, alert eval, cleanup, auth).
 * Read by the Logs dashboard page with optional filters.
 */

import type { SystemLogRow, SystemLogInsert } from '@/lib/supabase/types';
import {
  type SystemLog,
  type CreateSystemLog,
  EventType,
  LogSeverity,
} from '@/lib/domain';
import { ok, type AsyncResult } from '@/lib/infrastructure/errors/result';
import { type DDSupabaseClient, supabaseErr } from './base.repository';

// ---------------------------------------------------------------------------
// Filter type for the Logs page
// ---------------------------------------------------------------------------

export interface LogFilters {
  readonly deviceId?:      string;
  readonly eventType?:     EventType;
  readonly severity?:      LogSeverity;
  readonly correlationId?: string;
  readonly fromDate?:      string;   // ISO timestamp, inclusive
  readonly toDate?:        string;   // ISO timestamp, inclusive
}

// ---------------------------------------------------------------------------
// Repository class
// ---------------------------------------------------------------------------

export class LogRepository {
  constructor(private readonly db: DDSupabaseClient) {}

  // ── Reads ──────────────────────────────────────────────────────────────────

  /**
   * Returns log entries matching the supplied filters, newest first.
   * Used by the Logs dashboard page.
   *
   * @param filters - Optional filter criteria.
   * @param limit   - Max rows per page (default 100).
   * @param offset  - Row offset for pagination.
   */
  async findByFilters(
    filters: LogFilters,
    limit = 100,
    offset = 0,
  ): AsyncResult<SystemLog[]> {
    let query = this.db.from('system_logs').select('*');

    if (filters.deviceId !== undefined)
      query = query.eq('device_id', filters.deviceId);
    if (filters.eventType !== undefined)
      query = query.eq('event_type', filters.eventType);
    if (filters.severity !== undefined)
      query = query.eq('severity', filters.severity);
    if (filters.correlationId !== undefined)
      query = query.eq('correlation_id', filters.correlationId);
    if (filters.fromDate !== undefined)
      query = query.gte('created_at', filters.fromDate);
    if (filters.toDate !== undefined)
      query = query.lte('created_at', filters.toDate);

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error !== null) return supabaseErr(error);
    return ok((data ?? []).map(r => this.rowToEntity(r)));
  }

  // ── Writes ─────────────────────────────────────────────────────────────────

  /**
   * Inserts one structured log entry.
   * Called by IngestionService, AlertEngine, NotificationService, and API middleware.
   *
   * @param log - Log entry to create.
   * @returns Ok(SystemLog) with the inserted row.
   */
  async create(log: CreateSystemLog): AsyncResult<SystemLog> {
    const insert: SystemLogInsert = {
      event_type:     log.eventType as SystemLogInsert['event_type'],
      severity:       log.severity as SystemLogInsert['severity'],
      device_id:      log.deviceId,
      report_id:      null,
      message:        log.message,
      details:        log.details as Record<string, unknown> | null,
      correlation_id: log.correlationId,
    };

    const { data, error } = await this.db
      .from('system_logs')
      .insert(insert)
      .select()
      .single();

    if (error !== null) return supabaseErr(error);
    return ok(this.rowToEntity(data));
  }

  // ── Row → Entity mapper ────────────────────────────────────────────────────

  private rowToEntity(row: SystemLogRow): SystemLog {
    return {
      id:            row.id,
      eventType:     row.event_type as EventType,
      severity:      row.severity as LogSeverity,
      deviceId:      row.device_id,
      message:       row.message,
      details:       row.details as Record<string, unknown> | null,
      correlationId: row.correlation_id,
      createdAt:     new Date(row.created_at),
    };
  }
}
