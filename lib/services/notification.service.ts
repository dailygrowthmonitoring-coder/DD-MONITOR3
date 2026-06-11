/**
 * NotificationService — email dispatch and de-duplication.
 *
 * Sends alert notification emails via the Brevo transactional email API
 * (https://api.brevo.com/v3/smtp/email). De-duplicates against the
 * email_notifications table using the has_email_been_sent_today() SQL function
 * so that re-ingesting the same report never sends a duplicate email.
 *
 * When BREVO_API_KEY or BREVO_SENDER_EMAIL is not configured, email sending
 * is skipped and the attempt is recorded in email_notifications with
 * status = 'failed' and an explanatory error message. The ingestion pipeline
 * continues normally — email is best-effort, not a hard requirement.
 *
 * Email types handled here:
 *   AlertNotification — fired when AlertEngine evaluates CRITICAL/WARNING alerts.
 *   ParseError        — fired when the parser returns critical section failures.
 *
 * Other email types (MissingReport, WeeklyReport) are sent by scheduled jobs
 * and are not part of the ingest pipeline.
 */

import {
  type Device,
  type Report,
  type CreateAlert,
  EmailType,
  AlertSeverity,
  EventType,
  LogSeverity,
} from '@/lib/domain';
import {
  createServiceClient,
  EmailNotificationRepository,
  LogRepository,
} from '@/lib/repositories';
import { ok, type AsyncResult } from '@/lib/infrastructure/errors/result';
import { logger } from '@/lib/infrastructure/logger/logger';
import { config } from '@/lib/infrastructure/config/config';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sends an alert notification email for a device that has CRITICAL or WARNING
 * alerts, subject to de-duplication (one per device per day).
 *
 * @param device        - The device the alert concerns.
 * @param report        - The report that triggered the alerts.
 * @param activeAlerts  - Active alerts to include in the email body.
 * @returns Ok(true) if the email was sent, Ok(false) if skipped (already sent today).
 */
export async function sendAlertNotification(
  device: Device,
  report: Report,
  activeAlerts: readonly CreateAlert[],
): AsyncResult<boolean> {
  const db = createServiceClient();
  const notifRepo = new EmailNotificationRepository(db);
  const logRepo   = new LogRepository(db);
  const reportDate = report.reportDate.toISOString().substring(0, 10);

  // De-duplication guard
  const dedupeResult = await notifRepo.hasBeenSentToday(
    EmailType.ReportReceived,
    device.id,
    reportDate,
  );
  if (dedupeResult.ok && dedupeResult.value) {
    logger.debug('Alert notification already sent today — skipping', {
      deviceHostname: device.hostname,
      reportDate,
    });
    return ok(false);
  }

  const criticalAlerts = activeAlerts.filter(a => a.severity === AlertSeverity.Critical && a.isActive);
  const warningAlerts  = activeAlerts.filter(a => a.severity === AlertSeverity.Warning  && a.isActive);
  const worstSeverity  = criticalAlerts.length > 0 ? 'CRITICAL' : 'WARNING';

  const subject = `DD Monitor Alert — ${device.shortName}: ${activeAlerts.filter(a => a.isActive).length} active alert(s) [${worstSeverity}]`;
  const htmlContent = buildAlertEmailHtml(device, report, activeAlerts);
  const recipients = [config.ALERT_EMAIL];

  const { status, errorMessage } = await dispatchEmail(subject, htmlContent, recipients);

  const bodyPreview = htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').substring(0, 500);

  await notifRepo.create({
    emailType:    EmailType.ReportReceived,
    deviceId:     device.id,
    reportDate:   report.reportDate,
    recipients,
    subject,
    bodyPreview,
    status,
    errorMessage: errorMessage ?? null,
  });

  await logRepo.create({
    eventType:    EventType.AlertSent,
    severity:     status === 'sent' ? LogSeverity.Info : LogSeverity.Warning,
    deviceId:     device.id,
    message:      status === 'sent'
      ? `Alert email sent to ${recipients.join(', ')} for ${device.hostname}`
      : `Alert email failed for ${device.hostname}: ${errorMessage ?? 'unknown error'}`,
    details: {
      emailType: EmailType.ReportReceived,
      recipients,
      reportDate,
      criticalCount: criticalAlerts.length,
      warningCount:  warningAlerts.length,
      status,
    },
    correlationId: null,
  });

  logger.info(`Alert email ${status}`, {
    deviceHostname: device.hostname,
    reportDate,
    status,
  });

  return ok(status === 'sent');
}

