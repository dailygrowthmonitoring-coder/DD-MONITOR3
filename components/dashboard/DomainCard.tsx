/**
 * DomainCard — .dc card for the Domains page grid.
 */

import { statusToClass, formatGib } from '@/lib/frontend/format';
import { StatusDot } from '@/components/ui/StatusDot';
import { Badge } from '@/components/ui/Badge';
import type { DeviceDTO } from '@/lib/frontend/api';

interface DomainCardProps {
  readonly device: DeviceDTO;
  readonly onClick?: () => void;
}

/** Renders a domain card for the 3×N Domains page grid. */
export function DomainCard({ device, onClick }: DomainCardProps) {
  const cls     = statusToClass(device.lastStatus);
  const pct     = device.lastUsedPercent ?? 0;
  const usedGib = device.lastUsedPercent !== null && device.totalCapacity !== null
    ? (device.lastUsedPercent / 100) * device.totalCapacity
    : null;

  const statusLabel =
    device.lastStatus === 'healthy'  ? 'Online' :
    device.lastStatus === 'warning'  ? 'Warning' :
    device.lastStatus === 'critical' ? 'Critical' : 'Unknown';

  const badgeVariant = cls === 'ok' ? 'ok' as const : cls === 'wa' ? 'wa' as const : cls === 'cr' ? 'cr' as const : 'gr' as const;

  return (
    <div className="dc" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}>
      <div className="dc-head">
        <div className="dc-name">
          <StatusDot status={device.lastStatus} />
          {device.shortName}
        </div>
        <Badge variant={badgeVariant}>{statusLabel}</Badge>
      </div>
      <div className="dc-loc">
        {device.location ?? device.hostname}
      </div>

      <div className="dc-storage-label">
        <span>
          {usedGib !== null ? formatGib(usedGib) : '—'}
          {' / '}
          {device.totalCapacity !== null ? formatGib(device.totalCapacity) : '—'}
        </span>
        <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11 }}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="dc-bar">
        <div
          className={`dc-fill ${cls}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>

      <div className="dc-nums">
        <div>
          <div className="dc-num-label">Alerts</div>
          <div
            className="dc-num-val"
            style={{ color: device.lastActiveAlerts > 0 ? 'var(--red)' : 'var(--text)' }}
          >
            {device.lastActiveAlerts}
          </div>
        </div>
        <div>
          <div className="dc-num-label">Last Seen</div>
          <div className="dc-num-val" style={{ fontSize: 11, fontFamily: 'var(--font-geist-mono)' }}>
            {device.lastReportDate?.substring(0, 10) ?? '—'}
          </div>
        </div>
      </div>
    </div>
  );
}
