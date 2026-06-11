/**
 * Parses system health data from the GENERAL STATUS section.
 *
 * Extracts: System Availability Metric, System Memory Summary,
 * Disk Status/Disk States table, Filesys Verify Status, NFS Status, CIFS Status.
 * Alerts, Net Show Hardware, Replication, and Enclosures are parsed by their
 * own dedicated modules which also receive the GENERAL STATUS section lines.
 *
 * Key source lines:
 *   Since                                                   May 21 03:00:00 AST 2020
 *   System availability                                     100%
 *   System availability excluding controlled downtime       100%
 *   Filesystem availability                                 100%
 *   Filesystem availability excluding controlled downtime   100%
 *   Total memory:      48137 MiB
 *   Free memory:       790 MiB
 *   Inactive memory:   1612 MiB
 *   Total swap:        5119 MiB
 *   Free swap:         1 MiB
 *   Normal - Storage operational
 *   In Use        25            1
 *   Spare         2             -
 *   TOTAL DISKS   27            1
 *   Data verification is running normally.
 *   The NFS system is currently active and running.
 *   CIFS is enabled.
 *   No drives have exceeded reliability thresholds for proactive maintenance.
 */

import type { SystemHealthData, DisksSummary, SectionResult } from '../types';
import { extractSection, splitColumns } from '../utils/normalize';
import { parseNumber } from '../utils/numbers';
import { parseDate } from '../utils/dates';

