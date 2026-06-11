/**
 * IngestionService — the most critical service in DD Monitor.
 *
 * Orchestrates the complete autosupport ingest pipeline:
 *   1. Size check against MAX_FILE_SIZE_MB config.
 *   2. Parse raw text with the Layer 1 parser.
 *   3. Hash-based deduplication — skip if identical file already processed.
 *   4. Find or create the device record in dd_devices.
 *   5. Evaluate alert rules (pure — no DB write at this step).
 *   6. Upsert the report row (idempotent on device_id + report_date).
 *   7. Replace child rows: alerts (appliance + engine), mtrees, disks, ports.
 *   8. Write a system_log entry recording the outcome.
 *
 * Steps 6 and 7 are not wrapped in a DB-level transaction (the Supabase JS
 * client does not support client-side transactions). Idempotency is enforced
 * by the UNIQUE(device_id, report_date) constraint on dd_reports — a retry
 * will upsert the same row and re-replace all child rows cleanly.
 *
 * Integration notes (gaps from parser → domain mapping):
 *   Gap A: per-disk state → always DiskState.Unknown (parser does not expose it)
 *   Gap B: enclosure model/serial → looked up from parsed.enclosures map
 *   Gap C: MTree postCompGib → always null (not in DM ASTATS output)
 *   Gap D: MTree rows where mtree_id === null are skipped
 *   Gap E: sys_availability_excl_ctrld, memory_inactive_mib, etc. → null (not in domain)
 *   Gap F: enclosures / licenses / hardware → JSONB only (parsed_data column)
 *   Gap G: comp_global_factor/comp_local_factor for currently_used row → null
 */

import { createHash } from 'crypto';

import { parseAutosupport }  from '@/lib/parser';
import type {
  ParsedReport,
  ReportMeta,
  StorageData,
  CompressionData,
  SystemHealthData,
  DisksSummary,
  DiskDrive,
  EnclosureData,
  NetworkPort as ParserNetworkPort,
  AlertsData,
  AlertEntry,
  AlertHistoryEntry,
  MTreeData,
  ReplicationData,
} from '@/lib/parser/types';

import {
  type Device,
  type CreateDevice,
  type UpdateDevice,
  type CreateReport,
  type StorageSnapshot,
  type CompressionSnapshot,
  type CompressionWindow,
  type DiskSummary,
  type SystemHealthSnapshot,
  type ReplicationState,
  type CreateAlert,
  type CreateMTree,
  type CreateDisk,
  type CreateNetworkPort,
  AlertSeverity,
  AlertSource,
  MTreeStatus,
  DiskTier,
  DiskState,
  PortLinkState,
  DeviceStatus,
  EventType,
  LogSeverity,
  deriveShortName,
} from '@/lib/domain';
import { Gib } from '@/lib/domain/value-objects/gib.vo';
import { StoragePercent } from '@/lib/domain/value-objects/storage-percent.vo';
import { CompressionFactor } from '@/lib/domain/value-objects/compression-factor.vo';

import {
  IngestionError,
} from '@/lib/infrastructure/errors/app-error';
import { ok, err, type AsyncResult } from '@/lib/infrastructure/errors/result';
import { logger, createCorrelatedLogger } from '@/lib/infrastructure/logger/logger';
import { config } from '@/lib/infrastructure/config/config';
import { ERROR_CODES } from '@/lib/infrastructure/errors/error-catalog';

import {
  createServiceClient,
  DeviceRepository,
  ReportRepository,
  AlertRepository,
  MTreeRepository,
  DiskRepository,
  NetworkPortRepository,
  LogRepository,
  AlertRuleRepository,
} from '@/lib/repositories';

import { AlertEngineService } from './alert-engine.service';
import type { IngestionOutcome } from './types';

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Ingests one raw autosupport file end-to-end and persists all derived data.
 *
 * @param rawText  - Complete contents of the autosupport .txt file.
 * @param fileName - Original attachment filename (used for logs and the DB row).
 * @returns Ok(IngestionOutcome) on success, Err(AppError) on any pipeline failure.
 */
