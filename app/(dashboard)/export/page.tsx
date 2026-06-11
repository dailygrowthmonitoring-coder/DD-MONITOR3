'use client';

/**
 * Export page — /export
 *
 * Device + date selector with HTML report download.
 */

import { useEffect, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { fetchDevices, exportReport } from '@/lib/frontend/api';
import { todayIso, formatGib, formatPercent } from '@/lib/frontend/format';
import type { DeviceDTO } from '@/lib/frontend/api';

export default function ExportPage() {
  const [devices, setDevices]   = useState<DeviceDTO[]>([]);
  const [deviceId, setDeviceId] = useState<string>('');
  const [date, setDate]         = useState(todayIso());
  const [loading, setLoading]   = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetchDevices();
      if (res.success && res.data.length > 0) {
        setDevices(res.data);
        setDeviceId(res.data[0]?.id ?? '');
      }
      setLoading(false);
    }
    void load();
  }, []);

  const selectedDevice = devices.find(d => d.id === deviceId);

  async function handleExport() {
    if (!deviceId) return;
    setExporting(true);
    setError(null);
    const result = await exportReport(deviceId, date);
    if (!result.ok) {
      setError(result.message);
    } else {
      const a = document.createElement('a');
      a.href     = result.blobUrl;
      a.download = result.fileName;
      a.click();
      URL.revokeObjectURL(result.blobUrl);
    }
    setExporting(false);
  }

  return (
    <>
      <div className="page-hd">
        <div className="page-hd-left">
          <h1 className="page-title">Export</h1>
          <div className="page-sub">Generate and download device reports</div>
        </div>
      </div>

      <div className="cols-2">
        {/* Form */}
        <Panel title="Export Report" noPadding>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {loading ? (
              <EmptyState loading />
            ) : (
              <>
                {error && (
                  <div className="auth-error">{error}</div>
                )}

                <div className="field">
                  <label>Device</label>
                  <select
                    value={deviceId}
                    onChange={e => setDeviceId(e.target.value)}
                  >
                    {devices.map(d => (
                      <option key={d.id} value={d.id}>{d.hostname}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Report Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>Format</label>
                  <select disabled>
                    <option>HTML (browser print → PDF)</option>
                  </select>
                </div>

                <Button
                  variant="primary"
                  disabled={!deviceId || exporting}
                  onClick={() => void handleExport()}
                >
                  {exporting ? 'Generating…' : '↓ Download Report'}
                </Button>

                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  Reports are available within the 40-day retention window.
                  To save as PDF, use your browser&apos;s Print → Save as PDF.
                </div>
              </>
            )}
          </div>
        </Panel>

        {/* Preview */}
        <Panel title="Report Preview" noPadding>
          {selectedDevice ? (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="set-row" style={{ paddingTop: 0 }}>
                <div className="set-row-label">Device</div>
                <div className="set-row-val mono">{selectedDevice.hostname}</div>
              </div>
              <div className="set-row">
                <div className="set-row-label">Short Name</div>
                <div className="set-row-val mono">{selectedDevice.shortName}</div>
              </div>
              <div className="set-row">
                <div className="set-row-label">Location</div>
                <div className="set-row-val mono">{selectedDevice.location ?? '—'}</div>
              </div>
              <div className="set-row">
                <div className="set-row-label">Last Status</div>
                <div>
                  <Badge variant={
                    selectedDevice.lastStatus === 'healthy'  ? 'ok' :
                    selectedDevice.lastStatus === 'warning'  ? 'wa' :
                    selectedDevice.lastStatus === 'critical' ? 'cr' : 'gr'
                  }>
                    {selectedDevice.lastStatus.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div className="set-row">
                <div className="set-row-label">Report Date</div>
                <div className="set-row-val mono">{date}</div>
              </div>
              <div className="set-row">
                <div className="set-row-label">Last Util %</div>
                <div className="set-row-val mono">
                  {selectedDevice.lastUsedPercent !== null
                    ? formatPercent(selectedDevice.lastUsedPercent)
                    : '—'}
                </div>
              </div>
              <div className="set-row">
                <div className="set-row-label">Total Capacity</div>
                <div className="set-row-val mono">
                  {selectedDevice.totalCapacity !== null
                    ? formatGib(selectedDevice.totalCapacity)
                    : '—'}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState title="No device selected" />
          )}
        </Panel>
      </div>
    </>
  );
}
