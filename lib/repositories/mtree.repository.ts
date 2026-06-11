/**
 * MTreeRepository — data access for dd_mtrees.
 *
 * MTree rows are replaced in full on every re-ingest of the same device+date.
 * The MTree name stored in the DB is the SHORT name (last path segment) to
 * match the schema comment: e.g. "backup" not "/data/col1/backup".
 */

import type { MTreeRow } from '@/lib/supabase/types';
import { type MTree, type CreateMTree, MTreeStatus } from '@/lib/domain';
import { Gib } from '@/lib/domain/value-objects/gib.vo';
import { ok, type AsyncResult } from '@/lib/infrastructure/errors/result';
import { type DDSupabaseClient, supabaseErr } from './base.repository';

// ---------------------------------------------------------------------------
// Repository class
// ---------------------------------------------------------------------------

export class MTreeRepository {
  constructor(private readonly db: DDSupabaseClient) {}

  // ── Reads ──────────────────────────────────────────────────────────────────

  /**
   * Returns all MTrees for a specific report.
   * Used by the Device Detail MTree tab.
   *
   * @param reportId - Parent report UUID.
   */
  async findByReport(reportId: string): AsyncResult<MTree[]> {
    const { data, error } = await this.db
      .from('dd_mtrees')
      .select('*')
      .eq('report_id', reportId)
      .order('name');

    if (error !== null) return supabaseErr(error);
    return ok((data ?? []).map(r => this.rowToEntity(r)));
  }

  // ── Writes ─────────────────────────────────────────────────────────────────

  /**
   * Replaces all MTree rows for a report: deletes existing, bulk-inserts new.
   *
   * The `name` stored is the short name extracted from the full MTree path:
   *   "/data/col1/backup" → "backup"
   *
   * @param reportId   - Parent report UUID.
   * @param deviceId   - Parent device UUID (denormalized).
   * @param reportDate - ISO date string (denormalized).
   * @param mtrees     - MTree entities to insert.
   */
  async replaceForReport(
    reportId: string,
    deviceId: string,
    reportDate: string,
    mtrees: readonly CreateMTree[],
  ): AsyncResult<MTree[]> {
    const { error: delError } = await this.db
      .from('dd_mtrees')
      .delete()
      .eq('report_id', reportId);

    if (delError !== null) return supabaseErr(delError);
    if (mtrees.length === 0) return ok([]);

    const inserts = mtrees.map(m => ({
      device_id:    deviceId,
      report_id:    reportId,
      report_date:  reportDate,
      // Schema stores short name; full path is preserved in parsed_data JSONB
      name:         m.name.split('/').pop() ?? m.name,
      mtree_id:     m.mtreeId,
      status:       m.status as MTreeRow['status'],
      pre_comp_gib: m.preCompGib?.value ?? null,
      post_comp_gib: m.postCompGib?.value ?? null,
    }));

    const { data, error } = await this.db
      .from('dd_mtrees')
      .insert(inserts)
      .select();

    if (error !== null) return supabaseErr(error);
    return ok((data ?? []).map(r => this.rowToEntity(r)));
  }

  // ── Row → Entity mapper ────────────────────────────────────────────────────

  private rowToEntity(row: MTreeRow): MTree {
    return {
      id:          row.id,
      deviceId:    row.device_id,
      reportId:    row.report_id,
      reportDate:  new Date(row.report_date),
      name:        row.name,
      mtreeId:     row.mtree_id ?? '',
      status:      (row.status as MTreeStatus) ?? MTreeStatus.Unknown,
      preCompGib:  row.pre_comp_gib  !== null ? Gib.unsafe(row.pre_comp_gib)  : null,
      postCompGib: row.post_comp_gib !== null ? Gib.unsafe(row.post_comp_gib) : null,
      createdAt:   new Date(row.created_at),
    };
  }
}