export async function ingest(
  rawText: string,
  fileName?: string,
): AsyncResult<IngestionOutcome> {
  const startMs = Date.now();
  const correlationId = crypto.randomUUID();
  const log = createCorrelatedLogger(correlationId);

  log.info('Ingest started', { ...(fileName !== undefined ? { fileName } : {}) });

  // ── Step 1: Size guard ──────────────────────────────────────────────────────
  const maxBytes = config.MAX_FILE_SIZE_MB * 1024 * 1024;
  if (rawText.length > maxBytes) {
    return err(
      new IngestionError(
        `File size ${rawText.length} bytes exceeds the ${config.MAX_FILE_SIZE_MB} MB limit`,
        fileName ?? 'unknown',
        { code: ERROR_CODES.INGESTION.FILE_TOO_LARGE },
      ),
    );
  }

  // ── Step 2: Parse ───────────────────────────────────────────────────────────
  const parseResult = parseAutosupport(rawText);
  const parsed = parseResult.data;
  const hostname = parsed.meta.hostname;
  const reportDateStr = parsed.meta.generated_on.substring(0, 10);

  log.info('Parse complete', {
    deviceHostname:  hostname,
    reportDate:      reportDateStr,
    sectionsFound:   parseResult.sections_found.length,
    parseErrorCount: parseResult.parse_errors.length,
  });

  const parseErrorMessages = parseResult.parse_errors.map(
    e => `${e.section}: ${e.message}`,
  );

  // ── Step 3: Deduplication hash ──────────────────────────────────────────────
  const rawTextHash = sha256Hex(rawText);
  const fileSizeBytes = Buffer.byteLength(rawText, 'utf8');

  const db = createServiceClient();
  const reportRepo = new ReportRepository(db);

  const hashCheckResult = await reportRepo.findIdByHash(rawTextHash);
  if (!hashCheckResult.ok) return hashCheckResult;

  if (hashCheckResult.value !== null) {
    const durationMs = Date.now() - startMs;
    log.info('Ingest skipped: identical file already processed', {
      deviceHostname:   hostname,
      existingReportId: hashCheckResult.value,
      durationMs,
    });
    return ok({
      deviceId:          '',
      reportId:          hashCheckResult.value,
      hostname,
      reportDate:        reportDateStr,
      isNewDevice:       false,
      isReprocessed:     true,
      alertsEvaluated:   0,
      alertsFired:       0,
      applianceAlertCount: 0,
      deviceStatus:      DeviceStatus.Unknown,
      parseErrors:       parseErrorMessages,
      durationMs,
    });
  }

  // ── Step 4: Find or create device ───────────────────────────────────────────
  const deviceRepo = new DeviceRepository(db);
  const findResult = await deviceRepo.findByHostname(hostname);
  if (!findResult.ok) return findResult;

  let device: Device;
  let isNewDevice = false;

  if (findResult.value === null) {
    const createDeviceResult = await deviceRepo.create(
      buildCreateDevice(parsed.meta, parsed.storage),
    );
    if (!createDeviceResult.ok) {
      return err(
        new IngestionError(
          `Failed to create device record for ${hostname}: ${createDeviceResult.error.message}`,
          fileName ?? 'unknown',
          { code: ERROR_CODES.INGESTION.DEVICE_CREATE_FAILED, cause: createDeviceResult.error, deviceHostname: hostname },
        ),
      );
    }
    device = createDeviceResult.value;
    isNewDevice = true;
    log.info('New device registered', { deviceHostname: hostname, deviceId: device.id });
  } else {
    device = findResult.value;
    const patch = buildUpdateDevice(parsed.meta, parsed.storage, device);
    if (Object.keys(patch).length > 0) {
      const updateResult = await deviceRepo.update(device.id, patch);
      if (!updateResult.ok) return updateResult;
      device = updateResult.value;
    }
  }

  // ── Step 5: Build appliance alerts (for engine evaluation, reportId pending) ─
  const applianceAlertsForEval = buildAppliancePendingAlerts(
    parsed.alerts,
    device.id,
  );

  // ── Step 6: Load alert rules and run engine ──────────────────────────────────
  const alertRuleRepo = new AlertRuleRepository(db);
  const rulesResult = await alertRuleRepo.findAllEnabled();
  if (!rulesResult.ok) return rulesResult;
  const rules = rulesResult.value;

  const preliminaryReport = buildCreateReport(
    parsed,
    device.id,
    DeviceStatus.Unknown,
    0, 0, 0, 0,
    parseErrorMessages,
    fileName,
    fileSizeBytes,
  );

  const engine = new AlertEngineService();
  const evalResult = engine.evaluate(
    preliminaryReport,
    applianceAlertsForEval,
    rules,
    device.id,
    reportDateStr,
  );

  const { deviceStatus, engineAlerts, rulesEvaluated, rulesFired, notificationRequired } = evalResult;

  // ── Step 7: Compute final alert counts ──────────────────────────────────────
  const activeAlerts = [
    ...applianceAlertsForEval.filter(a => a.isActive),
    ...engineAlerts,
  ];
  const critCount = activeAlerts.filter(a => a.severity === AlertSeverity.Critical).length;
  const warnCount = activeAlerts.filter(a => a.severity === AlertSeverity.Warning).length;
  const infoCount = activeAlerts.filter(a => a.severity === AlertSeverity.Info).length;
  const totalCount = critCount + warnCount + infoCount;

  const finalReport = buildCreateReport(
    parsed,
    device.id,
    deviceStatus,
    critCount, warnCount, infoCount, totalCount,
    parseErrorMessages,
    fileName,
    fileSizeBytes,
  );

  // ── Step 8: Upsert report ────────────────────────────────────────────────────
  const upsertResult = await reportRepo.upsert({
    report:       finalReport,
    parsedData:   parsed as unknown as Record<string, unknown>,
    ...(fileName !== undefined ? { fileName } : {}),
    fileSizeBytes,
    rawTextHash,
  });
  if (!upsertResult.ok) {
    return err(
      new IngestionError(
        `Failed to save report for ${hostname} (${reportDateStr}): ${upsertResult.error.message}`,
        fileName ?? 'unknown',
        { code: ERROR_CODES.INGESTION.REPORT_SAVE_FAILED, cause: upsertResult.error, deviceHostname: hostname },
      ),
    );
  }
  const report = upsertResult.value;

  // ── Step 9: Build child entities with real reportId ──────────────────────────
  const reportDateISO = reportDateStr;

  const applianceCreateAlerts = applianceAlertsForEval.map(
    a => ({ ...a, reportId: report.id }),
  );
  const engineCreateAlerts = engineAlerts.map(
    a => ({ ...a, reportId: report.id }),
  );
  const allAlerts: readonly CreateAlert[] = [...applianceCreateAlerts, ...engineCreateAlerts];

  const enclosureById = buildEnclosureById(parsed.enclosures);
  const createMTrees = buildCreateMTrees(parsed.mtrees, device.id, report.id, reportDateISO);
  const createDisks  = buildCreateDisks(parsed.disks.drives, device.id, report.id, reportDateISO, enclosureById);
  const createPorts  = buildCreatePorts(parsed.network.ports, device.id, report.id, reportDateISO);

  // ── Step 10: Replace child rows ──────────────────────────────────────────────
  const alertRepo = new AlertRepository(db);
  const mtreeRepo  = new MTreeRepository(db);
  const diskRepo   = new DiskRepository(db);
  const portRepo   = new NetworkPortRepository(db);

  const [alertsResult, mtreesResult, disksResult, portsResult] = await Promise.all([
    alertRepo.replaceForReport(report.id, device.id, reportDateISO, allAlerts),
    mtreeRepo.replaceForReport(report.id, device.id, reportDateISO, createMTrees),
    diskRepo.replaceForReport(report.id, device.id, reportDateISO, createDisks),
    portRepo.replaceForReport(report.id, device.id, reportDateISO, createPorts),
  ]);

  if (!alertsResult.ok) return alertsResult;
  if (!mtreesResult.ok) return mtreesResult;
  if (!disksResult.ok)  return disksResult;
  if (!portsResult.ok)  return portsResult;

  // ── Step 11: Write system log ────────────────────────────────────────────────
  const durationMs = Date.now() - startMs;
  const logRepo = new LogRepository(db);

  await logRepo.create({
    eventType: EventType.Ingestion,
    severity:  parseErrorMessages.length > 0 ? LogSeverity.Warning : LogSeverity.Info,
    deviceId:  device.id,
    message:   `Ingest completed for ${hostname} — ${totalCount} active alert(s) (${critCount} critical, ${warnCount} warning)`,
    details: {
      hostname,
      reportDate:         reportDateISO,
      reportId:           report.id,
      isNewDevice,
      alertsEvaluated:    rulesEvaluated,
      alertsFired:        rulesFired,
      applianceAlertCount: applianceAlertsForEval.length,
      durationMs,
      parseErrorCount:    parseErrorMessages.length,
      notificationRequired,
    },
    correlationId,
  });

  // ── Step 12: Materialized views — refreshed by pg_cron, not here ────────────
  // Materialized views (fleet_storage_trend, fleet_daily_summary,
  // device_capacity_comparison, alert_trend_summary) are refreshed on a
  // 10-minute schedule by a pg_cron job installed in migration
  // 006_performance_tuning.sql (Change 4).
  //
  // The per-ingest refresh call was deliberately NOT added to this pipeline:
  //   - Each refresh scans 40 days of dd_reports to rebuild all four views,
  //     adding 500ms–2s to every single ingest run.
  //   - With 20 devices this creates up to 80 rushed refresh cycles during the
  //     morning ingest window, each holding a ShareUpdateExclusiveLock that
  //     contends with parallel ingests.
  //   - Dashboard charts show historical trend data — a maximum 10-minute lag
  //     between ingest completion and chart update is acceptable for a system
  //     that processes daily autosupport files (data is already 24h old).
  //
  // Do NOT add a refresh_materialized_views() rpc call here. All chart freshness
  // requirements are met by the pg_cron schedule.

  log.info('Ingest complete', {
    deviceHostname: hostname,
    reportDate:     reportDateISO,
    durationMs,
    notificationRequired,
  });

  return ok({
    deviceId:           device.id,
    reportId:           report.id,
    hostname,
    reportDate:         reportDateISO,
    isNewDevice,
    isReprocessed:      false,
    alertsEvaluated:    rulesEvaluated,
    alertsFired:        rulesFired,
    applianceAlertCount: applianceAlertsForEval.length,
    deviceStatus,
    parseErrors:        parseErrorMessages,
    durationMs,
  });
}

