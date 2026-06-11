/**
 * DiskRepository — data access for dd_disks.
 *
 * Disk rows are replaced in full on every re-ingest of the same device+date.
 * The `tier` is derived from the disk physical type (SAS = active, SAS-SSD = cache).
 * The `state` is set to DiskState.Unknown since the parser's Disk Show Hardware
 * table does not report per-disk state (only summary counts are available).
 */

import type { DiskRow } from '@/lib/supabase/types';
import { type Disk, type CreateDisk, DiskTier, DiskState } from '@/lib/domain';
import { Gib } from '@/lib/domain/value-objects/gib.vo';
import { ok, type AsyncResult } from '@/lib/infrastructure/errors/result';
import { type DDSupabaseClient, supabaseErr } from './base.repository';

// ---------------------------------------------------------------------------
// Repository class
// ---------------------------------------------------------------------------

export class DiskRepository {
  constructor(private readonly db: DDSupabaseClient) {}

  // ── Reads ──────────────────────────────────────────────────────────────────

  /**
   * Returns all disks for a specific report.
   * Used by the Device Detail disk grid.
   *
   * @param reportId - Parent report UUID.
   */
  async findByReport(reportId: string): AsyncResult<Disk[]> {
    const { data, error } = await this.db
      .from('dd_disks')
      .select('*')
      .eq('report_id', reportId)
      .order('enclosure_id')
      .order('slot_number');

    if (error !== null) return supabaseErr(error);
    return ok((data ?? []).map(r => this.rowToEntity(r)));
  }

  // ── Writes ─────────────────────────────────────────────────────────────────

  /**
   * Replaces all disk rows for a report: deletes existing, bulk-inserts new.
   *
   * @param reportId        - Parent report UUID.
   * @param deviceId        - Parent device UUID (denormalized).
   * @param reportDate      - ISO date string (denormalized).
   * @param disks           - Disk entities to insert.
   * @param enclosureInfo   - Map from enclosure id to {model, serial} for denormalization.
   */
  async replaceForReport(
    reportId: string,
    deviceId: string,
    reportDate: string,
    disks: readonly CreateDisk[],
  ): AsyncResult<Disk[]> {
    const { error: delError } = await this.db
      .from('dd_disks')
      .delete()
      .eq('report_id', reportId);

    if (delError !== null) return supabaseErr(delError);
    if (disks.length === 0) return ok([]);

    const inserts = disks.map(d => ({
      device_id:       deviceId,
      report_id:       reportId,
      report_date:     reportDate,
      enclosure_id:    d.enclosureId,
      enclosure_model: d.enclosureModel,
      enclosure_serial: d.enclosureSerial,
      slot_number:     d.slotNumber,
      label:           d.label,
      tier:            d.tier as DiskRow['tier'],
      state:           d.state as DiskRow['state'],
      model:           d.model,
      serial_number:   d.serialNumber,
      firmware_version: d.firmwareVersion,
      capacity_gib:    d.capacityGib?.value ?? null,
    }));

    const { data, error } = await this.db
      .from('dd_disks')
      .insert(inserts)
      .select();

    if (error !== null) return supabaseErr(error);
    return ok((data ?? []).map(r => this.rowToEntity(r)));
  }

  // ── Row → Entity mapper ────────────────────────────────────────────────────

  private rowToEntity(row: DiskRow): Disk {
    return {
      id:              row.id,
      deviceId:        row.device_id,
      reportId:        row.report_id,
      reportDate:      new Date(row.report_date),
      enclosureId:     row.enclosure_id,
      enclosureModel:  row.enclosure_model,
      enclosureSerial: row.enclosure_serial,
      slotNumber:      row.slot_number,
      label:           row.label,
      tier:            (row.tier as DiskTier)  ?? DiskTier.Unknown,
      state:           (row.state as DiskState) ?? DiskState.Unknown,
      model:           row.model,
      serialNumber:    row.serial_number,
      firmwareVersion: row.firmware_version,
      capacityGib:     row.capacity_gib !== null ? Gib.unsafe(row.capacity_gib) : null,
      createdAt:       new Date(row.created_at),
    };
  }
}
