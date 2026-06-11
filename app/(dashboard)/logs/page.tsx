'use client';

/**
 * Logs page — /logs
 *
 * Paginated, filterable system event log with expandable detail rows.
 */

import { useEffect, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { fetchLogs, fetchDevices } from '@/lib/frontend/api';
import { formatRelative } from '@/lib/frontend/format';
import type { SystemLogDTO, DeviceDTO } from '@/lib/frontend/api';

const EVENT_TYPES = ['all', 'ingestion', 'parse', 'alert_evaluation', 'alert_sent', 'cleanup', 'auth', 'export'] as const;
const SEVERITIES  = ['all', 'INFO', 'WARNING', 'ERROR'] as const;

export default function LogsPage() {
  const [logs, setLogs]       = useState<SystemLogDTO[]>([]);
  const [devices, setDevices] = useState<DeviceDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset]   = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [eventType, setEventType] = useState<string>('all');
  const [severity,  setSeverity]  = useState<string>('all');
  const [deviceId,  setDeviceId]  = useState<string>('all');

  const LIMIT = 50;

  async function load(reset = false) {
    const newOffset = reset ? 0 : offset;
    setLoading(true);
    const logParams: { eventType?: string; severity?: string; deviceId?: string; limit: number; offset: number } = {
      limit: LIMIT, offset: newOffset,
    };
    if (eventType !== 'all') logParams.eventType = eventType;
    if (severity  !== 'all') logParams.severity  = severity;
    if (deviceId  !== 'all') logParams.deviceId  = deviceId;
    const res = await fetchLogs(logParams);
    if (res.success) {
      setLogs(prev => reset ? res.data : [...prev, ...res.data]);
      setHasMore(res.meta?.hasMore ?? false);
      if (!reset) setOffset(newOffset + LIMIT);
    }
    setLoading(false);
  }

  useEffect(() => {
    async function init() {
      const devRes = await fetchDevices();
      if (devRes.success) setDevices(devRes.data);
    }
    void init();
  }, []);

  useEffect(() => {
    setOffset(0);
    setLogs([]);
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType, severity, deviceId]);

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function severityVariant(sev: string): 'cr' | 'wa' | 'in' {
    return sev === 'ERROR' ? 'cr' : sev === 'WARNING' ? 'wa' : 'in';
  }

  function eventVariant(et: string): 'ac' | 'gr' | 'ok' | 'in' | 'cr' {
    switch (et) {
      case 'ingestion':        return 'ok';
      case 'alert_evaluation':
      case 'alert_sent':       return 'cr';
      case 'auth':             return 'ac';
      default:                 return 'gr';
    }
  }

  return (
    <>
      <div className="page-hd">
        <div className="page-hd-left">
          <h1 className="page-title">Logs</h1>
          <div className="page-sub">System event log · {logs.length} entries loaded</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <select
          className="filter-select"
          value={eventType}
          onChange={e => setEventType(e.target.value)}
        >
          {EVENT_TYPES.map(t => (
            <option key={t} value={t}>
              {t === 'all' ? 'All Events' : t}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={severity}
          onChange={e => setSeverity(e.target.value)}
        >
          {SEVERITIES.map(s => (
            <option key={s} value={s}>
              {s === 'all' ? 'All Severity' : s}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={deviceId}
          onChange={e => setDeviceId(e.target.value)}
        >
          <option value="all">All Devices</option>
          {devices.map(d => (
            <option key={d.id} value={d.id}>{d.shortName}</option>
          ))}
        </select>
      </div>

      <Panel noPadding>
        {loading && logs.length === 0 ? (
          <EmptyState loading />
        ) : logs.length > 0 ? (
          <>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Severity</th>
                  <th>Event</th>
                  <th>Device</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const dev = devices.find(d => d.id === log.deviceId);
                  const isExp = expanded.has(log.id);
                  return (
                    <>
                      <tr
                        key={log.id}
                        style={{ cursor: log.details ? 'pointer' : 'default' }}
                        onClick={() => log.details && toggleExpand(log.id)}
                      >
                        <td className="mono" style={{ fontSize: 10.5, whiteSpace: 'nowrap' }}>
                          {formatRelative(log.createdAt)}
                        </td>
                        <td>
                          <Badge variant={severityVariant(log.severity)}>
                            {log.severity}
                          </Badge>
                        </td>
                        <td>
                          <Badge variant={eventVariant(log.eventType)}>
                            {log.eventType}
                          </Badge>
                        </td>
                        <td className="mono" style={{ fontSize: 11 }}>
                          {dev?.shortName ?? (log.deviceId ? '…' : '—')}
                        </td>
                        <td style={{ fontSize: 11.5, maxWidth: 400 }}>
                          {log.message}
                        </td>
                      </tr>
                      {isExp && log.details && (
                        <tr key={`${log.id}-detail`}>
                          <td colSpan={5} style={{ background: 'var(--bg3)', padding: '10px 14px' }}>
                            <pre style={{
                              margin: 0,
                              fontSize: 10.5,
                              fontFamily: 'var(--font-geist-mono)',
                              color: 'var(--sub)',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-all',
                            }}>
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
            {hasMore && (
              <button
                className="load-more-btn"
                onClick={() => void load(false)}
                disabled={loading}
              >
                {loading ? 'Loading…' : 'Load more'}
              </button>
            )}
          </>
        ) : (
          <EmptyState title="No logs" message="No events match the current filters" />
        )}
      </Panel>
    </>
  );
}