// ---------------------------------------------------------------------------
// SHA-256 hash helper
// ---------------------------------------------------------------------------

function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

// ---------------------------------------------------------------------------
// CreateDevice builder
// ---------------------------------------------------------------------------

function buildCreateDevice(meta: ReportMeta, storage: StorageData | null): CreateDevice {
  const totalCapGib = storage?.total_gib !== null && storage !== null
    ? gibFromRaw(storage.total_gib)
    : null;

  return {
    hostname:  meta.hostname,
    shortName: deriveShortName(meta.hostname),
    ...(meta.model         !== null ? { model:        meta.model }         : {}),
    ...(meta.serial_number !== null ? { serialNumber: meta.serial_number } : {}),
    ...(meta.chassis_serial !== null ? { chassisSerial: meta.chassis_serial } : {}),
    ...(meta.location      !== null ? { location:     meta.location }      : {}),
    ...(meta.os_version    !== null ? { osVersion:    meta.os_version }    : {}),
    ...(totalCapGib !== null        ? { totalCapacity: totalCapGib }       : {}),
  };
}

// ---------------------------------------------------------------------------
// UpdateDevice builder
// ---------------------------------------------------------------------------

function buildUpdateDevice(
  meta: ReportMeta,
  storage: StorageData | null,
  current: Device,
): UpdateDevice {
  const totalCapGib = storage?.total_gib !== null && storage !== null
    ? gibFromRaw(storage.total_gib)
    : null;

  return {
    ...(meta.model !== null && meta.model !== current.model
      ? { model: meta.model } : {}),
    ...(meta.serial_number !== null && meta.serial_number !== current.serialNumber
      ? { serialNumber: meta.serial_number } : {}),
    ...(meta.chassis_serial !== null && meta.chassis_serial !== current.chassisSerial
      ? { chassisSerial: meta.chassis_serial } : {}),
    ...(meta.location !== null && meta.location !== current.location
      ? { location: meta.location } : {}),
    ...(meta.os_version !== null && meta.os_version !== current.osVersion
      ? { osVersion: meta.os_version } : {}),
    ...(totalCapGib !== null && (current.totalCapacity === null || totalCapGib.value !== current.totalCapacity.value)
      ? { totalCapacity: totalCapGib } : {}),
  };
}

