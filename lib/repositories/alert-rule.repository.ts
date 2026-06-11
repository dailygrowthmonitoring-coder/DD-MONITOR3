/**
 * AlertRuleRepository — data access for alert_rules.
 *
 * Alert rules are seeded at migration time. Authenticated admins may update
 * thresholds and enable/disable rules via the Settings page. The rule set is
 * loaded by AlertEngine on every ingest.
 */

import type { AlertRuleRow, AlertRuleUpdate } from '@/lib/supabase/types';
import { type AlertRule, type UpdateAlertRule, AlertSeverity } from '@/lib/domain';
import { NotFoundError } from '@/lib/infrastructure/errors/app-error';
import { ok, err, type AsyncResult } from '@/lib/infrastructure/errors/result';
import { type DDSupabaseClient, supabaseErr } from './base.repository';

// ---------------------------------------------------------------------------
// Repository class
// ---------------------------------------------------------------------------

export class AlertRuleRepository {
  constructor(private readonly db: DDSupabaseClient) {}

  // ── Reads ──────────────────────────────────────────────────────────────────

  /**
   * Returns all enabled alert rules.
   * Called by AlertEngine at the start of every ingest to load the current ruleset.
   *
   * @returns Ok(AlertRule[]) — empty array if no enabled rules.
   */
  async findAllEnabled(): AsyncResult<AlertRule[]> {
    const { data, error } = await this.db
      .from('alert_rules')
      .select('*')
      .eq('is_enabled', true)
      .order('rule_key');

    if (error !== null) return supabaseErr(error);
    return ok((data ?? []).map(r => this.rowToEntity(r)));
  }

  /**
   * Returns all alert rules (enabled and disabled).
   * Used by the Settings page threshold editor.
   *
   * @returns Ok(AlertRule[]) — ordered by rule_key.
   */
  async findAll(): AsyncResult<AlertRule[]> {
    const { data, error } = await this.db
      .from('alert_rules')
      .select('*')
      .order('rule_key');

    if (error !== null) return supabaseErr(error);
    return ok((data ?? []).map(r => this.rowToEntity(r)));
  }

  // ── Writes ─────────────────────────────────────────────────────────────────

  /**
   * Applies a partial update to an alert rule (threshold, enabled flag, severity).
   * Immutable fields (rule_key, metric, operator) are never changed here.
   *
   * @param id   - Alert rule UUID.
   * @param data - Fields to update.
   * @returns Ok(AlertRule) with updated row, Err(NotFoundError) if absent.
   */
  async update(id: string, data: UpdateAlertRule): AsyncResult<AlertRule> {
    const patch: AlertRuleUpdate = {
      ...(data.threshold !== undefined ? { threshold: data.threshold }                                      : {}),
      ...(data.isEnabled !== undefined ? { is_enabled: data.isEnabled }                                     : {}),
      ...(data.severity  !== undefined ? { severity: data.severity as AlertRuleRow['severity'] }            : {}),
    };

    const { data: row, error } = await this.db
      .from('alert_rules')
      .update(patch)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error !== null) return supabaseErr(error);
    if (row === null)   return err(new NotFoundError('AlertRule', id));
    return ok(this.rowToEntity(row));
  }

  // ── Row → Entity mapper ────────────────────────────────────────────────────

  private rowToEntity(row: AlertRuleRow): AlertRule {
    return {
      id:          row.id,
      ruleKey:     row.rule_key,
      description: row.description,
      metric:      row.metric,
      operator:    row.operator,
      threshold:   row.threshold,
      severity:    row.severity as AlertSeverity,
      isEnabled:   row.is_enabled,
      createdAt:   new Date(row.created_at),
      updatedAt:   new Date(row.updated_at),
    };
  }
}
