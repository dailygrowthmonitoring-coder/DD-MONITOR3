/**
 * ExportService — HTML report generation for the Export page.
 *
 * Generates a complete, self-contained HTML document for a device's daily
 * report. The document is styled for print (A4 page size, print CSS media)
 * so the user can open it in a browser and print to PDF, or save it directly
 * as an HTML archive.
 *
 * No external PDF library is required — this approach works on Vercel serverless
 * (no headless browser, no native binaries). The API route returns the document
 * with Content-Type: text/html and Content-Disposition: attachment.
 *
 * Sections included:
 *   - Report header (device, date, generated-on timestamp)
 *   - Storage utilisation (capacity bar, key metrics)
 *   - Compression statistics (current / 7-day / 24-hour)
 *   - System health (availability, memory, NFS/CIFS)
 *   - Active alerts (from dd_alerts for this report)
 *   - Disk summary (GENERAL STATUS summary counts)
 *   - Replication state
 */

import { type Report, type Alert, type Device, AlertSeverity, DeviceStatus } from '@/lib/domain';
import {
  createServiceClient,
  ReportRepository,
  AlertRepository,
  DeviceRepository,
} from '@/lib/repositories';
import { ok, err, type AsyncResult } from '@/lib/infrastructure/errors/result';
import { NotFoundError } from '@/lib/infrastructure/errors/app-error';
import type { ExportReport } from './types';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates a print-optimized HTML report for a device + date combination.
 *
 * @param deviceId   - Device UUID.
 * @param reportDate - ISO date string, e.g. "2026-06-10".
 * @returns Ok(ExportReport) on success, Err(NotFoundError) if report absent.
 */
export async function generateReport(
  deviceId: string,
  reportDate: string,
): AsyncResult<ExportReport> {
  const db = createServiceClient();
  const reportRepo = new ReportRepository(db);
  const alertRepo  = new AlertRepository(db);
  const deviceRepo = new DeviceRepository(db);

  // Load the report (with parsed_data for deep detail)
  const findResult = await reportRepo.findByDeviceAndDate(deviceId, reportDate);
  if (!findResult.ok) return findResult;
  if (findResult.value === null) {
    return err(new NotFoundError('Report', `${deviceId}/${reportDate}`));
  }

  const detailResult = await reportRepo.findDetailById(findResult.value.id);
  if (!detailResult.ok) return detailResult;
  const report = detailResult.value;

  // Load device for hostname and model
  const deviceResult = await deviceRepo.findById(deviceId);
  const hostname = deviceResult.ok ? deviceResult.value.hostname : deviceId;
  const model    = deviceResult.ok ? (deviceResult.value.model ?? '') : '';

  // Load alerts for this report
  const alertsResult = await alertRepo.findByReport(report.id);
  const alerts: readonly Alert[] = alertsResult.ok ? alertsResult.value : [];

  const htmlContent = buildHtml(hostname, model, report, alerts);
  const safeHostname = hostname.split('.')[0] ?? hostname;
  const fileName = `${safeHostname}-${reportDate}-report.html`;

  return ok({ htmlContent, fileName, reportDate, hostname });
}

// ---------------------------------------------------------------------------
// HTML builder
// ---------------------------------------------------------------------------