// ---------------------------------------------------------------------------
// CreateReport builder
// ---------------------------------------------------------------------------

function buildCreateReport(
  parsed: ParsedReport,
  deviceId: string,
  deviceStatus: DeviceStatus,
  activeCriticalAlerts: number,
  activeWarningAlerts: number,
  activeInfoAlerts: number,
  activeTotalAlerts: number,
  parseErrors: readonly string[],
  fileName: string | undefined,
  fileSizeBytes: number,
): CreateReport {
  const ports = parsed.network.ports;
  const networkPortsTotal = ports.length > 0 ? ports.length : null;
  const networkPortsDown = ports.filter(
    p => p.state.toLowerCase() !== 'running',
  ).length;

  const isValid =
    parsed.meta.hostname !== '' &&
    parsed.storage !== null &&
    parseErrors.filter(e => e.toLowerCase().includes('critical')).length === 0;

  return {
    deviceId,
    reportDate:  new Date(parsed.meta.generated_on.substring(0, 10) + 'T00:00:00.000Z'),
    generatedOn: new Date(parsed.meta.generated_on),

    storage:      buildStorageSnapshot(parsed.storage),
    compression:  buildCompressionSnapshot(parsed.compression),
    disks:        buildDiskSummary(parsed.disks.summary),
    systemHealth: buildSystemHealthSnapshot(parsed.system_health),
    replication:  buildReplicationState(parsed.replication),

    deviceStatus,
    activeCriticalAlerts,
    activeWarningAlerts,
    activeInfoAlerts,
    activeTotalAlerts,

    networkPortsTotal,
    networkPortsDown,

    isValid,
    parseErrors,
    fileName:      fileName ?? null,
    fileSizeBytes,
    parsedData:    null,   // passed separately via ReportUpsertParams.parsedData
  };
}