/**
 * Sends a parse-error notification email when the parser encounters critical failures.
 *
 * @param hostname   - Hostname extracted from the file (may be partial on parse failure).
 * @param fileName   - Original attachment filename.
 * @param parseErrors - List of error strings from ParseResult.parse_errors.
 */
export async function sendParseErrorNotification(
  hostname: string,
  fileName: string,
  parseErrors: readonly string[],
): AsyncResult<void> {
  const subject = `DD Monitor Parse Error — ${hostname}: ${parseErrors.length} error(s)`;
  const htmlContent = buildParseErrorEmailHtml(hostname, fileName, parseErrors);
  const recipients = [config.ALERT_EMAIL];

  const { status, errorMessage } = await dispatchEmail(subject, htmlContent, recipients);

  const db = createServiceClient();
  const notifRepo = new EmailNotificationRepository(db);
  const logRepo   = new LogRepository(db);
  const bodyPreview = htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').substring(0, 500);

  await notifRepo.create({
    emailType:    EmailType.ParseError,
    deviceId:     null,
    reportDate:   null,
    recipients,
    subject,
    bodyPreview,
    status,
    errorMessage: errorMessage ?? null,
  });

  await logRepo.create({
    eventType:    EventType.AlertSent,
    severity:     status === 'sent' ? LogSeverity.Info : LogSeverity.Warning,
    deviceId:     null,
    message:      status === 'sent'
      ? `Parse-error email sent for ${hostname}`
      : `Parse-error email failed for ${hostname}: ${errorMessage ?? 'unknown error'}`,
    details: { hostname, fileName, parseErrorCount: parseErrors.length, status },
    correlationId: null,
  });

  return ok(undefined);
}

// ---------------------------------------------------------------------------
// Brevo API dispatch
// ---------------------------------------------------------------------------

interface DispatchResult {
  readonly status: 'sent' | 'failed';
  readonly errorMessage: string | undefined;
}

/**
 * Sends one email via the Brevo transactional email REST API.
 *
 * Returns { status: 'failed', errorMessage: '...' } (never throws) when the
 * API key is not configured or the API call fails — so the caller can always
 * record the attempt and continue.
 */
async function dispatchEmail(
  subject: string,
  htmlContent: string,
  recipients: readonly string[],
): Promise<DispatchResult> {
  const apiKey      = config.BREVO_API_KEY.trim();
  const senderEmail = config.BREVO_SENDER_EMAIL.trim();
  const senderName  = config.BREVO_SENDER_NAME.trim();

  if (apiKey === '' || senderEmail === '') {
    logger.warn('Email not sent: BREVO_API_KEY or BREVO_SENDER_EMAIL is not configured');
    return { status: 'failed', errorMessage: 'Email provider not configured' };
  }

  const body = JSON.stringify({
    sender:      { name: senderName, email: senderEmail },
    to:          recipients.map(email => ({ email })),
    subject,
    htmlContent,
  });

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method:  'POST',
      headers: {
        'accept':       'application/json',
        'content-type': 'application/json',
        'api-key':      apiKey,
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'no response body');
      return {
        status:       'failed',
        errorMessage: `Brevo API ${response.status}: ${text.substring(0, 200)}`,
      };
    }

    return { status: 'sent', errorMessage: undefined };
  } catch (caught: unknown) {
    const message = caught instanceof Error ? caught.message : String(caught);
    return { status: 'failed', errorMessage: `Network error: ${message}` };
  }
}

// ---------------------------------------------------------------------------
// Email HTML templates
// ---------------------------------------------------------------------------

