/**
 * StatusDot — animated status indicator dot.
 * ok = green static, wa = amber pulse, cr = red fast pulse, gr = grey.
 */

import { statusToClass } from '@/lib/frontend/format';

interface StatusDotProps {
  readonly status: string;
  readonly className?: string;
}

/** Renders a small colored dot with pulse animation for warning/critical. */
export function StatusDot({ status, className }: StatusDotProps) {
  const cls = statusToClass(status);
  return (
    <span
      className={`dot ${cls}${className ? ` ${className}` : ''}`}
      aria-label={status}
    />
  );
}
