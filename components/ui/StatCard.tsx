/**
 * StatCard — single KPI stat card with label, value, sub-text, and optional badge.
 */

import { Badge, type BadgeVariant } from './Badge';

interface StatCardProps {
  readonly label: string;
  readonly value: React.ReactNode;
  readonly sub?: string;
  readonly badge?: { text: string; variant: BadgeVariant };
  readonly valueClass?: string;
}

/** Renders a single KPI stat card (.stat). */
export function StatCard({ label, value, sub, badge, valueClass }: StatCardProps) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className={`stat-value${valueClass ? ` ${valueClass}` : ''}`}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
      {badge && (
        <div className="stat-tag">
          <Badge variant={badge.variant}>{badge.text}</Badge>
        </div>
      )}
    </div>
  );
}
