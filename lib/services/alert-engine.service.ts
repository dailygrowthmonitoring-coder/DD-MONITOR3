/**
 * AlertEngineService — pure, stateless alert rule evaluator.
 *
 * Evaluates a set of enabled alert rules against a report's metrics and the
 * appliance alerts extracted from the autosupport file. Returns the set of
 * rule-engine alerts (source = RuleEngine) and the derived DeviceStatus.
 *
 * This service has no I/O and no constructor dependencies — it is a pure
 * function wrapped in a class for consistency with other services. The caller
 * (IngestionService) is responsible for loading rules from the DB before calling
 * evaluate().
 *
 * Supported metrics (must match alert_rules.metric values in migration 001):
 *   storage_used_percent   — report.storage.usedPercent.value
 *   disks_failed           — report.disks.failedDisks
 *   network_ports_down     — report.networkPortsDown ?? 0
 *   active_alerts_critical — count of active CRITICAL appliance alerts
 *   active_alerts_warning  — count of active WARNING appliance alerts
 */

import {
  type CreateReport,
  type AlertRule,
  type CreateAlert,
  type AlertRuleOperator,
  AlertSeverity,
  AlertSource,
  DeviceStatus,
} from '@/lib/domain';
import type { AlertEvaluationResult } from './types';

// ---------------------------------------------------------------------------
// Service class
// ---------------------------------------------------------------------------

/** Pure, stateless alert rule evaluator. Instantiate once and reuse. */
export class AlertEngineService {
  /**
   * Evaluates all supplied rules against the report and appliance alerts.
   *
   * The returned engineAlerts have reportId = '' (placeholder). The caller
   * must replace this with the real report UUID after upserting the report.
   *
   * @param report          - CreateReport built from the parsed autosupport.
   * @param applianceAlerts - Alerts extracted directly from the autosupport file.
   * @param rules           - Enabled alert rules loaded from alert_rules.
   * @param deviceId        - Device UUID, populated into each created alert.
   * @param reportDate      - ISO date string, e.g. "2026-06-10".
   * @returns Evaluation result with engine alerts and derived device status.
   */
  evaluate(
    report: CreateReport,
    applianceAlerts: readonly CreateAlert[],
    rules: readonly AlertRule[],
    deviceId: string,
    reportDate: string,
  ): AlertEvaluationResult {
    const engineAlerts: CreateAlert[] = [];
    let rulesFired = 0;

    for (const rule of rules) {
      const metricValue = extractMetricValue(rule.metric, report, applianceAlerts);
      if (metricValue === null) continue;

      if (evaluateCondition(rule.operator, metricValue, rule.threshold)) {
        rulesFired += 1;
        engineAlerts.push({
          deviceId,
          reportId:   '',   // placeholder — caller fills in after report upsert
          reportDate: new Date(reportDate),
          alertId:    null,
          severity:   rule.severity,
          class:      null,
          object:     rule.metric,
          message:    `${rule.description} — measured: ${metricValue}, threshold: ${rule.operator} ${rule.threshold}`,
          postTime:   null,
          clearTime:  null,
          isActive:   true,
          source:     AlertSource.RuleEngine,
        });
      }
    }

    const activeApplianceAlerts = applianceAlerts.filter(a => a.isActive);
    const allActiveAlerts: readonly CreateAlert[] = [...activeApplianceAlerts, ...engineAlerts];
    const deviceStatus = deriveDeviceStatus(allActiveAlerts);

    const notificationRequired = engineAlerts.some(
      a => a.severity === AlertSeverity.Critical || a.severity === AlertSeverity.Warning,
    );

    return {
      deviceStatus,
      engineAlerts,
      rulesEvaluated: rules.length,
      rulesFired,
      notificationRequired,
    };
  }
}

// ---------------------------------------------------------------------------
// Metric extraction
// ---------------------------------------------------------------------------

/**
 * Maps a rule's metric string to a numeric value from the report or alert arrays.
 *
 * Returns null when the metric is unrecognized or the value is absent.
 * A null metric causes the rule to be skipped (never fires on unknown data).
 */
function extractMetricValue(
  metric: string,
  report: CreateReport,
  applianceAlerts: readonly CreateAlert[],
): number | null {
  switch (metric) {
    case 'storage_used_percent':
      return report.storage.usedPercent.value;

    case 'disks_failed':
      return report.disks.failedDisks;

    case 'network_ports_down':
      return report.networkPortsDown ?? 0;

    case 'active_alerts_critical':
      return applianceAlerts.filter(
        a => a.isActive && a.severity === AlertSeverity.Critical,
      ).length;

    case 'active_alerts_warning':
      return applianceAlerts.filter(
        a => a.isActive && a.severity === AlertSeverity.Warning,
      ).length;

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Threshold evaluation
// ---------------------------------------------------------------------------

/** Returns true when the measured value satisfies the rule's threshold condition. */
function evaluateCondition(operator: AlertRuleOperator, value: number, threshold: number): boolean {
  switch (operator) {
    case '>':  return value > threshold;
    case '>=': return value >= threshold;
    case '<':  return value < threshold;
    case '<=': return value <= threshold;
    case '=':  return value === threshold;
  }
}

// ---------------------------------------------------------------------------
// Device status derivation
// ---------------------------------------------------------------------------

/**
 * Derives the overall DeviceStatus from the set of active alerts.
 *
 * Priority order: Critical > Warning > Healthy.
 * An empty alert list yields Healthy.
 */
function deriveDeviceStatus(activeAlerts: readonly CreateAlert[]): DeviceStatus {
  if (activeAlerts.some(a => a.severity === AlertSeverity.Critical)) {
    return DeviceStatus.Critical;
  }
  if (activeAlerts.some(a => a.severity === AlertSeverity.Warning)) {
    return DeviceStatus.Warning;
  }
  return DeviceStatus.Healthy;
}
