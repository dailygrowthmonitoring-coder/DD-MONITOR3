/**
 * AlertFeedItem — single alert row in the .al feed style.
 */

import { severityToClass, formatRelative } from '@/lib/frontend/format';
import { Badge } from '@/components/ui/Badge';
import type { AlertDTO } from '@/lib/frontend/api';

interface AlertFeedItemProps {
  readonly alert: AlertDTO;
  readonly showDevice?: boolean;
  readonly deviceName?: string;
}

/** Renders a single alert as an .al feed item with colored left bar. */
export function AlertFeedItem({ alert, showDevice = false, deviceName }: AlertFeedItemProps) {
  const cls = severityToClass(alert.severity);

  return (
    <div className="al">
      <div className={`al-bar ${cls}`} />
      <div className="al-body">
        <div className="al-msg">{alert.message}</div>
        <div className="al-meta">
          {alert.postTime && <span>{formatRelative(alert.postTime)}</span>}
          {showDevice && deviceName && <span>{deviceName}</span>}
          {alert.class && <span>{alert.class}</span>}
          {alert.object && <span>{alert.object}</span>}
          <Badge variant={cls}>{alert.severity}</Badge>
          {!alert.isActive && <Badge variant="gr">cleared</Badge>}
        </div>
      </div>
    </div>
  );
}
