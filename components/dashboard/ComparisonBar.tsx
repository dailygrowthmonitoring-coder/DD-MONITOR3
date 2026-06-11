/**
 * ComparisonBar — .cmp-row showing device name, filled bar, and capacity label.
 */

import { percentToClass, formatGib } from '@/lib/frontend/format';

interface ComparisonBarProps {
  readonly label:    string;
  readonly usedPct:  number;
  readonly usedGib:  number | null;
  readonly totalGib: number | null;
}

/** Renders a .cmp-row storage comparison bar. */
export function ComparisonBar({ label, usedPct, usedGib, totalGib }: ComparisonBarProps) {
  const cls = percentToClass(usedPct);
  const cap = usedGib !== null && totalGib !== null
    ? `${formatGib(usedGib)} / ${formatGib(totalGib)}`
    : `${usedPct.toFixed(1)}%`;

  return (
    <div className="cmp-row">
      <div className="cmp-label">{label}</div>
      <div className="cmp-track">
        <div className={`cmp-fill ${cls}`} style={{ width: `${Math.min(100, usedPct)}%` }} />
      </div>
      <div className="cmp-cap">{cap}</div>
    </div>
  );
}
