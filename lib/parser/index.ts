/**
 * Layer 1 — Parser entry point.
 *
 * parseAutosupport() is the single public export. It:
 *   1. Normalises the raw text into a trimmed, blank-filtered line array (once).
 *   2. Runs each section parser on that shared array.
 *   3. Collects per-section errors without ever throwing.
 *   4. Returns a ParseResult with fully-typed data.
 *
 * Consumed by: IngestionService (Layer 5).
 * Imports: lib/parser/* only. NO lib/domain, NO lib/services, NO DB.
 */

import type { ParseResult, ParsedReport, ParseError, DisksData, AlertsData, NetworkData } from './types';
import { normalizeLines } from './utils/normalize';
import { parseGeneralInfo }  from './sections/general-info';
import { parseServerUsage }  from './sections/server-usage';
import { parseGeneralStatus } from './sections/general-status';
import { parseAlerts }       from './sections/alerts';
import { parseNetwork }      from './sections/network';
import { parseEnclosures }   from './sections/enclosures';
import { parseDisks }        from './sections/disks';
import { parseMtrees }       from './sections/mtrees';
import { parseLicenses }     from './sections/licenses';
import { parseReplication }  from './sections/replication';
import { parseHardware }     from './sections/hardware';

const EMPTY_ALERTS: AlertsData   = { active_count: 0, active: [], history: [] };
const EMPTY_NETWORK: NetworkData = { ports: [] };
const EMPTY_DISKS: DisksData = {
  summary: {
    active_tier_total: null, active_tier_in_use: null, active_tier_spare: null,
    cache_tier_total: null, cache_tier_in_use: null,
    failed_disks: 0, overall_status: null, proactive_check: null,
  },
  drives: [],
};

/**
 * Parse a complete DD autosupport text file into a typed ParsedReport.
 *
 * @param rawText - Full UTF-8 content of one autosupport .txt file.
 * @returns ParseResult — always present; parse_errors[] is empty on full success.
 */
export function parseAutosupport(rawText: string): ParseResult {
  const errors: ParseError[] = [];
  const sectionsFound: string[] = [];

  // Normalise once; all section parsers receive this shared array.
  const lines = normalizeLines(rawText);

  // ── meta (critical) ────────────────────────────────────────────────────
  const metaResult = parseGeneralInfo(lines);
  if (metaResult.error !== null || metaResult.value === null) {
    errors.push({ section: 'meta', message: metaResult.error ?? 'unknown error' });
  } else {
    sectionsFound.push('meta');
  }
  const meta = metaResult.value ?? {
    generated_on: new Date().toISOString().slice(0, 19),
    generated_epoch: null,
    timezone: 'UTC',
    hostname: 'unknown',
    location: null, model: null, os_version: null,
    serial_number: null, chassis_serial: null, hw_revision: null,
    admin_email: null, uptime_days: null,
    data_encryption_enabled: false, ssd_shelf_present: false, ha_enabled: false,
  };

  // ── storage + compression ──────────────────────────────────────────────
  const { storage: storageResult, compression: compressionResult } = parseServerUsage(lines);
  if (storageResult.error !== null) {
    errors.push({ section: 'storage', message: storageResult.error });
  } else if (storageResult.value !== null) {
    sectionsFound.push('storage');
  }
  if (compressionResult.error !== null) {
    errors.push({ section: 'compression', message: compressionResult.error });
  } else if (compressionResult.value !== null) {
    sectionsFound.push('compression');
  }

  // ── system_health + disk_summary ────────────────────────────────────────
  const { system_health: healthResult, disk_summary: diskSumResult } = parseGeneralStatus(lines);
  if (healthResult.error !== null) {
    errors.push({ section: 'system_health', message: healthResult.error });
  } else if (healthResult.value !== null) {
    sectionsFound.push('system_health');
  }

  // ── alerts ─────────────────────────────────────────────────────────────
  const alertsResult = parseAlerts(lines);
  if (alertsResult.error !== null) {
    errors.push({ section: 'alerts', message: alertsResult.error });
  } else {
    sectionsFound.push('alerts');
  }

  // ── network ─────────────────────────────────────────────────────────────
  const networkResult = parseNetwork(lines);
  if (networkResult.error !== null) {
    errors.push({ section: 'network', message: networkResult.error });
  } else if ((networkResult.value?.ports.length ?? 0) > 0) {
    sectionsFound.push('network');
  }

  // ── enclosures ──────────────────────────────────────────────────────────
  const enclosuresResult = parseEnclosures(lines);
  if (enclosuresResult.error !== null) {
    errors.push({ section: 'enclosures', message: enclosuresResult.error });
  } else if ((enclosuresResult.value?.length ?? 0) > 0) {
    sectionsFound.push('enclosures');
  }

  // ── disk drives ─────────────────────────────────────────────────────────
  const drivesResult = parseDisks(lines);
  if (drivesResult.error !== null) {
    errors.push({ section: 'disks', message: drivesResult.error });
  } else if ((drivesResult.value?.length ?? 0) > 0) {
    sectionsFound.push('disks');
  }

  // ── mtrees ──────────────────────────────────────────────────────────────
  const mtreesResult = parseMtrees(lines);
  if (mtreesResult.error !== null) {
    errors.push({ section: 'mtrees', message: mtreesResult.error });
  } else if ((mtreesResult.value?.length ?? 0) > 0) {
    sectionsFound.push('mtrees');
  }

  // ── licenses ────────────────────────────────────────────────────────────
  const licensesResult = parseLicenses(lines);
  if (licensesResult.error !== null) {
    errors.push({ section: 'licenses', message: licensesResult.error });
  } else if (licensesResult.value !== null) {
    sectionsFound.push('licenses');
  }

  // ── replication ─────────────────────────────────────────────────────────
  const replicationResult = parseReplication(lines);
  if (replicationResult.error !== null) {
    errors.push({ section: 'replication', message: replicationResult.error });
  } else if (replicationResult.value !== null) {
    sectionsFound.push('replication');
  }

  // ── hardware ────────────────────────────────────────────────────────────
  const hardwareResult = parseHardware(lines);
  if (hardwareResult.error !== null) {
    errors.push({ section: 'hardware', message: hardwareResult.error });
  } else if (hardwareResult.value !== null) {
    sectionsFound.push('hardware');
  }

  // ── assemble DisksData ───────────────────────────────────────────────────
  const diskSummaryValue = diskSumResult.value;
  const disks: DisksData = diskSummaryValue !== null
    ? { summary: diskSummaryValue, drives: drivesResult.value ?? [] }
    : EMPTY_DISKS;

  // ── assemble ParsedReport ───────────────────────────────────────────────
  const data: ParsedReport = {
    meta,
    storage:     storageResult.value ?? null,
    compression: compressionResult.value ?? null,
    system_health: healthResult.value ?? null,
    disks,
    enclosures:  enclosuresResult.value ?? [],
    network:     networkResult.value ?? EMPTY_NETWORK,
    alerts:      alertsResult.value ?? EMPTY_ALERTS,
    mtrees:      mtreesResult.value ?? [],
    licenses:    licensesResult.value ?? null,
    replication: replicationResult.value ?? null,
    hardware:    hardwareResult.value ?? null,
  };

  return {
    success: metaResult.value !== null && meta.hostname !== 'unknown',
    data,
    parse_errors:   errors,
    sections_found: sectionsFound,
  };
}
