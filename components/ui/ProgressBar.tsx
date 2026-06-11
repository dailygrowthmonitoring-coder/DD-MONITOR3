/**
 * ProgressBar — inline horizontal bar with percentage label.
 */

import { percentToClass } from '@/lib/frontend/format';

interface ProgressBarProps {
  /** Value in 0–100 range. */
  readonly value: number;
  /** Override the color class. If omitted, auto-picks by threshold. */
  readonly variant?: 'ok' | 'wa' | 'cr';
  readonly showLabel?: boolean;
  readonly className?: string;
}

/** Renders an .ibar inline progress bar with optional percent label. */
export function ProgressBar({
  value,
  variant,
  showLabel = true,
  className,
}: ProgressBarProps) {
  const cls = variant ?? percentToClass(value);
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div className={`ibar${className ? ` ${className}` : ''}`}>
      <div className="ibar-track">
        <div className={`ibar-fill ${cls}`} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && (
        <span className="ibar-pct">{pct.toFixed(1)}%</span>
      )}
    </div>
  );
}
