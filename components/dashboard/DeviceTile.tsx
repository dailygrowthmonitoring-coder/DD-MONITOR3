/**
 * DeviceTile — .dom-tile card for the Overview fleet grid.
 */

import { statusToClass } from '@/lib/frontend/format';
import type { DeviceDTO } from '@/lib/frontend/api';

interface DeviceTileProps {
  readonly device: DeviceDTO;
  readonly onClick?: () => void;
}

/** Renders a single device tile for the Overview dom-strip grid. */
export function DeviceTile({ device, onClick }: DeviceTileProps) {
  const cls    = statusToClass(device.lastStatus);
  const pct    = device.lastUsedPercent ?? 0;
  const width  = `${Math.min(100, Math.max(0, pct))}%`;

  return (
    <div className={`dom-tile ${cls}`} onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}>
      <div className="dom-tile-name">{device.shortName}</div>
      <div className="dom-tile-pct">{pct.toFixed(0)}%</div>
      {/* inline bar */}
      <div style={{ height: 4, background: 'var(--bg4)', borderRadius: 2, overflow: 'hidden', margin: '4px 0' }}>
        <div
          style={{
            height: '100%',
            width,
            borderRadius: 2,
            background: cls === 'cr' ? 'var(--red)' : cls === 'wa' ? 'var(--amber)' : 'var(--green)',
          }}
        />
      </div>
      <div className="dom-tile-sub">
        {device.lastActiveAlerts > 0
          ? `${device.lastActiveAlerts} alert${device.lastActiveAlerts !== 1 ? 's' : ''}`
          : 'No alerts'}
      </div>
    </div>
  );
}