// ---------------------------------------------------------------------------
// Sub-entity builders — storage / compression / health / replication
// ---------------------------------------------------------------------------

function buildStorageSnapshot(s: StorageData | null): StorageSnapshot {
  if (s === null) {
    return {
      totalGib:     Gib.ZERO,
      usedGib:      Gib.ZERO,
      availableGib: Gib.ZERO,
      usedPercent:  StoragePercent.unsafe(0),
      cleanableGib: null,
      preCompGib:   null,
      lastCleaning: null,
    };
  }
  return {
    totalGib:     Gib.unsafe(s.total_gib     ?? 0),
    usedGib:      Gib.unsafe(s.used_gib      ?? 0),
    availableGib: Gib.unsafe(s.available_gib ?? 0),
    usedPercent:  StoragePercent.unsafe(s.used_percent ?? 0),
    cleanableGib: gibFromRaw(s.cleanable_gib),
    preCompGib:   gibFromRaw(s.pre_comp_gib),
    lastCleaning: s.last_cleaning !== null ? new Date(s.last_cleaning) : null,
  };
}

function buildCompressionWindow(
  preCompGib: number,
  postCompGib: number,
  globalFactor: number | null,
  localFactor: number | null,
  totalFactor: number,
  reductionPercent: number,
): CompressionWindow {
  return {
    preCompGib:       gibFromRaw(preCompGib),
    postCompGib:      gibFromRaw(postCompGib),
    globalFactor:     cfFromRaw(globalFactor),
    localFactor:      cfFromRaw(localFactor),
    totalFactor:      cfFromRaw(totalFactor),
    reductionPercent,
  };
}

function buildCompressionSnapshot(c: CompressionData | null): CompressionSnapshot {
  const emptyWindow: CompressionWindow = {
    preCompGib: null, postCompGib: null,
    globalFactor: null, localFactor: null,
    totalFactor: null, reductionPercent: null,
  };
  if (c === null) {
    return { periodFrom: null, periodTo: null, currentlyUsed: emptyWindow, last7Days: emptyWindow, last24Hours: emptyWindow };
  }
  return {
    periodFrom: new Date(c.period_from),
    periodTo:   new Date(c.period_to),
    // Gap G: currently_used has no global/local breakdown
    currentlyUsed: buildCompressionWindow(
      c.currently_used.pre_comp_gib, c.currently_used.post_comp_gib,
      null, null,
      c.currently_used.total_factor, c.currently_used.reduction_percent,
    ),
    last7Days: buildCompressionWindow(
      c.last_7_days.pre_comp_gib, c.last_7_days.post_comp_gib,
      c.last_7_days.global_factor, c.last_7_days.local_factor,
      c.last_7_days.total_factor,  c.last_7_days.reduction_percent,
    ),
    last24Hours: buildCompressionWindow(
      c.last_24_hours.pre_comp_gib, c.last_24_hours.post_comp_gib,
      c.last_24_hours.global_factor, c.last_24_hours.local_factor,
      c.last_24_hours.total_factor,  c.last_24_hours.reduction_percent,
    ),
  };
}

