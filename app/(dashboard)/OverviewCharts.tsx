'use client';

/**
 * OverviewCharts — client wrapper for the two chart panels on the Overview page.
 * Must be "use client" because Recharts requires a browser DOM.
 */

import { Panel } from '@/components/ui/Panel';
import { EmptyState } from '@/components/ui/EmptyState';
import { UtilizationChart } from '@/components/charts/UtilizationChart';
import { BackupRateChart } from '@/components/charts/BackupRateChart';
import type { FleetStorageTrendRowDTO, FleetDailySummaryRowDTO } from '@/lib/frontend/api';

interface OverviewChartsProps {
  readonly trendRows:   FleetStorageTrendRowDTO[];
  readonly summaryRows: FleetDailySummaryRowDTO[];
}

/** Renders the two chart panels for the Overview page. */
export function OverviewCharts({ trendRows, summaryRows }: OverviewChartsProps) {
  return (
    <div className="cols-2">
      <Panel title="Storage Utilization" meta="30 days · %" noPadding>
        <div style={{ padding: '12px 14px' }}>
          {trendRows.length > 0
            ? <UtilizationChart rows={trendRows} />
            : <EmptyState title="No trend data" />}
        </div>
      </Panel>
      <Panel title="Daily Device Health" meta="14 days" noPadding>
        <div style={{ padding: '12px 14px' }}>
          {summaryRows.length > 0
            ? <BackupRateChart rows={summaryRows} />
            : <EmptyState title="No summary data" />}
        </div>
      </Panel>
    </div>
  );
}
