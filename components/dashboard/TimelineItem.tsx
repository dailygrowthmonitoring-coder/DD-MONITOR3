/**
 * TimelineItem — .tl-item for the Alerts timeline.
 */

import { severityToClass, formatRelative } from '@/lib/frontend/format';
import { Badge } from '@/components/ui/Badge';
import type { AlertDTO } from '@/lib/frontend/api';

interface TimelineItemProps {
  readonly alert: AlertDTO;
  readonly deviceName?: string;
  readonly isLast?: boolean;
}

/** Renders a single .tl-item for the alerts timeline panel. */
export function TimelineItem({ alert, deviceName, isLast = false }: TimelineItemProps) {
  const cls = severityToClass(alert.severity);

  return (
    <div className="tl-item">
      <div className="tl-dot-col">
        <div className={`tl-dot ${cls}`} />
        {!isLast && <div className="tl-line" />}
      </div>
      <div className="tl-body">
        <div className="tl-time">
          {alert.postTime ? formatRelative(alert.postTime) : '—'}
        </div>
        <div className="tl-msg">{alert.message}</div>
        {alert.object && (
          <div className="tl-detail">{alert.object}</div>
        )}
        <div className="tl-badges">
          <Badge variant={cls}>{alert.severity}</Badge>
          {alert.class && <Badge variant="gr">{alert.class}</Badge>}
          {deviceName && <Badge variant="gr">{deviceName}</Badge>}
          {!alert.isActive && <Badge variant="gr">cleared</Badge>}
          {alert.source === 'rule_engine' && <Badge variant="ac">rule</Badge>}
        </div>
      </div>
    </div>
  );
}