function buildDiskSummary(s: DisksSummary): DiskSummary {
  return {
    activeTierTotal:       s.active_tier_total  ?? 0,
    activeTierInUse:       s.active_tier_in_use ?? 0,
    activeTierSpare:       s.active_tier_spare  ?? 0,
    cacheTierTotal:        s.cache_tier_total,
    cacheTierInUse:        s.cache_tier_in_use,
    failedDisks:           s.failed_disks,
    overallStatus:         s.overall_status,
    proactiveCheckMessage: s.proactive_check,
  };
}

function buildSystemHealthSnapshot(h: SystemHealthData | null): SystemHealthSnapshot {
  if (h === null) {
    return {
      availabilitySince: null, systemAvailabilityPercent: null,
      filesystemAvailabilityPercent: null, memoryTotalMib: null,
      memoryFreeMib: null, swapTotalMib: null, swapFreeMib: null,
      filesystemVerifyStatus: null, nfsStatus: null, cifsStatus: null,
    };
  }
  return {
    availabilitySince:              h.availability_since !== null ? new Date(h.availability_since) : null,
    systemAvailabilityPercent:      h.system_availability_percent,
    filesystemAvailabilityPercent:  h.filesystem_availability_percent,
    memoryTotalMib:                 h.memory_total_mib,
    memoryFreeMib:                  h.memory_free_mib,
    swapTotalMib:                   h.swap_total_mib,
    swapFreeMib:                    h.swap_free_mib,
    filesystemVerifyStatus:         h.filesystem_verify_status,
    nfsStatus:                      h.nfs_status,
    cifsStatus:                     h.cifs_status,
  };
}

function buildReplicationState(r: ReplicationData | null): ReplicationState {
  if (r === null) return { configured: false, status: null };
  return { configured: r.configured, status: r.status };
}

// ---------------------------------------------------------------------------
// Appliance alert builder
// ---------------------------------------------------------------------------

/**
 * Maps parser alert data to domain CreateAlert objects with a placeholder
 * reportId ('') — the ingestion service fills in the real UUID after upsert.
 *
 * Deduplication: history entries take precedence (they carry clear_time).
 * Active alerts not already in history are appended.
 */
