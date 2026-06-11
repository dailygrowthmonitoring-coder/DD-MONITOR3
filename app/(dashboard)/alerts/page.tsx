'use client';

/**
 * Alerts page — /alerts
 *
 * Timeline of alerts + severity summary + alert rules panel.
 */

import { useState, useEffect } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';
import { StatRow } from '@/components/ui/StatRow';
import { TimelineItem } from '@/components/dashboard/TimelineItem';
import { AlertTrendChart } from '@/components/charts/AlertTrendChart';
import { fetchAlerts, fetchAlertRules, fetchAlertTrend } from '@/lib/frontend/api';
import type { AlertDTO, AlertRuleDTO, AlertTrendRowDTO } from '@/lib/frontend/api';

export default function AlertsPage() {
  const [alerts, setAlerts]       = useState<AlertDTO[]>([]);
  const [rules, setRules]         = useState<AlertRuleDTO[]>([]);
  const [trendRows, setTrendRows] = useState<AlertTrendRowDTO[]>([]);
  const [loading, setLoading]     = useState(true);
  const [offset, setOffset]       = useState(0);
  const [hasMore, setHasMore]     = useState(false);
  const LIMIT = 50;

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [alertsRes, rulesRes, trendRes] = await Promise.all([
        fetchAlerts({ limit: LIMIT, offset: 0 }),
        fetchAlertRules(),
        fetchAlertTrend(14),
      ]);
      if (alertsRes.success) {
        setAlerts(alertsRes.data);
        setHasMore(alertsRes.meta?.hasMore ?? false);
      }
      if (rulesRes.success) setRules(rulesRes.data);
      if (trendRes.success) setTrendRows(trendRes.data);
      setLoading(false);
    }
    void load();
  }, []);

  async function loadMore() {
    const newOffset = offset + LIMIT;
    const res = await fetchAlerts({ limit: LIMIT, offset: newOffset });
    if (res.success) {
      setAlerts(prev => [...prev, ...res.data]);
      setHasMore(res.meta?.hasMore ?? false);
      setOffset(newOffset);
    }
  }

  const critCount = alerts.filter(a => a.severity === 'CRITICAL' && a.isActive).length;
  const warnCount = alerts.filter(a => a.severity === 'WARNING'  && a.isActive).length;
  const infoCount = alerts.filter(a => a.severity === 'INFO'     && a.isActive).length;
  const activeCount = critCount + warnCount + infoCount;

  return (
    <>
      <div className="page-hd">
        <div className="page-hd-left">
          <h1 className="page-title">Alerts</h1>
          <div className="page-sub">
            {activeCount} active · {critCount} critical
          </div>
        </div>
        <div className="page-hd-actions">
          <Button variant="default">Mark all read</Button>
        </div>
      </div>

      <div className="cols-2-wide">
        {/* Left — timeline */}
        <Panel title="Event Log" meta={`${alerts.length} events`} noPadding>
          {loading ? (
            <EmptyState loading />
          ) : alerts.length > 0 ? (
            <>
              <div style={{ padding: '0 14px' }} className="tl">
                {alerts.map((a, i) => (
                  <TimelineItem key={a.id} alert={a} isLast={i === alerts.length - 1} />
                ))}
              </div>
              {hasMore && (
                <button className="load-more-btn" onClick={() => void loadMore()}>
                  Load more
                </button>
              )}
            </>
          ) : (
            <EmptyState title="No alerts" message="No alerts match the current filters" />
          )}
        </Panel>

        {/* Right — severity + rules */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Severity summary */}
          <Panel title="Severity Summary" noPadding>
            <div style={{ padding: 14 }}>
              <div className="cols-3">
                <div className="stat">
                  <div className="stat-label">Critical</div>
                  <div className="stat-value text-cr">{critCount}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Warning</div>
                  <div className="stat-value text-wa">{warnCount}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Info</div>
                  <div className="stat-value text-blue">{infoCount}</div>
                </div>
              </div>
            </div>
          </Panel>

          {/* Alert trend chart */}
          <Panel title="Alert Trend" meta="14 days" noPadding>
            <div style={{ padding: '12px 14px' }}>
              {trendRows.length > 0
                ? <AlertTrendChart rows={trendRows} />
                : <EmptyState title="No trend data" />}
            </div>
          </Panel>

          {/* Alert rules */}
          <Panel
            title="Alert Rules"
            actions={
              <a href="/settings" style={{ textDecoration: 'none' }}>
                <Button variant="ghost" size="sm">edit →</Button>
              </a>
            }
            noPadding
          >
            <table className="tbl">
              <thead>
                <tr>
                  <th>Rule</th>
                  <th>Threshold</th>
                  <th>Severity</th>
                  <th>Enabled</th>
                </tr>
              </thead>
              <tbody>
                {rules.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontSize: 11.5 }}>{r.description}</td>
                    <td className="mono">{r.operator} {r.threshold}</td>
                    <td>
                      <Badge variant={
                        r.severity === 'CRITICAL' ? 'cr' :
                        r.severity === 'WARNING'  ? 'wa' : 'in'
                      }>
                        {r.severity}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={r.isEnabled ? 'ok' : 'gr'}>
                        {r.isEnabled ? 'ON' : 'OFF'}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {rules.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                      No rules defined
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Panel>
        </div>
      </div>
    </>
  );
}
