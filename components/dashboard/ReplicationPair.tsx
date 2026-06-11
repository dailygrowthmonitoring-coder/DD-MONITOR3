/**
 * ReplicationPair — .rep-c card showing source→dest replication status.
 */

import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { DeviceDTO } from '@/lib/frontend/api';

interface ReplicationPairProps {
  readonly source: DeviceDTO;
  /** Destination hostname from parsed data, if available. */
  readonly destHostname?: string;
  readonly status: string | null;
}

/** Renders a .rep-c replication pair card. */
export function ReplicationPair({ source, destHostname, status }: ReplicationPairProps) {
  const isRunning = status?.toLowerCase() === 'running';
  const badgeVariant = isRunning ? 'ok' as const : 'wa' as const;
  const label        = isRunning ? 'Running' : (status ?? 'Unknown');

  return (
    <div className="rep-c">
      <div className="rep-c-head">
        <div className="rep-c-hosts">
          <span>{source.shortName}</span>
          <span className="rep-c-arrow">→</span>
          <span style={{ color: 'var(--muted)' }}>
            {destHostname ?? 'remote'}
          </span>
        </div>
        <Badge variant={badgeVariant}>{label}</Badge>
      </div>
      <ProgressBar value={isRunning ? 100 : 50} variant={isRunning ? 'ok' : 'wa'} />
      <div className="rep-c-stats">
        <div>
          <div className="rep-c-stat-label">Source</div>
          <div className="rep-c-stat-val" style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11 }}>
            {source.hostname}
          </div>
        </div>
        <div>
          <div className="rep-c-stat-label">Throughput</div>
          <div className="rep-c-stat-val">—</div>
        </div>
        <div>
          <div className="rep-c-stat-label">Lag</div>
          <div className="rep-c-stat-val">—</div>
        </div>
      </div>
    </div>
  );
}