function buildHtml(
  hostname: string,
  model: string,
  report: Report,
  alerts: readonly Alert[],
): string {
  const generatedOn = report.generatedOn
    ? report.generatedOn.toUTCString()
    : report.reportDate.toISOString().substring(0, 10);

  const statusColour = report.deviceStatus === DeviceStatus.Critical ? '#e53e3e'
                     : report.deviceStatus === DeviceStatus.Warning  ? '#dd6b20'
                     : report.deviceStatus === DeviceStatus.Healthy  ? '#38a169'
                     : '#718096';

  const usedPct    = report.storage.usedPercent.value;
  const barColour  = usedPct >= 95 ? '#e53e3e' : usedPct >= 90 ? '#dd6b20' : '#3182ce';

  const activeAlerts  = alerts.filter(a => a.isActive);
  const alertRowsHtml = activeAlerts.length === 0
    ? '<tr><td colspan="4" style="padding:12px;color:#a0aec0;text-align:center;">No active alerts</td></tr>'
    : activeAlerts.map(a => {
        const colour = a.severity === AlertSeverity.Critical ? '#e53e3e'
                     : a.severity === AlertSeverity.Warning  ? '#dd6b20'
                     : '#2b6cb0';
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${escHtml(report.reportDate.toISOString().substring(0, 10))}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:${colour};font-weight:600;">${a.severity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${escHtml(a.message)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#718096;">${a.source}</td>
        </tr>`;
      }).join('');

  const comprTable = buildCompressionTable(report);
  const diskSummaryHtml = buildDiskSummary(report);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>DD Monitor Report — ${escHtml(hostname)} ${escHtml(report.reportDate.toISOString().substring(0, 10))}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
           font-size: 13px; color: #2d3748; background: #fff; margin: 0; padding: 24px 32px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #718096;
         margin: 24px 0 10px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { padding: 6px 10px; background: #f7fafc; color: #718096; text-align: left;
         font-weight: 600; border-bottom: 2px solid #e2e8f0; }
    td { padding: 6px 10px; border-bottom: 1px solid #f0f4f8; vertical-align: top; }
    .kv td:first-child { color: #718096; width: 180px; }
    .bar-bg { background: #e2e8f0; border-radius: 4px; height: 12px; width: 100%; margin: 4px 0; }
    .bar-fill { height: 12px; border-radius: 4px; background: ${barColour}; width: ${Math.min(usedPct, 100).toFixed(1)}%; }
    .status { display: inline-block; padding: 2px 10px; border-radius: 12px; font-weight: 600;
              font-size: 11px; background: ${statusColour}20; color: ${statusColour}; border: 1px solid ${statusColour}40; }
    @media print {
      body { padding: 0; }
      @page { size: A4; margin: 20mm; }
    }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;">
    <div>
      <h1>${escHtml(hostname)}</h1>
      <div style="color:#718096;">${escHtml(model)} &nbsp;·&nbsp; Report date: ${escHtml(report.reportDate.toISOString().substring(0, 10))}</div>
      <div style="color:#a0aec0;font-size:11px;margin-top:2px;">Generated: ${escHtml(generatedOn)}</div>
    </div>
    <div style="text-align:right;">
      <div class="status">${report.deviceStatus.toUpperCase()}</div>
      <div style="color:#718096;margin-top:6px;font-size:12px;">Exported by DD Monitor</div>
    </div>
  </div>

  <h2>Storage</h2>
  <table class="kv" style="margin-bottom:12px;">
    <tr><td>Total Capacity</td><td>${report.storage.totalGib.toHumanString()}</td></tr>
    <tr><td>Used</td><td>${report.storage.usedGib.toHumanString()} (${usedPct.toFixed(1)}%)</td></tr>
    <tr><td>Available</td><td>${report.storage.availableGib.toHumanString()}</td></tr>
    <tr><td>Cleanable</td><td>${report.storage.cleanableGib?.toHumanString() ?? '—'}</td></tr>
    <tr><td>Pre-compression</td><td>${report.storage.preCompGib?.toHumanString() ?? '—'}</td></tr>
    <tr><td>Last Cleaning</td><td>${report.storage.lastCleaning?.toUTCString() ?? '—'}</td></tr>
  </table>
  <div class="bar-bg"><div class="bar-fill"></div></div>
  <div style="color:#718096;font-size:11px;margin-top:2px;">${usedPct.toFixed(1)}% used</div>

  <h2>Compression</h2>
  ${comprTable}

  <h2>System Health</h2>
  <table class="kv">
    <tr><td>Availability Since</td><td>${report.systemHealth.availabilitySince?.toUTCString() ?? '—'}</td></tr>
    <tr><td>System Availability</td><td>${fmt(report.systemHealth.systemAvailabilityPercent, '%')}</td></tr>
    <tr><td>FS Availability</td><td>${fmt(report.systemHealth.filesystemAvailabilityPercent, '%')}</td></tr>
    <tr><td>Memory</td><td>${fmtMib(report.systemHealth.memoryFreeMib)} free / ${fmtMib(report.systemHealth.memoryTotalMib)}</td></tr>
    <tr><td>Swap</td><td>${fmtMib(report.systemHealth.swapFreeMib)} free / ${fmtMib(report.systemHealth.swapTotalMib)}</td></tr>
    <tr><td>FS Verify Status</td><td>${report.systemHealth.filesystemVerifyStatus ?? '—'}</td></tr>
    <tr><td>NFS Status</td><td>${report.systemHealth.nfsStatus ?? '—'}</td></tr>
    <tr><td>CIFS Status</td><td>${report.systemHealth.cifsStatus ?? '—'}</td></tr>
  </table>

  <h2>Disk Summary</h2>
  ${diskSummaryHtml}

  <h2>Replication</h2>
  <table class="kv">
    <tr><td>Configured</td><td>${report.replication.configured ? 'Yes' : 'No'}</td></tr>
    <tr><td>Status</td><td>${report.replication.status ?? '—'}</td></tr>
  </table>

  <h2>Active Alerts (${activeAlerts.length})</h2>
  <table>
    <thead><tr>
      <th>Date</th><th>Severity</th><th>Message</th><th>Source</th>
    </tr></thead>
    <tbody>${alertRowsHtml}</tbody>
  </table>

  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;color:#a0aec0;font-size:11px;">
    Generated by DD Monitor &nbsp;·&nbsp; ${new Date().toUTCString()}
  </div>
</body>
</html>`;
}

function buildCompressionTable(report: Report): string {
  const rows = [
    { label: 'Currently Used',
      ...report.compression.currentlyUsed },
    { label: 'Last 7 Days',
      ...report.compression.last7Days },
    { label: 'Last 24 Hours',
      ...report.compression.last24Hours },
  ];

  const rowsHtml = rows.map(r =>
    `<tr>
      <td style="font-weight:600;">${r.label}</td>
      <td>${r.preCompGib?.toHumanString() ?? '—'}</td>
      <td>${r.postCompGib?.toHumanString() ?? '—'}</td>
      <td>${r.globalFactor?.value.toFixed(2) ?? '—'}×</td>
      <td>${r.localFactor?.value.toFixed(2) ?? '—'}×</td>
      <td>${r.totalFactor?.value.toFixed(2) ?? '—'}×</td>
      <td>${r.reductionPercent !== null ? r.reductionPercent.toFixed(1) + '%' : '—'}</td>
    </tr>`,
  ).join('');

  return `<table>
    <thead><tr>
      <th>Period</th><th>Pre-comp</th><th>Post-comp</th>
      <th>Global Factor</th><th>Local Factor</th><th>Total Factor</th><th>Reduction</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>`;
}

function buildDiskSummary(report: Report): string {
  const d = report.disks;
  return `<table class="kv">
    <tr><td>Active Tier Total</td><td>${d.activeTierTotal}</td></tr>
    <tr><td>Active Tier In Use</td><td>${d.activeTierInUse}</td></tr>
    <tr><td>Active Tier Spare</td><td>${d.activeTierSpare}</td></tr>
    <tr><td>Cache Tier Total</td><td>${d.cacheTierTotal ?? '—'}</td></tr>
    <tr><td>Cache Tier In Use</td><td>${d.cacheTierInUse ?? '—'}</td></tr>
    <tr><td>Failed Disks</td><td style="color:${d.failedDisks > 0 ? '#e53e3e' : 'inherit'};font-weight:${d.failedDisks > 0 ? '600' : 'normal'};">${d.failedDisks}</td></tr>
    <tr><td>Overall Status</td><td>${d.overallStatus ?? '—'}</td></tr>
    <tr><td>Proactive Check</td><td>${d.proactiveCheckMessage ?? '—'}</td></tr>
  </table>`;
}

// ---------------------------------------------------------------------------
// Weekly fleet report
// ---------------------------------------------------------------------------

/**
 * Generates a weekly fleet HTML report covering all active devices.
 * Called by POST /api/export/weekly (invoked by Google Apps Script weekly).
 *
 * Loads the most recent report for each active device, builds a single
 * self-contained HTML document with a per-device section and a fleet summary.
 *
 * @returns Ok(ExportReport) on success; the htmlContent is a complete document.
 */
export async function generateWeeklyReport(): AsyncResult<ExportReport> {
  const db = createServiceClient();
  const deviceRepo = new DeviceRepository(db);
  const reportRepo = new ReportRepository(db);

  const devicesResult = await deviceRepo.findAllActive();
  if (!devicesResult.ok) return devicesResult;

  const weekStr  = new Date().toISOString().substring(0, 10);
  const fileName = `dd-monitor-weekly-${weekStr}.html`;

  // Load the most recent report for each device
  const deviceReports: { device: Device; report: Report | null }[] = [];
  for (const device of devicesResult.value) {
    const recentResult = await reportRepo.findRecentByDevice(device.id, 1);
    const report       = recentResult.ok ? (recentResult.value[0] ?? null) : null;
    deviceReports.push({ device, report });
  }

  const htmlContent = buildWeeklyHtml(deviceReports, weekStr);
  return ok({ htmlContent, fileName, reportDate: weekStr, hostname: 'Fleet' });
}

function buildWeeklyHtml(
  deviceReports: { device: Device; report: Report | null }[],
  weekStr: string,
): string {
  const totalDevices  = deviceReports.length;
  const reporting     = deviceReports.filter(d => d.report !== null).length;
  const critCount     = deviceReports.filter(d => d.device.lastStatus === DeviceStatus.Critical).length;
  const warnCount     = deviceReports.filter(d => d.device.lastStatus === DeviceStatus.Warning).length;
  const healthyCount  = deviceReports.filter(d => d.device.lastStatus === DeviceStatus.Healthy).length;
  const totalAlerts   = deviceReports.reduce((s, d) => s + d.device.lastActiveAlerts, 0);

  const devicSections = deviceReports
    .map(({ device, report }) => buildDeviceSection(device, report))
    .join('\n');

  const statusColour = critCount > 0 ? '#e53e3e' : warnCount > 0 ? '#dd6b20' : '#38a169';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DD Monitor Weekly Fleet Report — ${escHtml(weekStr)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
           font-size: 13px; color: #2d3748; background: #fff; margin: 0; padding: 24px 32px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    h2 { font-size: 16px; margin: 28px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #e2e8f0;
         color: #1a202c; }
    h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #718096;
         margin: 20px 0 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
    th { padding: 6px 10px; background: #f7fafc; color: #718096; text-align: left;
         font-weight: 600; border-bottom: 2px solid #e2e8f0; }
    td { padding: 6px 10px; border-bottom: 1px solid #f0f4f8; }
    .kv td:first-child { color: #718096; width: 200px; }
    .device-block { margin: 24px 0; padding: 16px 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
    .stat-card { padding: 12px; background: #f7fafc; border-radius: 6px; text-align: center; }
    .stat-num { font-size: 22px; font-weight: 700; color: #2d3748; }
    .stat-label { font-size: 11px; color: #718096; margin-top: 2px; }
    @media print { body { padding: 0; } @page { size: A4; margin: 20mm; } }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
    <div>
      <h1>DD Monitor — Weekly Fleet Report</h1>
      <div style="color:#718096;">Week ending: ${escHtml(weekStr)}</div>
    </div>
    <div style="color:#718096;font-size:12px;text-align:right;">Generated: ${new Date().toUTCString()}</div>
  </div>

  <h2>Fleet Summary</h2>
  <div class="summary-grid">
    <div class="stat-card"><div class="stat-num">${totalDevices}</div><div class="stat-label">Total Devices</div></div>
    <div class="stat-card"><div class="stat-num">${reporting}</div><div class="stat-label">Reporting</div></div>
    <div class="stat-card"><div class="stat-num" style="color:${statusColour};">${critCount}</div><div class="stat-label">Critical</div></div>
    <div class="stat-card"><div class="stat-num">${totalAlerts}</div><div class="stat-label">Active Alerts</div></div>
  </div>
  <table>
    <thead><tr><th>Device</th><th>Status</th><th>Last Report</th><th>Used %</th><th>Active Alerts</th></tr></thead>
    <tbody>
      ${deviceReports.map(({ device, report }) => {
        const sc = device.lastStatus === DeviceStatus.Critical ? '#e53e3e'
                 : device.lastStatus === DeviceStatus.Warning  ? '#dd6b20'
                 : '#38a169';
        const pct = report?.storage.usedPercent.value.toFixed(1) ?? '—';
        const lastDate = device.lastReportDate?.toISOString().substring(0, 10) ?? '—';
        return `<tr>
          <td style="font-weight:600;">${escHtml(device.hostname)}</td>
          <td style="color:${sc};font-weight:600;">${device.lastStatus}</td>
          <td>${escHtml(lastDate)}</td>
          <td>${pct}${pct !== '—' ? '%' : ''}</td>
          <td>${device.lastActiveAlerts}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>

  <h2>Per-Device Detail</h2>
  ${devicSections}

  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;color:#a0aec0;font-size:11px;">
    Generated by DD Monitor (NOVIX Systems) &nbsp;·&nbsp; ${new Date().toUTCString()}
  </div>
</body>
</html>`;
}

function buildDeviceSection(device: Device, report: Report | null): string {
  if (report === null) {
    return `<div class="device-block">
      <h3>${escHtml(device.hostname)}</h3>
      <p style="color:#a0aec0;">No report available.</p>
    </div>`;
  }

  const sc = device.lastStatus === DeviceStatus.Critical ? '#e53e3e'
           : device.lastStatus === DeviceStatus.Warning  ? '#dd6b20'
           : '#38a169';
  const usedPct = report.storage.usedPercent.value;

  return `<div class="device-block">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <h3 style="margin:0;">${escHtml(device.hostname)}</h3>
      <span style="color:${sc};font-weight:700;font-size:12px;">${device.lastStatus.toUpperCase()}</span>
    </div>
    <table class="kv" style="margin-top:10px;">
      <tr><td>Report Date</td><td>${escHtml(report.reportDate.toISOString().substring(0, 10))}</td></tr>
      <tr><td>Storage Used</td><td>${report.storage.usedGib.toHumanString()} / ${report.storage.totalGib.toHumanString()} (${usedPct.toFixed(1)}%)</td></tr>
      <tr><td>Cleanable</td><td>${report.storage.cleanableGib?.toHumanString() ?? '—'}</td></tr>
      <tr><td>Compression (Current)</td><td>${report.compression.currentlyUsed.totalFactor?.value.toFixed(2) ?? '—'}×</td></tr>
      <tr><td>Failed Disks</td><td style="color:${report.disks.failedDisks > 0 ? '#e53e3e' : 'inherit'};">${report.disks.failedDisks}</td></tr>
      <tr><td>Active Alerts</td><td>${report.activeTotalAlerts} (${report.activeCriticalAlerts} critical)</td></tr>
    </table>
  </div>`;
}

// ---------------------------------------------------------------------------
// Template helpers
// ---------------------------------------------------------------------------

function fmt(v: number | null, suffix = ''): string {
  return v !== null ? `${v.toFixed(2)}${suffix}` : '—';
}

function fmtMib(v: number | null): string {
  if (v === null) return '—';
  if (v >= 1024) return `${(v / 1024).toFixed(1)} GiB`;
  return `${v} MiB`;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