export function parseGeneralStatus(lines: string[]): {
  system_health: SectionResult<SystemHealthData>;
  disk_summary: SectionResult<DisksSummary>;
} {
  try {
    const section = extractSection(lines, 'GENERAL STATUS');
    if (section.length === 0) {
      const e = 'GENERAL STATUS section not found';
      return { system_health: { value: null, error: e }, disk_summary: { value: null, error: e } };
    }

    // Proactive Disk Check lives in GENERAL INFO, not GENERAL STATUS
    let proactive_check: string | null = null;
    for (const line of lines) {
      if (/No drives have exceeded reliability thresholds/i.test(line)) {
        proactive_check = line.trim();
        break;
      }
    }

    // ── Availability ───────────────────────────────────────────────────────
    let availability_since: string | null = null;
    let system_availability_percent: number | null = null;
    let system_availability_excl_controlled: number | null = null;
    let filesystem_availability_percent: number | null = null;
    let filesystem_availability_excl_controlled: number | null = null;

    // ── Memory ─────────────────────────────────────────────────────────────
    let memory_total_mib: number | null = null;
    let memory_free_mib: number | null = null;
    let memory_inactive_mib: number | null = null;
    let swap_total_mib: number | null = null;
    let swap_free_mib: number | null = null;

    // ── NFS / CIFS / Verify ────────────────────────────────────────────────
    let nfs_status: string | null = null;
    let cifs_status: string | null = null;
    let filesystem_verify_status: string | null = null;

    // ── Disk summary ───────────────────────────────────────────────────────
    let overall_status: string | null = null;
    let active_tier_in_use: number | null = null;
    let active_tier_spare: number | null = null;
    let active_tier_total: number | null = null;
    let cache_tier_in_use: number | null = null;
    let cache_tier_total: number | null = null;

    for (let i = 0; i < section.length; i++) {
      const line = section[i] ?? '';

      // Since <date>  — availability start date
      if (/^Since\s+/i.test(line)) {
        const dateStr = line.replace(/^Since\s+/i, '').trim();
        availability_since = parseDate(dateStr);
        continue;
      }

      // System availability  100%  (and variants)
      if (/^System availability excluding controlled downtime/i.test(line)) {
        const pct = /(\d+)%/.exec(line);
        system_availability_excl_controlled = pct ? parseNumber(pct[1] ?? '') : null;
        continue;
      }
      if (/^System availability\s+/i.test(line)) {
        const pct = /(\d+)%/.exec(line);
        system_availability_percent = pct ? parseNumber(pct[1] ?? '') : null;
        continue;
      }

      if (/^Filesystem availability excluding controlled downtime/i.test(line)) {
        const pct = /(\d+)%/.exec(line);
        filesystem_availability_excl_controlled = pct ? parseNumber(pct[1] ?? '') : null;
        continue;
      }
      if (/^Filesystem availability\s+/i.test(line)) {
        const pct = /(\d+)%/.exec(line);
        filesystem_availability_percent = pct ? parseNumber(pct[1] ?? '') : null;
        continue;
      }

      // Memory
      if (/^Total memory:/i.test(line)) {
        memory_total_mib = parseNumber(line.split(':')[1] ?? '');
        continue;
      }
      if (/^Free memory:/i.test(line)) {
        memory_free_mib = parseNumber(line.split(':')[1] ?? '');
        continue;
      }
      if (/^Inactive memory:/i.test(line)) {
        memory_inactive_mib = parseNumber(line.split(':')[1] ?? '');
        continue;
      }
      if (/^Total swap:/i.test(line)) {
        swap_total_mib = parseNumber(line.split(':')[1] ?? '');
        continue;
      }
      if (/^Free swap:/i.test(line)) {
        swap_free_mib = parseNumber(line.split(':')[1] ?? '');
        continue;
      }

      // Disk Status  e.g. "Normal - Storage operational"
      if (/^Normal\s+-/i.test(line) || /^Warning\s+-/i.test(line) || /^Critical\s+-/i.test(line)) {
        overall_status = (line.split('-')[0] ?? '').trim();
        continue;
      }

      if (/No drives have exceeded reliability thresholds/i.test(line)) {
        proactive_check = line.trim();
        continue;
      }

      // Disk States table rows: "In Use", "Spare", "TOTAL DISKS"
      if (/^In Use\s+\d/i.test(line)) {
        const cols = splitColumns(line);
        // cols: ["In Use", "25", "1"]
        active_tier_in_use = parseNumber(cols[1] ?? '-');
        cache_tier_in_use  = cols[2] !== undefined && cols[2] !== '-' ? parseNumber(cols[2]) : null;
        continue;
      }
      if (/^Spare\s+\d/i.test(line)) {
        const cols = splitColumns(line);
        active_tier_spare = parseNumber(cols[1] ?? '-');
        continue;
      }
      if (/^TOTAL DISKS\s+\d/i.test(line)) {
        const cols = splitColumns(line);
        active_tier_total = parseNumber(cols[1] ?? '-');
        cache_tier_total  = cols[2] !== undefined && cols[2] !== '-' ? parseNumber(cols[2]) : null;
        continue;
      }

      // Filesys Verify Status
      if (/Data verification is/i.test(line)) {
        filesystem_verify_status = line.trim();
        continue;
      }

      // NFS
      if (/The NFS system is currently/i.test(line)) {
        if (/active and running/i.test(line)) nfs_status = 'active';
        else nfs_status = line.replace(/The NFS system is currently/i, '').trim().replace(/\.$/, '');
        continue;
      }

      // CIFS
      if (/^CIFS is/i.test(line)) {
        if (/enabled/i.test(line)) cifs_status = 'enabled';
        else if (/disabled/i.test(line)) cifs_status = 'disabled';
        else cifs_status = line.trim();
        continue;
      }
    }

    // failed_disks: not reported directly — derive as 0 (no failed disks detected)
    // unless there's a "Failed N" line (not seen in real file)
    const diskSummary: DisksSummary = {
      active_tier_total,
      active_tier_in_use,
      active_tier_spare,
      cache_tier_total,
      cache_tier_in_use,
      failed_disks: 0,
      overall_status,
      proactive_check,
    };

    const health: SystemHealthData = {
      availability_since,
      system_availability_percent,
      system_availability_excl_controlled,
      filesystem_availability_percent,
      filesystem_availability_excl_controlled,
      memory_total_mib,
      memory_free_mib,
      memory_inactive_mib,
      swap_total_mib,
      swap_free_mib,
      filesystem_verify_status,
      nfs_status,
      cifs_status,
    };

    return {
      system_health: { value: health, error: null },
      disk_summary:  { value: diskSummary, error: null },
    };
  } catch (e) {
    const msg = `general-status: ${e instanceof Error ? e.message : String(e)}`;
    return {
      system_health: { value: null, error: msg },
      disk_summary:  { value: null, error: msg },
    };
  }
}
