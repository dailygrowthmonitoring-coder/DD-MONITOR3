'use client';

/**
 * Reports page — /reports
 *
 * Most-recent report per device with view and download actions.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Eye, Download } from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { fetchDevices, fetchDeviceReports, exportReport } from '@/lib/frontend/api';
import { formatRelative, todayIso } from '@/lib/frontend/format';
import type { DeviceDTO, ReportDTO } from '@/lib/frontend/api';

interface DeviceReport {
  readonly device: DeviceDTO;
  readonly report: ReportDTO;
}

export default function ReportsPage() {
  const [items, setItems]     = useState<DeviceReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const devRes = await fetchDevices();
      if (!devRes.success) { setLoading(false); return; }

      const pairs: DeviceReport[] = [];
      for (const device of devRes.data) {
        const rptRes = await fetchDeviceReports(device.id, 1);
        if (rptRes.success && rptRes.data.length > 0) {
          const r = rptRes.data[0];
          if (r) pairs.push({ device, report: r });
        }
      }
      setItems(pairs);
      setLoading(false);
    }
    void load();
  }, []);

  const today        = todayIso();
  const todayCount   = items.filter(i => i.report.reportDate.substring(0, 10) === today).length;

  async function handleDownload(device: DeviceDTO, report: ReportDTO) {
    const result = await exportReport(device.id, report.reportDate);
    if (!result.ok) { alert(`Export failed: ${result.message}`); return; }
    const a = document.createElement('a');
    a.href     = result.blobUrl;
    a.download = result.fileName;
    a.click();
    URL.revokeObjectURL(result.blobUrl);
  }

  return (
    <>
      <div className="page-hd">
        <div className="page-hd-left">
          <h1 className="page-title">Reports</h1>
          <div className="page-sub">Most recent report per device</div>
        </div>
        <div className="page-hd-actions">
          <Badge variant={todayCount > 0 ? 'ok' : 'wa'}>
            {todayCount} TODAY
          </Badge>
        </div>
      </div>

      <Panel noPadding>
        {loading ? (
          <EmptyState loading />
        ) : items.length > 0 ? (
          items.map(({ device, report }) => (
            <div key={device.id} className="rpt">
              <div className="rpt-icon">
                <FileText size={16} />
              </div>
              <div className="rpt-body">
                <div className="rpt-name">
                  {report.fileName ?? `${device.hostname}-${report.reportDate}.txt`}
                </div>
                <div className="rpt-meta">
                  <span>{device.shortName}</span>
                  <span>{report.reportDate.substring(0, 10)}</span>
                  <span>{report.ingested_at ? formatRelative(report.ingested_at) : '—'}</span>
                  {report.parseErrors && report.parseErrors.length > 0 && (
                    <span style={{ color: 'var(--amber)' }}>
                      {report.parseErrors.length} parse error{report.parseErrors.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              <Badge variant={report.isValid ? 'ok' : 'wa'}>
                {report.isValid ? 'OK' : 'PARSE ERR'}
              </Badge>
              <div className="rpt-actions">
                <Link href={`/devices/${device.id}`}>
                  <Button variant="ghost" size="sm">
                    <Eye size={13} /> View
                  </Button>
                </Link>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => void handleDownload(device, report)}
                >
                  <Download size={13} /> Export
                </Button>
              </div>
            </div>
          ))
        ) : (
          <EmptyState title="No reports" message="No reports have been ingested yet" />
        )}
      </Panel>
    </>
  );
}
