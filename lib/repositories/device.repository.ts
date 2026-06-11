/**
 * DeviceRepository — data access for dd_devices.
 *
 * Provides find-or-create for the ingest pipeline, list for the Overview page,
 * and update for device metadata/snapshot refresh.
 *
 * The dd_devices snapshot columns (last_status, last_storage_used_percent, etc.)
 * are refreshed automatically by the refresh_device_snapshot() DB trigger on
 * dd_reports insert/update — DeviceRepository does NOT manually update these.
 */

import type { DeviceRow, DeviceInsert } from '@/lib/supabase/types';
import {
  type Device,
  type CreateDevice,
  type UpdateDevice,
  DeviceStatus,
  deriveShortName,
} from '@/lib/domain';
import { Gib } from '@/lib/domain/value-objects/gib.vo';
import { StoragePercent } from '@/lib/domain/value-objects/storage-percent.vo';
import { NotFoundError } from '@/lib/infrastructure/errors/app-error';
import { ok, err, type AsyncResult } from '@/lib/infrastructure/errors/result';
import { type DDSupabaseClient, supabaseErr } from './base.repository';

// ---------------------------------------------------------------------------
// Repository class
// ---------------------------------------------------------------------------

export class DeviceRepository {
  constructor(private readonly db: DDSupabaseClient) {}

  // ── Reads ──────────────────────────────────────────────────────────────────

  /**
   * Finds a device by its fully-qualified hostname.
   * Used by IngestionService before every ingest (find-or-create pattern).
   *
   * @param hostname - FQDN, e.g. "DD6300BSR.iq.zain.com".
   * @returns Ok(Device) if found, Ok(null) if not found, Err on DB error.
   */
  async findByHostname(hostname: string): AsyncResult<Device | null> {
    const { data, error } = await this.db
      .from('dd_devices')
      .select('*')
      .eq('hostname', hostname)
      .maybeSingle();

    if (error !== null) return supabaseErr(error);
    if (data === null) return ok(null);
    return ok(this.rowToEntity(data));
  }

  /**
   * Finds a device by its UUID primary key.
   *
   * @param id - Device UUID from dd_devices.id.
   * @returns Ok(Device) if found, Err(NotFoundError) if absent, Err on DB error.
   */
  async findById(id: string): AsyncResult<Device> {
    const { data, error } = await this.db
      .from('dd_devices')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error !== null) return supabaseErr(error);
    if (data === null) return err(new NotFoundError('Device', id));
    return ok(this.rowToEntity(data));
  }

  /**
   * Returns all active devices, ordered by hostname.
   * Used by the Overview sidebar and the System Health page.
   *
   * @returns Ok(Device[]) — empty array if no active devices.
   */
  async findAllActive(): AsyncResult<Device[]> {
    const { data, error } = await this.db
      .from('dd_devices')
      .select('*')
      .eq('is_active', true)
      .order('hostname');

    if (error !== null) return supabaseErr(error);
    return ok((data ?? []).map(r => this.rowToEntity(r)));
  }

  // ── Writes ─────────────────────────────────────────────────────────────────

  /**
   * Creates a new device record.
   * Called by IngestionService when a report arrives from an unregistered hostname.
   *
   * @param data - CreateDevice payload from the ingest pipeline.
   * @returns Ok(Device) with the newly created row, Err on DB error.
   */
  async create(data: CreateDevice): AsyncResult<Device> {
    const insert = {
      hostname:               data.hostname,
      short_name:             data.shortName,
      model:                  data.model ?? null,
      serial_number:          data.serialNumber ?? null,
      chassis_serial:         data.chassisSerial ?? null,
      location:               data.location ?? null,
      os_version:             data.osVersion ?? null,
      total_capacity_gib:     data.totalCapacity !== undefined ? data.totalCapacity.value : null,
      is_active:              true,
    };

    const { data: row, error } = await this.db
      .from('dd_devices')
      .insert(insert)
      .select()
      .single();

    if (error !== null) return supabaseErr(error);
    return ok(this.rowToEntity(row));
  }

  /**
   * Updates mutable metadata fields on an existing device.
   * Called by IngestionService when a report reveals updated device properties
   * (new OS version, model correction, etc.).
   *
   * @param id   - Device UUID.
   * @param data - Partial update payload.
   * @returns Ok(Device) with updated row, Err on DB error.
   */
  async update(id: string, data: UpdateDevice): AsyncResult<Device> {
    const patch: Partial<DeviceInsert> = {
      ...(data.model         !== undefined ? { model: data.model }                              : {}),
      ...(data.serialNumber  !== undefined ? { serial_number: data.serialNumber }               : {}),
      ...(data.chassisSerial !== undefined ? { chassis_serial: data.chassisSerial }             : {}),
      ...(data.location      !== undefined ? { location: data.location }                        : {}),
      ...(data.osVersion     !== undefined ? { os_version: data.osVersion }                     : {}),
      ...(data.isActive      !== undefined ? { is_active: data.isActive }                       : {}),
      ...(data.totalCapacity !== undefined ? { total_capacity_gib: data.totalCapacity.value }   : {}),
    };

    const { data: row, error } = await this.db
      .from('dd_devices')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error !== null) return supabaseErr(error);
    return ok(this.rowToEntity(row));
  }

  // ── Row → Entity mapper ────────────────────────────────────────────────────

  private rowToEntity(row: DeviceRow): Device {
    const lastUsedPct =
      row.last_storage_used_percent !== null
        ? StoragePercent.unsafe(row.last_storage_used_percent)
        : null;

    const totalCapacity =
      row.total_capacity_gib !== null
        ? Gib.unsafe(row.total_capacity_gib)
        : null;

    const lastStatus = (row.last_status as DeviceStatus) ?? DeviceStatus.Unknown;

    return {
      id:               row.id,
      hostname:         row.hostname,
      shortName:        row.short_name,
      model:            row.model,
      serialNumber:     row.serial_number,
      chassisSerial:    row.chassis_serial,
      location:         row.location,
      osVersion:        row.os_version,
      totalCapacity,
      isActive:         row.is_active,
      lastReportDate:   row.last_report_date !== null ? new Date(row.last_report_date) : null,
      lastSeenAt:       row.last_seen_at     !== null ? new Date(row.last_seen_at)     : null,
      lastUsedPercent:  lastUsedPct,
      lastStatus,
      lastActiveAlerts: row.last_active_alerts ?? 0,
      createdAt:        new Date(row.created_at),
      updatedAt:        new Date(row.updated_at),
    };
  }
}

// ---------------------------------------------------------------------------
// Factory function
// ---------------------------------------------------------------------------

/**
 * Derives a short site-code from a DD hostname.
 * Re-exported here for convenience; canonical definition is in domain.
 */
export { deriveShortName };
