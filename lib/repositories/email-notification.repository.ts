/**
 * EmailNotificationRepository — data access for email_notifications.
 *
 * Records every outbound email attempt. Used by NotificationService for
 * de-duplication (has this email type already been sent for this device+date?)
 * and by the System Health page email history panel.
 */

import type { EmailNotificationRow, EmailNotificationInsert } from '@/lib/supabase/types';
import {
  type EmailNotification,
  type CreateEmailNotification,
  EmailType,
} from '@/lib/domain';
import { ok, type AsyncResult } from '@/lib/infrastructure/errors/result';
import { type DDSupabaseClient, supabaseErr } from './base.repository';

// ---------------------------------------------------------------------------
// Repository class
// ---------------------------------------------------------------------------

export class EmailNotificationRepository {
  constructor(private readonly db: DDSupabaseClient) {}

  // ── Reads ──────────────────────────────────────────────────────────────────

  /**
   * Checks whether a notification of the given type was successfully sent for
   * this device and date (delegates to the has_email_been_sent_today() SQL function).
   *
   * @param emailType   - Email category.
   * @param deviceId    - Device UUID (null for system-wide notifications).
   * @param reportDate  - ISO date string, e.g. "2025-03-10".
   * @returns Ok(true) if sent, Ok(false) if not.
   */
  async hasBeenSentToday(
    emailType: EmailType,
    deviceId: string,
    reportDate: string,
  ): AsyncResult<boolean> {
    const { data, error } = await this.db.rpc('has_email_been_sent_today', {
      p_email_type:  emailType as string,
      p_device_id:   deviceId,
      p_report_date: reportDate,
    });

    if (error !== null) return supabaseErr(error);
    return ok(data === true);
  }

  /**
   * Returns recent email notification records, newest first.
   * Used by the System Health email history panel.
   *
   * @param limit  - Max rows (default 50).
   * @param offset - Row offset for pagination.
   */
  async findRecent(limit = 50, offset = 0): AsyncResult<EmailNotification[]> {
    const { data, error } = await this.db
      .from('email_notifications')
      .select('*')
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error !== null) return supabaseErr(error);
    return ok((data ?? []).map(r => this.rowToEntity(r)));
  }

  // ── Writes ─────────────────────────────────────────────────────────────────

  /**
   * Records an email send attempt.
   * Called by NotificationService regardless of success or failure.
   *
   * @param notification - Email notification data to insert.
   * @returns Ok(EmailNotification) with the inserted row.
   */
  async create(notification: CreateEmailNotification): AsyncResult<EmailNotification> {
    const insert: EmailNotificationInsert = {
      email_type:    notification.emailType as EmailNotificationInsert['email_type'],
      device_id:     notification.deviceId,
      report_date:   notification.reportDate?.toISOString().substring(0, 10) ?? null,
      recipients:    [...notification.recipients],
      subject:       notification.subject,
      body_preview:  notification.bodyPreview,
      status:        notification.status as EmailNotificationInsert['status'],
      error_message: notification.errorMessage,
    };

    const { data, error } = await this.db
      .from('email_notifications')
      .insert(insert)
      .select()
      .single();

    if (error !== null) return supabaseErr(error);
    return ok(this.rowToEntity(data));
  }

  // ── Row → Entity mapper ────────────────────────────────────────────────────

  private rowToEntity(row: EmailNotificationRow): EmailNotification {
    return {
      id:           row.id,
      emailType:    row.email_type as EmailType,
      deviceId:     row.device_id,
      reportDate:   row.report_date !== null ? new Date(row.report_date) : null,
      recipients:   row.recipients,
      subject:      row.subject,
      bodyPreview:  row.body_preview,
      status:       row.status,
      errorMessage: row.error_message,
      sentAt:       new Date(row.sent_at),
    };
  }
}
