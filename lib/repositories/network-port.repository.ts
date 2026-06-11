/**
 * NetworkPortRepository — data access for dd_network_ports.
 *
 * Port rows are replaced in full on every re-ingest of the same device+date.
 * isDown is derived from the port's State column (state !== 'running' → true).
 */

import type { NetworkPortRow } from '@/lib/supabase/types';
import { type NetworkPort, type CreateNetworkPort, PortLinkState } from '@/lib/domain';
import { ok, type AsyncResult } from '@/lib/infrastructure/errors/result';
import { type DDSupabaseClient, supabaseErr } from './base.repository';

// ---------------------------------------------------------------------------
// Repository class
// ---------------------------------------------------------------------------

export class NetworkPortRepository {
  constructor(private readonly db: DDSupabaseClient) {}

  // ── Reads ──────────────────────────────────────────────────────────────────

  /**
   * Returns all network ports for a specific report.
   * Used by the Device Detail network tab.
   *
   * @param reportId - Parent report UUID.
   */
  async findByReport(reportId: string): AsyncResult<NetworkPort[]> {
    const { data, error } = await this.db
      .from('dd_network_ports')
      .select('*')
      .eq('report_id', reportId)
      .order('name');

    if (error !== null) return supabaseErr(error);
    return ok((data ?? []).map(r => this.rowToEntity(r)));
  }

  /**
   * Returns all down ports for a specific report.
   * Used by IngestionService to compute network_ports_down.
   *
   * @param reportId - Parent report UUID.
   */
  async findDownByReport(reportId: string): AsyncResult<NetworkPort[]> {
    const { data, error } = await this.db
      .from('dd_network_ports')
      .select('*')
      .eq('report_id', reportId)
      .eq('is_down', true);

    if (error !== null) return supabaseErr(error);
    return ok((data ?? []).map(r => this.rowToEntity(r)));
  }

  // ── Writes ─────────────────────────────────────────────────────────────────

  /**
   * Replaces all port rows for a report: deletes existing, bulk-inserts new.
   *
   * @param reportId   - Parent report UUID.
   * @param deviceId   - Parent device UUID (denormalized).
   * @param reportDate - ISO date string (denormalized).
   * @param ports      - NetworkPort entities to insert.
   */
  async replaceForReport(
    reportId: string,
    deviceId: string,
    reportDate: string,
    ports: readonly CreateNetworkPort[],
  ): AsyncResult<NetworkPort[]> {
    const { error: delError } = await this.db
      .from('dd_network_ports')
      .delete()
      .eq('report_id', reportId);

    if (delError !== null) return supabaseErr(delError);
    if (ports.length === 0) return ok([]);

    const inserts = ports.map(p => ({
      device_id:        deviceId,
      report_id:        reportId,
      report_date:      reportDate,
      name:             p.name,
      speed:            p.speed,
      duplex:           p.duplex,
      physical_type:    p.physicalType,
      hardware_address: p.hardwareAddress,
      link_status:      linkStateToRaw(p.linkState),
      state:            portStateColumn(p.linkState),
      is_down:          p.isDown,
    }));

    const { data, error } = await this.db
      .from('dd_network_ports')
      .insert(inserts)
      .select();

    if (error !== null) return supabaseErr(error);
    return ok((data ?? []).map(r => this.rowToEntity(r)));
  }

  // ── Row → Entity mapper ────────────────────────────────────────────────────

  private rowToEntity(row: NetworkPortRow): NetworkPort {
    return {
      id:              row.id,
      deviceId:        row.device_id,
      reportId:        row.report_id,
      reportDate:      new Date(row.report_date),
      name:            row.name,
      speed:           row.speed,
      duplex:          row.duplex,
      physicalType:    row.physical_type,
      hardwareAddress: row.hardware_address,
      linkState:       rawToLinkState(row.state),
      isDown:          row.is_down,
      createdAt:       new Date(row.created_at),
    };
  }
}

// ---------------------------------------------------------------------------
// Link-state helpers
// ---------------------------------------------------------------------------

function rawToLinkState(state: string | null): PortLinkState {
  switch (state?.toLowerCase()) {
    case 'running': return PortLinkState.Running;
    case 'up':      return PortLinkState.Up;
    case 'down':    return PortLinkState.Down;
    default:        return PortLinkState.Unknown;
  }
}

/** Returns the raw state string for the DB `state` column. */
function portStateColumn(ls: PortLinkState): string {
  switch (ls) {
    case PortLinkState.Running: return 'running';
    case PortLinkState.Up:      return 'up';
    case PortLinkState.Down:    return 'down';
    case PortLinkState.Unknown: return 'unknown';
  }
}

/** Returns the raw link_status string for the DB `link_status` column. */
function linkStateToRaw(ls: PortLinkState): string {
  switch (ls) {
    case PortLinkState.Running: return 'yes';
    case PortLinkState.Up:      return 'no';    // link up but no traffic (eth1d case)
    case PortLinkState.Down:    return 'no';
    case PortLinkState.Unknown: return 'unknown';
  }
}