function buildAlertEmailHtml(
  device: Device,
  report: Report,
  activeAlerts: readonly CreateAlert[],
): string {
  const reportDate = report.reportDate.toISOString().substring(0, 10);
  const filteredActive = activeAlerts.filter(a => a.isActive);
  const critical = filteredActive.filter(a => a.severity === AlertSeverity.Critical);
  const warning  = filteredActive.filter(a => a.severity === AlertSeverity.Warning);
  const info     = filteredActive.filter(a => a.severity === AlertSeverity.Info);

  const alertRows = filteredActive.map(a => {
    const colour = a.severity === AlertSeverity.Critical ? '#e53e3e'
                 : a.severity === AlertSeverity.Warning  ? '#dd6b20'
                 : '#2b6cb0';
    const source = a.source === 'appliance' ? 'Appliance' : 'Rule Engine';
    return `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;color:${colour};font-weight:600;">${a.severity}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;">${escHtml(a.message)}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;color:#718096;">${source}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f7fafc;margin:0;padding:24px;">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.12);overflow:hidden;">
    <div style="background:#1a202c;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:18px;font-weight:600;">DD Monitor Alert</h1>
      <p style="color:#a0aec0;margin:4px 0 0;">Automated alert from your Data Domain fleet</p>
    </div>
    <div style="padding:24px 32px;">
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:6px 0;color:#718096;width:140px;">Device</td>
          <td style="padding:6px 0;font-weight:600;">${escHtml(device.hostname)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#718096;">Report Date</td>
          <td style="padding:6px 0;">${reportDate}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#718096;">Storage Used</td>
          <td style="padding:6px 0;">${report.storage.usedPercent.value.toFixed(1)}% of ${report.storage.totalGib.toHumanString()}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#718096;">Alerts</td>
          <td style="padding:6px 0;">
            <span style="color:#e53e3e;font-weight:600;">${critical.length} Critical</span> &nbsp;·&nbsp;
            <span style="color:#dd6b20;font-weight:600;">${warning.length} Warning</span> &nbsp;·&nbsp;
            <span style="color:#2b6cb0;">${info.length} Info</span>
          </td>
        </tr>
      </table>

      <h2 style="font-size:14px;font-weight:600;color:#2d3748;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.05em;">Active Alerts</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f7fafc;">
            <th style="padding:8px 12px;text-align:left;color:#718096;font-weight:600;border-bottom:2px solid #e2e8f0;">Severity</th>
            <th style="padding:8px 12px;text-align:left;color:#718096;font-weight:600;border-bottom:2px solid #e2e8f0;">Message</th>
            <th style="padding:8px 12px;text-align:left;color:#718096;font-weight:600;border-bottom:2px solid #e2e8f0;">Source</th>
          </tr>
        </thead>
        <tbody>${alertRows}</tbody>
      </table>
    </div>
    <div style="background:#f7fafc;padding:16px 32px;font-size:12px;color:#a0aec0;border-top:1px solid #e2e8f0;">
      This email was generated automatically by DD Monitor. Do not reply.
    </div>
  </div>
</body>
</html>`;
}

function buildParseErrorEmailHtml(
  hostname: string,
  fileName: string,
  parseErrors: readonly string[],
): string {
  const errorList = parseErrors
    .map(e => `<li style="padding:4px 0;color:#c53030;">${escHtml(e)}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f7fafc;margin:0;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.12);overflow:hidden;">
    <div style="background:#742a2a;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:18px;font-weight:600;">DD Monitor Parse Error</h1>
    </div>
    <div style="padding:24px 32px;">
      <p>The autosupport file for <strong>${escHtml(hostname)}</strong> could not be fully parsed.</p>
      <p style="color:#718096;font-size:13px;">File: ${escHtml(fileName)}</p>
      <h2 style="font-size:14px;font-weight:600;color:#2d3748;margin:16px 0 8px;">Parse Errors (${parseErrors.length})</h2>
      <ul style="margin:0;padding-left:20px;font-size:13px;">${errorList}</ul>
    </div>
    <div style="background:#f7fafc;padding:16px 32px;font-size:12px;color:#a0aec0;border-top:1px solid #e2e8f0;">
      This email was generated automatically by DD Monitor.
    </div>
  </div>
</body>
</html>`;
}

/** Escapes HTML special characters to prevent XSS in email templates. */
function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