function buildAppliancePendingAlerts(
  alerts: AlertsData,
  deviceId: string,
): CreateAlert[] {
  const seenIds = new Set<string>();
  const result: CreateAlert[] = [];

  for (const h of alerts.history) {
    seenIds.add(h.id);
    result.push({
      deviceId,
      reportId:   '',   // placeholder
      reportDate: new Date(),   // will be replaced by real date after upsert
      alertId:    h.id,
      severity:   mapAlertSeverity(h.severity),
      class:      normStr(h.class),
      object:     normStr(h.object),
      message:    h.message,
      postTime:   new Date(h.post_time),
      clearTime:  h.clear_time !== null ? new Date(h.clear_time) : null,
      isActive:   h.status === 'active',
      source:     AlertSource.Appliance,
    });
  }

  for (const a of alerts.active) {
    if (!seenIds.has(a.id)) {
      result.push({
        deviceId,
        reportId:   '',
        reportDate: new Date(),
        alertId:    a.id,
        severity:   mapAlertSeverity(a.severity),
        class:      normStr(a.class),
        object:     normStr(a.object),
        message:    a.message,
        postTime:   new Date(a.post_time),
        clearTime:  null,
        isActive:   true,
        source:     AlertSource.Appliance,
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// MTree builder
// ---------------------------------------------------------------------------

/** Gap D: filters out mtrees with null mtree_id. Gap C: postCompGib always null. */
function buildCreateMTrees(
  mtrees: readonly MTreeData[],
  deviceId: string,
  reportId: string,
  reportDate: string,
): CreateMTree[] {
  return mtrees
    .filter((m): m is MTreeData & { mtree_id: string } => m.mtree_id !== null)
    .map(m => {
      const preGib = Gib.from(m.pre_comp_gib);
      return {
        deviceId,
        reportId,
        reportDate: new Date(reportDate),
        name:       m.name,
        mtreeId:    m.mtree_id,
        status:     mapMTreeStatus(m.status),
        preCompGib:  preGib.ok ? preGib.value : null,
        postCompGib: null,   // Gap C — not in DM ASTATS output
      };
    });
}

// ---------------------------------------------------------------------------
// Disk builder
// ---------------------------------------------------------------------------

/**
 * Gap A: per-disk state → always DiskState.Unknown (Disk Show Hardware does not
 *   include a state column per-drive, only summary counts in GENERAL STATUS).
 * Gap B: enclosure model/serial looked up from the enclosureById map.
 */
function buildCreateDisks(
  drives: readonly DiskDrive[],
  deviceId: string,
  reportId: string,
  reportDate: string,
  enclosureById: Map<number, { model: string; serial: string }>,
): CreateDisk[] {
  return drives.map(d => {
    const enc = enclosureById.get(d.enclosure);
    const tier = d.type.toUpperCase().includes('SSD') ? DiskTier.Cache : DiskTier.Active;
    const capGib = Gib.from(d.capacity_gib);
    return {
      deviceId,
      reportId,
      reportDate:      new Date(reportDate),
      enclosureId:     d.enclosure,
      enclosureModel:  enc?.model   ?? null,
      enclosureSerial: enc?.serial  ?? null,
      slotNumber:      d.slot,
      label:           `Enclosure${d.enclosure}-Slot${d.slot}`,
      tier,
      state:           DiskState.Unknown,   // Gap A
      model:           normStr(d.manufacturer_model),
      serialNumber:    normStr(d.serial),
      firmwareVersion: normStr(d.firmware),
      capacityGib:     capGib.ok ? capGib.value : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Network port builder
// ---------------------------------------------------------------------------

function buildCreatePorts(
  ports: readonly ParserNetworkPort[],
  deviceId: string,
  reportId: string,
  reportDate: string,
): CreateNetworkPort[] {
  return ports.map(p => {
    const linkState = mapPortLinkState(p.state);
    return {
      deviceId,
      reportId,
      reportDate:      new Date(reportDate),
      name:            p.name,
      speed:           normStr(p.speed),
      duplex:          normStr(p.duplex),
      physicalType:    normStr(p.physical),
      hardwareAddress: p.hardware_address,
      linkState,
      isDown:          linkState !== PortLinkState.Running,
    };
  });
}

// ---------------------------------------------------------------------------
// Enclosure lookup map (Gap B)
// ---------------------------------------------------------------------------

function buildEnclosureById(
  enclosures: readonly EnclosureData[],
): Map<number, { model: string; serial: string }> {
  const map = new Map<number, { model: string; serial: string }>();
  for (const enc of enclosures) {
    map.set(enc.id, { model: enc.model, serial: enc.serial });
  }
  return map;
}

// ---------------------------------------------------------------------------
// Enum mappers
// ---------------------------------------------------------------------------

function mapAlertSeverity(raw: AlertEntry['severity'] | AlertHistoryEntry['severity']): AlertSeverity {
  switch (raw) {
    case 'CRITICAL': return AlertSeverity.Critical;
    case 'WARNING':  return AlertSeverity.Warning;
    case 'INFO':     return AlertSeverity.Info;
  }
}

function mapMTreeStatus(raw: string): MTreeStatus {
  switch (raw) {
    case 'RW': return MTreeStatus.ReadWrite;
    case 'RO': return MTreeStatus.ReadOnly;
    default:   return MTreeStatus.Unknown;
  }
}

function mapPortLinkState(state: string): PortLinkState {
  switch (state.toLowerCase()) {
    case 'running': return PortLinkState.Running;
    case 'up':      return PortLinkState.Up;
    case 'down':    return PortLinkState.Down;
    default:        return PortLinkState.Unknown;
  }
}

// ---------------------------------------------------------------------------
// Value object factories — safe guards for parser numbers
// ---------------------------------------------------------------------------

function gibFromRaw(v: number | null | undefined): Gib | null {
  if (v === null || v === undefined) return null;
  const result = Gib.from(v);
  return result.ok ? result.value : null;
}

function cfFromRaw(v: number | null | undefined): CompressionFactor | null {
  if (v === null || v === undefined || v < 1.0) return null;
  return CompressionFactor.unsafe(v);
}

/** Converts empty strings and 'unknown' to null for nullable DB string columns. */
function normStr(s: string): string | null {
  const trimmed = s.trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'unknown') return null;
  return trimmed;
}
