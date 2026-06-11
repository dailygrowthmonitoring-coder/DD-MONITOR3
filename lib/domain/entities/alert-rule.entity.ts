/**
 * AlertRule entity — a configurable threshold evaluated by AlertEngine on every ingest.
 *
 * One AlertRule corresponds to one row in alert_rules. Rules are seeded at
 * migration time with PRD-default thresholds and may be updated by admins via
 * the Settings page (enable/disable, change threshold value).
 *
 * Example: rule_key="storage_critical", metric="storage_used_percent", operator=">", threshold=95
 * → when a report's storage_used_percent > 95, AlertEngine fires a CRITICAL alert.
 */

import { AlertSeverity } from '../enums/alert-severity.enum';

// ---------------------------------------------------------------------------
// Supporting types
// ---------------------------------------------------------------------------

/** Comparison operator used in the alert rule threshold expression. */
export type AlertRuleOperator = '>' | '>=' | '<' | '<=' | '=';

// ---------------------------------------------------------------------------
// Main entity
// ---------------------------------------------------------------------------

/** A configurable threshold rule evaluated by AlertEngine after every ingest. */
export interface AlertRule {
  /** Supabase-generated UUID, primary key in alert_rules. */
  readonly id: string;

  /**
   * Stable programmatic key, e.g. "storage_warning", "disk_failed".
   * Used by AlertEngine and the UI to identify a rule regardless of its id.
   */
  readonly ruleKey: string;

  /** Human-readable description shown in the Alerts rules table, e.g. "storage > 90%". */
  readonly description: string;

  /**
   * Column name in dd_reports to evaluate against the threshold.
   * e.g. "storage_used_percent", "disks_failed", "network_ports_down".
   */
  readonly metric: string;

  /** Comparison operator: >, >=, <, <=, =. */
  readonly operator: AlertRuleOperator;

  /**
   * Numeric threshold value.
   * e.g. 90 when metric = "storage_used_percent" and operator = ">".
   */
  readonly threshold: number;

  /** Severity of the alert produced when this rule fires. */
  readonly severity: AlertSeverity;

  /**
   * Whether this rule is active.
   * false = AlertEngine skips it; no alerts generated even if threshold exceeded.
   */
  readonly isEnabled: boolean;

  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Mutation type
// ---------------------------------------------------------------------------

/**
 * Fields that an authenticated admin may update on an existing AlertRule.
 * rule_key, metric, and operator are immutable after creation.
 */
export interface UpdateAlertRule {
  /** New threshold value. */
  readonly threshold?: number;
  /** Enable or disable the rule. */
  readonly isEnabled?: boolean;
  /** Change the alert severity. */
  readonly severity?: AlertSeverity;
}
